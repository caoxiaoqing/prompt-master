-- Add language preference column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_info' AND column_name = 'language'
  ) THEN
    ALTER TABLE user_info ADD COLUMN language text DEFAULT 'zh-CN';
  END IF;
END $$;

-- Add timezone preference column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_info' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE user_info ADD COLUMN timezone text DEFAULT 'Asia/Shanghai';
  END IF;
END $$;

-- Add custom models configuration column (without topK, topP, temperature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_info' AND column_name = 'custom_models'
  ) THEN
    ALTER TABLE user_info ADD COLUMN custom_models jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add default model ID column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_info' AND column_name = 'default_model_id'
  ) THEN
    ALTER TABLE user_info ADD COLUMN default_model_id text;
  END IF;
END $$;

-- Add index for better performance on custom_models queries
CREATE INDEX IF NOT EXISTS idx_user_info_custom_models ON user_info USING gin (custom_models);

-- Add comment for documentation
COMMENT ON COLUMN user_info.language IS 'User interface language preference (e.g., zh-CN, en-US)';
COMMENT ON COLUMN user_info.timezone IS 'User timezone setting (IANA timezone identifier)';
COMMENT ON COLUMN user_info.custom_models IS 'Array of custom AI model configurations (name, baseUrl, apiKey only)';
COMMENT ON COLUMN user_info.default_model_id IS 'ID of the default model for new tasks and chats';