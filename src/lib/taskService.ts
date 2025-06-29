import { supabase } from './supabase'
import { isSupabaseAvailable } from './supabase'
import { ChatMessage } from '../types'

// 聊天信息的数据结构
export interface ChatInfo {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  token_usage?: {
    prompt: number
    completion: number
    total: number
  }
  response_time?: number
}

// 模型参数的数据结构
export interface ModelParams {
  model_id: string
  temperature: number
  top_k: number
  top_p: number
  max_tokens: number
  max_context_turns: number
}

// 任务信息的数据结构
export interface TaskInfo {
  id?: number
  created_at?: string
  uuid: string
  task_id: number | null
  task_folder_name: string | null
  task_name: string | null
  system_prompt: string | null
  chatinfo: ChatInfo[]
  model_params: ModelParams
}

export class TaskService {
  
  /**
   * 创建新任务记录
   */
  static async createTask(
    userId: string,
    taskId: number,
    taskName: string,
    folderName: string,
    defaultModelParams: ModelParams
  ): Promise<TaskInfo> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，跳过数据库操作')
        throw new Error('Database connection unavailable')
      }

      console.log('📝 创建新任务记录:', { 
        userId, 
        taskId, 
        taskName, 
        folderName,
        modelParams: defaultModelParams 
      })
      
      const taskData: Omit<TaskInfo, 'id' | 'created_at'> = {
        uuid: userId,
        task_id: taskId,
        task_folder_name: folderName,
        task_name: taskName,
        system_prompt: '',
        chatinfo: [],
        model_params: defaultModelParams
      }

      console.log('🔍 检查任务是否已存在...')
      
      // 检查任务是否已存在（使用 task_id 检查，因为它是唯一的）
      const { data: existingTasks, error: checkError } = await supabase
        .from('task_info')
        .select('id, task_id')
        .eq('task_id', taskId)
        .limit(1)

      if (checkError) {
        console.error('❌ 检查任务是否存在失败:', checkError)
        throw checkError
      }

      if (existingTasks && existingTasks.length > 0) {
        console.log('ℹ️ 任务已存在，跳过创建:', existingTasks[0])
        // 返回现有任务的完整信息
        const { data: fullTask, error: fetchError } = await supabase
          .from('task_info')
          .select('*')
          .eq('task_id', taskId)
          .single()
        
        if (fetchError) {
          console.error('❌ 获取现有任务详情失败:', fetchError)
          throw fetchError
        }
        
        return fullTask
      }

      console.log('📋 准备插入的数据:', taskData)
      const { data, error } = await supabase
        .from('task_info')
        .insert([taskData])
        .select()
        .single()

      if (error) {
        console.error('❌ 创建任务记录失败:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          taskData
        })
        throw error
      }

      console.log('✅ 任务记录创建成功:', data.id)
      return data
    } catch (error) {
      console.error('💥 创建任务记录出错:', error)
      throw error
    }
  }

  /**
   * 更新任务的 system prompt
   */
  static async updateSystemPrompt(
    userId: string,
    taskId: number,
    systemPrompt: string
  ): Promise<void> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，跳过 system prompt 同步')
        return
      }

      console.log('📝 更新 system prompt:', { taskId, promptLength: systemPrompt.length })
      
      const { error } = await supabase
        .from('task_info')
        .update({ system_prompt: systemPrompt })
        .eq('uuid', userId)
        .eq('task_id', taskId)

      if (error) {
        console.error('❌ 更新 system prompt 失败:', error)
        throw error
      }

      console.log('✅ System prompt 更新成功')
    } catch (error) {
      console.error('💥 更新 system prompt 出错:', error)
      // 不抛出错误，避免影响用户体验
    }
  }

  /**
   * 更新任务的聊天历史
   */
  static async updateChatHistory(
    userId: string,
    taskId: number,
    chatMessages: ChatMessage[]
  ): Promise<void> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，跳过聊天历史同步')
        return
      }

      console.log('💬 更新聊天历史:', { taskId, messagesCount: chatMessages.length })
      
      // 转换聊天消息格式
      const chatInfo: ChatInfo[] = chatMessages
        .filter(msg => !msg.isLoading) // 过滤掉加载中的消息
        .map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          token_usage: msg.tokenUsage ? {
            prompt: msg.tokenUsage.prompt,
            completion: msg.tokenUsage.completion,
            total: msg.tokenUsage.total
          } : undefined,
          response_time: msg.responseTime
        }))

      const { error } = await supabase
        .from('task_info')
        .update({ chatinfo: chatInfo })
        .eq('uuid', userId)
        .eq('task_id', taskId)

      if (error) {
        console.error('❌ 更新聊天历史失败:', error)
        throw error
      }

      console.log('✅ 聊天历史更新成功')
    } catch (error) {
      console.error('💥 更新聊天历史出错:', error)
      // 不抛出错误，避免影响用户体验
    }
  }

  /**
   * 更新任务的模型参数
   */
  static async updateModelParams(
    userId: string,
    taskId: number,
    modelParams: ModelParams
  ): Promise<void> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，跳过模型参数同步')
        return
      }

      console.log('⚙️ 更新模型参数:', { taskId, modelParams })
      
      const { error } = await supabase
        .from('task_info')
        .update({ model_params: modelParams })
        .eq('uuid', userId)
        .eq('task_id', taskId)

      if (error) {
        console.error('❌ 更新模型参数失败:', error)
        throw error
      }

      console.log('✅ 模型参数更新成功')
    } catch (error) {
      console.error('💥 更新模型参数出错:', error)
      throw error
    }
  }

  /**
   * 获取用户的所有任务
   */
  static async getUserTasks(userId: string): Promise<TaskInfo[]> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，返回空任务列表')
        return []
      }

      console.log('📋 获取用户任务:', userId)
      
      const { data, error } = await supabase
        .from('task_info')
        .select('*')
        .eq('uuid', userId)
        .not('task_id', 'is', null) // 只获取任务记录
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ 获取用户任务失败:', error)
        throw error
      }

      console.log('✅ 用户任务获取成功:', data?.length || 0, '个任务')
      return data || []
    } catch (error) {
      console.error('💥 获取用户任务出错:', error)
      throw error
    }
  }

  /**
   * 获取特定任务的详细信息
   */
  static async getTaskById(userId: string, taskId: number): Promise<TaskInfo | null> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，无法获取任务详情')
        return null
      }

      console.log('🔍 获取任务详情:', { userId, taskId })
      
      const { data, error } = await supabase
        .from('task_info')
        .select('*')
        .eq('uuid', userId)
        .eq('task_id', taskId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 记录不存在
          console.log('ℹ️ 任务不存在:', taskId)
          return null
        }
        console.error('❌ 获取任务详情失败:', error)
        throw error
      }

      console.log('✅ 任务详情获取成功:', data.task_name)
      return data
    } catch (error) {
      console.error('💥 获取任务详情出错:', error)
      throw error
    }
  }

  /**
   * 删除任务
   */
  static async deleteTask(userId: string, taskId: number): Promise<void> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，跳过任务删除')
        return
      }

      console.log('🗑️ 删除任务:', { userId, taskId })
      
      const { error } = await supabase
        .from('task_info')
        .delete()
        .eq('uuid', userId)
        .eq('task_id', taskId)

      if (error) {
        console.error('❌ 删除任务失败:', error)
        throw error
      }

      console.log('✅ 任务删除成功')
    } catch (error) {
      console.error('💥 删除任务出错:', error)
      throw error
    }
  }

  /**
   * 更新任务名称
   */
  static async updateTaskName(
    userId: string,
    taskId: number,
    taskName: string
  ): Promise<void> {
    try {
      // 检查 Supabase 连接状态
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase 不可用，跳过任务名称更新')
        return
      }

      console.log('📝 更新任务名称:', { taskId, taskName })
      
      const { error } = await supabase
        .from('task_info')
        .update({ task_name: taskName })
        .eq('uuid', userId)
        .eq('task_id', taskId)

      if (error) {
        console.error('❌ 更新任务名称失败:', error)
        throw error
      }

      console.log('✅ 任务名称更新成功')
    } catch (error) {
      console.error('💥 更新任务名称出错:', error)
      throw error
    }
  }

  /**
   * 获取默认模型参数
   */
  static getDefaultModelParams(customModel: any): ModelParams {
    return {
      model_id: customModel?.id || '',
      temperature: customModel?.temperature || 0.7,
      top_k: customModel?.topK || 50,
      top_p: customModel?.topP || 1.0,
      max_tokens: customModel?.maxTokens || 1000,
      max_context_turns: 10 // 默认保留10轮对话上下文
    }
  }

  /**
   * 将 ChatInfo 转换为 ChatMessage
   */
  static convertChatInfoToMessages(chatInfo: ChatInfo[]): ChatMessage[] {
    return chatInfo.map(info => ({
      id: info.id,
      role: info.role,
      content: info.content,
      timestamp: new Date(info.timestamp),
      tokenUsage: info.token_usage ? {
        prompt: info.token_usage.prompt,
        completion: info.token_usage.completion,
        total: info.token_usage.total
      } : undefined,
      responseTime: info.response_time
    }))
  }
}