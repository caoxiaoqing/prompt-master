import { useEffect, useCallback, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { syncService, SyncStatus, SyncEvent, SyncOperation } from '../lib/syncService'
import { PromptTask, Folder } from '../types'

export interface SyncManagerState {
  status: SyncStatus
  isOnline: boolean
  queueLength: number
  lastSyncTime: number
  error: string | null
  conflictCount: number
}

export const useSyncManager = () => {
  const { user } = useAuth()
  const [syncState, setSyncState] = useState<SyncManagerState>({
    status: SyncStatus.IDLE,
    isOnline: navigator.onLine,
    queueLength: 0,
    lastSyncTime: 0,
    error: null,
    conflictCount: 0
  })

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setSyncState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setSyncState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 监听同步事件
  useEffect(() => {
    const handleSyncStart = (event: SyncEvent) => {
      setSyncState(prev => ({
        ...prev,
        status: SyncStatus.SYNCING,
        error: null
      }))
    }

    const handleSyncComplete = (event: SyncEvent) => {
      setSyncState(prev => ({
        ...prev,
        status: SyncStatus.SUCCESS,
        lastSyncTime: Date.now(),
        queueLength: event.data?.remainingItems || 0
      }))
    }

    const handleSyncError = (event: SyncEvent) => {
      setSyncState(prev => ({
        ...prev,
        status: SyncStatus.ERROR,
        error: event.data?.error?.message || '同步失败'
      }))
    }

    const handleConflictDetected = (event: SyncEvent) => {
      setSyncState(prev => ({
        ...prev,
        status: SyncStatus.CONFLICT,
        conflictCount: prev.conflictCount + 1
      }))
    }

    const handleRemoteDataReceived = (event: SyncEvent) => {
      // 处理从远程接收到的数据
      if (event.data?.tasks) {
        // 这里可以更新本地状态或触发冲突检测
        console.log('📥 接收到远程任务数据:', event.data.tasks.length)
      }
    }

    syncService.addEventListener('sync_start', handleSyncStart)
    syncService.addEventListener('sync_complete', handleSyncComplete)
    syncService.addEventListener('sync_error', handleSyncError)
    syncService.addEventListener('conflict_detected', handleConflictDetected)
    syncService.addEventListener('remote_data_received', handleRemoteDataReceived)

    return () => {
      syncService.removeEventListener('sync_start', handleSyncStart)
      syncService.removeEventListener('sync_complete', handleSyncComplete)
      syncService.removeEventListener('sync_error', handleSyncError)
      syncService.removeEventListener('conflict_detected', handleConflictDetected)
      syncService.removeEventListener('remote_data_received', handleRemoteDataReceived)
    }
  }, [])

  // 同步任务创建
  const syncTaskCreate = useCallback((task: PromptTask) => {
    if (!user) return

    syncService.addToSyncQueue({
      operation: SyncOperation.CREATE,
      type: 'task',
      data: {
        userId: user.id,
        taskId: parseInt(task.id),
        taskName: task.name,
        folderName: state.folders.find(f => f.id === task.folderId)?.name || '默认文件夹',
        modelParams: {
          model_id: '',
          temperature: task.temperature,
          top_k: 50,
          top_p: 1.0,
          max_tokens: task.maxTokens,
          max_context_turns: 10
        }
      },
      priority: 1,
      maxRetries: 3
    })
  }, [user, state.folders])

  // 同步任务更新
  const syncTaskUpdate = useCallback((task: PromptTask) => {
    if (!user) return

    syncService.addToSyncQueue({
      operation: SyncOperation.UPDATE,
      type: 'task',
      data: {
        userId: user.id,
        taskId: parseInt(task.id),
        taskName: task.name
      },
      priority: 2,
      maxRetries: 3
    })
  }, [user])

  // 同步任务删除
  const syncTaskDelete = useCallback((taskId: string) => {
    if (!user) return

    syncService.addToSyncQueue({
      operation: SyncOperation.DELETE,
      type: 'task',
      data: {
        userId: user.id,
        taskId: parseInt(taskId)
      },
      priority: 1,
      maxRetries: 3
    })
  }, [user])

  // 同步系统提示词
  const syncSystemPrompt = useCallback((taskId: string, systemPrompt: string) => {
    if (!user) return

    syncService.addToSyncQueue({
      operation: SyncOperation.UPDATE,
      type: 'system_prompt',
      data: {
        userId: user.id,
        taskId: parseInt(taskId),
        systemPrompt
      },
      priority: 3,
      maxRetries: 2
    })
  }, [user])

  // 同步聊天历史
  const syncChatHistory = useCallback((taskId: string, chatHistory: any[]) => {
    if (!user) return

    syncService.addToSyncQueue({
      operation: SyncOperation.UPDATE,
      type: 'chat_history',
      data: {
        userId: user.id,
        taskId: parseInt(taskId),
        chatHistory
      },
      priority: 4,
      maxRetries: 2
    })
  }, [user])

  // 同步模型参数
  const syncModelParams = useCallback((taskId: string, modelParams: any) => {
    if (!user) return

    syncService.addToSyncQueue({
      operation: SyncOperation.UPDATE,
      type: 'model_params',
      data: {
        userId: user.id,
        taskId: parseInt(taskId),
        modelParams
      },
      priority: 3,
      maxRetries: 2
    })
  }, [user])

  // 强制全量同步
  const forceFullSync = useCallback(async () => {
    if (!user) return

    try {
      await syncService.forceFullSync(user.id)
    } catch (error) {
      console.error('强制同步失败:', error)
    }
  }, [user])

  // 从远程拉取数据
  const pullFromRemote = useCallback(async () => {
    if (!user) return

    try {
      await syncService.pullFromRemote(user.id)
    } catch (error) {
      console.error('拉取远程数据失败:', error)
    }
  }, [user])

  // 推送本地数据
  const pushToRemote = useCallback(async () => {
    if (!user) return
    
    // 移除对 state 的依赖，改为接收参数
    console.log('推送本地数据功能已禁用，请使用其他同步方法')
  }, [user])

  // 获取同步统计
  const getSyncStats = useCallback(() => {
    return syncService.getSyncStats()
  }, [])

  // 获取队列状态
  const getQueueStatus = useCallback(() => {
    return syncService.getQueueStatus()
  }, [])

  return {
    syncState,
    syncTaskCreate,
    syncTaskUpdate,
    syncTaskDelete,
    syncSystemPrompt,
    syncChatHistory,
    syncModelParams,
    forceFullSync,
    pullFromRemote,
    pushToRemote,
    getSyncStats,
    getQueueStatus
  }
}