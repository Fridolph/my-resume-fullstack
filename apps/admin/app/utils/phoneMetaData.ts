import type { CountryCode, PhoneNumberType } from 'libphonenumber-js'
import { getCountries, getCountryCallingCode, getExampleNumber, Metadata } from 'libphonenumber-js'
import { parsePhoneNumberFromString } from 'libphonenumber-js/core'
import examples from 'libphonenumber-js/examples.mobile.json'
import metadata from 'libphonenumber-js/metadata.full.json'

export type { PhoneNumberType }

export interface CountryMetadata {
  code: string
  name: string
  dialCode: string
  flag: string
  mobilePlaceholder: string // 原始示例，如 "138 0000 0000"
  fixedPlaceholder: string // 原始示例，如 "010 1234 5678"
  mobileMask: string // 转换后的 maska 格式，如 "### #### ####"
  fixedMask: string // 转换后的 maska 格式，如 "(###) ####-####"
  /** 该国国内号码最大位数，用于输入框允许 SHARED_COST / 座机等长于手机号的类型 */
  maxNationalLength: number
}

// 核心转换函数：把数字变成 Maska 认识的 # 号
function convertToMaskaPattern(examplePattern: string): string {
  if (!examplePattern) return ''
  // 将所有的数字 (0-9) 替换为 #，保留空格、括号、短横线等分隔符
  return examplePattern.replace(/\d/g, '#')
}

function getFlagEmoji(countryCode: string): string {
  return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))
}

/** 用 Intl.DisplayNames 生成可筛选、可展示的国家名称 */
function getCountryName(countryCode: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode) || countryCode
  } catch {
    return countryCode
  }
}

/**
 * 生成各国电话元数据（区号、国旗、名称、maska 遮罩等）。
 * placeholder / mask 取自国际格式并去掉区号，避免 formatNational 带来的 trunk 前缀 0（如 AU 的 0412…）。
 */
export function generatePhoneMetadata(locale = 'en'): CountryMetadata[] {
  const numberingMetadata = new Metadata()

  return getCountries()
    .map(code => {
      const dialCode = `+${getCountryCallingCode(code)}`
      const flag = getFlagEmoji(code)
      const name = getCountryName(code, locale)

      numberingMetadata.selectNumberingPlan(code)
      const possibleLengths = numberingMetadata.numberingPlan?.possibleLengths() ?? []
      const maxNationalLength = possibleLengths.length ? Math.max(...possibleLengths) : 15

      let mobilePlaceholder = ''
      try {
        // @ts-expect-error 使用 type 覆盖以获取非手机的示例数据
        const mobileExample = getExampleNumber(code, examples, metadata)
        if (mobileExample) {
          // 国际格式去掉区号，与输入框左侧 dialCode 展示配合，且不含国内 trunk 0
          const international = mobileExample.formatInternational()
          mobilePlaceholder = international.startsWith(dialCode)
            ? international.slice(dialCode.length).trimStart()
            : international.replace(/^\+\d+\s*/, '')
        }
      } catch (e) {
        console.error(e)
      }

      const fixedPlaceholder = mobilePlaceholder
      // 这里也可以尝试获取座机的特定样本，如果获取不到则降级

      return {
        code,
        name,
        dialCode,
        flag,
        mobilePlaceholder,
        fixedPlaceholder,
        // 转换为给 Maska 用的格式
        mobileMask: convertToMaskaPattern(mobilePlaceholder),
        fixedMask: convertToMaskaPattern(fixedPlaceholder),
        maxNationalLength,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale))
}

/**
 * 将号码格式化为国际展示（如 +49 123 456）。
 * phone 为空或非字符串时返回空串，避免 libphonenumber-js 抛 TypeError 打断渲染。
 */
export function formatPhoneInternational(phone: string | null | undefined): string {
  if (typeof phone !== 'string' || !phone) return ''

  return parsePhoneNumberFromString(phone, metadata)?.formatInternational() ?? phone
}

/**
 * 获取号码类型（MOBILE、FIXED_LINE、SHARED_COST、TOLL_FREE 等）。
 * 使用完整 metadata，才能识别 AU 1300 这类 SHARED_COST。
 * 无法解析或无法判定类型时返回 undefined。
 */
export function getPhoneNumberType(
  phone: string | null | undefined,
  defaultCountry?: CountryCode,
): PhoneNumberType | undefined {
  if (!phone) return undefined

  const parsed = defaultCountry
    ? parsePhoneNumberFromString(phone, defaultCountry, metadata)
    : parsePhoneNumberFromString(phone, metadata)

  return parsed?.getType()
}
