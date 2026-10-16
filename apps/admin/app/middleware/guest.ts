export default defineNuxtRouteMiddleware(() => {
  const { isAuthed } = useAuthState()

  // 已登录的用户不该停在登录页（例如直接用书签打开 /login）
  if (isAuthed.value) {
    return navigateTo('/')
  }
})
