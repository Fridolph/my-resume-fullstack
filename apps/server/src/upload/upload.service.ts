import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { UploadPurpose, UploadedFile } from '@rs/common'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { PrismaService } from '../prisma/prisma.service'
import { buildRelativePath, validateUpload, type UploadedFileLike } from './upload.rules'

/** 落盘根目录：`apps/server/static/upload`（相对进程工作目录，dev 与 `dist/main` 都是包根） */
const UPLOAD_ROOT = join(process.cwd(), 'static', 'upload')

/** 对外 URL 前缀（`main.ts` 把 `static/` 挂在 `/static/`） */
const PUBLIC_PREFIX = '/static/upload'

/**
 * 上传落盘与记录。
 *
 * ## 为什么先写盘、再写库，且失败不补偿
 *
 * 顺序反过来的话（先写库再写盘），写盘失败会留下"库里有一条、文件不存在"的记录 ——
 * 那比"磁盘上多一个孤儿文件"更糟：前者会让所有读记录的路径 404，后者只是浪费空间。
 * 孤儿文件由**用途 + 日期**分桶，将来清理有可判定的输入（见 `DAO-036` 的清理策略）。
 *
 * ## 为什么用内存缓冲再写盘（而不是 multer 直接落盘）
 *
 * 我们要在**写盘前**校验 MIME / 大小 / 生成 uuid 文件名；直落盘等于先占磁盘再拒绝。
 * 代价是内存峰值 ≈ 单文件上限 × 并发数（5MB × 10），对当前规模可接受。
 */
@Injectable()
export class UploadService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 保存一批上传文件，返回可公开访问的记录。
   *
   * @param files multer 的内存文件（`buffer` 已在内存里）
   * @param purpose 用途（决定磁盘一级目录）；调用方已校验过取值
   * @param currentUser 上传者，来自 `req.user` —— **不接受客户端指定**
   */
  async saveMany(files: UploadedFileLike[], purpose: UploadPurpose, currentUser: AuthUser): Promise<UploadedFile[]> {
    if (!files.length) {
      throw new BadRequestException('没有收到文件', {
        errorCode: API_ERROR_CODES.UPLOAD_INVALID,
      })
    }

    const now = new Date()
    const results: UploadedFile[] = []

    for (const file of files) {
      const checked = validateUpload(file)
      if (!checked.ok) {
        // 整批拒绝而不是跳过这一个：部分成功会让调用方拿到"数量对不上"的结果，
        // 而前端通常只提示一次；宁可让它重传整批，也不要留下难以解释的半数成功。
        throw new BadRequestException(`文件「${file.originalname}」${checked.reason}`, {
          errorCode: API_ERROR_CODES.UPLOAD_INVALID,
        })
      }

      const relativePath = buildRelativePath({ purpose, ext: checked.ext, uuid: randomUUID(), now })
      const absolutePath = join(UPLOAD_ROOT, relativePath)

      await mkdir(dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, file.buffer)

      const record = await this.prismaService.uploadedFile.create({
        data: {
          ownerId: currentUser.userId,
          purpose,
          path: relativePath,
          // 原始名只进库：它会出现在 UI 与下载命名里，但**不参与路径**
          originalName: file.originalname.slice(0, 255),
          mime: checked.mime,
          size: file.size,
        },
        select: { id: true, path: true, originalName: true, size: true, mime: true },
      })

      results.push({
        id: record.id,
        url: `${PUBLIC_PREFIX}/${record.path}`,
        name: record.originalName,
        size: record.size,
        mime: record.mime,
        purpose,
      })
    }

    return results
  }
}
