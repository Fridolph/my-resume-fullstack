/** 配置驱动的屏幕/打印分页必须完整；页眉脚占位与边距字号共同测量。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { buildResumeDocument, defaultResumePdfConfig } from '@rs/common'
import { createResumePdfHtml } from '@rs/ui/pdf'
import { mkdir } from 'node:fs/promises'
const output = new URL('../../../.local/pdf-check/', import.meta.url)
await mkdir(output, { recursive: true })
const doc = buildResumeDocument({
  content: { sections: [{ type: 'profile', data: { name: '配置测试', summary: '隐藏简介' } }] },
})
const profile = doc.content.sections.find(x => x.type === 'profile')
profile.data.interests = [{ id: 'hobby', label: '隐藏兴趣', images: [] }]
doc.content.sections.push({
  id: 'long',
  type: 'custom',
  title: '长内容',
  description: '隐藏模块说明',
  data: {
    view: 'textList',
    items: Array.from({ length: 50 }, (_, i) => ({
      id: `item${i}`,
      text: `段落${i} ${'中文排版 Vue 开发。'.repeat(i === 3 ? 600 : 12)} END-${i}`,
    })),
  },
})
doc.display.sections.order.push('long')
const config = defaultResumePdfConfig()
config.fields.interests = false
config.fields.profileSummary = false
config.fields.sectionDescriptions = false
config.header = {
  enabled: true,
  text: 'slogan {name} · {page}/{pages}',
  align: 'left',
  separator: true,
  hideFirstPage: true,
}
config.footer = { enabled: true, text: '{page} / {pages}', align: 'right', separator: false, hideFirstPage: false }
doc.display.pdf = config
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const [font, margin] of [
    [12, 22],
    [16, 30],
    [10, 5],
  ]) {
    config.typography.fontSize = font
    config.page.marginTop = margin
    config.page.marginLeft = margin
    let screen
    for (const media of ['screen', 'print']) {
      await page.goto('about:blank')
      await page.emulateMedia({ media })
      await page.setContent(createResumePdfHtml(doc))
      await page.waitForFunction(
        () => document.body.dataset.ready === 'true' || document.getElementById('error').textContent,
      )
      assert.equal(await page.locator('body').getAttribute('data-ready'), 'true')
      const state = await page.evaluate(() => {
        const sheets = [...document.querySelectorAll('.sheet')]
        return {
          pages: sheets.length,
          text: sheets.map(x => x.querySelector('.page-content').textContent).join(''),
          overflow: sheets.map(x => {
            const content = x.querySelector('.page-content')
            return content.scrollHeight - content.clientHeight
          }),
          overlap: sheets.some(x => {
            const h = x.querySelector('.page-header').getBoundingClientRect(),
              c = x.querySelector('.page-content').getBoundingClientRect(),
              f = x.querySelector('.page-footer').getBoundingClientRect()
            return h.bottom > c.top + 1 || c.bottom > f.top + 1
          }),
          source: document.getElementById('source').textContent,
          header: getComputedStyle(sheets[0].querySelector('.page-header')).visibility,
        }
      })
      assert.equal(state.text, state.source)
      assert.ok(state.overflow.every(x => x <= 1))
      assert.equal(state.overlap, false)
      assert.equal(state.header, 'hidden')
      assert.ok(!state.text.includes('隐藏'))
      for (let i = 0; i < 50; i++) assert.ok(state.text.includes(`END-${i}`))
      if (media === 'screen') screen = state
      else assert.deepEqual(state, screen)
    }
    await page.pdf({
      path: new URL(`configured-${font}-${margin}.pdf`, output).pathname,
      preferCSSPageSize: true,
      printBackground: true,
    })
    console.log(`字号${font}/边距${margin}: ${screen.pages}页，正文逐字一致，页眉页脚不重叠，screen/print一致`)
  }
} finally {
  await browser.close()
}
