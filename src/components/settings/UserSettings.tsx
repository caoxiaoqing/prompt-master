import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Globe, 
  Clock, 
  Camera, 
  Key, 
  Shield, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  Plus,
  Edit3,
  Check,
  X,
  AlertTriangle,
  Monitor,
  Smartphone,
  LogOut,
  Activity,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ProfileSection from './ProfileSection';
import ModelConfigSection from './ModelConfigSection';
import SecuritySection from './SecuritySection';

interface UserSettingsProps {
  onClose: () => void;
}

type SettingsTab = 'profile' | 'models' | 'security';

const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const { user, userInfo, updateUserInfo } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const tabs = [
    {
      id: 'profile' as SettingsTab,
      label: '个人资料',
      icon: User,
      description: '管理您的基本信息和偏好设置'
    },
    {
      id: 'models' as SettingsTab,
      label: 'AI 模型配置',
      icon: SettingsIcon,
      description: '配置自定义 AI 模型和参数'
    },
    {
      id: 'security' as SettingsTab,
      label: '账户安全',
      icon: Shield,
      description: '密码、登录历史和安全设置'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{
        zIndex: 100000,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700"
        style={{
          zIndex: 100001,
          position: 'relative'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <SettingsIcon size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                账户设置
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                管理您的账户信息和应用偏好
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mx-6 mt-4 p-4 rounded-lg border ${
                notification.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  : notification.type === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {notification.type === 'success' && <Check size={16} />}
                {notification.type === 'error' && <AlertTriangle size={16} />}
                {notification.type === 'info' && <SettingsIcon size={16} />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <tab.icon size={20} className={activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'} />
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {tab.description}
                  </p>
                </button>
              ))}
            </nav>

            {/* User Info Card */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                {userInfo?.user_profile_pic ? (
                  <span className="text-2xl">{userInfo.user_profile_pic}</span>
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {userInfo?.user_name || '用户'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                账户创建于 {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <ProfileSection
                  key="profile"
                  user={user}
                  userInfo={userInfo}
                  updateUserInfo={updateUserInfo}
                  showNotification={showNotification}
                  loading={loading}
                  setLoading={setLoading}
                />
              )}
              {activeTab === 'models' && (
                <ModelConfigSection
                  key="models"
                  user={user}
                  userInfo={userInfo}
                  updateUserInfo={updateUserInfo}
                  showNotification={showNotification}
                  loading={loading}
                  setLoading={setLoading}
                />
              )}
              {activeTab === 'security' && (
                <SecuritySection
                  key="security"
                  user={user}
                  userInfo={userInfo}
                  showNotification={showNotification}
                  loading={loading}
                  setLoading={setLoading}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserSettings;