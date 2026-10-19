/** 无数据库 HTTP 验收：生产 Controller/Guard/Strategy/Renderer，固定身份与简历仓储替身。 */
import 'reflect-metadata'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { Module, StandardSchemaValidationPipe, NotFoundException } from '@nestjs/common'
import { APP_GUARD, NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'
import { JwtService } from '@nestjs/jwt'
import { buildResumeDocument, canonicalResumeJson } from '@rs/common'
import { ResumePdfController } from '../dist/resume/resume-pdf.controller.js'
import { ResumePdfRenderer, ResumePdfService } from '../dist/resume/resume-pdf.service.js'
import { ResumeService } from '../dist/resume/resume.service.js'
import { JwtAuthGuard } from '../dist/auth/jwt-auth.guard.js'
import { JwtStrategy } from '../dist/auth/jwt.strategy.js'
import { AuthService } from '../dist/auth/auth.service.js'
import { ApiResponseInterceptor } from '../dist/common/api-response.interceptor.js'
import { ApiExceptionFilter } from '../dist/common/api-exception.filter.js'
const document = buildResumeDocument({ content: { sections: [{ type: 'profile', data: { name: 'HTTP 导出测试' } }] } })
const identity = { userId: 'pdf-fixture-owner', sessionVersion: 0, roleKeys: ['admin'], permissionKeys: [] }
const secret = 'isolated-pdf-test-key-only-no-production-secret'
class PdfTestModule {}
Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt', session: false })],
  controllers: [ResumePdfController],
  providers: [
    ResumePdfRenderer,
    ResumePdfService,
    JwtStrategy,
    { provide: ConfigService, useValue: { getOrThrow: () => secret } },
    { provide: AuthService, useValue: { restoreUser: async () => identity } },
    {
      provide: ResumeService,
      useValue: {
        findDraft: async (id, user) => {
          if (id !== 1 || user.userId !== identity.userId) throw new NotFoundException()
          return { document }
        },
        findPublished: async id => {
          if (id !== 1) throw new NotFoundException()
          return { document }
        },
      },
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})(PdfTestModule)
const app = await NestFactory.create(PdfTestModule, { logger: false })
app.setGlobalPrefix('api')
app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }))
app.useGlobalInterceptors(new ApiResponseInterceptor())
app.useGlobalFilters(new ApiExceptionFilter())
await app.listen(0, '127.0.0.1')
const base = await app.getUrl()
try {
  const token = new JwtService({ secret }).sign({ sub: identity.userId, sessionVersion: 0 })
  const documentHash = createHash('sha256').update(canonicalResumeJson(document)).digest('hex')
  const request = (id, body, auth = true) =>
    fetch(`${base}/api/resume/${id}/pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
  let response = await request(1, { source: 'draft', documentHash }, false)
  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 401)
  response = await request(2, { source: 'draft', documentHash })
  assert.equal(response.status, 404)
  response = await request(1, { source: 'draft', documentHash: '0'.repeat(64) })
  assert.equal(response.status, 409)
  assert.equal((await response.json()).errorCode, 'Resume.Pdf:changed')
  response = await request(1, { source: 'draft', documentHash, url: 'http://localhost' })
  assert.equal(response.status, 400)
  for (const source of ['draft', 'published']) {
    response = await request(1, { source, documentHash })
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /application\/pdf/)
    assert.match(response.headers.get('content-disposition'), /attachment/)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const buffer = Buffer.from(await response.arrayBuffer())
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-')
  }
  console.log(
    'HTTP 验证通过：真实 JWT Guard、schema 400、401、404、409、双数据源 200、PDF 字节与响应头。无数据库写入。',
  )
} finally {
  await app.close()
}
