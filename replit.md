# قريب (Qareeb)

Arabic-first charity platform that connects people in need with neighbors who can help, scoped by city. RTL UI in Arabic, mobile-first, dignified visual language (warm humanitarian green palette, Tajawal font, lucide-react icons, no emojis).

## Tech Stack

- **Monorepo**: pnpm workspaces (Replit pnpm-monorepo template).
- **Frontend** (`artifacts/qareeb-web`): React 18 + Vite, wouter (routing), TanStack Query, react-hook-form + zod, framer-motion, sonner, shadcn-style UI components, Tailwind v4. JWT bearer token persisted in `localStorage["qareeb_token"]` and wired via `setAuthTokenGetter` from the generated client.
- **Backend** (`artifacts/api-server`): Express 5 + Node, JWT (jsonwebtoken) + bcryptjs, express-rate-limit on auth endpoints, pino logging, Drizzle ORM. Mounted under `/api`.
- **Database**: Replit-managed PostgreSQL (Neon). Schema defined in `lib/db/src/schema/` and applied via `pnpm --filter @workspace/db run push`.
- **Contract**: OpenAPI spec at `lib/api-spec/openapi.yaml`. `pnpm --filter @workspace/api-spec run codegen` produces typed React Query hooks (`@workspace/api-client-react`) and zod schemas (`@workspace/api-zod`) used by both client and server.
- **Auth**: JWT (HS256) signed with `JWT_SECRET ?? SESSION_SECRET`, 30-day expiry. Helpers in `artifacts/api-server/src/lib/auth.ts` (`hashPassword`, `verifyPassword`, `signToken`, `verifyToken`, `attachUser`, `requireAuth`, `requireAdmin`).

## Domain Model

- **users** (id, name, email unique, phone, passwordHash, role: user|admin, trustStatus: new|trusted|restricted, createdAt)
- **requests** (id, userId, displayName, title, description, category: food|medicine|clothes|rent|other, city, urgency: low|medium|high, imageUrl, status: pending|approved|fulfilled|rejected, createdAt)
- **help_actions** (id, requestId, helperUserId, message, contactInfo, status: offered|accepted|completed, createdAt)
- **reports** (id, requestId, reporterUserId, reason, createdAt)

Trust logic: `trusted` users → new requests auto-approved; `restricted` users → blocked from creating; otherwise pending requires admin approval.

## Key Routes

Frontend (wouter, `import.meta.env.BASE_URL` base):
- `/` — landing feed with stats, city + category filters
- `/requests/:id` — request detail with "أريد المساعدة" dialog, owner sees helpers + fulfill button
- `/requests/new` — create request (auth)
- `/login`, `/register`
- `/me` — tabs: my requests, my help actions
- `/admin` — tabs: pending review, all requests, users, reports (admin only)

Backend (mounted at `/api`):
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /requests` (city, category, status filters), `POST /requests`, `GET /requests/:id`, `GET /requests/mine`
- `POST /requests/:id/help`, `GET /requests/:id/helpers` (owner/admin), `GET /my/help-actions`
- `POST /requests/:id/fulfill`, `POST /requests/:id/report`
- `GET /stats/{overview,categories,cities}`
- `GET /admin/{requests,users,reports,stats}`, `PATCH /admin/requests/:id/status`, `DELETE /admin/requests/:id`, `PATCH /admin/users/:id/trust`

## Seed Data

`pnpm --filter @workspace/api-server exec tsx src/seed.ts` creates:
- Admin: `admin@qareeb.app` / `admin1234`
- Users: `layla@example.com`, `omar@example.com`, `sara@example.com` — all with `user1234`
- 5 approved + 1 pending Arabic help requests across multiple Saudi cities

## Workflows

- `artifacts/api-server: API Server` — Express on port 8080, served at `/api/*`.
- `artifacts/qareeb-web: web` — Vite dev server, served at `/`.

## Workspace Conventions

- Body schemas in `openapi.yaml` use the `*Payload` suffix to avoid collisions with Orval-generated request body types.
- All backend routes use `requireAuth()` / `requireAdmin()` middleware; user is attached globally via `attachUser()` in `routes/index.ts`.
- All mutations on the frontend invalidate the relevant `getXxxQueryKey()` from the generated client.
