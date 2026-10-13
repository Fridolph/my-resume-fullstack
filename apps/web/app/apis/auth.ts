import type { BackendIdentity } from '~/types/auth'

export function createAuthApi() {
  const { $api } = useNuxtApp()
  return {
    login: (input: { account: string; password: string }) =>
      $api<BackendIdentity & { token: string }>('/auth/login', { method: 'POST', body: input, silent: true, retry: 0 }),
    identity: () => $api<BackendIdentity>('/auth/info', { silent: true, retry: 0 }),
  }
}
