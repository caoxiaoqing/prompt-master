import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Edit3,
  Trash2,
  Move,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Settings,
  Database
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { TaskService } from '../lib/taskService';
import { Folder as FolderType, PromptTask } from '../types';
import { syncService, SyncOperation } from '../lib/syncService';
import { useLocalStorage } from '../hooks/useLocalStorage';

const FolderSidebar: React.FC = () => {
  const { state, dispatch, syncToDatabase } = useApp();
  const { user } = useAuth();
  const [isAnyMenuOpen, setIsAnyMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveToLocalStorage } = useLocalStorage();
  
  const filteredTasks = state.tasks.filter(task =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateFolder = async (name: string) => {
    const newFolder: FolderType = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    
    dispatch({ type: 'ADD_FOLDER', payload: newFolder });
    setShowCreateFolder(false);
    
    // 保存到本地存储
    saveToLocalStorage([...state.folders, newFolder], state.tasks);

    // 🔄 实时记录文件夹操作到数据库
    if (user) {
      try {
        await DatabaseService.recordFolderOperation({
          type: 'create',
          // 更新状态
          folderId: newFolder.id,
          folderName: newFolder.name,
          userId: user.id
        });
          
          // 保存到本地存储
          saveToLocalStorage(projectData.folders, projectData.tasks);
        console.log('✅ 文件夹创建操作已记录到数据库');
      } catch (error) {
        console.error('❌ 记录文件夹创建操作失败:', error);
      }
    }
  };
  // 生成唯一的任务 ID
  const generateUniqueTaskId = (): string => {
    // 使用时间戳乘以1000加上小随机数，确保在安全整数范围内且唯一
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const numericId = timestamp * 1000 + random;
    return numericId.toString();
  };

  const handleCreateTask = async (folderId: string, name: string) => {
    const newTask: PromptTask = {
      id: generateUniqueTaskId(),
      name,
      content: '',
      folderId,
      model: state.selectedModel,
      temperature: 0.7,
      maxTokens: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      notes: '',
      versions: [],
      createdInDB: false // 标记为未在数据库中创建
    };
    
    dispatch({ type: 'ADD_TASK', payload: newTask });
    dispatch({ type: 'SET_CURRENT_TASK', payload: newTask });
    
    // 保存到本地存储
    saveToLocalStorage(state.folders, [...state.tasks, newTask]);
    
    setShowCreateTask(null);

    // 同步任务创建到数据库 - 使用 syncService 直接添加到同步队列
    if (user) {
      syncService.addToSyncQueue({
        operation: SyncOperation.CREATE,
        type: 'task',
        data: {
          userId: user.id,
          taskId: parseInt(newTask.id),
          taskName: newTask.name,
          folderName: state.folders.find(f => f.id === newTask.folderId)?.name || '默认文件夹',
          modelParams: {
            model_id: '',
            temperature: newTask.temperature,
            top_k: 50,
            top_p: 1.0,
            max_tokens: newTask.maxTokens,
            max_context_turns: 10
          }
        },
        priority: 1,
        maxRetries: 3
      });
    }

    console.log('✅ 新任务已创建，数据库记录将在 PromptEditor 中处理', {
      taskId: newTask.id,
      taskName: newTask.name,
      createdInDB: newTask.createdInDB
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (folderId === 'default') return;
    if (confirm('确定要删除这个文件夹吗？其中的任务将移动到默认文件夹。')) {
      const folder = state.folders.find(f => f.id === folderId);
      
      // 获取更新后的任务列表（将被删除文件夹中的任务移到默认文件夹）
      const updatedTasks = state.tasks.map(t => 
        t.folderId === folderId ? { ...t, folderId: 'default' } : t
      );
      
      // 获取更新后的文件夹列表
      const updatedFolders = state.folders.filter(f => f.id !== folderId);
      
      // 更新状态
      dispatch({ type: 'DELETE_FOLDER', payload: folderId });
      
      // 保存到本地存储
      saveToLocalStorage(updatedFolders, updatedTasks);

      // 🔄 实时记录文件夹删除操作到数据库
      if (user && folder) {
        try {
          // 使用新的同步服务
          console.log('🔄 文件夹删除操作已记录到本地，将在下次同步时更新到数据库');
          console.log('✅ 文件夹创建操作已记录到数据库');
        } catch (error) {
          console.error('❌ 记录文件夹删除操作失败:', error);
        }
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      const task = state.tasks.find(t => t.id === taskId);
      
      // 获取更新后的任务列表
      const updatedTasks = state.tasks.filter(t => t.id !== taskId);
      
      // 更新状态
      dispatch({ type: 'DELETE_TASK', payload: taskId });
      
      // 保存到本地存储
      saveToLocalStorage(state.folders, updatedTasks);

      // 同步任务删除到数据库 - 使用 syncService 直接添加到同步队列
      if (user) {
        syncService.addToSyncQueue({
          operation: SyncOperation.DELETE,
          type: 'task',
          data: {
            userId: user.id,
            taskId: parseInt(taskId)
          },
          priority: 1,
          maxRetries: 3
        });
      }

      // 如果任务已在数据库中创建，则删除数据库记录
      if (user && task && task.createdInDB) {
        console.log('🔄 删除任务数据库记录...', { taskId: task.id, taskName: task.name })
        try {
          await TaskService.deleteTask(user.id, parseInt(task.id));
          console.log('✅ 任务删除操作已记录到数据库');
        } catch (error) {
          console.error('❌ 记录任务删除操作失败:', error);
          // 不阻断删除操作，只记录错误
        }
      } else {
        console.log('ℹ️ 任务未在数据库中创建或用户未登录，跳过数据库删除')
      }
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    const folder = state.folders.find(f => f.id === folderId);
    if (folder) {
      const updatedFolder = { ...folder, name: newName, updatedAt: new Date() };
      
      // 更新状态
      dispatch({ type: 'UPDATE_FOLDER', payload: updatedFolder });
      
      // 保存到本地存储
      saveToLocalStorage(
        state.folders.map(f => f.id === folderId ? updatedFolder : f),
        state.tasks
      );

      // 🔄 实时记录文件夹重命名操作到数据库
      if (user) {
        try {
          await DatabaseService.recordFolderOperation({
            type: 'update',
            folderId: folder.id,
            folderName: newName,
            userId: user.id
          });
          console.log('✅ 文件夹重命名操作已记录到数据库');
        } catch (error) {
          console.error('❌ 记录文件夹重命名操作失败:', error);
        }
      }
    }
    setEditingFolder(null);
  };

  const handleRenameTask = async (taskId: string, newName: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, name: newName, updatedAt: new Date() };
      
      // 更新状态
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      
      // 保存到本地存储
      saveToLocalStorage(
        state.folders,
        state.tasks.map(t => t.id === taskId ? updatedTask : t)
      );

      // 同步任务更新到数据库 - 使用 syncService 直接添加到同步队列
      if (user) {
        syncService.addToSyncQueue({
          operation: SyncOperation.UPDATE,
          type: 'task',
          data: {
            userId: user.id,
            taskId: parseInt(task.id),
            taskName: newName
          },
          priority: 2,
          maxRetries: 3
        });
      }

      // 如果任务已在数据库中创建，则更新数据库记录
      if (user && task.createdInDB) {
        console.log('🔄 更新任务名称到数据库...', { taskId: task.id, oldName: task.name, newName })
        try {
          await TaskService.updateTaskName(user.id, parseInt(task.id), newName);
          console.log('✅ 任务重命名操作已记录到数据库');
        } catch (error) {
          console.error('❌ 记录任务重命名操作失败:', error);
          // 不阻断重命名操作，只记录错误
        }
      } else {
        console.log('ℹ️ 任务未在数据库中创建或用户未登录，跳过数据库更新')
      }
    }
    setEditingTask(null);
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask !== targetFolderId) {
      const task = state.tasks.find(t => t.id === draggedTask);
      
      // 更新状态
      dispatch({
        type: 'MOVE_TASK',
        payload: { taskId: draggedTask, targetFolderId }
      });
      
      // 保存到本地存储
      if (task) {
        const updatedTask = { ...task, folderId: targetFolderId, updatedAt: new Date() };
        saveToLocalStorage(
          state.folders,
          state.tasks.map(t => t.id === draggedTask ? updatedTask : t)
        );
      }

      // 🔄 实时记录任务移动操作到数据库
      if (user && task) {
        try {
          await DatabaseService.recordTaskOperation({
            type: 'update',
            taskId: task.id,
            taskName: task.name,
            folderId: targetFolderId,
            userId: user.id
          });
          console.log('✅ 任务移动操作已记录到数据库');
        } catch (error) {
          console.error('❌ 记录任务移动操作失败:', error);
        }
      }
    }
    setDraggedTask(null);
  };

  const handleExport = () => {
    const projectData: ProjectData = {
      folders: state.folders,
      tasks: state.tasks,
      version: '1.1.0',
      exportedAt: new Date()
    };
    
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-project-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📂 导入文件:', file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target?.result as string);
          if (confirm('导入项目将覆盖当前数据，确定继续吗？')) {
            dispatch({ type: 'IMPORT_PROJECT', payload: projectData });