import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

const PromptCommunity: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-900"
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">
          探索和分享由社区贡献的优秀 Prompt 案例。
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">社区页面建设中...</p>
          <p className="text-sm">敬请期待更多精彩内容！</p>
        </div>
      </div>
    </motion.div>
  );
};

export default PromptCommunity;
