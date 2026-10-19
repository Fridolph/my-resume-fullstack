/**
 * 双端预览与 Chromium 共用的纸面渲染入口。
 * 仅生成受控 HTML：所有用户文本转义，链接仅允许 http(s)，不执行用户富文本 HTML。
 * 不依赖 Nuxt/Vue，服务端可以直接消费；放在 ui 是因为这里包含纸面 CSS 与 DOM 分页。
 */
const escape = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  )
const paragraph = (value, className = '') => (value ? `<p class="${className}">${escape(value)}</p>` : '')
const link = (label, href) =>
  /^https?:\/\//i.test(href ?? '')
    ? `<a href="${escape(href)}" rel="noreferrer">${escape(label || href)}</a>`
    : escape(label)
const date = value =>
  value.mode === 'custom' ? value.text : `${value.start} - ${value.isCurrent ? '至今' : value.end}`
const bullets = items => items.map(item => paragraph(`• ${item.text}`, 'bullet')).join('')

/** 稳定地补齐排序、过滤隐藏模块；不修改原文档。 */
export function orderedSections(document) {
  const sections = document.content.sections
  const hidden = new Set(document.display.sections.hidden)
  const byId = new Map(sections.map(section => [section.id, section]))
  return [...new Set([...document.display.sections.order, ...sections.map(section => section.id)])]
    .map(id => byId.get(id))
    .filter(section => section && !hidden.has(section.id))
}

/**
 * TipTap JSON 的允许节点与 marks → 安全 HTML。
 * 未知容器保留其文本子节点；未知属性不透传，链接再次校验协议。
 */
function richNode(node, depth = 0) {
  if (depth > 30) throw new Error('富文本层级过深')
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text') {
    let result = escape(node.text)
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') result = `<strong>${result}</strong>`
      if (mark.type === 'italic') result = `<em>${result}</em>`
      if (mark.type === 'strike') result = `<s>${result}</s>`
      if (mark.type === 'code') result = `<code>${result}</code>`
      if (mark.type === 'link' && /^https?:\/\//i.test(mark.attrs?.href ?? ''))
        result = `<a href="${escape(mark.attrs.href)}" rel="noreferrer">${result}</a>`
    }
    return result
  }
  if (node.type === 'hardBreak') return '<br>'
  if (node.type === 'horizontalRule') return '<hr>'
  const content = (Array.isArray(node.content) ? node.content : []).map(child => richNode(child, depth + 1)).join('')
  const tags = {
    paragraph: 'p',
    heading: 'h3',
    bulletList: 'ul',
    orderedList: 'ol',
    listItem: 'li',
    blockquote: 'blockquote',
    codeBlock: 'pre',
  }
  const tag = Object.hasOwn(tags, node.type) ? tags[node.type] : undefined
  return tag ? `<${tag}>${content}</${tag}>` : content
}

/** 每条经历/能力组等成为可整块移动的单元；过长单元由分页器继续拆分。 */
export function resumePdfBlocks(document) {
  const options = document.display.options
  const blocks = []
  for (const section of orderedSections(document)) {
    const data = section.data
    const items = []
    switch (section.type) {
      case 'profile': {
        const keys = {
          phone: options.showPhone,
          email: options.showEmail,
          location: options.showLocation,
          years: options.showYears,
        }
        const info = data.infoItems
          .filter(item => keys[item.kind] !== false)
          .map(item => `${item.label}：${item.value}`)
          .join(' · ')
        items.push(
          `<h1>${escape(data.name || '未命名')}</h1>${paragraph(data.headline, 'headline')}${paragraph(info, 'contact')}${paragraph(data.summary)}${paragraph(data.availability)}${data.links.length ? `<p class="contact">${data.links.map(item => link(item.label, item.url)).join(' · ')}</p>` : ''}`,
        )
        if (data.stats.length)
          items.push(
            paragraph(
              data.stats.map(item => `${item.label}：${item.value}${item.hint ? `（${item.hint}）` : ''}`).join(' · '),
            ),
          )
        for (const interest of data.interests)
          items.push(paragraph(`${interest.label}${interest.description ? `：${interest.description}` : ''}`))
        break
      }
      case 'highlights':
        items.push(
          ...data.items.map(item => `<p><strong>${escape(item.title)}</strong> ${escape(item.description)}</p>`),
        )
        break
      case 'education':
        items.push(
          ...data.items.map(
            item =>
              `<h3>${escape(item.school)}<span class="date">${escape(date(item.date))}</span></h3>${paragraph([item.degree, item.major].filter(Boolean).join(' · '))}`,
          ),
        )
        break
      case 'experience':
      case 'projects':
        items.push(
          ...data.items.map(
            item =>
              `<h3>${escape(section.type === 'experience' ? item.company : item.name)}<span class="date">${escape(date(item.date))}</span></h3>${paragraph([item.role, item.domain].filter(Boolean).join(' · '), 'muted')}${paragraph(item.overview)}${section.type === 'projects' ? bullets(item.features) : ''}${options.showAchievements ? bullets(section.type === 'experience' ? item.achievements : item.highlights) : ''}${options.showTechStack && item.tech.length ? paragraph(`技术栈：${item.tech.map(value => value.text).join(' · ')}`, 'muted') : ''}`,
          ),
        )
        break
      case 'capabilities':
        for (const group of data.groups)
          items.push(
            `<h3>${escape(group.title)}</h3>${paragraph(group.summary, 'muted')}${group.items.map(item => `<p><strong>${escape(item.name)}</strong>${item.description ? `：${escape(item.description)}` : ''}${item.evidenceLinks.length ? ` ${item.evidenceLinks.map(value => link(value.label, value.url)).join(' · ')}` : ''}</p>`).join('')}`,
          )
        const view = document.display.sections.overrides[section.id]?.capabilities
        const dimensions = view
          ? view.dimensionIds.map(id => data.dimensions.find(item => item.id === id)).filter(Boolean)
          : data.dimensions
        if (dimensions.length)
          items.push(
            `<h3>能力自评</h3>${paragraph(data.ratingScale.basis, 'muted')}${dimensions.map(item => `<p>${escape(item.label)}：${item.score === null ? '未评分' : `${item.score} / ${data.ratingScale.max}`}${item.description ? ` · ${escape(item.description)}` : ''}</p>`).join('')}`,
          )
        break
      case 'evaluations':
        items.push(...data.items.map(item => paragraph(`• ${item.text}`)))
        break
      case 'custom':
        if (data.view === 'richText') items.push(...data.content.content.map(node => richNode(node)))
        else if (data.view === 'timeline')
          items.push(
            ...data.items.map(
              item =>
                `<h3>${escape(item.title)}<span class="date">${escape(date(item.time))}</span></h3>${paragraph(item.description)}`,
            ),
          )
        else if (data.view === 'tagCloud')
          items.push(`<p>${data.items.map(item => `<span class="tag">${escape(item.text)}</span>`).join(' ')}</p>`)
        else items.push(...data.items.map(item => paragraph(`• ${item.text}`)))
        break
    }
    const visible = items.filter(html => html.replace(/<[^>]*>/g, '').trim() || /<(br|hr)\b/.test(html))
    if (!visible.length) continue
    if (section.type !== 'profile')
      blocks.push({
        id: `${section.id}:title`,
        heading: true,
        html: `<h2>${escape(section.title)}</h2>${paragraph(section.description, 'muted')}`,
      })
    visible.forEach((html, index) => blocks.push({ id: `${section.id}:${index}`, heading: false, html }))
  }
  if (document.content.footer.note)
    blocks.push({ id: 'footer-note', heading: false, html: paragraph(document.content.footer.note, 'note') })
  return blocks
}

export const RESUME_PDF_CSS = `
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9edf2;color:#172033;font-family:Arial,"PingFang SC","Microsoft YaHei",sans-serif;font-size:12px;line-height:1.65}
#pages{display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px 0}
.sheet{background:#fff;width:210mm;height:297mm;padding:14mm 15mm 12mm;display:flex;flex-direction:column;flex-shrink:0;box-shadow:0 3px 18px #17203320}
.page-content{height:260mm;flex-shrink:0;overflow:visible}.page-footer{margin-top:auto;border-top:1px solid #dbe2ea;padding-top:5px;display:flex;justify-content:space-between;color:#718096;font-size:10px}
.block{padding:0 0 8px;overflow-wrap:anywhere;white-space:normal}h1{font-size:26px;line-height:1.3;margin:0 0 5px}h2{font-size:15px;border-bottom:2px solid #334a64;margin:5px 0 4px;padding-bottom:3px}h3{font-size:12px;line-height:1.6;margin:0 0 3px;font-weight:700}p{margin:0 0 3px;white-space:pre-wrap}.headline{font-size:14px;color:#334a64}.muted,.contact{color:#526176}.date{float:right;color:#64748b;font-size:11px;font-weight:400;margin-left:12px}.bullet{padding-left:10px}.tag{display:inline-block;border:1px solid #cad4df;padding:0 5px;margin:2px;border-radius:3px}a{color:#245783;text-decoration:underline;overflow-wrap:anywhere}ul,ol{margin:3px 0;padding-left:20px}li p{margin:0}blockquote{border-left:2px solid #cbd5e1;padding-left:10px;margin:4px 0}pre{white-space:pre-wrap;font-size:11px}code{font-family:monospace}.note{font-size:11px;color:#64748b}
#source{position:absolute;left:-10000px;top:0;width:180mm;visibility:hidden}#error{padding:20px;color:#b91c1c}body[data-ready="false"] #pages{visibility:hidden}
@page{size:A4;margin:0}@media print{html,body{background:white}#pages{display:block;padding:0}#source,#error{display:none}.sheet{box-shadow:none;margin:0;break-after:page}.sheet:last-child{break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`

/**
 * 在隔离纸面 document 内测量、分页。不移动 Vue 节点。
 * 超长条目先按子块拆，超长段落按 DOM Range 拆并保留 inline marks/链接。
 * 有界迭代；失败显示错误并保持 ready=false，绝不裁切内容冒充成功。
 */
export async function paginateResumePdf(doc, author = '') {
  const maxPages = 80
  const pagesRoot = doc.getElementById('pages')
  const source = doc.getElementById('source')
  pagesRoot.replaceChildren()
  doc.body.dataset.ready = 'false'
  await doc.fonts.ready
  let current
  const pages = []
  function newPage() {
    if (pages.length >= maxPages) throw new Error('简历超过 80 页，请精简内容后重试')
    const page = doc.createElement('article')
    page.className = 'sheet'
    const content = doc.createElement('div')
    content.className = 'page-content'
    const footer = doc.createElement('footer')
    footer.className = 'page-footer'
    const name = doc.createElement('span')
    name.textContent = author
    footer.append(name, doc.createElement('span'))
    page.append(content, footer)
    pagesRoot.append(page)
    pages.push(page)
    current = content
  }
  const fits = () => current.scrollHeight <= current.clientHeight + 1
  const hasContent = () => current.childNodes.length > 0
  function add(node, depth = 0) {
    if (depth > 30) throw new Error('内容层级过深，无法分页')
    current.append(node)
    if (fits()) return
    node.remove()
    if (hasContent()) {
      // 超过整页的条目直接填满当前余量；普通条目优先整块移动。
      const probe = doc.createElement('div')
      probe.className = 'page-content'
      probe.style.cssText = 'position:absolute;left:-10000px;width:180mm;visibility:hidden'
      probe.append(node.cloneNode(true))
      doc.body.append(probe)
      const oversized = probe.scrollHeight > probe.clientHeight + 1
      probe.remove()
      if (!oversized) {
        const headings = []
        while (current.lastElementChild?.getAttribute('data-heading') === 'true') {
          headings.unshift(current.lastElementChild)
          current.lastElementChild.remove()
        }
        if (hasContent()) newPage()
        current.append(...headings, node)
        if (fits()) return
        node.remove()
      }
    }
    const target = node.firstElementChild
    // 先以段落/列表项为单位拆分过长块，保留 h3 与首段的相邻关系。
    if (
      node.children.length > 1 ||
      (target && ['UL', 'OL', 'DIV', 'BLOCKQUOTE'].includes(target.tagName) && target.children.length > 1)
    ) {
      const parent = node.children.length > 1 ? node : target
      const children = Array.from(parent.childNodes)
      for (const [childIndex, child] of children.entries()) {
        const fragment = node.cloneNode(false)
        fragment.dataset.heading = String(['H2', 'H3'].includes(child.tagName))
        if (parent === node) fragment.append(child.cloneNode(true))
        else {
          const shell = parent.cloneNode(false)
          if (shell.tagName === 'OL') shell.start = (parent.start || 1) + childIndex
          shell.append(child.cloneNode(true))
          fragment.append(shell)
        }
        add(fragment, depth + 1)
      }
      return
    }
    // 单个段落超过整页：按字符范围二分查找可容纳的最大前缀。
    if (!node.textContent.length) throw new Error('空白结构超过整页，无法分页')
    let remaining = node.cloneNode(true)
    while (remaining.textContent.length) {
      const walker = doc.createTreeWalker(remaining, 4)
      const positions = []
      while (walker.nextNode()) {
        const text = walker.currentNode
        for (let index = 0; index < text.length; ) {
          index += text.textContent.codePointAt(index) > 65535 ? 2 : 1
          positions.push([text, index])
        }
      }
      let low = 1,
        high = positions.length,
        best = 0,
        chosen
      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const range = doc.createRange()
        range.setStart(remaining, 0)
        range.setEnd(...positions[mid - 1])
        const candidate = remaining.cloneNode(false)
        candidate.append(range.cloneContents())
        current.append(candidate)
        const ok = fits()
        candidate.remove()
        if (ok) {
          best = mid
          chosen = candidate
          low = mid + 1
        } else high = mid - 1
      }
      if (!best || !chosen) {
        if (hasContent()) {
          const headings = []
          while (current.lastElementChild?.getAttribute('data-heading') === 'true') {
            headings.unshift(current.lastElementChild)
            current.lastElementChild.remove()
          }
          if (hasContent()) {
            newPage()
            current.append(...headings)
            continue
          }
          throw new Error('标题与首行无法容纳于同页')
        }
        throw new Error('存在无法容纳的内容，请调整字号或内容')
      }
      current.append(chosen)
      const tail = doc.createRange()
      tail.setStart(...positions[best - 1])
      tail.setEnd(remaining, remaining.childNodes.length)
      const next = remaining.cloneNode(false)
      next.append(tail.cloneContents())
      remaining = next
      if (remaining.textContent.length) newPage()
    }
  }
  newPage()
  for (const sourceNode of source.children) add(sourceNode.cloneNode(true))
  if (!source.children.length) {
    const empty = doc.createElement('p')
    empty.textContent = '暂无可打印内容'
    current.append(empty)
  }
  pages.forEach((page, index) => {
    page.querySelector('.page-footer').lastChild.textContent = `${index + 1} / ${pages.length}`
  })
  doc.body.dataset.ready = 'true'
  doc.body.dataset.pages = String(pages.length)
  return pages.length
}

/** 同一 srcdoc 同时用于双端 iframe 与后端 setContent；文档中无外部请求。 */
export function createResumePdfHtml(document, title = '简历') {
  const author = orderedSections(document).find(section => section.type === 'profile')?.data.name ?? ''
  const blocks = resumePdfBlocks(document)
    .map(
      block =>
        `<div class="block" data-block="${escape(block.id)}" data-heading="${block.heading}">${block.html}</div>`,
    )
    .join('')
  const nonce = globalThis.crypto.randomUUID().replaceAll('-', '')
  const script = `addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='resume-pdf-print'&&document.body.dataset.ready==='true')window.print()});(${paginateResumePdf.toString()})(document,${JSON.stringify(author).replace(/</g, '\\u003c')}).then(count=>parent.postMessage({type:'resume-pdf-ready',pages:count},'*')).catch(()=>{document.getElementById('error').textContent='分页失败，请重新加载后重试';parent.postMessage({type:'resume-pdf-error'},'*')})`
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'"><title>${escape(title)}</title><style>${RESUME_PDF_CSS}</style></head><body data-ready="false"><div id="source">${blocks}</div><main id="pages"></main><div id="error" role="alert"></div><script nonce="${nonce}">${script}</script></body></html>`
}
