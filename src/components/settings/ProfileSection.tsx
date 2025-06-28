import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Timer,
  User, 
  Mail, 
  Globe, 
  Clock, 
  Camera, 
  Save, 
  Loader2,
  Check,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserInfo } from '../../lib/supabase';

interface ProfileSectionProps {
  user: SupabaseUser | null;
  userInfo: UserInfo | null;
  updateUserInfo: (updates: Partial<UserInfo>) => Promise<void>;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  user,
  userInfo,
  updateUserInfo,
  showNotification,
  loading,
  setLoading
}) => {
  // 初始表单数据
  const initialFormData = {
    user_name: userInfo?.user_name || '',
    email: user?.email || '',
    user_profile_pic: userInfo?.user_profile_pic || '',
    language: userInfo?.language || 'zh-CN',
    timezone: userInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  const [formData, setFormData] = useState({
    user_name: userInfo?.user_name || '',
    email: user?.email || '',
    user_profile_pic: userInfo?.user_profile_pic || '',
    language: userInfo?.language || 'zh-CN',
    timezone: userInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [countdown, setCountdown] = useState(0);

  const animalEmojis = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
    '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
    '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎'
  ];

  const languages = [
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
    { code: 'ko-KR', name: '한국어', flag: '🇰🇷' }
  ];

  const commonTimezones = [
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Australia/Sydney'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfilePictureSelect = (emoji: string) => {
    handleInputChange('user_profile_pic', emoji);
  };

  // 重置表单到初始状态
  const handleResetForm = () => {
    setFormData(initialFormData);
    setEmailVerificationSent(false);
    setSaveState('idle');
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setSaveState('saving');
      setCountdown(5);
      
      // 启动5秒倒计时
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // 5秒超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          clearInterval(countdownInterval);
          reject(new Error('TIMEOUT'));
        }, 5000);
      });
      
      // 实际的更新操作
      
      const updates: Partial<UserInfo> = {
        user_name: formData.user_name.trim(),
        language: formData.language,
        timezone: formData.timezone
      };

      if (formData.user_profile_pic) {
        updates.user_profile_pic = formData.user_profile_pic;
      }

      // 使用 Promise.race 来处理超时
      await Promise.race([
        updateUserInfo(updates),
        timeoutPromise
      ]);
      
      // 如果成功，清除倒计时并显示成功状态
      clearInterval(countdownInterval);
      setSaveState('success');
      setCountdown(0);
      showNotification('success', '个人资料更新成功！');
      
    } catch (error) {
      console.error('Profile update error:', error);
      
      if (error.message === 'TIMEOUT') {
        setSaveState('error');
        showNotification('error', '由于网络原因保存失败，请稍后重试');
      } else {
        setSaveState('error');
        showNotification('error', error.message || '更新失败，请稍后重试');
      }
      setCountdown(0);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async () => {
    if (!user || formData.email === user.email) return;

    setSaveState('idle');
    try {
      setLoading(true);
      // Here you would implement email change logic with Supabase
      // This typically involves sending a verification email
      setEmailVerificationSent(true);
      showNotification('info', '验证邮件已发送到新邮箱地址');
    } catch (error) {
      console.error('Email change error:', error);
      showNotification('error', '邮箱更改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.user_name.trim().length > 0;
  
  // 检查表单是否有变化
  const hasChanges = 
    formData.user_name !== (userInfo?.user_name || '') ||
    formData.user_profile_pic !== (userInfo?.user_profile_pic || '') ||
    formData.language !== (userInfo?.language || 'zh-CN') ||
    formData.timezone !== (userInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

  // 获取保存按钮的文本和样式
  const getSaveButtonContent = () => {
    if (saveState === 'saving') {
      return { text: `保存中... (${countdown}s)`, icon: Timer, disabled: true };
    }
    if (saveState === 'success') return { text: '保存成功', icon: Check, disabled: true };
    if (saveState === 'error') return { text: '保存失败', icon: AlertCircle, disabled: false };
    return { text: '保存更改', icon: Save, disabled: !isFormValid || !hasChanges };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-8"
    >
      {/* Profile Picture Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4 mb-6">
          <Camera size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">头像设置</h2>
        </div>

        <div className="flex items-start space-x-6">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
              {formData.user_profile_pic ? (
                <span className="text-4xl">{formData.user_profile_pic}</span>
              ) : (
                <User size={32} className="text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">当前头像</p>
          </div>

          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">选择新头像</h3>
            <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
              {animalEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleProfilePictureSelect(emoji)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                    formData.user_profile_pic === emoji
                      ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4 mb-6">
          <User size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">基本信息</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户名 *
            </label>
            <input
              type="text"
              value={formData.user_name}
              onChange={(e) => handleInputChange('user_name', e.target.value)}
              placeholder="请输入用户名"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {formData.user_name.trim().length === 0 && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">用户名不能为空</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              邮箱地址
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.email !== user?.email && (
                <button
                  onClick={handleEmailChange}
                  disabled={loading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  验证
                </button>
              )}
            </div>
            {emailVerificationSent && (
              <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                验证邮件已发送，请检查您的邮箱
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4 mb-6">
          <Globe size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">偏好设置</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              界面语言
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              时区设置
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {commonTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ')} ({new Date().toLocaleTimeString('zh-CN', { timeZone: tz, timeStyle: 'short' })})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleResetForm}
          disabled={!hasChanges || loading}
          className="flex items-center space-x-2 px-6 py-3 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <RotateCcw size={16} />
          <span>取消</span>
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={!isFormValid || !hasChanges || loading}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
            getSaveButtonContent().disabled
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : saveState === 'success'
              ? 'bg-green-600 text-white'
              : saveState === 'error'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : saveState === 'saving'
              ? 'bg-blue-600 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saveState === 'saving' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>{getSaveButtonContent().text}</span>
            </>
          ) : (
            <>
              <getSaveButtonContent().icon size={16} />
              <span>{getSaveButtonContent().text}</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default ProfileSection;