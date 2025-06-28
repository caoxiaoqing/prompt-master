import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Menu, 
  X, 
  Settings, 
  Sun, 
  Moon, 
  User,
  ChevronRight,
  ChevronLeft,
  Folder,
  LogOut
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import StatusBar from './StatusBar';
import FolderSidebar from './FolderSidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useApp();
  const { user, userInfo, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className={`min-h-screen ${state.theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0 z-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* 优化的侧边栏切换按钮 - 使用向左箭头表示收起 */}
              <div className="relative">
                <button
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center space-x-2"
                  title={state.sidebarOpen ? "收起项目管理" : "展开项目管理"}
                >
                  {state.sidebarOpen ? (
                    // 侧边栏展开时显示向左箭头，表示可以收起
                    <div className="flex items-center space-x-1">
                      <Folder size={16} className="text-blue-600 dark:text-blue-400" />
                      <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
                    </div>
                  ) : (
                    // 侧边栏收起时显示向右箭头，表示可以展开
                    <div className="flex items-center space-x-1">
                      <Folder size={16} className="text-blue-600 dark:text-blue-400" />
                      <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                </button>
                
                {/* 悬停提示 - 根据状态显示不同的提示 */}
                <div className="tooltip-base absolute left-full top-1/2 transform -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {state.sidebarOpen ? "点击收起项目管理" : "点击展开项目管理"}
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
                </div>
              </div>
              
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Prompt Optimizer
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={state.theme === 'dark' ? "切换到浅色模式" : "切换到深色模式"}
              >
                {state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button 
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => setShowUserMenu(false)}
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => setShowUserMenu(false)}
                  title="用户菜单"
                >
                  {/* 显示用户头像或默认图标 */}
                  {userInfo?.user_profile_pic ? (
                    <span className="text-lg">{userInfo.user_profile_pic}</span>
                  ) : (
                    <User size={18} />
                  )}
                  {userInfo?.user_name && (
                    <span className="text-sm font-medium hidden sm:block max-w-32 truncate">
                      {userInfo.user_name}
                    </span>
                  )}
                </button>
                
                {/* User Dropdown Menu */}
                <div 
                  className={`dropdown-base absolute right-0 top-full mt-2 w-48 transition-opacity ${
                    showUserMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  className={`dropdown-base absolute right-0 top-full mt-2 w-48 transition-opacity ${
                    showUserMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-2 mb-1">
                        {userInfo?.user_profile_pic && (
                          <span className="text-lg">{userInfo.user_profile_pic}</span>
                        )}
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {userInfo?.user_name || '用户'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <Settings size={14} />
                      <span>账户设置</span>
                    </button>
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-red-600 dark:text-red-400 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <motion.aside
            initial={false}
            animate={{
              width: state.sidebarOpen ? '320px' : '0px',
              opacity: state.sidebarOpen ? 1 : 0
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex-shrink-0 sidebar-container z-sidebar"
            style={{ 
              // 确保侧边栏在动画过程中不影响主内容区域的滚动位置
              position: 'relative',
              // 防止动画时的重绘影响
              willChange: 'width, opacity',
              // 确保侧边栏在动画过程中不影响其他元素
              contain: 'layout'
            }}
          >
            <FolderSidebar />
          </motion.aside>

          {/* Main Content */}
          <main 
            className="flex-1 flex flex-col min-h-0 main-content" 
            style={{ 
              // 防止主内容区域在侧边栏动画时发生位移
              position: 'relative',
              overflow: 'hidden',
              // 确保主内容区域有稳定的布局
              contain: 'layout'
            }}
          >
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
            {/* Status Bar */}
            <StatusBar />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;