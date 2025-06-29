import { ChatMessage } from '../types';

export interface OpenAICompletionOptions {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIService {
  /**
   * 创建聊天完成请求
   */
  static async createChatCompletion(
    messages: ChatMessage[],
    options: OpenAICompletionOptions
  ): Promise<{
    response: string;
    responseTime: number;
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
  }> {
    try {
      console.log('🤖 开始调用 OpenAI API...', {
        model: options.model,
        messagesCount: messages.length,
        baseURL: options.baseURL
      });

      const startTime = Date.now();

      // 转换消息格式
      const openaiMessages: OpenAIMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('📤 发送请求到 OpenAI API...');
      
      // 构建请求参数
      const requestBody = {
        model: options.model,
        messages: openaiMessages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
        top_p: options.top_p || 1.0,
        ...(options.top_k ? { top_k: options.top_k } : {})
      };
      
      // 发送请求
      const response = await fetch(`${options.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      const responseTime = Date.now() - startTime;
      console.log(`⏱️ API 响应时间: ${responseTime}ms`);

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ API 请求失败:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // 构建错误消息
        let errorMessage = `API 请求失败: ${response.status} ${response.statusText}`;
        if (errorData && errorData.error) {
          errorMessage += ` - ${errorData.error.message || JSON.stringify(errorData.error)}`;
        }
        
        throw new Error(errorMessage);
      }

      // 解析响应
      const data = await response.json() as OpenAICompletionResponse;
      console.log('📥 API 响应成功:', {
        model: data.model,
        usage: data.usage,
        choices: data.choices.length
      });

      // 提取响应文本
      const responseText = data.choices[0]?.message?.content || '';
      
      // 提取 token 使用情况
      const tokenUsage = {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      };

      return {
        response: responseText,
        responseTime,
        tokenUsage
      };
    } catch (error) {
      console.error('❌ OpenAI API 调用失败:', error);
      
      // 构建用户友好的错误消息
      let errorMessage = '调用 AI 模型失败';
      
      if (error instanceof Error) {
        // 网络错误
        if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
          errorMessage = '网络连接失败，请检查您的网络连接';
        }
        // 认证错误
        else if (error.message.includes('401') || error.message.includes('authentication')) {
          errorMessage = 'API 密钥无效或已过期，请检查您的 API 密钥设置';
        }
        // 请求超时
        else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorMessage = '请求超时，服务器响应时间过长';
        }
        // 服务器错误
        else if (error.message.includes('5') && error.message.includes('API')) {
          errorMessage = 'AI 服务器暂时不可用，请稍后再试';
        }
        // 参数错误
        else if (error.message.includes('400') || error.message.includes('parameter')) {
          errorMessage = '请求参数错误，请检查模型配置';
        }
        // 其他错误
        else {
          errorMessage = `调用失败: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 创建流式聊天完成请求
   */
  static async createStreamingChatCompletion(
    messages: ChatMessage[],
    options: OpenAICompletionOptions,
    onChunk: (chunk: string) => void,
    onDone: (tokenUsage: { prompt: number; completion: number; total: number }) => void
  ): Promise<void> {
    try {
      console.log('🤖 开始流式调用 OpenAI API...', {
        model: options.model,
        messagesCount: messages.length,
        baseURL: options.baseURL
      });

      const startTime = Date.now();

      // 转换消息格式
      const openaiMessages: OpenAIMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('📤 发送流式请求到 OpenAI API...');
      
      // 构建请求参数
      const requestBody = {
        model: options.model,
        messages: openaiMessages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
        top_p: options.top_p || 1.0,
        ...(options.top_k ? { top_k: options.top_k } : {}),
        stream: true
      };
      
      // 发送请求
      const response = await fetch(`${options.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ 流式 API 请求失败:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // 构建错误消息
        let errorMessage = `API 请求失败: ${response.status} ${response.statusText}`;
        if (errorData && errorData.error) {
          errorMessage += ` - ${errorData.error.message || JSON.stringify(errorData.error)}`;
        }
        
        throw new Error(errorMessage);
      }

      // 获取响应流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      // 用于累积完整的 JSON 对象
      let accumulatedChunks = '';
      let completionTokens = 0;
      
      // 读取流
      const read = async (): Promise<void> => {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ 流式响应完成，总耗时:', Date.now() - startTime, 'ms');
          
          // 估算 token 使用情况
          const promptTokens = Math.ceil(messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4);
          
          onDone({
            prompt: promptTokens,
            completion: completionTokens,
            total: promptTokens + completionTokens
          });
          
          return;
        }
        
        // 解码二进制数据
        const chunk = new TextDecoder().decode(value);
        
        // 处理 SSE 格式的数据
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          // 移除 "data: " 前缀
          const dataLine = line.replace(/^data: /, '');
          
          // 检查是否是流的结束标记
          if (dataLine === '[DONE]') {
            continue;
          }
          
          try {
            // 解析 JSON 数据
            const data = JSON.parse(dataLine);
            
            // 提取文本内容
            const content = data.choices[0]?.delta?.content || '';
            
            if (content) {
              // 估算 token 数量
              completionTokens += Math.ceil(content.length / 4);
              
              // 发送文本块
              onChunk(content);
            }
          } catch (error) {
            console.warn('解析流数据块失败:', error);
            // 累积不完整的 JSON
            accumulatedChunks += dataLine;
            
            // 尝试解析累积的数据
            try {
              const data = JSON.parse(accumulatedChunks);
              const content = data.choices[0]?.delta?.content || '';
              
              if (content) {
                completionTokens += Math.ceil(content.length / 4);
                onChunk(content);
              }
              
              // 重置累积
              accumulatedChunks = '';
            } catch {
              // 继续累积
            }
          }
        }
        
        // 继续读取
        return read();
      };
      
      // 开始读取流
      await read();
      
    } catch (error) {
      console.error('❌ OpenAI 流式 API 调用失败:', error);
      
      // 构建用户友好的错误消息
      let errorMessage = '调用 AI 模型失败';
      
      if (error instanceof Error) {
        // 网络错误
        if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
          errorMessage = '网络连接失败，请检查您的网络连接';
        }
        // 认证错误
        else if (error.message.includes('401') || error.message.includes('authentication')) {
          errorMessage = 'API 密钥无效或已过期，请检查您的 API 密钥设置';
        }
        // 请求超时
        else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorMessage = '请求超时，服务器响应时间过长';
        }
        // 服务器错误
        else if (error.message.includes('5') && error.message.includes('API')) {
          errorMessage = 'AI 服务器暂时不可用，请稍后再试';
        }
        // 参数错误
        else if (error.message.includes('400') || error.message.includes('parameter')) {
          errorMessage = '请求参数错误，请检查模型配置';
        }
        // 其他错误
        else {
          errorMessage = `调用失败: ${error.message}`;
        }
      }
      
      // 发送错误消息
      onChunk(`\n\n**错误:** ${errorMessage}`);
      
      // 调用完成回调
      onDone({
        prompt: Math.ceil(messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4),
        completion: 0,
        total: Math.ceil(messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4)
      });
    }
  }
}