import { PromptVersion, TestResult, ModelConfig } from '../types';

export const mockModels: ModelConfig[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    maxTokens: 8192,
    supportedFeatures: ['chat', 'completion', 'function-calling']
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    maxTokens: 4096,
    supportedFeatures: ['chat', 'completion', 'function-calling']
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    maxTokens: 4096,
    supportedFeatures: ['chat', 'completion']
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    maxTokens: 4096,
    supportedFeatures: ['chat', 'completion']
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    maxTokens: 2048,
    supportedFeatures: ['chat', 'completion']
  }
];

export const generateMockResponse = (prompt: string, model: string): Promise<{
  response: string;
  responseTime: number;
  tokenUsage: { prompt: number; completion: number; total: number };
}> => {
  return new Promise((resolve) => {
    const delay = Math.random() * 3000 + 1000; // 1-4 seconds for more realistic chat experience
    
    setTimeout(() => {
      // Parse conversation context if it's a JSON string
      let conversationContext;
      try {
        conversationContext = JSON.parse(prompt);
      } catch {
        conversationContext = [{ role: 'user', content: prompt }];
      }

      // Generate contextual responses based on conversation
      const responses = [
        "我理解您的问题。基于您提供的上下文，我可以为您提供详细的分析和建议。这个问题涉及多个方面，让我逐一为您解释。",
        "这是一个很好的问题。根据我的理解，我建议从以下几个角度来考虑这个问题。首先，我们需要明确核心需求，然后制定相应的解决方案。",
        "感谢您的提问。我注意到您关注的重点，让我为您提供一个全面的回答。这个话题确实需要仔细考虑多个因素。",
        "我很乐意帮助您解决这个问题。基于您的描述，我认为最佳的方法是采用系统性的思维方式来分析和处理。",
        "您提出了一个非常有意思的观点。让我从不同的角度来分析这个问题，并为您提供一些实用的建议和解决方案。",
        "根据您的需求，我建议我们可以这样来处理：首先分析现状，然后制定目标，最后制定具体的实施计划。",
        "这确实是一个需要深入思考的问题。我建议我们可以从理论和实践两个层面来探讨，这样能够得到更全面的理解。",
        "我理解您的关切。基于当前的情况，我认为最重要的是要保持灵活性，同时确保我们的方法是可持续和有效的。"
      ];
      
      // Select response based on conversation length and context
      const lastUserMessage = conversationContext.filter(msg => msg.role === 'user').pop();
      const userMessageLength = lastUserMessage?.content?.length || 0;
      
      let selectedResponse;
      if (userMessageLength > 100) {
        selectedResponse = responses[Math.floor(Math.random() * 3)]; // More detailed responses for longer questions
      } else {
        selectedResponse = responses[Math.floor(Math.random() * responses.length)];
      }
      
      // Add some variation based on model
      const modelVariations = {
        'gpt-4': '（GPT-4 提供的回答）' + selectedResponse,
        'claude-3-opus': '（Claude 3 Opus 提供的回答）' + selectedResponse,
        'gemini-pro': '（Gemini Pro 提供的回答）' + selectedResponse
      };
      
      const finalResponse = modelVariations[model] || selectedResponse;
      
      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(finalResponse.length / 4);
      
      resolve({
        response: finalResponse,
        responseTime: delay,
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens
        }
      });
    }, delay);
  });
};

export const mockVersions: PromptVersion[] = [
  {
    id: '1',
    name: 'Initial Draft',
    content: 'You are a helpful AI assistant. Please answer the following question with detailed explanations and examples.',
    timestamp: new Date(Date.now() - 86400000 * 7),
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    response: 'This is a mock response for the initial draft version.',
    responseTime: 1200,
    tokenUsage: { prompt: 25, completion: 150, total: 175 },
    metrics: { quality: 7.5, coherence: 8.0, relevance: 7.8 },
    tags: ['draft', 'initial'],
    notes: 'First attempt at creating a comprehensive prompt'
  },
  {
    id: '2',
    name: 'Refined Version',
    content: 'You are an expert AI assistant with deep knowledge across multiple domains. When answering questions, provide comprehensive explanations with specific examples and actionable insights.',
    timestamp: new Date(Date.now() - 86400000 * 5),
    model: 'gpt-4',
    temperature: 0.5,
    maxTokens: 1500,
    response: 'This is a mock response for the refined version with improved quality.',
    responseTime: 1450,
    tokenUsage: { prompt: 35, completion: 200, total: 235 },
    metrics: { quality: 8.2, coherence: 8.5, relevance: 8.3 },
    parentId: '1',
    tags: ['refined', 'improved'],
    notes: 'Improved specificity and added domain expertise mention'
  },
  {
    id: '3',
    name: 'Optimized Final',
    content: 'You are a highly knowledgeable AI assistant specializing in providing detailed, accurate, and actionable responses. For each query:\n1. Analyze the question thoroughly\n2. Provide comprehensive explanations with examples\n3. Include practical applications where relevant\n4. Ensure clarity and accessibility for the target audience',
    timestamp: new Date(Date.now() - 86400000 * 2),
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2000,
    response: 'This is a mock response for the optimized final version with structured approach.',
    responseTime: 1800,
    tokenUsage: { prompt: 50, completion: 280, total: 330 },
    metrics: { quality: 9.1, coherence: 9.2, relevance: 9.0 },
    parentId: '2',
    tags: ['optimized', 'final', 'structured'],
    notes: 'Added structured approach with numbered steps for consistency'
  }
];