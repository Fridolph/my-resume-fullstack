-- 内部实体主键从 cuid(text) 改为 integer 自增，并迁移既有数据。
--
-- 背景：面向人的实体（users）保留 cuid —— 它出现在 URL 与外部引用里，不可枚举、不泄露数量；
-- 纯内部字典/关联实体（roles / permissions / resumes / resume_drafts）改 integer 自增，
-- 便于人工查找与维护。
--
-- ⚠️ Postgres 无法直接把 cuid 文本转成整数，因此全程用「临时列 + row_number() 映射」，
-- 而不是 DROP/ADD。整个迁移在单个事务内执行，失败会整体回滚。
--
-- 映射规则：按 created_at（resume_drafts 是 updated_at）+ 原 id 排序取行号，保证结果确定。

-- ═══════════════════════════════════════════════════════════════════════
-- 1) 先拆掉所有受影响的外键与主键（改列类型前必须拆）
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pkey";
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";
ALTER TABLE "resume_drafts" DROP CONSTRAINT "resume_drafts_pkey";
ALTER TABLE "resume_drafts" DROP CONSTRAINT "resume_drafts_resume_id_fkey";

-- ═══════════════════════════════════════════════════════════════════════
-- 2) 三张主表：加临时整数列并填充行号
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "roles" ADD COLUMN "new_id" INTEGER;
UPDATE "roles" SET "new_id" = m.rn
  FROM (SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS rn FROM "roles") m
  WHERE "roles"."id" = m."id";

ALTER TABLE "permissions" ADD COLUMN "new_id" INTEGER;
UPDATE "permissions" SET "new_id" = m.rn
  FROM (SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS rn FROM "permissions") m
  WHERE "permissions"."id" = m."id";

ALTER TABLE "resumes" ADD COLUMN "new_id" INTEGER;
UPDATE "resumes" SET "new_id" = m.rn
  FROM (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS rn FROM "resumes") m
  WHERE "resumes"."id" = m."id";

-- ═══════════════════════════════════════════════════════════════════════
-- 3) 关联表：按上一步的映射填充新的整数外键
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "role_permissions" ADD COLUMN "new_roleId" INTEGER, ADD COLUMN "new_permissionId" INTEGER;
UPDATE "role_permissions" rp SET "new_roleId" = r."new_id" FROM "roles" r WHERE rp."roleId" = r."id";
UPDATE "role_permissions" rp SET "new_permissionId" = p."new_id" FROM "permissions" p WHERE rp."permissionId" = p."id";

ALTER TABLE "user_roles" ADD COLUMN "new_roleId" INTEGER;
UPDATE "user_roles" ur SET "new_roleId" = r."new_id" FROM "roles" r WHERE ur."roleId" = r."id";

ALTER TABLE "resume_drafts" ADD COLUMN "new_resumeId" INTEGER;
UPDATE "resume_drafts" rd SET "new_resumeId" = r."new_id" FROM "resumes" r WHERE rd."resume_id" = r."id";

-- ═══════════════════════════════════════════════════════════════════════
-- 4) 主表换列：删旧主键、改名、建自增（Prisma 的 autoincrement 对应 SERIAL 语义）
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "roles" DROP COLUMN "id";
ALTER TABLE "roles" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "roles" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");
CREATE SEQUENCE "roles_id_seq" OWNED BY "roles"."id";
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX("id"), 0) FROM "roles"));
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT nextval('roles_id_seq');

ALTER TABLE "permissions" DROP COLUMN "id";
ALTER TABLE "permissions" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "permissions" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");
CREATE SEQUENCE "permissions_id_seq" OWNED BY "permissions"."id";
SELECT setval('permissions_id_seq', (SELECT COALESCE(MAX("id"), 0) FROM "permissions"));
ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT nextval('permissions_id_seq');

ALTER TABLE "resumes" DROP COLUMN "id";
ALTER TABLE "resumes" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "resumes" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_pkey" PRIMARY KEY ("id");
CREATE SEQUENCE "resumes_id_seq" OWNED BY "resumes"."id";
SELECT setval('resumes_id_seq', (SELECT COALESCE(MAX("id"), 0) FROM "resumes"));
ALTER TABLE "resumes" ALTER COLUMN "id" SET DEFAULT nextval('resumes_id_seq');

-- ═══════════════════════════════════════════════════════════════════════
-- 5) 关联表换列 + 重建复合主键与外键
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "role_permissions" DROP COLUMN "roleId";
ALTER TABLE "role_permissions" DROP COLUMN "permissionId";
ALTER TABLE "role_permissions" RENAME COLUMN "new_roleId" TO "roleId";
ALTER TABLE "role_permissions" RENAME COLUMN "new_permissionId" TO "permissionId";
ALTER TABLE "role_permissions" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "role_permissions" ALTER COLUMN "permissionId" SET NOT NULL;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId");
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE;

ALTER TABLE "user_roles" DROP COLUMN "roleId";
ALTER TABLE "user_roles" RENAME COLUMN "new_roleId" TO "roleId";
ALTER TABLE "user_roles" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "roleId");
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════
-- 6) resume_drafts：resume_id 变整数并加唯一约束；新增自增主键 id
--    （1:1 关系由 resume_id 的 UNIQUE 保证，id 只是代理主键）
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "resume_drafts" DROP COLUMN "resume_id";
ALTER TABLE "resume_drafts" RENAME COLUMN "new_resumeId" TO "resume_id";
ALTER TABLE "resume_drafts" ALTER COLUMN "resume_id" SET NOT NULL;
ALTER TABLE "resume_drafts" ADD CONSTRAINT "resume_drafts_resume_id_key" UNIQUE ("resume_id");
ALTER TABLE "resume_drafts" ADD CONSTRAINT "resume_drafts_resume_id_fkey"
  FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE RESTRICT;

ALTER TABLE "resume_drafts" ADD COLUMN "id" SERIAL;
ALTER TABLE "resume_drafts" ADD CONSTRAINT "resume_drafts_pkey" PRIMARY KEY ("id");
