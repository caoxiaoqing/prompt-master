import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity,
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
  AlertCircle,
  Loader2,
  Check,
  AlertTriangle, 
  RotateCcw
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserInfo, authService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
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
  const { refreshUserInfo } = useAuth();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string, success: boolean, message: string } | null>(null);

  // Load models from userInfo on component mount
  useEffect(() => {
    if (userInfo) {
      // 从 userInfo 中加载自定义模型配置
      const savedModels: ModelConfig[] = (userInfo.custom_models || []).map((model: any) => ({
        id: model.id,
        name: model.name,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
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
    const modelToDelete = models.find(m => m.id === modelId);
    if (!modelToDelete) {
      showNotification('error', '要删除的模型不存在');
      return;
    }
    
    if (!confirm(`确定要删除模型 "${modelToDelete.name}" 吗？此操作不可撤销。`)) return;
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('🗑️ 开始删除模型:', { modelId, modelName: modelToDelete.name });
      
      // 调用数据库删除操作
      const { userInfo: updatedUserInfo } = await authService.deleteCustomModel(user.id, modelId);
      
      console.log('✅ 数据库删除成功，更新本地状态');
      
      // 关键修复：确保本地状态与数据库状态完全同步
      if (updatedUserInfo) {
        console.log('📊 从数据库获取的最新模型数据:', updatedUserInfo.custom_models);
        
        const updatedModels: ModelConfig[] = updatedUserInfo.custom_models.map((model: any) => ({
          id: model.id,
          name: model.name,
          baseUrl: model.baseUrl,
          apiKey: model.apiKey,
          isDefault: model.isDefault || false,
          createdAt: new Date(model.createdAt)
        }));
        
        console.log('🔄 更新本地模型状态:', {
          before: models.length,
          after: updatedModels.length,
          deletedModel: modelToDelete.name
        });
        
        setModels(updatedModels);
      } else {
        console.log('⚠️ 数据库返回空数据，清空本地状态');
        setModels([]);
      }
      
      // 在后台静默刷新用户信息，不影响当前页面
      setTimeout(() => {
        console.log('🔄 后台刷新用户信息');
        refreshUserInfo();
      }, 100);
      
      showNotification('success', `模型 "${modelToDelete.name}" 已删除`);
      console.log('✅ 模型删除完成');
    } catch (error) {
      console.error('Delete model error:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '删除失败，请稍后重试';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      showNotification('error', errorMessage);
      
      // 删除失败时，确保本地状态与实际状态一致
      console.log('❌ 删除失败，保持本地状态不变');
    } finally {
      setLoading(false);
    }
  };

  // 测试模型连接
  const handleTestConnection = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) {
      showNotification('error', '要测试的模型不存在');
      return;
    }
    
    setTestingModel(modelId);
    setTestResult(null);
    
    try {
      console.log('🧪 开始测试模型连接:', { modelName: model.name, baseUrl: model.baseUrl });
      
      // 动态导入 OpenAI
      const { default: OpenAI } = await import('openai');
      
      try {
        // 创建 OpenAI 客户端
        const openai = new OpenAI({
          baseURL: model.baseUrl,
          apiKey: model.apiKey,
          dangerouslyAllowBrowser: true // 允许在浏览器中使用 API 密钥
        });
        
        // 发送简单的测试请求
        const completion = await openai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello, this is a connection test.' }
          ],
          model: model.name,
          max_tokens: 10
        });
        
        console.log('✅ 模型连接测试成功:', completion.choices[0]?.message?.content);
        
        setTestResult({
          id: modelId,
          success: true,
          message: '连接成功！API 响应正常。'
        });
        
        showNotification('success', `模型 "${model.name}" 连接测试成功`);
      } catch (apiError) {
        console.error('❌ API 调用失败:', apiError);
        
        let errorMessage = '连接失败，请检查配置';
        if (apiError instanceof Error) {
          if (apiError.message.includes('API key')) {
            errorMessage = 'API 密钥无效';
          } else if (apiError.message.includes('timeout') || apiError.message.includes('ETIMEDOUT')) {
            errorMessage = '请求超时，请检查网络连接';
          } else if (apiError.message.includes('network') || apiError.message.includes('fetch')) {
            errorMessage = '网络错误，请检查 API 端点';
          } else if (apiError.message.includes('404')) {
            errorMessage = 'API 端点不存在，请检查 URL';
          } else if (apiError.message.includes('401')) {
            errorMessage = '认证失败，请检查 API 密钥';
          } else {
            errorMessage = `错误: ${apiError.message.substring(0, 50)}${apiError.message.length > 50 ? '...' : ''}`;
          }
        }
        
        setTestResult({
          id: modelId,
          success: false,
          message: errorMessage
        });
        
        showNotification('error', `模型 "${model.name}" 连接测试失败: ${errorMessage}`);
      }
      
    } catch (error) {
      console.error('❌ 导入 OpenAI 模块失败:', error);
      
      let errorMessage = '测试失败: 无法加载 OpenAI 模块';
      if (error instanceof Error) {
        errorMessage = `模块加载错误: ${error.message}`;
      }
      
      setTestResult({
        id: modelId,
        success: false,
        message: errorMessage
      });
      
      showNotification('error', `模型 "${model.name}" 连接测试失败: ${errorMessage}`);
    } finally {
      setTestingModel(null);
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
      
      // 在后台静默刷新用户信息，不影响当前页面
      setTimeout(() => {
        refreshUserInfo();
      }, 100);
      
      showNotification('success', '默认模型设置成功');
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
  const handleSaveModel = async (modelData: { name: string; baseUrl: string; apiKey: string }) => {
    if (!user) return;
    
    
    console.log('🔄 开始保存新模型:', {
      name: modelData.name,
      baseUrl: modelData.baseUrl,
      hasApiKey: !!modelData.apiKey,
      parameters: modelData.parameters
    });

    try {
      // 调用数据库添加操作前进行基本验证
      if (!modelData.name.trim() || !modelData.baseUrl.trim() || !modelData.apiKey.trim()) {
        throw new Error('请填写所有必填字段');
      }
      
      console.log('📝 调用数据库添加操作...');
      
      // 调用数据库添加操作
      const result = await authService.addCustomModel(user.id, {
        name: modelData.name,
        baseUrl: modelData.baseUrl,
        apiKey: modelData.apiKey
      });
      
      const { model: newModel } = result;
      console.log('✅ 数据库保存成功:', newModel);
      
      // 更新本地状态
      const newModelConfig: ModelConfig = {
        id: newModel.id,
        name: newModel.name,
        baseUrl: newModel.baseUrl,
        apiKey: newModel.apiKey,
        isDefault: newModel.isDefault,
        createdAt: new Date(newModel.createdAt)
      };
      
      setModels(prev => [...prev, newModelConfig]);
      console.log('✅ 本地状态更新成功');
      
      // 在后台静默刷新用户信息，不影响当前页面
      setTimeout(() => {
        console.log('🔄 后台刷新用户信息');
        refreshUserInfo();
      }, 100);
      
      showNotification('success', '模型配置已添加');
      
      // 成功后返回 true，表示可以关闭模态框
      return true;
    } catch (error) {
      console.error('Save model error:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '保存失败，请稍后重试';
      if (error instanceof Error) {
        if (error.message.includes('模型已存在')) {
          errorMessage = error.message;
        } else if (error.message.includes('Database connection unavailable') || error.message.includes('网络')) {
          errorMessage = '网络连接异常：无法连接到服务器。请检查您的网络连接状态，确保网络稳定后重试。';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = '操作超时：服务器响应时间过长。这可能是由于网络延迟或服务器负载过高导致的。请检查网络连接或稍后重试。';
        } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = '网络请求失败：无法与服务器通信。请检查网络连接，确认服务器状态正常后重试。';
        } else if (error.message.includes('AbortError')) {
          errorMessage = '请求被中断：操作被用户或系统取消。如需继续，请重新尝试操作。';
        } else {
          errorMessage = error.message;
        }
      }
      
      showNotification('error', errorMessage);
      
      // 错误时返回 false，阻止模态框关闭
      return false;
    }
  };

  // 处理更新现有模型
  const handleUpdateModel = async (modelId: string, modelData: { name: string; baseUrl: string; apiKey: string }) => {
    if (!user) return;
    
    console.log('🔄 开始更新模型:', {
      modelId,
      name: modelData.name,
      baseUrl: modelData.baseUrl,
      hasApiKey: !!modelData.apiKey,
      parameters: modelData.parameters
    });

    try {
      // 调用数据库更新操作前进行基本验证
      if (!modelData.name.trim() || !modelData.baseUrl.trim() || !modelData.apiKey.trim()) {
        throw new Error('请填写所有必填字段');
      }
      
      console.log('📝 调用数据库更新操作...');
      
      // 调用数据库更新操作
      await authService.updateCustomModel(user.id, modelId, {
        name: modelData.name,
        baseUrl: modelData.baseUrl,
        apiKey: modelData.apiKey
      });
      
      console.log('✅ 数据库更新成功');
      
      // 更新本地状态
      setModels(prev => prev.map(m => 
        m.id === modelId 
          ? {
              ...m,
              name: modelData.name,
              baseUrl: modelData.baseUrl,
              apiKey: modelData.apiKey
            }
          : m
      ));
      
      console.log('✅ 本地状态更新成功');
      
      // 在后台静默刷新用户信息，不影响当前页面
      setTimeout(() => {
        console.log('🔄 后台刷新用户信息');
        refreshUserInfo();
      }, 100);
      
      showNotification('success', '模型配置已更新');
      
      // 成功后返回 true，表示可以关闭模态框
      return true;
    } catch (error) {
      console.error('Update model error:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '更新失败，请稍后重试';
      if (error instanceof Error) {
        if (error.message.includes('模型已存在')) {
          errorMessage = error.message;
        } else if (error.message.includes('Database connection unavailable') || error.message.includes('网络')) {
          errorMessage = '网络连接异常：无法连接到服务器。请检查您的网络连接状态，确保网络稳定后重试。';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = '操作超时：服务器响应时间过长。这可能是由于网络延迟或服务器负载过高导致的。请检查网络连接或稍后重试。';
        } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = '网络请求失败：无法与服务器通信。请检查网络连接，确认服务器状态正常后重试。';
        } else if (error.message.includes('AbortError')) {
          errorMessage = '请求被中断：操作被用户或系统取消。如需继续，请重新尝试操作。';
        } else {
          errorMessage = error.message;
        }
      }
      
      showNotification('error', errorMessage);
      
      // 错误时返回 false，阻止模态框关闭
      return false;
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
                    onClick={() => handleTestConnection(model.id)}
                    disabled={testingModel === model.id}
                    className={`p-2 rounded-lg transition-colors ${
                      testingModel === model.id
                        ? 'text-blue-600 dark:text-blue-400 cursor-wait'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                    title="测试连接"
                  >
                    {testingModel === model.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Activity size={16} />
                    )}
                  </button>
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

              {/* 测试结果 */}
              {testResult && testResult.id === model.id && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  testResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API 端点
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

            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Model Modal */}
      <AnimatePresence>
        {showAddModal && (
          <ModelConfigModal
            model={editingModel}
            onSave={async (modelData, setModalLoading, onSuccess) => {
              console.log('📝 模态框保存操作开始:', modelData.name);
              
              try {
                setModalLoading(true);
                
                let success = false;
                
                if (editingModel) {
                  // 更新现有模型
                  success = await handleUpdateModel(editingModel.id, modelData);
                } else {
                  // 添加新模型
                  success = await handleSaveModel(modelData);
                }
                
                if (success) {
                  // 只有在保存成功后才关闭模态框
                  console.log('✅ 保存成功，关闭模态框');
                  onSuccess();
                } else {
                  console.log('❌ 保存失败，保持模态框打开');
                }
              } catch (error) {
                console.error('❌ 保存失败:', error);
                // 错误已经在具体的处理函数中处理了
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
  onSave: (
    model: { name: string; baseUrl: string; apiKey: string }, 
    setLoading: (loading: boolean) => void,
    onSuccess: () => void
  ) => void;
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
    apiKey: model?.apiKey || ''
  };

  const [formData, setFormData] = useState({
    name: model?.name || '',
    baseUrl: model?.baseUrl || '',
    apiKey: model?.apiKey || ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  
  // 表单验证错误状态
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    baseUrl: '',
    apiKey: ''
  });

  // 实时验证函数
  const validateField = (field: string, value: string | number): string => {
    switch (field) {
      case 'name':
        const nameStr = value as string;
        if (!nameStr.trim()) {
          return '模型名称不能为空';
        }
        if (nameStr.trim().length < 2) {
          return '模型名称至少需要2个字符';
        }
        if (nameStr.trim().length > 50) {
          return '模型名称不能超过50个字符';
        }
        if (!/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_.]+$/.test(nameStr.trim())) {
          return '模型名称只能包含字母、数字、中文、空格、连字符、下划线和点';
        }
        return '';
        
      case 'baseUrl':
        const urlStr = value as string;
        if (!urlStr.trim()) {
          return 'Base URL 不能为空';
        }
        try {
          const url = new URL(urlStr.trim());
          if (!['http:', 'https:'].includes(url.protocol)) {
            return 'Base URL 必须使用 HTTP 或 HTTPS 协议';
          }
          if (!url.hostname) {
            return 'Base URL 必须包含有效的主机名';
          }
          return '';
        } catch {
          return '请输入有效的 URL 格式（如：https://api.example.com/v1）';
        }
        
      case 'apiKey':
        const keyStr = value as string;
        if (!keyStr.trim()) {
          return 'API Key 不能为空';
        }
        if (keyStr.trim().length < 10) {
          return 'API Key 长度至少需要10个字符';
        }
        if (keyStr.trim().length > 200) {
          return 'API Key 长度不能超过200个字符';
        }
        if (!/^[a-zA-Z0-9\-_.]+$/.test(keyStr.trim())) {
          return 'API Key 只能包含字母、数字、连字符、下划线和点';
        }
        return '';
        
      default:
        return '';
    }
  };
  const handleInputChange = (field: string, value: string | number) => {
    if (modalLoading) return; // 防止在保存过程中修改表单
    
    // 更新表单数据
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 实时验证
    const error = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  };

  // 重置表单到初始状态
  const handleResetForm = () => {
    setFormData(initialFormData);
    setValidationErrors({
      name: '',
      baseUrl: '',
      apiKey: ''
    });
  };

  // 验证整个表单
  const validateForm = (): boolean => {
    const errors = {
      name: validateField('name', formData.name),
      baseUrl: validateField('baseUrl', formData.baseUrl),
      apiKey: validateField('apiKey', formData.apiKey)
    };
    
    setValidationErrors(errors);
    
    // 检查是否有任何错误
    return !Object.values(errors).some(error => error !== '');
  };
  const handleSave = () => {
    // 防止重复提交
    if (modalLoading) return;
    
    // 完整验证表单
    if (!validateForm()) {
      console.warn('⚠️ 表单验证失败');
      return;
    }


    console.log('📝 开始保存模型配置:', formData.name);
    
    onSave({
      name: formData.name.trim(),
      baseUrl: formData.baseUrl.trim(),
      apiKey: formData.apiKey.trim()
    }, setModalLoading, () => {
      // 成功回调：关闭模态框
      onClose();
    });
  };

  // 当模态框关闭时重置状态
  React.useEffect(() => {
    return () => {
      // 组件卸载时重置状态
      setShowApiKey(false);
      setFormData(initialFormData);
      setValidationErrors({
        name: '',
        baseUrl: '',
        apiKey: ''
      });
    };
  }, []);

  // 检查表单是否有效（没有验证错误且所有必填字段都已填写）
  const isFormValid = 
    !Object.values(validationErrors).some(error => error !== '') &&
    formData.name.trim().length > 0 &&
    formData.baseUrl.trim().length > 0 &&
    formData.apiKey.trim().length > 0;

  // 检查表单是否有变化
  const hasChanges = 
    formData.name !== initialFormData.name ||
    formData.baseUrl !== initialFormData.baseUrl ||
    formData.apiKey !== initialFormData.apiKey;

  // 对于编辑模式，还需要检查是否有实际变化
  const canSave = isFormValid && (model ? hasChanges : true);

  // 获取字段的样式类名（根据验证状态）
  const getFieldClassName = (field: string, baseClassName: string): string => {
    const hasError = validationErrors[field as keyof typeof validationErrors];
    if (hasError) {
      return `${baseClassName} border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500`;
    }
    return `${baseClassName} border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent`;
  };
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
                className={getFieldClassName('name', 'w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2')}
                disabled={modalLoading}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertTriangle size={12} />
                  <span>{validationErrors.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base URL *
              </label>
              <div className="space-y-1">
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className={getFieldClassName('baseUrl', 'w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2')}
                  disabled={modalLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  例如: https://api.openai.com/v1 或您的自定义 API 端点
                </p>
              </div>
              {validationErrors.baseUrl && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertTriangle size={12} />
                  <span>{validationErrors.baseUrl}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key *
              </label>
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className={getFieldClassName('apiKey', 'w-full px-4 py-3 pr-12 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2')}
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  您的 API 密钥，通常以 "sk-" 开头
                </p>
              </div>
              {validationErrors.apiKey && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertTriangle size={12} />
                  <span>{validationErrors.apiKey}</span>
                </p>
              )}
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
            disabled={!canSave || modalLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              (!canSave || modalLoading)
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