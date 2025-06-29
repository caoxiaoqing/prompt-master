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

// 超时包装函数
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise])
}

// 任务信息的数据结构
export interface TaskInfo {
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
   * 测试数据库连接
   */
  static async testConnection(userId: string, timeoutMs: number = 5000): Promise<boolean> {
    
    try {
      console.log('🧪 测试数据库连接...', { userId })

      //return true
      
      // 创建一个简单的连接测试
      const testQuery = async () => {
        // 使用最简单的查询：检查数据库是否响应
        const { data, error } = await supabase
          .from('user_info')
          .select('uuid')
          .eq('uuid', userId)
          .limit(1)
        
        if (error && error.code !== 'PGRST116') { // PGRST116 是"记录不存在"错误，这是正常的
          throw error
        }
        
        return true
      }
      
      // 添加超时机制
      const createTimeoutPromise = (timeoutMs: number, operation: string) => {
        return new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`${operation} timeout after ${timeoutMs}ms`))
          }, timeoutMs)
        })
      }
      
      // 为数据库操作添加超时包装
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
        return Promise.race([
          promise,
          createTimeoutPromise(timeoutMs, operation)
        ])
      }
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), timeoutMs)
      })
      
      await Promise.race([testQuery(), timeoutPromise])
      
      console.log('✅ 数据库连接测试成功')
      return true
    } catch (error) {
      console.error('💥 数据库连接测试出错:', error)
      
      // 如果是超时错误，记录特殊信息
      if (error instanceof Error && error.message.includes('timeout')) {
        console.error('⏰ 数据库连接测试超时，可能网络有问题')
      }
      
      return false
    }
  }
  
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
      
      // 先测试数据库连接
      console.log('🧪 执行快速数据库连接测试...')
      try {
        const connectionTest = await TaskService.testConnection(userId, 8000) // 8秒超时
        if (connectionTest) {
          console.log('✅ 数据库连接测试通过')
        } else {
          console.log('⚠️ 数据库连接测试失败，但继续尝试操作')
        }
      } catch (testError) {
        console.error('❌ 数据库连接测试出错:', testError)
        
        // 如果是超时错误，给用户友好的提示
        if (testError instanceof Error && testError.message.includes('timeout')) {
          console.log('⏰ 连接测试超时，可能网络较慢，继续尝试创建任务')
        }
        // 不阻断创建流程，继续执行
      }

      console.log('📝 创建新任务记录:', { userId, taskId, taskName, folderName })
      
      const taskData: Omit<TaskInfo, 'created_at'> = {
        uuid: userId,
        task_id: taskId,
        task_folder_name: folderName,
        task_name: taskName,
        system_prompt: '',
        chatinfo: [],
        model_params: defaultModelParams
      }

      console.log('📋 准备插入的数据:', taskData)
      
      // 添加更详细的调试信息
      console.log('🔗 Supabase 连接状态检查...')
      console.log('📊 数据验证:', {
        hasUserId: !!userId,
        hasTaskId: !!taskId,
        hasTaskName: !!taskName,
        hasFolderName: !!folderName,
        hasModelParams: !!defaultModelParams
      })
      
      console.log('💾 开始执行数据库插入操作...')
      
      // 关键修复：为数据库插入操作添加超时机制
      const insertOperation = supabase
        .from('task_info')
        .insert([taskData])
        .select()
        .single()
      
      console.log('⏰ 执行带超时的数据库插入操作（15秒超时）...')
      const { data, error } = await withTimeout(
        insertOperation,
        15000, // 15秒超时
        'Task creation'
      )
      
      console.log('📤 数据库操作完成，检查结果...')

      if (error) {
        // 如果是重复键错误，尝试获取现有记录
        if (error.code === '23505') {
          console.log('⚠️ 检测到重复 task_id，尝试获取现有记录...', { taskId })
          try {
            const existingTask = await TaskService.getTaskById(userId, taskId)
            if (existingTask) {
              console.log('✅ 找到现有任务记录，返回现有记录:', existingTask.task_name)
              return existingTask
            }
          } catch (getError) {
            console.error('获取现有任务失败:', getError)
          }
          
          // 如果获取失败，创建一个模拟的任务记录返回
          console.log('⚠️ 无法获取现有任务，创建模拟记录')
          return {
            uuid: userId,
            task_id: taskId,
            task_folder_name: folderName,
            task_name: taskName,
            system_prompt: '',
            chatinfo: [],
            model_params: defaultModelParams,
            created_at: new Date().toISOString()
          }
        }
        
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
      
      console.log('📥 数据库返回结果:', data)

      console.log('✅ 任务记录创建成功:', { taskId: data.task_id, taskName: data.task_name })
      return data
    } catch (error) {
      console.error('💥 创建任务记录出错:', error)
      
      // 添加更详细的错误信息
      if (error instanceof Error) {
        console.error('错误详情:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      
      throw error
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
      
      // 为更新操作添加超时
      const updateOperation = supabase
        .from('task_info')
        .update({ system_prompt: systemPrompt })
        .eq('uuid', userId)
        .eq('task_id', taskId)
      
      const { error } = await withTimeout(
        updateOperation,
        10000, // 10秒超时
        'System prompt update'
      )

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

      // 为更新操作添加超时
      const updateOperation = supabase
        .from('task_info')
        .update({ chatinfo: chatInfo })
        .eq('uuid', userId)
        .eq('task_id', taskId)
      
      const { error } = await withTimeout(
        updateOperation,
        10000, // 10秒超时
        'Chat history update'
      )

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
      
      // 为更新操作添加超时
      const updateOperation = supabase
        .from('task_info')
        .update({ model_params: modelParams })
        .eq('uuid', userId)
        .eq('task_id', taskId)
      
      const { error } = await withTimeout(
        updateOperation,
        10000, // 10秒超时
        'Model params update'
      )

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
      
      // 为查询操作添加超时
      const queryOperation = supabase
        .from('task_info')
        .select('*')
        .eq('uuid', userId)
        .not('task_id', 'is', null) // 只获取任务记录
        .order('created_at', { ascending: false })
      
      const { data, error } = await withTimeout(
        queryOperation,
        8000, // 8秒超时
        'Get user tasks'
      )

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
      
      // 为查询操作添加超时
      const queryOperation = supabase
        .from('task_info')
        .select('*')
        .eq('uuid', userId)
        .eq('task_id', taskId)
        .single()
      
      const { data, error } = await withTimeout(
        queryOperation,
        8000, // 8秒超时
        'Get task by ID'
      )

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
      
      // 为删除操作添加超时
      const deleteOperation = supabase
        .from('task_info')
        .delete()
        .eq('uuid', userId)
        .eq('task_id', taskId)
      
      const { error } = await withTimeout(
        deleteOperation,
        10000, // 10秒超时
        'Delete task'
      )

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
      
      // 为更新操作添加超时
      const updateOperation = supabase
        .from('task_info')
        .update({ task_name: taskName })
        .eq('uuid', userId)
        .eq('task_id', taskId)
      
      const { error } = await withTimeout(
        updateOperation,
        10000, // 10秒超时
        'Update task name'
      )

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