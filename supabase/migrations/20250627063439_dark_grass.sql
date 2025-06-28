/*
  # Fix user_info INSERT policy

  1. Security
    - Drop existing INSERT policy if it exists
    - Create new INSERT policy for authenticated users to insert their own data
*/

-- Drop the policy if it already exists
DROP POLICY IF EXISTS "Allow authenticated users to insert their own user_info" ON user_info;

-- Create the INSERT policy for user_info table
CREATE POLICY "Allow authenticated users to insert their own user_info"
  ON user_info
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uuid);