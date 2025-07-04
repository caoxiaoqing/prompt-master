export interface PromptVersion {
  id: string;
  name: string;
  content: string;
  timestamp: Date;
  model: string;
  temperature: number;
  maxTokens: number;
  response?: string;
  responseTime?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  metrics?: {
    quality: number;
    coherence: number;
    relevance: number;
  };
  parentId?: string;
  tags: string[];
  notes: string;
  // 新增：聊天历史记录
  chatHistory?: ChatMessage[];
}

export interface TestResult {
  id: string;
  versionId: string;
  model: string;
  response: string;
  responseTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  supportedFeatures: string[];
}

export interface ABTest {
  id: string;
  name: string;
  versionA: string;
  versionB: string;
  results: TestResult[];
  createdAt: Date;
  status: 'active' | 'completed' | 'paused';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface Comment {
  id: string;
  versionId: string;
  userId: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
}

// 新增：聊天消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  responseTime?: number;
}

// 新增的文件夹和任务类型
export interface PromptTask {
  id: string;
  name: string;
  content: string;
  folderId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  response?: string;
  responseTime?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  metrics?: {
    quality: number;
    coherence: number;
    relevance: number;
  };
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  notes: string;
  versions: PromptVersion[];
  // 新增：当前聊天历史
  currentChatHistory?: ChatMessage[];
  // 新增：当前加载的版本ID，用于记住用户选择的历史版本
  currentLoadedVersionId?: string;
  // 新增：标记任务是否已在数据库中创建
  createdInDB?: boolean;
  // 新增：标记任务是否为未登录用户创建
  isUnauthenticated?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  description?: string;
}

export interface ProjectData {
  folders: Folder[];
  tasks: PromptTask[];
  version: string;
  exportedAt: Date;
}

// 新增：未登录用户使用情况
export interface UnauthenticatedUsage {
  used: number;
  limit: number;
  remaining: number;
  resetTime?: string;
}