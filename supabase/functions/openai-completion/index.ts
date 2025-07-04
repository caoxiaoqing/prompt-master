import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Extract request data
    const { messages }: RequestBody = await req.json()
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages format')
    }

    // Generate unique user ID from IP + User Agent
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    // Create hash for anonymous user identification
    const encoder = new TextEncoder()
    const data = encoder.encode(`${clientIP}:${userAgent}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const unauthUserId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    console.log('Processing request for unauth user:', unauthUserId.substring(0, 8) + '...')

    // Get current date for usage tracking
    const currentDate = new Date().toISOString().split('T')[0]

    // Check daily limit from settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'daily_unauth_message_limit')
      .single()

    if (settingsError) {
      console.error('Failed to get settings:', settingsError)
      throw new Error('Configuration error')
    }

    const dailyLimit = parseInt(settingsData.value as string) || 10

    // Get or create usage record for today
    const { data: usageData, error: usageError } = await supabase
      .from('unauthenticated_usage')
      .select('message_count')
      .eq('unauth_user_id', unauthUserId)
      .eq('usage_date', currentDate)
      .single()

    let currentCount = 0
    if (usageError && usageError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Failed to get usage data:', usageError)
      throw new Error('Usage tracking error')
    } else if (usageData) {
      currentCount = usageData.message_count
    }

    // Check if limit exceeded
    if (currentCount >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: 'Daily message limit exceeded',
          limit: dailyLimit,
          used: currentCount,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get model settings
    const { data: modelSettings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['unauth_model_name', 'unauth_max_tokens', 'unauth_temperature'])

    const settings = modelSettings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, any>) || {}

    const modelName = settings.unauth_model_name || 'gpt-3.5-turbo'
    const maxTokens = parseInt(settings.unauth_max_tokens) || 1000
    const temperature = parseFloat(settings.unauth_temperature) || 0.7

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()

    // Update usage count
    const { error: updateError } = await supabase
      .from('unauthenticated_usage')
      .upsert({
        unauth_user_id: unauthUserId,
        usage_date: currentDate,
        message_count: currentCount + 1,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Failed to update usage count:', updateError)
      // Don't fail the request, just log the error
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        ...openaiData,
        usage_info: {
          used: currentCount + 1,
          limit: dailyLimit,
          remaining: dailyLimit - (currentCount + 1)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: 'Please try again later'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})