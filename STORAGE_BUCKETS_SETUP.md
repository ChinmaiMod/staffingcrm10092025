# Storage Buckets Configuration Summary

**Date:** October 9, 2025  
**Project:** Staffing CRM - Supabase Storage Setup

---

## ✅ Storage Buckets Created

All 4 storage buckets have been successfully created and configured with RLS policies:

### 1. user-feedback-screenshots
- **Bucket ID:** `user-feedback-screenshots`
- **Access:** Private (authenticated users only)
- **File Size Limit:** 5 MB (5,242,880 bytes)
- **Allowed MIME Types:**
  - `image/png`
  - `image/jpeg`
  - `image/jpg`
  - `image/webp`
  - `image/gif`
- **Use Case:** Screenshot uploads from user feedback/suggestions form
- **Path Structure:** `{tenant_id}/{filename}`

### 2. issue-screenshots
- **Bucket ID:** `issue-screenshots`
- **Access:** Private (authenticated users only)
- **File Size Limit:** 5 MB (5,242,880 bytes)
- **Allowed MIME Types:**
  - `image/png`
  - `image/jpeg`
  - `image/jpg`
  - `image/webp`
  - `image/gif`
- **Use Case:** Screenshot uploads from bug/issue reporting form
- **Path Structure:** `{tenant_id}/{filename}`

### 3. contact-attachments
- **Bucket ID:** `contact-attachments`
- **Access:** Private (authenticated users only)
- **File Size Limit:** 10 MB (10,485,760 bytes)
- **Allowed MIME Types:**
  - `application/pdf`
  - `image/png`, `image/jpeg`, `image/jpg`
  - `application/msword` (DOC)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
  - `text/plain`
- **Use Case:** Contact resumes, cover letters, portfolios
- **Path Structure:** `{tenant_id}/{contact_id}/{filename}`

### 4. business-documents
- **Bucket ID:** `business-documents`
- **Access:** Private (authenticated users only)
- **File Size Limit:** 10 MB (10,485,760 bytes)
- **Allowed MIME Types:**
  - `application/pdf`
  - `image/png`, `image/jpeg`, `image/jpg`
  - `application/msword` (DOC)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
  - `application/vnd.ms-excel` (XLS)
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
  - `text/plain`
- **Use Case:** Business entity documents, contracts, invoices
- **Path Structure:** `{tenant_id}/{business_id}/{filename}`

---

## 🔒 RLS Policies (12 Total)

### Feedback Screenshots (3 policies)
1. **INSERT Policy** - Users can upload to their tenant folder only
2. **SELECT Policy** - Users can view their tenant's screenshots
3. **DELETE Policy** - Users can delete their own uploads

### Issue Screenshots (3 policies)
1. **INSERT Policy** - Users can upload to their tenant folder only
2. **SELECT Policy** - Users can view their tenant's screenshots
3. **DELETE Policy** - Users can delete their own uploads

### Contact Attachments (3 policies)
1. **INSERT Policy** - Users can upload to their tenant folder only
2. **SELECT Policy** - Users can view their tenant's attachments
3. **DELETE Policy** - Admins can delete attachments in their tenant

### Business Documents (3 policies)
1. **INSERT Policy** - Users can upload to their tenant folder only
2. **SELECT Policy** - Users can view their tenant's documents
3. **DELETE Policy** - Admins can delete documents in their tenant

---

## 🛡️ Security Features

### Multi-Tenancy Isolation
- All buckets use folder-based tenant isolation
- Path structure: `{tenant_id}/...`
- RLS policies verify user's tenant_id matches folder structure
- Users cannot access other tenants' files

### Role-Based Access
- **Users:** Can upload and view files in their tenant
- **Admins:** Can upload, view, and delete files in their tenant
- **Super Admins:** Inherit admin permissions across all tenants

### File Validation
- Size limits enforced at bucket level
- MIME type restrictions prevent unauthorized file types
- Client-side validation recommended for better UX

---

## 📝 Usage Examples

### Frontend Upload (React)

```javascript
import { supabase } from './supabaseClient'

// Upload feedback screenshot
async function uploadFeedbackScreenshot(file, tenantId) {
  const fileName = `${Date.now()}_${file.name}`
  const filePath = `${tenantId}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('user-feedback-screenshots')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('user-feedback-screenshots')
    .getPublicUrl(filePath)
  
  return urlData.publicUrl
}

// Upload issue screenshot
async function uploadIssueScreenshot(file, tenantId) {
  const fileName = `${Date.now()}_${file.name}`
  const filePath = `${tenantId}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('issue-screenshots')
    .upload(filePath, file)
  
  if (error) throw error
  
  const { data: urlData } = supabase.storage
    .from('issue-screenshots')
    .getPublicUrl(filePath)
  
  return urlData.publicUrl
}

// Upload contact attachment
async function uploadContactAttachment(file, tenantId, contactId) {
  const fileName = `${Date.now()}_${file.name}`
  const filePath = `${tenantId}/${contactId}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('contact-attachments')
    .upload(filePath, file)
  
  if (error) throw error
  
  const { data: urlData } = supabase.storage
    .from('contact-attachments')
    .getPublicUrl(filePath)
  
  return urlData.publicUrl
}
```

### Delete File

```javascript
async function deleteFile(bucketName, filePath) {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath])
  
  if (error) throw error
}
```

### List Files

```javascript
async function listTenantFiles(bucketName, tenantId) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(tenantId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    })
  
  if (error) throw error
  return data
}
```

---

## ✅ Verification Checklist

- [x] All 4 buckets created
- [x] File size limits configured (5MB for screenshots, 10MB for documents)
- [x] MIME type restrictions applied
- [x] 12 RLS policies created and active
- [x] Tenant-based isolation enforced
- [x] Role-based access control implemented
- [x] Buckets set to private (not public)

---

## 🔄 Next Steps

1. **Test File Uploads** - Verify uploads work from frontend
2. **Monitor Storage Usage** - Check Supabase Dashboard > Storage
3. **Adjust Limits** - Increase if needed for business requirements
4. **Add File Scanning** - Consider virus scanning for production
5. **Backup Strategy** - Configure storage backups if needed

---

## 📊 Storage Capacity

**Supabase Free Tier:**
- Storage: 1 GB
- Transfer: 2 GB/month

**Supabase Pro Tier ($25/month):**
- Storage: 100 GB
- Transfer: 200 GB/month

**Current Configuration:**
- 4 buckets ready
- 12 policies active
- Average file size: 1-2 MB (estimated)
- Capacity for ~500-1000 files on free tier

---

**Last Updated:** October 9, 2025  
**Status:** ✅ All Storage Buckets Configured and Ready
