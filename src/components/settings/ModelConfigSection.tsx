import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Eye, 
  EyeOff, 
  Settings as SettingsIcon,
  Cpu,
  Key,
  Globe,
  Star,
  Loader2,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserInfo } from '../../lib/supabase';

interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  parameters: {
    topK: number;
    topP: number;
    temperature: number;
  };
  isDefault: boolean;
  createdAt: Date;
}

interface ModelConfigSectionProps {
  user: SupabaseUser | null;
  userInfo: UserInfo | null;
  updateUserInfo: (updates: Partial<UserInfo>) => Promise<void>;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ModelConfigSection: React.FC<ModelConfigSectionProps> = ({
  user,
  userInfo,
  updateUserInfo,
  showNotification,
  loading,
  setLoading
}) => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});

  // Load models from userInfo on component mount
  useEffect(() => {
    if (userInfo) {
      // Parse existing model configurations from userInfo
      // This is a simplified version - you might store this differently
      console.log('📥 Loading models from userInfo:', userInfo.custom_models);
      
      const savedModels: ModelConfig[] = userInfo.custom_models ? 
        userInfo.custom_models.map((model: any) => ({
          id: model.id || Date.now().toString(),
          name: model.name || 'Unknown Model',
          baseUrl: model.baseUrl || model.base_url || '',
          apiKey: model.apiKey || model.api_key || '',
          parameters: model.parameters || { topK: 50, topP: 1.0, temperature: 0.8 },
          isDefault: model.isDefault || false,
          createdAt: model.createdAt ? new Date(model.createdAt) : new Date()
        })) : [];
      
      setModels(savedModels);
      console.log('✅ Models loaded:', savedModels.length);
    }
  }, [userInfo]);

  const handleAddModel = () => {
    setEditingModel(null);
    setShowAddModal(true);
  };

  const handleEditModel = (model: ModelConfig) => {
    setEditingModel(model);
    setShowAddModal(true);
  };

  // 同步模型数据到数据库
  const syncModelsToDatabase = async (updatedModels: ModelConfig[]) => {
    if (!user) return;
    
    try {
      setSyncStatus('syncing');
      console.log('🔄 Syncing models to database:', updatedModels);
      
      // 准备要保存的模型数据
      const modelsForStorage = updatedModels.map(model => ({
        id: model.id,
        name: model.name,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        parameters: model.parameters,
        isDefault: model.isDefault,
        createdAt: model.createdAt.toISOString()
      }));
      
      await updateUserInfo({ custom_models: modelsForStorage });
      setSyncStatus('success');
      console.log('✅ Models synced successfully');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ Failed to sync models:', error);
      setSyncStatus('error');
      showNotification('error', '模型同步失败，请稍后重试');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('确定要删除这个模型配置吗？')) return;

    try {
      setLoading(true);
      const updatedModels = models.filter(m => m.id !== modelId);
      setModels(updatedModels);
      
      // 同步到数据库
      await syncModelsToDatabase(updatedModels);
      
      showNotification('success', '模型配置已删除');
    } catch (error) {
      console.error('Delete model error:', error);
      showNotification('error', '删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (modelId: string) => {
    try {
      setLoading(true);
      const updatedModels = models.map(m => ({
        ...m,
        isDefault: m.id === modelId
      }));
      setModels(updatedModels);
      
      // 同步到数据库
      await syncModelsToDatabase(updatedModels);
      
      showNotification('success', '默认模型已更新');
    } catch (error) {
      console.error('Set default model error:', error);
      showNotification('error', '设置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleApiKeyVisibility = (modelId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SettingsIcon size={20} className="text-blue-600 dark:text-blue-400" />
          <div className="flex items-center space-x-2">
            <Database size={16} className={`${
              syncStatus === 'syncing' ? 'text-blue-600 dark:text-blue-400 animate-pulse' :
              syncStatus === 'success' ? 'text-green-600 dark:text-green-400' :
              syncStatus === 'error' ? 'text-red-600 dark:text-red-400' :
              'text-gray-400'
            }`} />
            <span className={`text-xs ${
              syncStatus === 'syncing' ? 'text-blue-600 dark:text-blue-400' :
              syncStatus === 'success' ? 'text-green-600 dark:text-green-400' :
              syncStatus === 'error' ? 'text-red-600 dark:text-red-400' :
              'text-gray-500'
            }`}>
              {syncStatus === 'syncing' ? '同步中...' :
               syncStatus === 'success' ? '已同步' :
               syncStatus === 'error' ? '同步失败' :
               '本地存储'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI 模型配置</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              管理您的自定义 AI 模型和参数设置
            </p>
          </div>
        </div>
        <button
          onClick={handleAddModel}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span>添加模型</span>
        </button>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        {models.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Cpu size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无自定义模型
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              添加您的第一个自定义 AI 模型配置
            </p>
            <button
              onClick={handleAddModel}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span>添加模型</span>
            </button>
          </div>
        ) : (
          models.map((model) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Cpu size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {model.name}
                      </h3>
                      {model.isDefault && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs">
                          <Star size={12} />
                          <span>默认</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      创建于 {model.createdAt.toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!model.isDefault && (
                    <button
                      onClick={() => handleSetDefault(model.id)}
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                      title="设为默认"
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditModel(model)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteModel(model.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <Globe size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {model.baseUrl}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <Key size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {showApiKey[model.id] 
                        ? model.apiKey 
                        : '•'.repeat(Math.min(model.apiKey.length, 20))
                      }
                    </span>
                    <button
                      onClick={() => toggleApiKeyVisibility(model.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showApiKey[model.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  模型参数
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Top-K:</span>
                    <span className="ml-2 font-mono">{model.parameters.topK}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Top-P:</span>
                    <span className="ml-2 font-mono">{model.parameters.topP}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Temperature:</span>
                    <span className="ml-2 font-mono">{model.parameters.temperature}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Model Modal */}
      <AnimatePresence>
        {showAddModal && (
          <ModelConfigModal
            model={editingModel}
            onSave={(modelData) => {
              let updatedModels: ModelConfig[];
              
              if (editingModel) {
                // Update existing model
                updatedModels = models.map(m => 
                  m.id === editingModel.id ? { ...modelData, id: editingModel.id } : m
                );
                setModels(updatedModels);
                showNotification('success', '模型配置已更新');
              } else {
                // Add new model
                const newModel: ModelConfig = {
                  ...modelData,
                  id: Date.now().toString(),
                  createdAt: new Date(),
                  isDefault: models.length === 0
                };
                updatedModels = [...models, newModel];
                setModels(updatedModels);
                showNotification('success', '模型配置已添加');
              }
              
              // 同步到数据库
              syncModelsToDatabase(updatedModels);
              setShowAddModal(false);
            }}
            onClose={() => setShowAddModal(false)}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface ModelConfigModalProps {
  model: ModelConfig | null;
  onSave: (model: Omit<ModelConfig, 'id' | 'createdAt' | 'isDefault'>) => void;
  onClose: () => void;
  loading: boolean;
}

const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  model,
  onSave,
  onClose,
  loading
}) => {
  // 初始表单数据
  const initialFormData = {
    name: model?.name || '',
    baseUrl: model?.baseUrl || '',
    apiKey: model?.apiKey || '',
    topK: model?.parameters.topK || 50,
    topP: model?.parameters.topP || 1.0,
    temperature: model?.parameters.temperature || 0.8
  };

  const [formData, setFormData] = useState({
    name: model?.name || '',
    baseUrl: model?.baseUrl || '',
    apiKey: model?.apiKey || '',
    topK: model?.parameters.topK || 50,
    topP: model?.parameters.topP || 1.0,
    temperature: model?.parameters.temperature || 0.8
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 重置表单到初始状态
  const handleResetForm = () => {
    setFormData(initialFormData);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.baseUrl.trim() || !formData.apiKey.trim()) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      baseUrl: formData.baseUrl.trim(),
      apiKey: formData.apiKey.trim(),
      parameters: {
        topK: formData.topK,
        topP: formData.topP,
        temperature: formData.temperature
      }
    });
  };

  const isFormValid = 
    formData.name.trim().length > 0 &&
    formData.baseUrl.trim().length > 0 &&
    formData.apiKey.trim().length > 0;

  // 检查表单是否有变化
  const hasChanges = 
    formData.name !== initialFormData.name ||
    formData.baseUrl !== initialFormData.baseUrl ||
    formData.apiKey !== initialFormData.apiKey ||
    formData.topK !== initialFormData.topK ||
    formData.topP !== initialFormData.topP ||
    formData.temperature !== initialFormData.temperature;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{
        zIndex: 100002,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700"
        style={{
          maxHeight: '80vh',
          zIndex: 100003,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header - 固定不滚动 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {model ? '编辑模型配置' : '添加新模型'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - 可滚动区域 */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6 model-config-modal-content"
          style={{
            scrollBehavior: 'smooth',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
          }}
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                模型名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="例如：GPT-4 Custom"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base URL *
              </label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Model Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">模型参数</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top-K
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.topK}
                  onChange={(e) => handleInputChange('topK', parseInt(e.target.value) || 50)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  限制候选词汇数量 (1-100)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top-P
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.topP}
                  onChange={(e) => handleInputChange('topP', parseFloat(e.target.value) || 1.0)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  核采样概率 (0.0-1.0)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0.8)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  输出随机性 (0.0-2.0)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - 固定不滚动 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleResetForm}
            disabled={!hasChanges || loading}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={16} />
            <span>重置</span>
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
            disabled={!isFormValid || !hasChanges || loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              !isFormValid || !hasChanges || loading
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{loading ? '保存中...' : '保存配置'}</span>
          </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModelConfigSection;