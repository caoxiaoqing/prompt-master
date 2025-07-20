import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { PromptVersion, TestResult, ABTest, Comment, PromptTask, Folder, ProjectData } from '../types';
import { useAuth } from './AuthContext';
import { TaskService } from '../lib/taskService';
import { syncService } from '../lib/syncService';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { supabase } from '../lib/supabase';

interface AppState {
  versions: PromptVersion[];
  currentVersion: PromptVersion | null;
  testResults: TestResult[];
  abTests: ABTest[];
  comments: Comment[];
  selectedModel: string;
  selectedCustomModel: any | null; // 当前选中的自定义模型配置
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeTab: 'editor' | 'versions' | 'analytics' | 'tests';
  
  // 新增的文件夹和任务状态
  folders: Folder[];
  tasks: PromptTask[];
  currentTask: PromptTask | null;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  
  // 数据同步状态
  isDataLoaded: boolean;
  isSyncing: boolean;
  
  // 新增：未登录模式状态
  isUnauthenticatedMode: boolean;
  unauthenticatedUsage: {
    used: number;
    limit: number;
    remaining: number;
  };
}

type AppAction =
  | { type: 'SET_VERSIONS'; payload: PromptVersion[] }
  | { type: 'SET_CURRENT_VERSION'; payload: PromptVersion | null }
  | { type: 'ADD_VERSION'; payload: PromptVersion }
  | { type: 'UPDATE_VERSION'; payload: PromptVersion }
  | { type: 'DELETE_VERSION'; payload: string }
  | { type: 'ADD_TEST_RESULT'; payload: TestResult }
  | { type: 'SET_SELECTED_MODEL'; payload: string }
  | { type: 'SET_SELECTED_CUSTOM_MODEL'; payload: any | null }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_ACTIVE_TAB'; payload: AppState['activeTab'] }
  | { type: 'ADD_COMMENT'; payload: Comment }
  
  // 新增的文件夹和任务操作
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: Folder }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'ADD_TASK'; payload: PromptTask }
  | { type: 'UPDATE_TASK'; payload: PromptTask }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_CURRENT_TASK'; payload: PromptTask | null }
  | { type: 'SET_SELECTED_FOLDER'; payload: string | null }
  | { type: 'TOGGLE_FOLDER'; payload: string }
  | { type: 'MOVE_TASK'; payload: { taskId: string; targetFolderId: string } }
  | { type: 'IMPORT_PROJECT'; payload: ProjectData }
  | { type: 'LOAD_FROM_STORAGE' }
  | { type: 'SAVE_TO_STORAGE' }
  | { type: 'LOAD_FROM_DATABASE'; payload: { folders: Folder[]; tasks: PromptTask[] } }
  | { type: 'SET_DATA_LOADED'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_UNAUTHENTICATED_MODE'; payload: boolean }
  | { type: 'UPDATE_UNAUTH_USAGE'; payload: { used: number; limit: number; remaining: number } }
  | { type: 'SYNC_UNAUTH_DATA_TO_DB' }
  | { type: 'CLEAR_UNAUTH_DATA' };

const initialState: AppState = {
  versions: [],
  currentVersion: null,
  testResults: [],
  abTests: [],
  comments: [],
  selectedModel: 'gpt-4',
  selectedCustomModel: null,
  theme: 'dark',
  sidebarOpen: true,
  activeTab: 'editor',
  
  folders: [
    {
      id: 'default',
      name: '默认文件夹',
      createdAt: new Date(),
      updatedAt: new Date(),
      color: '#3B82F6'
    }
  ],
  tasks: [],
  currentTask: null,
  selectedFolderId: 'default',
  expandedFolders: new Set(['default']),
  
  isDataLoaded: false,
  isSyncing: false,
  
  isUnauthenticatedMode: true, // 默认为未登录模式
  unauthenticatedUsage: {
    used: 0,
    limit: 10,
    remaining: 10
  }
};

// Helper function to convert date strings back to Date objects
function convertDatesToObjects(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Check if the string looks like a date
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (dateRegex.test(obj)) {
      return new Date(obj);
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToObjects);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Convert known date fields
        if (['createdAt', 'updatedAt', 'timestamp'].includes(key)) {
          converted[key] = new Date(obj[key]);
        } else {
          converted[key] = convertDatesToObjects(obj[key]);
        }
        console.error('同步到数据库失败:', error)
        // Show user-friendly message instead of crashing
        console.warn('⚠️ App running in offline mode due to connection issues')
      }
    }
    return converted;
  }
  
  return obj;
}

function appReducer(state: AppState, action: AppAction): AppState {
  let newState: AppState;
  
  switch (action.type) {
    case 'SET_VERSIONS':
      return { ...state, versions: action.payload };
    case 'SET_CURRENT_VERSION':
      return { ...state, currentVersion: action.payload };
    case 'ADD_VERSION':
      return { ...state, versions: [...state.versions, action.payload] };
    case 'UPDATE_VERSION':
      return {
        ...state,
        versions: state.versions.map(v => 
          v.id === action.payload.id ? action.payload : v
        ),
        currentVersion: state.currentVersion?.id === action.payload.id 
          ? action.payload 
          : state.currentVersion
      };
    case 'DELETE_VERSION':
      return {
        ...state,
        versions: state.versions.filter(v => v.id !== action.payload),
        currentVersion: state.currentVersion?.id === action.payload 
          ? null 
          : state.currentVersion
      };
    case 'ADD_TEST_RESULT':
      return { ...state, testResults: [...state.testResults, action.payload] };
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload };
    case 'SET_SELECTED_CUSTOM_MODEL':
      return { 
        ...state, 
        selectedCustomModel: action.payload,
        selectedModel: action.payload ? action.payload.name : 'gpt-4'
      };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'ADD_COMMENT':
      return { ...state, comments: [...state.comments, action.payload] };
      
    // 文件夹操作
    case 'ADD_FOLDER':
      newState = { ...state, folders: [...state.folders, action.payload] };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'UPDATE_FOLDER':
      newState = {
        ...state,
        folders: state.folders.map(f => 
          f.id === action.payload.id ? action.payload : f
        )
      };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'DELETE_FOLDER':
      // 删除文件夹时，将其中的任务移动到默认文件夹
      newState = {
        ...state,
        folders: state.folders.filter(f => f.id !== action.payload),
        tasks: state.tasks.map(t => 
          t.folderId === action.payload ? { ...t, folderId: 'default' } : t
        ),
        selectedFolderId: state.selectedFolderId === action.payload ? 'default' : state.selectedFolderId
      };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
      
    // 任务操作
    case 'ADD_TASK':
      newState = { ...state, tasks: [...state.tasks, action.payload] };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'UPDATE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.map(t => 
          t.id === action.payload.id ? action.payload : t
        ),
        currentTask: state.currentTask?.id === action.payload.id 
          ? action.payload 
          : state.currentTask
      };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'DELETE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
        currentTask: state.currentTask?.id === action.payload ? null : state.currentTask
      };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'SET_CURRENT_TASK':
      newState = { ...state, currentTask: action.payload };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'SET_SELECTED_FOLDER':
      newState = { ...state, selectedFolderId: action.payload };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'TOGGLE_FOLDER':
      const newExpandedFolders = new Set(state.expandedFolders);
      if (newExpandedFolders.has(action.payload)) {
        newExpandedFolders.delete(action.payload);
      } else {
        newExpandedFolders.add(action.payload);
      }
      newState = { ...state, expandedFolders: newExpandedFolders };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'MOVE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.map(t => 
          t.id === action.payload.taskId 
            ? { ...t, folderId: action.payload.targetFolderId, updatedAt: new Date() }
            : t
        )
      };
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: newState.folders,
        tasks: newState.tasks,
        selectedFolderId: newState.selectedFolderId
      }));
      break;
    case 'IMPORT_PROJECT':
      newState = {
        ...state,
        folders: action.payload.folders,
        tasks: action.payload.tasks
      };
      break;
    case 'LOAD_FROM_STORAGE':
      const savedData = localStorage.getItem('prompt-optimizer-data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Convert date strings back to Date objects
          const convertedData = convertDatesToObjects(parsed);
          newState = {
            ...state,
            folders: convertedData.folders || state.folders,
            tasks: convertedData.tasks || state.tasks,
            selectedFolderId: convertedData.selectedFolderId || state.selectedFolderId
          };
        } catch (error) {
          console.error('Failed to load from storage:', error);
          newState = state;
        }
      } else {
        newState = state;
      }
      break;
    case 'SAVE_TO_STORAGE':
      localStorage.setItem('prompt-optimizer-data', JSON.stringify({
        folders: state.folders,
        tasks: state.tasks,
        selectedFolderId: state.selectedFolderId
      }));
      newState = state;
      break;
    case 'LOAD_FROM_DATABASE':
      newState = {
        ...state,
        folders: action.payload.folders,
        tasks: action.payload.tasks,
        isDataLoaded: true
      };
      break;
    case 'SET_DATA_LOADED':
      newState = { ...state, isDataLoaded: action.payload };
      break;
    case 'SET_SYNCING':
      newState = { ...state, isSyncing: action.payload };
      break;
    case 'SET_UNAUTHENTICATED_MODE':
      newState = { ...state, isUnauthenticatedMode: action.payload };
      break;
    case 'UPDATE_UNAUTH_USAGE':
      newState = { 
        ...state, 
        unauthenticatedUsage: action.payload 
      };
      break;
    case 'SYNC_UNAUTH_DATA_TO_DB':
      // 将未登录数据标记为需要同步到数据库
      newState = {
        ...state,
        tasks: state.tasks.map(task => ({
          ...task,
          isUnauthenticated: false,
          createdInDB: false // 标记为需要创建到数据库
        }))
      };
      break;
    case 'CLEAR_UNAUTH_DATA':
      // 清除未登录数据
      newState = {
        ...state,
        folders: [
          {
            id: 'default',
            name: '默认文件夹',
            createdAt: new Date(),
            updatedAt: new Date(),
            color: '#3B82F6'
          }
        ],
        tasks: [],
        currentTask: null,
        unauthenticatedUsage: {
          used: 0,
          limit: 10,
          remaining: 10
        }
      };
      break;
    default:
      return state;
  }
  
  return newState;
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  syncToDatabase: () => Promise<void>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user } = useAuth(); 
  const { loadFromLocalStorage } = useLocalStorage();
  
  // 监听用户登录状态变化，处理未登录到登录的转换
  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (user && state.isUnauthenticatedMode) {
        console.log('🔄 用户登录，处理未登录数据转换...');
        
        // 设置为已登录模式
        dispatch({ type: 'SET_UNAUTHENTICATED_MODE', payload: false });
        
        try {
          // 检查是否为新注册用户（通过检查数据库中是否有任务记录）
          const existingTasks = await TaskService.getUserTasks(user.id);
          
          if (existingTasks.length === 0) {
            // 新注册用户：保留未登录时的任务信息并同步到服务端
            console.log('🆕 新注册用户，同步未登录数据到数据库');
            dispatch({ type: 'SYNC_UNAUTH_DATA_TO_DB' });
            
            // 这里的实际同步逻辑会在 useTaskPersistence 中处理
          } else {
            // 已注册用户：丢弃未登录数据，加载用户的历史数据
            console.log('👤 已注册用户，加载历史数据');
            dispatch({ type: 'CLEAR_UNAUTH_DATA' });
            
            // 从数据库加载用户数据
            // 这里需要将 TaskInfo 转换为 PromptTask 格式
            const folders = [
              {
                id: 'default',
                name: '默认文件夹',
                createdAt: new Date(),
                updatedAt: new Date(),
                color: '#3B82F6'
              }
            ];
            
            const tasks: PromptTask[] = existingTasks.map(taskInfo => ({
              id: taskInfo.task_id?.toString() || '',
              name: taskInfo.task_name || '',
              content: taskInfo.system_prompt || '',
              folderId: 'default', // 暂时都放在默认文件夹
              model: 'gpt-4',
              temperature: taskInfo.model_params?.temperature || 0.7,
              maxTokens: taskInfo.model_params?.max_tokens || 1000,
              createdAt: new Date(taskInfo.created_at || Date.now()),
              updatedAt: new Date(),
              tags: [],
              notes: '',
              versions: [],
              currentChatHistory: TaskService.convertChatInfoToMessages(taskInfo.chatinfo || []),
              createdInDB: true
            }));
            
            dispatch({ 
              type: 'LOAD_FROM_DATABASE', 
              payload: { folders, tasks } 
            });
          }
          
          // 清除本地未登录使用计数
          localStorage.removeItem('unauth-usage-count');
          localStorage.removeItem('unauth-usage-date');
          
        } catch (error) {
          console.error('❌ 处理登录状态转换失败:', error);
        }
      } else if (!user && !state.isUnauthenticatedMode) {
        // 用户登出，切换回未登录模式
        console.log('🚪 用户登出，切换到未登录模式');
        dispatch({ type: 'SET_UNAUTHENTICATED_MODE', payload: true });
        dispatch({ type: 'CLEAR_UNAUTH_DATA' });
      }
    };

    handleAuthStateChange();
  }, [user, state.isUnauthenticatedMode]);
  
  // 🔄 数据同步到数据库的函数
  const syncToDatabase = async (force = false) => {
    if (!user || state.isSyncing) return;

    try {
      console.log('🔄 开始同步数据到数据库...');
      dispatch({ type: 'SET_SYNCING', payload: true });

      // 新的任务持久化系统使用实时同步，不需要批量同步
      console.log('ℹ️ 新的任务持久化系统使用实时同步');
      
      console.log('✅ 数据同步到数据库完成');
    } catch (error) {
      console.error('❌ 数据同步到数据库失败:', error);
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // 初始化时从本地存储加载数据
  useEffect(() => {
    if (state.isUnauthenticatedMode) {
      console.log('🔄 未登录模式：从本地存储加载数据...');
      
      // 从本地存储加载数据
      const localData = loadFromLocalStorage();
      
      if (localData) {
        console.log('✅ 从本地存储加载数据成功，更新应用状态');
        
        // 确保至少有默认文件夹
        const folders = localData.folders.length > 0 
          ? localData.folders 
          : [
              {
                id: 'default',
                name: '默认文件夹',
                createdAt: new Date(),
                updatedAt: new Date(),
                color: '#3B82F6'
              }
            ];
        
        // 标记任务为未登录创建
        const tasks = localData.tasks.map(task => ({
          ...task,
          isUnauthenticated: true,
          createdInDB: false
        }));
        
        // 更新应用状态
        dispatch({ 
          type: 'LOAD_FROM_DATABASE', 
          payload: { folders, tasks } 
        });
      } else {
        console.log('ℹ️ 本地存储中没有数据，使用初始状态');
        dispatch({ type: 'SET_DATA_LOADED', payload: true });
      }
      
      // 加载未登录用户的使用计数
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem('unauth-usage-date');
      const savedCount = localStorage.getItem('unauth-usage-count');
      
      if (savedDate === today && savedCount) {
        const used = parseInt(savedCount, 10) || 0;
        dispatch({ 
          type: 'UPDATE_UNAUTH_USAGE', 
          payload: { used, limit: 10, remaining: Math.max(0, 10 - used) }
        });
      } else {
        // 新的一天，重置计数
        localStorage.setItem('unauth-usage-date', today);
        localStorage.setItem('unauth-usage-count', '0');
        dispatch({ 
          type: 'UPDATE_UNAUTH_USAGE', 
          payload: { used: 0, limit: 10, remaining: 10 }
        });
      }
    }
  }, [state.isUnauthenticatedMode, loadFromLocalStorage]);

  // 📥 用户登录后从数据库加载数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || state.isDataLoaded || state.isUnauthenticatedMode) return;

      try {
        console.log('📥 开始从数据库加载用户数据...');
        dispatch({ type: 'SET_SYNCING', payload: true });

        // 新的任务持久化系统暂时使用本地存储
        // 从本地存储加载数据
        const localData = loadFromLocalStorage();
        
        // 如果本地存储有数据，使用本地数据
        const folders = localData?.folders || state.folders;
        const tasks = localData?.tasks || state.tasks;
        
        // 确保至少有默认文件夹
        if (folders.length === 0) {
          folders.push({
            id: 'default',
            name: '默认文件夹',
            createdAt: new Date(),
            updatedAt: new Date(),
            color: '#3B82F6'
          });
        }

        dispatch({ 
          type: 'LOAD_FROM_DATABASE', 
          payload: { folders, tasks } 
        });

        console.log('✅ 用户数据加载完成');
      } catch (error) {
        console.error('❌ 从数据库加载用户数据失败:', error);
        // 如果加载失败，使用本地存储的数据
        dispatch({ type: 'LOAD_FROM_STORAGE' });
        dispatch({ type: 'SET_DATA_LOADED', payload: true });
      } finally {
        dispatch({ type: 'SET_SYNCING', payload: false });
      }
    };

    if (user && !state.isUnauthenticatedMode) {
      loadUserData();
    } else {
      // 用户未登录时，清除数据加载状态
      dispatch({ type: 'SET_DATA_LOADED', payload: false });
    }
  }, [user, state.isDataLoaded, state.isUnauthenticatedMode]);

  // === 新增：未登录 usage 初始化 ===
  useEffect(() => {
    if (state.isUnauthenticatedMode) {
      supabase.functions.invoke('initialize_usage_status', { body: {} })
        .then(({ data, error }) => {
          if (!error && data && !data.error) {
            dispatch({ type: 'UPDATE_UNAUTH_USAGE', payload: data });
          } else if (data && data.error) {
            dispatch({ type: 'UPDATE_UNAUTH_USAGE', payload: data });
            window.alert('今日免费消息次数已用完，请登录继续使用');
          } else {
            if (error) {
              console.error('获取未登录 usage 状态失败:', error);
            }
          }
        })
        .catch((err) => {
          console.error('获取未登录 usage 状态失败:', err);
        });
    }
    // eslint-disable-next-line
  }, [state.isUnauthenticatedMode]);

  return (
    <AppContext.Provider value={{ state, dispatch, syncToDatabase }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};