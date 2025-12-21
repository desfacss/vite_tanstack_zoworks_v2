# 🚀 Deployment Guide

> How to deploy ZoWorks to Vercel with multi-tenant subdomain support

---

## Prerequisites

- Vercel account with Pro plan (for wildcard domains)
- Domain access to configure DNS (e.g., `zoworks.com`)
- Supabase project with required schemas

---

## 1. Environment Variables

Set these in Vercel project settings:

### Required

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key

# Multi-Tenant Auth
VITE_AUTH_BASE_URL=https://auth.zoworks.com
VITE_APP_BASE_DOMAIN=zoworks.com
VITE_COOKIE_DOMAIN=.zoworks.com
```

### Optional

```bash
# Email
VITE_RESEND_API_KEY=re_...
VITE_RESEND_FROM_EMAIL=support@zoworks.com

# File Storage
VITE_PUBLITIO_API_KEY=...
VITE_PUBLITIO_API_SECRET=...
```

---

## 2. Vercel Configuration

### vercel.json

Ensure this exists in the project root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

## 3. Domain Configuration

### DNS Setup

Add these records to your domain:

| Type | Name | Value |
|------|------|-------|
| A | @ | Vercel IP |
| CNAME | www | cname.vercel-dns.com |
| CNAME | auth | cname.vercel-dns.com |
| CNAME | * | cname.vercel-dns.com |

### Vercel Domains

In Vercel dashboard → Domains:

1. Add `zoworks.com` (root)
2. Add `*.zoworks.com` (wildcard)
3. Add `auth.zoworks.com` (auth hub)

---

## 4. Build Configuration

### Build Command

```bash
yarn build
```

### Output Directory

```
dist
```

### Install Command

```bash
yarn install
```

---

## 5. Testing Checklist

After deployment, verify:

- [ ] Root domain loads (`zoworks.com`)
- [ ] Auth domain works (`auth.zoworks.com/login`)
- [ ] Tenant subdomain works (`vkbs.zoworks.com`)
- [ ] Login redirects correctly
- [ ] Org switching works
- [ ] Data loads for each tenant

---

## 6. Troubleshooting

### Build Fails

```bash
# Locally verify build
yarn build

# Check for import errors
yarn tsc --noEmit
```

### Subdomain Not Working

1. Check wildcard DNS is propagated: `dig *.zoworks.com`
2. Verify Vercel wildcard domain is added
3. Check `TenantResolver.ts` subdomain extraction

### Auth Redirects Loop

1. Check `VITE_AUTH_BASE_URL` matches actual auth domain
2. Verify `VITE_COOKIE_DOMAIN` has leading dot (`.zoworks.com`)
3. Check Supabase auth redirect URLs include all subdomains

---

## 7. Post-Deployment

1. **Add Organizations** - See [Adding New Org Guide](./adding-new-org.md)
2. **Monitor** - Check Vercel logs for errors
3. **Performance** - Run Lighthouse audit

---

## Related

- [vercel.json reference](../vercel.json)
- [Environment Variables](../reference/env-variables.md)
- [Auth Flow](../architecture/auth-flow.md)
