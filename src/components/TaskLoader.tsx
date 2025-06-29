import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  FileText, 
  Folder, 
  AlertCircle, 
  RefreshCw,
  Database,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { TaskService, TaskInfo } from '../lib/taskService';
import { PromptTask } from '../types';
import { format } from 'date-fns';

interface TaskLoaderProps {
  onTasksLoaded?: (tasks: PromptTask[]) => void;
}

const TaskLoader: React.FC<TaskLoaderProps> = ({ onTasksLoaded }) => {
  const { user, userInfo } = useAuth();
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedTasks, setLoadedTasks] = useState<TaskInfo[]>([]);
  const [lastLoadTime, setLastLoadTime] = useState<Date | null>(null);

  // 转换数据库任务信息为前端任务格式
  const convertTaskInfoToPromptTask = (taskInfo: TaskInfo): PromptTask => {
    return {
      id: taskInfo.task_id?.toString() || '',
      name: taskInfo.task_name || '未命名任务',
      content: taskInfo.system_prompt || '',
      folderId: 'default', // 暂时使用默认文件夹
      model: taskInfo.model_params?.model_id || 'gpt-4',
      temperature: taskInfo.model_params?.temperature || 0.7,
      maxTokens: taskInfo.model_params?.max_tokens || 1000,
      createdAt: new Date(taskInfo.created_at || Date.now()),
      updatedAt: new Date(taskInfo.created_at || Date.now()),
      tags: [],
      notes: '',
      versions: [],
      currentChatHistory: TaskService.convertChatInfoToMessages(taskInfo.chatinfo || []),
      createdInDB: true // 标记为已在数据库中存在
    };
  };

  // 加载用户任务数据
  const loadUserTasks = async (showLoading = true) => {
    if (!user) {
      console.log('❌ 用户未登录，无法加载任务');
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      console.log('📥 开始加载用户任务数据...', {
        userId: user.id,
        userEmail: user.email,
        timestamp: new Date().toISOString()
      });

      // 获取用户的所有任务
      const taskInfoList = await TaskService.getUserTasks(user.id);
      
      console.log('📊 任务数据加载结果:', {
        tasksCount: taskInfoList.length,
        tasks: taskInfoList.map(t => ({
          id: t.task_id,
          name: t.task_name,
          folder: t.task_folder_name,
          hasSystemPrompt: !!t.system_prompt,
          hasChatHistory: (t.chatinfo || []).length > 0,
          createdAt: t.created_at
        }))
      });

      setLoadedTasks(taskInfoList);
      setLastLoadTime(new Date());

      // 转换为前端任务格式
      const promptTasks = taskInfoList.map(convertTaskInfoToPromptTask);

      // 更新应用状态
      if (promptTasks.length > 0) {
        console.log('🔄 更新应用状态，加载的任务:', promptTasks.length, '个');
        
        // 将加载的任务添加到现有任务列表中，避免重复
        const existingTaskIds = new Set(state.tasks.map(t => t.id));
        const newTasks = promptTasks.filter(task => !existingTaskIds.has(task.id));
        
        if (newTasks.length > 0) {
          console.log('➕ 添加新任务到状态:', newTasks.length, '个');
          newTasks.forEach(task => {
            dispatch({ type: 'ADD_TASK', payload: task });
          });
        }

        // 更新现有任务的数据库状态标记
        const updatedTasks = state.tasks.map(existingTask => {
          const dbTask = promptTasks.find(pt => pt.id === existingTask.id);
          if (dbTask) {
            return { ...existingTask, createdInDB: true };
          }
          return existingTask;
        });

        // 批量更新任务状态
        updatedTasks.forEach(task => {
          if (task.createdInDB !== state.tasks.find(t => t.id === task.id)?.createdInDB) {
            dispatch({ type: 'UPDATE_TASK', payload: task });
          }
        });
      }

      // 标记数据已加载
      dispatch({ type: 'SET_DATA_LOADED', payload: true });

      // 通知父组件
      if (onTasksLoaded) {
        onTasksLoaded(promptTasks);
      }

      console.log('✅ 用户任务数据加载完成');

    } catch (error) {
      console.error('❌ 加载用户任务失败:', error);
      
      let errorMessage = '加载任务失败';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = '加载超时，请检查网络连接';
        } else if (error.message.includes('Database connection unavailable')) {
          errorMessage = '数据库连接不可用，将使用本地数据';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      
      // 即使加载失败，也标记为已尝试加载，避免无限重试
      dispatch({ type: 'SET_DATA_LOADED', payload: true });
      
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // 用户登录后自动加载任务
  useEffect(() => {
    if (user && !state.isDataLoaded) {
      console.log('👤 检测到用户登录，开始加载任务数据...', {
        userId: user.id,
        userEmail: user.email,
        isDataLoaded: state.isDataLoaded
      });
      
      loadUserTasks();
    }
  }, [user, state.isDataLoaded]);

  // 手动刷新任务数据
  const handleRefresh = () => {
    console.log('🔄 用户手动刷新任务数据');
    loadUserTasks();
  };

  // 如果用户未登录，不显示任何内容
  if (!user) {
    return null;
  }

  return (
    <div className="task-loader">
      {/* 加载状态指示器 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50"
          >
            <div className="flex items-center space-x-3">
              <Loader2 size={20} className="animate-spin text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  正在加载任务数据...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  从数据库获取您的任务信息
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4 z-50 max-w-sm"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  任务加载失败
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                >
                  点击重试
                </button>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 任务加载成功提示 */}
      <AnimatePresence>
        {state.isDataLoaded && loadedTasks.length > 0 && lastLoadTime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-4 right-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-lg p-4 z-50"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  任务数据已加载
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  共 {loadedTasks.length} 个任务 • {format(lastLoadTime, 'HH:mm:ss')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskLoader;