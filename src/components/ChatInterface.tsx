import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  User, 
  Bot, 
  Copy, 
  Check, 
  Trash2, 
  RotateCcw,
  MessageSquare,
  Loader2,
  Settings,
  ArrowDown,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { ChatMessage } from '../types';
import ModelSettingsModal from './ModelSettingsModal';
import { OpenAIService } from '../lib/openaiService';
import { supabase } from '../lib/supabase';
import { generateMockResponse } from '../utils/mockData';

interface ChatInterfaceProps {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  onModelSettingsChange: (temperature: number, maxTokens: number) => void;
  onChatHistoryChange?: (messages: ChatMessage[]) => void;
}

// 未登录用户的 AI 服务
class UnauthenticatedAIService {
  static async sendChatRequest(
    messages: any[]
  ): Promise<{
    content: string;
    tokenUsage: { prompt: number; completion: number; total: number };
    responseTime: number;
    usageInfo?: { used: number; limit: number; remaining: number };
  }> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 发送未登录用户请求到 Supabase Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('openai-completion-v2', {
        body: { messages }
      });

      console.log('error = ', error);
      console.log('data = ', data);
      
      if (error) {
        console.error('❌ Edge Function 调用失败:', error);
        throw new Error(error.message || 'AI 服务调用失败');
      }
      
      const responseTime = Date.now() - startTime;
      
      // 检查是否是限制错误
      if (data.error) {
        if (data.error === 'Daily message limit exceeded') {
          throw new Error(`今日消息次数已用完 (${data.used}/${data.limit})，明天重置`);
        }
        throw new Error(data.error);
      }
      
      console.log('✅ 未登录用户请求成功:', {
        responseTime: `${responseTime}ms`,
        usageInfo: data.usage_info
      });
      
      // 提取响应内容
      const content = data.choices?.[0]?.message?.content || '';
      
      // 计算 token 使用情况
      const tokenUsage = data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      } : { prompt: 0, completion: 0, total: 0 };
      
      return {
        content,
        tokenUsage,
        responseTime,
        usageInfo: data.usage_info
      };
    } catch (error) {
      console.error('❌ 未登录用户请求失败:', error);
      throw error;
    }
  }
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  systemPrompt, 
  temperature,
  maxTokens,
  onModelSettingsChange,
  onChatHistoryChange,
}) => {
  const { state, dispatch } = useApp();
  const { userInfo } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // 使用本地状态保存 systemPrompt，避免在聊天过程中丢失
  const [localSystemPrompt, setLocalSystemPrompt] = useState<string>(systemPrompt);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // 当外部 systemPrompt 变化时更新本地状态
  useEffect(() => {
    setLocalSystemPrompt(systemPrompt);
  }, [systemPrompt]);

  // 当外部 systemPrompt 变化时更新本地状态
  useEffect(() => {
    setLocalSystemPrompt(systemPrompt);
  }, [systemPrompt]);

  // 获取用户的自定义模型列表
  const customModels = userInfo?.custom_models || [];
  const hasCustomModels = customModels.length > 0;
  
  // 检查是否为未登录模式
  const isUnauthenticated = state.isUnauthenticatedMode;
  
  // 获取默认模型
  const defaultModel = customModels.find((model: any) => model.isDefault);

  // 当任务切换时，加载对应的聊天历史
  useEffect(() => {
    if (state.currentTask?.currentChatHistory) {
      setMessages(state.currentTask.currentChatHistory);
    } else {
      setMessages([]);
    }
    // 切换任务时，重置错误提醒和输入框
    setApiError(null);
    setUserInput('');
  }, [state.currentTask?.id]); // 移除 dispatch 依赖，避免无限循环

  // 当用户有自定义模型时，自动设置默认模型
  useEffect(() => {
    if (!isUnauthenticated && hasCustomModels && defaultModel && !state.selectedCustomModel) {
      console.log('🎯 设置默认自定义模型:', defaultModel.name);
      dispatch({ 
        type: 'SET_SELECTED_CUSTOM_MODEL', 
        payload: defaultModel 
      });
    } else if (!isUnauthenticated && !hasCustomModels && state.selectedCustomModel) {
      // 如果用户删除了所有自定义模型，清除选择
      dispatch({ 
        type: 'SET_SELECTED_CUSTOM_MODEL', 
        payload: null 
      });
    }
  }, [isUnauthenticated, hasCustomModels, defaultModel, state.selectedCustomModel, dispatch]);

  // 当聊天历史变化时，自动保存到当前任务并通知父组件
  // useEffect(() => {
  //   // 关键修复：添加条件检查，避免无限循环
  //   if (state.currentTask && messages.length > 0 && !messages.some(m => m.isLoading)) {
  //     // 检查消息是否真的发生了变化
  //     const currentChatHistory = state.currentTask.currentChatHistory || [];
  //     const messagesChanged = JSON.stringify(messages) !== JSON.stringify(currentChatHistory);
      
  //     if (messagesChanged) {
  //       console.log('💾 聊天历史发生变化，自动保存到任务');
  //       console.log('messages : ' + JSON.stringify(messages))
  //       console.log('currentChatHistory : ' + JSON.stringify(currentChatHistory))
  //       const updatedTask = {
  //         ...state.currentTask,
  //         currentChatHistory: messages,
  //         updatedAt: new Date()
  //       };
  //       dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
  //     }
  //   }
    
  //   // 通知父组件聊天历史变化
  //   if (onChatHistoryChange) {
  //     const filteredMessages = messages.filter(m => !m.isLoading);
  //     onChatHistoryChange(filteredMessages);
  //   }
  // }, [messages, state.currentTask?.id]); // 移除 dispatch 和 onChatHistoryChange 依赖

  // 单独处理任务更新，避免与消息更新形成循环
  const updateTaskWithMessages = useCallback((newMessages: ChatMessage[]) => {
    if (state.currentTask) {
      const updatedTask = {
        ...state.currentTask,
        currentChatHistory: newMessages.filter(m => !m.isLoading),
        updatedAt: new Date()
      };
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    }
  }, [state.currentTask?.id, dispatch]);

  // 监听滚动事件，显示/隐藏滚动到底部按钮
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom && messages.length > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  // 新消息时智能滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        
        // 如果用户正在查看底部附近，或者是新发送的消息，自动滚动
        if (isNearBottom || messages[messages.length - 1]?.role === 'user') {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    }
  }, [messages]);

  // 创建 OpenAI 客户端实例
  const createOpenAIClient = (customModel: any) => {
    if (!customModel) {
      console.error('❌ 无法创建 OpenAI 客户端: 未选择模型', { customModel });
      return null;
    }
    
    try {
      console.log('🔑 准备创建 OpenAI 客户端:', { 
        modelName: customModel.name,
        baseUrl: customModel.baseUrl
      });
      return true; // 只返回一个标记，实际客户端将在需要时创建
    } catch (error) {
      console.error('❌ 创建 OpenAI 客户端失败:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    // 关键修复：移除 systemPrompt 的必需检查，允许无 system prompt 时聊天
    if (!userInput.trim()) return;
    const messageToSend = userInput.trim();
    // 生成唯一 id
    const userMessageId = Date.now().toString();
    const loadingMessageId = (Date.now() + 1).toString();
    
    // 检查是否选择了模型（仅对已登录用户）
    if (!isUnauthenticated && !state.selectedCustomModel) {
      setApiError('请先在账户设置中配置并选择一个自定义模型');
      return;
    }
    
    // 未登录用户：检查使用次数限制
    if (isUnauthenticated && state.unauthenticatedUsage.remaining <= 0) {
      setApiError(`今日免费次数已用完 (${state.unauthenticatedUsage.used}/${state.unauthenticatedUsage.limit})，请登录以继续使用`);
      return;
    }

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };
    

    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setUserInput('');
    setIsLoading(true);
    
    // 立即更新任务状态，包含新的用户消息
    updateTaskWithMessages([...messages, userMessage, loadingMessage]);

    // 发送消息后立即滚动到底部
    setTimeout(() => scrollToBottom(), 100);

    // 关键修复：发送消息后立即重新聚焦到输入框
    setTimeout(() => inputRef.current?.focus(), 150);

    try {
      setApiError(null);
      
      if (isUnauthenticated) {
        // 未登录用户：使用 Supabase Edge Function
        console.log('🚀 未登录用户发送请求...');
        
        // 构建对话上下文
        const conversationContext = [
          ...(systemPrompt.trim() ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages.filter(m => !m.isLoading).map(m => ({
            role: m.role,
            content: m.content
          })),
          { role: 'user', content: messageToSend }
        ];

        console.log('conversationContext : ' + JSON.stringify(conversationContext, null, 2))
        
        const { content: responseContent, tokenUsage, responseTime, usageInfo } = await UnauthenticatedAIService.sendChatRequest(conversationContext);
        
        // 更新使用次数
        if (usageInfo) {
          dispatch({ 
            type: 'UPDATE_UNAUTH_USAGE', 
            payload: usageInfo 
          });
          
          // 更新本地存储
          const today = new Date().toDateString();
          localStorage.setItem('unauth-usage-date', today);
          localStorage.setItem('unauth-usage-count', usageInfo.used.toString());
        }
        
        const assistantMessage: ChatMessage = {
          id: loadingMessage.id,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          tokenUsage: tokenUsage,
          responseTime: responseTime
        };

        if (state.currentTask) {
          const finalMessages = [...messages, userMessage, assistantMessage];
          const updatedTask = {
            ...state.currentTask,
            currentChatHistory: finalMessages,
            updatedAt: new Date()
          };
          dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
        }

        setMessages(prev => 
          prev.map(msg => 
            msg.id === loadingMessage.id ? assistantMessage : msg
          )
        );
        
      } else {
        // 已登录用户：使用自定义模型
        console.log('🚀 已登录用户发送请求...');
        
        // 构建完整的对话上下文
        const conversationContext = [
          ...(localSystemPrompt.trim() ? [{ role: 'system', content: localSystemPrompt }] : []),
          ...messages.filter(m => !m.isLoading).map(m => ({
            role: m.role,
            content: m.content
          })),
          { role: 'user', content: messageToSend }
        ];

        // 创建 OpenAI 客户端
        const canCreateClient = createOpenAIClient(state.selectedCustomModel);
        if (!canCreateClient) {
          throw new Error('无法创建 AI 客户端，请检查模型配置');
        }
        
        const startTime = Date.now();

        // 使用 OpenAIService 发送请求
        try {
          // 动态导入 OpenAIService
          const { OpenAIService } = await import('../lib/openaiService');
          
          try {
            const { content: responseContent, tokenUsage, responseTime } = await OpenAIService.sendChatRequest(
              state.selectedCustomModel.baseUrl,
              state.selectedCustomModel.apiKey,
              conversationContext,
              state.selectedCustomModel.name,
              temperature,
              maxTokens,
              state.selectedCustomModel.topP || 1.0,
              state.selectedCustomModel.topK || 50
            );

            const assistantMessage: ChatMessage = {
              id: loadingMessage.id,
              role: 'assistant',
              content: responseContent,
              timestamp: new Date(),
              tokenUsage: tokenUsage,
              responseTime: responseTime
            };

            if (state.currentTask) {
              const finalMessages = [...messages, userMessage, assistantMessage];
              const updatedTask = {
                ...state.currentTask,
                currentChatHistory: finalMessages,
                updatedAt: new Date()
              };
              dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
            }

            setMessages(prev => 
              prev.map(msg => 
                msg.id === loadingMessage.id ? assistantMessage : msg
              )
            );

            // 更新任务状态，包含完整的聊天历史和响应数据
            const finalMessages = messages.map(msg => 
              msg.id === loadingMessage.id ? assistantMessage : msg
            );
            updateTaskWithMessages(finalMessages);
            
            // 单独更新任务的响应时间和token使用情况
            setTimeout(() => {
              if (state.currentTask) {
                const updatedTokenUsage = tokenUsage;
                const updatedResponseTime = responseTime;
                
                const updatedTask = {
                  ...state.currentTask,
                  responseTime: updatedResponseTime,
                  tokenUsage: updatedTokenUsage,
                  updatedAt: new Date()
                };
                dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
              }
            }, 100);
          } catch (apiError: any) {
            console.error('API 调用失败:', apiError.message);
            throw apiError;
          }
        } catch (importError: any) {
          console.error('导入 OpenAIService 失败:', importError.message);
          throw new Error(`无法加载 AI 服务模块: ${importError.message}`);
        }
      }

      // 响应完成后再次确保输入框聚焦
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // 设置用户友好的错误消息
      let errorMessage = '发送消息失败，请稍后重试';
      // 1. 恢复输入内容
      setUserInput(messageToSend);
      // 2. 移除刚刚发出去的两条消息
      setMessages(prev => prev.filter(msg => msg.id !== userMessageId && msg.id !== loadingMessageId));

      // 从全局 state 移除失败消息
      if (state.currentTask) {
        const updatedTask = {
          ...state.currentTask,
          currentChatHistory: messages.filter(msg => msg.id !== userMessageId && msg.id !== loadingMessageId),
          updatedAt: new Date()
        };
        dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      }

      if (error instanceof Error) {
        console.error('错误详情:', error.message);
        
        // 处理常见的 API 错误
        if (error.message.includes('API key')) {
          errorMessage = 'API 密钥无效，请检查您的模型配置';
        } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          errorMessage = '请求超时，请检查您的网络连接';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '网络错误，请检查您的网络连接';
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = '请求频率过高，请稍后再试';
        } else if (error.message.includes('content filter') || error.message.includes('moderation')) {
          errorMessage = '内容被过滤，请修改您的请求';
        } else if (error.message.includes('model')) {
          errorMessage = '模型配置错误，请检查模型名称和参数';
        } else if (error.message.includes('今日消息次数已用完')) {
          errorMessage = error.message;
        }
      }

      setApiError(errorMessage);
      
      setMessages(prev => 
        prev.filter(msg => msg.id !== loadingMessage.id)
      );
      
      // 即使出错也要保持输入框聚焦
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(messageId);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const clearChat = () => {
    if (confirm('确定要清空聊天记录吗？')) {
      setMessages([]);
      // 使用统一的更新方法清空聊天历史
      updateTaskWithMessages([]);
      
      // 清空后重新聚焦输入框
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const regenerateResponse = async (messageIndex: number) => {
    if (messageIndex === 0) return;
    
    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;

    const loadingMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };

    // 替换原来的assistant消息为loading状态
    const newMessages = [...messages];
    newMessages[messageIndex] = loadingMessage;
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // 修复：构建对话上下文时考虑 system prompt 可能为空的情况
      const conversationContext = [
        // 使用本地保存的 systemPrompt
        ...(localSystemPrompt.trim() ? [{ role: 'system', content: localSystemPrompt }] : []),
        ...messages.slice(0, messageIndex).filter(m => !m.isLoading).map(m => ({
          role: m.role,
          content: m.content
        })),
        { role: 'user', content: userMessage.content }
      ];

      const result = await generateMockResponse(
        JSON.stringify(conversationContext), 
        state.selectedModel
      );

      const assistantMessage: ChatMessage = {
        id: loadingMessage.id,
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        tokenUsage: result.tokenUsage,
        responseTime: result.responseTime
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id ? assistantMessage : msg
        )
      );

    } catch (error) {
      console.error('Error regenerating response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSettingsChange = (newTemperature: number, newMaxTokens: number) => {
    onModelSettingsChange(newTemperature, newMaxTokens);
    setShowModelSettings(false);
  };
  
  // 处理系统提示词变更
  const handleSystemPromptChange = (newPrompt: string) => {
    setLocalSystemPrompt(newPrompt);
  };

  // 格式化响应时间为秒，小数点后保留2位
  const formatResponseTime = (timeMs: number): string => {
    const timeSeconds = timeMs / 1000;
    return timeSeconds.toFixed(2) + 's';
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800 relative">
      {/* Chat Header - 与System Prompt标题高度一致，包含模型选择和设置 */}
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="font-medium flex items-center space-x-2">
              <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
              <span>聊天测试</span>
              {isUnauthenticated && (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">
                  未登录
                </span>
              )}
            </h3>
            
            {/* 模型选择和设置 - 仅对已登录用户显示 */}
            {!isUnauthenticated && (
              <div className="flex items-center space-x-2">
                <select
                  value={state.selectedCustomModel ? state.selectedCustomModel.id : ''}
                  onChange={(e) => {
                    const selectedModelId = e.target.value;
                    const selectedModel = customModels.find((model: any) => model.id === selectedModelId);
                    if (selectedModel) {
                      dispatch({ 
                        type: 'SET_SELECTED_CUSTOM_MODEL', 
                        payload: selectedModel 
                      });
                    }
                  }}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  disabled={!hasCustomModels}
                >
                  {!hasCustomModels && (
                    <option value="">未配置模型</option>
                  )}
                  {customModels.map((model: any) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowModelSettings(true)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="模型参数设置"
                  disabled={!state.selectedCustomModel}
                >
                  <Settings size={14} />
                </button>
              </div>
            )}
            

          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500">
              {messages.filter(m => !m.isLoading).length} 条消息
            </span>
            <button
              onClick={clearChat}
              disabled={messages.length === 0}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
              <span>清空</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area - 独立的滚动容器 */}
      <div className="flex-1 relative">
        <div 
          ref={messagesContainerRef}
          className="absolute inset-0 overflow-y-auto p-4 space-y-4 chat-messages-container"
          style={{
            // 确保滚动容器有稳定的布局
            contain: 'layout',
            // 优化滚动性能
            willChange: 'scroll-position',
            // 平滑滚动
            scrollBehavior: 'smooth'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Bot size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {isUnauthenticated ? '开始 AI 对话测试' : '开始 AI 对话测试'}
                </p>
                <p className="text-sm">
                  {isUnauthenticated 
                    ? '💡 可在左侧设置 System Prompt 来定制AI的回答风格（可选）'
                    : '输入用户消息来测试AI模型的回答效果'
                  }
                </p>
                
                {!isUnauthenticated && (
                  <>
                    {systemPrompt.trim() ? (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        ✓ 已设置 System Prompt，将影响AI的回答风格
                      </p>
                    ) : (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 max-w-md">
                        {hasCustomModels 
                          ? '💡 可在左侧设置 System Prompt 来定制AI的回答风格（可选）'
                          : '⚠️ 请先在账户设置中配置自定义模型'
                        }
                      </p>
                    )}
                  </>
                )}
                
                {isUnauthenticated && state.unauthenticatedUsage.remaining === 0 && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      今日免费次数已用完，请登录以继续使用
                    </p>
                  </div>
                )}
                
                {/* 显示 API 错误信息 */}
                {apiError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md mx-auto">
                    <div className="flex items-center space-x-2">
                      <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onCopy={(text) => copyToClipboard(text, message.id)}
                    onRegenerate={() => regenerateResponse(index)}
                    copied={copied === message.id}
                    canRegenerate={message.role === 'assistant' && !message.isLoading}
                    formatResponseTime={formatResponseTime}
                  />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 滚动到底部按钮 - 相对于消息区域定位 */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
              title="滚动到底部"
            >
              <ArrowDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 chat-input-area">
        <div className="flex items-start space-x-3">
          <div className="flex-1">
            {/* 显示 API 错误信息 */}
            {apiError && (
              <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
                  <p className="text-xs text-red-700 dark:text-red-300">{apiError}</p>
                </div>
              </div>
            )}
            
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isUnauthenticated 
                  ? (state.unauthenticatedUsage.remaining > 0 ? "输入消息开始对话..." : "今日免费次数已用完")
                  : (hasCustomModels ? "输入用户消息..." : "请先配置自定义模型")
              }
              disabled={
                isLoading || 
                (!isUnauthenticated && !hasCustomModels) ||
                (isUnauthenticated && state.unauthenticatedUsage.remaining <= 0) 
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={Math.min(Math.max(userInput.split('\n').length, 1), 5)}
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>按 Enter 发送，Shift + Enter 换行</span>
              <div className="flex items-center space-x-4">
                <span>{userInput.length} 字符</span>
                {isUnauthenticated && (
                  <span className={`${
                    state.unauthenticatedUsage.remaining > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    剩余 {state.unauthenticatedUsage.remaining} 次
                  </span>
                )}

              </div>
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={
              !userInput.trim() || 
              isLoading || 
              (!isUnauthenticated && !hasCustomModels) ||
              (isUnauthenticated && state.unauthenticatedUsage.remaining <= 0)
            }
            className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 mt-0"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Model Settings Modal */}
      <AnimatePresence>
        {showModelSettings && !isUnauthenticated && (
          <ModelSettingsModal
            temperature={state.selectedCustomModel?.temperature || temperature}
            maxTokens={state.selectedCustomModel?.maxTokens || maxTokens}
            topK={state.selectedCustomModel?.topK || 50}
            topP={state.selectedCustomModel?.topP || 1.0}
            selectedModel={state.selectedCustomModel}
            onClose={() => setShowModelSettings(false)}
            onSave={handleModelSettingsChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MessageBubble: React.FC<{
  message: ChatMessage;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  copied: boolean;
  canRegenerate: boolean;
  formatResponseTime: (timeMs: number) => string;
}> = ({ message, onCopy, onRegenerate, copied, canRegenerate, formatResponseTime }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group chat-message`}
    >
      <div className={`flex items-start space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
          }`}>
            {message.isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">AI 正在思考...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
            )}
          </div>

          {/* Message Actions and Stats */}
          <div className="flex items-center space-x-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {message.responseTime && (
              <span className="text-xs text-gray-500">
                {formatResponseTime(message.responseTime)}
              </span>
            )}
            {message.tokenUsage && (
              <span className="text-xs text-gray-500">
                {message.tokenUsage.total} tokens
              </span>
            )}
            {!message.isLoading && (
              <>
                <button
                  onClick={() => onCopy(message.content)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                  title="复制"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
                {canRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                    title="重新生成"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatInterface;