import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AuthLayout from './AuthLayout'

interface LoginFormProps {
  onSwitchToRegister: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { signIn, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmailConfirmationInfo, setShowEmailConfirmationInfo] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 清除错误和警告信息
    if (error) setError('')
    if (warning) setWarning('')
    if (showEmailConfirmationInfo) setShowEmailConfirmationInfo(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    // 关键修复：完全阻止表单的默认行为
    e.preventDefault()
    e.stopPropagation()
    
    if (!formData.email || !formData.password) {
      setError('请填写所有必填字段')
      return
    }

    try {
      // 关键修复：设置本地提交状态，而不依赖全局 loading
      setIsSubmitting(true)
      setError('')
      setWarning('')
      setShowEmailConfirmationInfo(false)
      
      // 关键修复：直接调用 signIn，成功后 AuthContext 会自动处理页面跳转
      await signIn(formData.email, formData.password)
      
      // 如果执行到这里，说明登录成功
      // AuthContext 的 onAuthStateChange 会自动处理页面跳转
      // 不需要手动设置 loading 状态
      
    } catch (error: any) {
      // 关键修复：所有错误都在这里处理，不会导致页面刷新
      console.error('Login error:', error)
      
      // 处理不同类型的错误，区分严重程度
      if (error.message?.includes('Invalid login credentials')) {
        // 正常的登录失败 - 使用警告级别
        setWarning('邮箱或密码错误，请检查后重试')
      } else if (error.message?.includes('Email not confirmed')) {
        // 邮箱未验证 - 显示详细信息，不显示错误
        setShowEmailConfirmationInfo(true)
      } else if (error.message?.includes('Too many requests')) {
        // 系统限制 - 使用错误级别
        setError('登录尝试次数过多，请稍后再试')
      } else if (error.message?.includes('User not found')) {
        // 用户不存在 - 使用警告级别
        setWarning('该邮箱尚未注册，请先注册账户')
      } else if (error.message?.includes('Wrong password')) {
        // 密码错误 - 使用警告级别
        setWarning('密码错误，请重新输入')
      } else if (error.message?.includes('Invalid email')) {
        // 邮箱格式错误 - 使用警告级别
        setWarning('请输入有效的邮箱地址')
      } else if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
        // 网络错误 - 使用错误级别
        setError('网络连接失败，请检查网络后重试')
      } else if (error.message?.includes('Service temporarily unavailable')) {
        // 服务不可用 - 使用错误级别
        setError('服务暂时不可用，请稍后重试')
      } else {
        // 其他未知错误 - 使用错误级别
        setError(error.message || '登录失败，请稍后重试')
      }
    } finally {
      // 关键修复：只重置本地提交状态
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.email && formData.password

  return (
    <AuthLayout
      title="欢迎回来"
      subtitle="登录您的账户，继续优化您的 AI 提示词"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message - 严重错误 */}
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

        {/* Warning Message - 正常的登录失败 */}
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center space-x-3"
          >
            <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">{warning}</p>
              {warning.includes('尚未注册') && (
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="mt-2 text-sm text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
                >
                  点击这里注册新账户
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Email Confirmation Info */}
        {showEmailConfirmationInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start space-x-3"
          >
            <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-700 dark:text-blue-300 text-sm">
              <p className="font-medium mb-2">邮箱验证说明</p>
              <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                <li>• 请检查您的邮箱收件箱（包括垃圾邮件文件夹）</li>
                <li>• 查找来自 Supabase 的验证邮件</li>
                <li>• 点击邮件中的验证链接完成账户激活</li>
                <li>• 验证完成后即可正常登录</li>
              </ul>
              <p className="mt-2 text-xs text-blue-500 dark:text-blue-400">
                如果没有收到验证邮件，请检查垃圾邮件文件夹或稍后重试注册
              </p>
            </div>
          </motion.div>
        )}

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
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="请输入您的密码"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
          >
            忘记密码？
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              登录中...
            </>
          ) : (
            '登录'
          )}
        </button>

        {/* Switch to Register */}
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            还没有账户？{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium transition-colors"
            >
              立即注册
            </button>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}

export default LoginForm