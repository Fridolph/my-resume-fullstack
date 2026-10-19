import assert from 'node:assert/strict'
import { test } from 'vitest'
import { UPLOAD_MAX_FILE_BYTES, extensionForMime, UPLOAD_ALLOWED_MIMES } from '@rs/common'
import { buildRelativePath, normalizePurpose, validateUpload } from '../upload.rules'

/**
 * 上传规则的测试重点不是"正常路径"（那用一眼就能看出来），而是**两个方向的错误**：
 * 放过不该放的文件（安全）与拒绝合法文件（体验事故）。两者都不会抛异常，
 * 只会安静地错 —— 所以必须有断言兜住。
 */

test('白名单内的类型通过，并按 MIME 反推扩展名', () => {
  const png = validateUpload({ mimetype: 'image/png', size: 1024 })
  assert.equal(png.ok, true)
  assert.equal(png.ok && png.ext, '.png')
  assert.equal(png.ok && png.mime, 'image/png')

  // 与扩展名无关：客户端把 .exe 改名成 .png 也没用，判的是 MIME
  assert.equal(extensionForMime('image/png'), '.png')
  assert.equal(extensionForMime('application/x-msdownload'), undefined)
})

test('白名单外的类型被拒（含 svg 这类"看起来是图片"的）', () => {
  for (const mimetype of ['image/svg+xml', 'text/html', 'application/x-msdownload', '']) {
    const result = validateUpload({ mimetype, size: 10 })
    assert.equal(result.ok, false, `${mimetype} 不该被放行`)
  }
})

test('空文件与超限文件都被拒', () => {
  assert.equal(validateUpload({ mimetype: 'image/png', size: 0 }).ok, false)
  assert.equal(validateUpload({ mimetype: 'image/png', size: UPLOAD_MAX_FILE_BYTES + 1 }).ok, false)
  // 边界值本身应当通过（> 而不是 >=）
  assert.equal(validateUpload({ mimetype: 'image/png', size: UPLOAD_MAX_FILE_BYTES }).ok, true)
})

test('用途：缺省给了 resume-asset，非法值返回 undefined 交给上层报 400', () => {
  assert.equal(normalizePurpose(undefined), 'resume-asset')
  assert.equal(normalizePurpose('avatar'), 'avatar')
  assert.equal(normalizePurpose('../../etc'), undefined)
})

test('落盘路径按用途 + 日期分桶，文件名用 uuid（原始名不参与路径）', () => {
  const path = buildRelativePath({
    purpose: 'avatar',
    ext: '.png',
    uuid: '7f3c-uuid',
    now: new Date('2026-10-17T12:00:00Z'),
  })

  assert.equal(path, 'avatar/2026/10/7f3c-uuid.png')
  // 不含用户 id、不含原始文件名：路径是存储结构，权限由 DB 的 ownerId 表达
  assert.equal(path.includes('u-1'), false)
})

test('每一个 MIME 白名单项都能反推出扩展名（防止加了一项却忘了配扩展名）', () => {
  for (const [mime, ext] of Object.entries(UPLOAD_ALLOWED_MIMES)) {
    assert.equal(extensionForMime(mime), ext, `${mime} 缺扩展名`)
    assert.ok(ext.startsWith('.'), `${mime} 的扩展名应以点开头`)
  }
})
