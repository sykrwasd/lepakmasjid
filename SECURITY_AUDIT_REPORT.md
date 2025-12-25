# Security Audit Report
**Application:** LepakMasjid.app  
**Date:** 2025-12-25  
**Auditor:** Security Research Specialist  
**Threat Model:** External attackers, malicious users, automated abuse

---

## Executive Summary

This audit identified **2 Critical**, **4 High**, **3 Medium**, and **1 Low** severity vulnerabilities. The most critical issues involve missing OAuth callback handling, filter injection vulnerabilities, and client-side authorization that can be bypassed.

**Risk Rating:** 🔴 **HIGH** - Immediate remediation required for Critical and High issues before production deployment.

---

## Critical Vulnerabilities

### SEC-001: Missing OAuth Callback Handler
**Severity:** 🔴 **CRITICAL**  
**CWE:** CWE-287 (Improper Authentication)  
**OWASP:** A01:2021 - Broken Access Control

**Location:**
- `src/App.tsx` - Missing route for `/auth/callback`
- `src/stores/auth.ts:82` - OAuth redirects to non-existent route

**Description:**
The Google OAuth flow redirects users to `/auth/callback` after authentication, but no route handler exists in the application. This causes the OAuth flow to fail, preventing users from completing authentication.

**Code Reference:**
```82:84:src/stores/auth.ts
        // Redirect to OAuth
        const redirectUrl = `${window.location.origin}/auth/callback`;
        const url = googleProvider.authUrl + redirectUrl;
```

**Attack Scenario:**
1. User attempts Google OAuth login
2. Redirects to Google, authenticates successfully
3. Google redirects to `/auth/callback` with auth code
4. Application shows 404, user cannot complete login
5. OAuth flow is completely broken

**Impact:**
- Complete failure of Google OAuth authentication
- Users cannot log in via OAuth
- Poor user experience

**Remediation:**
1. Create OAuth callback handler component
2. Add route in `App.tsx`
3. Handle OAuth code exchange with PocketBase

**Fix:**
```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { useAuthStore } from '@/stores/auth';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // PocketBase handles OAuth callback automatically via URL params
        const authData = await pb.collection('users').authWithOAuth2({
          provider: 'google',
          urlCallback: window.location.href,
        });
        
        if (authData) {
          checkAuth();
          navigate('/');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/?error=oauth_failed');
      }
    };

    handleCallback();
  }, [navigate, checkAuth]);

  return <div>Completing authentication...</div>;
}
```

```typescript
// Add to src/App.tsx routes:
<Route path="/auth/callback" element={<AuthCallback />} />
```

---

### SEC-002: Filter Injection in API Queries
**Severity:** 🔴 **CRITICAL**  
**CWE:** CWE-89 (SQL Injection), CWE-943 (NoSQL Injection)  
**OWASP:** A03:2021 - Injection

**Location:**
- `src/lib/api/mosques.ts:80, 119, 217, 242`
- `src/lib/api/audit.ts:16, 20, 24, 28, 32`
- `src/lib/api/submissions.ts:9`

**Description:**
User-controlled input is directly interpolated into PocketBase filter strings without proper sanitization. While quotes are escaped in search terms, other filter parameters (state, status, dates, IDs) are not validated, allowing filter injection attacks.

**Code Reference:**
```79:81:src/lib/api/mosques.ts
        if (filters.state && filters.state !== 'all') {
          filterParts.push(`state = "${filters.state}"`);
        }
```

```15:17:src/lib/api/audit.ts
    if (filters?.action) {
      filterParts.push(`action = "${filters.action}"`);
    }
```

**Attack Scenario:**
1. Attacker manipulates filter parameters in API requests
2. Injects malicious filter syntax: `state = "approved" || 1=1 || "" = ""`
3. Bypasses intended filters to access unauthorized data
4. Could potentially access pending/rejected mosques, other users' data

**Impact:**
- Unauthorized data access
- Bypass of access control filters
- Potential data exfiltration
- Privacy violations

**Remediation:**
1. Implement strict input validation using allowlists
2. Use PocketBase's parameterized query methods where available
3. Validate all filter inputs against expected formats
4. Sanitize all user inputs before use in filters

**Fix:**
```typescript
// src/lib/api/mosques.ts
// Add validation helper
function validateState(state: string): boolean {
  const validStates = ['Johor', 'Kedah', 'Kelantan', /* ... all states ... */];
  return validStates.includes(state);
}

// In list() method:
if (filters.state && filters.state !== 'all') {
  if (!validateState(filters.state)) {
    throw new Error('Invalid state parameter');
  }
  filterParts.push(`state = "${filters.state}"`);
}

// For search, use PocketBase's built-in escaping or parameterized queries
if (filters.search && filters.search.trim()) {
  const searchTerm = filters.search.trim();
  // Use PocketBase's filter builder or escape properly
  filterParts.push(`(name ~ "${searchTerm.replace(/"/g, '\\"')}" || address ~ "${searchTerm.replace(/"/g, '\\"')}")`);
}
```

```typescript
// src/lib/api/audit.ts
// Validate action against allowlist
const VALID_ACTIONS = ['create', 'update', 'delete', 'approve', 'reject'];
const VALID_ENTITY_TYPES = ['mosque', 'submission', 'user'];

if (filters?.action) {
  if (!VALID_ACTIONS.includes(filters.action)) {
    throw new Error('Invalid action parameter');
  }
  filterParts.push(`action = "${filters.action}"`);
}

// Validate dates are ISO format
if (filters?.startDate) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(filters.startDate)) {
    throw new Error('Invalid date format');
  }
  filterParts.push(`timestamp >= "${filters.startDate}"`);
}
```

---

## High Severity Vulnerabilities

### SEC-003: Mass Assignment in Submission Approval
**Severity:** 🟠 **HIGH**  
**CWE:** CWE-915 (Mass Assignment)  
**OWASP:** A01:2021 - Broken Access Control

**Location:**
- `src/lib/api/submissions.ts:35-44`

**Description:**
The `approve()` method directly uses `submission.data` without validation, allowing attackers to inject arbitrary fields into mosque records if they can control submission data.

**Code Reference:**
```35:44:src/lib/api/submissions.ts
  async approve(id: string, reviewedBy: string): Promise<Submission> {
    const submission = await this.get(id);
    
    if (submission.type === 'new_mosque') {
      // Create the mosque
      await pb.collection('mosques').create(submission.data);
    } else if (submission.type === 'edit_mosque' && submission.mosque_id) {
      // Update the mosque
      await pb.collection('mosques').update(submission.mosque_id, submission.data);
    }
```

**Attack Scenario:**
1. Attacker creates submission with malicious data: `{ name: "Mosque", role: "admin", status: "approved" }`
2. Admin approves submission
3. Malicious fields are written to database
4. Could potentially modify user roles, bypass status checks, etc.

**Impact:**
- Unauthorized field modification
- Potential privilege escalation
- Data integrity compromise

**Remediation:**
1. Whitelist allowed fields for mosque creation/update
2. Validate field types and values
3. Strip unknown fields before database operations

**Fix:**
```typescript
// src/lib/api/submissions.ts
async approve(id: string, reviewedBy: string): Promise<Submission> {
  const submission = await this.get(id);
  
  // Whitelist of allowed fields
  const ALLOWED_MOSQUE_FIELDS = [
    'name', 'name_bm', 'address', 'state', 'lat', 'lng',
    'description', 'description_bm', 'image', 'status'
  ];
  
  // Sanitize submission data
  const sanitizedData: Record<string, any> = {};
  for (const field of ALLOWED_MOSQUE_FIELDS) {
    if (field in submission.data) {
      sanitizedData[field] = submission.data[field];
    }
  }
  
  // Force status to pending for new submissions
  sanitizedData.status = 'pending';
  sanitizedData.created_by = submission.submitted_by;
  
  if (submission.type === 'new_mosque') {
    await pb.collection('mosques').create(sanitizedData);
  } else if (submission.type === 'edit_mosque' && submission.mosque_id) {
    // For edits, only update allowed fields
    await pb.collection('mosques').update(submission.mosque_id, sanitizedData);
  }
  
  return await this.update(id, {
    status: 'approved',
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  });
}
```

---

### SEC-004: Client-Side Only Authorization Checks
**Severity:** 🟠 **HIGH**  
**CWE:** CWE-602 (Client-Side Enforcement of Server-Side Security)  
**OWASP:** A01:2021 - Broken Access Control

**Location:**
- `src/components/Auth/AuthGuard.tsx`
- `src/lib/pocketbase.ts:54-57`
- All admin pages rely on client-side checks

**Description:**
Authorization checks (`isAdmin()`, `requireAdmin`) are performed only on the client side. An attacker can bypass these checks by directly calling PocketBase API endpoints or modifying client-side code.

**Code Reference:**
```10:33:src/components/Auth/AuthGuard.tsx
export const AuthGuard = ({ children, requireAdmin = false }: AuthGuardProps) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Check auth state on mount
    useAuthStore.getState().checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
```

**Attack Scenario:**
1. Attacker opens browser DevTools
2. Modifies `isAdmin()` to return `true` or directly calls PocketBase API
3. Bypasses client-side checks
4. Accesses admin endpoints directly: `/api/collections/submissions/records`
5. Performs unauthorized admin actions

**Impact:**
- Unauthorized admin access
- Data manipulation
- User account compromise
- System compromise

**Remediation:**
1. **CRITICAL:** Ensure PocketBase collection rules enforce server-side authorization
2. Verify all admin operations require `@request.auth.role = "admin"` in PocketBase rules
3. Client-side checks are for UX only, not security
4. Add server-side validation for all sensitive operations

**Fix:**
Verify PocketBase collection permissions in `scripts/fix-permissions.js` are correctly applied:

```javascript
submissions: {
  listRule: '@request.auth.role = "admin"',
  viewRule: '@request.auth.role = "admin"',
  createRule: '@request.auth.id != ""',
  updateRule: '@request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
},
users: {
  listRule: '@request.auth.role = "admin"',
  viewRule: '@request.auth.id = @request.auth.id || @request.auth.role = "admin"',
  updateRule: '@request.auth.id = id || @request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
},
```

**Note:** Client-side `AuthGuard` is acceptable for UX, but security MUST be enforced server-side in PocketBase rules.

---

### SEC-005: No Rate Limiting on Authentication Endpoints
**Severity:** 🟠 **HIGH**  
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)  
**OWASP:** A07:2021 - Identification and Authentication Failures

**Location:**
- `src/stores/auth.ts:43-50` (login)
- `src/stores/auth.ts:52-68` (registration)
- No rate limiting implemented

**Description:**
Authentication endpoints (login, registration) have no rate limiting, allowing brute force attacks, credential stuffing, and account enumeration.

**Attack Scenario:**
1. Attacker uses automated tools to attempt login with common passwords
2. Tests thousands of email/password combinations
3. Enumerates valid email addresses via registration errors
4. Compromises user accounts with weak passwords

**Impact:**
- Account takeover via brute force
- Credential stuffing attacks
- Account enumeration
- DoS via excessive registration attempts

**Remediation:**
1. Implement rate limiting at PocketBase level (recommended)
2. Add client-side rate limiting as defense-in-depth
3. Implement CAPTCHA after failed attempts
4. Use exponential backoff for failed login attempts

**Fix:**
Configure rate limiting in PocketBase settings or use a reverse proxy (Cloudflare, nginx). For client-side (defense-in-depth only):

```typescript
// src/lib/rate-limit.ts
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
}

// src/stores/auth.ts
import { checkRateLimit } from '@/lib/rate-limit';

login: async (email: string, password: string) => {
  const rateLimitKey = `login:${email}`;
  if (!checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
    throw new Error('Too many login attempts. Please try again later.');
  }
  
  try {
    await pb.collection('users').authWithPassword(email, password);
    rateLimitStore.delete(rateLimitKey); // Reset on success
    checkAuth();
  } catch (error) {
    throw error;
  }
},
```

**Note:** Client-side rate limiting can be bypassed. Implement server-side rate limiting in PocketBase or at infrastructure level.

---

### SEC-006: Insecure User Input in Admin Operations
**Severity:** 🟠 **HIGH**  
**CWE:** CWE-20 (Improper Input Validation)  
**OWASP:** A03:2021 - Injection

**Location:**
- `src/pages/Admin/Submissions.tsx:31` - Uses `prompt()` for rejection reason
- `src/lib/api/submissions.ts:55-61` - Rejection reason stored without sanitization

**Description:**
Admin rejection reasons are collected via `prompt()` and stored directly without validation or sanitization, creating XSS and injection risks.

**Code Reference:**
```29:39:src/pages/Admin/Submissions.tsx
  const handleReject = async (id: string) => {
    if (!user) return;
    const reason = prompt(t('admin.rejection_reason'));
    if (!reason) return;
    try {
      await rejectSubmission.mutateAsync({ id, reviewedBy: user.id, reason });
      toast.success(t('admin.submission_rejected'));
    } catch (error) {
      toast.error(t('admin.reject_failed'));
    }
  };
```

**Attack Scenario:**
1. Admin enters malicious input: `<script>alert('XSS')</script>` or `"; DROP TABLE mosques; --`
2. Input stored in database
3. When displayed, executes JavaScript or breaks queries
4. If reason is displayed to users, XSS attack occurs

**Impact:**
- Cross-site scripting (XSS)
- Data injection
- Potential account compromise if displayed to users

**Remediation:**
1. Replace `prompt()` with proper form input
2. Sanitize/escape all user input before storage
3. Use proper input validation
4. Escape output when displaying

**Fix:**
```typescript
// src/pages/Admin/Submissions.tsx
// Replace prompt with proper dialog/form
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
const [rejectReason, setRejectReason] = useState('');
const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

const handleReject = async () => {
  if (!user || !selectedSubmissionId || !rejectReason.trim()) return;
  
  // Sanitize input
  const sanitizedReason = rejectReason.trim().slice(0, 500); // Limit length
  
  try {
    await rejectSubmission.mutateAsync({ 
      id: selectedSubmissionId, 
      reviewedBy: user.id, 
      reason: sanitizedReason 
    });
    toast.success(t('admin.submission_rejected'));
    setRejectDialogOpen(false);
    setRejectReason('');
    setSelectedSubmissionId(null);
  } catch (error) {
    toast.error(t('admin.reject_failed'));
  }
};

// In JSX, replace button onClick:
<Button
  variant="destructive"
  onClick={() => {
    setSelectedSubmissionId(submission.id);
    setRejectDialogOpen(true);
  }}
>
  {t('admin.reject')}
</Button>

<Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('admin.rejection_reason')}</DialogTitle>
    </DialogHeader>
    <Textarea
      value={rejectReason}
      onChange={(e) => setRejectReason(e.target.value)}
      placeholder={t('admin.rejection_reason_placeholder')}
      maxLength={500}
    />
    <DialogFooter>
      <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
        {t('common.cancel')}
      </Button>
      <Button variant="destructive" onClick={handleReject}>
        {t('admin.reject')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Medium Severity Vulnerabilities

### SEC-007: XSS Risk in Chart Component
**Severity:** 🟡 **MEDIUM**  
**CWE:** CWE-79 (Cross-site Scripting)  
**OWASP:** A03:2021 - Injection

**Location:**
- `src/components/ui/chart.tsx:70` - Uses `dangerouslySetInnerHTML`

**Description:**
Chart component uses `dangerouslySetInnerHTML` to inject CSS. While the content appears to be generated from configuration, if configuration data comes from user input, XSS is possible.

**Code Reference:**
```70:71:src/components/ui/chart.tsx
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
```

**Remediation:**
1. Verify chart configuration data sources
2. If user-controlled, sanitize/escape all values
3. Consider using CSS-in-JS or style attributes instead
4. Implement Content Security Policy (CSP)

**Fix:**
Ensure chart configuration is never user-controlled. If it must be, sanitize:

```typescript
// Add sanitization helper
function sanitizeCSSValue(value: string): string {
  return value.replace(/[<>'"]/g, ''); // Remove dangerous characters
}

// Apply sanitization before injecting
const sanitizedHtml = Object.entries(THEMES)
  .map(([theme, prefix]) => {
    // ... sanitize all color values ...
    const sanitizedColor = sanitizeCSSValue(color);
    return `  --color-${key}: ${sanitizedColor};`;
  })
  .join('\n');
```

---

### SEC-008: Insufficient Input Validation on Coordinates
**Severity:** 🟡 **MEDIUM**  
**CWE:** CWE-20 (Improper Input Validation)  
**OWASP:** A03:2021 - Injection

**Location:**
- `src/pages/Submit.tsx:154-176` - Latitude/longitude inputs

**Description:**
Coordinate inputs accept any number without validation. Invalid coordinates could cause map errors or be used for injection if passed to unsanitized queries.

**Remediation:**
1. Validate lat/lng ranges: -90 to 90 for lat, -180 to 180 for lng
2. Validate coordinate format
3. Add client and server-side validation

**Fix:**
```typescript
// src/pages/Submit.tsx
const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Add to mosqueSchema
const createMosqueSchema = (t: (key: string) => string) => z.object({
  // ... other fields ...
  lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180),
});
```

---

### SEC-009: Dependency Vulnerability (esbuild)
**Severity:** 🟡 **MEDIUM**  
**CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)  
**OWASP:** A06:2021 - Vulnerable and Outdated Components

**Location:**
- `vite-plugin-ssr@0.4.0` → `esbuild@<=0.24.2`

**Description:**
esbuild vulnerability allows any website to send requests to the development server and read responses. While this affects development only, it's a security concern.

**Remediation:**
1. Update `vite-plugin-ssr` to latest version
2. Or update esbuild directly if possible
3. Ensure development server is not exposed to untrusted networks

**Fix:**
```bash
pnpm update vite-plugin-ssr
# Or check if direct esbuild update is possible
pnpm update esbuild
```

---

## Low Severity Vulnerabilities

### SEC-010: Information Disclosure in Error Messages
**Severity:** 🔵 **LOW**  
**CWE:** CWE-209 (Information Exposure Through Error Message)  
**OWASP:** A01:2021 - Broken Access Control

**Location:**
- Multiple API files log detailed errors to console
- Error messages may expose internal structure

**Description:**
Error messages and console logs may expose sensitive information about system structure, database schema, or internal errors.

**Remediation:**
1. Sanitize error messages before returning to client
2. Use generic error messages for users
3. Log detailed errors server-side only
4. Avoid logging sensitive data

**Fix:**
```typescript
// Create error handler utility
export function sanitizeError(error: any): Error {
  // In production, return generic errors
  if (import.meta.env.PROD) {
    console.error('Internal error:', error); // Server-side log only
    return new Error('An error occurred. Please try again.');
  }
  // In development, show detailed errors
  return error;
}
```

---

## Recommendations Summary

### Immediate Actions (Before Production)
1. ✅ **Fix OAuth callback handler** (SEC-001)
2. ✅ **Implement filter input validation** (SEC-002)
3. ✅ **Add mass assignment protection** (SEC-003)
4. ✅ **Verify PocketBase server-side authorization rules** (SEC-004)
5. ✅ **Implement rate limiting** (SEC-005)
6. ✅ **Replace prompt() with secure form** (SEC-006)

### Short-term Improvements
7. Review chart component XSS risk (SEC-007)
8. Add coordinate validation (SEC-008)
9. Update vulnerable dependencies (SEC-009)
10. Sanitize error messages (SEC-010)

### Long-term Security Enhancements
- Implement Content Security Policy (CSP) headers
- Add security headers (HSTS, X-Frame-Options, etc.)
- Implement audit logging for all admin actions
- Add automated security testing to CI/CD
- Regular dependency audits
- Security code reviews for new features

---

## Verification Strategy

For each fix:
1. **Unit Tests:** Test input validation functions
2. **Integration Tests:** Test API endpoints with malicious input
3. **Manual Testing:** Attempt to bypass authorization checks
4. **Penetration Testing:** Verify fixes prevent identified attack scenarios
5. **Dependency Scan:** Verify dependency updates resolved vulnerabilities

---

## Conclusion

The application has several critical security vulnerabilities that must be addressed before production deployment. The most critical issues are the missing OAuth callback handler and filter injection vulnerabilities. Client-side authorization checks must be backed by robust server-side rules in PocketBase.

**Priority Order:**
1. SEC-001 (OAuth callback) - Blocks feature
2. SEC-002 (Filter injection) - Data breach risk
3. SEC-004 (Server-side auth) - Access control bypass
4. SEC-003 (Mass assignment) - Data integrity
5. SEC-005 (Rate limiting) - Account security
6. SEC-006 (Input validation) - XSS prevention

All Critical and High severity issues should be resolved before production deployment.

