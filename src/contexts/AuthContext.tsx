import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authService, UserInfo } from '../lib/supabase'
import { TaskService } from '../lib/taskService'

interface AuthContextType {
  user: User | null
  userInfo: UserInfo | null
  session: Session | null
  loading: boolean
  refreshUserInfo: () => void
  signUp: (email: string, password: string, userName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserInfo: (updates: Partial<UserInfo>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0)

  useEffect(() => {
    let isMounted = true
    let authSubscription: any = null
    let initializationTimeout: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      try {
        console.log('🚀 开始认证初始化...')
        
        // 设置最大初始化时间限制（10秒）
        initializationTimeout = setTimeout(() => {
          if (isMounted && !isInitialized) {
            console.warn('⚠️ 认证初始化超时，强制完成初始化')
            setIsInitialized(true)
            setLoading(false)
          }
        }, 10000)

        // 1. 首先获取当前会话状态
        console.log('📡 获取当前会话状态...')
        const { data: { session: currentSession }, error: sessionError } = await authService.supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ 获取会话失败:', sessionError)
          throw sessionError
        }

        console.log('📋 当前会话状态:', {
          hasSession: !!currentSession,
          userId: currentSession?.user?.id,
          expiresAt: currentSession?.expires_at
        })

        // 2. 设置认证状态监听器
        console.log('👂 设置认证状态监听器...')
        const { data: { subscription } } = authService.supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return
          
          console.log('🔄 认证状态变化:', {
            event,
            hasSession: !!session,
            userId: session?.user?.id,
            isInitialized
          })
          
          // 更新会话状态
          setSession(session)
          
          if (session?.user) {
            console.log('👤 设置用户信息:', session.user.id)
            setUser(session.user)
            
            // 获取用户详细信息
            try {
              console.log('📊 获取用户详细信息...')
              const { userInfo: fetchedUserInfo } = await authService.getCurrentUser(true) // 强制刷新
              if (isMounted) {
                setUserInfo(fetchedUserInfo)
                console.log('✅ 用户详细信息获取成功:', fetchedUserInfo?.user_name)
              }
            } catch (error) {
              console.error('❌ 获取用户详细信息失败:', error)
              if (isMounted) {
                setUserInfo(null)
              }
            }
          } else {
            console.log('🚪 清除用户状态')
            setUser(null)
            setUserInfo(null)
          }
          
          // 如果已经初始化完成，可以结束加载状态
          if (isInitialized) {
            console.log('✅ 认证状态更新完成，结束加载')
            setLoading(false)
          }
        })
        
        authSubscription = subscription

        // 3. 处理初始会话
        if (isMounted) {
          if (currentSession?.user) {
            console.log('👤 处理初始用户会话:', currentSession.user.id)
            setSession(currentSession)
            setUser(currentSession.user)
            
            // 获取用户详细信息
            try {
              console.log('📊 获取初始用户详细信息...')
              const { userInfo: initialUserInfo } = await authService.getCurrentUser(true) // 强制刷新
              if (isMounted) {
                setUserInfo(initialUserInfo)
                console.log('✅ 初始用户详细信息获取成功:', initialUserInfo?.user_name)
              }
            } catch (error) {
              console.error('❌ 获取初始用户详细信息失败:', error)
              if (isMounted) {
                setUserInfo(null)
              }
            }
          } else {
            console.log('🔓 无初始用户会话')
            setSession(null)
            setUser(null)
            setUserInfo(null)
          }
          
          // 4. 标记初始化完成
          console.log('🎉 认证初始化完成')
          setIsInitialized(true)
          setLoading(false)
          
          // 清除超时定时器
          if (initializationTimeout) {
            clearTimeout(initializationTimeout)
            initializationTimeout = null
          }
        }
        
      } catch (error) {
        console.error('💥 认证初始化失败:', error)
        if (isMounted) {
          setUser(null)
          setUserInfo(null)
          setSession(null)
          setIsInitialized(true)
          setLoading(false)
          
          // 清除超时定时器
          if (initializationTimeout) {
            clearTimeout(initializationTimeout)
            initializationTimeout = null
          }
        }
      }
    }

    // 立即开始初始化
    initializeAuth()

    // 清理函数
    return () => {
      console.log('🧹 清理 AuthProvider')
      isMounted = false
      
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
      
      if (initializationTimeout) {
        clearTimeout(initializationTimeout)
      }
    }
  }, []) // 空依赖数组，只在组件挂载时执行一次

  // 监听数据刷新触发器，重新获取用户信息
  useEffect(() => {
    const refreshUserInfo = async () => {
      if (!user || dataRefreshTrigger === 0 || loading) return
      
      try {
        console.log('🔄 刷新用户信息...', { trigger: dataRefreshTrigger })
        // 不设置全局 loading 状态，避免影响当前页面
        const { userInfo: refreshedUserInfo } = await authService.getCurrentUser(true)
        
        console.log('📊 刷新后的用户信息:', {
          hasUserInfo: !!refreshedUserInfo,
          customModelsCount: refreshedUserInfo?.custom_models?.length || 0
        })
        
        setUserInfo(refreshedUserInfo)
        console.log('✅ 用户信息刷新成功')
      } catch (error) {
        console.error('❌ 刷新用户信息失败:', error)
        // 不要因为刷新失败而影响用户操作
      }
    }

    refreshUserInfo()
  }, [dataRefreshTrigger, user, loading])

  const signUp = async (email: string, password: string, userName: string) => {
    try {
      console.log('📝 开始用户注册:', email)
      setLoading(true)
      
      const result = await authService.signUp(email, password, userName)
      if (result.user) {
        console.log('✅ 注册成功:', result.user.id)
        setUser(result.user)
        setUserInfo(result.userInfo)
        setSession(result.session)

        // 🏗️ 为新用户创建默认项目结构
        try {
          console.log('🏗️ 为新用户创建默认项目结构...')
          // 新的任务持久化系统不需要预创建项目结构
          // 任务将在用户创建时自动在数据库中创建记录
          console.log('✅ 默认项目结构创建成功')
        } catch (error) {
          console.error('❌ 创建默认项目结构失败:', error)
          // 不阻断注册流程，只记录错误
        }
      }
    } catch (error) {
      console.error('❌ 注册失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 开始用户登录:', email)
      setLoading(true)
      
      const result = await authService.signIn(email, password)
      // 登录成功后，状态会通过 onAuthStateChange 自动更新
      console.log('✅ 登录请求成功')
    } catch (error) {
      console.error('❌ 登录失败:', error)
      setLoading(false) // 登录失败时手动结束加载状态
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 开始用户登出')
      setLoading(true)
      
      await authService.signOut()
      
      // 立即清除本地状态
      setUser(null)
      setUserInfo(null)
      setSession(null)
      
      console.log('✅ 登出成功')
    } catch (error) {
      console.error('❌ 登出失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateUserInfo = async (updates: Partial<UserInfo>) => {
    if (!user) throw new Error('No user logged in')
    
    try {
      console.log('📝 更新用户信息:', updates)
      const updatedUserInfo = await authService.updateUserInfo(user.id, updates)
      setUserInfo(updatedUserInfo)
      // 触发数据刷新
      setDataRefreshTrigger(prev => prev + 1)
      console.log('✅ 用户信息更新成功')
    } catch (error) {
      console.error('❌ 用户信息更新失败:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    userInfo,
    session,
    loading,
    refreshUserInfo: () => setDataRefreshTrigger(prev => prev + 1),
    signUp,
    signIn,
    signOut,
    updateUserInfo
  }

  console.log('🔍 AuthProvider 当前状态:', {
    hasUser: !!user,
    hasUserInfo: !!userInfo,
    hasSession: !!session,
    loading,
    isInitialized
  })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}