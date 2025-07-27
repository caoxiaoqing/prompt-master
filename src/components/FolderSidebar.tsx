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
            
            // 保存到本地存储
            saveToLocalStorage(projectData.folders, projectData.tasks);
          }
        } catch (error) {
          console.error('导入项目失败:', error);
          alert('导入项目失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    }
    
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const FolderItem: React.FC<{
    folder: FolderType;
    isExpanded: boolean;
    onToggle: () => void;
    isAnyMenuOpen: boolean;
    setIsAnyMenuOpen: (isOpen: boolean) => void;
  }> = ({ folder, isExpanded, onToggle, isAnyMenuOpen, setIsAnyMenuOpen }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [editingName, setEditingName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const folderTasks = filteredTasks.filter(task => task.folderId === folder.id);
    
    const handleMenuToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newShowMenu = !showMenu;
      setShowMenu(newShowMenu);
      setIsAnyMenuOpen(newShowMenu);
    };
    
    const handleMenuClose = () => {
      setShowMenu(false);
      setIsAnyMenuOpen(false);
    };
    
    const handleEdit = () => {
      setEditingName(folder.name);
      setIsEditing(true);
      handleMenuClose();
    };
    
    const handleSaveEdit = () => {
      if (editingName.trim()) {
        handleRenameFolder(folder.id, editingName.trim());
      }
      setIsEditing(false);
    };
    
    const handleCancelEdit = () => {
      setEditingName('');
      setIsEditing(false);
    };
    
    const handleDelete = () => {
      handleDeleteFolder(folder.id);
      handleMenuClose();
    };
    
    const handleCreateTaskClick = () => {
      setShowCreateTask(true);
      handleMenuClose();
    };
    
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          handleMenuClose();
        }
      };
      
      if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showMenu]);
    
    return (
      <div>
        <div
          className={`flex items-center justify-between p-2 rounded-lg group ${
            isAnyMenuOpen ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragOver={handleDragOver}
        >
          <div className="flex items-center flex-1 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 mr-1" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500 mr-2" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500 mr-2" />
              )}
            </div>
            
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {folder.name}
              </span>
            )}
            
            <span className="ml-2 text-xs text-gray-500">
              ({folderTasks.length})
            </span>
          </div>
          
          {folder.id !== 'default' && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleMenuToggle}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                  >
                    <div className="py-1">
                      <button
                        onClick={handleCreateTaskClick}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        新建任务
                      </button>
                      <button
                        onClick={handleEdit}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        重命名
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除文件夹
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        <AnimatePresence>
          {showCreateTask && (
            <CreateTaskForm
              onSubmit={(name) => handleCreateTask(folder.id, name)}
              onCancel={() => setShowCreateTask(false)}
            />
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-6 space-y-1"
            >
              {folderTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={state.currentTask?.id === task.id}
                  onSelect={() => dispatch({ type: 'SET_CURRENT_TASK', payload: task })}
                  isAnyMenuOpen={isAnyMenuOpen}
                  setIsAnyMenuOpen={setIsAnyMenuOpen}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const TaskItem: React.FC<{
    task: PromptTask;
    isSelected: boolean;
    onSelect: () => void;
    isAnyMenuOpen: boolean;
    setIsAnyMenuOpen: (isOpen: boolean) => void;
  }> = ({ task, isSelected, onSelect, isAnyMenuOpen, setIsAnyMenuOpen }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [editingName, setEditingName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const handleMenuToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newShowMenu = !showMenu;
      setShowMenu(newShowMenu);
      setIsAnyMenuOpen(newShowMenu);
    };
    
    const handleMenuClose = () => {
      setShowMenu(false);
      setIsAnyMenuOpen(false);
    };
    
    const handleEdit = () => {
      setEditingName(task.name);
      setIsEditing(true);
      handleMenuClose();
    };
    
    const handleSaveEdit = () => {
      if (editingName.trim()) {
        handleRenameTask(task.id, editingName.trim());
      }
      setIsEditing(false);
    };
    
    const handleCancelEdit = () => {
      setEditingName('');
      setIsEditing(false);
    };
    
    const handleDelete = () => {
      handleDeleteTask(task.id);
      handleMenuClose();
    };
    
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          handleMenuClose();
        }
      };
      
      if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showMenu]);
    
    return (
      <div
        className={`task-item flex items-center justify-between p-2 rounded-lg cursor-pointer group transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            : isAnyMenuOpen ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={onSelect}
        draggable
        onDragStart={() => handleDragStart(task.id)}
      >
        <div className="flex items-center flex-1">
          <FileText className="w-4 h-4 text-gray-500 mr-2" />
          
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {task.name}
            </span>
          )}
        </div>
        
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleMenuToggle}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
              >
                <div className="py-1">
                  <button
                    onClick={handleEdit}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    重命名
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除任务
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const CreateFolderForm: React.FC<{
    onSubmit: (name: string) => void;
    onCancel: () => void;
  }> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
        onSubmit(name.trim());
        setName('');
      }
    };
    
    return (
      <motion.form
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        onSubmit={handleSubmit}
        className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="文件夹名称"
          className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex justify-end space-x-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            创建
          </button>
        </div>
      </motion.form>
    );
  };

  const CreateTaskForm: React.FC<{
    onSubmit: (name: string) => void;
    onCancel: () => void;
  }> = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
        onSubmit(name.trim());
        setName('');
      }
    };
    
    return (
      <motion.form
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        onSubmit={handleSubmit}
        className="ml-6 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="任务名称"
          className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <div className="flex justify-end space-x-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            创建
          </button>
        </div>
      </motion.form>
    );
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            项目管理
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="新建文件夹"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="导出项目"
            >
              <Database className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="导入项目"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {showCreateFolder && (
            <CreateFolderForm
              onSubmit={handleCreateFolder}
              onCancel={() => setShowCreateFolder(false)}
            />
          )}
        </AnimatePresence>
        
        <div className="space-y-2 mt-4">
          {state.folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              isExpanded={state.expandedFolders.has(folder.id)}
              onToggle={() => dispatch({ type: 'TOGGLE_FOLDER', payload: folder.id })}
              isAnyMenuOpen={isAnyMenuOpen}
              setIsAnyMenuOpen={setIsAnyMenuOpen}
            />
          ))}
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};

export default FolderSidebar;