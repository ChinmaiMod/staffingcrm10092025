import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization') || ''
    const tokenMatch = authHeader.match(/Bearer (.*)/i)
    if (!tokenMatch) {
      throw new Error('Missing Authorization bearer token')
    }
    const accessToken = tokenMatch[1]

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { content, promptText, tenantId, model } = await req.json()

    if (!promptText) {
      throw new Error('Prompt text is required')
    }

    // Replace {content} placeholder in prompt with actual content
    const fullPrompt = promptText.replace(/{content}/g, content || '')

    // Get OpenRouter API key from environment
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    
    if (!openrouterApiKey) {
      // Fallback: return a basic response without AI if no API key
      return new Response(
        JSON.stringify({ 
          content: content || '',
          message: 'OpenRouter API key not configured. Returning original content.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the model to use - prioritize model from request, then env var, then default
    const aiModel = model || Deno.env.get('AI_MODEL') || 'anthropic/claude-sonnet-4-5'

    // Call OpenRouter API (compatible with OpenAI format)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': Deno.env.get('OPENROUTER_REFERRER') || 'https://staffingcrm10092025.vercel.app',
        'X-Title': 'Staffing CRM Newsletter'
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a professional newsletter content writer. Generate well-formatted HTML newsletter content based on the user\'s instructions. Always respond with valid HTML that can be used directly in an email newsletter.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenRouter API error: ${errorData}`)
    }

    const aiResult = await response.json()
    const generatedContent = aiResult.choices?.[0]?.message?.content || content || ''

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        generatedContent: generatedContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('generateNewsletterContent error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate content' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

