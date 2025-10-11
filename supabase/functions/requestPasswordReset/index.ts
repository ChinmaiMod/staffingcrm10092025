// Supabase Edge Function: requestPasswordReset
// Deploy to: supabase/functions/requestPasswordReset

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type RequestPayload = {
  email?: string
  redirectTo?: string
}

type EmailResult = {
  id: string
  to: string[]
}

async function sendResetEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  resetUrl: string
): Promise<EmailResult> {
  const subject = 'Reset your Staffing CRM password'
  const text = `Hi,

We received a request to reset your Staffing CRM password. You can choose a new password by visiting the link below:

${resetUrl}

If you did not request a password reset, you can safely ignore this email.

Thanks,
The Staffing CRM Team`

  const html = `
    <p>Hi,</p>
    <p>We received a request to reset your <strong>Staffing CRM</strong> password.</p>
    <p style="margin: 24px 0; text-align: center;">
      <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        Choose a new password
      </a>
    </p>
    <p>If the button above doesn&apos;t work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-family: monospace;">${resetUrl}</p>
    <p>If you didn&apos;t request a password reset, you can safely ignore this email.</p>
    <p style="margin-top: 32px;">Thanks,<br/>The Staffing CRM Team</p>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Resend API error: ${errorBody}`)
  }

  const result = await response.json()
  return result as EmailResult
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'no-reply@staffing-crm.local'
    const defaultFrontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error: Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const payload = (await req.json()) as RequestPayload
    const email = payload.email?.trim().toLowerCase()

    if (!email) {
      throw new Error('Email is required')
    }

    const redirectTo = payload.redirectTo || `${defaultFrontendUrl.replace(/\/$/, '')}/reset-password`

    if (resendApiKey) {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })

      if (error) {
        // For security, do not leak whether the email exists
        if (error.message?.toLowerCase().includes('user not found')) {
          return new Response(
            JSON.stringify({
              success: true,
              delivery: 'resend',
              message: 'If an account exists for that email, a reset link has been sent.',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        }

        throw error
      }

      const actionLink = data?.action_link
      const hashedToken = data?.hashed_token || data?.properties?.hashed_token

      let resetUrl = actionLink
      if (!resetUrl && hashedToken) {
        const url = new URL(redirectTo)
        url.searchParams.set('code', hashedToken)
        url.searchParams.set('type', 'recovery')
        resetUrl = url.toString()
      }

      if (!resetUrl) {
        throw new Error('Failed to generate password reset link')
      }

      await sendResetEmail(resendApiKey, resendFromEmail, email, resetUrl)

      return new Response(
        JSON.stringify({
          success: true,
          delivery: 'resend',
          message: 'If an account exists for that email, a reset link has been sent.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Fallback: use Supabase built-in mailer (may be slower)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      if (error.message?.toLowerCase().includes('user not found')) {
        return new Response(
          JSON.stringify({
            success: true,
            delivery: 'supabase',
            message: 'If an account exists for that email, a reset link has been sent.',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        delivery: 'supabase',
        message: 'If an account exists for that email, a reset link has been sent.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('requestPasswordReset error', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
