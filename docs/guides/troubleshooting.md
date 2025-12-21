# 🔧 Troubleshooting Guide

> Common issues and how to fix them

---

## Build Issues

### "Cannot find module" Errors

**Symptom**: Build fails with import resolution errors

**Cause**: Incorrect relative import paths, usually in `src/core/` components

**Fix**:
```typescript
// Use aliases instead of relative paths
import { something } from '@/components/common/Something';
// NOT: import { something } from '../common/Something';
```

**Verify**: Check `vite.config.ts` has the alias configured:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  }
}
```

---

### "Export not found" Errors

**Symptom**: `"X" is not exported by "Y"`

**Cause**: Re-export file missing an export

**Fix**: Check the re-export file includes all used exports:
```typescript
// src/components/common/email.ts
export { sendEmail, generateEmailData } from '@/core/components/shared/email';
```

---

### TypeScript IDE Errors

**Symptom**: IDE shows "Cannot find module 'react'" but build works

**Cause**: IDE TypeScript server not configured correctly

**Not Critical**: Build still works. To fix:
```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or reload window
Cmd+Shift+P → "Developer: Reload Window"
```

---

## Authentication Issues

### "Could not find function without parameters"

**Symptom**: Login fails with RPC function not found error

**Cause**: Calling RPC function without required parameters

**Example**:
```typescript
// WRONG - jwt_get_user_session requires org_id
.rpc('jwt_get_user_session')

// CORRECT - get_my_organizations needs no params
.rpc('get_my_organizations')
```

---

### Login Redirect Loop

**Symptom**: Keeps redirecting between login and app

**Causes**:
1. Session not persisting
2. Cookie domain mismatch
3. Supabase redirect URL not configured

**Fixes**:
1. Check `VITE_COOKIE_DOMAIN` has leading dot: `.zoworks.com`
2. Verify Supabase Auth → URL Configuration includes all subdomains
3. Check browser developer tools → Application → Cookies

---

### "No organizations found"

**Symptom**: Login succeeds but shows no orgs

**Check**:
```sql
-- Verify user exists
SELECT * FROM identity.users WHERE email = 'user@example.com';

-- Verify org membership
SELECT * FROM identity.organization_users WHERE user_id = 'user-uuid';

-- Test RPC directly
SELECT * FROM identity.get_my_organizations();
```

---

## UI Issues

### Stuck Loading State

**Symptom**: Gray overlay with spinner that never goes away

**Cause**: `isSwitchingOrg` state not being cleared

**Fix**: Ensure org switch handler has try/finally:
```typescript
try {
  setIsSwitchingOrg(true);
  // ... switch logic
} finally {
  setIsSwitchingOrg(false); // ALWAYS runs
}
```

---

### Ant Design "Static function" Warning

**Symptom**: Console warning about static `message.loading()` not consuming context

**Cause**: Using `message.loading()` outside of `App` component

**Fix**: Use message from `App.useApp()` hook:
```typescript
const { message } = App.useApp();
message.success('Done!'); // ✓ Works with theme
```

Or just remove the loading message if not critical.

---

### Missing Navigation Items

**Symptom**: Sidebar/nav shows fewer items than expected

**Causes**:
1. Module not enabled for tenant in `app_settings`
2. User doesn't have permission for that module
3. Module not registered

**Check**:
```javascript
// Browser console
console.log(useAuthStore.getState().appSettings?.modules);
console.log(useAuthStore.getState().permissions);
```

---

## Data Issues

### Data Not Showing

**Symptom**: Tables/lists are empty even though data exists

**Causes**:
1. RLS blocking access
2. Wrong `organization_id` filter
3. Query error being swallowed

**Debug**:
```typescript
// Add error logging
const { data, error } = await supabase.from('table').select('*');
if (error) console.error('Query error:', error);
```

**Check Supabase Logs**: Dashboard → Logs → API

---

### Wrong Organization's Data

**Symptom**: Seeing data from another org

**Cause**: RLS not properly configured or `organization_id` not included in query

**Verify RLS**:
```sql
-- Check RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'your_table';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

## Performance Issues

### Slow Initial Load

**Symptom**: App takes 5+ seconds to load

**Causes**:
1. Large bundle (check Plotly.js - 4.8MB)
2. Too many synchronous API calls
3. No code splitting

**Profile**:
```bash
# Build with analysis
yarn build --analyze

# Check bundle sizes in output
```

---

### Frequent Refetching

**Symptom**: Same API calls happening repeatedly

**Cause**: React Query cache not configured or being invalidated

**Check**:
```typescript
// Ensure proper cache time
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Quick Diagnostic Commands

```bash
# Check build
yarn build

# Check TypeScript
yarn tsc --noEmit

# Check ESLint
yarn lint

# Start dev server
yarn dev

# Clear cache and reinstall
rm -rf node_modules .yarn/cache
yarn install
```

---

## Getting More Help

1. Check recent logs in `docs/logs/`
2. Search codebase for similar patterns
3. Check Supabase Dashboard → Logs
4. Review browser Network tab for failed requests
5. Ask user for clarification on expected behavior
