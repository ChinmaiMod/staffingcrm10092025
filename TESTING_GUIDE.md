# Staffing CRM - Complete Testing Checklist

## 🎯 Testing Environment
- **Local URL**: http://localhost:5173
- **Supabase Dashboard**: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg
- **Database**: Tables created ✅
- **Edge Functions**: 6 functions deployed ✅

---

## TEST 1: User Registration Flow 🆕

### Steps:
1. Go to http://localhost:5173/register
2. Fill in the form:
   - **Company Name**: Test Company Ltd
   - **Email**: your-email@gmail.com (use a real email you can access)
   - **Username**: testuser
   - **Password**: Test123!@# (min 6 chars)

### Expected Results:
- [ ] Form validates all required fields
- [ ] Email format validation works
- [ ] Password strength validation works
- [ ] Success message appears: "Registration successful! Please check your email..."
- [ ] Redirects to `/verify` page

### Verify in Supabase:
1. Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/auth/users
2. Check:
   - [ ] New user appears in Auth Users table
   - [ ] Email confirmation status is "Waiting for verification"

3. Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/editor
4. Check `tenants` table:
   - [ ] New tenant record created with company name
   
5. Check `profiles` table:
   - [ ] New profile record created
   - [ ] Linked to correct tenant_id
   - [ ] Status is "PENDING"

---

## TEST 2: Email Verification ✉️

### Steps:
1. Check your email inbox (and spam folder)
2. Look for "Confirm your signup" email from Supabase
3. Click the verification link

### Expected Results:
- [ ] Verification email received
- [ ] Link redirects to `/verify` page
- [ ] Success message: "Email verified successfully!"
- [ ] User status changes to "ACTIVE" in profiles table

### If Email Not Received:
1. Go to http://localhost:5173/verify
2. Enter your email
3. Click "Resend Verification Email"
4. Check for new email

### Check Email Settings in Supabase:
- Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/auth/templates
- Verify email templates are configured
- Check Authentication > Logs for email delivery status

---

## TEST 3: Login & Authentication 🔐

### Test Valid Login:
1. Go to http://localhost:5173/login
2. Enter your credentials:
   - **Email**: your-email@gmail.com
   - **Password**: Test123!@#
3. Click "Sign In"

### Expected Results:
- [ ] Login successful
- [ ] Redirects to `/dashboard`
- [ ] User info appears in navbar (email)
- [ ] No console errors

### Test Invalid Login:
1. Try wrong password
   - [ ] Error message: "Invalid email or password"

2. Try unverified account
   - [ ] Error message: "Please verify your email address before logging in"

### Test Protected Routes:
1. While logged OUT, try to access:
   - http://localhost:5173/dashboard
   - [ ] Should redirect to `/login`

2. While logged IN, try to access:
   - http://localhost:5173/dashboard
   - [ ] Should display dashboard content

---

## TEST 4: Password Reset Flow 🔑

### Steps:
1. Go to http://localhost:5173/forgot-password
2. Enter your email address
3. Click "Send Reset Link"

### Expected Results:
- [ ] Success message: "Password reset email sent!"
- [ ] Email received with reset link
- [ ] Click link redirects to `/reset-password`
- [ ] Can enter new password
- [ ] Password successfully reset
- [ ] Can login with new password

---

## TEST 5: Dashboard & Tenant Data 📊

### After Logging In:
1. Navigate to http://localhost:5173/dashboard

### Check Dashboard Elements:
- [ ] **Company Info Card**: Shows "Test Company Ltd"
- [ ] **Current Plan Card**: Shows "FREE"
- [ ] **Role Card**: Shows "USER" or "ADMIN"
- [ ] **Status Badge**: Shows "ACTIVE" (green)

### Check Navigation:
- [ ] **User email** displayed in navbar
- [ ] **Sign Out button** visible and working
- [ ] Clicking "Sign Out" logs out and redirects to login

### Check Modules Section:
- [ ] **CRM Module** card visible
- [ ] **Upgrade prompt** visible for locked modules
- [ ] "Upgrade Now" button works (goes to `/plans`)

---

## TEST 6: Billing & Plans Page 💳

### Steps:
1. Click "Upgrade Now" or go to http://localhost:5173/plans

### Check Plans Page:
- [ ] **3 plan cards** displayed: FREE, CRM, SUITE
- [ ] **Billing toggle** works (Monthly/Annual)
- [ ] Prices update when toggling billing cycle
- [ ] "20% off" badge shows on annual billing
- [ ] Current plan shows "Current Plan" badge

### Plan Features Display:
**FREE Plan:**
- [ ] $0/month
- [ ] Shows basic features
- [ ] "Get Started" button

**CRM Plan:**
- [ ] $49/month or $470/year
- [ ] Shows CRM features
- [ ] "Choose Plan" button

**SUITE Plan:**
- [ ] $149/month or $1490/year
- [ ] Shows complete suite features
- [ ] "Choose Plan" button

### Test Checkout (If Stripe Configured):
1. Click "Choose Plan" on CRM plan
2. Expected:
   - [ ] Redirects to Stripe checkout
   - [ ] Payment form loads
   - [ ] Can use test card: 4242 4242 4242 4242

**Note**: If Stripe is not configured, you'll see an error. This is expected.

---

## TEST 7: Database Verification 🗄️

### Check All Tables in Supabase:
Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/editor

1. **tenants** table:
   - [ ] Has your test company record
   - [ ] `tenant_id` is UUID
   - [ ] `status` is "ACTIVE"
   - [ ] `created_at` timestamp populated

2. **profiles** table:
   - [ ] Has your user profile
   - [ ] `tenant_id` matches tenant record
   - [ ] `email` matches registration
   - [ ] `status` is "ACTIVE" (after verification)
   - [ ] `role` is set

3. **subscriptions** table:
   - [ ] May be empty (FREE users don't have subscription records)
   - [ ] Or has FREE plan record

4. **payments** table:
   - [ ] Should be empty (no payments yet)

5. **email_tokens** table:
   - [ ] May have verification token records
   - [ ] Check if `used` = true after verification

6. **promo_codes** table:
   - [ ] Should be empty (unless you added promo codes)

7. **audit_logs** table:
   - [ ] May have registration/login events

### Test Row Level Security (RLS):
1. Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/editor
2. Click on **tenants** table
3. Click "RLS" tab
4. Verify policies are enabled:
   - [ ] `tenants_select_own`
   - [ ] `tenants_update_admin`
   - [ ] `tenants_service_role_all`

---

## TEST 8: Edge Functions 🚀

### Check Deployed Functions:
Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/functions

### Verify All 6 Functions Deployed:
- [ ] createTenantAndProfile
- [ ] createCheckoutSession
- [ ] stripeWebhook
- [ ] resendVerification
- [ ] verifyToken
- [ ] getPostLoginRoute

### Test Edge Function Execution:
1. Click on `createTenantAndProfile`
2. Click "Logs" tab
3. Look for execution logs when you registered

### Expected in Logs:
- [ ] Function was invoked
- [ ] No error messages
- [ ] Execution time < 5 seconds
- [ ] Status: 200 OK

### Test resendVerification Function:
1. Go to http://localhost:5173/verify
2. Enter email and click "Resend"
3. Check function logs in Supabase
4. Verify:
   - [ ] Function executed
   - [ ] Email sent
   - [ ] No errors

---

## TEST 9: Error Handling & Edge Cases 🐛

### Test Form Validations:
1. **Empty fields**:
   - [ ] Shows "All fields are required"

2. **Invalid email**:
   - [ ] Shows "Please enter a valid email address"

3. **Weak password**:
   - [ ] Shows appropriate error message

### Test Network Errors:
1. Disconnect internet
2. Try to login
3. Expected:
   - [ ] Shows connection error message

### Test Session Persistence:
1. Login successfully
2. Refresh the page
3. Expected:
   - [ ] Still logged in
   - [ ] Dashboard loads automatically

4. Close browser and reopen
5. Go to http://localhost:5173
6. Expected:
   - [ ] Still logged in (session persisted)

---

## TEST 10: Responsive Design 📱

### Test on Different Screen Sizes:
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)

### Test Mobile View (375px):
- [ ] Login page is mobile-friendly
- [ ] Registration form is readable
- [ ] Dashboard cards stack vertically
- [ ] Navigation works on mobile
- [ ] Buttons are touch-friendly

### Test Tablet View (768px):
- [ ] Layout adjusts appropriately
- [ ] Plans page shows 2-column grid
- [ ] Dashboard cards in 2 columns

### Test Desktop View (1920px):
- [ ] Full layout with all columns
- [ ] Plans page shows 3 columns
- [ ] Dashboard uses full width

---

## 🎯 Quick Test Summary

### Core Functionality:
- [ ] User can register
- [ ] Email verification works
- [ ] User can login
- [ ] User can reset password
- [ ] Dashboard loads correctly
- [ ] Plans page displays
- [ ] User can logout

### Database:
- [ ] All 7 tables created
- [ ] RLS policies active
- [ ] Data saves correctly
- [ ] Tenant isolation works

### Edge Functions:
- [ ] All 6 functions deployed
- [ ] Functions execute without errors
- [ ] Logs show successful execution

### Security:
- [ ] Protected routes redirect to login
- [ ] RLS prevents cross-tenant access
- [ ] Session management works
- [ ] Email verification required

---

## 🐛 Common Issues & Solutions

### Issue: Email not received
**Solution**: 
- Check spam/junk folder
- Verify email settings in Supabase Auth
- Check Authentication > Logs for delivery status
- Use "Resend Verification" feature

### Issue: Login redirects back to login
**Solution**:
- Email not verified yet
- Check Supabase Auth Users for verification status
- Verify email first

### Issue: "Invalid email or password"
**Solution**:
- Double-check credentials
- Try password reset
- Check if user exists in Supabase Auth

### Issue: Plans page shows Stripe error
**Solution**:
- This is expected if Stripe is not configured
- Add Stripe keys to .env to enable payments
- Update price IDs in Plans.jsx

### Issue: Dashboard shows "No tenant data"
**Solution**:
- Check if createTenantAndProfile Edge Function ran
- Verify tenant record exists in database
- Check Edge Function logs for errors

---

## ✅ Final Checklist

After completing all tests:

- [ ] Can register new users
- [ ] Email verification works
- [ ] Can login/logout
- [ ] Password reset works
- [ ] Dashboard displays correctly
- [ ] Plans page loads
- [ ] Database has correct data
- [ ] Edge Functions work
- [ ] No console errors
- [ ] Responsive design works
- [ ] Session persistence works
- [ ] Protected routes secured

---

## 📞 Next Steps

Once all tests pass:

1. **Configure Stripe** (for payments):
   - Get Stripe test keys
   - Add to .env
   - Update price IDs in code

2. **Customize Branding**:
   - Update colors
   - Add logo
   - Customize email templates

3. **Deploy to Production**:
   - Push to GitHub
   - Deploy on Vercel/Netlify
   - Update environment variables

---

**Status**: Testing in Progress
**Last Updated**: October 5, 2025
**Version**: 1.0.0
