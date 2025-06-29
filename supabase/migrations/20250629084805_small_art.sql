/*
  # 修复 task_info 表的约束问题

  1. 问题分析
    - task_info_uuid_key 唯一约束导致一个用户无法创建多个任务
    - 需要移除 uuid 字段的唯一约束
    - 保留 task_id 的唯一约束（每个任务ID全局唯一）

  2. 修复方案
    - 删除错误的唯一约束
    - 重新设置正确的约束和索引
    - 确保一个用户可以有多个任务记录
*/

-- 删除错误的唯一约束
ALTER TABLE public.task_info DROP CONSTRAINT IF EXISTS task_info_uuid_key;
ALTER TABLE public.task_info DROP CONSTRAINT IF EXISTS task_info_task_name_key;

-- 删除可能存在的错误索引
DROP INDEX IF EXISTS task_info_uuid_key;
DROP INDEX IF EXISTS task_info_task_name_key;

-- 确保 task_id 是唯一的（如果不存在的话）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'task_info' 
    AND constraint_name = 'task_info_task_id_key'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE public.task_info ADD CONSTRAINT task_info_task_id_key UNIQUE (task_id);
  END IF;
END $$;

-- 重新创建正确的索引（非唯一）
CREATE INDEX IF NOT EXISTS idx_task_info_uuid ON public.task_info (uuid);
CREATE INDEX IF NOT EXISTS idx_task_info_task_id ON public.task_info (task_id);
CREATE INDEX IF NOT EXISTS idx_task_info_folder_name ON public.task_info (task_folder_name);

-- 验证表结构
DO $$
BEGIN
  -- 检查是否还有错误的唯一约束
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'task_info' 
    AND constraint_name = 'task_info_uuid_key'
    AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE EXCEPTION 'UUID unique constraint still exists - manual intervention required';
  END IF;
  
  RAISE NOTICE 'task_info table constraints fixed successfully';
END $$;