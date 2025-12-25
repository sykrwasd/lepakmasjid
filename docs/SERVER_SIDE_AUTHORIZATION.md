# Server-Side Authorization Rules

## Critical Security Note

**Client-side authorization checks are for UX only and can be bypassed.** All security MUST be enforced server-side in PocketBase collection rules.

## Current PocketBase Collection Rules

The following rules are defined in `scripts/fix-permissions.js` and MUST be applied to your PocketBase instance:

### Submissions Collection
```javascript
{
  listRule: 'submitted_by = @request.auth.id || @request.auth.role = "admin"',
  viewRule: 'submitted_by = @request.auth.id || @request.auth.role = "admin"',
  createRule: '@request.auth.id != ""',
  updateRule: '@request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
}
```

**Security:** Users can only see their own submissions, or admins can see all. Only admins can approve/reject.

### Users Collection
**Note:** The users collection rules are not explicitly set in fix-permissions.js. The following rules should be applied:

```javascript
{
  listRule: '@request.auth.role = "admin"',
  viewRule: '@request.auth.id = id || @request.auth.role = "admin"',
  updateRule: '@request.auth.id = id || @request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
}
```

**Security:** Users can view/update their own profile, admins can view/update/delete any user.

### Mosques Collection
```javascript
{
  listRule: 'status = "approved" || (created_by = @request.auth.id && @request.auth.id != "") || @request.auth.role = "admin"',
  viewRule: 'status = "approved" || (created_by = @request.auth.id && @request.auth.id != "") || @request.auth.role = "admin"',
  createRule: '@request.auth.id != ""',
  updateRule: 'created_by = @request.auth.id || @request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
}
```

**Security:** Public can see approved mosques. Creators can see their own pending mosques. Admins can see all.

### Audit Logs Collection
```javascript
{
  listRule: '@request.auth.role = "admin"',
  viewRule: '@request.auth.role = "admin"',
  createRule: '', // System can create
  updateRule: null, // No updates allowed
  deleteRule: '@request.auth.role = "admin"',
}
```

**Security:** Only admins can view audit logs. System can create logs via hooks.

## How to Apply Rules

1. Run the fix-permissions script:
   ```bash
   node scripts/fix-permissions.js
   ```

2. Or manually configure in PocketBase Admin UI:
   - Go to Collections → Select Collection → Settings → API Rules
   - Apply the rules listed above

## Verification

To verify rules are correctly applied:

1. Test as unauthenticated user:
   - Should only see approved mosques
   - Should NOT see submissions, users, or audit logs

2. Test as regular user:
   - Should see own submissions only
   - Should see approved mosques + own pending mosques
   - Should NOT see other users' submissions or audit logs

3. Test as admin:
   - Should see all data
   - Should be able to approve/reject submissions
   - Should be able to view audit logs

## Important Notes

- **Never rely on client-side checks alone** - Always verify server-side rules are in place
- **Regular audits** - Periodically verify rules haven't been changed
- **Role field** - Ensure the `role` field exists on users collection and is properly set
- **Admin role** - Only manually grant admin role to trusted users

## Related Files

- `scripts/fix-permissions.js` - Script to apply rules
- `src/components/Auth/AuthGuard.tsx` - Client-side UX guard (NOT security)
- `src/lib/pocketbase.ts` - `isAdmin()` helper (client-side only)

