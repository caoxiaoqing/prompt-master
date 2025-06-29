import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  FileText, 
  Folder, 
  RefreshCw, 
  Plus,
  Search,
  Filter,
  Grid,
  List,
  TrendingUp,
  Clock,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { TaskService } from '../lib/taskService';
import { PromptTask } from '../types';
import TaskLoader from './TaskLoader';
import TaskList from './TaskList';

const TaskDashboard: React.FC = () => {
  const { user, userInfo } = useAuth();
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'local'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // 过滤任务
  const filteredTasks = state.tasks.filter(task => {
    // 搜索过滤
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 状态过滤
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'synced' && task.createdInDB) ||
                         (filterStatus === 'local' && !task.createdInDB);
    
    return matchesSearch && matchesFilter;
  });

  // 统计信息
  const stats = {
    total: state.tasks.length,
    synced: state.tasks.filter(t => t.createdInDB).length,
    local: state.tasks.filter(t => !t.createdInDB).length,
    withChat: state.tasks.filter(t => t.currentChatHistory && t.currentChatHistory.length > 0).length,
    withVersions: state.tasks.filter(t => t.versions && t.versions.length > 0).length
  };

  // 手动刷新数据
  const handleRefresh = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      console.log('🔄 手动刷新任务数据...');
      
      const taskInfoList = await TaskService.getUserTasks(user.id);
      console.log('📊 刷新获取到任务:', taskInfoList.length, '个');
      
      // 这里可以添加更新逻辑，比如合并新数据
      // 暂时只是重新触发加载
      dispatch({ type: 'SET_DATA_LOADED', payload: false });
      
    } catch (error) {
      console.error('❌ 刷新任务数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 创建新任务
  const handleCreateTask = () => {
    // 这里可以触发创建新任务的逻辑
    console.log('➕ 创建新任务');
    // 可以调用 FolderSidebar 的创建任务功能
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Database size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">请先登录</h2>
          <p className="text-gray-500">登录后即可查看您的任务数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 任务加载器 */}
      <TaskLoader />
      
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">任务管理</h1>
            <p className="text-gray-600 dark:text-gray-400">
              管理您的 AI 提示词任务和聊天记录
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>刷新</span>
            </button>
            
            <button
              onClick={handleCreateTask}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span>新建任务</span>
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">总任务</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {stats.total}
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Database size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">已同步</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {stats.synced}
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Folder size={16} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">仅本地</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {stats.local}
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <MessageSquare size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">有聊天</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {stats.withChat}
            </div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap size={16} className="text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">有版本</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              {stats.withVersions}
            </div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索任务..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部任务</option>
            <option value="synced">已同步</option>
            <option value="local">仅本地</option>
          </select>
          
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {state.isDataLoaded ? (
          <TaskList 
            tasks={filteredTasks}
            onTaskSelect={(task) => {
              console.log('选择任务:', task.name);
            }}
            onTaskDelete={(taskId) => {
              console.log('删除任务:', taskId);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Database size={48} className="mx-auto mb-4 text-gray-400 animate-pulse" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                正在加载任务数据...
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                请稍候，正在从数据库获取您的任务信息
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDashboard;