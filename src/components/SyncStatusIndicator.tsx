import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Activity,
  X
} from 'lucide-react'
import { syncService, SyncStatus, SyncEvent } from '../lib/syncService'
import { useAuth } from '../contexts/AuthContext'

const SyncStatusIndicator: React.FC = () => {
  const { user } = useAuth()
  const [syncState, setSyncState] = useState({
    status: SyncStatus.IDLE,
    isOnline: navigator.onLine,
    queueLength: 0,
    lastSyncTime: 0,
    error: null as string | null,
    conflictCount: 0
  })
  const [showDetails, setShowDetails] = useState(false)
  const [isManualSyncing, setIsManualSyncing] = useState(false)

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

    syncService.addEventListener('sync_start', handleSyncStart)
    syncService.addEventListener('sync_complete', handleSyncComplete)
    syncService.addEventListener('sync_error', handleSyncError)
    syncService.addEventListener('conflict_detected', handleConflictDetected)

    return () => {
      syncService.removeEventListener('sync_start', handleSyncStart)
      syncService.removeEventListener('sync_complete', handleSyncComplete)
      syncService.removeEventListener('sync_error', handleSyncError)
      syncService.removeEventListener('conflict_detected', handleConflictDetected)
    }
  }, [])

  // 获取队列状态
  useEffect(() => {
    const updateQueueStatus = () => {
      const queueStatus = syncService.getQueueStatus()
      setSyncState(prev => ({
        ...prev,
        queueLength: queueStatus.length
      }))
    }
    
    // 初始更新
    updateQueueStatus()
    
    // 定期更新
    const interval = setInterval(updateQueueStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleManualSync = async () => {
    if (!user) return
    
    setIsManualSyncing(true)
    try {
      await syncService.forceFullSync(user.id)
    } catch (error) {
      console.error('手动同步失败:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  const getStatusIcon = () => {
    if (!syncState.isOnline) {
      return <WifiOff size={16} className="text-red-500" />
    }

    switch (syncState.status) {
      case SyncStatus.SYNCING:
        return <RefreshCw size={16} className="text-blue-500 animate-spin" />
      case SyncStatus.SUCCESS:
        return <CheckCircle size={16} className="text-green-500" />
      case SyncStatus.ERROR:
        return <AlertCircle size={16} className="text-red-500" />
      case SyncStatus.CONFLICT:
        return <AlertCircle size={16} className="text-yellow-500" />
      default:
        return <Database size={16} className="text-gray-500" />
    }
  }

  const getStatusText = () => {
    if (!syncState.isOnline) {
      return '离线'
    }

    switch (syncState.status) {
      case SyncStatus.SYNCING:
        return '同步中'
      case SyncStatus.SUCCESS:
        return '已同步'
      case SyncStatus.ERROR:
        return '同步失败'
      case SyncStatus.CONFLICT:
        return '有冲突'
      default:
        return '待同步'
    }
  }

  const getStatusColor = () => {
    if (!syncState.isOnline) {
      return 'text-red-600 dark:text-red-400'
    }

    switch (syncState.status) {
      case SyncStatus.SYNCING:
        return 'text-blue-600 dark:text-blue-400'
      case SyncStatus.SUCCESS:
        return 'text-green-600 dark:text-green-400'
      case SyncStatus.ERROR:
        return 'text-red-600 dark:text-red-400'
      case SyncStatus.CONFLICT:
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const formatLastSyncTime = (timestamp: number) => {
    if (!timestamp) return '从未同步'
    
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  const syncStats = syncService.getSyncStats()
  const queueStatus = syncService.getQueueStatus()

  return (
    <div className="relative">
      {/* 状态指示器 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${getStatusColor()}`}
        title={`同步状态: ${getStatusText()}`}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {syncState.queueLength > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">
            {syncState.queueLength}
          </span>
        )}
      </button>

      {/* 详细信息面板 */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Activity size={16} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium text-gray-900 dark:text-white">同步状态</h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={14} />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-4 space-y-4">
              {/* 当前状态 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">当前状态</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon()}
                  <span className={`text-sm font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>

              {/* 网络状态 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">网络连接</span>
                <div className="flex items-center space-x-2">
                  {syncState.isOnline ? (
                    <Wifi size={14} className="text-green-500" />
                  ) : (
                    <WifiOff size={14} className="text-red-500" />
                  )}
                  <span className={`text-sm ${syncState.isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {syncState.isOnline ? '在线' : '离线'}
                  </span>
                </div>
              </div>

              {/* 队列状态 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">待同步项目</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {queueStatus.length} 项
                </span>
              </div>

              {/* 最后同步时间 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">最后同步</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatLastSyncTime(syncState.lastSyncTime)}
                </span>
              </div>

              {/* 错误信息 */}
              {syncState.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      同步错误
                    </span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {syncState.error}
                  </p>
                </div>
              )}

              {/* 冲突提示 */}
              {syncState.conflictCount > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                      检测到冲突
                    </span>
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    {syncState.conflictCount} 个项目存在冲突，已自动解决
                  </p>
                </div>
              )}

              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {syncStats.successfulOperations}
                  </div>
                  <div className="text-xs text-gray-500">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {syncStats.failedOperations}
                  </div>
                  <div className="text-xs text-gray-500">失败</div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleManualSync}
                  disabled={isManualSyncing || !syncState.isOnline || !user}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw size={14} className={isManualSyncing ? 'animate-spin' : ''} />
                  <span className="text-sm">
                    {isManualSyncing ? '同步中...' : '手动同步'}
                  </span>
                </button>
                <button
                  onClick={() => user && syncService.pullFromRemote(user.id)}
                  disabled={!syncState.isOnline || !user}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="从远程拉取"
                >
                  <Database size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SyncStatusIndicator