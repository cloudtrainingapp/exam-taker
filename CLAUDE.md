# Project Instructions

## Commands

```bash
# Dev (starts client on :5173 + server on :5000 concurrently)
npm run dev

# Build
npm run build

# Lint (client)
npm run lint --workspace=client

# Type check
npx tsc --noEmit --project client/tsconfig.app.json
npx tsc --noEmit --project server/tsconfig.json

# Database
npm run db:migrate --workspace=server   # run prisma migrations
npm run db:generate --workspace=server  # regenerate prisma client
npm run db:studio --workspace=server    # open prisma studio
```

## Architecture

npm workspaces monorepo: `client/` (React 19 + Vite + Tailwind v4) and `server/` (Express 5 + Prisma + PostgreSQL). Client dev server proxies `/api/*` → `localhost:5000`.

## Don'ts

- Don't modify Prisma-generated client (`node_modules/@prisma/client`) — run `db:generate` instead.
