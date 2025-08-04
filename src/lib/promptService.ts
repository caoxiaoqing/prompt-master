import { supabase } from './supabase';

export const getPromptTemplates = async (limit: number = 3) => {
  try {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_public', true) // 只获取公共模板
      .order('likes', { ascending: false }) // 按点赞数排序
      .limit(limit);

    if (error) {
      console.error('Error fetching prompt templates:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Failed to fetch prompt templates:', error);
    throw error;
  }
};
