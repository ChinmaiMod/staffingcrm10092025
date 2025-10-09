import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { feedback_id, user_email, tenant_name, subject, message, category } = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    // Format category for display
    const categoryMap = {
      'FEATURE_REQUEST': 'Feature Request',
      'BUG': 'Bug Report',
      'IMPROVEMENT': 'Improvement',
      'QUESTION': 'Question',
      'OTHER': 'Other'
    }
    const displayCategory = categoryMap[category] || category

    // Send email using Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Staffing CRM <noreply@ojosh.com>',
        to: ['feedback@ojosh.com'],
        reply_to: user_email,
        subject: `[${displayCategory}] ${subject}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: #3b82f6;
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #f9fafb;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 120px 1fr;
                gap: 10px;
                margin-bottom: 20px;
              }
              .label {
                font-weight: bold;
                color: #6b7280;
              }
              .value {
                color: #111827;
              }
              .message-box {
                background: white;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
                margin-top: 15px;
              }
              .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
              }
              .category-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
              }
              .badge-feature { background: #dbeafe; color: #1e40af; }
              .badge-bug { background: #fee2e2; color: #991b1b; }
              .badge-improvement { background: #d1fae5; color: #065f46; }
              .badge-question { background: #fef3c7; color: #92400e; }
              .badge-other { background: #f3f4f6; color: #374151; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">💡 New Feedback Received</h2>
            </div>
            <div class="content">
              <div class="info-grid">
                <div class="label">Category:</div>
                <div class="value">
                  <span class="category-badge badge-${category.toLowerCase()}">
                    ${displayCategory}
                  </span>
                </div>
                
                <div class="label">From:</div>
                <div class="value">${user_email}</div>
                
                <div class="label">Company:</div>
                <div class="value">${tenant_name}</div>
                
                <div class="label">Subject:</div>
                <div class="value"><strong>${subject}</strong></div>
                
                <div class="label">Feedback ID:</div>
                <div class="value" style="font-family: monospace; font-size: 11px;">${feedback_id}</div>
              </div>
              
              <div class="message-box">
                <div class="label" style="margin-bottom: 10px;">Message:</div>
                <div style="white-space: pre-wrap;">${message}</div>
              </div>
              
              <div class="footer">
                <p>This feedback was submitted via the Staffing CRM application.</p>
                <p>You can reply directly to this email to contact the user at ${user_email}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    })

    if (!res.ok) {
      const errorData = await res.text()
      throw new Error(`Resend API error: ${res.status} - ${errorData}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, email_id: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending feedback email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
