import { describe, expect, it, vi } from 'vitest'
import { normalizeCompanyName, verifyCompanyNameWithABN } from '../src/company-validation.js'

/**
 * `src/company-validation.ts` 的测试。
 *
 * `normalizeCompanyName` 是"公司名与 ABN 注册信息比对"的唯一归一化入口，它决定了
 * 大小写、标点、多余空格这些书写差异会不会被误判成"公司名不匹配"。
 * 这组测试保护：大小写折叠、标点剥离、去首尾空格，以及**标点剥离发生在空格归一之前**
 * 这一顺序（否则 `Acme & Co.` 会留下双空格，两侧归一结果就对不上）。
 *
 * `verifyCompanyNameWithABN` 通过注入 `fetchInfo` 与网络解耦，因此可以离线验证它的
 * 三条出口：必填校验、归一化后比对、异常码映射（ABN 长度错误 vs 其它失败）。
 *
 * 会让它变红的改动：调整标点字符集或 `.replace` 顺序；改动必填判定的 trim 语义；
 * 改动比对是否走归一化；增删或改名 `companyError` / `abnError` 的错误码。
 */
describe('normalizeCompanyName', () => {
  it('normalizeCompanyName：转小写并去掉首尾空白', () => {
    expect(normalizeCompanyName('  ACME Pty Ltd  ')).toBe('acme pty ltd')
  })

  it('normalizeCompanyName：剥离 & . , ; 撇号与括号、连字符', () => {
    expect(normalizeCompanyName("O'Brien Pty. Ltd.")).toBe('obrien pty ltd')
    expect(normalizeCompanyName('x(y)z;s,t')).toBe('xyzst')
    expect(normalizeCompanyName('A&B')).toBe('ab')
    expect(normalizeCompanyName('PTY-LTD')).toBe('ptyltd')
  })

  it('normalizeCompanyName：剥离标点后产生的连续空格归并为单个空格', () => {
    expect(normalizeCompanyName('Acme & Co.')).toBe('acme co')
    expect(normalizeCompanyName('A  B')).toBe('a b')
  })

  it('normalizeCompanyName：空串与纯空白都归一为空串', () => {
    expect(normalizeCompanyName('')).toBe('')
    expect(normalizeCompanyName('   ')).toBe('')
  })

  it('normalizeCompanyName：幂等，重复归一结果不变', () => {
    const once = normalizeCompanyName('  Acme & Co. Pty. Ltd.  ')
    expect(normalizeCompanyName(once)).toBe(once)
  })
})

describe('verifyCompanyNameWithABN', () => {
  it('verifyCompanyNameWithABN：公司名或 ABN 为空（含纯空白）时报 required_field，且不发起查询', async () => {
    const fetchInfo = vi.fn()

    await expect(verifyCompanyNameWithABN('', '12345678901', fetchInfo)).resolves.toEqual({
      isValid: false,
      companyError: 'required_field',
    })
    await expect(verifyCompanyNameWithABN('Acme Pty Ltd', '   ', fetchInfo)).resolves.toEqual({
      isValid: false,
      companyError: 'required_field',
    })
    await expect(verifyCompanyNameWithABN('   ', '12345678901', fetchInfo)).resolves.toEqual({
      isValid: false,
      companyError: 'required_field',
    })
    expect(fetchInfo).not.toHaveBeenCalled()
  })

  it('verifyCompanyNameWithABN：归一化后一致则通过，并回传注册地址信息', async () => {
    const fetchInfo = vi.fn().mockResolvedValue({
      entityName: 'Acme Pty Ltd',
      businessPostCode: '3000',
      businessState: 'VIC',
      businessAddress: '1 Collins St',
    })

    await expect(verifyCompanyNameWithABN('  ACME PTY. LTD.  ', '12345678901', fetchInfo)).resolves.toEqual({
      isValid: true,
      businessPostCode: '3000',
      businessState: 'VIC',
      businessAddress: '1 Collins St',
      companyError: undefined,
    })
    expect(fetchInfo).toHaveBeenCalledWith('12345678901')
  })

  it('verifyCompanyNameWithABN：只差标点与连字符也算匹配', async () => {
    const fetchInfo = vi.fn().mockResolvedValue({ entityName: 'OBRIEN SONS PTY LTD' })
    const result = await verifyCompanyNameWithABN("O'Brien & Sons Pty. Ltd.", '12345678901', fetchInfo)

    expect(result.isValid).toBe(true)
    expect(result.companyError).toBeUndefined()
  })

  it('verifyCompanyNameWithABN：名称不一致时返回比对失败错误码', async () => {
    const fetchInfo = vi.fn().mockResolvedValue({ entityName: 'Acme Pty Ltd' })
    const result = await verifyCompanyNameWithABN('Beta Pty Ltd', '12345678901', fetchInfo)

    expect(result.isValid).toBe(false)
    expect(result.companyError).toBe('form.company_name_not_match_registered_abn')
  })

  it('verifyCompanyNameWithABN：查询无结果时视为不匹配，不抛错', async () => {
    const fetchInfo = vi.fn().mockResolvedValue(null)
    const result = await verifyCompanyNameWithABN('Acme Pty Ltd', '12345678901', fetchInfo)

    expect(result.isValid).toBe(false)
    expect(result.companyError).toBe('form.company_name_not_match_registered_abn')
  })

  it('verifyCompanyNameWithABN：ABN 长度错误映射为 abnError，而不是通用失败', async () => {
    const fetchInfo = vi.fn().mockRejectedValue({ msg: 'abn_length_should_11' })
    const result = await verifyCompanyNameWithABN('Acme Pty Ltd', '123', fetchInfo)

    expect(result.isValid).toBe(false)
    expect(result.abnError).toBe('form.abn_length_should_11')
    expect(result.companyError).toBeUndefined()
  })

  it('verifyCompanyNameWithABN：其它异常统一映射为查询失败错误码', async () => {
    const fetchInfo = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await verifyCompanyNameWithABN('Acme Pty Ltd', '12345678901', fetchInfo)

    expect(result.isValid).toBe(false)
    expect(result.companyError).toBe('form.company_info_verification_failed')
  })
})
