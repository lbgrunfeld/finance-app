# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WealthDash — a personal finance dashboard built with Next.js 16 (App Router), React 19, TypeScript, Prisma 7 (SQLite), and shadcn/ui. Features transaction tracking, subscriptions, budgets, goals, and a stock portfolio with real-time Yahoo Finance prices.

## Repo

This directory is the git repo. Remote `origin` → `https://github.com/lbgrunfeld/finance-app`, branch `main`. The parent `finance/` directory is not a git repo — it just holds `SPEC.md` and a copy of this file alongside `wealthdash/`.

## Commands

```bash
npm run dev       # Dev server (Turbopack)
npm run build     # Production build
npm run lint      # ESLint
npx prisma migrate dev    # Run/create migrations
npx prisma generate       # Regenerate Prisma client
```

## Architecture

**Data layer:** Prisma with SQLite via LibSQL adapter. Singleton client in `src/lib/prisma.ts`. Schema models include `Settings`, `Transaction`, `RecurringRule`, `Subscription`, `Budget`, `Position`, `PriceCache`, `PortfolioSnapshot`, `Goal`. Generated types go to `src/generated/prisma/` (gitignored).

**Server actions** (`src/actions/`): All data mutations and queries use Next.js server actions with `revalidatePath()` for cache invalidation. `transactions.ts` handles CRUD + cash balance. `positions.ts` handles CRUD + portfolio valuation via live stock quotes. `settings.ts`, `subscriptions.ts`, `goals.ts`, `snapshots.ts` round out the surface.

**Stock prices** (`src/lib/stock.ts`): Yahoo Finance quotes fetched sequentially per ticker with a 60-second in-memory cache and stale-on-error fallback.

**Components:** Server components (async) fetch data directly — `SummaryCards`, `TransactionList`, `PositionList`, etc. Client components (`"use client"`) are forms using `useRef` for reset. UI primitives from shadcn/ui (base-nova style) in `src/components/ui/`.

**Pages:** All pages (`/`, `/transactions`, `/portfolio`, `/goals`) use `force-dynamic` rendering. Dashboard aggregates cash balance + portfolio value into net worth.

## Conventions

- Path alias: `@/*` maps to `src/*`
- Tailwind CSS v4 (PostCSS plugin, theme defined inline in `globals.css`)
- shadcn/ui config in `components.json` — use `npx shadcn@latest add <component>` to add new UI components
- Environment: only `DATABASE_URL` needed (defaults to `file:./dev.db`)
- **Currency: USD only.** `formatCurrency(amount)` in `src/lib/utils.ts` hardcodes USD. The `Settings.currency` Prisma column is a dormant default-`"USD"` field — left in place to avoid a migration; do not reintroduce a selector or pass currency through props.
- `dev.db` is gitignored but exists in early commit history (commits before `ca65f82`). Don't re-track it.
