/**
 * 当前用户的权限集（脚手架阶段为 mock）。
 *
 * 用 `useState` 存放，接入后端认证后：在拿到 session 时调用
 * `setPermissionKeys(session.permissionList[0].permissionPermitKeys)` 写入即可，
 * `PermissionWrapper` / 页面里的权限判断无需改动。
 */
export function usePermission() {
  const permissionKeys = useState<string[]>('permission-keys', () => [])

  /** 传数组时要求**全部**满足 */
  function hasPermission(keys: string | string[]) {
    if (Array.isArray(keys))
      return keys.every(k => permissionKeys.value.includes(k))
    return permissionKeys.value.includes(keys)
  }

  function setPermissionKeys(keys: string[]) {
    permissionKeys.value = keys
  }

  return { permissionKeys, hasPermission, setPermissionKeys }
}
