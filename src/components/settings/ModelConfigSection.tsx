import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
import { UserInfo, authService } from '../../lib/supabase';

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
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});

  // Load models from userInfo on component mount
  useEffect(() => {
    if (userInfo) {
      // 从 userInfo 中加载自定义模型配置
      const savedModels: ModelConfig[] = (userInfo.custom_models || []).map((model: any) => ({
        id: model.id,
        name: model.name,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        parameters: {
          topK: model.topK,
          topP: model.topP,
          temperature: model.temperature
        },
        isDefault: model.isDefault || false,
        createdAt: new Date(model.createdAt)
      }));
      setModels(savedModels);
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

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('确定要删除这个模型配置吗？')) return;
    if (!user) return;

    try {
      setLoading(true);
      
      // 调用数据库删除操作
      const { userInfo: updatedUserInfo } = await authService.deleteCustomModel(user.id, modelId);
      
      // 更新本地状态
      const updatedModels = models.filter(m => m.id !== modelId);
      setModels(updatedModels);
      
      showNotification('success', '模型配置已删除');
      
      // 如果删除的是默认模型且还有其他模型，更新本地状态
      if (updatedModels.length > 0) {
        const newDefaultModel = updatedModels.find(m => m.isDefault);
        if (!newDefaultModel && updatedModels.length > 0) {
          // 如果没有默认模型了，设置第一个为默认
          setModels(prev => prev.map((m, index) => ({
            ...m,
            isDefault: index === 0
          })));
        }
      }
    } catch (error) {
      console.error('Delete model error:', error);
      showNotification('error', error instanceof Error ? error.message : '删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (modelId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 调用数据库设置默认模型操作
      await authService.setDefaultModel(user.id, modelId);
      
      // 更新本地状态
      const updatedModels = models.map(m => ({
        ...m,
        isDefault: m.id === modelId
      }));
      setModels(updatedModels);
      
      showNotification('success', '默认模型已更新');
    } catch (error) {
      console.error('Set default model error:', error);
      showNotification('error', error instanceof Error ? error.message : '设置失败，请稍后重试');
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

  // 处理保存新模型
  const handleSaveModel = async (modelData: Omit<ModelConfig, 'id' | 'createdAt' | 'isDefault'>) => {
    if (!user) return;
    
    console.log('🔄 开始保存新模型:', modelData.name);

    try {
      // 调用数据库添加操作前进行基本验证
      if (!modelData.name.trim() || !modelData.baseUrl.trim() || !modelData.apiKey.trim()) {
        throw new Error('请填写所有必填字段');
      }
      
      // 调用数据库添加操作
      const { model: newModel } = await authService.addCustomModel(user.id, {
        name: modelData.name,
        baseUrl: modelData.baseUrl,
        apiKey: modelData.apiKey,
        topK: modelData.parameters.topK,
        topP: modelData.parameters.topP,
        temperature: modelData.parameters.temperature
      });
      
      console.log('✅ 数据库保存成功:', newModel);
      
      // 更新本地状态
      const newModelConfig: ModelConfig = {
        id: newModel.id,
        name: newModel.name,
        baseUrl: newModel.baseUrl,
        apiKey: newModel.apiKey,
        parameters: {
          topK: newModel.topK,
          topP: newModel.topP,
          temperature: newModel.temperature
        },
        isDefault: newModel.isDefault,
        createdAt: new Date(newModel.createdAt)
      };
      
      setModels(prev => [...prev, newModelConfig]);
      console.log('✅ 本地状态更新成功');
      showNotification('success', '模型配置已添加');
    } catch (error) {
      console.error('Save model error:', error);
      showNotification('error', error instanceof Error ? error.message : '保存失败，请稍后重试');
      // 错误时不要关闭模态框，让用户可以重试
      throw error; // 重新抛出错误，阻止模态框关闭
    }
  };

  // 处理更新现有模型
  const handleUpdateModel = async (modelId: string, modelData: Omit<ModelConfig, 'id' | 'createdAt' | 'isDefault'>) => {
    if (!user) return;
    
    console.log('🔄 开始更新模型:', modelId, modelData.name);

    try {
      // 调用数据库更新操作前进行基本验证
      if (!modelData.name.trim() || !modelData.baseUrl.trim() || !modelData.apiKey.trim()) {
        throw new Error('请填写所有必填字段');
      }
      
      // 调用数据库更新操作
      await authService.updateCustomModel(user.id, modelId, {
        name: modelData.name,
        baseUrl: modelData.baseUrl,
        apiKey: modelData.apiKey,
        topK: modelData.parameters.topK,
        topP: modelData.parameters.topP,
        temperature: modelData.parameters.temperature
      });
      
      console.log('✅ 数据库更新成功');
      
      // 更新本地状态
      setModels(prev => prev.map(m => 
        m.id === modelId 
          ? {
              ...m,
              name: modelData.name,
              baseUrl: modelData.baseUrl,
              apiKey: modelData.apiKey,
              parameters: modelData.parameters
            }
          : m
      ));
      
      console.log('✅ 本地状态更新成功');
      showNotification('success', '模型配置已更新');
    } catch (error) {
      console.error('Update model error:', error);
      showNotification('error', error instanceof Error ? error.message : '更新失败，请稍后重试');
      // 错误时不要关闭模态框，让用户可以重试
      throw error; // 重新抛出错误，阻止模态框关闭
    }
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
            onSave={async (modelData, setModalLoading) => {
              console.log('📝 模态框保存操作开始:', modelData.name);
              
              try {
                setModalLoading(true);
                
                if (editingModel) {
                  // 更新现有模型
                  await handleUpdateModel(editingModel.id, modelData);
                } else {
                  // 添加新模型
                  await handleSaveModel(modelData);
                }
                
                // 只有在保存成功后才关闭模态框
                console.log('✅ 保存成功，关闭模态框');
                setShowAddModal(false);
                setEditingModel(null);
              } catch (error) {
                console.error('❌ 保存失败:', error);
                // 错误已经在 handleSaveModel 或 handleUpdateModel 中通过 showNotification 处理了
                // 这里不需要额外处理，只需要确保不关闭模态框
              } finally {
                // 关键修复：确保无论成功还是失败都重置加载状态
                setModalLoading(false);
              }
            }}
            onClose={() => {
              console.log('❌ 用户取消操作，关闭模态框');
              setShowAddModal(false);
              setEditingModel(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface ModelConfigModalProps {
  model: ModelConfig | null;
  onSave: (model: Omit<ModelConfig, 'id' | 'createdAt' | 'isDefault'>, setLoading: (loading: boolean) => void) => void;
  onClose: () => void;
}

const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  model,
  onSave,
  onClose
}) => {
  // 模态框内部的加载状态
  const [modalLoading, setModalLoading] = useState(false);
  
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
    if (modalLoading) return; // 防止在保存过程中修改表单
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 重置表单到初始状态
  const handleResetForm = () => {
    setFormData(initialFormData);
  };

  const handleSave = () => {
    // 防止重复提交
    if (modalLoading) return;
    
    // 验证表单
    if (!formData.name.trim() || !formData.baseUrl.trim() || !formData.apiKey.trim()) {
      console.warn('⚠️ 表单验证失败: 缺少必填字段');
      return;
    }

    // 验证 URL 格式
    try {
      new URL(formData.baseUrl);
    } catch {
      console.warn('⚠️ Base URL 格式无效');
      return;
    }

    console.log('📝 开始保存模型配置:', formData.name);
    
    onSave({
      name: formData.name.trim(),
      baseUrl: formData.baseUrl.trim(),
      apiKey: formData.apiKey.trim(),
      parameters: {
        topK: formData.topK,
        topP: formData.topP,
        temperature: formData.temperature
      }
    }, setModalLoading);
  };

  // 当模态框关闭时重置状态
  React.useEffect(() => {
    return () => {
      // 组件卸载时重置状态
      setShowApiKey(false);
      setFormData(initialFormData);
    };
  }, []);

  const isFormValid = 
    formData.name.trim().length > 0 &&
    formData.baseUrl.trim().length > 0 &&
    formData.apiKey.trim().length > 0 &&
    formData.topK > 0 &&
    formData.topP >= 0 && formData.topP <= 1 &&
    formData.temperature >= 0 && formData.temperature <= 2 &&
    !isNaN(formData.topK) && !isNaN(formData.topP) && !isNaN(formData.temperature);

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
            disabled={modalLoading}
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
                disabled={modalLoading}
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
                disabled={modalLoading}
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
                  disabled={modalLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={modalLoading}
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
                  disabled={modalLoading}
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
                  disabled={modalLoading}
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
                  disabled={modalLoading}
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
            disabled={!hasChanges || modalLoading}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={16} />
            <span>重置</span>
          </button>
          
          <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            disabled={modalLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid || modalLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              (!isFormValid || modalLoading)
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {modalLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{modalLoading ? '保存中...' : '保存配置'}</span>
          </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModelConfigSection;