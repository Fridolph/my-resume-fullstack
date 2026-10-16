-- 修复历史漂移：`role_permissions` / `user_roles` 的外键在库里缺少级联动作。
--
-- 由来：`20261013120000_internal_int_ids` 改主键类型时重建了这些外键，但没带上 schema 里声明的
-- `ON DELETE CASCADE` / `ON UPDATE CASCADE`；结果是「删角色/权限时关联记录不会级联清理」，
-- 与 `schema.prisma` 的声明不一致（DAO-036 期间修 #45 重放 shadow 时暴露）。
--
-- 本迁移只改外键约束，不动数据；回滚方式为重新加回不带级联的约束。

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
