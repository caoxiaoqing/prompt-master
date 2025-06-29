import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { TaskService, ModelParams } from '../lib/taskService'
import { ChatMessage } from '../types'

interface UseTaskPersistenceProps {
  taskId: number | null
  systemPrompt: string
  chatHistory: ChatMessage[]
  modelParams: ModelParams
  onModelParamsUpdate?: (params: ModelParams) => void
}

export const useTaskPersistence = ({
  taskId,
  systemPrompt,
  chatHistory,
  modelParams,
  onModelParamsUpdate
}: UseTaskPersistenceProps) => {
  const { user } = useAuth()
  const systemPromptRef = useRef(systemPrompt)
  const chatHistoryRef = useRef(chatHistory)
  const modelParamsRef = useRef(modelParams)
  const lastSyncTimeRef = useRef({
    systemPrompt: 0,
    chatHistory: 0
  })

  // 更新引用
  useEffect(() => {
    systemPromptRef.current = systemPrompt
  }, [systemPrompt])

  useEffect(() => {
    chatHistoryRef.current = chatHistory
  }, [chatHistory])

  useEffect(() => {
    modelParamsRef.current = modelParams
  }, [modelParams])

  // 自动同步 system prompt（每10秒）
  useEffect(() => {
    if (!user || !taskId) return

    const syncSystemPrompt = async () => {
      const currentTime = Date.now()
      const lastSyncTime = lastSyncTimeRef.current.systemPrompt
      
      // 检查是否需要同步（内容有变化且距离上次同步超过10秒）
      if (currentTime - lastSyncTime >= 10000) {
        try {
          await TaskService.updateSystemPrompt(user.id, taskId, systemPromptRef.current)
          lastSyncTimeRef.current.systemPrompt = currentTime
        } catch (error) {
          console.error('自动同步 system prompt 失败:', error)
        }
      }
    }

    // 立即执行一次，然后每10秒执行一次
    syncSystemPrompt()
    const interval = setInterval(syncSystemPrompt, 10000)

    return () => clearInterval(interval)
  }, [user, taskId])

  // 自动同步聊天历史（每10秒）
  useEffect(() => {
    if (!user || !taskId) return

    const syncChatHistory = async () => {
      const currentTime = Date.now()
      const lastSyncTime = lastSyncTimeRef.current.chatHistory
      
      // 检查是否需要同步（内容有变化且距离上次同步超过10秒）
      if (currentTime - lastSyncTime >= 10000) {
        try {
          await TaskService.updateChatHistory(user.id, taskId, chatHistoryRef.current)
          lastSyncTimeRef.current.chatHistory = currentTime
        } catch (error) {
          console.error('自动同步聊天历史失败:', error)
        }
      }
    }

    // 立即执行一次，然后每10秒执行一次
    syncChatHistory()
    const interval = setInterval(syncChatHistory, 10000)

    return () => clearInterval(interval)
  }, [user, taskId])

  // 立即同步模型参数
  const syncModelParams = useCallback(async (newParams: ModelParams) => {
    if (!user || !taskId) return

    try {
      await TaskService.updateModelParams(user.id, taskId, newParams)
      if (onModelParamsUpdate) {
        onModelParamsUpdate(newParams)
      }
    } catch (error) {
      console.error('同步模型参数失败:', error)
      throw error
    }
  }, [user, taskId, onModelParamsUpdate])

  // 创建新任务
  const createTask = useCallback(async (
    newTaskId: number,
    taskName: string,
    folderName: string,
    defaultModelParams: ModelParams
  ) => {
    if (!user) return

    try {
      await TaskService.createTask(user.id, newTaskId, taskName, folderName, defaultModelParams)
    } catch (error) {
      console.error('创建任务失败:', error)
      throw error
    }
  }, [user])

  // 手动强制同步所有数据
  const forceSyncAll = useCallback(async () => {
    if (!user || !taskId) return

    try {
      const currentTime = Date.now()
      
      // 同步 system prompt
      await TaskService.updateSystemPrompt(user.id, taskId, systemPromptRef.current)
      lastSyncTimeRef.current.systemPrompt = currentTime
      
      // 同步聊天历史
      await TaskService.updateChatHistory(user.id, taskId, chatHistoryRef.current)
      lastSyncTimeRef.current.chatHistory = currentTime
      
      // 同步模型参数
      await TaskService.updateModelParams(user.id, taskId, modelParamsRef.current)
      
      console.log('✅ 所有数据强制同步完成')
    } catch (error) {
      console.error('强制同步失败:', error)
      throw error
    }
  }, [user, taskId])

  return {
    syncModelParams,
    createTask,
    forceSyncAll
  }
}