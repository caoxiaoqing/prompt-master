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
  async getCurrentUser(forceRefresh = false) {
    try {
      if (!isSupabaseConnected) {
        console.log('ℹ️ Database unavailable, checking local session only')
        return { user: null, userInfo: null }
      }
      
      console.log('👤 获取当前用户开始...', forceRefresh ? '(强制刷新)' : '')
      
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
      
      // 构建查询，如果强制刷新则添加时间戳避免缓存
      let query = supabase
        .from('user_info')
        .select('*')
        .eq('uuid', session.user.id)
      
      if (forceRefresh) {
        // 添加时间戳参数避免缓存
        query = query.limit(1)
      } else {
        query = query.single()
      }
      
      const { data: userInfoData, error: userInfoError } = await query
      
      // 如果是强制刷新模式，取第一条记录
      const userInfo = forceRefresh && Array.isArray(userInfoData) ? userInfoData[0] : userInfoData

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

  // 添加自定义模型配置
  async addCustomModel(userId: string, modelConfig: {
    name: string
    baseUrl: string
    apiKey: string
    topK: number
    topP: number
    temperature: number
  }) {
    try {
      if (!isSupabaseConnected) {
        throw new Error('Database connection unavailable. Model configuration cannot be saved at this time.')
      }

      console.log('📝 添加自定义模型配置:', {
        userId,
        modelName: modelConfig.name,
        baseUrl: modelConfig.baseUrl,
        hasApiKey: !!modelConfig.apiKey,
        parameters: {
          topK: modelConfig.topK,
          topP: modelConfig.topP,
          temperature: modelConfig.temperature
        }
      })

      // 1. 生成唯一的 model_id
      const modelId = Date.now().toString()

      console.log('🔑 生成模型ID:', modelId)

      // 2. 检查是否已存在相同配置的模型
      console.log('🔍 检查是否存在重复模型...')
      const { data: existingUser, error: fetchError } = await supabase
        .from('user_info')
        .select('custom_models')
        .eq('uuid', userId)
        .single()

      if (fetchError) {
        console.error('❌ 获取用户信息失败:', fetchError)
        throw fetchError
      }

      const existingModels = existingUser?.custom_models || []
      console.log('📋 现有模型数量:', existingModels.length)
      
      // 检查是否存在相同配置的模型
      const duplicateModel = existingModels.find((model: any) => 
        model.name === modelConfig.name &&
        model.baseUrl === modelConfig.baseUrl &&
        model.apiKey === modelConfig.apiKey &&
        model.topK === modelConfig.topK &&
        model.topP === modelConfig.topP &&
        model.temperature === modelConfig.temperature
      )

      if (duplicateModel) {
        console.log('❌ 发现重复模型:', duplicateModel.name)
        throw new Error('模型已存在：相同配置的模型已经添加过了')
      }

      console.log('✅ 无重复模型，继续创建')

      // 3. 创建新的模型配置
      const newModel = {
        id: modelId,
        name: modelConfig.name.trim(),
        baseUrl: modelConfig.baseUrl.trim(),
        apiKey: modelConfig.apiKey.trim(),
        topK: modelConfig.topK,
        topP: modelConfig.topP,
        temperature: modelConfig.temperature,
        createdAt: new Date().toISOString(),
        isDefault: existingModels.length === 0 // 如果是第一个模型，设为默认
      }

      console.log('🆕 新模型配置:', {
        id: newModel.id,
        name: newModel.name,
        isDefault: newModel.isDefault
      })

      // 强制刷新用户信息以获取最新的 custom_models 数据
      console.log('🔄 强制刷新用户信息...')
      const { userInfo: refreshedUserInfo } = await authService.getCurrentUser(true)
      
      // 4. 更新用户的自定义模型列表
      const updatedModels = [...existingModels, newModel]
      const updateData = {
        custom_models: updatedModels
      }

      console.log('💾 开始更新数据库...', {
        totalModels: updatedModels.length,
        newModelId: newModel.id
      })

      const { data, error } = await supabase
        .from('user_info')
        .update(updateData)
        .eq('uuid', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ 添加模型配置失败:', error)
        throw new Error(`数据库更新失败: ${error.message}`)
      }

      console.log('✅ 模型配置添加成功:', {
        modelName: newModel.name,
        modelId: newModel.id,
        totalModelsInDB: data.custom_models?.length || 0
      })
      
      return { model: newModel, userInfo: data }
    } catch (error) {
      console.error('💥 添加模型配置出错:', error)
      
      // 提供更详细的错误信息
      if (error instanceof Error) {
        throw new Error(`添加模型失败: ${error.message}`)
      }
      throw new Error('添加模型失败: 未知错误')
    }
  },

  // 更新自定义模型配置
  async updateCustomModel(userId: string, modelId: string, modelConfig: {
    name: string
    baseUrl: string
    apiKey: string
    topK: number
    topP: number
    temperature: number
  }) {
    try {
      if (!isSupabaseConnected) {
        throw new Error('Database connection unavailable. Model configuration cannot be updated at this time.')
      }

      console.log('📝 更新自定义模型配置:', {
        userId,
        modelId,
        modelName: modelConfig.name,
        baseUrl: modelConfig.baseUrl,
        hasApiKey: !!modelConfig.apiKey,
        parameters: {
          topK: modelConfig.topK,
          topP: modelConfig.topP,
          temperature: modelConfig.temperature
        }
      })

      // 1. 获取当前用户的模型列表
      console.log('🔍 获取当前用户模型列表...')
      const { data: existingUser, error: fetchError } = await supabase
        .from('user_info')
        .select('custom_models')
        .eq('uuid', userId)
        .single()

      if (fetchError) {
        console.error('❌ 获取用户信息失败:', fetchError)
        throw new Error(`获取用户信息失败: ${fetchError.message}`)
      }

      const existingModels = existingUser?.custom_models || []
      console.log('📋 现有模型数量:', existingModels.length)
      
      // 2. 检查是否存在相同配置的其他模型（排除当前编辑的模型）
      const duplicateModel = existingModels.find((model: any) => 
        model.id !== modelId &&
        model.name === modelConfig.name &&
        model.baseUrl === modelConfig.baseUrl &&
        model.apiKey === modelConfig.apiKey &&
        model.topK === modelConfig.topK &&
        model.topP === modelConfig.topP &&
        model.temperature === modelConfig.temperature
      )

      if (duplicateModel) {
        console.log('❌ 发现重复模型:', duplicateModel.name)
        throw new Error('模型已存在：相同配置的模型已经添加过了')
      }

      // 3. 更新模型配置
      console.log('🔄 更新模型配置...')
      const updatedModels = existingModels.map((model: any) => 
        model.id === modelId 
          ? {
              ...model,
              name: modelConfig.name.trim(),
              baseUrl: modelConfig.baseUrl.trim(),
              apiKey: modelConfig.apiKey.trim(),
              topK: modelConfig.topK,
              topP: modelConfig.topP,
              temperature: modelConfig.temperature,
              updatedAt: new Date().toISOString()
            }
          : model
      )

      // 4. 检查是否找到了要更新的模型
      const targetModel = existingModels.find((model: any) => model.id === modelId)
      if (!targetModel) {
        console.log('❌ 要更新的模型不存在:', modelId)
        throw new Error('要更新的模型不存在')
      }

      console.log('💾 开始更新数据库...', {
        modelId,
        modelName: modelConfig.name
      })

      const { data, error } = await supabase
        .from('user_info')
        .update({ custom_models: updatedModels })
        .eq('uuid', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ 更新模型配置失败:', error)
        throw new Error(`数据库更新失败: ${error.message}`)
      }

      console.log('✅ 模型配置更新成功:', {
        modelName: modelConfig.name,
        modelId,
        totalModelsInDB: data.custom_models?.length || 0
      })
      
      return { userInfo: data }
    } catch (error) {
      console.error('💥 更新模型配置出错:', error)
      
      // 提供更详细的错误信息
      if (error instanceof Error) {
        throw new Error(`更新模型失败: ${error.message}`)
      }
      throw new Error('更新模型失败: 未知错误')
    }
  },

  // 删除自定义模型配置
  async deleteCustomModel(userId: string, modelId: string) {
    try {
      if (!isSupabaseConnected) {
        throw new Error('Database connection unavailable. Model configuration cannot be deleted at this time.')
      }

      console.log('🗑️ 开始删除自定义模型配置:', { userId, modelId })

      // 1. 获取当前用户的模型列表
      const { data: existingUser, error: fetchError } = await supabase
        .from('user_info')
        .select('custom_models')
        .eq('uuid', userId)
        .single()

      if (fetchError) {
        console.error('❌ 获取用户信息失败:', fetchError)
        throw fetchError
      }

      const existingModels = existingUser?.custom_models || []
      
      console.log('📋 删除前的模型列表:', {
        totalModels: existingModels.length,
        modelIds: existingModels.map((m: any) => ({ id: m.id, name: m.name }))
      })
      
      // 检查要删除的模型是否存在
      const targetModel = existingModels.find((model: any) => model.id === modelId)
      if (!targetModel) {
        console.error('❌ 要删除的模型不存在:', modelId)
        throw new Error(`要删除的模型不存在 (ID: ${modelId})`)
      }
      
      console.log('🎯 找到目标模型:', { id: targetModel.id, name: targetModel.name })
      
      // 2. 过滤掉要删除的模型
      const updatedModels = existingModels.filter((model: any) => model.id !== modelId)
      
      console.log('📋 删除后的模型列表:', {
        totalModels: updatedModels.length,
        modelIds: updatedModels.map((m: any) => ({ id: m.id, name: m.name }))
      })
      
      const updateData = {
        custom_models: updatedModels
      }

      // 3. 如果删除的是默认模型，需要重新设置默认模型
      if (targetModel.isDefault && updatedModels.length > 0) {
        console.log('🔄 重新设置默认模型')
        // 设置第一个模型为默认
        updateData.custom_models = updatedModels.map((model: any, index: number) => ({
          ...model,
          isDefault: index === 0
        }))
        console.log('✅ 新的默认模型:', updateData.custom_models[0]?.name)
      }

      console.log('💾 开始更新数据库...', { updateData })
      
      const { data, error } = await supabase
        .from('user_info')
        .update(updateData)
        .eq('uuid', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ 删除模型配置失败:', error)
        throw new Error(`数据库更新失败: ${error.message}`)
      }

      console.log('✅ 模型配置删除成功，数据库已更新:', {
        updatedModelsCount: data.custom_models?.length || 0
      })
      
      return { userInfo: data }
    } catch (error) {
      console.error('💥 删除模型配置出错:', error)
      // 提供更详细的错误信息
      if (error instanceof Error) {
        throw new Error(`删除模型失败: ${error.message}`)
      }
      throw error
    }
  },

  // 设置默认模型
  async setDefaultModel(userId: string, modelId: string) {
    try {
      if (!isSupabaseConnected) {
        throw new Error('Database connection unavailable. Default model cannot be set at this time.')
      }

      console.log('⭐ 设置默认模型:', userId, modelId)

      // 1. 获取当前用户的模型列表
      const { data: existingUser, error: fetchError } = await supabase
        .from('user_info')
        .select('custom_models')
        .eq('uuid', userId)
        .single()

      if (fetchError) {
        console.error('❌ 获取用户信息失败:', fetchError)
        throw fetchError
      }

      const existingModels = existingUser?.custom_models || []
      const targetModel = existingModels.find((model: any) => model.id === modelId)
      
      if (!targetModel) {
        throw new Error('模型不存在')
      }

      // 2. 更新模型列表中的默认标记
      const updatedModels = existingModels.map((model: any) => ({
        ...model,
        isDefault: model.id === modelId
      }))

      const { data, error } = await supabase
        .from('user_info')
        .update({
          custom_models: updatedModels
        })
        .eq('uuid', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ 设置默认模型失败:', error)
        throw error
      }

      console.log('✅ 默认模型设置成功:', targetModel.name)
      
      // 强制刷新用户信息以获取最新的 custom_models 数据
      const { userInfo: refreshedUserInfo } = await authService.getCurrentUser(true)
      
      return { userInfo: data }
    } catch (error) {
      console.error('💥 设置默认模型出错:', error)
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