# GitHub Copilot Instructions — Staffing CRM

## Big picture
- **Architecture**: React + Vite SPA ↔ Supabase (Postgres + Auth + Storage) + Edge Functions (Deno).
- **Multi-tenancy**: Tenant isolation via `tenant_id` columns + Row Level Security (RLS) policies. Current tenant derived from logged-in user's profile.
- **RBAC**: Hierarchical role system (5 levels) with business/contact-type/pipeline scoping in `user_permissions` view (see migrations `015_rbac_system_FIXED.sql`, `016_rbac_data_policies.sql`).
- **Data model**: Core tables include `tenants`, `profiles`, `subscriptions` (Stripe-backed), `businesses` (multi-business support), `contacts`, `pipelines`, `clients`, `job_orders`, `internal_staff`.

## State management & caching strategy
- **Auth + profile**: `src/contexts/AuthProvider.jsx` loads Supabase session, fetches `profiles`, caches `crm::tenant_id` + `crm::profile_cache` in `localStorage`.
- **Tenant + subscription**: `src/contexts/TenantProvider.jsx` loads `tenants` + active `subscriptions`, caches `crm::tenant_data` + `crm::tenant_subscription`.
- **Permissions**: `src/contexts/PermissionsProvider.jsx` fetches `user_permissions` view, derives client/job-order permissions (canView/Edit/Delete/Create).
- **Route protection**: `src/components/ProtectedRoute.jsx` enforces auth (optional `requireRole`), 10s loading timeout to prevent infinite spinners.

## Frontend ↔ backend calling patterns
### Standard Edge Functions
- **Wrapper**: `src/api/edgeFunctions.js` → `callEdgeFunction(functionName, data, userJwt?)`.
  - Sends `Authorization: Bearer <jwt>` (or anon key), hits `${VITE_FUNCTIONS_URL}/${functionName}`.
  - Error contract: functions return `{ error: "..." }`, wrapper throws `Error(errorBody.error)`.
- Examples: `createTenantAndProfile`, `sendBulkEmail`, `createCheckoutSession`, `resendVerification`.

### REST-style CRM Contacts
- CRM contacts use REST patterns: `listContacts()`, `getContact(id)`, `createContact(data)`, `updateContact(id, data)`, `deleteContact(id)`.
- All hit `${VITE_FUNCTIONS_URL}/crm_contacts[/:id]` with GET/POST/PUT/DELETE methods (see `src/api/edgeFunctions.js` lines 120-180).

## Edge Functions (Deno) implementation patterns
- **Location**: `supabase/functions/*/index.ts`.
- **Service role (admin mode)**: Use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for tenant setup, registration, admin operations.
  - Example: `createTenantAndProfile/index.ts` creates tenant + profile with service role, includes auth user replication check loop (6 attempts, 250ms delay).
- **User mode (respect RLS)**: Create Supabase client with `SUPABASE_ANON_KEY` + forward `Authorization` header from request.
  - Example: `sendBulkEmail/index.ts` creates client with `{ global: { headers: { Authorization: authHeader } } }`, then calls `supabaseClient.auth.getUser()`.
- **Shared utilities**: `supabase/functions/_shared/` contains `resendConfig.ts` (business-specific email config lookup), email templates.

## External integrations
- **Stripe**: Subscription billing (3 tiers: FREE/CRM/SUITE), webhooks at `stripeWebhook/index.ts`, UI in `src/components/Billing/`.
- **Resend**: Bulk email with per-business/domain config lookup:
  - Frontend: `src/api/resendConfig.js` → `getResendConfig(businessId, tenantId)`.
  - Backend: `supabase/functions/_shared/resendConfig.ts` → `getResendConfigForDomain(emailDomain, tenantId)`.
  - Config stored in `business_resend_api_keys` and `business_email_domains` tables.
- **OpenRouter** (optional): AI newsletter generation via `generateNewsletterContent/index.ts` using `OPENROUTER_API_KEY`.

## Developer workflows
- **Dev server**: `npm run dev` (port 5173) or `npm run dev:local` (local Supabase mode).
- **Local Supabase**:
  - Setup: `npm run setup` (checks prereqs via PowerShell script).
  - Start: `npm run supabase:start` → Studio at http://localhost:54323 (see `supabase/config.toml`).
  - Stop/restart: `npm run supabase:stop` / `npm run supabase:restart`.
  - Reset: `npm run db:reset` (wipes data, reapplies migrations).
- **Migrations**: `npm run db:migrate` (alias for `supabase db push`).
- **Testing**: `npm run test:run` (Vitest + `tdd-guard-vitest` guard), setup in `src/test/setup.js` (mocks env vars, window.matchMedia, IntersectionObserver).
- **Linting**: `npm run lint` (ESLint with React plugins).

## Project-specific conventions
- **Error handling**: Edge functions return `{ error: "message" }` (NOT throw), frontend wrapper converts to thrown Error.
- **ID types**: Migrations use BIGINT for IDs (see `015_rbac_system_FIXED.sql`), frontend coerces with `src/utils/idCoercion.js`.
- **Loading states**: Components must handle 10s timeout (see `ProtectedRoute.jsx` pattern).
- **Multi-business**: Contacts, clients, job orders scoped to `business_id`; resend config/domains vary per business.
- **Deployment**: See `DEPLOYMENT_GUIDE.md`, uses Vercel + Supabase hosted; edge functions deployed via Supabase CLI.
