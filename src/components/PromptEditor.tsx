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
      })
      
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
          })
          
          // 获取默认模型参数
          const defaultModel = userInfo.custom_models.find((model: any) => model.isDefault) || userInfo.custom_models[0]
          if (defaultModel && user) {
            const defaultModelParams = TaskService.getDefaultModelParams(defaultModel)
            
            // 异步创建数据库记录
            createTask(
              parseInt(state.currentTask.id),
              state.currentTask.name,
              state.folders.find(f => f.id === state.currentTask.folderId)?.name || '默认文件夹',
              defaultModelParams
            ).then(() => {
              console.log('✅ 任务数据库记录创建成功，更新本地状态')
              // 更新任务状态，标记为已在数据库中创建
              const updatedTask = {
                ...state.currentTask!,
                createdInDB: true
              }
              dispatch({ type: 'UPDATE_TASK', payload: updatedTask })
            }).catch((error) => {
              console.error('❌ 创建任务数据库记录失败:', error)
              // 不阻断用户操作，只记录错误
            })
          }
        }

        // 如果是新任务且用户已登录，创建数据库记录
        if (user && state.currentTask && !state.currentTask.createdInDB) {
          console.log('🔄 检测到新任务，准备创建数据库记录...', {
            taskId: state.currentTask.id,
            taskName: state.currentTask.name,
            hasUser: !!user
          })
          
          const taskId = parseInt(state.currentTask.id);
          const folderName = state.folders.find(f => f.id === state.currentTask?.folderId)?.name || '默认文件夹';
          const defaultParams = getCurrentModelParams();
          
          createTask(taskId, state.currentTask.name, folderName, defaultParams)
            .then(() => {
              console.log('✅ 任务数据库记录创建成功，更新本地状态')
              // 标记任务已在数据库中创建
              const updatedTask = { ...state.currentTask!, createdInDB: true };
              dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
            })
            .catch(error => {
              console.error('创建任务数据库记录失败:', error);
              // 即使创建失败，也不影响用户继续使用
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
      })
      
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

const SaveVersionModal: React.FC<{
  currentVersionCount: number;
  currentChatHistory: ChatMessage[];
  baseVersionName?: string;
  onSave: (data: { name: string; notes: string; tags: string[] }) => void;
  onClose: () => void;
}> = ({ currentVersionCount, currentChatHistory, baseVersionName, onSave, onClose }) => {
  const [versionName, setVersionName] = useState(
    baseVersionName 
      ? `${baseVersionName} - 修改版 ${currentVersionCount + 1}`
      : `Version ${currentVersionCount + 1}`
  );
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (!versionName.trim()) return;
    
    onSave({
      name: versionName.trim(),
      notes: notes.trim(),
      tags
    });
  };

  const quickTags = ['优化', '修复', '重构', '实验', '稳定版', '测试'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
      style={{
        // 确保模态框在最上层
        zIndex: 100000,
        // 确保模态框不会影响页面布局
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // 防止模态框影响页面滚动
        overflow: 'hidden',
        // 确保模态框不会影响其他元素
        contain: 'layout'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col"
        style={{ 
          maxHeight: '90vh',
          // 确保模态框内容也在正确的层级
          zIndex: 100001,
          position: 'relative'
        }}
      >
        {/* Header - 固定不滚动 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <GitBranch size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                保存新版本
              </h2>
              <p className="text-sm text-gray-500">
                {baseVersionName ? `基于现有版本创建新版本` : `为这个版本添加描述信息和标签`}
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

        {/* Content - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Base Version Info */}
            {baseVersionName && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-2">
                  <GitBranch size={16} className="text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    基于现有版本
                  </h4>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  这个新版本将基于已加载的版本创建，包含当前的所有修改。
                </p>
              </div>
            )}

            {/* Chat History Info */}
            {currentChatHistory.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    聊天记录将被保存
                  </h4>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  当前有 {currentChatHistory.length} 条聊天记录将随版本一起保存，
                  包括用户消息和AI回复。加载此版本时将恢复完整的对话历史。
                </p>
              </div>
            )}

            {/* Version Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                版本名称 *
              </label>
              <div className="relative">
                <Edit3 size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="输入版本名称..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">
                建议使用描述性的名称，如 "优化对话逻辑" 或 "添加专业术语支持"
              </p>
            </div>

            {/* Change Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                版本改动说明
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="描述这个版本的主要改动和优化点...

例如：
- 优化了回答的逻辑结构
- 增加了对专业术语的处理
- 改进了多轮对话的连贯性"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500">
                详细的改动说明有助于后续版本管理和回溯
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                版本标签
              </label>
              
              {/* Tag Input */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Tag size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                    placeholder="输入标签..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  添加
                </button>
              </div>

              {/* Quick Tags */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500">快速标签:</p>
                <div className="flex flex-wrap gap-2">
                  {quickTags.map((quickTag) => (
                    <button
                      key={quickTag}
                      onClick={() => {
                        if (!tags.includes(quickTag)) {
                          setTags([...tags, quickTag]);
                        }
                      }}
                      disabled={tags.includes(quickTag)}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {quickTag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">已添加的标签:</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                版本预览
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">名称:</span>
                  <span className="font-medium">{versionName || '未命名版本'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">时间:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                {currentChatHistory.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">聊天记录:</span>
                    <span className="text-blue-600 dark:text-blue-400">{currentChatHistory.length} 条消息</span>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-gray-500">标签:</span>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - 固定不滚动 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="text-sm text-gray-500">
            这将是第 {currentVersionCount + 1} 个版本
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!versionName.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              <span>保存版本</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const VersionHistoryModal: React.FC<{
  versions: PromptVersion[];
  currentLoadedVersion: PromptVersion | null;
  onClose: () => void;
  onSelectVersion: (version: PromptVersion) => void;
}> = ({ versions, currentLoadedVersion, onClose, onSelectVersion }) => {
  const getQualityColor = (quality?: number) => {
    if (!quality) return 'text-gray-400';
    if (quality >= 8.5) return 'text-green-600 dark:text-green-400';
    if (quality >= 7.0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getQualityBadge = (quality?: number) => {
    if (!quality) return null;
    let label = '';
    let bgColor = '';
    
    if (quality >= 8.5) {
      label = '优秀';
      bgColor = 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
    } else if (quality >= 7.0) {
      label = '良好';
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
    } else {
      label = '待优化';
      bgColor = 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${bgColor}`}>
        {label}
      </span>
    );
  };

  const handleVersionClick = (version: PromptVersion, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Loading version:', version.name); // 调试日志
    onSelectVersion(version);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
      style={{
        // 确保模态框在最上层
        zIndex: 100000,
        // 确保模态框不会影响页面布局
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // 防止模态框影响页面滚动
        overflow: 'hidden',
        // 确保模态框不会影响其他元素
        contain: 'layout'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 flex flex-col"
        style={{ 
          height: '80vh',
          // 确保模态框内容也在正确的层级
          zIndex: 100001,
          position: 'relative'
        }}
      >
        {/* Header - 固定不滚动 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <History size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                历史版本
              </h2>
              <p className="text-sm text-gray-500">
                选择一个版本来加载其内容、设置和聊天记录
                {currentLoadedVersion && (
                  <span className="text-blue-600 dark:text-blue-400 ml-2">
                    (当前: {currentLoadedVersion.name})
                  </span>
                )}
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

        {/* Content - 可滚动区域 */}
        <div className="flex-1 overflow-hidden">
          {versions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">暂无历史版本</p>
                <p className="text-sm">保存第一个版本来开始版本管理</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-6">
                <div className="grid gap-4">
                  {versions.map((version, index) => {
                    const isCurrentLoaded = currentLoadedVersion?.id === version.id;
                    
                    return (
                      <motion.div
                        key={version.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={(e) => handleVersionClick(version, e)}
                        className={`group p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          isCurrentLoaded
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <h3 className={`font-medium transition-colors ${
                                isCurrentLoaded
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              }`}>
                                {version.name}
                              </h3>
                              {isCurrentLoaded && (
                                <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                  当前加载
                                </span>
                              )}
                              {version.metrics && getQualityBadge(version.metrics.quality)}
                              {version.chatHistory && version.chatHistory.length > 0 && (
                                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                                  <MessageSquare size={10} />
                                  <span>{version.chatHistory.length} 条聊天</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} className={`transition-colors ${
                            isCurrentLoaded
                              ? 'text-blue-500'
                              : 'text-gray-400 group-hover:text-blue-500'
                          }`} />
                        </div>

                        {/* Version Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <Clock size={12} className="text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {format(version.timestamp, 'MM/dd HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User size={12} className="text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {version.model}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Settings size={12} className="text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              T:{version.temperature} / {version.maxTokens}
                            </span>
                          </div>
                          {version.metrics && (
                            <div className="flex items-center space-x-2">
                              <BarChart3 size={12} className={getQualityColor(version.metrics.quality)} />
                              <span className={`font-medium ${getQualityColor(version.metrics.quality)}`}>
                                {version.metrics.quality.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content Preview */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border">
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 font-mono">
                            {version.content || '无内容'}
                          </p>
                        </div>

                        {/* Chat History Preview */}
                        {version.chatHistory && version.chatHistory.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center space-x-2 mb-2">
                              <Bot size={12} className="text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                聊天记录预览
                              </span>
                            </div>
                            <div className="space-y-1 text-xs">
                              {version.chatHistory.slice(0, 2).map((msg, idx) => (
                                <div key={idx} className="flex items-start space-x-2">
                                  <span className={`font-medium ${
                                    msg.role === 'user' ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'
                                  }`}>
                                    {msg.role === 'user' ? '用户:' : 'AI:'}
                                  </span>
                                  <span className="text-blue-800 dark:text-blue-200 line-clamp-1">
                                    {msg.content}
                                  </span>
                                </div>
                              ))}
                              {version.chatHistory.length > 2 && (
                                <div className="text-blue-600 dark:text-blue-400 text-center">
                                  还有 {version.chatHistory.length - 2} 条消息...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {version.tags && version.tags.length > 0 && (
                          <div className="flex items-center space-x-2 mt-3">
                            <Tag size={12} className="text-gray-400" />
                            <div className="flex flex-wrap gap-1">
                              {version.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {version.notes && (
                          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              <strong>备注:</strong> {version.notes}
                            </p>
                          </div>
                        )}

                        {/* Performance Metrics */}
                        {version.metrics && (
                          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {version.metrics.quality.toFixed(1)}
                              </div>
                              <div className="text-gray-500">质量</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {version.metrics.coherence.toFixed(1)}
                              </div>
                              <div className="text-gray-500">连贯性</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {version.metrics.relevance.toFixed(1)}
                              </div>
                              <div className="text-gray-500">相关性</div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - 固定不滚动 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="text-sm text-gray-500">
            共 {versions.length} 个版本
            {currentLoadedVersion && (
              <span className="text-blue-600 dark:text-blue-400 ml-2">
                • 当前加载: {currentLoadedVersion.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PromptEditor;