import OpenAI from 'openai';
import { ChatMessage } from '../types';

// OpenAI API 服务
export class OpenAIService {
  private static openaiInstances: Map<string, OpenAI> = new Map();

  /**
   * 获取 OpenAI 客户端实例
   */
  static getClient(baseUrl: string, apiKey: string): OpenAI {
    const instanceKey = `${baseUrl}:${apiKey}`;
    
    if (!this.openaiInstances.has(instanceKey)) {
      console.log('🔑 创建新的 OpenAI 客户端实例:', { baseUrl });
      
      const client = new OpenAI({
        baseURL: baseUrl,
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // 允许在浏览器中使用 API 密钥
      });
      
      this.openaiInstances.set(instanceKey, client);
    }
    
    return this.openaiInstances.get(instanceKey)!;
  }

  /**
   * 发送聊天请求
   */
  static async sendChatRequest(
    baseUrl: string,
    apiKey: string,
    messages: any[],
    modelName: string,
    temperature: number = 0.7,
    maxTokens: number = 1000,
    topP: number = 1.0,
    topK: number = 50
  ): Promise<{
    content: string;
    tokenUsage: { prompt: number; completion: number; total: number };
    responseTime: number;
  }> {
    try {
      console.log('🚀 发送 OpenAI 请求:', {
        modelName,
        messagesCount: messages.length,
        temperature,
        maxTokens
      });
      
      const startTime = Date.now();
      
      // 获取 OpenAI 客户端
      const openai = this.getClient(baseUrl, apiKey);
      
      // 发送请求
      const completion = await openai.chat.completions.create({
        messages,
        model: modelName,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        top_k: topK
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log('✅ OpenAI 请求成功:', {
        responseTime: `${responseTime}ms`,
        hasChoices: completion.choices.length > 0,
        tokenUsage: completion.usage
      });
      
      // 提取响应内容
      const content = completion.choices[0]?.message?.content || '';
      
      // 计算 token 使用情况
      const tokenUsage = completion.usage ? {
        prompt: completion.usage.prompt_tokens,
        completion: completion.usage.completion_tokens,
        total: completion.usage.total_tokens
      } : { prompt: 0, completion: 0, total: 0 };
      
      return {
        content,
        tokenUsage,
        responseTime
      };
    } catch (error) {
      console.error('❌ OpenAI 请求失败:', error);
      
      // 添加更详细的错误信息
      if (error instanceof Error) {
        console.error('错误详情:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      throw error;
    }
  }

  /**
   * 测试模型连接
   */
  static async testConnection(
    baseUrl: string,
    apiKey: string,
    modelName: string
  ): Promise<boolean> {
    try {
      console.log('🧪 测试 OpenAI 连接:', { baseUrl, modelName });
      
      // 获取 OpenAI 客户端
      const openai = this.getClient(baseUrl, apiKey);
      
      // 发送简单的测试请求
      const completion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, this is a connection test.' }
        ],
        model: modelName,
        max_tokens: 5
      });
      
      console.log('✅ OpenAI 连接测试成功:', completion.choices[0]?.message?.content);
      
      return true;
    } catch (error) {
      console.error('❌ OpenAI 连接测试失败:', error);
      
      // 添加更详细的错误信息
      if (error instanceof Error) {
        console.error('错误详情:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      throw error;
    }
  }

  /**
   * 将聊天消息转换为 OpenAI API 格式
   */
  static convertMessagesToOpenAIFormat(messages: ChatMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}