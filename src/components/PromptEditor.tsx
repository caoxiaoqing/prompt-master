import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Settings,
  History,
  Plus,
  Zap,
  FileText,
  MessageSquare,
  Copy,
  Check,
  Clock,
  User,
  Star,
  Tag,
  BarChart3,
  X,
  ChevronRight,
  GitBranch,
  Edit3,
  Bot,
  AlertCircle,
  Info,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useTaskPersistence } from '../hooks/useTaskPersistence';
import { TaskService, ModelParams } from '../lib/taskService';
import { mockModels } from '../utils/mockData';
import { PromptVersion, ChatMessage } from '../types';
import ChatInterface from './ChatInterface';
import ModelSettingsModal from './ModelSettingsModal';
import { format } from 'date-fns';

const PromptEditor: React.FC = () => {
  const { state, dispatch } = useApp();
  const { user, userInfo } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [currentChatHistory, setCurrentChatHistory] = useState<ChatMessage[]>([]);
  const [currentLoadedVersion, setCurrentLoadedVersion] = useState<PromptVersion | null>(null);

  // 获取当前任务的模型参数
  const getCurrentModelParams = (): ModelParams => {
    const customModel = state.selectedCustomModel;
    return TaskService.getDefaultModelParams(customModel);
  };

  // 使用任务持久化 hook
  const { syncModelParams, createTask, forceSyncAll } = useTaskPersistence({
    taskId: state.currentTask ? parseInt(state.currentTask.id) : null,
    systemPrompt: prompt,
    chatHistory: currentChatHistory,
    modelParams: getCurrentModelParams(),
    onModelParamsUpdate: (params) => {
      // 更新状态栏显示
      console.log('模型参数已更新:', params);
    }
  });

  // 当选择新任务时，更新编辑器内容
  useEffect(() => {
    if (state.currentTask) {
      console.log('🔄 切换到新任务:', {
        taskId: state.currentTask.id,
        taskName: state.currentTask.name,
        createdInDB: state.currentTask.createdInDB
      });
      
      // 关键修复：检查任务是否有记录的加载版本
      const loadedVersionId = state.currentTask.currentLoadedVersionId;
      const versions = state.currentTask.versions || [];
      const loadedVersion = loadedVersionId ? versions.find(v => v.id === loadedVersionId) : null;

      if (loadedVersion) {
        // 如果有记录的加载版本，恢复该版本的状态
        console.log('恢复任务的历史版本状态:', loadedVersion.name);
        setPrompt(loadedVersion.content || '');
        setTemperature(loadedVersion.temperature || 0.7);
        setMaxTokens(loadedVersion.maxTokens || 1000);
        setCurrentChatHistory(loadedVersion.chatHistory || []);
        setCurrentLoadedVersion(loadedVersion);
        
        // 更新模型选择
        if (loadedVersion.model) {
          dispatch({ type: 'SET_SELECTED_MODEL', payload: loadedVersion.model });
        }
      } else {
        // 如果没有记录的加载版本，使用任务的当前状态
        setPrompt(state.currentTask.content || '');
        setTemperature(state.currentTask.temperature || 0.7);
        setMaxTokens(state.currentTask.maxTokens || 1000);
        setCurrentChatHistory(state.currentTask.currentChatHistory || []);
        setCurrentLoadedVersion(null);
        
        // 🔄 检测到新任务，准备创建数据库记录
        if (!state.currentTask.createdInDB && userInfo?.custom_models && userInfo.custom_models.length > 0) {
          console.log('🔄 检测到新任务，准备创建数据库记录...', {
            taskId: state.currentTask.id,
            taskName: state.currentTask.name,
            hasUser: !!user
          });
          
          // 获取默认模型参数
          const defaultModel = userInfo.custom_models.find((model: any) => model.isDefault) || userInfo.custom_models[0];
          if (defaultModel && user) {
            const defaultModelParams = TaskService.getDefaultModelParams(defaultModel);
            
            // 异步创建数据库记录
            createTask(
              parseInt(state.currentTask.id),
              state.currentTask.name,
              state.folders.find(f => f.id === state.currentTask.folderId)?.name || '默认文件夹',
              defaultModelParams
            ).then(() => {
              console.log('✅ 任务数据库记录创建成功，更新本地状态');
              // 更新任务状态，标记为已在数据库中创建
              const updatedTask = {
                ...state.currentTask!,
                createdInDB: true
              };
              dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
            }).catch((error) => {
              console.error('❌ 创建任务数据库记录失败:', error);
              // 不阻断用户操作，只记录错误
            });
          }
        }

        // 如果是新任务且用户已登录，创建数据库记录
        if (false && user && state.currentTask && !state.currentTask.createdInDB) {
          console.log('🔄 检测到新任务，准备创建数据库记录...', {
            taskId: state.currentTask.id,
            taskName: state.currentTask.name,
            hasUser: !!user
          });
          
          const taskId = parseInt(state.currentTask.id);
          
          // 检查 taskId 是否有效
          if (isNaN(taskId) || taskId <= 0) {
            console.error('❌ 无效的 taskId:', state.currentTask.id);
            return;
          }
          
          const folderName = state.folders.find(f => f.id === state.currentTask?.folderId)?.name || '默认文件夹';
          const defaultParams = getCurrentModelParams();
          
          // 添加创建状态指示
          console.log('📊 开始创建任务数据库记录，参数检查:', {
            taskId,
            taskName: state.currentTask.name,
            folderName,
            defaultParams,
            userId: user.id,
            userEmail: user.email
          });
          
          createTask(taskId, state.currentTask.name, folderName, defaultParams)
            .then(() => {
              console.log('✅ 任务数据库记录创建成功，更新本地状态');
              // 标记任务已在数据库中创建
              const updatedTask = { ...state.currentTask!, createdInDB: true };
              dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
            })
            .catch(error => {
              console.error('❌ 创建任务数据库记录失败:', {
                error,
                taskId,
                taskName: state.currentTask?.name,
                userId: user.id,
                errorMessage: error.message,
                errorStack: error.stack
              });
              
              // 如果不是重复键错误，可以考虑显示错误提示
              if (!error.message?.includes('duplicate key')) {
                console.warn('⚠️ 任务创建失败，但不影响用户使用:', error.message);
                // 这里可以添加用户友好的错误提示
              } else {
                console.log('ℹ️ 任务可能已存在，标记为已创建');
                // 如果是重复键错误，说明任务已存在，标记为已创建
                const updatedTask = { ...state.currentTask!, createdInDB: true };
                dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
              }
            });
        }
      }
    } else {
      setPrompt('');
      setTemperature(0.7);
      setMaxTokens(1000);
      setCurrentChatHistory([]);
      setCurrentLoadedVersion(null);
    }
  }, [state.currentTask, dispatch, user, userInfo, createTask]);

  // 自动保存当前任务的内容 - 添加防抖和条件检查
  useEffect(() => {
    if (state.currentTask && (
      prompt !== (state.currentTask.content || '') ||
      temperature !== (state.currentTask.temperature || 0.7) ||
      maxTokens !== (state.currentTask.maxTokens || 1000)
    )) {
      const timeoutId = setTimeout(() => {
        const updatedTask = {
          ...state.currentTask,
          content: prompt,
          temperature,
          maxTokens,
          updatedAt: new Date()
        };
        dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      }, 1000); // 1秒后自动保存

      return () => clearTimeout(timeoutId);
    }
  }, [prompt, temperature, maxTokens, state.currentTask?.id, dispatch]);

  // 检查是否有未保存的更改
  const hasUnsavedChanges = () => {
    if (!state.currentTask) return false;
    
    const contentChanged = prompt !== (state.currentTask.content || '');
    const temperatureChanged = temperature !== (state.currentTask.temperature || 0.7);
    const maxTokensChanged = maxTokens !== (state.currentTask.maxTokens || 1000);
    const chatHistoryChanged = JSON.stringify(currentChatHistory) !== JSON.stringify(state.currentTask.currentChatHistory || []);
    
    return contentChanged || temperatureChanged || maxTokensChanged || chatHistoryChanged;
  };

  // 检查是否可以保存版本
  const canSaveVersion = () => {
    if (!state.currentTask) return false;
    if (!prompt.trim()) return false; // 必须有内容
    
    // 如果没有版本，且有内容，则可以保存
    const versions = state.currentTask.versions || [];
    if (versions.length === 0) {
      return true;
    }
    
    // 如果有未保存的更改，则可以保存
    return hasUnsavedChanges();
  };

  const handleSaveVersion = (versionData: {
    name: string;
    notes: string;
    tags: string[];
  }) => {
    if (!state.currentTask) return;
    
    const version: PromptVersion = {
      id: Date.now().toString(),
      name: versionData.name,
      content: prompt,
      timestamp: new Date(),
      model: state.selectedModel,
      temperature,
      maxTokens,
      tags: versionData.tags,
      notes: versionData.notes,
      // 保存当前的聊天历史
      chatHistory: currentChatHistory.length > 0 ? [...currentChatHistory] : undefined
    };
    
    const updatedTask = {
      ...state.currentTask,
      versions: [...(state.currentTask.versions || []), version],
      // 关键修复：保存版本后，将新版本设置为当前加载的版本
      currentLoadedVersionId: version.id,
      updatedAt: new Date()
    };
    
    dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    
    // 立即更新当前加载的版本状态
    setCurrentLoadedVersion(version);
    
    // 关闭保存模态框
    setShowSaveVersionModal(false);
    
    // 显示保存成功的反馈（可选）
    console.log('版本保存成功:', version.name);
  };

  const loadVersion = (version: PromptVersion) => {
    console.log('Loading version:', version.name, version); // 调试日志
    
    // 更新编辑器状态
    setPrompt(version.content || '');
    setTemperature(version.temperature || 0.7);
    setMaxTokens(version.maxTokens || 1000);
    
    // 更新模型选择
    if (version.model) {
      dispatch({ type: 'SET_SELECTED_MODEL', payload: version.model });
    }
    
    // 加载版本的聊天历史
    if (version.chatHistory && version.chatHistory.length > 0) {
      setCurrentChatHistory(version.chatHistory);
    } else {
      setCurrentChatHistory([]);
    }
    
    // 关键修复：设置当前加载的版本
    setCurrentLoadedVersion(version);
    
    // 关键修复：更新任务记录当前加载的版本ID
    if (state.currentTask) {
      const updatedTask = {
        ...state.currentTask,
        content: version.content || '',
        temperature: version.temperature || 0.7,
        maxTokens: version.maxTokens || 1000,
        model: version.model || state.selectedModel,
        currentChatHistory: version.chatHistory || [],
        // 关键修复：记录当前加载的版本ID，这样切换任务后再回来时能恢复这个版本
        currentLoadedVersionId: version.id,
        updatedAt: new Date()
      };
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    }
    
    // 关闭历史版本弹框
    setShowVersionHistory(false);
  };

  const handleModelSettingsChange = (newTemperature: number, newMaxTokens: number) => {
    setTemperature(newTemperature);
    setMaxTokens(newMaxTokens);

    // 立即同步模型参数到数据库
    if (state.currentTask && user) {
      console.log('🔄 模型参数发生变化，准备同步到数据库...', {
        taskId: state.currentTask.id,
        newTemperature,
        newMaxTokens
      });
      
      const updatedParams: ModelParams = {
        ...getCurrentModelParams(),
        temperature: newTemperature,
        max_tokens: newMaxTokens
      };
      
      syncModelParams(updatedParams).catch(error => {
        console.error('同步模型参数失败:', error);
        // 不阻断用户操作，只记录错误
      });
    }
  };

  const copyPromptToClipboard = async () => {
    if (!prompt.trim()) return;
    
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt: ', err);
    }
  };

  const handleChatHistoryChange = (messages: ChatMessage[]) => {
    setCurrentChatHistory(messages);
  };

  const getQualityColor = (quality?: number) => {
    if (!quality) return 'text-gray-400';
    if (quality >= 8.5) return 'text-green-600 dark:text-green-400';
    if (quality >= 7.0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getQualityIcon = (quality?: number) => {
    if (!quality) return null;
    return <BarChart3 size={12} className={getQualityColor(quality)} />;
  };

  // 获取当前版本信息 - 优先显示加载的版本，其次是最新保存的版本
  const getCurrentVersionInfo = () => {
    if (!state.currentTask) return null;

    const versions = state.currentTask.versions || [];
    const hasChanges = hasUnsavedChanges();

    // 如果有加载的版本，优先显示
    if (currentLoadedVersion) {
      if (hasChanges) {
        return {
          type: 'loaded-version-modified',
          version: currentLoadedVersion,
          message: `基于版本: ${currentLoadedVersion.name} (已修改)`,
          icon: Edit3,
          color: 'text-blue-600 dark:text-blue-400'
        };
      } else {
        return {
          type: 'loaded-version',
          version: currentLoadedVersion,
          message: `当前版本: ${currentLoadedVersion.name}`,
          icon: CheckCircle,
          color: 'text-green-600 dark:text-green-400'
        };
      }
    }

    // 如果没有加载特定版本，显示常规状态
    if (versions.length === 0) {
      return {
        type: 'no-versions',
        message: '尚未保存任何版本',
        icon: AlertCircle,
        color: 'text-amber-600 dark:text-amber-400'
      };
    }

    if (hasChanges) {
      return {
        type: 'unsaved-changes',
        message: '有未保存的修改',
        icon: Edit3,
        color: 'text-blue-600 dark:text-blue-400'
      };
    }

    // 显示最新版本
    const latestVersion = versions[versions.length - 1];
    return {
      type: 'latest-version',
      version: latestVersion,
      message: `最新版本: ${latestVersion.name}`,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400'
    };
  };

  // 获取保存按钮的状态和文本
  const getSaveButtonState = () => {
    if (!state.currentTask) {
      return {
        disabled: true,
        text: '保存版本',
        tooltip: '请先选择一个任务'
      };
    }

    if (!prompt.trim()) {
      return {
        disabled: true,
        text: '保存版本',
        tooltip: '请先输入 System Prompt 内容'
      };
    }

    const versions = state.currentTask.versions || [];
    const hasChanges = hasUnsavedChanges();

    if (versions.length === 0) {
      return {
        disabled: false,
        text: '保存版本',
        tooltip: '保存第一个版本'
      };
    }

    if (hasChanges) {
      return {
        disabled: false,
        text: '保存版本',
        tooltip: currentLoadedVersion 
          ? `基于 "${currentLoadedVersion.name}" 保存新版本`
          : '保存当前修改为新版本'
      };
    }

    return {
      disabled: true,
      text: '保存版本',
      tooltip: '当前没有需要保存的更改'
    };
  };

  if (!state.currentTask) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold mb-2">选择或创建一个任务</h2>
          <p className="text-gray-500 mb-4">从左侧文件夹中选择一个任务开始编辑，或创建一个新任务</p>
        </div>
      </div>
    );
  }

  const versionInfo = getCurrentVersionInfo();
  const saveButtonState = getSaveButtonState();

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold">{state.currentTask.name}</h2>
              
              {/* 版本信息显示 - 实时更新，优先显示加载的版本 */}
              {versionInfo && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <versionInfo.icon size={14} className={versionInfo.color} />
                  <span className={`text-sm font-medium ${versionInfo.color}`}>
                    {versionInfo.message}
                  </span>
                  
                  {/* 显示版本详细信息 */}
                  {versionInfo.version && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500 border-l border-gray-300 dark:border-gray-600 pl-2 ml-2">
                      <span>{format(versionInfo.version.timestamp, 'MM/dd HH:mm')}</span>
                      {versionInfo.version.metrics && (
                        <div className="flex items-center space-x-1">
                          <BarChart3 size={10} className={getQualityColor(versionInfo.version.metrics.quality)} />
                          <span className={getQualityColor(versionInfo.version.metrics.quality)}>
                            {versionInfo.version.metrics.quality.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {versionInfo.version.tags && versionInfo.version.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Tag size={10} />
                          <span>{versionInfo.version.tags[0]}</span>
                          {versionInfo.version.tags.length > 1 && (
                            <span>+{versionInfo.version.tags.length - 1}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 不同状态的提示信息 */}
                  {versionInfo.type === 'loaded-version-modified' && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 border-l border-gray-300 dark:border-gray-600 pl-2 ml-2">
                      点击"保存版本"创建新版本
                    </div>
                  )}
                  
                  {versionInfo.type === 'unsaved-changes' && (
                    <div className="text-xs text-gray-500 border-l border-gray-300 dark:border-gray-600 pl-2 ml-2">
                      点击"保存版本"来保存当前修改
                    </div>
                  )}
                  
                  {versionInfo.type === 'no-versions' && (
                    <div className="text-xs text-gray-500 border-l border-gray-300 dark:border-gray-600 pl-2 ml-2">
                      创建第一个版本来开始版本管理
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {state.currentTask.versions && state.currentTask.versions.length > 0 && (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <History size={16} />
                <span>历史版本 ({state.currentTask.versions.length})</span>
              </button>
            )}
            
            {/* 保存版本按钮 - 修复工具提示被遮挡的问题 */}
            <div className="relative group">
              <button
                onClick={() => setShowSaveVersionModal(true)}
                disabled={saveButtonState.disabled}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  saveButtonState.disabled
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={saveButtonState.tooltip}
              >
                <Save size={16} />
                <span>{saveButtonState.text}</span>
              </button>
              
              {/* 工具提示 - 修复 z-index 层级问题 */}
              {saveButtonState.disabled && (
                <div 
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                  style={{
                    // 关键修复：使用极高的 z-index 确保工具提示在所有元素之上
                    zIndex: 99999,
                    // 确保工具提示不会被其他元素遮挡
                    position: 'absolute',
                    // 防止工具提示影响其他元素的布局
                    contain: 'layout'
                  }}
                >
                  {saveButtonState.tooltip}
                  <div 
                    className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"
                    style={{
                      // 确保箭头也有正确的层级
                      zIndex: 99999
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex min-h-0">
        {/* System Prompt Editor */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center space-x-2">
                <Zap size={16} className="text-purple-600 dark:text-purple-400" />
                <span>System Prompt</span>
              </h3>
              <div className="flex items-center space-x-3">
                <div className="text-xs text-gray-500">
                  {Math.ceil(prompt.length / 4)} tokens (估算)
                </div>
                <button
                  onClick={copyPromptToClipboard}
                  disabled={!prompt.trim()}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="复制System Prompt"
                >
                  {promptCopied ? (
                    <>
                      <Check size={12} className="text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">已复制!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="在这里输入你的system prompt...

例如：
You are a helpful AI assistant. Please provide clear, accurate, and helpful responses to user questions. Always be polite and professional."
            className="flex-1 p-4 bg-white dark:bg-gray-900 resize-none focus:outline-none text-sm leading-relaxed"
          />
        </div>

        {/* Chat Interface */}
        <ChatInterface 
          systemPrompt={prompt}
          onSystemPromptChange={setPrompt}
          temperature={temperature}
          maxTokens={maxTokens}
          onModelSettingsChange={handleModelSettingsChange}
          onChatHistoryChange={handleChatHistoryChange}
        />
      </div>

      {/* Save Version Modal */}
      <AnimatePresence>
        {showSaveVersionModal && (
          <SaveVersionModal
            currentVersionCount={(state.currentTask.versions || []).length}
            currentChatHistory={currentChatHistory}
            baseVersionName={currentLoadedVersion ? `基于 ${currentLoadedVersion.name}` : undefined}
            onSave={handleSaveVersion}
            onClose={() => setShowSaveVersionModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Version History Modal */}
      <AnimatePresence>
        {showVersionHistory && (
          <VersionHistoryModal
            versions={state.currentTask.versions || []}
            currentLoadedVersion={currentLoadedVersion}
            onClose={() => setShowVersionHistory(false)}
            onSelectVersion={loadVersion}
          />
        )}
      </AnimatePresence>

      {/* Model Settings Modal */}
      <AnimatePresence>
        {showModelSettings && (
          <ModelSettingsModal
            temperature={temperature}
            maxTokens={maxTokens}
            selectedModel={state.selectedModel}
            onClose={() => setShowModelSettings(false)}
            onSave={handleModelSettingsChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromptEditor;