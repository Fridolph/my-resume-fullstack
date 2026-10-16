import { describe, expect, it, vi } from 'vitest'
import {
  type FileRuleIssue,
  type FileRuleResult,
  fileCountRule,
  fileSizeRule,
  fileTypeRule,
  getFileExt,
  isAcceptedType,
  isImageFile,
  normalizeFileInput,
  parseAccept,
  resolveFileMime,
  validateFiles,
} from '../src/fileValidation.js'

/**
 * `src/fileValidation.ts` 的校验规则单元测试。
 *
 * 这组测试保护的是"文件能不能通过校验"这一层判定：输入归一化、accept 解析与匹配、
 * 扩展名 / MIME 的回退关系，以及三个规则工厂在**边界值**上的通过/拒绝结论与失败码。
 *
 * 会让它变红的改动：调整 accept 的匹配语义（通配、扩展名、大小写）；改动 `resolveFileMime`
 * 的"MIME 优先、扩展名兜底"顺序；放宽或收紧体积 / 数量的边界条件（`<=` 与 `>`）；
 * 增删失败码或 `messageKey` 文案；改动 `validateFiles` 的空输入与短路顺序。
 *
 * 这里刻意不覆盖 `readImageSize` / `imageDimensionRule`：它们依赖 `createImageBitmap` /
 * `Image` / `URL.createObjectURL`，node 环境没有真实实现，硬测只会测到替身。
 */
const makeFile = (name: string, type = '', size = 1): File => new File([new Uint8Array(size)], name, { type })

/**
 * 把规则返回值收窄成失败信息，避免用 `toBeTruthy` 这类含糊断言。
 *
 * `FileRule` 的签名允许返回 Promise（异步规则，如读取图片尺寸），但这里测的三个工厂
 * 都是同步实现；显式拦掉 Promise，既能收窄类型，也能在工厂被改成异步时立刻报错。
 */
function asIssue(result: FileRuleResult | Promise<FileRuleResult>): FileRuleIssue {
  if (result === true) {
    throw new Error('期望规则返回失败信息，实际返回了 true（通过）')
  }
  if (result instanceof Promise) {
    throw new Error('期望同步规则返回失败信息，实际返回了 Promise')
  }
  return result
}

describe('normalizeFileInput', () => {
  it('normalizeFileInput：null / undefined 归一为空数组，而不是抛错', () => {
    expect(normalizeFileInput(null)).toEqual([])
    expect(normalizeFileInput(undefined)).toEqual([])
  })

  it('normalizeFileInput：单个 File 包成单元素数组', () => {
    const file = makeFile('a.png', 'image/png')
    expect(normalizeFileInput(file)).toEqual([file])
  })

  it('normalizeFileInput：数组原序保留，并过滤掉混入的非 File 项', () => {
    const a = makeFile('a.png', 'image/png')
    const b = makeFile('b.pdf', 'application/pdf')
    const input = [a, 'not-a-file', null, b] as unknown as File[]
    expect(normalizeFileInput(input)).toEqual([a, b])
    expect(normalizeFileInput([])).toEqual([])
  })

  it('normalizeFileInput：普通对象 / 类数组对象不会被误当成文件列表', () => {
    expect(normalizeFileInput({} as unknown as File)).toEqual([])
    expect(normalizeFileInput({ 0: makeFile('a.png'), length: 1 } as unknown as FileList)).toEqual([])
  })

  it('normalizeFileInput：真正的 FileList 实例按顺序展开', () => {
    class FakeFileList {
      readonly length: number;
      [index: number]: File
      constructor(files: File[]) {
        this.length = files.length
        files.forEach((file, i) => {
          this[i] = file
        })
      }
    }
    const a = makeFile('a.png', 'image/png')
    const b = makeFile('b.pdf', 'application/pdf')

    vi.stubGlobal('FileList', FakeFileList)
    try {
      const list = new FakeFileList([a, b]) as unknown as FileList
      expect(list).toBeInstanceOf(FakeFileList)
      expect(normalizeFileInput(list)).toEqual([a, b])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('parseAccept', () => {
  it('parseAccept：undefined / 空串 / 只有逗号都解析为空列表（视为不限制）', () => {
    expect(parseAccept(undefined)).toEqual([])
    expect(parseAccept('')).toEqual([])
    expect(parseAccept(',')).toEqual([])
  })

  it('parseAccept：逗号分隔串去空格、转小写、丢弃空项', () => {
    expect(parseAccept('image/png,.pdf')).toEqual(['image/png', '.pdf'])
    expect(parseAccept(' IMAGE/PNG , .PDF ,, ')).toEqual(['image/png', '.pdf'])
  })

  it('parseAccept：接受数组入参并做同样的归一化', () => {
    expect(parseAccept(['image/*', ' .GIF '])).toEqual(['image/*', '.gif'])
    expect(parseAccept([])).toEqual([])
  })
})

describe('getFileExt', () => {
  it('getFileExt：返回带点的小写扩展名', () => {
    expect(getFileExt(makeFile('a.png'))).toBe('.png')
    expect(getFileExt(makeFile('a.PNG'))).toBe('.png')
    expect(getFileExt(makeFile('a b.pdf'))).toBe('.pdf')
  })

  it('getFileExt：无扩展名返回空串，多点文件名只取最后一段', () => {
    expect(getFileExt(makeFile('noext'))).toBe('')
    expect(getFileExt(makeFile('archive.tar.gz'))).toBe('.gz')
  })

  it('getFileExt：隐藏文件与结尾点按"最后一个点"切分（.hidden / trailing.）', () => {
    expect(getFileExt(makeFile('.hidden'))).toBe('.hidden')
    expect(getFileExt(makeFile('trailing.'))).toBe('.')
  })
})

describe('resolveFileMime', () => {
  it('resolveFileMime：有 file.type 时以它为准，扩展名不参与', () => {
    expect(resolveFileMime(makeFile('a.png', 'image/png'))).toBe('image/png')
    expect(resolveFileMime(makeFile('a.png', 'application/pdf'))).toBe('application/pdf')
    expect(resolveFileMime(makeFile('a.png', 'IMAGE/PNG'))).toBe('image/png')
  })

  it('resolveFileMime：file.type 为空时按扩展名兜底（含大小写）', () => {
    expect(resolveFileMime(makeFile('a.png'))).toBe('image/png')
    expect(resolveFileMime(makeFile('a.PNG'))).toBe('image/png')
    expect(resolveFileMime(makeFile('a.jpeg'))).toBe('image/jpeg')
    expect(resolveFileMime(makeFile('a.pdf'))).toBe('application/pdf')
  })

  it('resolveFileMime：未知扩展名与无扩展名都返回空串', () => {
    expect(resolveFileMime(makeFile('x.unknown'))).toBe('')
    expect(resolveFileMime(makeFile('noext'))).toBe('')
  })
})

describe('isImageFile', () => {
  it('isImageFile：MIME 为 image/* 时判定为图片', () => {
    expect(isImageFile(makeFile('noext', 'image/png'))).toBe(true)
    expect(isImageFile(makeFile('a.webp'))).toBe(true)
    expect(isImageFile(makeFile('a.bmp'))).toBe(true)
  })

  it('isImageFile：MIME 缺失但扩展名是已知图片时也判定为图片', () => {
    expect(isImageFile(makeFile('a.png'))).toBe(true)
    expect(isImageFile(makeFile('a.SVG'))).toBe(true)
  })

  it('isImageFile：MIME 非图片但扩展名是图片时仍判为图片（扩展名参与识别）', () => {
    expect(isImageFile(makeFile('a.png', 'application/pdf'))).toBe(true)
    expect(isImageFile(makeFile('a.svg', 'text/plain'))).toBe(true)
  })

  it('isImageFile：非图片扩展名与通用二进制类型都判为 false', () => {
    expect(isImageFile(makeFile('noext'))).toBe(false)
    expect(isImageFile(makeFile('.hidden'))).toBe(false)
    expect(isImageFile(makeFile('a.pdf', 'application/pdf'))).toBe(false)
    expect(isImageFile(makeFile('x.bin', 'application/octet-stream'))).toBe(false)
  })
})

describe('isAcceptedType', () => {
  it('isAcceptedType：accept 为空、`*` 或 `*/*` 时视为不限制', () => {
    const pdf = makeFile('a.pdf', 'application/pdf')
    expect(isAcceptedType(pdf, undefined)).toBe(true)
    expect(isAcceptedType(pdf, [])).toBe(true)
    expect(isAcceptedType(pdf, '*')).toBe(true)
    expect(isAcceptedType(pdf, '*/*')).toBe(true)
  })

  it('isAcceptedType：完整 MIME 精确匹配，大小写与空格不敏感', () => {
    const png = makeFile('a.png', 'image/png')
    expect(isAcceptedType(png, 'application/pdf')).toBe(false)
    expect(isAcceptedType(png, 'image/png')).toBe(true)
    expect(isAcceptedType(png, ' IMAGE/PNG ,')).toBe(true)
  })

  it('isAcceptedType：主类型通配 `image/*` 只放行同主类型', () => {
    expect(isAcceptedType(makeFile('a.png', 'image/png'), 'image/*')).toBe(true)
    expect(isAcceptedType(makeFile('a.pdf', 'application/pdf'), 'image/*')).toBe(false)
  })

  it('isAcceptedType：扩展名规则必须以点开头并精确匹配后缀', () => {
    const pdf = makeFile('a.pdf', 'application/pdf')
    expect(isAcceptedType(pdf, '.pdf')).toBe(true)
    expect(isAcceptedType(pdf, '.PDF')).toBe(true)
    expect(isAcceptedType(makeFile('a.png', 'image/png'), '.pdf')).toBe(false)
    expect(isAcceptedType(makeFile('a.png', 'image/png'), 'png')).toBe(false)
  })

  it('isAcceptedType：无斜杠的裸主类型不是合法规则（`image` 不放行 image/png）', () => {
    expect(isAcceptedType(makeFile('a.png', 'image/png'), 'image')).toBe(false)
  })

  it('isAcceptedType：多个规则任一命中即通过', () => {
    expect(isAcceptedType(makeFile('a.pdf', 'application/pdf'), 'image/png, .pdf')).toBe(true)
    expect(isAcceptedType(makeFile('a.zip', 'application/zip'), 'image/png, .pdf')).toBe(false)
  })

  it('isAcceptedType：MIME 为空时扩展名规则仍可用，MIME 规则不可用', () => {
    const noMime = makeFile('a.png', '')
    expect(isAcceptedType(noMime, '.png')).toBe(true)
    expect(isAcceptedType(noMime, 'image/*')).toBe(true)
    expect(isAcceptedType(noMime, 'application/pdf')).toBe(false)
  })

  it('isAcceptedType：MIME 存在时不回退扩展名（octet-stream + .pdf 也走扩展名规则）', () => {
    const octet = makeFile('a.pdf', 'application/octet-stream')
    expect(isAcceptedType(octet, '.pdf')).toBe(true)
    expect(isAcceptedType(octet, 'application/pdf')).toBe(false)
  })
})

describe('fileTypeRule', () => {
  it('fileTypeRule：命中 accept 时返回 true', () => {
    const png = makeFile('a.png', 'image/png')
    expect(fileTypeRule('image/*')({ file: png, index: 0, files: [png] })).toBe(true)
  })

  it('fileTypeRule：不命中时返回 unsupported_type，并带上原始 file 与 index', () => {
    const zip = makeFile('a.zip', 'application/zip')
    const issue = asIssue(fileTypeRule('image/*')({ file: zip, index: 3, files: [zip] }))

    expect(issue.code).toBe('unsupported_type')
    expect(issue.messageKey).toBe('Unsupported file type')
    expect(issue.file).toBe(zip)
    expect(issue.index).toBe(3)
  })

  it('fileTypeRule：accept 为空串时任何文件都通过', () => {
    const zip = makeFile('a.zip', 'application/zip')
    expect(fileTypeRule('')({ file: zip, index: 0, files: [zip] })).toBe(true)
  })
})

describe('fileSizeRule', () => {
  it('fileSizeRule：体积等于上限算通过，超过 1 字节即失败（边界是 <=）', () => {
    const file = makeFile('a.bin', 'application/octet-stream', 2048)
    expect(fileSizeRule(2048)({ file, index: 0, files: [file] })).toBe(true)
    expect(fileSizeRule(2049)({ file, index: 0, files: [file] })).toBe(true)

    const issue = asIssue(fileSizeRule(2047)({ file, index: 0, files: [file] }))
    expect(issue.code).toBe('too_large')
    expect(issue.messageKey).toBe('File exceeds the size limit')
    expect(issue.file).toBe(file)
    expect(issue.index).toBe(0)
  })

  it('fileSizeRule：空文件在 maxBytes 为 0 时仍通过', () => {
    const empty = new File([], 'empty.txt', { type: 'text/plain' })
    expect(empty.size).toBe(0)
    expect(fileSizeRule(0)({ file: empty, index: 0, files: [empty] })).toBe(true)
  })
})

describe('fileCountRule', () => {
  const a = makeFile('a.png', 'image/png')
  const b = makeFile('b.png', 'image/png')

  it('fileCountRule：整批超过 maxCount 时在 index 0 返回 too_many', () => {
    const issue = asIssue(fileCountRule(1)({ file: a, index: 0, files: [a, b] }))
    expect(issue.code).toBe('too_many')
    expect(issue.messageKey).toBe('Too many files')
  })

  it('fileCountRule：只在 index 0 检查一次，后续下标一律通过', () => {
    expect(fileCountRule(1)({ file: b, index: 1, files: [a, b] })).toBe(true)
  })

  it('fileCountRule：数量未超限或文件为空时通过', () => {
    expect(fileCountRule(2)({ file: a, index: 0, files: [a, b] })).toBe(true)
    expect(fileCountRule(0)({ file: a, index: 0, files: [] })).toBe(true)
  })

  it('fileCountRule：失败信息不带 file / index（数量问题不属于某个文件）', () => {
    const issue = asIssue(fileCountRule(1)({ file: a, index: 0, files: [a, b] }))
    expect(issue.file).toBeUndefined()
    expect(issue.index).toBeUndefined()
  })
})

describe('validateFiles', () => {
  it('validateFiles：空文件列表直接返回 empty，不执行任何规则', async () => {
    const rule = vi.fn(fileSizeRule(10))
    expect(await validateFiles([], [rule])).toEqual({ code: 'empty', messageKey: 'Please select a file' })
    expect(rule).not.toHaveBeenCalled()
  })

  it('validateFiles：全部通过时返回 null', async () => {
    const png = makeFile('a.png', 'image/png', 10)
    expect(await validateFiles([png], [fileTypeRule('image/*'), fileSizeRule(10)])).toBeNull()
  })

  it('validateFiles：按"文件 → 规则"顺序短路，返回第一个失败项', async () => {
    const big = makeFile('big.zip', 'application/zip', 2048)
    const png = makeFile('a.png', 'image/png', 10)
    const issue = await validateFiles([big, png], [fileTypeRule('image/*'), fileSizeRule(10)])

    expect(issue).toEqual({
      code: 'unsupported_type',
      messageKey: 'Unsupported file type',
      file: big,
      index: 0,
    })
  })

  it('validateFiles：前一个文件通过后继续校验下一个文件', async () => {
    const ok = makeFile('a.png', 'image/png', 10)
    const big = makeFile('b.png', 'image/png', 2048)
    const issue = await validateFiles([ok, big], [fileTypeRule('image/*'), fileSizeRule(10)])

    expect(issue?.code).toBe('too_large')
    expect(issue?.index).toBe(1)
    expect(issue?.file).toBe(big)
  })
})
