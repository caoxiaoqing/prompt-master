import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Folder, 
  Clock, 
  MessageSquare, 
  Database,
  Eye,
  Edit3,
  Trash2,
  MoreHorizontal,
  Tag,
  User,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { TaskService } from '../lib/taskService';
import { PromptTask } from '../types';
import { format } from 'date-fns';

interface TaskListProps {
  tasks: PromptTask[];
  onTaskSelect?: (task: PromptTask) => void;
  onTaskDelete?: (taskId: string) => void;
  showActions?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  onTaskSelect, 
  onTaskDelete,
  showActions = true 
}) => {
  const { user } = useAuth();
  const { dispatch } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const handleTaskClick = (task: PromptTask) => {
    setSelectedTaskId(task.id);
    if (onTaskSelect) {
      onTaskSelect(task);
    }
    // 设置为当前任务
    dispatch({ type: 'SET_CURRENT_TASK', payload: task });
  };

  const handleDeleteTask = async (task: PromptTask) => {
    if (!confirm(`确定要删除任务 "${task.name}" 吗？`)) return;
    
    try {
      // 如果任务在数据库中，删除数据库记录
      if (user && task.createdInDB) {
        await TaskService.deleteTask(user.id, parseInt(task.id));
      }
      
      // 删除本地任务
      dispatch({ type: 'DELETE_TASK', payload: task.id });
      
      if (onTaskDelete) {
        onTaskDelete(task.id);
      }
      
      console.log('✅ 任务删除成功:', task.name);
    } catch (error) {
      console.error('❌ 删除任务失败:', error);
      alert('删除任务失败，请稍后重试');
    }
  };

  const getTaskStatusIcon = (task: PromptTask) => {
    if (task.createdInDB) {
      return <Database size={12} className="text-green-600 dark:text-green-400" title="已同步到数据库" />;
    }
    return <FileText size={12} className="text-gray-400" title="仅本地存储" />;
  };

  const getTaskStats = (task: PromptTask) => {
    const stats = [];
    
    if (task.content) {
      stats.push({
        icon: Zap,
        label: 'System Prompt',
        value: `${Math.ceil(task.content.length / 4)} tokens`,
        color: 'text-purple-600 dark:text-purple-400'
      });
    }
    
    if (task.currentChatHistory && task.currentChatHistory.length > 0) {
      stats.push({
        icon: MessageSquare,
        label: '聊天记录',
        value: `${task.currentChatHistory.length} 条`,
        color: 'text-blue-600 dark:text-blue-400'
      });
    }
    
    if (task.versions && task.versions.length > 0) {
      stats.push({
        icon: Tag,
        label: '版本',
        value: `${task.versions.length} 个`,
        color: 'text-orange-600 dark:text-orange-400'
      });
    }
    
    return stats;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText size={48} className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无任务
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          创建您的第一个任务开始使用
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          任务列表
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          共 {tasks.length} 个任务
        </span>
      </div>
      
      <div className="grid gap-4">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleTaskClick(task)}
            className={`group p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
              selectedTaskId === task.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
            }`}
          >
            {/* 任务头部 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  {getTaskStatusIcon(task)}
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {task.name}
                  </h4>
                </div>
                
                {/* 文件夹标签 */}
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <Folder size={10} className="text-gray-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {task.folderId === 'default' ? '默认文件夹' : task.folderId}
                  </span>
                </div>
              </div>
              
              {/* 操作菜单 */}
              {showActions && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(showMenu === task.id ? null : task.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  
                  {showMenu === task.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[120px] z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                          setShowMenu(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Eye size={12} />
                        <span>查看</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task);
                          setShowMenu(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-red-600 dark:text-red-400"
                      >
                        <Trash2 size={12} />
                        <span>删除</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 任务内容预览 */}
            {task.content && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {task.content}
                </p>
              </div>
            )}

            {/* 任务统计信息 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getTaskStats(task).map((stat, idx) => (
                  <div key={idx} className="flex items-center space-x-1">
                    <stat.icon size={12} className={stat.color} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock size={12} />
                <span>{format(task.updatedAt, 'MM/dd HH:mm')}</span>
              </div>
            </div>

            {/* 模型信息 */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <User size={10} className="text-gray-400" />
                  <span className="text-gray-500 dark:text-gray-400">
                    {task.model}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    T:{task.temperature} / {task.maxTokens}
                  </span>
                </div>
                
                {task.createdInDB && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    已同步
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;