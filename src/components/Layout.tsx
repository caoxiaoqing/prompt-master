import React, { useState, useRef, useEffect } from 'react';
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
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
// import { useAuth } from '../contexts/AuthContext';
import StatusBar from './StatusBar';
import FolderSidebar from './FolderSidebar';
// import UserSettings from './settings/UserSettings';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useApp();
  // const { user, userInfo, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  // const [showSettings, setShowSettings] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  // const handleSignOut = async () => {
  //   try {
  //     await signOut();
  //   } catch (error) {
  //     console.error('Sign out error:', error);
  //   }
  // };

  // 处理用户菜单的点击切换
  const toggleUserMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
  };

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showUserMenu]);

  // 阻止菜单内部点击事件冒泡
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
              
              {/* 暂时隐藏用户菜单
              {/* User Menu - 修复后的版本 */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={toggleUserMenu}
                  className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 ${
                    showUserMenu 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title="用户菜单"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  {/* 显示用户头像或默认图标 */}
                  <div className="flex items-center space-x-2">
                    {/* {userInfo?.user_profile_pic ? (
                      <span className="text-lg">{userInfo.user_profile_pic}</span>
                    ) : ( */}
                      <User size={18} />
                    {/* )} */}
                    {/* {userInfo?.user_name && (
                      <span className="text-sm font-medium hidden sm:block max-w-32 truncate">
                        {userInfo.user_name}
                      </span>
                    )} */}
                    <span className="text-sm font-medium hidden sm:block">
                      演示模式
                    </span>
                    <ChevronDown 
                      size={14} 
                      className={`transition-transform duration-200 ${
                        showUserMenu ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                </button>
                
                {/* User Dropdown Menu - 精确控制的下拉菜单 */}
                {showUserMenu && (
                  <div 
                    className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-dropdown"
                    onClick={handleMenuClick}
                    style={{
                      // 确保菜单层级低于用户设置页面
                      zIndex: 50000,
                      // 防止菜单影响页面布局
                      position: 'absolute',
                      // 确保菜单有明确的边界
                      contain: 'layout'
                    }}
                  >
                    {/* 菜单头部 - 用户信息 */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3 mb-1">
                        <User size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            演示用户
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            demo@example.com
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 菜单选项 */}
                    <div className="py-1">
                      <button
                        onClick={() => setShowUserMenu(false)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300 transition-colors"
                        disabled
                      >
                        <Settings size={16} />
                        <span>账户设置 (暂不可用)</span>
                      </button>
                      
                      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                      
                      <button
                        onClick={() => setShowUserMenu(false)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 text-red-600 dark:text-red-400 transition-colors"
                        disabled
                      >
                        <LogOut size={16} />
                        <span>退出登录 (暂不可用)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              */}
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

      {/* User Settings Modal - 暂时禁用 */}
      {/* {showSettings && (
        <UserSettings onClose={() => setShowSettings(false)} />
      )} */}
    </div>
  );
};

export default Layout;