import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AuthLayout from './AuthLayout'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { signUp, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 清除错误信息
    if (error) setError('')
  }

  const validateForm = () => {
    if (!formData.email) {
      setError('请输入邮箱地址')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('请输入有效的邮箱地址')
      return false
    }

    if (!formData.password) {
      setError('请输入密码')
      return false
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6个字符')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      
      // 使用邮箱作为用户名进行注册
      await signUp(formData.email, formData.password, formData.email)
      
      setSuccess(true)
      
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // 处理不同类型的错误
      if (error.message?.includes('User already registered')) {
        setError('该邮箱已被注册，请使用其他邮箱或直接登录')
      } else if (error.message?.includes('Password should be at least 6 characters')) {
        setError('密码至少需要6个字符')
      } else if (error.message?.includes('Invalid email')) {
        setError('请输入有效的邮箱地址')
      } else if (error.message?.includes('Signup requires a valid password')) {
        setError('请输入有效的密码')
      } else if (error.message?.includes('new row violates row-level security policy')) {
        setError('注册过程中出现权限问题，请稍后重试或联系管理员')
      } else {
        setError(error.message || '注册失败，请稍后重试')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.email && formData.password && formData.confirmPassword

  // 密码强度检查
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '' }
    if (password.length < 6) return { strength: 1, text: '密码太短', color: 'text-red-500' }
    if (password.length < 8) return { strength: 2, text: '密码强度：弱', color: 'text-yellow-500' }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return { strength: 3, text: '密码强度：中', color: 'text-blue-500' }
    return { strength: 4, text: '密码强度：强', color: 'text-green-500' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  if (success) {
    return (
      <AuthLayout
        title="注册成功！"
        subtitle="欢迎加入 Prompt Optimizer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            账户创建成功！
          </h3>
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <p>
              您的账户已成功创建，系统已为您分配了一个可爱的动物头像。
            </p>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">重要提醒</p>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    <li>• 请检查您的邮箱收件箱（包括垃圾邮件文件夹）</li>
                    <li>• 查找来自 Supabase 的验证邮件</li>
                    <li>• 点击邮件中的验证链接完成账户激活</li>
                    <li>• 验证完成后即可正常登录使用</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <button
              onClick={onSwitchToLogin}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              前往登录页面
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              如果没有收到验证邮件，请检查垃圾邮件文件夹
            </p>
          </div>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="创建账户"
      subtitle="加入 Prompt Optimizer，开始优化您的 AI 对话"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3"
          >
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Info Message */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start space-x-3"
        >
          <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-blue-700 dark:text-blue-300 text-sm">
            <p className="font-medium mb-1">自动设置说明</p>
            <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
              <li>• 用户名将自动设置为您的邮箱地址</li>
              <li>• 系统将为您随机分配一个可爱的动物头像 🐶</li>
              <li>• 注册后需要验证邮箱才能登录</li>
              <li>• 验证完成后您可以在设置中修改这些信息</li>
            </ul>
          </div>
        </motion.div>

        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            邮箱地址
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={18} className="text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入您的邮箱地址"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            邮箱地址将作为您的用户名和登录凭证
          </p>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            密码
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入密码（至少6个字符）"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                      passwordStrength.strength === 2 ? 'bg-yellow-500 w-2/4' :
                      passwordStrength.strength === 3 ? 'bg-blue-500 w-3/4' :
                      passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                    }`}
                  />
                </div>
                <span className={`text-xs ${passwordStrength.color}`}>
                  {passwordStrength.text}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            确认密码
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请再次输入密码"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Password Match Indicator */}
          {formData.confirmPassword && (
            <div className="mt-1">
              {formData.password === formData.confirmPassword ? (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center space-x-1">
                  <CheckCircle size={12} />
                  <span>密码匹配</span>
                </p>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertCircle size={12} />
                  <span>密码不匹配</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || loading}
          className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSubmitting || loading ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              注册中...
            </>
          ) : (
            '创建账户'
          )}
        </button>

        {/* Switch to Login */}
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            已有账户？{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium transition-colors"
            >
              立即登录
            </button>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}

export default RegisterForm