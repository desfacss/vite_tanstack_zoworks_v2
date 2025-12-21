# 📋 Technical Reference

> Detailed technical reference documentation

---

## Documents

| Document | Description |
|----------|-------------|
| [RPC Functions](./rpc-functions.md) | Supabase RPC function catalog |
| [Environment Variables](./env-variables.md) | Configuration reference |
| [Database Schemas](./schemas.md) | Schema and table reference |

---

## Quick Reference

### Key RPC Functions

| Function | Schema | Purpose |
|----------|--------|---------|
| `get_my_organizations` | identity | Get user's org list |
| `jwt_get_user_session` | identity | Get full session claims |
| `set_preferred_organization` | identity | Update preferred org |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `VITE_AUTH_BASE_URL` | ✅ | Auth hub URL |
| `VITE_APP_BASE_DOMAIN` | ✅ | Base domain for tenants |
