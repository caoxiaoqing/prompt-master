import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Settings, 
  Thermometer, 
  Hash, 
  Info,
  RotateCcw,
  Save
} from 'lucide-react';
import { mockModels } from '../utils/mockData';

interface ModelSettingsModalProps {
  temperature: number;
  maxTokens: number;
  selectedModel: string;
  onClose: () => void;
  onSave: (temperature: number, maxTokens: number) => void;
}

const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  temperature,
  maxTokens,
  selectedModel,
  onClose,
  onSave
}) => {
  const [localTemperature, setLocalTemperature] = useState(temperature);
  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens);

  const currentModel = mockModels.find(m => m.id === selectedModel);

  const handleSave = () => {
    onSave(localTemperature, localMaxTokens);
    onClose();
  };

  const handleReset = () => {
    setLocalTemperature(0.7);
    setLocalMaxTokens(1000);
  };

  const getTemperatureDescription = (temp: number) => {
    if (temp <= 0.3) return '更加确定和一致的输出';
    if (temp <= 0.7) return '平衡的创造性和一致性';
    if (temp <= 1.2) return '更有创造性和多样性';
    return '高度随机和创造性';
  };

  const getTemperatureColor = (temp: number) => {
    if (temp <= 0.3) return 'text-blue-600 dark:text-blue-400';
    if (temp <= 0.7) return 'text-green-600 dark:text-green-400';
    if (temp <= 1.2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-backdrop-base flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 z-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Settings size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                模型参数设置
              </h2>
              <p className="text-sm text-gray-500">
                {currentModel?.name} ({currentModel?.provider})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Temperature Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Thermometer size={16} className="text-orange-600 dark:text-orange-400" />
                <label className="font-medium text-gray-900 dark:text-white">
                  Temperature
                </label>
              </div>
              <span className={`text-sm font-mono px-2 py-1 rounded ${getTemperatureColor(localTemperature)} bg-gray-100 dark:bg-gray-700`}>
                {localTemperature.toFixed(1)}
              </span>
            </div>
            
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={localTemperature}
                onChange={(e) => setLocalTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.0 (确定)</span>
                <span>1.0 (平衡)</span>
                <span>2.0 (创造)</span>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Info size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className={`font-medium ${getTemperatureColor(localTemperature)}`}>
                  {getTemperatureDescription(localTemperature)}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  控制输出的随机性。较低的值产生更一致的结果，较高的值增加创造性。
                </p>
              </div>
            </div>
          </div>

          {/* Max Tokens Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Hash size={16} className="text-purple-600 dark:text-purple-400" />
                <label className="font-medium text-gray-900 dark:text-white">
                  Max Tokens
                </label>
              </div>
              <span className="text-sm font-mono px-2 py-1 rounded text-purple-600 dark:text-purple-400 bg-gray-100 dark:bg-gray-700">
                {localMaxTokens.toLocaleString()}
              </span>
            </div>
            
            <div className="space-y-2">
              <input
                type="range"
                min="100"
                max={currentModel?.maxTokens || 4000}
                step="100"
                value={localMaxTokens}
                onChange={(e) => setLocalMaxTokens(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>100</span>
                <span>{Math.floor((currentModel?.maxTokens || 4000) / 2).toLocaleString()}</span>
                <span>{(currentModel?.maxTokens || 4000).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Info size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">
                  最大输出长度限制
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  控制模型生成响应的最大长度。1 token ≈ 4 个字符（中文）或 0.75 个单词（英文）。
                </p>
              </div>
            </div>
          </div>

          {/* Model Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              模型信息
            </h4>
            <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <div className="flex justify-between">
                <span>提供商:</span>
                <span className="font-mono">{currentModel?.provider}</span>
              </div>
              <div className="flex justify-between">
                <span>最大上下文:</span>
                <span className="font-mono">{currentModel?.maxTokens?.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between">
                <span>支持功能:</span>
                <span className="font-mono">{currentModel?.supportedFeatures.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            <span>重置默认</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={16} />
              <span>保存设置</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModelSettingsModal;