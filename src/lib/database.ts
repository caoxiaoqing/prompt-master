import { supabase } from './supabase'
import { isSupabaseAvailable } from './supabase'

// 数据库类型定义
export interface TaskInfoRecord {
  id?: number
  created_at?: string
  uuid: string
  task_folder_id?: number
  task_folder_name?: string
  task_id?: number
  task_name?: string
  task_version_id?: number
  task_version_name?: string
  task_version_changelog?: string
  task_version_changetag?: string[]
  task_version_system_prompt?: string
  task_version_chatinfo?: any[]
  task_version_model_extra_info?: any
}

// 文件夹操作类型
export interface FolderOperation {
  type: 'create' | 'update' | 'delete'
  folderId: string
  folderName: string
  userId: string
}

// 任务操作类型
export interface TaskOperation {
  type: 'create' | 'update' | 'delete'
  taskId: string
  taskName: string
  taskContent?: string
  folderId: string
  userId: string
  versionInfo?: {
    versionId?: string
    versionName?: string
    changelog?: string
    tags?: string[]
    systemPrompt?: string
    chatHistory?: any[]
    modelInfo?: any
  }
}

export class DatabaseService {
  
  /**
   * 用户首次注册后创建默认项目结构
   */
  static async createDefaultProjectStructure(userId: string): Promise<void> {
    try {
      console.log('🏗️ 为用户创建默认项目结构:', userId)
      
      // 创建默认文件夹记录
      const defaultFolderRecord: Omit<TaskInfoRecord, 'id' | 'created_at'> = {
        uuid: userId,
        task_folder_id: 1, // 默认文件夹ID
        task_folder_name: '默认文件夹',
        // 其他字段为空，表示这是一个文件夹记录
        task_id: null,
        task_name: null,
        task_version_id: null,
        task_version_name: null,
        task_version_changelog: null,
        task_version_changetag: null,
        task_version_system_prompt: null,
        task_version_chatinfo: null,
        task_version_model_extra_info: null
      }

      const { data, error } = await supabase
        .from('task_info')
        .insert([defaultFolderRecord])
        .select()

      if (error) {
        console.error('❌ 创建默认项目结构失败:', error)
        throw error
      }

      console.log('✅ 默认项目结构创建成功:', data)
    } catch (error) {
      console.error('💥 创建默认项目结构出错:', error)
      throw error
    }
  }

  /**
   * 获取用户的所有文件夹
   */
  static async getUserFolders(userId: string): Promise<TaskInfoRecord[]> {
    try {
      console.log('📁 获取用户文件夹:', userId)
      
      const { data, error } = await supabase
        .from('task_info')
        .select('*')
        .eq('uuid', userId)
        .not('task_folder_id', 'is', null)
        .is('task_id', null) // 只获取文件夹记录（task_id为空）
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ 获取用户文件夹失败:', error)
        throw error
      }

      console.log('✅ 用户文件夹获取成功:', data?.length || 0, '个文件夹')
      return data || []
    } catch (error) {
      console.error('💥 获取用户文件夹出错:', error)
      throw error
    }
  }

  /**
   * 获取用户的所有任务
   */
  static async getUserTasks(userId: string): Promise<TaskInfoRecord[]> {
    try {
      console.log('📋 获取用户任务:', userId)
      
      const { data, error } = await supabase
        .from('task_info')
        .select('*')
        .eq('uuid', userId)
        .not('task_id', 'is', null) // 只获取任务记录（task_id不为空）
        .order('created_at', { ascending: true })

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
   * 记录文件夹操作
   */
  static async recordFolderOperation(operation: FolderOperation): Promise<void> {
    try {
      console.log('📁 记录文件夹操作:', operation)

      switch (operation.type) {
        case 'create':
          await this.createFolderRecord(operation)
          break
        case 'update':
          await this.updateFolderRecord(operation)
          break
        case 'delete':
          await this.deleteFolderRecord(operation)
          break
      }

      console.log('✅ 文件夹操作记录成功')
    } catch (error) {
      console.error('💥 记录文件夹操作出错:', error)
      throw error
    }
  }

  /**
   * 记录任务操作
   */
  static async recordTaskOperation(operation: TaskOperation): Promise<void> {
    try {
      console.log('📋 记录任务操作:', operation)

      switch (operation.type) {
        case 'create':
          await this.createTaskRecord(operation)
          break
        case 'update':
          await this.updateTaskRecord(operation)
          break
        case 'delete':
          await this.deleteTaskRecord(operation)
          break
      }

      console.log('✅ 任务操作记录成功')
    } catch (error) {
      console.error('💥 记录任务操作出错:', error)
      throw error
    }
  }

  /**
   * 创建文件夹记录
   */
  private static async createFolderRecord(operation: FolderOperation): Promise<void> {
    const folderRecord: Omit<TaskInfoRecord, 'id' | 'created_at'> = {
      uuid: operation.userId,
      task_folder_id: parseInt(operation.folderId) || Date.now(), // 使用时间戳作为ID
      task_folder_name: operation.folderName,
      task_id: null,
      task_name: null,
      task_version_id: null,
      task_version_name: null,
      task_version_changelog: null,
      task_version_changetag: null,
      task_version_system_prompt: null,
      task_version_chatinfo: null,
      task_version_model_extra_info: null
    }

    const { error } = await supabase
      .from('task_info')
      .insert([folderRecord])

    if (error) throw error
  }

  /**
   * 更新文件夹记录
   */
  private static async updateFolderRecord(operation: FolderOperation): Promise<void> {
    const { error } = await supabase
      .from('task_info')
      .update({
        task_folder_name: operation.folderName
      })
      .eq('uuid', operation.userId)
      .eq('task_folder_id', parseInt(operation.folderId))
      .is('task_id', null)

    if (error) throw error
  }

  /**
   * 删除文件夹记录
   */
  private static async deleteFolderRecord(operation: FolderOperation): Promise<void> {
    // 删除文件夹及其所有相关任务
    const { error } = await supabase
      .from('task_info')
      .delete()
      .eq('uuid', operation.userId)
      .eq('task_folder_id', parseInt(operation.folderId))

    if (error) throw error
  }

  /**
   * 创建任务记录
   */
  private static async createTaskRecord(operation: TaskOperation): Promise<void> {
    const taskRecord: Omit<TaskInfoRecord, 'id' | 'created_at'> = {
      uuid: operation.userId,
      task_folder_id: parseInt(operation.folderId),
      task_folder_name: null, // 任务记录中不重复存储文件夹名
      task_id: parseInt(operation.taskId) || Date.now(),
      task_name: operation.taskName,
      task_version_id: operation.versionInfo?.versionId ? parseInt(operation.versionInfo.versionId) : null,
      task_version_name: operation.versionInfo?.versionName || null,
      task_version_changelog: operation.versionInfo?.changelog || null,
      task_version_changetag: operation.versionInfo?.tags || null,
      task_version_system_prompt: operation.taskContent || operation.versionInfo?.systemPrompt || null,
      task_version_chatinfo: operation.versionInfo?.chatHistory || null,
      task_version_model_extra_info: operation.versionInfo?.modelInfo || null
    }

    const { error } = await supabase
      .from('task_info')
      .insert([taskRecord])

    if (error) throw error
  }

  /**
   * 更新任务记录
   */
  private static async updateTaskRecord(operation: TaskOperation): Promise<void> {
    const updateData: Partial<TaskInfoRecord> = {
      task_name: operation.taskName
    }

    // 如果有内容更新，也更新系统提示
    if (operation.taskContent !== undefined) {
      updateData.task_version_system_prompt = operation.taskContent
    }

    // 如果有版本信息，更新版本相关字段
    if (operation.versionInfo) {
      if (operation.versionInfo.versionId) {
        updateData.task_version_id = parseInt(operation.versionInfo.versionId)
      }
      if (operation.versionInfo.versionName) {
        updateData.task_version_name = operation.versionInfo.versionName
      }
      if (operation.versionInfo.changelog) {
        updateData.task_version_changelog = operation.versionInfo.changelog
      }
      if (operation.versionInfo.tags) {
        updateData.task_version_changetag = operation.versionInfo.tags
      }
      if (operation.versionInfo.systemPrompt) {
        updateData.task_version_system_prompt = operation.versionInfo.systemPrompt
      }
      if (operation.versionInfo.chatHistory) {
        updateData.task_version_chatinfo = operation.versionInfo.chatHistory
      }
      if (operation.versionInfo.modelInfo) {
        updateData.task_version_model_extra_info = operation.versionInfo.modelInfo
      }
    }

    const { error } = await supabase
      .from('task_info')
      .update(updateData)
      .eq('uuid', operation.userId)
      .eq('task_id', parseInt(operation.taskId))

    if (error) throw error
  }

  /**
   * 删除任务记录
   */
  private static async deleteTaskRecord(operation: TaskOperation): Promise<void> {
    const { error } = await supabase
      .from('task_info')
      .delete()
      .eq('uuid', operation.userId)
      .eq('task_id', parseInt(operation.taskId))

    if (error) throw error
  }

  /**
   * 同步本地数据到数据库
   */
  static async syncLocalDataToDatabase(userId: string, folders: any[], tasks: any[]): Promise<void> {
    try {
      // Check if Supabase is available before attempting sync
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Skipping database sync - Supabase unavailable')
        return
      }
      
      console.log('🔄 开始同步本地数据到数据库:', { userId, foldersCount: folders.length, tasksCount: tasks.length })

      // 1. 清除用户现有数据（重新同步）
      await supabase
        .from('task_info')
        .delete()
        .eq('uuid', userId)

      // 2. 同步文件夹数据
      for (const folder of folders) {
        if (folder.id === 'default') continue // 跳过默认文件夹，因为已经在注册时创建

        await this.recordFolderOperation({
          type: 'create',
          folderId: folder.id,
          folderName: folder.name,
          userId
        })
      }

      // 3. 同步任务数据
      for (const task of tasks) {
        await this.recordTaskOperation({
          type: 'create',
          taskId: task.id,
          taskName: task.name,
          taskContent: task.content,
          folderId: task.folderId,
          userId,
          versionInfo: {
            systemPrompt: task.content,
            modelInfo: {
              model: task.model,
              temperature: task.temperature,
              maxTokens: task.maxTokens
            }
          }
        })

        // 同步任务的版本信息
        if (task.versions && task.versions.length > 0) {
          for (const version of task.versions) {
            await this.recordTaskOperation({
              type: 'update',
              taskId: task.id,
              taskName: task.name,
              folderId: task.folderId,
              userId,
              versionInfo: {
                versionId: version.id,
                versionName: version.name,
                changelog: version.notes,
                tags: version.tags,
                systemPrompt: version.content,
                chatHistory: version.chatHistory,
                modelInfo: {
                  model: version.model,
                  temperature: version.temperature,
                  maxTokens: version.maxTokens,
                  responseTime: version.responseTime,
                  tokenUsage: version.tokenUsage,
                  metrics: version.metrics
                }
              }
            })
          }
        }
      }

      console.log('✅ 本地数据同步到数据库完成')
    } catch (error) {
      console.error('❌ 数据同步失败:', error)
      // Don't throw the error to prevent app crashes
      // Just log it and continue with offline mode
      console.warn('⚠️ Continuing in offline mode')
    }
  }

  /**
   * 从数据库加载用户数据
   */
  static async loadUserDataFromDatabase(userId: string): Promise<{
    folders: any[]
    tasks: any[]
  }> {
    try {
      console.log('📥 从数据库加载用户数据:', userId)

      // 获取文件夹数据
      const folderRecords = await this.getUserFolders(userId)
      const folders = folderRecords.map(record => ({
        id: record.task_folder_id?.toString() || 'default',
        name: record.task_folder_name || '默认文件夹',
        createdAt: new Date(record.created_at || Date.now()),
        updatedAt: new Date(record.created_at || Date.now()),
        color: '#3B82F6'
      }))

      // 获取任务数据
      const taskRecords = await this.getUserTasks(userId)
      const tasksMap = new Map()

      // 处理任务记录，合并同一任务的不同版本
      for (const record of taskRecords) {
        const taskId = record.task_id?.toString()
        if (!taskId) continue

        if (!tasksMap.has(taskId)) {
          // 创建新任务
          tasksMap.set(taskId, {
            id: taskId,
            name: record.task_name || '未命名任务',
            content: record.task_version_system_prompt || '',
            folderId: record.task_folder_id?.toString() || 'default',
            model: record.task_version_model_extra_info?.model || 'gpt-4',
            temperature: record.task_version_model_extra_info?.temperature || 0.7,
            maxTokens: record.task_version_model_extra_info?.maxTokens || 1000,
            createdAt: new Date(record.created_at || Date.now()),
            updatedAt: new Date(record.created_at || Date.now()),
            tags: record.task_version_changetag || [],
            notes: record.task_version_changelog || '',
            versions: [],
            currentChatHistory: record.task_version_chatinfo || []
          })
        }

        // 如果有版本信息，添加到版本列表
        if (record.task_version_id) {
          const task = tasksMap.get(taskId)
          task.versions.push({
            id: record.task_version_id.toString(),
            name: record.task_version_name || '版本',
            content: record.task_version_system_prompt || '',
            timestamp: new Date(record.created_at || Date.now()),
            model: record.task_version_model_extra_info?.model || 'gpt-4',
            temperature: record.task_version_model_extra_info?.temperature || 0.7,
            maxTokens: record.task_version_model_extra_info?.maxTokens || 1000,
            tags: record.task_version_changetag || [],
            notes: record.task_version_changelog || '',
            chatHistory: record.task_version_chatinfo || [],
            responseTime: record.task_version_model_extra_info?.responseTime,
            tokenUsage: record.task_version_model_extra_info?.tokenUsage,
            metrics: record.task_version_model_extra_info?.metrics
          })
        }
      }

      const tasks = Array.from(tasksMap.values())

      console.log('✅ 用户数据加载完成:', { foldersCount: folders.length, tasksCount: tasks.length })
      return { folders, tasks }
    } catch (error) {
      console.error('💥 从数据库加载用户数据出错:', error)
      throw error
    }
  }
}