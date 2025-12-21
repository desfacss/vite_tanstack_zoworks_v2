# Postgres Command Reference

## Host Details
- **Host**: `db.begqjgsemuiisjznayzx.supabase.co`
- **User**: `postgres`
- **Database**: `postgres`

## 1. Dump Schema Only
Dumps only the structure (tables, views, functions, triggers, etc.) of the `identity` schema without data.

```bash
PGPASSWORD='Zoworksinno@' pg_dump \
  -h db.begqjgsemuiisjznayzx.supabase.co \
  -U postgres \
  -d postgres \
  -n identity \
  --schema-only \
  --no-owner \
  --no-acl > docs/backend/identity/schema/schema_dump.sql
```

## 2. Dump Full Schema + Data
Dumps the complete `identity` schema including all data rows.

```bash
PGPASSWORD='Zoworksinno@' pg_dump \
  -h db.begqjgsemuiisjznayzx.supabase.co \
  -U postgres \
  -d postgres \
  -n identity \
  --no-owner \
  --no-acl > docs/backend/identity/schema/identity_full_dump.sql
```

## Flags Explanation
- `-n identity`: Only dump objects in the `identity` schema.
- `--schema-only`: Dump only the object definitions (schema), no data.
- `--no-owner`: Do not output commands to set ownership of objects to the original database user.
- `--no-acl`: Prevent dumping of access privileges (GRANT/REVOKE).

## 3. Dump Core Schema + Data
Dumps the complete `core` schema including all data rows.

```bash
PGPASSWORD='Zoworksinno@' pg_dump \
  -h db.begqjgsemuiisjznayzx.supabase.co \
  -U postgres \
  -d postgres \
  -n core \
  --no-owner \
  --no-acl > docs/backend/core/schema/core_full_dump.sql
```

