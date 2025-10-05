SaaS App — React + Supabase Implementation Design (developer-ready)
Assumptions
App will use Supabase (Postgres + Auth + Storage + Edge Functions).


React frontend (you can use CRA, Vite, or Next.js — examples below use React + react-router).


Stripe for payments. SendGrid (recommended) for email sending if you need custom emails. Supabase can send auth emails if SMTP is configured.


App ID and pages from prior chat are translated into route names (not APEX pages).



Table of contents (quick)
Data model (Postgres SQL)


Supabase configuration & RLS policies


Auth & verification strategy


Edge Functions (server-side) — list + code sketches


Stripe integration (checkout + webhooks)


React app structure & route flows


Key React components & sample code


Token flows: verification, password reset, resend


Tenant & subscription routing logic


Testing, deployment and DNS/SMTP notes


Security, monitoring & operational checklist



1) Data model (Postgres SQL)
Use auth.users (Supabase Auth) for credentials; keep app profile & tenant/subscription tables in Postgres.
Run these SQL statements in Supabase SQL Editor.
-- TENANTS
CREATE TABLE tenants (
  tenant_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     text NOT NULL,
  status           text DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
  created_at       timestamptz DEFAULT now()
);

-- PROFILES (one-to-one with auth.users)
CREATE TABLE profiles (
  id               uuid PRIMARY KEY, -- equals auth.users.id
  email            text,             -- denormalized for quick lookups
  username         text,
  tenant_id        uuid REFERENCES tenants(tenant_id),
  role             text DEFAULT 'USER', -- ADMIN, USER
  status           text DEFAULT 'PENDING', -- PENDING, ACTIVE, SUSPENDED
  created_at       timestamptz DEFAULT now()
);

-- EMAIL TOKENS (optional if you do custom email verification)
CREATE TABLE email_tokens (
  token_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES profiles(id),
  token            text NOT NULL,
  token_type       text NOT NULL, -- 'VERIFY' | 'RESET'
  expires_at       timestamptz NOT NULL,
  used             boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  subscription_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid REFERENCES tenants(tenant_id),
  plan_name        text NOT NULL, -- 'FREE','CRM','SUITE'
  billing_cycle    text NOT NULL, -- 'MONTHLY','ANNUAL'
  status           text NOT NULL, -- 'ACTIVE','CANCELLED','EXPIRED'
  start_date       timestamptz,
  end_date         timestamptz,
  promo_code       text,
  amount_paid      numeric(10,2),
  stripe_subscription_id text,
  created_at       timestamptz DEFAULT now()
);

-- PAYMENTS / INVOICES
CREATE TABLE payments (
  payment_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid REFERENCES tenants(tenant_id),
  amount           numeric(10,2),
  currency         text DEFAULT 'usd',
  status           text,
  provider_txn_id  text,
  created_at       timestamptz DEFAULT now()
);

-- PROMO CODES
CREATE TABLE promo_codes (
  code             text PRIMARY KEY,
  discount_percent numeric(5,2),
  expires_at       timestamptz,
  is_active        boolean DEFAULT true
);

-- AUDIT LOG
CREATE TABLE audit_logs (
  log_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid,
  tenant_id        uuid,
  action           text,
  details          jsonb,
  created_at       timestamptz DEFAULT now()
);

Notes:
Use gen_random_uuid() (provided by pgcrypto or pgcrypto/pgcrypto extension — ensure enabled: CREATE EXTENSION IF NOT EXISTS pgcrypto;).


profiles.id equals auth.users.id (Supabase inserts user id). You must insert profile row after signUp.



2) Supabase configuration & RLS policies
Goal: enforce tenant isolation and prevent cross-tenant reads/writes.
Create application-level variables
Create Supabase Project config env (SERVICE_ROLE_KEY for Edge functions).


Create APP_HOST and FRONTEND_URL values in your env for generating links.


RLS sample: profiles and tenant-managed tables
Enable RLS and add policies:
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: allow users to see & update only their profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions table: only allow selects for tenant members
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subs_select_tenant" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.tenant_id = subscriptions.tenant_id
    )
  );

CREATE POLICY "subs_insert_stripe" ON subscriptions
  FOR INSERT USING ( true ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.tenant_id = subscriptions.tenant_id
    )
  );

Notes:
Adjust policies to allow your server-side Edge Functions to bypass (they can use service_role key).


For administrative tasks (super-admin), you may create separate policies and roles.



3) Auth & verification strategy
You have two choices (both supported in Supabase):
Option A — Use Supabase Auth built-in email confirmation (recommended)
When you call supabase.auth.signUp({ email, password }), Supabase will send a confirmation email (if SMTP is configured in Project Settings).


After user clicks confirmation, Auth marks user as confirmed — you then create profile and mark status = ACTIVE.


Advantages: minimal work, email sending is managed by Supabase.


Option B — Custom verification flow (used if you need custom HTML emails, branding)
Use supabase.auth.signUp with email_confirm: false (or sign up via Admin API) and then:


Create a email_tokens row with token.


Use an Edge Function to generate URL with checksum-like security (token + user id).


Send email via SendGrid.


Verification endpoint (Edge Function) accepts token, marks profiles.status = 'ACTIVE'.


We will show Option A (simple) and Option B (custom) where needed below.

4) Edge Functions (server-side) — functions you should implement
Supabase Edge Functions (Deno or Node) or serverless endpoints. Use service_role key for privileged DB access.
List of recommended functions:
createTenantAndProfile — creates tenant row and profile after user signs up.


resendVerification — resend verification mail (custom email).


processVerifyToken — accept token and activate profile (if using custom tokens).


createCheckoutSession — create Stripe Checkout session (server side).


stripeWebhook — handle Stripe events (payment success, subscription created).


applyPromoCode — validate promo and compute discount (optional).


admin/* functions — suspend tenant, manage subscriptions, view logs.


Example Edge Function: createTenantAndProfile (TypeScript, sketch)
This is called after auth.signUp succeeds OR invoked by client (authenticated user) to finalize registration.
// functions/createTenantAndProfile/index.ts
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  const body = await req.json();
  // body: { userId, email, username, companyName }
  const { userId, email, username, companyName } = body;

  // create tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .insert({ company_name: companyName })
    .select("*")
    .single();

  // create profile
  await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      username,
      tenant_id: tenant.tenant_id,
      role: "ADMIN",
      status: "PENDING"
    });

  return new Response(JSON.stringify({ success: true, tenant }), { status: 200 });
});

Call strategy:
Frontend calls Supabase Auth signUp.


Auth returns user object with id.


Frontend calls this createTenantAndProfile function to create tenant & profile.


Alternatively: call an Edge Function that wraps signUp + tenant creation in one request using service key (for advanced flows).

5) Stripe integration (checkout + webhooks)
a) Stripe setup
Create Stripe account, products & prices (monthly, annual) for CRM and Suite.


Store Stripe price IDs in DB (or in config).


b) Create Checkout Session (Edge Function)
Client requests server to create a Checkout Session, passing: plan, billing_cycle, tenant_id, profile_id, promo_code.


Server/Edge Function creates Session with success_url and cancel_url.


success_url should be https://app.example.com/payment-success?session_id={CHECKOUT_SESSION_ID}


Edge Function skeleton (Node/TS):
import Stripe from 'stripe';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET')!, { apiVersion: '2022-11-15' });

// Create checkout session
// req.body: { priceId, quantity, tenantId, profileId, billingCycle }
const session = await stripe.checkout.sessions.create({
  mode: 'subscription', // for subscription
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: {
    metadata: { tenant_id: tenantId }
  },
  success_url: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${FRONTEND_URL}/pricing`
});

Return session.url to client to redirect.
c) Stripe Webhook (Edge Function)
Listen for checkout.session.completed, invoice.paid, customer.subscription.created, customer.subscription.updated, invoice.payment_failed.


On successful subscription/payment, create or update subscriptions record and payments.


Example handling pseudo-code:
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const tenantId = session.metadata.tenant_id;
  // create subscription record with stripe_subscription_id
  // set status ACTIVE
}

Important: verify webhook signature (Stripe's webhook secret).

6) React app structure & route flows
Suggested structure:
src/
  api/                 // client wrappers for Supabase & backend functions
  components/
    Auth/
      Login.jsx
      Register.jsx
      VerifyEmail.jsx
      ForgotPassword.jsx
    Billing/
      Plans.jsx
      CheckoutButton.jsx
      PaymentSuccess.jsx
    Dashboard/
      TenantDashboard.jsx
      SuiteDashboard.jsx
  contexts/
    AuthProvider.jsx
    TenantProvider.jsx
  pages/
    Home.jsx
    LoginPage.jsx
    RegisterPage.jsx
    PlanSelectionPage.jsx
    ResetPasswordPage.jsx
    VerifyPage.jsx
  App.jsx
  routes.jsx

Route flow
/register → register form


/verify?token=... → verification page (process token)


/login → login


/plans → plan picker


/checkout → call createCheckoutSession and redirect to Stripe


/payment-success?session_id=... → shows success and calls backend to finalize


/dashboard → tenant-specific dashboard (CRM, HRMS, Finance links depending on plan)



7) Key React components & sample code
a) Supabase client setup
// src/api/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

b) Register flow (React)
// Register.jsx (simplified)
import { supabase } from '../api/supabaseClient';
import { useState } from 'react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    // validations client-side: password length, match, email regex
    const { data, error } = await supabase.auth.signUp({
      email, password
    });
    if (error) { /* show error */ return; }

    const userId = data.user.id;

    // call edge function to create tenant & profile
    await fetch(`${process.env.REACT_APP_FUNCTIONS_URL}/createTenantAndProfile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, email, username, companyName: company })
    });

    // notify user
    alert('Registered. Check email to verify your account.');
  };

  return (
    <form onSubmit={onSubmit}>
      {/* inputs for email/username/company/password */}
      <button type="submit">Register</button>
    </form>
  );
}

Notes:
If using Supabase built-in email confirmation, after signUp Supabase sends confirmation email automatically (if SMTP set).


If using custom verification, create an email token and send via Edge Function.


c) Login flow
const { data, error } = await supabase.auth.signInWithPassword({ email: loginInput, password });
if (error) { /* handle */ }
const user = data.user;
// fetch profile
const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
// check profile.status
if (profile.status !== 'ACTIVE') {
  // show message and link to resend verification
}

d) Post-login redirect (client)
After login, call a small API (or query subscriptions) to determine route:
const { data: subs } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('tenant_id', profile.tenant_id)
  .eq('status', 'ACTIVE')
  .limit(1);

if (!subs || subs.length === 0) {
  navigate('/plans');
} else if (subs[0].plan_name === 'FREE') {
  window.location.href = CRM_APP_URL; // external CRM app or module route
} else if (subs[0].plan_name === 'CRM') {
  window.location.href = CRM_APP_URL;
} else {
  navigate('/suite-dashboard');
}


8) Token flows: verify, reset, resend
Using Supabase built-in:
signUp triggers confirmation email. Use supabase.auth.api.getUser() and listen for onAuthStateChange events.


Custom flow (if you choose it):
After signUp:


INSERT INTO email_tokens (user_id, token, token_type='VERIFY', expires_at=now()+interval '24 hours', used=false)


Edge Function generates URL: FRONTEND_URL + '/verify?token=' + token.


Email uses SendGrid to send clickable link.


Verification page reads token param, calls Edge Function processVerifyToken which marks profile.status = 'ACTIVE' and sets email_tokens.used = true.


Resend verification: Edge Function resendVerification generates new token & email.


Important: For links in emails, always use absolute URLs (prefixed with https://your-domain) — email clients need full URL.

9) Tenant & subscription routing logic (server/client)
On login (server-side recommended):
Create small RPC or Edge Function getPostLoginRoute(userId) that returns:


{ route: '/plans' } if no active subscription


{ route: '/crm' } for CRM


{ route: '/suite' } for Complete Suite


Use service_role or run as authenticated user with appropriate RLS.
Edge Function example:
// get-post-login-route
const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', userId).single();
const { data: subs } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('tenant_id', profile.tenant_id)
  .eq('status', 'ACTIVE')
  .limit(1);

if (!subs || subs.length === 0) return { route: '/plans' };
if (subs[0].plan_name === 'FREE') return { route: '/crm' };
if (subs[0].plan_name === 'CRM') return { route: '/crm' };
return { route: '/suite' };


10) Password reset
Use Supabase built-in: supabase.auth.resetPasswordForEmail(email) — supabase sends an email with link to reset (you must configure redirect URLs in Supabase auth settings).


Or custom: create email_tokens type RESET, send link to /reset?token=..., process token and let user set new password via Edge Function that calls Supabase Admin API to update password (requires service_role key).



11) Email (SendGrid) & DNS setup
Using SendGrid
Create SendGrid account, create API key.


In Supabase (or Edge function), use SendGrid to send custom emails.


Configure domain authentication in SendGrid:


Add SPF and DKIM TXT CNAME records to your DNS provider (hosting.com, Cloudflare, etc).


Example SPF TXT:

 v=spf1 include:sendgrid.net ~all


Add DKIM CNAMEs provided by SendGrid.


For Supabase built-in confirmation emails you must configure SMTP settings in the Supabase project (or use SendGrid via SMTP).


DNS steps (hosting.com example)
Login -> DNS Management -> Add new DNS records as SendGrid requires (CNAME/TXT).


Wait for propagation; verify in SendGrid UI.



12) Stripe webhooks & finalization
Implement endpoint /stripe/webhook as an Edge Function.


Validate signature with STRIPE_WEBHOOK_SECRET.


On checkout.session.completed, invoice.paid, customer.subscription.created:


Update subscriptions and payments rows.


Optionally add audit_logs.


After successful checkout, stripe redirects to payment-success page where you can confirm subscription by calling your endpoint.


Security:
Do not expose secret keys in frontend; use server/Edge functions.



13) Validation & UX details (client + server)
Client-side validation:
Email regex: ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$


Password length: recommend min 8, max 64; include checks for uppercase/lowercase/number/special char as desired


Show inline help text and validation messages near fields


Server-side validation:
All checks again (never trust client)


Ensure email uniqueness: query auth.users or profiles table



14) RLS & security checks (important)
For every data table, enforce RLS to ensure only tenant-scoped access.


Edge functions that require cross-tenant queries must use service_role key securely (store in env).


Use JWT validation on Edge Functions where appropriate.



15) Testing & local dev tips
Use separate supabase projects for dev/staging/prod.


Use Stripe test keys for local testing and webhooks via stripe-cli or ngrok.


For email, use SendGrid sandbox/test or a temporary mailbox.



16) Deployment & operational notes
Frontend: Deploy to Vercel/Netlify or S3+CloudFront.


Edge Functions: Deploy via Supabase Edge Functions.


DB migrations: Use SQL migration tool (supabase migrations or sqitch/flyway).


Logging & monitoring: Use Sentry for frontend and serverless functions; store audit logs in audit_logs.


Backups: Supabase provides backups; enable scheduled backups.



17) Folder of sample endpoints (summary)
/api/createTenantAndProfile (EdgeFn) — create tenant & profile


/api/resendVerification — resend verification email


/api/verifyToken — verify token (optional)


/api/createCheckoutSession — create Stripe session


/api/stripeWebhook — webhook handler


/api/applyPromoCode — validate promo and compute price



18) Example SQL to create indexes & helpful constraints
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE UNIQUE INDEX ux_profiles_email ON profiles (lower(email));


19) Sample flow: Register → Verify → Login → Plan selection → Checkout (end-to-end)
User registers (supabase.auth.signUp).


Immediately call createTenantAndProfile Edge Function with user id -> creates tenant & profile (status PENDING).


Supabase sends verification email (if built-in) or Edge Function sends via SendGrid.


User clicks link -> frontend calls /api/verifyToken or Edge Function processes -> sets profiles.status = 'ACTIVE'.


User logs in (signInWithPassword).


Frontend calls getPostLoginRoute to route user: no subscription -> /plans.


User selects plan & billing cycle; clicks pay.


Frontend calls /api/createCheckoutSession -> server returns Stripe session URL -> redirect to Stripe Checkout.


Stripe triggers webhook on success -> Edge Function creates subscription record with status = ACTIVE.


On next login, user gets routed to the proper module.



20) Extra: How to implement "Resend verification" link shown at login
When user tries to login and profile.status != 'ACTIVE', respond with message contained with a link:


Link to /resend-verification?email=...


Page calls /api/resendVerification edge function which creates new token and calls SendGrid.


Edge function should check rate limits to prevent abuse.

21) Useful code snippets
Resend verification Edge function skeleton (TS)
// verify-resend
const { email } = await req.json();
// find user by email
const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single();
if (!user) return new Response('Not found', { status: 404 });
// insert token
const token = crypto.randomUUID();
// store and send email via SendGrid

Stripe webhook verification (Node)
const stripe = require('stripe')(STRIPE_SECRET);
const sig = req.headers['stripe-signature'];
let event;
try {
  event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
} catch (err) {
  return res.status(400).send(`Webhook Error: ${err.message}`);
}


22) Final checklist before coding
Supabase project created


SendGrid account + domain authenticated + DNS entries (SPF, DKIM)


Stripe account set up with price IDs


Env variables stored securely (Vercel/Netlify/ Supabase env)


Edge Functions skeletons created and tested


RLS policies configured for tenant isolation


Supabase Auth config: confirmation redirect URLs set


Frontend skeleton with routes and context providers



23) Appendix — recommended libraries
Frontend:


@supabase/supabase-js


react-router-dom


react-query or swr (data fetching)


stripe-js for redirect to Stripe Checkout


Edge/Server:


stripe (server)


@sendgrid/mail (server)


@supabase/supabase-js (server with service_role)


Tools:


pgAdmin/Supabase SQL Editor


stripe-cli for testing webhooks



If you want, I can now:
Generate ready-to-run SQL migration files (one file) for the DB schema above.


Produce Edge Function code files (ready to paste into Supabase Functions) for: createTenantAndProfile, createCheckoutSession, stripeWebhook, resendVerification, verifyToken.


Produce full React example pages for Register, Login, PlanSelection, Verify, ResetPassword, Dashboard (component files and route config).


Which of the above would you like me to produce next (pick one or multiple)?

