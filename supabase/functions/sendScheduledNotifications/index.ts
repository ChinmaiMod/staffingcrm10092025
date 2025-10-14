import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Recipient {
  email: string
  name: string
  id?: string
  source: 'CONTACTS' | 'INTERNAL_STAFF' | 'CUSTOM'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

        // Fetch recipients based on type
        if (notification.recipient_type === 'CONTACTS') {
          const filters = notification.recipient_filters || {}
          let query = supabaseAdmin
            .from('contacts')
            .select('contact_id, email, first_name, last_name, contact_type, workflow_status, business_id')
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
            contacts.forEach(contact => {
              recipients.push({
                email: contact.email,
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                id: contact.contact_id,
                source: 'CONTACTS'
              })
            })
          }
        } else if (notification.recipient_type === 'INTERNAL_STAFF') {
          let query = supabaseAdmin
            .from('internal_staff')
            .select('staff_id, email, first_name, last_name, business_id, employment_status')
            .eq('tenant_id', notification.tenant_id)
            .not('email', 'is', null)

          // Apply business filter
          if (notification.business_id) {
            query = query.eq('business_id', notification.business_id)
          }

          const { data: staff, error: staffError } = await query

          if (!staffError && staff) {
            staff.forEach(member => {
              recipients.push({
                email: member.email,
                name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
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
              source: 'CUSTOM'
            })
          })
        }

        if (recipients.length === 0) {
          console.log(`No recipients found for notification ${notification.notification_id}`)
          continue
        }

        // Send emails to all recipients
        let successCount = 0
        let failCount = 0

        for (const recipient of recipients) {
          try {
            // Personalize the message
            let personalizedBody = notification.body
              .replace(/{first_name}/g, recipient.name.split(' ')[0] || '')
              .replace(/{last_name}/g, recipient.name.split(' ').slice(1).join(' ') || '')
              .replace(/{name}/g, recipient.name)

            let personalizedSubject = notification.subject
              .replace(/{first_name}/g, recipient.name.split(' ')[0] || '')
              .replace(/{name}/g, recipient.name)

            // Send email via Resend
            const emailData = {
              from: 'noreply@yourdomain.com', // TODO: Configure your verified domain
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
                'Authorization': `Bearer ${RESEND_API_KEY}`,
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
