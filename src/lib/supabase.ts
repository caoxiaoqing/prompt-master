import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Add connection validation
const validateSupabaseConnection = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    return response.ok
  } catch (error) {
    console.error('Supabase connection validation failed:', error)
    return false
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 确保认证状态持久化
    persistSession: true,
    // 自动刷新令牌
    autoRefreshToken: true,
    // 检测会话变化
    detectSessionInUrl: true,
    // 设置存储选项
    storage: window.localStorage,
    // 流程类型
    flowType: 'pkce'
  },
  global: {
    fetch: async (url, options = {}) => {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })
        return response
      } catch (error) {
        console.error('Supabase fetch error:', error)
        // Return a mock response for failed requests to prevent app crashes
        return new Response(JSON.stringify({ error: 'Connection failed' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
})

// Connection status tracking
let isSupabaseConnected = true

// Test connection on initialization
validateSupabaseConnection().then(connected => {
  isSupabaseConnected = connected
  if (!connected) {
    console.warn('⚠️ Supabase connection failed. App will run in offline mode.')
  }
})

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => isSupabaseConnected

// 用户信息类型定义
export interface UserInfo {
  id?: number
  uuid: string
  email: string
  user_name: string
  user_profile_pic?: string
  model_id?: number
  model_name?: string
  base_url?: string
  api_key?: string
  subscription_status?: boolean
  subscription_type?: any
  created_at?: string
  // 新增字段用于存储用户偏好设置
  language?: string
  timezone?: string
  custom_models?: any[]
}

// 动物头像emoji数组
const animalAvatars = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
  '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧',
  '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄',
  '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮',
  '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️'
];

// 获取随机动物头像
const getRandomAnimalAvatar = (): string => {
  return animalAvatars[Math.floor(Math.random() * animalAvatars.length)];
};

// 认证相关函数
export const authService = {
  // 暴露 supabase 客户端
  supabase,

  // 注册用户
  async signUp(email: string, password: string, userName: string) {
    try {
      if (!isSupabaseConnected) {
        throw new Error('Database connection unavailable. Please check your internet connection and try again.')
      }
      
      console.log('🔐 Supabase 注册开始:', email)
      
      // 1. 使用 Supabase Auth 注册用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_name: userName
          }
        }
      })

      if (authError) {
        console.error('❌ Supabase 注册失败:', authError)
        throw authError
      }

      console.log('✅ Supabase 注册成功:', authData.user?.id)

      if (authData.user) {
        // 2. 在 user_info 表中创建用户记录
        const defaultUserName = email; // 使用邮箱作为默认用户名
        const defaultAvatar = getRandomAnimalAvatar(); // 随机动物头像

        console.log('📝 创建用户信息记录...')
        const { data: userInfo, error: userInfoError } = await supabase
          .from('user_info')
          .insert([
            {
              uuid: authData.user.id,
              email: authData.user.email,
              user_name: defaultUserName,
              user_profile_pic: defaultAvatar,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (userInfoError) {
          console.error('❌ 创建用户信息失败:', userInfoError)
          // 如果创建用户信息失败，可以选择删除认证用户或者稍后重试
        } else {
          console.log('✅ 用户信息创建成功:', userInfo)
        }

        return { user: authData.user, userInfo, session: authData.session }
      }

      return { user: null, userInfo: null, session: null }
    } catch (error) {
      console.error('💥 注册过程出错:', error)
      throw error
    }
  },

  // 登录用户
  async signIn(email: string, password: string) {
    try {
      if (!isSupabaseConnected) {
        throw new Error('Database connection unavailable. Please check your internet connection and try again.')
      }
      
      console.log('🔑 Supabase 登录开始:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Supabase 登录失败:', error)
        throw error
      }

      console.log('✅ Supabase 登录成功:', data.user?.id)

      if (data.user) {
        // 获取用户详细信息
        console.log('📊 获取用户详细信息...')
        const { data: userInfo, error: userInfoError } = await supabase
          .from('user_info')
          .select('*')
          .eq('uuid', data.user.id)
          .single()

        if (userInfoError) {
          console.error('❌ 获取用户信息失败:', userInfoError)
        } else {
          console.log('✅ 用户信息获取成功:', userInfo)
        }

        return { user: data.user, userInfo, session: data.session }
      }

      return { user: null, userInfo: null, session: null }
    } catch (error) {
      console.error('💥 登录过程出错:', error)
      throw error
    }
  },

  // 登出用户
  async signOut() {
    try {
      if (!isSupabaseConnected) {
        // Allow logout even if offline
        console.log('🚪 Offline 登出')
        return true
      }
      
      console.log('🚪 Supabase 登出开始')
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Supabase 登出失败:', error)
        throw error
      }
      
      console.log('✅ Supabase 登出成功')
      return true
    } catch (error) {
      console.error('💥 登出过程出错:', error)
      throw error
    }
  },

  // 获取当前用户
  async getCurrentUser() {
    try {
      if (!isSupabaseConnected) {
        console.log('ℹ️ Database unavailable, checking local session only')
        return { user: null, userInfo: null }
      }
      
      console.log('👤 获取当前用户开始...')
      
      // 使用 getSession 获取当前会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('📋 会话获取结果:', {
        hasSession: !!session,
        userId: session?.user?.id,
        error: sessionError
      })
      
      // 如果没有 session 或出现错误，直接返回 null
      if (sessionError) {
        console.error('❌ 获取会话失败:', sessionError)
        return { user: null, userInfo: null }
      }
      
      if (!session?.user) {
        console.log('ℹ️ 无当前用户会话')
        return { user: null, userInfo: null }
      }

      // 获取用户详细信息
      console.log('📊 获取用户详细信息:', session.user.id)
      const { data: userInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('*')
        .eq('uuid', session.user.id)
        .single()

      if (userInfoError) {
        console.error('❌ 获取用户信息失败:', userInfoError)
        // 即使获取用户信息失败，也返回基本的用户数据
        return { user: session.user, userInfo: null }
      }

      console.log('✅ 用户信息获取成功:', userInfo)
      return { user: session.user, userInfo }
    } catch (error) {
      console.error('💥 获取当前用户出错:', error)
      // 任何错误都返回 null 而不是抛出异常
      return { user: null, userInfo: null }
    }
  },

  // 更新用户信息
  async updateUserInfo(uuid: string, updates: Partial<UserInfo>) {
    try {
      if (!isSupabaseConnected) {
        throw new Error('Database connection unavailable. Changes cannot be saved at this time.')
      }
      
      console.log('📝 更新用户信息开始:', uuid, updates)
      
      const { data, error } = await supabase
        .from('user_info')
        .update(updates)
        .eq('uuid', uuid)
        .select()
        .single()

      if (error) {
        console.error('❌ 更新用户信息失败:', error)
        throw error
      }
      
      console.log('✅ 用户信息更新成功:', data)
      return data
    } catch (error) {
      console.error('💥 更新用户信息出错:', error)
      throw error
    }
  },

  // 监听认证状态变化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    console.log('👂 设置认证状态监听器')
    try {
      return supabase.auth.onAuthStateChange(callback)
    } catch (error) {
      console.error('Failed to set up auth state listener:', error)
      // Return a dummy unsubscribe function
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  }
}