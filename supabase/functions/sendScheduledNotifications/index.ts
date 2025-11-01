import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getResendConfig, getSystemResendConfig } from '../_shared/resendConfig.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Recipient {
  email: string
  name: string
  first_name?: string
  last_name?: string
  phone?: string
  business_name?: string
  status?: string
  id?: string
  source: 'CONTACTS' | 'INTERNAL_STAFF' | 'CUSTOM'
}

// Placeholder replacement function
function replacePlaceholders(text: string, recipient: Recipient): string {
  if (!text) return ''
  
  return text
    .replace(/{first_name}/g, recipient.first_name || '')
    .replace(/{last_name}/g, recipient.last_name || '')
    .replace(/{name}/g, recipient.name || '')
    .replace(/{email}/g, recipient.email || '')
    .replace(/{phone}/g, recipient.phone || '')
    .replace(/{business_name}/g, recipient.business_name || '')
    .replace(/{status}/g, recipient.status || '')
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    // Will resolve per-notification using business-specific config
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing environment variables')
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get notifications due for sending
    const { data: notifications, error: fetchError } = await supabaseAdmin
      .rpc('get_notifications_due_for_sending')

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      throw fetchError
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No notifications due for sending', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    // Process each notification
    for (const notification of notifications) {
      try {
        const recipients: Recipient[] = []
        
        // Fetch template if template_id is provided
        let emailSubject = notification.subject
        let emailBody = notification.body
        
        if (notification.template_id) {
          const { data: template, error: templateError } = await supabaseAdmin
            .from('email_templates')
            .select('subject, body_text')
            .eq('template_id', notification.template_id)
            .single()
          
          if (!templateError && template) {
            emailSubject = template.subject || notification.subject
            emailBody = template.body_text || notification.body
          }
        }

        // Fetch recipients based on type
        if (notification.recipient_type === 'CONTACTS') {
          const filters = notification.recipient_filters || {}
          let query = supabaseAdmin
            .from('contacts')
            .select('id, email, first_name, last_name, phone, contact_type, workflow_status, business_id')
            .eq('tenant_id', notification.tenant_id)
            .not('email', 'is', null)

          // Apply business filter
          if (notification.business_id) {
            query = query.eq('business_id', notification.business_id)
          }

          // Apply contact type filter
          if (filters.contact_type) {
            query = query.eq('contact_type', filters.contact_type)
          }

          // Apply status filter
          if (filters.status) {
            query = query.eq('workflow_status', filters.status)
          }

          const { data: contacts, error: contactsError } = await query

          if (!contactsError && contacts) {
            // Get business names for contacts
            const businessIds = [...new Set(contacts.map(c => c.business_id).filter(Boolean))]
            const businessMap = {}
            
            if (businessIds.length > 0) {
              const { data: businesses } = await supabaseAdmin
                .from('businesses')
                .select('business_id, business_name')
                .in('business_id', businessIds)
              
              if (businesses) {
                businesses.forEach(b => {
                  businessMap[b.business_id] = b.business_name
                })
              }
            }

            contacts.forEach(contact => {
              recipients.push({
                email: contact.email,
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                first_name: contact.first_name || '',
                last_name: contact.last_name || '',
                phone: contact.phone || '',
                business_name: businessMap[contact.business_id] || '',
                status: contact.workflow_status || '',
                id: contact.id,
                source: 'CONTACTS'
              })
            })
          }
        } else if (notification.recipient_type === 'INTERNAL_STAFF') {
          let query = supabaseAdmin
            .from('internal_staff')
            .select('staff_id, email, first_name, last_name, phone, job_title, business_id, status')
            .eq('tenant_id', notification.tenant_id)
            .not('email', 'is', null)

          // Apply business filter
          if (notification.business_id) {
            query = query.eq('business_id', notification.business_id)
          }

          const { data: staff, error: staffError } = await query

          if (!staffError && staff) {
            // Get business names for staff
            const businessIds = [...new Set(staff.map(s => s.business_id).filter(Boolean))]
            const businessMap = {}
            
            if (businessIds.length > 0) {
              const { data: businesses } = await supabaseAdmin
                .from('businesses')
                .select('business_id, business_name')
                .in('business_id', businessIds)
              
              if (businesses) {
                businesses.forEach(b => {
                  businessMap[b.business_id] = b.business_name
                })
              }
            }

            staff.forEach(member => {
              recipients.push({
                email: member.email,
                name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
                first_name: member.first_name || '',
                last_name: member.last_name || '',
                phone: member.phone || '',
                business_name: businessMap[member.business_id] || '',
                status: member.status || '',
                id: member.staff_id,
                source: 'INTERNAL_STAFF'
              })
            })
          }
        } else if (notification.recipient_type === 'CUSTOM' && notification.custom_recipients) {
          notification.custom_recipients.forEach(email => {
            recipients.push({
              email: email,
              name: email.split('@')[0],
              first_name: email.split('@')[0],
              last_name: '',
              phone: '',
              business_name: '',
              status: '',
              source: 'CUSTOM'
            })
          })
        }

        if (recipients.length === 0) {
          console.log(`No recipients found for notification ${notification.notification_id}`)
          continue
        }

        // Resolve Resend config per notification (business-specific when available)
        const resendCfg = notification.business_id
          ? await getResendConfig(notification.business_id, notification.tenant_id)
          : getSystemResendConfig()

        // Send emails to all recipients
        let successCount = 0
        let failCount = 0

        for (const recipient of recipients) {
          try {
            // Personalize the message using the placeholder replacement function
            const personalizedBody = replacePlaceholders(emailBody, recipient)
            const personalizedSubject = replacePlaceholders(emailSubject, recipient)

            // Send email via Resend
            const emailData = {
              from: `${resendCfg.fromName} <${resendCfg.fromEmail}>`,
              to: [recipient.email],
              subject: personalizedSubject,
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <title>${personalizedSubject}</title>
                  </head>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    ${personalizedBody.replace(/\n/g, '<br>')}
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #666;">
                      This is an automated notification from Staffing CRM
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
                'Authorization': `Bearer ${resendCfg.apiKey}`,
              },
              body: JSON.stringify(emailData),
            })

            const result = await response.json()

            if (response.ok) {
              successCount++
              
              // Log to history
              await supabaseAdmin.from('notification_history').insert({
                notification_id: notification.notification_id,
                tenant_id: notification.tenant_id,
                sent_at: new Date().toISOString(),
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                recipient_id: recipient.id,
                recipient_source: recipient.source,
                subject: personalizedSubject,
                body: personalizedBody,
                status: 'SENT',
                resend_email_id: result.id
              })
            } else {
              failCount++
              console.error(`Failed to send to ${recipient.email}:`, result)
              
              // Log failure to history
              await supabaseAdmin.from('notification_history').insert({
                notification_id: notification.notification_id,
                tenant_id: notification.tenant_id,
                sent_at: new Date().toISOString(),
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                recipient_id: recipient.id,
                recipient_source: recipient.source,
                subject: personalizedSubject,
                body: personalizedBody,
                status: 'FAILED',
                error_message: JSON.stringify(result)
              })
            }
          } catch (emailError) {
            failCount++
            console.error(`Error sending email to ${recipient.email}:`, emailError)
            
            // Log error to history
            await supabaseAdmin.from('notification_history').insert({
              notification_id: notification.notification_id,
              tenant_id: notification.tenant_id,
              sent_at: new Date().toISOString(),
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              recipient_id: recipient.id,
              recipient_source: recipient.source,
              subject: notification.subject,
              body: notification.body,
              status: 'FAILED',
              error_message: emailError.message
            })
          }
        }

        // Update notification status
        await supabaseAdmin.rpc('update_notification_after_send', {
          p_notification_id: notification.notification_id,
          p_success_count: successCount,
          p_fail_count: failCount
        })

        results.push({
          notification_id: notification.notification_id,
          name: notification.name,
          recipients: recipients.length,
          successful: successCount,
          failed: failCount
        })

      } catch (notificationError) {
        console.error(`Error processing notification ${notification.notification_id}:`, notificationError)
        results.push({
          notification_id: notification.notification_id,
          name: notification.name,
          error: notificationError.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${notifications.length} notification(s)`,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sendScheduledNotifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
