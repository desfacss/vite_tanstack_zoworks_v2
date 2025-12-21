# Vercel Deployment Guide - Multi-Tenant SaaS

**Document Version:** 1.0  
**Created:** 2025-12-21

---

## Overview

This guide covers deploying the Zoworks multi-tenant SaaS application to Vercel with wildcard subdomain support.

---

## Prerequisites

1. **Vercel Account** - Pro or Enterprise plan (required for wildcard domains)
2. **Domain** - `zoworks.com` (or your custom domain)
3. **DNS Access** - Ability to modify DNS records
4. **Supabase Project** - Production instance configured

---

## Step 1: Domain Configuration

### 1.1 Add Domains in Vercel Dashboard

Navigate to: **Project Settings → Domains**

Add the following domains:

| Domain | Type | Purpose |
|--------|------|---------|
| `zoworks.com` | Apex | Base domain |
| `www.zoworks.com` | Subdomain | WWW redirect |
| `login.zoworks.com` | Subdomain | Centralized auth portal |
| `app.zoworks.com` | Subdomain | Hub/app portal |
| `*.zoworks.com` | Wildcard | Tenant subdomains |

### 1.2 Configure DNS Records

In your DNS provider (Cloudflare, Route53, etc.), add:

```
# Apex domain (A record)
Type: A
Name: @
Value: 76.76.21.21

# WWW subdomain
Type: CNAME
Name: www
Value: cname.vercel-dns.com

# Login portal
Type: CNAME
Name: login
Value: cname.vercel-dns.com

# App/Hub portal
Type: CNAME
Name: app
Value: cname.vercel-dns.com

# Wildcard (all other subdomains)
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

> **Note:** After adding DNS records, wait 5-10 minutes for propagation before verifying in Vercel.

---

## Step 2: Environment Variables

### 2.1 Set Environment Variables in Vercel

Navigate to: **Project Settings → Environment Variables**

Add the following variables for **Production**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` | Production |
| `VITE_AUTH_BASE_URL` | `https://login.zoworks.com` | Production |
| `VITE_APP_BASE_DOMAIN` | `zoworks.com` | Production |
| `VITE_COOKIE_DOMAIN` | `.zoworks.com` | Production |
| `VITE_DEV_MODE` | `false` | Production |
| `VITE_APP_ENV` | `production` | Production |
| `VITE_WORKSPACE` | `mep` | Production |

### 2.2 Optional Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_RESEND_API_KEY` | `your-key` | Email service |
| `VITE_RESEND_FROM_EMAIL` | `support@zoworks.ai` | Email sender |
| `VITE_PUBLITIO_API_KEY` | `your-key` | Media storage |
| `VITE_PUBLITIO_API_SECRET` | `your-secret` | Media storage |

---

## Step 3: Deploy

### 3.1 Connect Git Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Vercel will auto-detect Vite framework

### 3.2 Build Settings

Vercel should auto-detect these from `vercel.json`, but verify:

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build Command | `yarn build` |
| Output Directory | `dist` |
| Install Command | `yarn install` |

### 3.3 Deploy

Click **Deploy** and wait for the build to complete.

---

## Step 4: Verify Deployment

### 4.1 Test URLs

After deployment, verify these URLs work:

| URL | Expected Behavior |
|-----|------------------|
| `https://login.zoworks.com` | Shows login page |
| `https://app.zoworks.com` | Shows login page (hub mode) |
| `https://vkbs.zoworks.com` | Redirects to login if not authenticated |
| `https://vkbs.zoworks.com/dashboard` | Shows dashboard if authenticated |

### 4.2 Test Auth Flow

1. Visit `https://vkbs.zoworks.com/dashboard`
2. Should redirect to `https://login.zoworks.com/login?redirect=...`
3. Login with valid credentials
4. Select organization (if multiple)
5. Should redirect back to `https://vkbs.zoworks.com/dashboard`

---

## Configuration Files Reference

### vercel.json

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "yarn build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api|_next|static|favicon.ico|robots.txt|sitemap.xml).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ],
  "regions": ["iad1"]
}
```

### .env.production

See `.env.production.example` for required variables.

---

## Troubleshooting

### Issue: Wildcard domain not working

**Solution:** Ensure you have a Vercel Pro or Enterprise plan. Wildcard domains are not available on the free plan.

### Issue: Redirect loop on login

**Solution:** Check that `VITE_AUTH_BASE_URL` points to the correct login subdomain and `VITE_COOKIE_DOMAIN` starts with a dot (e.g., `.zoworks.com`).

### Issue: Session not persisting across subdomains

**Solution:** Verify cookie domain is set correctly in Supabase client configuration and `VITE_COOKIE_DOMAIN` is `.zoworks.com` (with leading dot).

### Issue: 404 on page refresh

**Solution:** The SPA rewrite rule should handle this. Verify `vercel.json` has the correct rewrite configuration.

### Issue: API routes returning 404

**Solution:** The rewrite rule excludes paths starting with `/api`. If you have API routes, ensure they're properly configured as serverless functions in `/api` directory.

---

## Performance Optimization

### Edge Caching

Static assets are cached for 1 year with `immutable` directive:
- `/assets/*` - Hashed Vite assets
- `*.js`, `*.css` - JavaScript and CSS bundles

### Regional Deployment

Currently configured for `iad1` (US East). To add more regions:

```json
"regions": ["iad1", "sfo1", "hnd1"]
```

Available regions: https://vercel.com/docs/edge-network/regions

---

## Security Headers

The following security headers are applied to all responses:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |

---

## Rollback

To rollback to a previous deployment:

1. Go to **Deployments** tab in Vercel dashboard
2. Find the previous working deployment
3. Click **"..."** → **"Promote to Production"**

---

## Support

For deployment issues:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support

