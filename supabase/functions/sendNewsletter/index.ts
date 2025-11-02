import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getResendConfig, getResendConfigForDomain } from '../_shared/resendConfig.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization') || ''
    const tokenMatch = authHeader.match(/Bearer (.*)/i)
    if (!tokenMatch) throw new Error('Missing Authorization bearer token')
    const accessToken = tokenMatch[1]

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const {
      businessId,
      tenantId,
      subject,
      bodyHtml,
      headerHtml = '',
      footerHtml = '',
      logoUrl = '',
      recipientFilters,
      sendToAll
    } = await req.json()

    if (!businessId || !tenantId || !subject || !bodyHtml) {
      throw new Error('Missing required fields: businessId, tenantId, subject, bodyHtml')
    }

    // Get business info
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('business_name')
      .eq('business_id', businessId)
      .single()

    // Build contact query based on filters
    let contactsQuery = supabaseAdmin
      .from('contacts')
      .select('id, email, first_name, last_name, business_id, contact_type, job_title_id, years_of_experience_id, workflow_status_id, visa_status_id, country_id, state_id, city_id')
      .eq('tenant_id', tenantId)
      .not('email', 'is', null)

    if (!sendToAll) {
      if (recipientFilters?.businessId || businessId) {
        contactsQuery = contactsQuery.eq('business_id', recipientFilters?.businessId || businessId)
      } else {
        contactsQuery = contactsQuery.eq('business_id', businessId)
      }

      if (recipientFilters?.contactType) {
        contactsQuery = contactsQuery.eq('contact_type', recipientFilters.contactType)
      }
      if (recipientFilters?.jobTitleId) {
        contactsQuery = contactsQuery.eq('job_title_id', recipientFilters.jobTitleId)
      }
      if (recipientFilters?.yearsExperienceId) {
        contactsQuery = contactsQuery.eq('years_of_experience_id', recipientFilters.yearsExperienceId)
      }
      if (recipientFilters?.workflowStatusId) {
        contactsQuery = contactsQuery.eq('workflow_status_id', recipientFilters.workflowStatusId)
      }
      if (recipientFilters?.visaStatusId) {
        contactsQuery = contactsQuery.eq('visa_status_id', recipientFilters.visaStatusId)
      }
      if (recipientFilters?.countryId) {
        contactsQuery = contactsQuery.eq('country_id', recipientFilters.countryId)
      }
      if (recipientFilters?.stateId) {
        contactsQuery = contactsQuery.eq('state_id', recipientFilters.stateId)
      }
      if (recipientFilters?.cityId) {
        contactsQuery = contactsQuery.eq('city_id', recipientFilters.cityId)
      }
    } else {
      // Send to all contacts of the business
      contactsQuery = contactsQuery.eq('business_id', businessId)
    }

    const { data: contacts, error: contactsError } = await contactsQuery

    if (contactsError) throw contactsError
    if (!contacts || contacts.length === 0) {
      throw new Error('No contacts found matching the criteria')
    }

    // Create newsletter history record
    const { data: historyRecord, error: historyError } = await supabaseAdmin
      .from('newsletter_history')
      .insert({
        tenant_id: tenantId,
        business_id: businessId,
        subject,
        body_html: bodyHtml,
        recipient_filters: recipientFilters,
        total_recipients: contacts.length,
        sent_by: user.id,
        status: 'SENDING'
      })
      .select()
      .single()

    if (historyError) throw historyError

    // Get business Resend config
    const resendConfig = await getResendConfig(businessId, tenantId)

    if (!resendConfig.apiKey) {
      // Update history status to failed
      await supabaseAdmin
        .from('newsletter_history')
        .update({ status: 'FAILED' })
        .eq('history_id', historyRecord.history_id)

      throw new Error(`No Resend API key configured for business ${businessId}`)
    }

    let sentCount = 0
    let failedCount = 0

    // Send emails to each contact
    for (const contact of contacts) {
      try {
        // Build full HTML with header, logo, body, footer
        let fullHtml = ''
        
        if (logoUrl) {
          fullHtml += `<div style="text-align: center; margin-bottom: 20px;"><img src="${logoUrl}" alt="Logo" style="max-width: 200px; height: auto;"></div>`
        }
        
        fullHtml += headerHtml || ''
        
        // Replace placeholders in body
        let personalizedBody = bodyHtml
          .replace(/{first_name}/g, contact.first_name || '')
          .replace(/{last_name}/g, contact.last_name || '')
          .replace(/{business_name}/g, business?.business_name || '')
          .replace(/{email}/g, contact.email || '')
        
        fullHtml += personalizedBody
        fullHtml += footerHtml || ''

        // Replace placeholders in subject
        const personalizedSubject = subject
          .replace(/{first_name}/g, contact.first_name || '')
          .replace(/{last_name}/g, contact.last_name || '')
          .replace(/{business_name}/g, business?.business_name || '')

        // Determine Resend config for this contact (business or domain-based)
        let contactResendConfig = resendConfig
        if (contact.email) {
          const emailDomain = contact.email.split('@')[1]?.toLowerCase() || null
          if (emailDomain) {
            const domainLookup = await getResendConfigForDomain(emailDomain, tenantId)
            if (domainLookup.config.apiKey) {
              contactResendConfig = domainLookup.config
            }
          }
        }

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${contactResendConfig.apiKey}`
          },
          body: JSON.stringify({
            from: `${contactResendConfig.fromName} <${contactResendConfig.fromEmail}>`,
            to: [contact.email],
            subject: personalizedSubject,
            html: fullHtml
          })
        })

        const emailResult = await emailResponse.json()

        if (emailResponse.ok) {
          sentCount++
          // Create recipient record
          await supabaseAdmin.from('newsletter_recipients').insert({
            history_id: historyRecord.history_id,
            contact_id: contact.id,
            email: contact.email,
            first_name: contact.first_name,
            last_name: contact.last_name,
            status: 'SENT',
            sent_at: new Date().toISOString(),
            resend_email_id: emailResult.id
          })
        } else {
          failedCount++
          await supabaseAdmin.from('newsletter_recipients').insert({
            history_id: historyRecord.history_id,
            contact_id: contact.id,
            email: contact.email,
            first_name: contact.first_name,
            last_name: contact.last_name,
            status: 'FAILED',
            error_message: JSON.stringify(emailResult)
          })
        }
      } catch (emailError) {
        failedCount++
        console.error(`Error sending to ${contact.email}:`, emailError)
        await supabaseAdmin.from('newsletter_recipients').insert({
          history_id: historyRecord.history_id,
          contact_id: contact.id,
          email: contact.email,
          first_name: contact.first_name,
          last_name: contact.last_name,
          status: 'FAILED',
          error_message: emailError.message
        })
      }
    }

    // Update newsletter history with final status
    await supabaseAdmin
      .from('newsletter_history')
      .update({
        status: 'COMPLETED',
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq('history_id', historyRecord.history_id)

    // Create audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      tenant_id: tenantId,
      action: 'NEWSLETTER_SENT',
      resource_type: 'newsletter',
      resource_id: historyRecord.history_id,
      details: {
        business_id: businessId,
        subject,
        total_recipients: contacts.length,
        sent_count: sentCount,
        failed_count: failedCount
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        historyId: historyRecord.history_id,
        totalRecipients: contacts.length,
        sentCount,
        failedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('sendNewsletter error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send newsletter' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

