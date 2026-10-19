/** 真实 Chromium 分页回归；先运行 pnpm --filter @rs/server exec playwright install chromium。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { buildResumeDocument } from '@rs/common'
import { createResumePdfHtml, resumePdfBlocks } from '@rs/ui/pdf'
import { mkdir } from 'node:fs/promises'
const output = new URL('../../../.local/pdf-check/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
try {
  const doc = buildResumeDocument({
    content: {
      sections: [
        {
          type: 'profile',
          data: { name: '分页测试 张三', headline: 'AI Agent 全栈开发', summary: '具备完整交付经验' },
        },
      ],
    },
  })
  doc.content.sections.push({
    id: 'long',
    type: 'custom',
    title: '真实长内容',
    data: {
      view: 'textList',
      items: Array.from({ length: 45 }, (_, i) => ({
        id: `text${i}`,
        text: `第${i}条 ${'内容验证 Vue Nuxt 全栈开发。'.repeat(i === 5 ? 600 : 5)} END-${i}`,
      })),
    },
  })
  doc.content.sections.push({
    id: 'rich',
    type: 'custom',
    title: '富文本与嵌套列表',
    data: {
      view: 'richText',
      content: {
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: Array.from({ length: 12 }, (_, i) => ({
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: `富文本项目-${i} `,
                      marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://example.com' } }],
                    },
                    { type: 'text', text: '尾部完整保留。'.repeat(15) },
                  ],
                },
              ],
            })),
          },
        ],
      },
    },
  })
  doc.display.sections.order.push('long', 'rich')
  const page = await browser.newPage()
  let requests = 0
  page.on('request', () => requests++)
  async function load(document, media) {
    await page.goto('about:blank')
    await page.emulateMedia({ media })
    await page.setContent(createResumePdfHtml(document))
    await page.waitForFunction(
      () => document.body.dataset.ready === 'true' || !!document.getElementById('error')?.textContent,
      undefined,
      { timeout: 20_000 },
    )
    assert.equal(await page.locator('body').getAttribute('data-ready'), 'true')
    return page.evaluate(() => {
      const contents = [...document.querySelectorAll('.page-content')]
      return {
        pages: contents.length,
        text: contents.map(x => x.textContent).join(''),
        overflow: contents.map(x => x.scrollHeight - x.clientHeight),
        empty: contents.filter(x => !x.textContent.trim()).length,
        orphan: contents.filter(x => x.lastElementChild?.dataset.heading === 'true').length,
      }
    })
  }
  const screen = await load(doc, 'screen')
  for (let i = 0; i < 45; i++) assert.ok(screen.text.includes(`END-${i}`))
  for (let i = 0; i < 12; i++) assert.ok(screen.text.includes(`富文本项目-${i}`))
  assert.ok(screen.pages > 1)
  assert.equal(screen.empty, 0)
  assert.equal(screen.orphan, 0)
  assert.ok(screen.overflow.every(value => value <= 1))
  // 逐字比较正文，排除拆分丢字、重复；不把页脚的重复作者名混入。
  const expected = await page.locator('#source').evaluate(el => el.textContent)
  assert.equal(screen.text, expected)
  const print = await load(doc, 'print')
  assert.deepEqual(print, screen)
  const bytes = await page.pdf({
    path: new URL('long-resume.pdf', output).pathname,
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
  })
  assert.ok(bytes.subarray(0, 5).toString() === '%PDF-')
  await page.screenshot({ path: new URL('first-page.png', output).pathname })
  doc.display.sections.hidden = doc.content.sections.map(x => x.id)
  const empty = await load(doc, 'print')
  assert.equal(empty.pages, 1)
  assert.equal(empty.text, '暂无可打印内容')
  assert.equal(requests, 0)
  assert.ok(resumePdfBlocks(doc).length === 0)
  console.log(
    `Chromium 验证通过：${screen.pages} 页；正文逐字一致；屏幕/打印页数一致；无溢出、孤标题、空白页或网络请求。产物：${output.pathname}`,
  )
} finally {
  await browser.close()
}
