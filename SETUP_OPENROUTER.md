# OpenRouter API Configuration

## Environment Variables for Supabase Edge Functions

The following environment variables need to be configured in the Supabase dashboard for the `generateNewsletterContent` Edge Function:

### Required:
- **OPENROUTER_API_KEY**: `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`

### Optional:
- **OPENROUTER_REFERRER**: `https://staffingcrm10092025.vercel.app` (frontend URL)
- **AI_MODEL**: `anthropic/claude-sonnet-4-5` (default model if not specified in prompt)

## How to Configure:

1. Go to https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg
2. Navigate to **Edge Functions** → **generateNewsletterContent**
3. Click on **Settings** or look for **Secrets** / **Environment Variables**
4. Add the environment variables listed above
5. Save and redeploy the function if necessary

## Alternative: Using Supabase CLI

If you have Supabase CLI installed and authenticated:

```bash
cd D:\Staffing-CRM
supabase secrets set OPENROUTER_API_KEY=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
supabase secrets set OPENROUTER_REFERRER=https://staffingcrm10092025.vercel.app
```

Note: Edge Function secrets are project-wide, so this will apply to all Edge Functions in the project.

