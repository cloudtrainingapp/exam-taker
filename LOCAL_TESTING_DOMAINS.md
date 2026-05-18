# Local Multi-Tenant Testing Guide

All dev traffic runs through Vite on **:5173** (frontend) and Express on **:5000** (backend).  
Vite proxies `/api/*` → `localhost:5000`, so the browser never needs to reach Express directly.

---

## How domain detection works locally

| Browser URL | Resolved context | How it works |
|---|---|---|
| `http://localhost:5173` | No tenant (404) | No subdomain, no custom domain match |
| `http://super.quiz.localhost:5173` | **SUPERADMIN** | Matched against `SUPERADMIN_BARE_HOSTS` set |
| `http://acme.localhost:5173` | Tenant `acme` | Subdomain `acme` looked up in DB |
| `http://companydomain.local:5173` | Tenant with that customDomain | Matched via `DEV_CUSTOM_DOMAIN` env var |

---

## Setup steps

### 1. Make `*.localhost` work in your browser

Modern Chrome and Firefox resolve `*.localhost` to `127.0.0.1` natively — no `/etc/hosts` edit needed.

**Safari** does **not** do this. Add entries manually:

```
# /etc/hosts
127.0.0.1  super.quiz.localhost
127.0.0.1  acme.localhost
127.0.0.1  demo.localhost
```

### 2. Simulate a custom domain (`companydomain.local`)

Add to `/etc/hosts`:

```
127.0.0.1  companydomain.local
```

Then ensure a tenant row in the DB has `customDomain = 'companydomain.local'`  
and `server/.env` contains:

```
DEV_CUSTOM_DOMAIN=companydomain.local
```

### 3. Seed a test tenant

```sql
INSERT INTO "Tenant" (id, name, subdomain, "supportEmail", "createdAt")
VALUES ('cld_test', 'Acme Corp', 'acme', 'support@acme.com', NOW());
```

Or use Prisma Studio:

```bash
npm run db:studio --workspace=server
```

---

## Running the dev stack

```bash
npm run dev          # starts client :5173 + server :5000 concurrently
```

---

## CORS

The backend reads `CLIENT_ORIGIN_REGEX` from `.env`:

```
CLIENT_ORIGIN_REGEX=^https?://([a-zA-Z0-9-]+\.)*localhost:5173$
```

This regex allows:
- `http://localhost:5173`
- `http://super.localhost:5173`
- `http://acme.localhost:5173`
- `http://any-tenant.localhost:5173`

`companydomain.local` is additionally allowed when it matches `DEV_CUSTOM_DOMAIN`.

---

## Cookie behaviour

In development (`NODE_ENV=development`) cookies are set **without a `Domain` attribute** so each subdomain holds its own session independently. In production the `Domain` is locked to `CENTRAL_DOMAIN`.
