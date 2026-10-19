-- 可空增量列：旧工作区不改写，应用层使用系统默认。
ALTER TABLE "resume_workspaces" ADD COLUMN "pdf_config" JSONB;
