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
  const { state } = useApp()
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
    if (!user || !taskId || state.isUnauthenticatedMode) return

    const syncSystemPrompt = async () => {
      const currentTime = Date.now()
      const lastSyncTime = lastSyncTimeRef.current.systemPrompt
      
      // 检查是否需要同步（距离上次同步超过10秒）
      if (currentTime - lastSyncTime >= 10000 && systemPromptRef.current.trim()) {
        try {
          console.log('🔄 自动同步 system prompt...', { taskId, length: systemPromptRef.current.length })
          await TaskService.updateSystemPrompt(user.id, taskId, systemPromptRef.current)
          lastSyncTimeRef.current.systemPrompt = currentTime
          console.log('✅ System prompt 自动同步成功')
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
    if (!user || !taskId || state.isUnauthenticatedMode) return

    const syncChatHistory = async () => {
      const currentTime = Date.now()
      const lastSyncTime = lastSyncTimeRef.current.chatHistory
      
      // 检查是否需要同步（距离上次同步超过10秒且有聊天记录）
      if (currentTime - lastSyncTime >= 10000 && chatHistoryRef.current.length > 0) {
        try {
          console.log('🔄 自动同步聊天历史...', { taskId, messagesCount: chatHistoryRef.current.length })
          await TaskService.updateChatHistory(user.id, taskId, chatHistoryRef.current)
          lastSyncTimeRef.current.chatHistory = currentTime
          console.log('✅ 聊天历史自动同步成功')
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
    if (!user || !taskId || state.isUnauthenticatedMode) return

    try {
      console.log('🔄 立即同步模型参数...', { taskId, params: newParams })
      await TaskService.updateModelParams(user.id, taskId, newParams)
      console.log('✅ 模型参数同步成功')
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
    if (!user || state.isUnauthenticatedMode) return

    try {
      console.log('🔄 创建新任务数据库记录...', { 
        userId: user.id,
        taskId: newTaskId, 
        taskName, 
        folderName,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        timeoutWarning: '如果操作时间较长，可能是网络问题，请耐心等待'
      })
      
      // 添加重试机制
      let retryCount = 0
      const maxRetries = 1
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 尝试创建任务 (第 ${retryCount + 1} 次)...`, {
            attempt: retryCount + 1,
            maxRetries,
            taskId: newTaskId,
            taskName
          })
          
          await TaskService.createTask(user.id, newTaskId, taskName, folderName, defaultModelParams)
          console.log('✅ 任务数据库记录创建成功')
          return // 成功则退出
        } catch (error) {
          // 关键修复：专门处理超时错误
          if (error instanceof Error && (
            error.message.includes('timeout') ||
            error.message.includes('Task creation timeout') ||
            error.message.includes('after') && error.message.includes('ms')
          )) {
            console.error('⏰ 任务创建超时，停止重试:', error.message)
            throw new Error('任务创建超时，请检查网络连接状态')
          }
          
          retryCount++
          console.error(`❌ 第 ${retryCount} 次创建尝试失败:`, {
            attempt: retryCount,
            error: error instanceof Error ? error.message : error,
            taskId: newTaskId,
            taskName
          })
          
          // 如果是重复键错误，不需要重试
          if (error instanceof Error && (error.message.includes('duplicate key') || error.message.includes('23505'))) {
            console.log('ℹ️ 检测到重复键错误，任务可能已存在，停止重试')
            return // 直接返回，不抛出错误
          }
          
          if (retryCount >= maxRetries) {
            throw error // 达到最大重试次数，抛出错误
          }
          
          // 等待一段时间后重试
          const delay = Math.pow(2, retryCount) * 1000 // 指数退避：2s, 4s, 8s
          console.log(`⏳ 等待 ${delay}ms 后重试...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    } catch (error) {
      console.error('❌ 创建任务数据库记录失败:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        userId: user.id,
        taskId: newTaskId,
        taskName,
        folderName,
        timestamp: new Date().toISOString()
      })
      
      // 如果是重复键错误，不抛出错误，让应用继续运行
      if (error instanceof Error && (error.message.includes('duplicate key') || error.message.includes('23505'))) {
        console.log('ℹ️ 任务可能已存在，继续运行应用')
        return
      }
      
      // 其他错误仍然抛出
      throw error
    }
      
      // 其他错误抛出
      throw error
  }, [user])

  // 手动强制同步所有数据
  const forceSyncAll = useCallback(async () => {
    if (!user || !taskId || state.isUnauthenticatedMode) return

    try {
      console.log('🔄 开始强制同步所有数据...', { taskId })
      const currentTime = Date.now()
      
      // 同步 system prompt
      if (systemPromptRef.current.trim()) {
        await TaskService.updateSystemPrompt(user.id, taskId, systemPromptRef.current)
        lastSyncTimeRef.current.systemPrompt = currentTime
        console.log('✅ System prompt 强制同步完成')
      }
      
      // 同步聊天历史
      if (chatHistoryRef.current.length > 0) {
        await TaskService.updateChatHistory(user.id, taskId, chatHistoryRef.current)
        lastSyncTimeRef.current.chatHistory = currentTime
        console.log('✅ 聊天历史强制同步完成')
      }
      
      // 同步模型参数
      await TaskService.updateModelParams(user.id, taskId, modelParamsRef.current)
      console.log('✅ 模型参数强制同步完成')
      
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