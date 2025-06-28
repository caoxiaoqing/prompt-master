import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Timer,
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  Star, 
  StarOff,
  Loader2,
  Check,
  AlertCircle,
  RotateCcw,
  Cpu,
  Globe,
  Key
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserInfo } from '../../lib/supabase';

interface CustomModel {
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
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [countdown, setCountdown] = useState(0);

  // 初始模型表单数据
  const initialModelForm = {
    name: '',
    baseUrl: '',
    apiKey: '',
    parameters: {
      topK: 50,
      topP: 1.0,
      temperature: 0.8
    }
  };

  const [modelForm, setModelForm] = useState(initialModelForm);

  // 从 userInfo 加载自定义模型
  useEffect(() => {
    if (userInfo?.custom_models) {
      setCustomModels(userInfo.custom_models);
    }
  }, [userInfo]);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('parameters.')) {
      const paramField = field.split('.')[1];
      setModelForm(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [paramField]: value
        }
      }));
    } else {
      setModelForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const resetModelForm = () => {
    setModelForm(initialModelForm);
    setEditingModel(null);
    setSaveState('idle');
  };

  const handleSaveModel = async () => {
    if (!user) return;

    if (!modelForm.name.trim() || !modelForm.baseUrl.trim() || !modelForm.apiKey.trim()) {
      showNotification('error', '请填写所有必填字段');
      return;
    }

    try {
      setLoading(true);
      setSaveState('saving');
      setCountdown(5);
      
      // 启动5秒倒计时
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // 5秒超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          clearInterval(countdownInterval);
          reject(new Error('TIMEOUT'));
        }, 5000);
      });

      let updatedModels: CustomModel[];

      if (editingModel) {
        // 编辑现有模型
        updatedModels = customModels.map(model => 
          model.id === editingModel.id 
            ? {
                ...model,
                name: modelForm.name.trim(),
                baseUrl: modelForm.baseUrl.trim(),
                apiKey: modelForm.apiKey.trim(),
                parameters: modelForm.parameters
              }
            : model
        );
      } else {
        // 添加新模型
        const newModel: CustomModel = {
          id: Date.now().toString(),
          name: modelForm.name.trim(),
          baseUrl: modelForm.baseUrl.trim(),
          apiKey: modelForm.apiKey.trim(),
          parameters: modelForm.parameters,
          isDefault: customModels.length === 0, // 第一个模型设为默认
          createdAt: new Date()
        };
        updatedModels = [...customModels, newModel];
      }

      // 使用 Promise.race 来处理超时
      await Promise.race([
        updateUserInfo({ custom_models: updatedModels }),
        timeoutPromise
      ]);

      // 如果成功，清除倒计时并显示成功状态
      clearInterval(countdownInterval);
      setSaveState('success');
      setCountdown(0);
      setCustomModels(updatedModels);
      resetModelForm();
      setShowAddModal(false);
      showNotification('success', editingModel ? '模型更新成功！' : '模型添加成功！');
      
    } catch (error: any) {
      console.error('Model save error:', error);
      
      if (error.message === 'TIMEOUT') {
        setSaveState('error');
        showNotification('error', '由于网络原因保存失败，请稍后重试');
      } else {
        setSaveState('error');
        showNotification('error', error.message || '操作失败，请稍后重试');
      }
      setCountdown(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('确定要删除这个模型配置吗？')) return;

    try {
      setLoading(true);
      const updatedModels = customModels.filter(model => model.id !== modelId);
      
      // 如果删除的是默认模型，将第一个模型设为默认
      if (updatedModels.length > 0) {
        const deletedModel = customModels.find(m => m.id === modelId);
        if (deletedModel?.isDefault) {
          updatedModels[0].isDefault = true;
        }
      }

      await updateUserInfo({ custom_models: updatedModels });
      setCustomModels(updatedModels);
      showNotification('success', '模型删除成功');
    } catch (error: any) {
      console.error('Model delete error:', error);
      showNotification('error', '删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (modelId: string) => {
    try {
      setLoading(true);
      const updatedModels = customModels.map(model => ({
        ...model,
        isDefault: model.id === modelId
      }));

      await updateUserInfo({ custom_models: updatedModels });
      setCustomModels(updatedModels);
      showNotification('success', '默认模型设置成功');
    } catch (error: any) {
      console.error('Set default model error:', error);
      showNotification('error', '设置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleEditModel = (model: CustomModel) => {
    setModelForm({
      name: model.name,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      parameters: model.parameters
    });
    setEditingModel(model);
    setShowAddModal(true);
  };

  const toggleApiKeyVisibility = (modelId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  const isFormValid = 
    modelForm.name.trim().length > 0 &&
    modelForm.baseUrl.trim().length > 0 &&
    modelForm.apiKey.trim().length > 0;

  // 检查表单是否有变化
  const hasFormChanges = 
    modelForm.name.trim().length > 0 ||
    modelForm.baseUrl.trim().length > 0 ||
    modelForm.apiKey.trim().length > 0 ||
    modelForm.parameters.topK !== 50 ||
    modelForm.parameters.topP !== 1.0 ||
    modelForm.parameters.temperature !== 0.8;

  // 获取保存按钮的状态
  const getSaveButtonContent = () => {
    if (saveState === 'saving') {
      return { text: `保存中... (${countdown}s)`, icon: Timer, disabled: true };
    }
    if (saveState === 'success') return { text: '保存成功', icon: Check, disabled: true };
    if (saveState === 'error') return { text: '保存失败，点击重试', icon: AlertCircle, disabled: false };
    return { text: editingModel ? '更新模型' : '添加模型', icon: Save, disabled: !isFormValid };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI 模型配置</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理您的自定义 AI 模型和参数设置
          </p>
        </div>
        <button
          onClick={() => {
            resetModelForm();
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span>添加模型</span>
        </button>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        {customModels.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Cpu size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无自定义模型
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              添加您的第一个自定义 AI 模型配置
            </p>
            <button
              onClick={() => {
                resetModelForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span>添加模型</span>
            </button>
          </div>
        ) : (
          customModels.map((model) => (
            <div
              key={model.id}
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
                         {React.createElement(getSaveButtonContent().icon, { size: 16 })}
                          默认
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
                      className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                      title="设为默认"
                    >
                      <StarOff size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditModel(model)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    title="编辑"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteModel(model.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
                      {showApiKeys[model.id] 
                        ? model.apiKey 
                        : '•'.repeat(Math.min(model.apiKey.length, 20))
                      }
                    </span>
                    <button
                      onClick={() => toggleApiKeyVisibility(model.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showApiKeys[model.id] ? <EyeOff size={14} /> : <Eye size={14} />}
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
                    <span className="text-gray-500">Top-k:</span>
                    <span className="ml-2 font-mono">{model.parameters.topK}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Top-p:</span>
                    <span className="ml-2 font-mono">{model.parameters.topP}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Temperature:</span>
                    <span className="ml-2 font-mono">{model.parameters.temperature}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Model Modal */}
      <AnimatePresence>
        {showAddModal && (
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
            onClick={() => {
              setShowAddModal(false);
              resetModelForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700"
              style={{
                zIndex: 100003,
                position: 'relative'
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingModel ? '编辑模型' : '添加新模型'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetModelForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {/* 保存状态提示 */}
                {saveState !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mb-4 p-4 rounded-lg border flex items-center space-x-3 ${
                      saveState === 'saving'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        : saveState === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {saveState === 'saving' && <Loader2 size={16} className="animate-spin" />}
                    {saveState === 'success' && <Check size={16} />}
                    {saveState === 'error' && <AlertCircle size={16} />}
                    <span className="text-sm font-medium">{getSaveButtonContent().text}</span>
                  </motion.div>
                )}

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        模型名称 *
                      </label>
                      <input
                        type="text"
                        value={modelForm.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="例如：GPT-4 Custom"
                        disabled={saveState === 'saving'}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Base URL *
                      </label>
                      <input
                        type="url"
                        value={modelForm.baseUrl}
                        onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        disabled={saveState === 'saving'}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={modelForm.apiKey}
                      onChange={(e) => handleInputChange('apiKey', e.target.value)}
                      placeholder="sk-..."
                      disabled={saveState === 'saving'}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Parameters */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      模型参数
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Top-k
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={modelForm.parameters.topK}
                          onChange={(e) => handleInputChange('parameters.topK', parseInt(e.target.value))}
                          disabled={saveState === 'saving'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Top-p
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={modelForm.parameters.topP}
                          onChange={(e) => handleInputChange('parameters.topP', parseFloat(e.target.value))}
                          disabled={saveState === 'saving'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Temperature
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={modelForm.parameters.temperature}
                          onChange={(e) => handleInputChange('parameters.temperature', parseFloat(e.target.value))}
                          disabled={saveState === 'saving'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-8">
                  <button
                    onClick={resetModelForm}
                    disabled={!hasFormChanges || saveState === 'saving'}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw size={16} />
                    <span>取消</span>
                  </button>
                  
                  <button
                    onClick={handleSaveModel}
                    disabled={getSaveButtonContent().disabled}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      getSaveButtonContent().disabled && saveState !== 'error'
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : saveState === 'success'
                        ? 'bg-green-600 text-white'
                        : saveState === 'error'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : saveState === 'saving'
                        ? 'bg-blue-600 text-white cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {saveState === 'saving' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{getSaveButtonContent().text}</span>
                      </>
                    ) : (
                      <>
                        <getSaveButtonContent().icon size={16} />
                        <span>{getSaveButtonContent().text}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ModelConfigSection;