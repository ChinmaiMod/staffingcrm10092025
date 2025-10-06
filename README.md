<<<<<<< HEAD
# Staffing CRM - Multi-Tenant SaaS Application

A complete multi-tenant SaaS platform built with React, Supabase, and Stripe. This application provides a scalable foundation for a CRM system with subscription-based pricing and multi-module support.

## 🚀 Features

- **Multi-Tenancy**: Complete tenant isolation with Row Level Security (RLS)
- **Authentication**: Email/password authentication with email verification
- **Subscription Management**: Three-tier pricing (FREE, CRM, SUITE) with Stripe integration
- **Billing Cycles**: Monthly and annual billing options with discounts
- **Module Access Control**: Role-based access to different modules based on subscription tier
- **Secure Backend**: Supabase Edge Functions for server-side operations
- **Responsive UI**: Modern, gradient-themed interface with mobile support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase CLI** - [Installation Guide](https://supabase.com/docs/guides/cli)
- **Git**

You'll also need accounts for:
- [Supabase](https://supabase.com) (free tier available)
- [Stripe](https://stripe.com) (test mode is free)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd "Staffing CRM"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Stripe Secret Key (for Edge Functions)
STRIPE_SECRET_KEY=sk_test_your_secret_key

# Supabase Service Role Key (for Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
VITE_APP_URL=http://localhost:5173

# SendGrid API Key (optional, for sending invite emails)
SENDGRID_API_KEY=your-sendgrid-api-key

# Frontend URL (used to construct invite links)
FRONTEND_URL=http://localhost:5173

# From address for invite emails
INVITE_FROM=no-reply@yourdomain.com
```

## 🗄️ Database Setup

### 1. Link to Supabase Project

```bash
supabase link --project-ref your-project-ref
```

### 2. Apply Database Migrations

```bash
supabase db push
```

This will create:
- **Tables**: tenants, profiles, subscriptions, payments, promo_codes, email_tokens, audit_logs
- **RLS Policies**: Tenant isolation and security rules
- **Indexes**: Performance optimizations
- **Triggers**: Automatic timestamp updates

### 3. Verify Database Setup

Go to your Supabase dashboard and verify that all tables are created under the **Database** → **Tables** section.

## ⚡ Edge Functions Setup

### 1. Deploy Edge Functions

Deploy all Edge Functions to Supabase:

```bash
supabase functions deploy createTenantAndProfile
supabase functions deploy createCheckoutSession
supabase functions deploy stripeWebhook
supabase functions deploy resendVerification
supabase functions deploy verifyToken
supabase functions deploy getPostLoginRoute
supabase functions deploy createInvite
supabase functions deploy acceptInvite
supabase functions deploy updateTenantStatus
```

### 2. Set Edge Function Secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Test Edge Functions

You can test Edge Functions locally:

```bash
supabase functions serve
```

Or invoke them remotely:

```bash
supabase functions invoke createTenantAndProfile --data '{"test": true}'
```

## 💳 Stripe Setup

### 1. Create Products and Prices

Go to your [Stripe Dashboard](https://dashboard.stripe.com/) and create:

**CRM Plan:**
- Product Name: "CRM Plan"
- Monthly Price: $49.00 (create price ID)
- Annual Price: $470.00 (create price ID)

**SUITE Plan:**
- Product Name: "Complete Suite"
- Monthly Price: $149.00 (create price ID)
- Annual Price: $1490.00 (create price ID)

### 2. Update Price IDs in Code

Edit `src/components/Billing/Plans.jsx` and update the price IDs:

```javascript
const PLANS = {
  CRM: {
    stripePriceIds: {
      monthly: 'price_xxxxxxxxxxxxx', // Your CRM monthly price ID
      annual: 'price_xxxxxxxxxxxxx'   // Your CRM annual price ID
    }
  },
  SUITE: {
    stripePriceIds: {
      monthly: 'price_xxxxxxxxxxxxx', // Your SUITE monthly price ID
      annual: 'price_xxxxxxxxxxxxx'   // Your SUITE annual price ID
    }
  }
}
```

### 3. Configure Webhook

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripeWebhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the webhook signing secret and add it to your Edge Function secrets:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
Staffing CRM/
├── src/
│   ├── api/
│   │   ├── supabaseClient.js      # Supabase client initialization
│   │   └── edgeFunctions.js        # Edge Function API calls
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── VerifyEmail.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   └── Auth.css
│   │   ├── Billing/
│   │   │   ├── Plans.jsx
│   │   │   ├── CheckoutButton.jsx
│   │   │   ├── PaymentSuccess.jsx
│   │   │   └── Billing.css
│   │   ├── Dashboard/
│   │   │   ├── TenantDashboard.jsx
│   │   │   └── Dashboard.css
│   │   └── ProtectedRoute.jsx
│   ├── contexts/
│   │   ├── AuthProvider.jsx        # Authentication state
│   │   └── TenantProvider.jsx      # Tenant & subscription state
│   ├── App.jsx                     # Main routing
│   ├── main.jsx                    # React entry point
│   └── index.css                   # Global styles
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Database schema
│   │   ├── 002_rls_policies.sql    # Security policies
│   │   └── 005_tenant_invites.sql  # Tenant invites
│   └── functions/
│       ├── createTenantAndProfile/
│       ├── createCheckoutSession/
│       ├── stripeWebhook/
│       ├── resendVerification/
│       ├── verifyToken/
│       ├── getPostLoginRoute/
│       ├── createInvite/
│       ├── acceptInvite/
│       └── updateTenantStatus/
├── package.json
├── vite.config.js
├── .env.example
└── README.md
```

## 🔐 Security Features

- **Row Level Security (RLS)**: All tables have tenant-scoped policies
- **Email Verification**: Required before full account access
- **Token-based Auth**: Secure JWT tokens from Supabase
- **Server-side Operations**: Critical operations in Edge Functions
- **Stripe Webhook Verification**: Validates payment webhooks
- **Service Role Isolation**: Admin operations use service_role key

## 📊 Database Schema

### Core Tables

1. **tenants**: Company/organization data
2. **profiles**: User profiles linked to tenants
3. **subscriptions**: Active subscription records
4. **payments**: Payment transaction history
5. **promo_codes**: Discount and promotional codes
6. **email_tokens**: Temporary tokens for email verification
7. **audit_logs**: System activity logging
8. **tenant_invites**: Invitations for users to join tenants

### Key Relationships

- One tenant → Many profiles (users)
- One tenant → One active subscription
- One subscription → Many payments
- Profiles linked via `tenant_id` for RLS isolation
- Invites linked to tenants and profiles via `tenant_id` and `profile_id`

## 🎨 Customization

### Branding

Update colors in `src/index.css` and component CSS files:

```css
/* Primary gradient colors */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Plans and Pricing

Edit `src/components/Billing/Plans.jsx`:

```javascript
const PLANS = {
  FREE: { price: { monthly: 0, annual: 0 }, ... },
  CRM: { price: { monthly: 49, annual: 470 }, ... },
  SUITE: { price: { monthly: 149, annual: 1490 }, ... }
}
```

### Email Templates

Customize email verification templates in Supabase:
- Go to **Authentication** → **Email Templates**
- Edit "Confirm signup" and other templates

## 🚢 Deployment

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 2: Netlify

1. Push code to GitHub
2. Import project in [Netlify](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables

### Option 3: Custom Server

```bash
npm run build
# Serve the 'dist' folder with any static server
```

### CI/CD & Local deploy script

- Local PowerShell script: `scripts/deploy.ps1` — convenience script to run migrations and deploy Supabase functions and frontend. It expects the following parameters:
  - SUPABASE_PROJECT_REF, SERVICE_ROLE_KEY, SUPABASE_URL, VERCEL_TOKEN, VERCEL_PROJECT_ID
  - It also uses the environment variable `SUPABASE_DATABASE_URL` to run psql migrations.

- GitHub Actions workflow: `.github/workflows/deploy.yml` — runs on push to `main`. You must add these repository secrets:
  - SUPABASE_DATABASE_URL (connection string)
  - SUPABASE_ACCESS_TOKEN
  - SUPABASE_PROJECT_REF
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_FUNCTIONS_URL

Be sure to test the workflow in a staging branch before using on main.

### Post-Deployment

1. Update `VITE_APP_URL` in environment variables
2. Update Stripe webhook URL to production domain
3. Update Supabase redirect URLs:
   - Go to **Authentication** → **URL Configuration**
   - Add your production domain to allowed redirect URLs

## Deploying to Vercel and Supabase

This project uses a React frontend (Vite) and Supabase Edge Functions. Recommended deployment steps:

1. Supabase (Database migrations & Edge Functions)
   - Run the SQL migrations in order in your Supabase project's SQL editor or using your migration pipeline. Important migrations added:
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/002_rls_policies.sql`
     - `supabase/migrations/005_tenant_invites.sql` (new)
     - `supabase/migrations/006_super_admin_policies.sql` (new)
   - Deploy Edge Functions (Deno) using the Supabase CLI or your preferred deploy method. Functions to deploy:
     - `createTenantAndProfile`
     - `createInvite`
     - `acceptInvite`
     - `updateTenantStatus`
   - Environment variables to set in Supabase for Edge Functions:
     - `SERVICE_ROLE_KEY` (service role key)
     - `SUPABASE_URL`
     - `RESEND_API_KEY` (optional for invite emails)
     - `FRONTEND_URL` or `VITE_FRONTEND_URL`
     - `INVITE_FROM`

2. Vercel (Frontend)
   - Create a Vercel project and point it to this repository.
   - Set the following project environment variables in Vercel:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_FUNCTIONS_URL` — URL where your Edge Functions are reachable (Supabase Functions base URL or proxy)
     - `VITE_FRONTEND_URL` — your deployed frontend URL
   - Build & Deploy: Vercel will run `npm run build` (Vite) and serve the static site.

Notes
- Ensure CORS and authorization headers are properly passed from Vercel to Supabase functions. The client uses the Supabase access token in Authorization headers when calling functions that require identity.
- Test functions in a staging environment before production.

## 🧪 Testing

### Test User Registration

1. Go to `/register`
2. Create a new account
3. Check email for verification link
4. Complete verification
5. Login and access dashboard

### Test Subscription Flow

1. Login to a FREE account
2. Go to `/plans`
3. Select CRM or SUITE plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Verify subscription updates in dashboard

### Test Edge Functions

```bash
# Local testing
supabase functions serve

# Invoke function
curl -X POST http://localhost:54321/functions/v1/createTenantAndProfile \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Super Admin & Invite Details

- New Edge Functions:
  - `createInvite` — generates invite tokens and (optionally) sends an email via SendGrid. Requires `SERVICE_ROLE_KEY` and should validate caller token.
  - `acceptInvite` — used by newly-registered users to accept an invite and be linked to an existing tenant.
  - `updateTenantStatus` — used by SUPER_ADMIN to suspend/activate tenants.

- Environment variables (recommended):
  - `SERVICE_ROLE_KEY` — your Supabase service role key.
  - `RESEND_API_KEY` — optional, for sending invite emails via Resend API.
  - `FRONTEND_URL` or `VITE_FRONTEND_URL` — used to construct invite links.
  - `INVITE_FROM` — optional from address for invite emails.

- Super Admin UI is available at `/super-admin` (visible to users with `role = 'SUPER_ADMIN'`).

- Tests: Deno-based smoke tests are under `supabase/functions/tests/`.

## 📝 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes |
| `VITE_APP_URL` | Application base URL | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key (Edge Functions) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Edge Functions) | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes |
| `SENDGRID_API_KEY` | SendGrid API key (optional) | No |
| `FRONTEND_URL` | Frontend URL (for invite links) | No |
| `INVITE_FROM` | From address for invite emails | No |

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check Supabase connection
supabase status

# Reset local database
supabase db reset
```

### Edge Function Errors

```bash
# View function logs
supabase functions logs createCheckoutSession

# Check function status
supabase functions list
```

### Authentication Issues

1. Verify email templates are enabled in Supabase
2. Check redirect URLs are configured correctly
3. Ensure email delivery is working (check spam folder)
=======
# staffingcrm
>>>>>>> origin/main
