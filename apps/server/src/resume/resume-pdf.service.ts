import { createHash } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common'
import { canonicalResumeJson, pdfConfigReferencesValid, type ResumeDocument, type ResumePdfExportDto } from '@rs/common'
import { createResumePdfHtml } from '@rs/ui/pdf'
import { chromium, type Browser, type BrowserContext } from 'playwright'
import type { AuthUser } from '../common/http-context'
import { ResumeService } from './resume.service'

/**
 * 同一份受控纸面 HTML 的 Chromium 输出端。
 * 浏览器进程复用，context 每次隔离；不打开外部 URL、不加载网络资源、不保存文件。
 * 不排队堆积请求：单进程最多两个任务，超限明确返回 503。
 */
@Injectable()
export class ResumePdfRenderer implements OnModuleDestroy {
  private browserPromise?: Promise<Browser>
  private active = 0

  /**
   * 字体就绪与 DOM 分页完成后才输出。超时主动关闭 context，释放实际工作；
   * Promise.race 本身只能结束等待，不能取消 Chromium，因此关闭不能省略。
   */
  async render(resumeDocument: ResumeDocument): Promise<Buffer> {
    if (this.active >= 2) throw new ServiceUnavailableException('PDF 生成繁忙，请稍后重试')
    this.active++
    let context: BrowserContext | undefined
    let expired = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        expired = true
        void context?.close().catch(() => undefined)
        reject(new ServiceUnavailableException('PDF 生成超时，请稍后重试'))
      }, 30_000)
    })
    try {
      const work = async () => {
        const browser = await this.getBrowser()
        if (expired) throw new Error('PDF timeout')
        context = await browser.newContext({ serviceWorkers: 'block', javaScriptEnabled: true })
        if (expired) {
          await context.close()
          throw new Error('PDF timeout')
        }
        await context.route('**/*', route => route.abort())
        const page = await context.newPage()
        await page.emulateMedia({ media: 'print' })
        await page.setContent(createResumePdfHtml(resumeDocument), { waitUntil: 'load', timeout: 20_000 })
        await page.waitForFunction(
          () => document.body.dataset.ready === 'true' || !!document.getElementById('error')?.textContent,
          undefined,
          { timeout: 20_000 },
        )
        if ((await page.locator('body').getAttribute('data-ready')) !== 'true') throw new Error('PDF pagination failed')
        return page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true })
      }
      return await Promise.race([work(), timeout])
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error
      // 不把引擎路径、用户正文和内部错误返回给浏览器。
      throw new ServiceUnavailableException('PDF 生成失败，请重试或联系管理员检查 Chromium')
    } finally {
      clearTimeout(timer)
      await context?.close().catch(() => undefined)
      this.active--
    }
  }

  /** 单次惰性启动；失败或断连后允许下一请求重新启动，未导出时不占浏览器资源。 */
  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium
        .launch({ headless: true, chromiumSandbox: true, timeout: 15_000 })
        .then(browser => {
          browser.on('disconnected', () => {
            this.browserPromise = undefined
          })
          return browser
        })
        .catch(error => {
          this.browserPromise = undefined
          throw error
        })
    }
    return this.browserPromise
  }

  /** 应用退出时关闭复用进程；每个请求自己的 context 仍由 finally 清理。 */
  async onModuleDestroy(): Promise<void> {
    await this.browserPromise?.then(browser => browser.close()).catch(() => undefined)
  }
}

/** 鉴权数据源与纸面引擎分开，便于单独验证所有权和摘要冲突。 */
@Injectable()
export class ResumePdfService {
  constructor(
    private readonly resumes: ResumeService,
    private readonly renderer: ResumePdfRenderer,
  ) {}

  /**
   * 身份由全局 Guard 恢复；草稿只走本人接口，公开内容仍须处于已发布状态。
   * 校验发生在启动 Chromium 前。摘要覆盖整份文档，display 独立保存也会触发 409。
   * 读取后生成的是该次读取的快照，不把本轮导出冒充历史发布版本。
   */
  /**
   * **分享链接**的导出路径：没有登录态，因此也没有 `documentHash` 的前置校验。
   *
   * 与 `export` 的分工：
   * - `export` 由**作者**调用，`currentUser` 用于归属校验，并要求客户端带上
   *   `documentHash`（"预览后内容变了就重来"）—— 那是作者的操作流程
   * - 本方法由**访客**经分享链接调用，归属已经由 `ShareLink` 校验过，
   *   访客也没有"先预览再下载"的流程，所以直接按**简历自己的** pdf 配置渲染
   *
   * ⚠️ 若库里存的 pdf 配置引用了已被删除的模块，这里会**回落到不含该配置**的文档 ——
   * 宁可少一点样式，也不该给访客一个渲染失败的 PDF。
   */
  async exportForShare(resumeId: number): Promise<Buffer> {
    const result = await this.resumes.findPublished(resumeId)
    const ids = result.document.content.sections.map(section => section.id)
    const stored = result.document.display?.pdf

    if (stored && !pdfConfigReferencesValid(stored, ids)) {
      const { pdf: _dropped, ...restDisplay } = result.document.display
      return this.renderer.render({ ...result.document, display: restDisplay })
    }

    return this.renderer.render(result.document)
  }

  async export(id: number, input: ResumePdfExportDto, currentUser: AuthUser): Promise<Buffer> {
    const result =
      input.source === 'draft' ? await this.resumes.findDraft(id, currentUser) : await this.resumes.findPublished(id)
    const hash = createHash('sha256').update(canonicalResumeJson(result.document)).digest('hex')
    if (hash !== input.documentHash) {
      throw new ConflictException('简历内容或展示配置已变化，请刷新预览后重新下载', { errorCode: 'Resume.Pdf:changed' })
    }
    if (
      input.pdfConfig &&
      !pdfConfigReferencesValid(
        input.pdfConfig,
        result.document.content.sections.map(section => section.id),
      )
    )
      throw new BadRequestException('PDF 配置引用了不存在的模块')
    return this.renderer.render(
      input.pdfConfig
        ? { ...result.document, display: { ...result.document.display, pdf: input.pdfConfig } }
        : result.document,
    )
  }
}
