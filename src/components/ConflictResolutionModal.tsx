import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Clock,
  User,
  Database,
  GitMerge,
  Check,
  X
} from 'lucide-react'

interface ConflictData {
  type: 'task' | 'folder' | 'system_prompt' | 'chat_history'
  localData: any
  remoteData: any
  localTimestamp: Date
  remoteTimestamp: Date
}

interface ConflictResolutionModalProps {
  conflicts: ConflictData[]
  onResolve: (resolutions: { [key: string]: 'local' | 'remote' | 'merge' }) => void
  onClose: () => void
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflicts,
  onResolve,
  onClose
}) => {
  const [resolutions, setResolutions] = useState<{ [key: string]: 'local' | 'remote' | 'merge' }>({})

  const handleResolutionChange = (index: number, resolution: 'local' | 'remote' | 'merge') => {
    setResolutions(prev => ({
      ...prev,
      [index]: resolution
    }))
  }

  const handleResolveAll = () => {
    onResolve(resolutions)
  }

  const getConflictTitle = (conflict: ConflictData) => {
    switch (conflict.type) {
      case 'task':
        return `任务冲突: ${conflict.localData.name || conflict.remoteData.task_name}`
      case 'folder':
        return `文件夹冲突: ${conflict.localData.name || conflict.remoteData.folder_name}`
      case 'system_prompt':
        return '系统提示词冲突'
      case 'chat_history':
        return '聊天历史冲突'
      default:
        return '数据冲突'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getDataPreview = (data: any, type: string) => {
    switch (type) {
      case 'task':
        return {
          name: data.name || data.task_name,
          content: data.content || data.system_prompt,
          updatedAt: data.updatedAt || data.updated_at
        }
      case 'system_prompt':
        return {
          content: data.content || data.system_prompt,
          length: (data.content || data.system_prompt || '').length
        }
      case 'chat_history':
        return {
          messageCount: (data.chatHistory || data.chatinfo || []).length,
          lastMessage: (data.chatHistory || data.chatinfo || []).slice(-1)[0]?.content
        }
      default:
        return data
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                解决数据冲突
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                检测到 {conflicts.length} 个数据冲突，请选择保留哪个版本
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 冲突列表 */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          <div className="space-y-6">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  {getConflictTitle(conflict)}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 本地版本 */}
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center space-x-2 mb-3">
                      <User size={16} className="text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        本地版本
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                        <Clock size={12} />
                        <span>{formatTimestamp(conflict.localTimestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {Object.entries(getDataPreview(conflict.localData, conflict.type)).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">
                            {key}:
                          </span>
                          <span className="text-gray-900 dark:text-white font-mono text-xs max-w-48 truncate">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleResolutionChange(index, 'local')}
                      className={`mt-3 w-full px-3 py-2 rounded-lg transition-colors ${
                        resolutions[index] === 'local'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      {resolutions[index] === 'local' && <Check size={16} className="inline mr-2" />}
                      使用本地版本
                    </button>
                  </div>

                  {/* 远程版本 */}
                  <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center space-x-2 mb-3">
                      <Database size={16} className="text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-700 dark:text-green-300">
                        远程版本
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                        <Clock size={12} />
                        <span>{formatTimestamp(conflict.remoteTimestamp)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {Object.entries(getDataPreview(conflict.remoteData, conflict.type)).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">
                            {key}:
                          </span>
                          <span className="text-gray-900 dark:text-white font-mono text-xs max-w-48 truncate">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleResolutionChange(index, 'remote')}
                      className={`mt-3 w-full px-3 py-2 rounded-lg transition-colors ${
                        resolutions[index] === 'remote'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                      }`}
                    >
                      {resolutions[index] === 'remote' && <Check size={16} className="inline mr-2" />}
                      使用远程版本
                    </button>
                  </div>
                </div>

                {/* 合并选项 */}
                {(conflict.type === 'task' || conflict.type === 'chat_history') && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <button
                      onClick={() => handleResolutionChange(index, 'merge')}
                      className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        resolutions[index] === 'merge'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                      }`}
                    >
                      {resolutions[index] === 'merge' && <Check size={16} />}
                      <GitMerge size={16} />
                      <span>智能合并</span>
                    </button>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 text-center">
                      自动合并两个版本的数据，保留所有有用信息
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            已选择 {Object.keys(resolutions).length} / {conflicts.length} 个解决方案
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleResolveAll}
              disabled={Object.keys(resolutions).length !== conflicts.length}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              解决所有冲突
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ConflictResolutionModal