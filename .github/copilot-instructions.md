# GitHub Copilot Instructions — Staffing CRM

## Big picture
- React + Vite SPA talking to Supabase (Postgres + Auth + Storage) plus Supabase Edge Functions (Deno) for server-side operations.
- Multi-tenancy is tenant-scoped in the DB (e.g., `tenant_id` columns + RLS); the frontend derives the current tenant from the logged-in user profile.

## Where state comes from (read these first)
- Auth + profile: `src/contexts/AuthProvider.jsx` loads the Supabase session, then fetches `profiles` and caches `crm::tenant_id` + `crm::profile_cache` in `localStorage`.
- Tenant + subscription: `src/contexts/TenantProvider.jsx` loads `tenants` and active `subscriptions` for the effective tenant and caches `crm::tenant_data` + `crm::tenant_subscription`.
- RBAC/permissions: `src/contexts/PermissionsProvider.jsx` reads the `user_permissions` view for the current user and derives feature flags (e.g., client/job-order permissions).
- Route gating: `src/components/ProtectedRoute.jsx` enforces auth (and optional `requireRole`) with a 10s loading timeout.

## Frontend ↔ backend calling convention
- Preferred wrapper: `src/api/edgeFunctions.js` → `callEdgeFunction(functionName, data, userJwt?)`.
	- Uses `VITE_FUNCTIONS_URL` and sends `Authorization: Bearer <userJwt>` (or falls back to anon key).
	- Error contract: edge functions return `{ error: "..." }`; `callEdgeFunction` throws `Error(errorBody.error)`.
- CRM Contacts use a REST-ish edge function: `listContacts/getContact/createContact/...` fetch `${VITE_FUNCTIONS_URL}/crm_contacts[/id]`.

## Edge Functions (Deno) patterns
- Location: `supabase/functions/*/index.ts`.
- For “act as server/admin” operations use `SUPABASE_SERVICE_ROLE_KEY` (example: `supabase/functions/createTenantAndProfile/index.ts`).
- For “act as the current user / respect RLS” create a client with `SUPABASE_ANON_KEY` and forward the incoming `Authorization` header as `global.headers.Authorization` (example: `supabase/functions/sendBulkEmail/index.ts`).

## External integrations you’ll see
- Stripe billing: functions like `createCheckoutSession` + `stripeWebhook` (and UI in `src/components/Billing/`).
- Email: Resend for bulk email + tenant/business/domain-based sender config (see `supabase/functions/sendBulkEmail/index.ts` and shared resend config helpers).
- AI newsletter: OpenRouter (env `OPENROUTER_API_KEY`, optional) via `supabase/functions/generateNewsletterContent/index.ts`.

## Developer workflows (source of truth: `package.json`)
- Dev server: `npm run dev` (or `npm run dev:local`).
- Local Supabase: `npm run setup` (prereq checker) then `npm run supabase:start` (Studio on http://localhost:54323 per `supabase/config.toml`).
- Migrations: `npm run db:migrate` (push) and `npm run db:reset` (reset).
- Tests: `npm run test:run` (Vitest + `tdd-guard-vitest`, setup in `src/test/setup.js`).
- Lint: `npm run lint`.
<parameter name="filePath">.github/copilot-instructions.md