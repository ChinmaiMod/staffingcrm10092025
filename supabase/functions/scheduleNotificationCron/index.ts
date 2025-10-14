// Supabase Cron Function: Daily Notification Processor
// Runs at 9:00 AM every day to process all scheduled notifications
// Deploy: supabase functions deploy scheduleNotificationCron
// Schedule: Set up in Supabase Dashboard → Database → Cron Jobs
//   - Cron expression: 0 9 * * * (9 AM daily)
//   - Or use pg_cron: SELECT cron.schedule('daily-notifications', '0 9 * * *', 'SELECT ...')

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = new Date()
    console.log('🔔 Daily notification cron job triggered at:', startTime.toISOString())
    
    // Parse request body to check source
    const requestBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    console.log('📥 Request source:', requestBody.source || 'unknown')

    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // Create Supabase admin client to check what needs to be sent
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get count of notifications due for sending
    const { data: dueNotifications, error: checkError } = await supabaseAdmin
      .from('scheduled_notifications')
      .select('notification_id, name, next_send_date', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_completed', false)
      .lte('next_send_date', new Date().toISOString())

    if (checkError) {
      console.error('Error checking notifications:', checkError)
    } else {
      console.log(`📊 Found ${dueNotifications?.length || 0} notification(s) due for sending`)
      if (dueNotifications && dueNotifications.length > 0) {
        dueNotifications.forEach(notif => {
          console.log(`  - ${notif.name} (scheduled for ${notif.next_send_date})`)
        })
      }
    }

    // Call the sendScheduledNotifications function to process all due notifications
    const functionUrl = `${SUPABASE_URL}/functions/v1/sendScheduledNotifications`
    
    console.log('📤 Calling sendScheduledNotifications function...')
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    const result = await response.json()
    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()
    
    console.log('✅ Notification processing completed')
    console.log('📊 Results:', JSON.stringify(result, null, 2))
    console.log(`⏱️  Duration: ${duration}ms`)

    // Prepare summary
    const summary = {
      success: response.ok,
      cronExecutionTime: startTime.toISOString(),
      processingDuration: `${duration}ms`,
      notificationsChecked: dueNotifications?.length || 0,
      processingResult: result,
      message: response.ok 
        ? `Successfully processed scheduled notifications at 9 AM`
        : `Failed to process notifications (HTTP ${response.status})`
    }

    return new Response(
      JSON.stringify(summary),
      { 
        status: response.ok ? 200 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Cron job error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Daily notification cron job failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
