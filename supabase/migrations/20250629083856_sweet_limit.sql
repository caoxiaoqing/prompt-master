/*
  # 修复 task_info 表的 RLS 策略

  1. 问题分析
    - 当前 RLS 策略可能过于严格，阻止了新任务的创建
    - 需要确保认证用户可以为自己创建任务记录

  2. 解决方案
    - 重新创建更宽松的 RLS 策略
    - 确保策略正确匹配用户 UUID
    - 添加调试友好的策略名称

  3. 安全考虑
    - 仍然确保用户只能访问自己的数据
    - 保持数据隔离和安全性
*/

-- 删除现有的 RLS 策略
DROP POLICY IF EXISTS "Users can read own task_info" ON public.task_info;
DROP POLICY IF EXISTS "Users can insert own task_info" ON public.task_info;
DROP POLICY IF EXISTS "Users can update own task_info" ON public.task_info;
DROP POLICY IF EXISTS "Users can delete own task_info" ON public.task_info;

-- 创建新的 RLS 策略，使用更明确的条件
CREATE POLICY "Allow authenticated users to read their own task_info"
  ON public.task_info
  FOR SELECT
  TO authenticated
  USING (uuid = auth.uid());

CREATE POLICY "Allow authenticated users to insert their own task_info"
  ON public.task_info
  FOR INSERT
  TO authenticated
  WITH CHECK (uuid = auth.uid());

CREATE POLICY "Allow authenticated users to update their own task_info"
  ON public.task_info
  FOR UPDATE
  TO authenticated
  USING (uuid = auth.uid())
  WITH CHECK (uuid = auth.uid());

CREATE POLICY "Allow authenticated users to delete their own task_info"
  ON public.task_info
  FOR DELETE
  TO authenticated
  USING (uuid = auth.uid());

-- 确保 RLS 已启用
ALTER TABLE public.task_info ENABLE ROW LEVEL SECURITY;

-- 验证策略是否正确创建
DO $$
BEGIN
  -- 检查策略是否存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_info' 
    AND policyname = 'Allow authenticated users to insert their own task_info'
  ) THEN
    RAISE EXCEPTION 'RLS policy creation failed';
  END IF;
  
  RAISE NOTICE 'RLS policies for task_info table created successfully';
END $$;