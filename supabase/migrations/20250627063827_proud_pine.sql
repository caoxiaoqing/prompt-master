/*
  # Fix User Registration RLS Policy

  1. Security Updates
    - Update RLS policies to allow user registration
    - Add policy for users to insert their own data during registration
    - Ensure proper authentication flow

  2. Changes
    - Add INSERT policy that allows authenticated users to create their own user_info record
    - Update existing policies to be more permissive for registration flow
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow authenticated users to insert their own user_info" ON user_info;
DROP POLICY IF EXISTS "Allow authenticated users to read their own user_info" ON user_info;
DROP POLICY IF EXISTS "Allow authenticated users to update their own user_info" ON user_info;

-- Create new policies that properly handle the registration flow
CREATE POLICY "Allow authenticated users to insert their own user_info"
  ON user_info
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uuid);

CREATE POLICY "Allow authenticated users to read their own user_info"
  ON user_info
  FOR SELECT
  TO authenticated
  USING (auth.uid() = uuid);

CREATE POLICY "Allow authenticated users to update their own user_info"
  ON user_info
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uuid)
  WITH CHECK (auth.uid() = uuid);

-- Also allow users to delete their own records if needed
CREATE POLICY "Allow authenticated users to delete their own user_info"
  ON user_info
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uuid);