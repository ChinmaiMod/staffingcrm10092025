import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getResendConfig, getResendConfigForDomain } from '../_shared/resendConfig.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRecipient {
  email: string
  name: string
  business_id?: string  // Optional: business_id from contact
}

interface BulkEmailRequest {
  recipients: EmailRecipient[]
  subject: string
  body: string
  businessId?: string  // Legacy: single business ID for all (deprecated)
  tenantId?: string    // Required: tenant ID
  useTemplate?: boolean
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { recipients, subject, body, businessId, tenantId, useTemplate = false }: BulkEmailRequest = await req.json()

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Subject and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    // Send emails using Resend API with per-recipient config selection
    const emailPromises = recipients.map(async (recipient) => {
      // Determine Resend config for this recipient:
      // 1. If recipient has business_id, try getResendConfig(business_id, tenantId)
      // 2. Otherwise, use domain-based lookup getResendConfigForDomain(emailDomain, tenantId)
      // 3. Fallback to system default
      let resendConfig
      const emailDomain = recipient.email.split('@')[1]?.toLowerCase() || null
      
      if (recipient.business_id) {
        // Try business-specific config first
        resendConfig = await getResendConfig(recipient.business_id, tenantId)
        // If no business-specific config found, fallback to domain-based lookup
        if (!resendConfig.apiKey && emailDomain) {
          const domainLookup = await getResendConfigForDomain(emailDomain, tenantId)
          resendConfig = domainLookup.config
        }
      } else if (emailDomain) {
        // Use domain-based lookup
        const domainLookup = await getResendConfigForDomain(emailDomain, tenantId)
        resendConfig = domainLookup.config
      } else {
        // Fallback to legacy single businessId or system default
        resendConfig = await getResendConfig(businessId || null, tenantId)
      }
      
      if (!resendConfig.apiKey) {
        throw new Error(`No Resend API key configured for recipient ${recipient.email}${recipient.business_id ? ` (business: ${recipient.business_id})` : emailDomain ? ` (domain: ${emailDomain})` : ''}`)
      }
      // Personalize the message with recipient data
      let personalizedBody = body
        .replace(/{first_name}/g, recipient.name.split(' ')[0] || '')
        .replace(/{last_name}/g, recipient.name.split(' ').slice(1).join(' ') || '')
        .replace(/{name}/g, recipient.name)

      const emailData = {
        from: resendConfig.fromName 
          ? `${resendConfig.fromName} <${resendConfig.fromEmail}>`
          : resendConfig.fromEmail,
        to: [recipient.email],
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${subject}</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${personalizedBody.replace(/\n/g, '<br>')}
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                This email was sent from ${resendConfig.fromName}
              </p>
            </body>
          </html>
        `,
        text: personalizedBody,
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendConfig.apiKey}`,
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to send email to ${recipient.email}: ${error}`)
      }

      return await response.json()
    })

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    // Log the email activity in the database (optional)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseAdmin.from('email_logs').insert({
      user_id: user.id,
      recipients_count: recipients.length,
      subject: subject,
      successful_count: successful,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emails sent: ${successful} successful, ${failed} failed`,
        successful,
        failed,
        total: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
