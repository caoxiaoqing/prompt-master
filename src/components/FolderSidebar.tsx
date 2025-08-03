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
            
            console.log('✅ 项目导入成功');
          }
        } catch (error) {
          alert('导入失败：文件格式不正确');
          console.error('❌ 项目导入失败:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleManualSync = async () => {
    if (state.isSyncing) return;

    try {
      console.log('🔄 手动同步已禁用，使用本地存储');
      // 保存到本地存储
      saveToLocalStorage(state.folders, state.tasks);
      alert('数据已保存到本地存储！');
    } catch (error) {
      console.error('手动同步失败:', error);
      alert('数据同步失败，请稍后重试');
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col max-h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">项目管理</h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="新建文件夹"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Folder Tree - 可滚动区域 */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {state.folders.map((folder, index) => (
          <FolderItem
            key={folder.id}
            index={index}
            folder={folder}
            tasks={filteredTasks.filter(t => t.folderId === folder.id)}
            isExpanded={state.expandedFolders.has(folder.id)}
            onToggle={() => dispatch({ type: 'TOGGLE_FOLDER', payload: folder.id })}
            onCreateTask={() => setShowCreateTask(folder.id)}
            onDeleteFolder={() => handleDeleteFolder(folder.id)}
            onRenameFolder={(name) => handleRenameFolder(folder.id, name)}
            onSelectTask={(task) => dispatch({ type: 'SET_CURRENT_TASK', payload: task })}
            onDeleteTask={handleDeleteTask}
            onRenameTask={handleRenameTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, folder.id)}
            currentTaskId={state.currentTask?.id}
            editingFolder={editingFolder}
            setEditingFolder={setEditingFolder}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
          />
        ))}
      </div>

      {/* 底部统计栏 - 显示文件夹数、任务数和数据状态 */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          {/* 左侧统计信息 */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Folder size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-gray-600 dark:text-gray-400">文件夹</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {state.folders.length}
              </span>
            </div>
            
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            
            <div className="flex items-center space-x-2">
              <FileText size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-gray-600 dark:text-gray-400">任务</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {state.tasks.length}
              </span>
            </div>
          </div>
          
          {/* 右侧数据状态 */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-400">
              {state.isDataLoaded ? '已加载' : '加载中...'}
            </span>
          </div>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Create Folder Modal */}
      <AnimatePresence>
        {showCreateFolder && (
          <CreateModal
            title="新建文件夹"
            placeholder="输入文件夹名称..."
            onConfirm={handleCreateFolder}
            onCancel={() => setShowCreateFolder(false)}
          />
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateTask && (
          <CreateModal
            title="新建任务"
            placeholder="输入任务名称..."
            onConfirm={(name) => handleCreateTask(showCreateTask, name)}
            onCancel={() => setShowCreateTask(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// FolderItem 组件保持不变，只是移除了内部的数据库操作逻辑
const FolderItem: React.FC<{
  index: string;
  folder: FolderType;
  tasks: PromptTask[];
  isExpanded: boolean;
  onToggle: () => void;
  onCreateTask: () => void;
  onDeleteFolder: () => void;
  onRenameFolder: (name: string) => void;
  onSelectTask: (task: PromptTask) => void;
  onDeleteTask: (taskId: string) => void;
  onRenameTask: (taskId: string, name: string) => void;
  onDragStart: (taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  currentTaskId?: string;
  editingFolder: string | null;
  setEditingFolder: (id: string | null) => void;
  editingTask: string | null;
  setEditingTask: (id: string | null) => void;
}> = ({
  index,
  folder,
  tasks,
  isExpanded,
  onToggle,
  onCreateTask,
  onDeleteFolder,
  onRenameFolder,
  onSelectTask,
  onDeleteTask,
  onRenameTask,
  onDragStart,
  onDragOver,
  onDrop,
  currentTaskId,
  editingFolder,
  setEditingFolder,
  editingTask,
  setEditingTask
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [menuPosition, setMenuPosition] = useState<DOMRect | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (moreButtonRef.current) {
      // 获取菜单按钮的位置信息
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMenuPosition(rect);
    }
    
    setShowMenu(!showMenu);
    setMenuHovered(false);
  };

  // 处理文件夹名称点击 - 切换展开/收起状态
  const handleFolderNameClick = (e: React.MouseEvent) => {
    // 如果正在编辑，不触发切换
    if (editingFolder === folder.id) {
      return;
    }
    
    // 阻止事件冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 切换文件夹展开状态
    onToggle();
  };

  // 点击其他地方时关闭菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menuElement = document.querySelector(".folder-menu, .task-menu");
      if (menuElement && !menuElement.contains(event.target as Node) && !menuHovered) {
        setShowMenu(false);
        setMenuHovered(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu, menuHovered]);

  return (
    <div
      className="mb-1 folder-content"
      style={{position: 'relative', zIndex: 100 - index}}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Folder Header */}
      <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group"
        style={{position: 'relative', zIndex: 100 - index}}>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* 展开/收起按钮 */}
          <button 
            onClick={onToggle} 
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title={isExpanded ? "收起文件夹" : "展开文件夹"}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )}
          </button>
          
          {/* 文件夹图标 */}
          {isExpanded ? (
            <FolderOpen size={16} style={{ color: folder.color }} />
          ) : (
            <Folder size={16} style={{ color: folder.color }} />
          )}
          
          {/* 文件夹名称 - 点击可切换展开/收起 */}
          {editingFolder === folder.id ? (
            <input
              type="text"
              defaultValue={folder.name}
              autoFocus
              onBlur={(e) => onRenameFolder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRenameFolder((e.target as HTMLInputElement).value);
                } else if (e.key === 'Escape') {
                  setEditingFolder(null);
                }
              }}
              onClick={(e) => e.stopPropagation()} // 防止编辑时触发切换
              className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
            />
          ) : (
            <span 
              className="text-sm font-medium truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={handleFolderNameClick}
              title={`点击${isExpanded ? '收起' : '展开'}文件夹`}
            >
              {folder.name}
            </span>
          )}
          
          {/* 任务数量标签 */}
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        
        {/* 操作按钮 */}
        <div className={`flex items-center space-x-1 transition-opacity relative ${showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateTask();
            }}
            className="flex items-center justify-center w-6 h-6 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            //className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="新建任务"
          >
            <Plus size={12} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="flex items-center justify-center w-6 h-6 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              //className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              title="更多操作"
            >
              <MoreHorizontal size={12} />
            </button>
            {showMenu && (
              <div 
                className="folder-menu absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[120px]"
                style={{
                  // 关键修复：使用极高的 z-index 确保菜单在最上层
                  zIndex: 99999,
                  // 位于正下方
                  //top: "100%",
                  //right: 0,
                  // 根据父元素位置计算定位
                  top: "100%", //menuPosition?.top + menuPosition?.height, // + window.scrollY,
                  //left: menuPosition?.left,
                  right: 0,
                  // 确保菜单不会被其他元素遮挡
                  position: 'absolute', //fixed', //'absolute',
                  // 防止菜单影响其他元素的布局
                  contain: 'paint' //'layout'
                }}
                onClick={(e) => e.stopPropagation()} // 防止点击菜单时关闭
                // 添加新的鼠标事件处理器
                onMouseDown={(e) => e.stopPropagation()} // 防止触发全局点击检测
                onMouseEnter={() => setMenuHovered(true)} // 标记菜单悬停状态
                onMouseLeave={() => setMenuHovered(false)} // 标记菜单离开状态
              >
                <button
                  onClick={() => {
                    setEditingFolder(folder.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Edit3 size={12} />
                  <span>重命名</span>
                </button>
                {folder.id !== 'default' && (
                  <button
                    onClick={() => {
                      onDeleteFolder();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>删除</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-6 space-y-1 task-list"
          >
            {tasks.map((task, index) => (
              <TaskItem
                index={index}
                key={task.id}
                task={task}
                isSelected={currentTaskId === task.id}
                onSelect={() => onSelectTask(task)}
                onDelete={() => onDeleteTask(task.id)}
                onRename={(name) => onRenameTask(task.id, name)}
                onDragStart={() => onDragStart(task.id)}
                isEditing={editingTask === task.id}
                setEditing={setEditingTask}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskItem: React.FC<{
  index: string;
  task: PromptTask;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDragStart: () => void;
  isEditing: boolean;
  setEditing: (id: string | null) => void;
}> = ({index, task, isSelected, onSelect, onDelete, onRename, onDragStart, isEditing, setEditing }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [menuPosition, setMenuPosition] = useState<DOMRect | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (moreButtonRef.current) {
      // 获取菜单按钮的位置信息
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMenuPosition(rect);
    }
    
    setShowMenu(!showMenu);
    setMenuHovered(false);
  };


  // 修复点击任务时的处理函数，彻底防止页面跳动
  const handleTaskClick = (e: React.MouseEvent) => {
    // 阻止所有可能导致页面跳动的默认行为
    e.preventDefault();
    e.stopPropagation();
    
    // 确保点击不会触发任何焦点变化
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    
    // 使用 requestAnimationFrame 确保在下一帧执行，避免同步布局变化
    requestAnimationFrame(() => {
      onSelect();
    });
  };

  // 点击其他地方时关闭菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menuElement = document.querySelector(".folder-menu, .task-menu");
      if (menuElement && !menuElement.contains(event.target as Node) && !menuHovered) {
        setShowMenu(false);
        setMenuHovered(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu, menuHovered]);

  return (
    <div
      id={index}
      draggable
      onDragStart={onDragStart}
      className={`task-item flex items-center justify-between p-2 rounded-lg cursor-pointer group transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={handleTaskClick}
      style={{
        // 确保任务项有稳定的布局
        //contain: 'layout style',
        // 防止点击时的焦点变化导致滚动
        scrollMargin: 0,
        // 确保点击时不会触发页面重排
        willChange: 'background-color',
        // 防止任何可能的布局抖动
        position: 'relative',
        // 设置较低的 z-index，确保不会遮挡菜单
        zIndex: 100 - index
      }}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <FileText size={14} className="text-gray-500 flex-shrink-0" />
        {isEditing ? (
          <input
            type="text"
            defaultValue={task.name}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => onRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename((e.target as HTMLInputElement).value);
              } else if (e.key === 'Escape') {
                setEditing(null);
              }
            }}
            className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
            style={{
              // 确保输入框不会影响布局
              contain: 'layout',
              // 防止输入框聚焦时的布局变化
              outline: 'none',
              boxShadow: 'none'
            }}
          />
        ) : (
          <span className="text-sm truncate">{task.name}</span>
        )}
      </div>
      
      <div className={`flex items-center space-x-1 transition-opacity relative ${(showMenu) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            className="flex items-center justify-center w-6 h-6 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="更多操作"
            style={{
              // 确保按钮点击不会影响布局
              contain: 'layout',
              // 防止按钮状态变化时的布局抖动
              willChange: 'background-color'
            }}
          >
            <MoreHorizontal size={12} />
          </button>
          {showMenu && (
            <div 
              className="task-menu fixed right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[120px]"
              style={{
                // 关键修复：使用极高的 z-index 确保菜单在最上层
                zIndex: 99999,
                // 位于按钮下方
                //top: "100%",
                //right: 0,
                // 根据父元素位置计算定位
                top: menuPosition?.top, // + menuPosition?.height, // + window.scrollY,
                left: menuPosition?.left,
                // 确保菜单不会被其他元素遮挡
                position: 'fixed', //'fixed', //'absolute',
                // 防止菜单影响其他元素的布局
                //contain: 'paint' //'layout'
              }}
              onClick={(e) => e.stopPropagation()} // 防止点击菜单时关闭
              // 添加新的鼠标事件处理器
              onMouseDown={(e) => e.stopPropagation()} // 防止触发全局点击检测
              onMouseEnter={() => setMenuHovered(true)} // 标记菜单悬停状态
              onMouseLeave={() => setMenuHovered(false)} // 标记菜单离开状态
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setEditing(task.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-700 dark:text-gray-300 transition-colors"
              >
                <Edit3 size={12} />
                <span>重命名</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-red-600 dark:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
                <span>删除</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateModal: React.FC<{
  title: string;
  placeholder: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}> = ({ title, placeholder, onConfirm, onCancel }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      onClick={onCancel}
      style={{
        // 确保模态框在最上层
        zIndex: 100000,
        // 确保模态框不会影响页面布局
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // 防止模态框影响页面滚动
        overflow: 'hidden',
        // 确保模态框不会影响其他元素
        contain: 'layout'
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
        style={{
          // 确保模态框内容也在正确的层级
          zIndex: 100001,
          position: 'relative'
        }}
      >
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确定
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default FolderSidebar;