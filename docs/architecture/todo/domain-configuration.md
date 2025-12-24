# Domain & Subdomain Configuration

> **Status**: Pending  
> **Priority**: High  
> **Blocking**: Production deployment

## Context

`zoworks.com` is already hosting a separate marketing/landing website. The SaaS app must use **subdomains only**.

## Recommended DNS Setup (Cloudflare)

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | `login` | `cname.vercel-dns.com` | Auth portal |
| CNAME | `app` | `cname.vercel-dns.com` | Hub (multi-org users) |
| CNAME | `*` | `cname.vercel-dns.com` | Tenant subdomains |

> ⚠️ Do NOT modify `zoworks.com` root — keep pointing to existing website.

## Vercel Domain Configuration

Add in Vercel Dashboard → Domains:

1. `login.zoworks.com` — Auth hub
2. `app.zoworks.com` — Hub for org switching
3. `*.zoworks.com` — Wildcard (requires Pro plan)

## Environment Variables

```bash
VITE_AUTH_BASE_URL=https://login.zoworks.com
VITE_APP_BASE_DOMAIN=zoworks.com
VITE_COOKIE_DOMAIN=.zoworks.com  # Leading dot for cross-subdomain sharing
```

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User visits login.zoworks.com                           │
│  2. Authenticates via Supabase                              │
│  3. If single org → redirect to {org}.zoworks.com           │
│  4. If multi-org → redirect to app.zoworks.com (org picker) │
│  5. Cookie shared across *.zoworks.com                      │
└─────────────────────────────────────────────────────────────┘
```

## Action Items

- [ ] Add DNS records in Cloudflare
- [ ] Add domains in Vercel dashboard
- [ ] Set environment variables in Vercel
- [ ] Update Supabase redirect URLs to include all subdomains
- [ ] Test auth flow across subdomains

## Related Docs

- [deployment.md](file:///Users/macbookpro/zo_v2/mini_project/docs/guides/deployment.md)
- [auth-subdomain-flow.md](file:///Users/macbookpro/zo_v2/mini_project/docs/reference/auth-subdomain-flow.md)
