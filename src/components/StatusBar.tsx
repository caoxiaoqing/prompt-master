import React from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  Clock, 
  Zap, 
  Activity,
  Database,
  Thermometer,
  Hash
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
// import { useAuth } from '../contexts/AuthContext';
import { TaskService } from '../lib/taskService';
import { SyncStatusIndicator } from './SyncStatusIndicator';

const StatusBar: React.FC = () => {
  const { state } = useApp();
  // const { userInfo } = useAuth();
  
  // 计算当前任务的token数（简单估算：4字符=1token）
  const currentPromptTokens = state.currentTask 
    ? Math.ceil(state.currentTask.content.length / 4)
    : 0;

  // 获取最近的测试结果
  const latestTestResult = state.testResults[state.testResults.length - 1];
  
  // 获取当前任务的token使用情况
  const currentTokenUsage = state.currentTask?.tokenUsage || latestTestResult?.tokenUsage;

  // 检查用户是否配置了自定义模型
  // const hasCustomModels = userInfo?.custom_models && userInfo.custom_models.length > 0;
  const selectedCustomModel = state.selectedCustomModel;
  
  // 演示模式：模拟有自定义模型
  const hasCustomModels = true;
  
  // 如果没有选中模型，使用演示模型
  const demoModel = selectedCustomModel || { name: 'GPT-4 (演示)', temperature: 0.7, topK: 50, topP: 1.0 };
  
  // 获取当前任务的模型参数
  const getCurrentModelParams = () => {
    if (demoModel) {
      return TaskService.getDefaultModelParams(demoModel);
    }
    return null;
  };

  const currentModelParams = getCurrentModelParams();
  // 如果用户没有打开任何任务文件，只显示基本信息
  if (!state.currentTask) {
    const basicStatusItems = [
      {
        icon: Database,
        label: '状态',
        value: '无任务',
        color: 'text-pink-600 dark:text-pink-400'
      }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 overflow-x-auto">
            {basicStatusItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center space-x-2 min-w-0 flex-shrink-0"
              >
                <item.icon size={14} className={`${item.color} flex-shrink-0`} />
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {item.label}:
                  </span>
                  <span className={`font-mono font-semibold ${item.color}`}>
                    {item.value}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* 右侧状态指示器 */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* 连接状态 */}
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">在线</span>
            </div>
            
            {/* 当前时间 */}
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {new Date().toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // 如果用户没有配置任何自定义模型，显示提示信息
  if (!hasCustomModels) {
    const basicStatusItems = [
      {
        icon: Hash,
        label: 'Prompt Tokens',
        value: currentPromptTokens.toString(),
        color: 'text-orange-600 dark:text-orange-400'
      },
      {
        icon: Database,
        label: 'Total Tokens',
        value: currentTokenUsage ? currentTokenUsage.total.toString() : '0',
        color: 'text-pink-600 dark:text-pink-400'
      }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 overflow-x-auto">
            {basicStatusItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center space-x-2 min-w-0 flex-shrink-0"
              >
                <item.icon size={14} className={`${item.color} flex-shrink-0`} />
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {item.label}:
                  </span>
                  <span className={`font-mono font-semibold ${item.color}`}>
                    {item.value}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {/* 提示用户配置模型 */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-2 min-w-0 flex-shrink-0"
            >
              <Cpu size={14} className="text-gray-400 flex-shrink-0" />
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-gray-400 font-medium">
                  模型: 未配置
                </span>
              </div>
            </motion.div>
          </div>
          
          {/* 右侧状态指示器 */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* 连接状态 */}
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">在线</span>
            </div>
            
            {/* 当前时间 */}
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {new Date().toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // 如果用户有自定义模型但没有选择，显示提示
  if (hasCustomModels && !selectedCustomModel) {
    const statusItems = [
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 overflow-x-auto">
            {statusItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center space-x-2 min-w-0 flex-shrink-0"
              >
                <item.icon size={14} className={`${item.color} flex-shrink-0`} />
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {item.label}:
                  </span>
                  <span className={`font-mono font-semibold ${item.color}`}>
                    {item.value}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* 右侧状态指示器 */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* 连接状态 */}
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">在线</span>
            </div>
            
            {/* 当前时间 */}
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {new Date().toLocaleTimeString('zh-CN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // 显示选中模型的详细信息
  const statusItems = [
    {
      icon: Cpu,
      label: '模型',
      value: demoModel?.name || '演示模型',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Hash,
      label: 'Prompt Tokens',
      value: currentPromptTokens.toString(),
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: Database,
      label: 'Total Tokens',
      value: currentTokenUsage ? currentTokenUsage.total.toString() : '0',
      color: 'text-pink-600 dark:text-pink-400'
    },
    {
      icon: Hash,
      label: 'Top-K',
      value: currentModelParams?.top_k?.toString() || '50',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Zap,
      label: 'Top-P',
      value: currentModelParams?.top_p?.toString() || '1.0',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: Thermometer,
      label: 'Temperature',
      value: currentModelParams?.temperature?.toString() || '0.7',
      color: 'text-yellow-600 dark:text-yellow-400'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6 overflow-x-auto">
          {statusItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center space-x-2 min-w-0 flex-shrink-0"
            >
              <item.icon size={14} className={`${item.color} flex-shrink-0`} />
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {item.label}:
                </span>
                <span className={`font-mono font-semibold ${item.color}`}>
                  {item.value}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* 右侧状态指示器 */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* 同步状态指示器 */}
          {/* 移除同步状态指示器 */}
          
          {/* 连接状态 */}
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">演示模式</span>
          </div>
          
          {/* 当前时间 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {new Date().toLocaleTimeString('zh-CN', { 
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
      
      {/* 进度条（如果有正在运行的测试） */}
      {state.testResults.some(result => !result.success && !result.error) && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default StatusBar;