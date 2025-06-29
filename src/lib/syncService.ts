import { supabase, isSupabaseAvailable } from './supabase'
import { TaskService, ModelParams, ChatInfo } from './taskService'
import { ChatMessage, PromptTask, Folder } from '../types'

// 同步状态枚举
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  CONFLICT = 'conflict'
}

// 同步操作类型
export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// 同步队列项
export interface SyncQueueItem {
  id: string
  operation: SyncOperation
  type: 'folder' | 'task' | 'system_prompt' | 'chat_history' | 'model_params'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
  priority: number // 1-5, 1为最高优先级
}

// 冲突解决策略
export enum ConflictResolution {
  LOCAL_WINS = 'local_wins',
  REMOTE_WINS = 'remote_wins',
  MERGE = 'merge',
  ASK_USER = 'ask_user'
}

// 同步配置
export interface SyncConfig {
  autoSyncInterval: number // 自动同步间隔（毫秒）
  batchSize: number // 批量同步大小
  maxRetries: number // 最大重试次数
  conflictResolution: ConflictResolution
  enableRealTimeSync: boolean // 是否启用实时同步
  enableOfflineMode: boolean // 是否启用离线模式
}

// 同步事件
export interface SyncEvent {
  type: 'sync_start' | 'sync_progress' | 'sync_complete' | 'sync_error' | 'conflict_detected'
  data?: any
  timestamp: number
}

// 同步统计
export interface SyncStats {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  conflictOperations: number
  lastSyncTime: number
  averageSyncTime: number
}

export class SyncService {
  private static instance: SyncService
  private syncQueue: SyncQueueItem[] = []
  private isOnline: boolean = navigator.onLine
  private syncStatus: SyncStatus = SyncStatus.IDLE
  private config: SyncConfig
  private eventListeners: Map<string, Function[]> = new Map()
  private syncStats: SyncStats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    conflictOperations: 0,
    lastSyncTime: 0,
    averageSyncTime: 0
  }
  private autoSyncTimer: NodeJS.Timeout | null = null
  private localCache: Map<string, any> = new Map()

  private constructor(config: SyncConfig) {
    this.config = config
    this.initializeNetworkListeners()
    this.initializeAutoSync()
    this.loadOfflineQueue()
  }

  static getInstance(config?: SyncConfig): SyncService {
    if (!SyncService.instance) {
      const defaultConfig: SyncConfig = {
        autoSyncInterval: 30000, // 30秒
        batchSize: 10,
        maxRetries: 3,
        conflictResolution: ConflictResolution.LOCAL_WINS,
        enableRealTimeSync: true,
        enableOfflineMode: true
      }
      SyncService.instance = new SyncService(config || defaultConfig)
    }
    return SyncService.instance
  }

  // 初始化网络监听器
  private initializeNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 网络连接恢复，开始同步离线数据')
      this.isOnline = true
      this.processOfflineQueue()
    })

    window.addEventListener('offline', () => {
      console.log('📴 网络连接断开，启用离线模式')
      this.isOnline = false
    })
  }

  // 初始化自动同步
  private initializeAutoSync(): void {
    if (this.config.enableRealTimeSync) {
      this.autoSyncTimer = setInterval(() => {
        this.processSyncQueue()
      }, this.config.autoSyncInterval)
    }
  }

  // 添加同步任务到队列
  public addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: item.maxRetries || this.config.maxRetries
    }

    // 检查是否有相同的操作，如果有则合并或替换
    const existingIndex = this.syncQueue.findIndex(
      existing => existing.type === syncItem.type && 
                 existing.data.id === syncItem.data.id &&
                 existing.operation === syncItem.operation
    )

    if (existingIndex !== -1) {
      // 替换现有操作
      this.syncQueue[existingIndex] = syncItem
      console.log('🔄 替换现有同步操作:', syncItem.type, syncItem.operation)
    } else {
      // 添加新操作
      this.syncQueue.push(syncItem)
      console.log('➕ 添加同步操作到队列:', syncItem.type, syncItem.operation)
    }

    // 按优先级排序
    this.syncQueue.sort((a, b) => a.priority - b.priority)

    // 保存到本地存储（离线支持）
    this.saveOfflineQueue()

    // 如果在线且启用实时同步，立即处理
    if (this.isOnline && this.config.enableRealTimeSync) {
      this.processSyncQueue()
    }
  }

  // 处理同步队列
  private async processSyncQueue(): Promise<void> {
    if (this.syncStatus === SyncStatus.SYNCING || this.syncQueue.length === 0) {
      return
    }

    if (!this.isOnline || !isSupabaseAvailable()) {
      console.log('📴 离线状态或数据库不可用，跳过同步')
      return
    }

    this.syncStatus = SyncStatus.SYNCING
    this.emitEvent('sync_start', { queueLength: this.syncQueue.length })

    const batch = this.syncQueue.splice(0, this.config.batchSize)
    const startTime = Date.now()

    try {
      for (const item of batch) {
        await this.processSyncItem(item)
      }

      this.syncStatus = SyncStatus.SUCCESS
      this.syncStats.lastSyncTime = Date.now()
      this.syncStats.averageSyncTime = (this.syncStats.averageSyncTime + (Date.now() - startTime)) / 2

      this.emitEvent('sync_complete', { 
        processedItems: batch.length,
        remainingItems: this.syncQueue.length 
      })

      // 如果还有待处理项目，继续处理
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.processSyncQueue(), 1000)
      }

    } catch (error) {
      console.error('❌ 同步批次处理失败:', error)
      this.syncStatus = SyncStatus.ERROR
      
      // 将失败的项目重新加入队列（如果未达到最大重试次数）
      batch.forEach(item => {
        if (item.retryCount < item.maxRetries) {
          item.retryCount++
          this.syncQueue.unshift(item) // 添加到队列前面，优先重试
        } else {
          this.syncStats.failedOperations++
          console.error('❌ 同步项目达到最大重试次数，放弃:', item)
        }
      })

      this.emitEvent('sync_error', { error, failedItems: batch })
    }

    this.saveOfflineQueue()
  }

  // 处理单个同步项目
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    try {
      console.log('🔄 处理同步项目:', item.type, item.operation, item.data.id)

      switch (item.type) {
        case 'task':
          await this.syncTask(item)
          break
        case 'folder':
          await this.syncFolder(item)
          break
        case 'system_prompt':
          await this.syncSystemPrompt(item)
          break
        case 'chat_history':
          await this.syncChatHistory(item)
          break
        case 'model_params':
          await this.syncModelParams(item)
          break
        default:
          throw new Error(`未知的同步类型: ${item.type}`)
      }

      this.syncStats.successfulOperations++
      this.syncStats.totalOperations++

    } catch (error) {
      console.error('❌ 同步项目失败:', item, error)
      throw error
    }
  }

  // 同步任务
  private async syncTask(item: SyncQueueItem): Promise<void> {
    const { operation, data } = item

    switch (operation) {
      case SyncOperation.CREATE:
        await TaskService.createTask(
          data.userId,
          data.taskId,
          data.taskName,
          data.folderName,
          data.modelParams
        )
        break

      case SyncOperation.UPDATE:
        if (data.taskName) {
          await TaskService.updateTaskName(data.userId, data.taskId, data.taskName)
        }
        break

      case SyncOperation.DELETE:
        await TaskService.deleteTask(data.userId, data.taskId)
        break
    }
  }

  // 同步文件夹（如果需要单独的文件夹表）
  private async syncFolder(item: SyncQueueItem): Promise<void> {
    // 文件夹同步逻辑
    console.log('📁 同步文件夹:', item.operation, item.data)
    // 这里可以实现文件夹的数据库操作
  }

  // 同步系统提示词
  private async syncSystemPrompt(item: SyncQueueItem): Promise<void> {
    await TaskService.updateSystemPrompt(
      item.data.userId,
      item.data.taskId,
      item.data.systemPrompt
    )
  }

  // 同步聊天历史
  private async syncChatHistory(item: SyncQueueItem): Promise<void> {
    await TaskService.updateChatHistory(
      item.data.userId,
      item.data.taskId,
      item.data.chatHistory
    )
  }

  // 同步模型参数
  private async syncModelParams(item: SyncQueueItem): Promise<void> {
    await TaskService.updateModelParams(
      item.data.userId,
      item.data.taskId,
      item.data.modelParams
    )
  }

  // 检测并解决冲突
  private async detectAndResolveConflicts(
    localData: any,
    remoteData: any,
    type: string
  ): Promise<any> {
    // 简单的时间戳比较冲突检测
    const localTimestamp = new Date(localData.updatedAt || localData.timestamp).getTime()
    const remoteTimestamp = new Date(remoteData.updated_at || remoteData.created_at).getTime()

    if (Math.abs(localTimestamp - remoteTimestamp) < 1000) {
      // 时间差小于1秒，认为是同时修改，产生冲突
      this.syncStats.conflictOperations++
      this.emitEvent('conflict_detected', { localData, remoteData, type })

      switch (this.config.conflictResolution) {
        case ConflictResolution.LOCAL_WINS:
          return localData
        case ConflictResolution.REMOTE_WINS:
          return remoteData
        case ConflictResolution.MERGE:
          return this.mergeData(localData, remoteData, type)
        case ConflictResolution.ASK_USER:
          return await this.askUserForResolution(localData, remoteData, type)
      }
    }

    // 没有冲突，返回较新的数据
    return localTimestamp > remoteTimestamp ? localData : remoteData
  }

  // 合并数据
  private mergeData(localData: any, remoteData: any, type: string): any {
    switch (type) {
      case 'task':
        return {
          ...remoteData,
          ...localData,
          // 聊天历史合并
          chatHistory: this.mergeChatHistory(
            localData.chatHistory || [],
            remoteData.chatinfo || []
          ),
          updatedAt: new Date()
        }
      default:
        return { ...remoteData, ...localData }
    }
  }

  // 合并聊天历史
  private mergeChatHistory(localHistory: ChatMessage[], remoteHistory: ChatInfo[]): ChatMessage[] {
    const merged = new Map<string, ChatMessage>()

    // 添加本地历史
    localHistory.forEach(msg => merged.set(msg.id, msg))

    // 添加远程历史（转换格式）
    remoteHistory.forEach(info => {
      if (!merged.has(info.id)) {
        merged.set(info.id, {
          id: info.id,
          role: info.role,
          content: info.content,
          timestamp: new Date(info.timestamp),
          tokenUsage: info.token_usage,
          responseTime: info.response_time
        })
      }
    })

    // 按时间戳排序
    return Array.from(merged.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )
  }

  // 询问用户解决冲突
  private async askUserForResolution(
    localData: any,
    remoteData: any,
    type: string
  ): Promise<any> {
    // 这里可以显示一个模态框让用户选择
    // 暂时返回本地数据
    return localData
  }

  // 从远程拉取数据
  public async pullFromRemote(userId: string): Promise<void> {
    if (!this.isOnline || !isSupabaseAvailable()) {
      console.log('📴 离线状态，无法从远程拉取数据')
      return
    }

    try {
      console.log('📥 从远程拉取数据...')
      
      // 拉取任务数据
      const remoteTasks = await TaskService.getUserTasks(userId)
      
      // 触发数据更新事件
      this.emitEvent('remote_data_received', { tasks: remoteTasks })

    } catch (error) {
      console.error('❌ 从远程拉取数据失败:', error)
      throw error
    }
  }

  // 推送本地数据到远程
  public async pushToRemote(userId: string, localData: any): Promise<void> {
    if (!this.isOnline || !isSupabaseAvailable()) {
      console.log('📴 离线状态，数据将在网络恢复后同步')
      return
    }

    // 将本地数据添加到同步队列
    if (localData.tasks) {
      localData.tasks.forEach((task: PromptTask) => {
        this.addToSyncQueue({
          operation: SyncOperation.CREATE,
          type: 'task',
          data: {
            userId,
            taskId: parseInt(task.id),
            taskName: task.name,
            folderName: task.folderId,
            modelParams: TaskService.getDefaultModelParams(null)
          },
          priority: 2,
          maxRetries: 3
        })
      })
    }
  }

  // 强制全量同步
  public async forceFullSync(userId: string): Promise<void> {
    console.log('🔄 开始强制全量同步...')
    
    try {
      // 清空当前队列
      this.syncQueue = []
      
      // 从远程拉取最新数据
      await this.pullFromRemote(userId)
      
      // 处理所有待同步项目
      await this.processSyncQueue()
      
      console.log('✅ 强制全量同步完成')
    } catch (error) {
      console.error('❌ 强制全量同步失败:', error)
      throw error
    }
  }

  // 事件系统
  public addEventListener(eventType: string, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }
    this.eventListeners.get(eventType)!.push(callback)
  }

  public removeEventListener(eventType: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emitEvent(eventType: string, data?: any): void {
    const event: SyncEvent = {
      type: eventType as any,
      data,
      timestamp: Date.now()
    }

    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.forEach(callback => callback(event))
    }
  }

  // 离线队列管理
  private saveOfflineQueue(): void {
    if (this.config.enableOfflineMode) {
      localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue))
    }
  }

  private loadOfflineQueue(): void {
    if (this.config.enableOfflineMode) {
      const saved = localStorage.getItem('sync_queue')
      if (saved) {
        try {
          this.syncQueue = JSON.parse(saved)
          console.log('📱 加载离线同步队列:', this.syncQueue.length, '项')
        } catch (error) {
          console.error('❌ 加载离线队列失败:', error)
          this.syncQueue = []
        }
      }
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.syncQueue.length > 0) {
      console.log('🔄 处理离线队列:', this.syncQueue.length, '项')
      await this.processSyncQueue()
    }
  }

  // 获取同步状态
  public getSyncStatus(): SyncStatus {
    return this.syncStatus
  }

  // 获取同步统计
  public getSyncStats(): SyncStats {
    return { ...this.syncStats }
  }

  // 获取队列状态
  public getQueueStatus(): { length: number; items: SyncQueueItem[] } {
    return {
      length: this.syncQueue.length,
      items: [...this.syncQueue]
    }
  }

  // 清理资源
  public destroy(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
    }
    this.eventListeners.clear()
    this.syncQueue = []
    this.saveOfflineQueue()
  }
}

// 导出单例实例
export const syncService = SyncService.getInstance()