import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Globe, 
  Clock, 
  Camera, 
  Save, 
  Loader2,
  Check,
  AlertCircle
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
  const [formData, setFormData] = useState({
    user_name: userInfo?.user_name || '',
    email: user?.email || '',
    language: 'zh-CN',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const updates: Partial<UserInfo> = {
        user_name: formData.user_name.trim(),
      };

      if (formData.user_profile_pic) {
        updates.user_profile_pic = formData.user_profile_pic;
      }

      await updateUserInfo(updates);
      showNotification('success', '个人资料更新成功！');
    } catch (error) {
      console.error('Profile update error:', error);
      showNotification('error', '更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async () => {
    if (!user || formData.email === user.email) return;

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
  const hasChanges = 
    formData.user_name !== (userInfo?.user_name || '') ||
    formData.user_profile_pic !== (userInfo?.user_profile_pic || '');

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
              {userInfo?.user_profile_pic ? (
                <span className="text-4xl">{userInfo.user_profile_pic}</span>
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

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={!isFormValid || !hasChanges || loading}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          <span>{loading ? '保存中...' : '保存更改'}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default ProfileSection;