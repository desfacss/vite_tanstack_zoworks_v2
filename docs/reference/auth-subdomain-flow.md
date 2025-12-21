# Multi-Tenant Authentication & Subdomain Flow

**Document Version:** 1.0  
**Created:** 2025-12-21  
**Status:** 🟡 Design Phase

---

## Problem Statement

With subdomain-based multi-tenancy (`vkbs.zoworks.com`, `sk.zoworks.com`), we face these challenges:

1. **Localhost Development**: Can't use subdomains locally without hosts file changes
2. **Login URL**: Should login be on `login.zoworks.com` or on each tenant subdomain?
3. **Session Sharing**: How do sessions work across subdomains?
4. **Post-Login Redirect**: Where does the user go after login?

---

## Recommended Architecture

### Option A: Centralized Login Hub (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User visits ANY URL:                                                 │
│     https://vkbs.zoworks.com/dashboard                                  │
│     https://sk.zoworks.com/tickets                                      │
│     https://app.zoworks.com/                                            │
│                           │                                              │
│                           ▼                                              │
│  2. AuthGuard checks session:                                           │
│     ┌──────────────────────────────┐                                    │
│     │   Session valid?             │                                    │
│     │   - Yes → Continue to app    │                                    │
│     │   - No  → Redirect to login  │                                    │
│     └──────────────────────────────┘                                    │
│                           │ (No session)                                 │
│                           ▼                                              │
│  3. Redirect to Centralized Login:                                      │
│     https://login.zoworks.com?redirect=https://vkbs.zoworks.com/dashboard│
│                           │                                              │
│                           ▼                                              │
│  4. User enters credentials:                                            │
│     ┌──────────────────────────────┐                                    │
│     │   Email/Phone + Password     │                                    │
│     │   OR SSO (Google, etc.)      │                                    │
│     └──────────────────────────────┘                                    │
│                           │                                              │
│                           ▼                                              │
│  5. Supabase Auth succeeds:                                             │
│     - Session token stored in cookie (*.zoworks.com domain)             │
│     - Fetch user's organizations                                        │
│                           │                                              │
│                           ▼                                              │
│  6. Organization Selection (if multiple):                               │
│     ┌──────────────────────────────────────────────────────┐            │
│     │   User belongs to 3 organizations:                   │            │
│     │   • vkbs.zoworks.com (VKBS Industries)              │            │
│     │   • sk.zoworks.com (SK Corp)                         │            │
│     │   • demo.zoworks.com (Demo Tenant)                   │            │
│     └──────────────────────────────────────────────────────┘            │
│                           │ (User selects or single org auto-redirect)  │
│                           ▼                                              │
│  7. Redirect to Tenant Subdomain:                                       │
│     https://vkbs.zoworks.com/dashboard                                  │
│     (with session cookie already valid for *.zoworks.com)               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Login URL | `login.zoworks.com` | Clean separation, works with wildcard |
| Cookie Domain | `.zoworks.com` | Shared across all subdomains |
| Post-Login Redirect | Original URL or org default | Seamless UX |
| Dev Mode | `localhost:5174` acts as hub | No subdomain complexity locally |

---

## Implementation

### 1. Environment Configuration

```typescript
// src/utils/constants.ts or .env

// Production
VITE_AUTH_BASE_URL=https://login.zoworks.com
VITE_APP_BASE_DOMAIN=zoworks.com
VITE_COOKIE_DOMAIN=.zoworks.com  // Note the leading dot for subdomain sharing

// Development  
VITE_AUTH_BASE_URL=http://localhost:5174
VITE_APP_BASE_DOMAIN=localhost:5174
VITE_COOKIE_DOMAIN=localhost
VITE_DEV_MODE=true
```

### 2. Updated TenantResolver

```typescript
// src/core/bootstrap/TenantResolver.ts

import { supabase } from '@/core/lib/supabase';
import env_def from '@/utils/constants';

const AUTH_SUBDOMAINS = ['login', 'auth', 'sso'];
const HUB_SUBDOMAINS = ['app', 'www', 'hub', ''];

export interface TenantConfig {
  // ... existing fields
  isLoginPortal: boolean;
  isHub: boolean;
}

export function getSubdomain(): string {
  const hostname = window.location.hostname;
  
  // Development mode - no subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'hub';
  }
  
  const parts = hostname.split('.');
  return parts.length >= 2 ? parts[0] : 'hub';
}

export function isLoginPortal(): boolean {
  const subdomain = getSubdomain();
  return AUTH_SUBDOMAINS.includes(subdomain);
}

export function isHubPortal(): boolean {
  const subdomain = getSubdomain();
  return HUB_SUBDOMAINS.includes(subdomain) || subdomain === 'hub';
}

export function getLoginUrl(redirectTo?: string): string {
  const baseAuthUrl = env_def.AUTH_BASE_URL || 'https://login.zoworks.com';
  
  if (redirectTo) {
    return `${baseAuthUrl}/login?redirect=${encodeURIComponent(redirectTo)}`;
  }
  return `${baseAuthUrl}/login`;
}

export function getTenantUrl(subdomain: string, path: string = '/'): string {
  const baseDomain = env_def.APP_BASE_DOMAIN || 'zoworks.com';
  
  // Development mode
  if (baseDomain.includes('localhost')) {
    return `http://localhost:5174${path}`;
  }
  
  return `https://${subdomain}.${baseDomain}${path}`;
}
```

### 3. AuthGuard with Redirect Logic

```typescript
// src/core/components/Layout/AuthGuard.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/core/lib/store';
import { isLoginPortal, isHubPortal, getLoginUrl, getTenantUrl } from '@/core/bootstrap/TenantResolver';
import { useTenant } from '@/core/bootstrap/TenantProvider';
import { Spin } from 'antd';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, organization, isLoading, isAuthenticated } = useAuthStore();
  const { config: tenantConfig } = useTenant();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  
  useEffect(() => {
    if (isLoading) return;
    
    // CASE 1: User is on LOGIN portal (login.zoworks.com)
    if (isLoginPortal()) {
      // Login portal should handle auth pages, no redirect needed
      return;
    }
    
    // CASE 2: User is NOT authenticated on a tenant subdomain
    if (!isAuthenticated) {
      const currentUrl = window.location.href;
      const loginUrl = getLoginUrl(currentUrl);
      
      console.log('[AuthGuard] Not authenticated, redirecting to login:', loginUrl);
      setRedirecting(true);
      window.location.href = loginUrl;
      return;
    }
    
    // CASE 3: User IS authenticated but on HUB (no specific tenant)
    if (isHubPortal() && isAuthenticated) {
      // Check if user has organizations
      if (organization?.subdomain) {
        // Redirect to their organization subdomain
        const targetUrl = getTenantUrl(organization.subdomain, '/dashboard');
        console.log('[AuthGuard] Redirecting to org subdomain:', targetUrl);
        setRedirecting(true);
        window.location.href = targetUrl;
        return;
      }
      // If no org, stay on hub for org selection
    }
    
    // CASE 4: User is authenticated on correct tenant subdomain
    // Verify they have access to this tenant
    if (tenantConfig?.organization_id && organization?.id) {
      if (tenantConfig.organization_id !== organization.id) {
        console.warn('[AuthGuard] User does not have access to this tenant');
        // Redirect to their correct subdomain or hub
        const targetUrl = organization.subdomain 
          ? getTenantUrl(organization.subdomain, '/dashboard')
          : getLoginUrl();
        window.location.href = targetUrl;
        return;
      }
    }
    
  }, [isLoading, isAuthenticated, user, organization, tenantConfig]);
  
  if (isLoading || redirecting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }
  
  // Login portal doesn't need auth
  if (isLoginPortal()) {
    return <>{children}</>;
  }
  
  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect
  }
  
  return <>{children}</>;
};

export default AuthGuard;
```

### 4. Login Page with Redirect Handling

```typescript
// src/pages/auth/LoginPage.tsx

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Divider, Select } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { getTenantUrl, isLoginPortal } from '@/core/bootstrap/TenantResolver';

interface UserOrganization {
  id: string;
  name: string;
  subdomain: string;
}

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [showOrgSelect, setShowOrgSelect] = useState(false);
  const { setUser, setOrganization } = useAuthStore();
  
  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    
    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      
      if (authError) throw authError;
      
      // 2. Fetch user's organizations
      const { data: orgsData, error: orgsError } = await supabase
        .schema('identity')
        .rpc('jwt_get_user_session');
      
      if (orgsError) throw orgsError;
      
      const userOrgs: UserOrganization[] = orgsData?.organizations || [];
      
      // 3. Handle organization selection/redirect
      if (userOrgs.length === 0) {
        message.error('No organizations associated with this account');
        return;
      }
      
      if (userOrgs.length === 1) {
        // Single org - redirect directly
        redirectToOrg(userOrgs[0], redirectTo);
      } else {
        // Multiple orgs - show selection
        setOrganizations(userOrgs);
        setShowOrgSelect(true);
      }
      
    } catch (error: any) {
      message.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  const redirectToOrg = (org: UserOrganization, originalRedirect?: string | null) => {
    // Store selected org
    setOrganization({
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
    });
    
    // Determine redirect URL
    let targetUrl: string;
    
    if (originalRedirect) {
      // Validate redirect is to a valid subdomain
      try {
        const url = new URL(originalRedirect);
        const subdomain = url.hostname.split('.')[0];
        
        // Security: Only redirect to the org the user selected
        if (subdomain === org.subdomain) {
          targetUrl = originalRedirect;
        } else {
          targetUrl = getTenantUrl(org.subdomain, '/dashboard');
        }
      } catch {
        targetUrl = getTenantUrl(org.subdomain, '/dashboard');
      }
    } else {
      targetUrl = getTenantUrl(org.subdomain, '/dashboard');
    }
    
    console.log('[Login] Redirecting to:', targetUrl);
    window.location.href = targetUrl;
  };
  
  const handleOrgSelect = (orgId: string) => {
    const selectedOrg = organizations.find(o => o.id === orgId);
    if (selectedOrg) {
      redirectToOrg(selectedOrg, redirectTo);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          Sign in to Zoworks
        </h1>
        
        {!showOrgSelect ? (
          <Form layout="vertical" onFinish={handleLogin}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: 'email' }]}
            >
              <Input size="large" placeholder="you@company.com" />
            </Form.Item>
            
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true }]}
            >
              <Input.Password size="large" placeholder="••••••••" />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block 
                loading={loading}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Select an organization to continue:
            </p>
            
            {organizations.map(org => (
              <Button
                key={org.id}
                size="large"
                block
                className="mb-2"
                onClick={() => handleOrgSelect(org.id)}
              >
                {org.name}
                <span className="text-gray-400 ml-2 text-sm">
                  {org.subdomain}.zoworks.com
                </span>
              </Button>
            ))}
          </div>
        )}
        
        {redirectTo && (
          <p className="text-sm text-gray-400 mt-4 text-center">
            You'll be redirected after login
          </p>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
```

### 5. Vercel Configuration for Wildcard Domains

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

**Vercel Dashboard Settings:**

1. Go to Project Settings → Domains
2. Add these domains:
   - `zoworks.com` (apex)
   - `*.zoworks.com` (wildcard)
   - `login.zoworks.com` (explicit for login portal)
   
3. Configure DNS:
   ```
   A     zoworks.com           76.76.21.21
   CNAME *.zoworks.com         cname.vercel-dns.com
   CNAME login.zoworks.com     cname.vercel-dns.com
   ```

### 6. Cookie Configuration for Cross-Subdomain Auth

```typescript
// src/core/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const cookieDomain = import.meta.env.VITE_COOKIE_DOMAIN || '.zoworks.com';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'zoworks-auth',
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
      },
      setItem: (key, value) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
      },
    },
    // Cookie options for cross-subdomain sharing
    cookieOptions: {
      domain: cookieDomain,
      path: '/',
      sameSite: 'lax',
      secure: true, // Set to false for localhost
    },
  },
});
```

---

## Development Mode

For local development without subdomains:

### Option 1: Single localhost (Recommended)

```typescript
// TenantResolver.ts - Development Detection
export function isDevelopment(): boolean {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         import.meta.env.DEV;
}

// In development, treat ALL routes as "hub" mode
// User can switch orgs via UI without subdomain changes
```

### Option 2: Local Subdomains (Advanced)

Edit `/etc/hosts`:
```
127.0.0.1 localhost
127.0.0.1 login.local.zoworks.com
127.0.0.1 vkbs.local.zoworks.com
127.0.0.1 sk.local.zoworks.com
```

Then run Vite with:
```bash
yarn dev --host
```

---

## Session Flow Summary

```
┌───────────────────────────────────────────────────────────────┐
│  PRODUCTION FLOW                                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User visits: vkbs.zoworks.com/tickets                    │
│  2. No session → Redirect: login.zoworks.com?redirect=...    │
│  3. User logs in → Cookie set for .zoworks.com               │
│  4. Select org (if multiple) → Redirect to vkbs.zoworks.com  │
│  5. Cookie valid on subdomain → User sees tickets            │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  DEVELOPMENT FLOW                                             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User visits: localhost:5174 (Hub mode)                   │
│  2. No session → Show login form on localhost                │
│  3. User logs in → LocalStorage token stored                 │
│  4. Select org (if multiple) → Update auth store             │
│  5. App loads with selected org context (no subdomain)       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

- [ ] Update `TenantResolver.ts` with auth portal detection
- [ ] Update `AuthGuard.tsx` with redirect logic
- [ ] Create/update `LoginPage.tsx` with org selection
- [ ] Update `supabase.ts` cookie configuration
- [ ] Add environment variables for domains
- [ ] Configure Vercel wildcard domains
- [ ] Test login flow: login.zoworks.com → vkbs.zoworks.com
- [ ] Test direct access: vkbs.zoworks.com → redirect if no session
- [ ] Test org switching
- [ ] Test development mode (localhost)

---

## Next Steps

1. **Immediate**: Update TenantResolver and AuthGuard
2. **Short-term**: Create centralized LoginPage component
3. **Deploy**: Configure Vercel wildcard domains
4. **Test**: Full e2e auth flow across subdomains

