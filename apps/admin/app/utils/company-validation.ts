export interface CompanyNumberInfo {
  entityName?: string
  businessPostCode?: string
  businessState?: string
  businessAddress?: string
}

export interface VerificationResult {
  isValid: boolean
  businessPostCode?: string
  businessState?: string
  businessAddress?: string
  abnError?: string // ABN 长度等校验错误
  companyError?: string // 公司名校验错误
}

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[&.,;'()-]/g, '') // 去掉常见公司名特殊字符
    .replace(/\s+/g, ' ') // 多空格归一
}

/**
 * 校验公司名与 ABN（澳大利亚商业号）是否匹配。
 * `fetchInfo` 由调用方注入（如 `(abn) => SettingsApi.getCompanyNumberInfo({ companyNumber: abn })`），
 * 保持本工具与具体 API 解耦。
 */
export async function verifyCompanyNameWithABN(
  companyName: string,
  abn: string,
  fetchInfo: (abn: string) => Promise<CompanyNumberInfo | null | undefined>,
): Promise<VerificationResult> {
  if (!companyName?.trim() || !abn?.trim()) {
    return { isValid: false, companyError: 'required_field' }
  }

  try {
    const result = await fetchInfo(abn)

    const normalizedInputName = normalizeCompanyName(companyName)
    const normalizedEntityName = normalizeCompanyName(result?.entityName || '')

    const isValid = normalizedInputName === normalizedEntityName

    return {
      isValid,
      businessPostCode: result?.businessPostCode,
      businessState: result?.businessState,
      businessAddress: result?.businessAddress,
      companyError: isValid ? undefined : 'form.company_name_not_match_registered_abn',
    }
  } catch (error: any) {
    if (error?.msg === 'abn_length_should_11') {
      return { isValid: false, abnError: 'form.abn_length_should_11' }
    }
    return { isValid: false, companyError: 'form.company_info_verification_failed' }
  }
}
