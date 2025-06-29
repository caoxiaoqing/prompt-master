import { useCallback } from 'react';
import { Folder, PromptTask } from '../types';

// 本地存储的键名
const STORAGE_KEY = 'prompt-optimizer-data';

export const useLocalStorage = () => {
  // 保存数据到本地存储
  const saveToLocalStorage = useCallback((folders: Folder[], tasks: PromptTask[]) => {
    try {
      console.log('💾 保存数据到本地存储...', {
        foldersCount: folders.length,
        tasksCount: tasks.length
      });
      
      const data = {
        folders,
        tasks,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('✅ 数据已保存到本地存储');
    } catch (error) {
      console.error('❌ 保存到本地存储失败:', error);
    }
  }, []);

  // 从本地存储加载数据
  const loadFromLocalStorage = useCallback(() => {
    try {
      console.log('📂 从本地存储加载数据...');
      
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        console.log('ℹ️ 本地存储中没有数据');
        return null;
      }
      
      const parsedData = JSON.parse(savedData);
      
      // 转换日期字符串为 Date 对象
      const convertDates = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return obj;
        }
        
        if (typeof obj === 'string') {
          // 检查是否是日期字符串
          const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
          if (dateRegex.test(obj)) {
            return new Date(obj);
          }
          return obj;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(convertDates);
        }
        
        if (typeof obj === 'object') {
          const converted: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              // 转换已知的日期字段
              if (['createdAt', 'updatedAt', 'timestamp'].includes(key)) {
                converted[key] = new Date(obj[key]);
              } else {
                converted[key] = convertDates(obj[key]);
              }
            }
          }
          return converted;
        }
        
        return obj;
      };
      
      // 转换日期
      const folders = convertDates(parsedData.folders || []);
      const tasks = convertDates(parsedData.tasks || []);
      
      console.log('✅ 从本地存储加载数据成功', {
        foldersCount: folders.length,
        tasksCount: tasks.length,
        lastUpdated: parsedData.lastUpdated
      });
      
      return { folders, tasks };
    } catch (error) {
      console.error('❌ 从本地存储加载数据失败:', error);
      return null;
    }
  }, []);

  // 清除本地存储
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🧹 本地存储数据已清除');
    } catch (error) {
      console.error('❌ 清除本地存储失败:', error);
    }
  }, []);

  return {
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage
  };
};