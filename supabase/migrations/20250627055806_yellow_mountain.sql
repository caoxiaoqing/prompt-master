/*
  # Add RLS policies for user_info table

  1. Security
    - Add policy for authenticated users to insert their own user_info record
    - Add policy for authenticated users to read their own user_info record
    - Add policy for authenticated users to update their own user_info record

  This migration fixes the RLS policy violations that were preventing user registration and profile access.
*/

-- Policy to allow authenticated users to insert their own user_info record
CREATE POLICY "Allow authenticated users to insert their own user_info"
  ON user_info
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uuid);

-- Policy to allow authenticated users to read their own user_info record
CREATE POLICY "Allow authenticated users to read their own user_info"
  ON user_info
  FOR SELECT
  TO authenticated
  USING (auth.uid() = uuid);

-- Policy to allow authenticated users to update their own user_info record
CREATE POLICY "Allow authenticated users to update their own user_info"
  ON user_info
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uuid)
  WITH CHECK (auth.uid() = uuid);