import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { PromptVersion, TestResult, ABTest, Comment, PromptTask, Folder, ProjectData } from '../types';
import { useAuth } from './AuthContext';
import { isSupabaseAvailable } from '../lib/supabase';
import { DatabaseService } from '../lib/database';

interface AppState {
  versions: PromptVersion[];
  currentVersion: PromptVersion | null;
  testResults: TestResult[];
  abTests: ABTest[];
  comments: Comment[];
  selectedModel: string;
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
}

type AppAction =
  | { type: 'SET_VERSIONS'; payload: PromptVersion[] }
  | { type: 'SET_CURRENT_VERSION'; payload: PromptVersion | null }
  | { type: 'ADD_VERSION'; payload: PromptVersion }
  | { type: 'UPDATE_VERSION'; payload: PromptVersion }
  | { type: 'DELETE_VERSION'; payload: string }
  | { type: 'ADD_TEST_RESULT'; payload: TestResult }
  | { type: 'SET_SELECTED_MODEL'; payload: string }
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
  | { type: 'SET_SYNCING'; payload: boolean };

const initialState: AppState = {
  versions: [],
  currentVersion: null,
  testResults: [],
  abTests: [],
  comments: [],
  selectedModel: 'gpt-4',
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
  isSyncing: false
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
      break;
    case 'UPDATE_FOLDER':
      newState = {
        ...state,
        folders: state.folders.map(f => 
          f.id === action.payload.id ? action.payload : f
        )
      };
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
      break;
      
    // 任务操作
    case 'ADD_TASK':
      newState = { ...state, tasks: [...state.tasks, action.payload] };
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
      break;
    case 'DELETE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
        currentTask: state.currentTask?.id === action.payload ? null : state.currentTask
      };
      break;
    case 'SET_CURRENT_TASK':
      newState = { ...state, currentTask: action.payload };
      break;
    case 'SET_SELECTED_FOLDER':
      newState = { ...state, selectedFolderId: action.payload };
      break;
    case 'TOGGLE_FOLDER':
      const newExpandedFolders = new Set(state.expandedFolders);
      if (newExpandedFolders.has(action.payload)) {
        newExpandedFolders.delete(action.payload);
      } else {
        newExpandedFolders.add(action.payload);
      }
      newState = { ...state, expandedFolders: newExpandedFolders };
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

  // 🔄 数据同步到数据库的函数
  const syncToDatabase = async () => {
    if (!user || state.isSyncing) return;
    
    // 检查 Supabase 连接状态
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Skipping sync - Supabase unavailable');
      return;
    }

    try {
      console.log('🔄 开始同步数据到数据库...');
      dispatch({ type: 'SET_SYNCING', payload: true });

      await DatabaseService.syncLocalDataToDatabase(user.id, state.folders, state.tasks);
      
      console.log('✅ 数据同步到数据库完成');
    } catch (error) {
      console.error('❌ 数据同步失败:', error);
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // 📥 用户登录后从数据库加载数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || state.isDataLoaded) return;

      try {
        console.log('📥 开始从数据库加载用户数据...');
        dispatch({ type: 'SET_SYNCING', payload: true });

        const { folders, tasks } = await DatabaseService.loadUserDataFromDatabase(user.id);
        
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

    if (user) {
      loadUserData();
    } else {
      // 用户未登录时，清除数据加载状态
      dispatch({ type: 'SET_DATA_LOADED', payload: false });
    }
  }, [user, state.isDataLoaded]);

  // 🔄 监听数据变化，定时同步到数据库（5秒一次）
  useEffect(() => {
    if (!user || !state.isDataLoaded || state.isSyncing) return;

    // 防抖：延迟同步，避免频繁操作
    const timeoutId = setTimeout(() => {
      syncToDatabase();
    }, 5000); // 修改为5秒后同步

    return () => clearTimeout(timeoutId);
  }, [state.folders, state.tasks, user, state.isDataLoaded, state.isSyncing]);

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