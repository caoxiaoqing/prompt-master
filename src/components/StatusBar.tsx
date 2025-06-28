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

const StatusBar: React.FC = () => {
  const { state } = useApp();
  
  // 计算当前任务的token数（简单估算：4字符=1token）
  const currentPromptTokens = state.currentTask 
    ? Math.ceil(state.currentTask.content.length / 4)
    : 0;

  // 获取最近的测试结果
  const latestTestResult = state.testResults[state.testResults.length - 1];
  
  // 获取当前任务的token使用情况
  const currentTokenUsage = state.currentTask?.tokenUsage || latestTestResult?.tokenUsage;

  const statusItems = [
    {
      icon: Cpu,
      label: '模型',
      value: state.selectedModel,
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
      icon: Thermometer,
      label: 'Temperature',
      value: state.currentTask?.temperature.toString() || '0.7',
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      icon: Zap,
      label: 'Max Tokens',
      value: state.currentTask?.maxTokens.toString() || '1000',
      color: 'text-indigo-600 dark:text-indigo-400'
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