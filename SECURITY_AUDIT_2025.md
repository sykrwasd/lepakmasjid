# Comprehensive Security Audit Report
**Project:** LepakMasjid v2  
**Date:** December 27, 2025  
**Auditor:** Security Analysis  
**Status:** Pre-Production Review

---

## Executive Summary

This comprehensive security audit evaluated the LepakMasjid application across multiple security domains. The codebase shows **good security practices** in many areas, with several critical issues already addressed from previous audits. However, **additional security hardening is recommended** before production deployment.

### Overall Security Posture: **🟡 MODERATE RISK**

**Key Findings:**
- ✅ **Fixed:** OAuth callback, filter injection, mass assignment, rate limiting
- ⚠️ **Needs Attention:** Security headers, CSP, token storage, environment exposure
- 🔴 **Critical:** Hardcoded fallback URLs, missing security headers

---

## 1. Sensitive Data Exposure

### SEC-2025-001: Hardcoded Production URL in Client Code
**Severity:** 🔴 **CRITICAL**  
**CWE:** CWE-200 (Information Exposure)  
**OWASP:** A01:2021 - Broken Access Control

**Location:**
- `src/lib/pocketbase.ts:3`

**Description:**
The PocketBase URL has a hardcoded fallback value that exposes the production server URL in client-side code. This reveals infrastructure details and could aid attackers.

**Code Reference:**
```3:3:src/lib/pocketbase.ts
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://pb.muazhazali.me';
```

**Impact:**
- Infrastructure information disclosure
- Potential for targeted attacks
- Violates security best practices

**Remediation:**
1. Remove hardcoded fallback URL
2. Require environment variable to be set
3. Fail gracefully if URL is missing

**Fix:**
```typescript
// src/lib/pocketbase.ts
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;

if (!POCKETBASE_URL) {
  throw new Error('VITE_POCKETBASE_URL environment variable is required');
}
```

---

### SEC-2025-002: Environment Variables Exposed to Client
**Severity:** 🟠 **HIGH**  
**CWE:** CWE-200 (Information Exposure)  
**OWASP:** A01:2021 - Broken Access Control

**Location:**
- All `VITE_*` environment variables are bundled into client code

**Description:**
Vite exposes all `VITE_*` prefixed environment variables to the client-side bundle. This means any sensitive configuration is visible in the browser's JavaScript bundle.

**Current Exposed Variables:**
- `VITE_POCKETBASE_URL` - Backend API URL (acceptable)
- `VITE_APP_URL` - Application URL (acceptable)

**Impact:**
- If sensitive data is accidentally prefixed with `VITE_`, it will be exposed
- No way to hide client-accessible variables from source inspection

**Remediation:**
1. ✅ **Current State:** Only non-sensitive URLs are exposed (acceptable)
2. ⚠️ **Best Practice:** Document that `VITE_` prefix means "public"
3. ⚠️ **Review:** Ensure no secrets are ever prefixed with `VITE_`
4. ✅ **Verification:** Current usage is safe (only URLs)

**Recommendation:**
- Add a pre-commit hook to check for secrets in `VITE_*` variables
- Document in README that `VITE_` = public
- Consider using a secrets scanning tool

---

### SEC-2025-003: Auth Tokens Stored in localStorage
**Severity:** 🟠 **HIGH**  
**CWE:** CWE-922 (Insecure Storage of Sensitive Information)  
**OWASP:** A02:2021 - Cryptographic Failures

**Location:**
- `src/lib/pocketbase.ts:16-34`

**Description:**
Authentication tokens are stored in `localStorage`, which is vulnerable to XSS attacks. If an attacker can execute JavaScript on the page, they can steal tokens.

**Code Reference:**
```16:34:src/lib/pocketbase.ts
    // Load auth from localStorage if available
    const authData = localStorage.getItem('pocketbase_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        pbInstance.authStore.save(parsed.token, parsed.model);
      } catch (e) {
        // Invalid auth data, clear it
        localStorage.removeItem('pocketbase_auth');
      }
    }
    
    // Save auth to localStorage on change
    pbInstance.authStore.onChange((token, model) => {
      if (token && model) {
        localStorage.setItem('pocketbase_auth', JSON.stringify({ token, model }));
      } else {
        localStorage.removeItem('pocketbase_auth');
      }
    });
```

**Impact:**
- XSS attacks can steal authentication tokens
- Tokens persist across browser sessions
- No protection against client-side script injection

**Remediation:**
1. **Short-term:** Implement strict Content Security Policy (CSP) to prevent XSS
2. **Medium-term:** Consider httpOnly cookies (requires backend changes)
3. **Current:** PocketBase SDK uses localStorage by default - this is acceptable if CSP is properly configured

**Mitigation (Current Best Practice):**
- ✅ Implement strict CSP headers (see SEC-2025-007)
- ✅ Sanitize all user input to prevent XSS
- ✅ Use React's built-in XSS protection (automatic escaping)
- ⚠️ Consider token refresh mechanism
- ⚠️ Implement token expiration checks

**Note:** For a client-side only app using PocketBase, localStorage is the standard approach. The security depends on preventing XSS through proper input sanitization and CSP.

---

## 2. Input Validation & Sanitization

### SEC-2025-004: Rejection Reason Input Sanitization
**Severity:** 🟡 **MEDIUM**  
**CWE:** CWE-79 (Cross-site Scripting)  
**OWASP:** A03:2021 - Injection

**Location:**
- `src/pages/Admin/Submissions.tsx:47`

**Description:**
Rejection reasons are sanitized only by length limit, but not escaped for HTML/JavaScript injection when displayed. If these reasons are ever displayed to users, XSS is possible.

**Code Reference:**
```43:54:src/pages/Admin/Submissions.tsx
  const handleReject = async () => {
    if (!user || !selectedSubmissionId || !rejectReason.trim()) return;
    
    // Sanitize input - limit length and trim
    const sanitizedReason = rejectReason.trim().slice(0, 500);
    
    try {
      await rejectSubmission.mutateAsync({ 
        id: selectedSubmissionId, 
        reviewedBy: user.id, 
        reason: sanitizedReason 
      });
```

**Impact:**
- If rejection reasons are displayed to users, XSS is possible
- No HTML/script tag filtering
- Could be used for stored XSS attacks

**Remediation:**
1. Escape HTML when displaying rejection reasons
2. Filter out script tags and dangerous HTML
3. Use React's automatic escaping (if using JSX)
4. Consider markdown sanitization if rich text is needed

**Fix:**
```typescript
// Add HTML escaping helper
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// When displaying rejection reason:
<p>{escapeHtml(submission.rejection_reason)}</p>
// Or use React which auto-escapes:
<p>{submission.rejection_reason}</p> // React already escapes
```

**Note:** React automatically escapes content in JSX, so if rejection reasons are only displayed via React components, this is mitigated. However, if they're ever rendered via `dangerouslySetInnerHTML`, this becomes critical.

---

### SEC-2025-005: State Input Validation
**Severity:** 🟢 **LOW** (Already Fixed)  
**Status:** ✅ **VERIFIED**

**Location:**
- `src/lib/validation.ts:6-8`
- `src/lib/api/mosques.ts:78-83`

**Description:**
State input is validated against an allowlist, preventing filter injection. This was identified in the previous audit and has been fixed.

**Verification:**
```6:8:src/lib/validation.ts
export function validateState(state: string): boolean {
  return MALAYSIAN_STATES.includes(state as any);
}
```

✅ **Status:** Properly implemented with allowlist validation.

---

## 3. Authentication & Authorization

### SEC-2025-006: Client-Side Authorization Checks
**Severity:** 🟡 **MEDIUM** (Mitigated by Server-Side Rules)  
**Status:** ✅ **ACCEPTABLE**

**Location:**
- `src/components/Auth/AuthGuard.tsx`
- `src/lib/pocketbase.ts:54-57`

**Description:**
Client-side authorization checks exist but are properly backed by server-side PocketBase collection rules. This is the correct approach.

**Verification:**
- ✅ Server-side rules defined in `scripts/fix-permissions.js`
- ✅ Client-side checks are for UX only
- ✅ All admin operations require `@request.auth.role = "admin"` in PocketBase

**Status:** ✅ **ACCEPTABLE** - Client-side checks are fine when backed by server-side enforcement.

---

### SEC-2025-007: Rate Limiting Implementation
**Severity:** 🟢 **LOW** (Already Implemented)  
**Status:** ✅ **VERIFIED**

**Location:**
- `src/lib/rate-limit.ts`
- `src/stores/auth.ts:44-64`

**Description:**
Client-side rate limiting is implemented for login and registration. This provides defense-in-depth, though server-side rate limiting should also be configured.

**Verification:**
```44:64:src/stores/auth.ts
    login: async (email: string, password: string) => {
      // Rate limiting: 5 attempts per 15 minutes per email
      const rateLimitKey = `login:${email.toLowerCase()}`;
      const maxAttempts = 5;
      const windowMs = 15 * 60 * 1000; // 15 minutes
      
      if (!checkRateLimit(rateLimitKey, maxAttempts, windowMs)) {
        const remainingTime = getResetTime(rateLimitKey);
        const minutes = remainingTime ? Math.ceil(remainingTime / 60000) : 15;
        throw new Error(`Too many login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
      }
```

✅ **Status:** Properly implemented. Note: Client-side rate limiting can be bypassed, so server-side rate limiting at PocketBase or infrastructure level is also recommended.

---

## 4. Security Headers & Configuration

### SEC-2025-008: Missing Content Security Policy (CSP)
**Severity:** 🔴 **CRITICAL**  
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)  
**OWASP:** A05:2021 - Security Misconfiguration

**Location:**
- `index.html` - No CSP meta tag
- `public/_redirects` - No headers file
- No CSP configuration in deployment

**Description:**
No Content Security Policy is configured, leaving the application vulnerable to XSS attacks. CSP is critical for protecting against script injection when using localStorage for tokens.

**Impact:**
- XSS attacks can execute arbitrary JavaScript
- Stolen authentication tokens from localStorage
- Potential for session hijacking

**Remediation:**
1. Implement strict CSP headers
2. Configure CSP for Cloudflare Pages
3. Test CSP doesn't break functionality

**Fix:**
Create `public/_headers` file for Cloudflare Pages:
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; font-src 'self' data:; connect-src 'self' https://pb.muazhazali.me; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Note:** Adjust CSP based on your actual dependencies (Leaflet maps, etc.). Test thoroughly.

---

### SEC-2025-009: Missing Security Headers
**Severity:** 🟠 **HIGH**  
**CWE:** CWE-16 (Configuration)  
**OWASP:** A05:2021 - Security Misconfiguration

**Location:**
- No security headers configured

**Missing Headers:**
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer information
- `Strict-Transport-Security` - Force HTTPS (if using custom domain)

**Remediation:**
See SEC-2025-008 fix above - add to `public/_headers` file.

---

## 5. Error Handling & Information Disclosure

### SEC-2025-010: Console Error Logging in Production
**Severity:** 🟡 **MEDIUM**  
**CWE:** CWE-209 (Information Exposure Through Error Message)  
**OWASP:** A01:2021 - Broken Access Control

**Location:**
- `src/lib/error-handler.ts:17-24`

**Description:**
Error handler logs detailed errors to console even in production. While console logs aren't directly exposed to users, they can be viewed in browser DevTools and may leak sensitive information.

**Code Reference:**
```17:24:src/lib/error-handler.ts
  // Log detailed error server-side (console in production, but not exposed to user)
  if (error instanceof Error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  } else {
    console.error('Error details:', error);
  }
```

**Impact:**
- Stack traces may reveal file structure
- Error messages might leak internal details
- Accessible via browser DevTools

**Remediation:**
1. In production, only log to external error tracking service (Sentry, etc.)
2. Sanitize error messages before logging
3. Remove stack traces in production builds
4. Use environment-based logging levels

**Fix:**
```typescript
// src/lib/error-handler.ts
export function sanitizeError(error: unknown): Error {
  const isProduction = import.meta.env.PROD;
  
  // In production, send to error tracking service instead of console
  if (isProduction) {
    // Send to Sentry, LogRocket, etc.
    // Only log sanitized error messages
    if (error instanceof Error) {
      // Log to external service with sanitized data
      // logToErrorService({
      //   message: error.message.replace(/[^\w\s]/g, ''),
      //   // Don't include stack traces
      // });
    }
  } else {
    // Development: full error details
    console.error('Error details:', error);
  }
  
  // ... rest of function
}
```

**Note:** Current implementation is acceptable for MVP, but should be improved for production.

---

## 6. Dependency Security

### SEC-2025-011: Dependency Vulnerability Scan
**Severity:** 🟢 **LOW**  
**Status:** ✅ **CLEAN**

**Verification:**
```bash
pnpm audit --prod
# Result: No known vulnerabilities found
```

✅ **Status:** All production dependencies are up-to-date with no known vulnerabilities.

---

## 7. File Upload Security

### SEC-2025-012: Image Upload Validation
**Severity:** 🟢 **LOW** (Well Implemented)  
**Status:** ✅ **VERIFIED**

**Location:**
- `src/lib/pocketbase-images.ts:113-132`
- `src/pages/Submit.tsx:157-191`

**Description:**
Image uploads are properly validated for file type, size, and MIME type. Multiple layers of validation are in place.

**Verification:**
```113:132:src/lib/pocketbase-images.ts
export function validateImageFile(
  file: File,
  maxSize: number = 5242880, // 5MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
): string | null {
  if (!file) {
    return 'No file provided';
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
    return `File size exceeds ${maxSizeMB}MB limit`;
  }

  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`;
  }

  return null;
}
```

✅ **Status:** Properly implemented with:
- File size limits (5MB)
- MIME type validation
- File extension checking
- Multiple validation layers

**Recommendation:**
- Consider server-side validation in PocketBase hooks
- Add image dimension validation if needed
- Consider virus scanning for production

---

## 8. API Security

### SEC-2025-013: Filter Injection Protection
**Severity:** 🟢 **LOW** (Already Fixed)  
**Status:** ✅ **VERIFIED**

**Location:**
- `src/lib/validation.ts`
- `src/lib/api/mosques.ts`
- `src/lib/api/audit.ts`
- `src/lib/api/submissions.ts`

**Description:**
All filter inputs are validated against allowlists, preventing filter injection attacks. This was identified in previous audit and has been fixed.

**Verification:**
- ✅ State validation: `validateState()`
- ✅ Action validation: `validateAction()`
- ✅ Entity type validation: `validateEntityType()`
- ✅ Date validation: `validateISODate()`
- ✅ Record ID validation: `validateRecordId()`
- ✅ Search term sanitization: `sanitizeSearchTerm()`

✅ **Status:** Comprehensive input validation is in place.

---

### SEC-2025-014: Mass Assignment Protection
**Severity:** 🟢 **LOW** (Already Fixed)  
**Status:** ✅ **VERIFIED**

**Location:**
- `src/lib/api/submissions.ts:92-112`

**Description:**
Submission approval uses field whitelisting to prevent mass assignment attacks.

**Code Reference:**
```92:112:src/lib/api/submissions.ts
    // Whitelist of allowed fields for mosque creation/update
    // This prevents mass assignment attacks where malicious fields could be injected
    const ALLOWED_MOSQUE_FIELDS = [
      'name',
      'name_bm',
      'address',
      'state',
      'lat',
      'lng',
      'description',
      'description_bm',
      'status',
    ] as const;
    
    // Sanitize submission data - only allow whitelisted fields (excluding image)
    const sanitizedData: Record<string, any> = {};
    for (const field of ALLOWED_MOSQUE_FIELDS) {
      if (field in submission.data && submission.data[field] !== undefined) {
        sanitizedData[field] = submission.data[field];
      }
    }
```

✅ **Status:** Properly implemented with field whitelisting.

---

## 9. OAuth & Authentication Flow

### SEC-2025-015: OAuth Callback Handler
**Severity:** 🟢 **LOW** (Already Fixed)  
**Status:** ✅ **VERIFIED**

**Location:**
- `src/pages/AuthCallback.tsx`

**Description:**
OAuth callback handler exists and properly handles the authentication flow.

✅ **Status:** Properly implemented.

---

## 10. Code Quality & Best Practices

### SEC-2025-016: XSS Protection in Chart Component
**Severity:** 🟢 **LOW** (Already Fixed)  
**Status:** ✅ **VERIFIED**

**Location:**
- `src/components/ui/chart.tsx:65-83`

**Description:**
Chart component uses `dangerouslySetInnerHTML` but includes proper sanitization functions.

**Code Reference:**
```65:83:src/components/ui/chart.tsx
/**
 * Sanitizes CSS color values to prevent XSS
 * Removes dangerous characters that could be used for injection
 */
function sanitizeCSSValue(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  // Remove potentially dangerous characters: < > ' " and backslash
  // Allow only safe CSS color formats (hex, rgb, rgba, hsl, named colors)
  return value.replace(/[<>'"\\]/g, '').trim();
}

/**
 * Sanitizes CSS variable key names to prevent injection
 */
function sanitizeCSSKey(key: string): string {
  if (!key || typeof key !== 'string') {
    return '';
  }
  // Only allow alphanumeric, dash, and underscore for CSS variable names
  return key.replace(/[^a-zA-Z0-9_-]/g, '');
}
```

✅ **Status:** Properly sanitized.

---

## Summary of Findings

### Critical Issues (Must Fix Before Production)
1. 🔴 **SEC-2025-001:** Hardcoded production URL in client code
2. 🔴 **SEC-2025-008:** Missing Content Security Policy (CSP)

### High Severity Issues (Should Fix)
3. 🟠 **SEC-2025-002:** Environment variable exposure (documented, currently safe)
4. 🟠 **SEC-2025-003:** Auth tokens in localStorage (mitigated by CSP)
5. 🟠 **SEC-2025-009:** Missing security headers

### Medium Severity Issues (Consider Fixing)
6. 🟡 **SEC-2025-004:** Rejection reason sanitization (React auto-escapes, but verify)
7. 🟡 **SEC-2025-010:** Console error logging in production

### Low Severity / Already Fixed
8. 🟢 **SEC-2025-005:** State validation ✅
9. 🟢 **SEC-2025-006:** Client-side auth (acceptable) ✅
10. 🟢 **SEC-2025-007:** Rate limiting ✅
11. 🟢 **SEC-2025-011:** Dependencies ✅
12. 🟢 **SEC-2025-012:** Image upload validation ✅
13. 🟢 **SEC-2025-013:** Filter injection protection ✅
14. 🟢 **SEC-2025-014:** Mass assignment protection ✅
15. 🟢 **SEC-2025-015:** OAuth callback ✅
16. 🟢 **SEC-2025-016:** Chart XSS protection ✅

---

## Recommended Action Plan

### Immediate (Before Production)
1. ✅ Remove hardcoded PocketBase URL fallback
2. ✅ Implement Content Security Policy headers
3. ✅ Add security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.)

### Short-term (Within 1-2 Weeks)
4. ⚠️ Review rejection reason display (ensure React escaping)
5. ⚠️ Implement error tracking service (Sentry, LogRocket)
6. ⚠️ Document environment variable security practices

### Long-term (Ongoing)
7. 📋 Regular dependency audits (`pnpm audit`)
8. 📋 Security code reviews for new features
9. 📋 Penetration testing
10. 📋 Security monitoring and alerting

---

## Security Best Practices Checklist

### ✅ Implemented
- [x] Input validation and sanitization
- [x] Server-side authorization rules
- [x] Rate limiting (client-side)
- [x] File upload validation
- [x] Mass assignment protection
- [x] Filter injection prevention
- [x] OAuth callback handling
- [x] Error sanitization (partial)
- [x] Dependency vulnerability scanning

### ⚠️ Needs Improvement
- [ ] Content Security Policy
- [ ] Security headers
- [ ] Error logging service
- [ ] Remove hardcoded URLs
- [ ] Server-side rate limiting

### 📋 Future Enhancements
- [ ] Automated security testing in CI/CD
- [ ] Security monitoring
- [ ] Regular penetration testing
- [ ] Security incident response plan

---

## Conclusion

The LepakMasjid application demonstrates **good security practices** in many areas, with most critical vulnerabilities from previous audits already addressed. The codebase shows attention to security with proper input validation, server-side authorization, and protection against common attacks.

**Key Strengths:**
- Comprehensive input validation
- Server-side authorization enforcement
- Proper file upload validation
- Good error handling structure

**Critical Gaps:**
- Missing security headers (CSP, X-Frame-Options, etc.)
- Hardcoded production URLs
- Console error logging in production

**Risk Assessment:**
- **Current Risk:** 🟡 **MODERATE**
- **After Fixes:** 🟢 **LOW**

**Recommendation:** Address the 2 critical and 3 high-severity issues before production deployment. The application will be production-ready after implementing security headers and removing hardcoded URLs.

---

## Verification Steps

After implementing fixes:

1. **Test CSP:** Verify application works with CSP headers
2. **Test Headers:** Use securityheaders.com to verify header configuration
3. **Test Error Handling:** Verify errors don't leak sensitive information
4. **Test Input Validation:** Attempt filter injection, XSS, etc.
5. **Dependency Scan:** Run `pnpm audit` regularly
6. **Manual Testing:** Attempt to bypass authorization checks

---

**Report Generated:** December 27, 2025  
**Next Review:** After production deployment or major changes

