/*
  # 修复 task_info 表结构

  1. 表结构修复
    - 确保 task_id 是主键
    - 移除不必要的 id 列（如果存在）
    - 确保正确的约束和索引

  2. 安全性
    - 保持现有的 RLS 策略
    - 确保数据完整性
*/

-- 如果表已存在，先备份数据
DO $$
BEGIN
  -- 检查表是否存在
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_info') THEN
    -- 如果表存在但结构不正确，重新创建
    
    -- 删除现有约束和索引
    ALTER TABLE public.task_info DROP CONSTRAINT IF EXISTS task_info_pkey;
    ALTER TABLE public.task_info DROP CONSTRAINT IF EXISTS task_info_task_id_key;
    
    -- 如果存在 id 列，删除它
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'task_info' AND column_name = 'id'
    ) THEN
      ALTER TABLE public.task_info DROP COLUMN id;
    END IF;
    
    -- 确保 task_id 不为空的记录有正确的主键
    -- 使用 task_id 作为唯一标识符
    ALTER TABLE public.task_info ADD CONSTRAINT task_info_task_id_key UNIQUE (task_id);
    
    RAISE NOTICE 'task_info table structure fixed';
  ELSE
    -- 如果表不存在，创建新表
    CREATE TABLE public.task_info (
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      uuid uuid NOT NULL REFERENCES public.user_info(uuid) ON DELETE CASCADE,
      task_id bigint NOT NULL,
      task_folder_name text,
      task_name text,
      system_prompt text,
      chatinfo jsonb DEFAULT '[]'::jsonb,
      model_params jsonb DEFAULT '{}'::jsonb,
      CONSTRAINT task_info_task_id_key UNIQUE (task_id)
    );
    
    -- 启用 RLS
    ALTER TABLE public.task_info ENABLE ROW LEVEL SECURITY;
    
    -- 创建 RLS 策略
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
    
    RAISE NOTICE 'task_info table created successfully';
  END IF;
END $$;

-- 重新创建索引
CREATE INDEX IF NOT EXISTS idx_task_info_uuid ON public.task_info (uuid);
CREATE INDEX IF NOT EXISTS idx_task_info_task_id ON public.task_info (task_id);
CREATE INDEX IF NOT EXISTS idx_task_info_folder_name ON public.task_info (task_folder_name);

-- 添加 GIN 索引用于 JSONB 字段
CREATE INDEX IF NOT EXISTS idx_task_info_chatinfo_gin ON public.task_info USING gin (chatinfo);
CREATE INDEX IF NOT EXISTS idx_task_info_model_params_gin ON public.task_info USING gin (model_params);

-- 添加表和字段注释
COMMENT ON TABLE public.task_info IS '存储用户任务和文件夹信息';
COMMENT ON COLUMN public.task_info.uuid IS '用户ID，关联到 user_info(uuid)';
COMMENT ON COLUMN public.task_info.task_id IS '任务唯一ID';
COMMENT ON COLUMN public.task_info.task_folder_name IS '文件夹名称';
COMMENT ON COLUMN public.task_info.task_name IS '任务文件名';
COMMENT ON COLUMN public.task_info.system_prompt IS '当前任务的系统提示词内容';
COMMENT ON COLUMN public.task_info.chatinfo IS '聊天历史记录，JSONB 数组格式';
COMMENT ON COLUMN public.task_info.model_params IS '模型参数配置，JSONB 对象格式';