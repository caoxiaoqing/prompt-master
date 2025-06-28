import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  Activity, 
  Monitor, 
  Smartphone, 
  LogOut, 
  Trash2, 
  AlertTriangle, 
  Save, 
  Loader2,
  MapPin,
  Clock,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserInfo, supabase } from '../../lib/supabase';

interface LoginActivity {
  id: string;
  timestamp: Date;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  success: boolean;
}

interface ConnectedDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  lastActive: Date;
  location: string;
  current: boolean;
}

interface SecuritySectionProps {
  user: SupabaseUser | null;
  userInfo: UserInfo | null;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({
  user,
  userInfo,
  showNotification,
  loading,
  setLoading
}) => {
  // 初始密码表单数据
  const initialPasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    // Mock login activities
    const mockActivities: LoginActivity[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        ipAddress: '192.168.1.100',
        location: '北京, 中国',
        device: 'Windows PC',
        browser: 'Chrome 120.0',
        success: true
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        ipAddress: '192.168.1.101',
        location: '上海, 中国',
        device: 'iPhone 15',
        browser: 'Safari 17.0',
        success: true
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        ipAddress: '10.0.0.50',
        location: '深圳, 中国',
        device: 'MacBook Pro',
        browser: 'Chrome 119.0',
        success: false
      }
    ];

    // Mock connected devices
    const mockDevices: ConnectedDevice[] = [
      {
        id: '1',
        name: 'Windows PC - Chrome',
        type: 'desktop',
        browser: 'Chrome 120.0',
        lastActive: new Date(Date.now() - 1000 * 60 * 30),
        location: '北京, 中国',
        current: true
      },
      {
        id: '2',
        name: 'iPhone 15 - Safari',
        type: 'mobile',
        browser: 'Safari 17.0',
        lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24),
        location: '上海, 中国',
        current: false
      }
    ];

    setLoginActivities(mockActivities);
    setConnectedDevices(mockDevices);
  }, []);

  // 重置密码表单
  const handleResetPasswordForm = () => {
    setPasswordForm(initialPasswordForm);
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('error', '新密码和确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showNotification('error', '新密码至少需要6个字符');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setPasswordForm(initialPasswordForm);
      
      showNotification('success', '密码修改成功');
    } catch (error: any) {
      console.error('Password change error:', error);
      showNotification('error', error.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (deviceId: string) => {
    if (!confirm('确定要登出此设备吗？')) return;

    try {
      setLoading(true);
      
      // In a real implementation, you would call an API to invalidate the session
      // For now, we'll just remove it from the local state
      setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
      
      showNotification('success', '设备已登出');
    } catch (error) {
      console.error('Logout device error:', error);
      showNotification('error', '登出失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== '删除我的账户') {
      showNotification('error', '请输入正确的确认文本');
      return;
    }

    try {
      setLoading(true);
      
      // In a real implementation, you would:
      // 1. Delete user data from your database
      // 2. Delete the user from Supabase Auth
      // For now, we'll just show a message
      
      showNotification('info', '账户删除功能暂未实现');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Delete account error:', error);
      showNotification('error', '删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type: ConnectedDevice['type']) => {
    switch (type) {
      case 'desktop': return Monitor;
      case 'mobile': return Smartphone;
      case 'tablet': return Monitor; // You could add a tablet icon
      default: return Monitor;
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const isPasswordFormValid = 
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length >= 6 &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  // 检查密码表单是否有变化
  const hasPasswordChanges = 
    passwordForm.currentPassword.length > 0 ||
    passwordForm.newPassword.length > 0 ||
    passwordForm.confirmPassword.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-8"
    >
      {/* Password Change */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4 mb-6">
          <Key size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">修改密码</h2>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              当前密码
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              新密码
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordForm.newPassword.length > 0 && passwordForm.newPassword.length < 6 && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                密码至少需要6个字符
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              确认新密码
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordForm.confirmPassword.length > 0 && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                密码不匹配
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleResetPasswordForm}
              disabled={!hasPasswordChanges || loading}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={16} />
              <span>取消</span>
            </button>
            
            <button
              onClick={handlePasswordChange}
              disabled={!isPasswordFormValid || loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                !isPasswordFormValid || loading
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>{loading ? '修改中...' : '修改密码'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Login Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4 mb-6">
          <Activity size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">登录活动</h2>
        </div>

        <div className="space-y-4">
          {loginActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  activity.success 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                }`}>
                  {activity.success ? <Check size={16} /> : <X size={16} />}
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {activity.device}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {activity.browser}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <div className="flex items-center space-x-1">
                      <Clock size={12} />
                      <span>{activity.timestamp.toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin size={12} />
                      <span>{activity.location}</span>
                    </div>
                    <span>IP: {activity.ipAddress}</span>
                  </div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs ${
                activity.success
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {activity.success ? '成功' : '失败'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Devices */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4 mb-6">
          <Monitor size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">已连接设备</h2>
        </div>

        <div className="space-y-4">
          {connectedDevices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.type);
            return (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <DeviceIcon size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {device.name}
                      </span>
                      {device.current && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs">
                          当前设备
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <div className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>最后活动: {device.lastActive.toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin size={12} />
                        <span>{device.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {!device.current && (
                  <button
                    onClick={() => handleLogoutDevice(device.id)}
                    className="flex items-center space-x-1 px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOut size={14} />
                    <span>登出</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Deletion */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-4 mb-4">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">危险区域</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">删除账户</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              删除账户将永久删除您的所有数据，包括项目、任务、版本历史和聊天记录。此操作不可撤销。
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              <span>删除账户</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            style={{
              zIndex: 100005,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700"
              style={{
                zIndex: 100006,
                position: 'relative'
              }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    确认删除账户
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">
                      此操作将永久删除：
                    </h3>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      <li>• 您的个人资料和账户信息</li>
                      <li>• 所有项目和文件夹</li>
                      <li>• 所有任务和提示词版本</li>
                      <li>• 聊天历史记录</li>
                      <li>• 自定义模型配置</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      请输入 "删除我的账户" 来确认：
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="删除我的账户"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== '删除我的账户' || loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    <span>{loading ? '删除中...' : '永久删除账户'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SecuritySection;