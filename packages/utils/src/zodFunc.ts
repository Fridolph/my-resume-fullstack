import { isValidPhoneNumber } from 'libphonenumber-js'
import * as z from 'zod'

export function zNonEmptyString(msg?: string) {
  return z.string().min(1, { message: msg })
}

/**
 * 电话号码校验（libphonenumber-js）。
 * - `required: false`（默认）：空 / null 通过，有值则须合法
 * - `required: true`：必须非空且合法
 */
export function zPhone(options?: { required?: boolean; message?: string }) {
  const required = options?.required ?? false
  const message = options?.message

  const isValid = (val: string | null | undefined) => {
    if (!val) return !required
    return isValidPhoneNumber(val)
  }

  if (required) {
    return z.string({ message }).refine(isValid, { error: message })
  }

  return z.string().nullish().refine(isValid, { error: message })
}
