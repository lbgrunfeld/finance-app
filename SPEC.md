# WealthDash — Technical Specification

**Version:** 1.0  
**Status:** Ready for development  
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 (SQLite/LibSQL) · shadcn/ui (base-nova) · Tailwind CSS v4 · yahoo-finance2

---

## 0. Project Scaffold

### 0.1 Bootstrap

```bash
npx create-next-app@latest wealthdash \
  --typescript --tailwind --app --src-dir --import-alias "@/*"
cd wealthdash
```

### 0.2 Dependencies

```bash
# UI
npx shadcn@latest init          # choose base-nova style, CSS variables, src/components/ui
npx shadcn@latest add card table badge button input label select textarea dialog alert separator

# Data / ORM
npm install prisma @prisma/client @libsql/client
npx prisma init --datasource-provider sqlite

# Stock prices
npm install yahoo-finance2

# Utilities
npm install date-fns
```

### 0.3 Folder Structure

```
wealthdash/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx                    # Dashboard /
│   │   ├── transactions/
│   │   │   └── page.tsx                # /transactions
│   │   └── portfolio/
│   │       └── page.tsx                # /portfolio
│   ├── actions/
│   │   ├── transactions.ts
│   │   ├── subscriptions.ts
│   │   ├── positions.ts
│   │   ├── settings.ts
│   │   └── export.ts
│   ├── components/
│   │   ├── ui/                         # shadcn primitives (auto-generated)
│   │   ├── summary-cards.tsx           # server component
│   │   ├── transaction-list.tsx        # server component
│   │   ├── transaction-form.tsx        # client component
│   │   ├── subscription-audit.tsx      # server component
│   │   ├── upcoming-renewals.tsx       # server component
│   │   ├── budget-progress.tsx         # server component
│   │   ├── position-list.tsx           # server component
│   │   ├── position-form.tsx           # client component
│   │   └── nav.tsx                     # client component
│   ├── lib/
│   │   ├── prisma.ts                   # singleton Prisma client
│   │   ├── stock.ts                    # yahoo-finance2 + cache
│   │   └── utils.ts                    # formatCurrency, formatDate, cn()
│   └── generated/
│       └── prisma/                     # gitignored — npx prisma generate output
├── .env
├── CLAUDE.md
└── SPEC.md
```

### 0.4 Environment

`.env`:
```
DATABASE_URL="file:./dev.db"
```

### 0.5 Prisma Client Singleton

`src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 0.6 Utility Functions

`src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}
```

---

## Phase 1 — Core Transaction Tracking

### 1.1 Prisma Schema (Full — define all models upfront)

`prisma/schema.prisma`:
```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Settings {
  id             Int    @id @default(1)
  startingBalance Float  @default(0)
  currency       String @default("USD")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Transaction {
  id             String   @id @default(cuid())
  date           DateTime
  amount         Float
  type           String   // "INCOME" | "EXPENSE"
  category       String
  subcategory    String?
  payee          String?
  note           String?
  isSubscription Boolean  @default(false)
  isRecurring    Boolean  @default(false)
  status         String   @default("POSTED") // "POSTED" | "DRAFT"
  recurringRuleId String?
  recurringRule  RecurringRule? @relation(fields: [recurringRuleId], references: [id])
  subscription   Subscription?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model RecurringRule {
  id           String        @id @default(cuid())
  frequency    String        // "WEEKLY" | "MONTHLY" | "ANNUAL"
  startDate    DateTime
  endDate      DateTime?
  transactions Transaction[]
  createdAt    DateTime      @default(now())
}

model Subscription {
  id            String      @id @default(cuid())
  transactionId String      @unique
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  billingCycle  String      // "MONTHLY" | "ANNUAL"
  nextRenewal   DateTime
  annualCost    Float
  status        String      @default("ACTIVE") // "ACTIVE" | "CANCELLED"
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model Budget {
  id           String   @id @default(cuid())
  category     String   @unique
  monthlyLimit Float
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Position {
  id                String   @id @default(cuid())
  ticker            String
  shares            Float
  costBasisPerShare Float?
  purchaseDate      DateTime?
  lotLabel          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model PriceCache {
  ticker     String   @id
  closePrice Float
  priceDate  String   // "YYYY-MM-DD"
  fetchedAt  DateTime
}
```

Run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### 1.2 Category Constants

`src/lib/categories.ts`:
```ts
export const INCOME_CATEGORIES = [
  { value: 'employment', label: 'Employment', subcategories: ['Salary', 'Bonus', 'Commission'] },
  { value: 'freelance', label: 'Freelance / Consulting', subcategories: [] },
  { value: 'investment', label: 'Investment Income', subcategories: ['Dividends', 'Interest'] },
  { value: 'rental', label: 'Rental Income', subcategories: [] },
  { value: 'other', label: 'Other', subcategories: [] },
]

export const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Housing', subcategories: ['Rent / Mortgage', 'Utilities', 'Insurance', 'Repairs'] },
  { value: 'food', label: 'Food', subcategories: ['Groceries', 'Dining Out', 'Delivery'] },
  { value: 'subscriptions', label: 'Subscriptions', subcategories: ['Streaming', 'Software', 'Memberships', 'News'] },
  { value: 'transport', label: 'Transport', subcategories: ['Fuel', 'Public Transit', 'Car Insurance', 'Parking'] },
  { value: 'health', label: 'Health', subcategories: ['Insurance', 'Prescriptions', 'Gym'] },
  { value: 'personal', label: 'Personal', subcategories: ['Clothing', 'Haircuts', 'Personal Care'] },
  { value: 'entertainment', label: 'Entertainment', subcategories: ['Events', 'Hobbies', 'Books'] },
  { value: 'travel', label: 'Travel', subcategories: ['Flights', 'Hotels', 'Vacation'] },
  { value: 'education', label: 'Education', subcategories: ['Courses', 'Books', 'Tools'] },
  { value: 'financial', label: 'Financial', subcategories: ['Loan Payments', 'Fees', 'Taxes'] },
  { value: 'gifts', label: 'Gifts & Charity', subcategories: [] },
  { value: 'other', label: 'Other', subcategories: [] },
]
```

---

### 1.3 Transaction Server Actions

`src/actions/transactions.ts`:

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth } from 'date-fns'

// --- Types ---

export type TransactionResult = {
  success: boolean
  error?: string
}

export type MonthlySummary = {
  totalIncome: number
  totalExpenses: number
  netCashflow: number
  cashBalance: number  // startingBalance + all-time income - all-time expenses
}

// --- CRUD ---

export async function createTransaction(data: {
  date: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: string
  subcategory?: string
  payee?: string
  note?: string
  isSubscription?: boolean
  isRecurring?: boolean
  recurringRuleId?: string
}): Promise<TransactionResult> {
  try {
    await prisma.transaction.create({
      data: {
        ...data,
        date: new Date(data.date),
        status: 'POSTED',
      },
    })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to create transaction.' }
  }
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    date: string
    amount: number
    category: string
    subcategory: string
    payee: string
    note: string
  }>
): Promise<TransactionResult> {
  try {
    await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        ...(data.date ? { date: new Date(data.date) } : {}),
      },
    })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to update transaction.' }
  }
}

export async function deleteTransaction(id: string): Promise<TransactionResult> {
  try {
    await prisma.transaction.delete({ where: { id } })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to delete transaction.' }
  }
}

export async function getTransactions(filters?: {
  type?: 'INCOME' | 'EXPENSE'
  category?: string
  isSubscription?: boolean
  isRecurring?: boolean
  from?: string
  to?: string
  status?: 'POSTED' | 'DRAFT'
}) {
  return prisma.transaction.findMany({
    where: {
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.isSubscription !== undefined ? { isSubscription: filters.isSubscription } : {}),
      ...(filters?.isRecurring !== undefined ? { isRecurring: filters.isRecurring } : {}),
      ...(filters?.status ? { status: filters.status } : { status: 'POSTED' }),
      ...(filters?.from || filters?.to ? {
        date: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {}),
        },
      } : {}),
    },
    orderBy: { date: 'desc' },
    include: { subscription: true },
  })
}

// --- Aggregations ---

export async function getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  const from = startOfMonth(new Date(year, month - 1))
  const to = endOfMonth(new Date(year, month - 1))

  const [incomeAgg, expenseAgg, allTimeIncome, allTimeExpenses, settings] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', status: 'POSTED', date: { gte: from, lte: to } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'EXPENSE', status: 'POSTED', date: { gte: from, lte: to } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', status: 'POSTED' },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'EXPENSE', status: 'POSTED' },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ])

  const totalIncome = incomeAgg._sum.amount ?? 0
  const totalExpenses = expenseAgg._sum.amount ?? 0
  const startingBalance = settings?.startingBalance ?? 0
  const cashBalance =
    startingBalance + (allTimeIncome._sum.amount ?? 0) - (allTimeExpenses._sum.amount ?? 0)

  return {
    totalIncome,
    totalExpenses,
    netCashflow: totalIncome - totalExpenses,
    cashBalance,
  }
}

export async function getCategoryBreakdown(year: number, month: number) {
  const from = startOfMonth(new Date(year, month - 1))
  const to = endOfMonth(new Date(year, month - 1))

  const rows = await prisma.transaction.groupBy({
    by: ['category'],
    _sum: { amount: true },
    where: { type: 'EXPENSE', status: 'POSTED', date: { gte: from, lte: to } },
    orderBy: { _sum: { amount: 'desc' } },
  })

  return rows.map((r) => ({ category: r.category, total: r._sum.amount ?? 0 }))
}
```

---

### 1.4 Settings Server Actions

`src/actions/settings.ts`:
```ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, startingBalance: 0, currency: 'USD' },
  })
}

export async function updateStartingBalance(amount: number) {
  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { startingBalance: amount },
      create: { id: 1, startingBalance: amount, currency: 'USD' },
    })
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to update starting balance.' }
  }
}
```

---

### 1.5 Transaction Form (Client Component)

`src/components/transaction-form.tsx`:
```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { createTransaction } from '@/actions/transactions'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function TransactionForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const selectedCat = categories.find((c) => c.value === category)

  function handleSubmit() {
    const form = formRef.current
    if (!form) return
    const data = new FormData(form)

    startTransition(async () => {
      const result = await createTransaction({
        date: data.get('date') as string,
        amount: parseFloat(data.get('amount') as string),
        type,
        category,
        subcategory: data.get('subcategory') as string || undefined,
        payee: data.get('payee') as string || undefined,
        note: data.get('note') as string || undefined,
        isSubscription: (data.get('isSubscription') as string) === 'true',
      })
      if (result.success) {
        formRef.current?.reset()
        setCategory('')
        setError(null)
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <form ref={formRef} className="space-y-4">
      {/* Type toggle, date, amount, category, subcategory, payee, note, isSubscription */}
      {/* Render fields using shadcn Input, Select, Label primitives */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving…' : 'Add transaction'}
      </Button>
    </form>
  )
}
```

---

### 1.6 Transaction List (Server Component)

`src/components/transaction-list.tsx`:
```tsx
import { getTransactions } from '@/actions/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export async function TransactionList({ filters }: { filters?: Parameters<typeof getTransactions>[0] }) {
  const transactions = await getTransactions(filters)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Payee / Source</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => (
          <TableRow key={t.id}>
            <TableCell>{formatDate(t.date)}</TableCell>
            <TableCell>{t.payee ?? '—'}</TableCell>
            <TableCell>
              {t.category}
              {t.subcategory && <span className="text-muted-foreground"> · {t.subcategory}</span>}
            </TableCell>
            <TableCell>
              <Badge variant={t.type === 'INCOME' ? 'default' : 'secondary'}>{t.type}</Badge>
              {t.isSubscription && <Badge variant="outline" className="ml-1">SUB</Badge>}
            </TableCell>
            <TableCell className={`text-right font-medium ${t.type === 'INCOME' ? 'text-green-600' : ''}`}>
              {t.type === 'EXPENSE' ? '–' : '+'}{formatCurrency(t.amount)}
            </TableCell>
            <TableCell>{/* edit / delete actions */}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

### 1.7 Pages — Phase 1

`src/app/transactions/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'

import { TransactionList } from '@/components/transaction-list'
import { TransactionForm } from '@/components/transaction-form'

export default function TransactionsPage() {
  return (
    <main className="container mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <TransactionForm />
      <TransactionList />
    </main>
  )
}
```

---

## Phase 2 — Subscriptions, Recurring, Budgets

### 2.1 Subscription Server Actions

`src/actions/subscriptions.ts`:
```ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'

export async function createSubscription(data: {
  transactionId: string
  billingCycle: 'MONTHLY' | 'ANNUAL'
  nextRenewal: string
  amount: number
}) {
  const annualCost = data.billingCycle === 'MONTHLY' ? data.amount * 12 : data.amount
  try {
    await prisma.subscription.create({
      data: {
        transactionId: data.transactionId,
        billingCycle: data.billingCycle,
        nextRenewal: new Date(data.nextRenewal),
        annualCost,
        status: 'ACTIVE',
      },
    })
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to create subscription.' }
  }
}

export async function getActiveSubscriptions() {
  return prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { transaction: true },
    orderBy: { nextRenewal: 'asc' },
  })
}

export async function getUpcomingRenewals(days = 30) {
  const cutoff = addDays(new Date(), days)
  return prisma.subscription.findMany({
    where: { status: 'ACTIVE', nextRenewal: { lte: cutoff } },
    include: { transaction: true },
    orderBy: { nextRenewal: 'asc' },
  })
}

export async function getSubscriptionTotals() {
  const subs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    select: { annualCost: true, billingCycle: true },
  })
  const annualTotal = subs.reduce((sum, s) => sum + s.annualCost, 0)
  return {
    annualTotal,
    monthlyEquivalent: annualTotal / 12,
    count: subs.length,
  }
}

export async function cancelSubscription(id: string) {
  try {
    await prisma.subscription.update({ where: { id }, data: { status: 'CANCELLED' } })
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to cancel subscription.' }
  }
}
```

---

### 2.2 Recurring Drafts

Add to `src/actions/transactions.ts`:
```ts
export async function generateRecurringDrafts(): Promise<{ generated: number }> {
  const rules = await prisma.recurringRule.findMany({
    where: {
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: { transactions: { where: { status: 'POSTED' }, orderBy: { date: 'desc' }, take: 1 } },
  })

  let generated = 0
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  for (const rule of rules) {
    const template = rule.transactions[0]
    if (!template) continue

    // Check if a draft already exists for this rule this month
    const existing = await prisma.transaction.findFirst({
      where: {
        recurringRuleId: rule.id,
        status: 'DRAFT',
        date: { gte: monthStart, lte: monthEnd },
      },
    })
    if (existing) continue

    await prisma.transaction.create({
      data: {
        date: now,
        amount: template.amount,
        type: template.type,
        category: template.category,
        subcategory: template.subcategory,
        payee: template.payee,
        note: `Auto-draft from recurring rule`,
        isSubscription: template.isSubscription,
        isRecurring: true,
        status: 'DRAFT',
        recurringRuleId: rule.id,
      },
    })
    generated++
  }

  revalidatePath('/')
  revalidatePath('/transactions')
  return { generated }
}

export async function confirmDraft(id: string): Promise<TransactionResult> {
  try {
    await prisma.transaction.update({ where: { id }, data: { status: 'POSTED' } })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to confirm draft.' }
  }
}

export async function skipDraft(id: string): Promise<TransactionResult> {
  try {
    await prisma.transaction.delete({ where: { id } })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to skip draft.' }
  }
}

export async function getDraftCount(): Promise<number> {
  return prisma.transaction.count({
    where: { status: 'DRAFT', date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) } },
  })
}
```

---

### 2.3 Budget Server Actions

Add to `src/actions/transactions.ts` (or a separate `budgets.ts`):
```ts
export async function getBudgetStatus(year: number, month: number) {
  const from = startOfMonth(new Date(year, month - 1))
  const to = endOfMonth(new Date(year, month - 1))

  const [budgets, spending] = await Promise.all([
    prisma.budget.findMany({ where: { active: true } }),
    prisma.transaction.groupBy({
      by: ['category'],
      _sum: { amount: true },
      where: { type: 'EXPENSE', status: 'POSTED', date: { gte: from, lte: to } },
    }),
  ])

  const spendMap = Object.fromEntries(spending.map((s) => [s.category, s._sum.amount ?? 0]))

  return budgets.map((b) => {
    const spent = spendMap[b.category] ?? 0
    const pct = b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0
    return {
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spent,
      pct,
      isWarning: pct >= 0.8,
      isOver: pct >= 1.0,
    }
  })
}

export async function upsertBudget(category: string, monthlyLimit: number) {
  try {
    await prisma.budget.upsert({
      where: { category },
      update: { monthlyLimit, active: true },
      create: { category, monthlyLimit, active: true },
    })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to save budget.' }
  }
}
```

---

### 2.4 Budget Progress Component

`src/components/budget-progress.tsx`:
```tsx
import { getBudgetStatus } from '@/actions/transactions'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export async function BudgetProgress() {
  const now = new Date()
  const statuses = await getBudgetStatus(now.getFullYear(), now.getMonth() + 1)

  if (statuses.length === 0) return null

  return (
    <div className="space-y-3">
      {statuses.map((b) => (
        <div key={b.category}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium capitalize">{b.category}</span>
            <span className="text-muted-foreground">
              {formatCurrency(b.spent)} / {formatCurrency(b.monthlyLimit)}
              {b.isWarning && !b.isOver && <Badge variant="outline" className="ml-2 text-amber-600">80%</Badge>}
              {b.isOver && <Badge variant="destructive" className="ml-2">Over</Badge>}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${b.isOver ? 'bg-destructive' : b.isWarning ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(b.pct * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## Phase 3 — Stock Portfolio

### 3.1 Stock Price Library

`src/lib/stock.ts`:
```ts
import yahooFinance from 'yahoo-finance2'

type CachedPrice = {
  price: number
  change: number
  changePct: number
  cachedAt: number
}

const memCache = new Map<string, CachedPrice>()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export type StockQuote = {
  ticker: string
  price: number
  change: number
  changePct: number
  stale: boolean
  error?: string
}

export async function getQuote(ticker: string): Promise<StockQuote> {
  const now = Date.now()
  const cached = memCache.get(ticker)

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return { ticker, ...cached, stale: false }
  }

  try {
    const quote = await yahooFinance.quote(ticker)
    if (!quote || quote.regularMarketPrice == null) {
      throw new Error('No price data')
    }

    const result: CachedPrice = {
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? 0,
      changePct: quote.regularMarketChangePercent ?? 0,
      cachedAt: now,
    }
    memCache.set(ticker, result)
    return { ticker, ...result, stale: false }
  } catch (err) {
    // stale-on-error fallback
    if (cached) {
      return { ticker, ...cached, stale: true }
    }
    return { ticker, price: 0, change: 0, changePct: 0, stale: true, error: 'Price unavailable' }
  }
}

export async function getQuotes(tickers: string[]): Promise<StockQuote[]> {
  return Promise.all(tickers.map(getQuote))
}
```

---

### 3.2 Position Server Actions

`src/actions/positions.ts`:
```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getQuotes } from '@/lib/stock'
import { revalidatePath } from 'next/cache'

export async function createPosition(data: {
  ticker: string
  shares: number
  costBasisPerShare?: number
  purchaseDate?: string
  lotLabel?: string
}) {
  try {
    await prisma.position.create({
      data: {
        ...data,
        ticker: data.ticker.toUpperCase().trim(),
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      },
    })
    revalidatePath('/portfolio')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to add position.' }
  }
}

export async function deletePosition(id: string) {
  try {
    await prisma.position.delete({ where: { id } })
    revalidatePath('/portfolio')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to delete position.' }
  }
}

export async function getPortfolio() {
  const positions = await prisma.position.findMany({ orderBy: { ticker: 'asc' } })
  if (positions.length === 0) return { positions: [], quotes: [], totalValue: 0, totalCost: 0, totalGainLoss: 0 }

  const tickers = [...new Set(positions.map((p) => p.ticker))]
  const quotes = await getQuotes(tickers)
  const quoteMap = Object.fromEntries(quotes.map((q) => [q.ticker, q]))

  let totalValue = 0
  let totalCost = 0

  const enriched = positions.map((p) => {
    const quote = quoteMap[p.ticker]
    const marketValue = p.shares * (quote?.price ?? 0)
    const cost = p.costBasisPerShare != null ? p.shares * p.costBasisPerShare : null
    const gainLoss = cost != null ? marketValue - cost : null
    totalValue += marketValue
    if (cost != null) totalCost += cost
    return { ...p, quote, marketValue, cost, gainLoss }
  })

  return {
    positions: enriched,
    quotes,
    totalValue,
    totalCost,
    totalGainLoss: totalValue - totalCost,
  }
}

export async function updatePriceCache(ticker: string, price: number) {
  const today = new Date().toISOString().slice(0, 10)
  await prisma.priceCache.upsert({
    where: { ticker },
    update: { closePrice: price, priceDate: today, fetchedAt: new Date() },
    create: { ticker, closePrice: price, priceDate: today, fetchedAt: new Date() },
  })
}
```

---

### 3.3 Position List (Server Component)

`src/components/position-list.tsx`:
```tsx
import { getPortfolio } from '@/actions/positions'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export async function PositionList() {
  const { positions, totalValue, totalGainLoss } = await getPortfolio()

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Lot</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Day Change</TableHead>
            <TableHead className="text-right">Market Value</TableHead>
            <TableHead className="text-right">Gain / Loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.ticker}</TableCell>
              <TableCell className="text-muted-foreground">{p.lotLabel ?? '—'}</TableCell>
              <TableCell className="text-right">{p.shares}</TableCell>
              <TableCell className="text-right">
                {p.quote?.error
                  ? <Badge variant="destructive">Error</Badge>
                  : p.quote?.stale
                  ? <span className="text-amber-600">{formatCurrency(p.quote.price)} ⚠</span>
                  : formatCurrency(p.quote?.price ?? 0)}
              </TableCell>
              <TableCell className={`text-right ${(p.quote?.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {p.quote?.change != null ? `${p.quote.change >= 0 ? '+' : ''}${formatCurrency(p.quote.change)} (${p.quote.changePct.toFixed(2)}%)` : '—'}
              </TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(p.marketValue)}</TableCell>
              <TableCell className={`text-right ${(p.gainLoss ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {p.gainLoss != null ? `${p.gainLoss >= 0 ? '+' : ''}${formatCurrency(p.gainLoss)}` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-8 text-sm font-medium pt-2 border-t">
        <span>Total value: {formatCurrency(totalValue)}</span>
        <span className={totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
          Total gain/loss: {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
        </span>
      </div>
    </div>
  )
}
```

---

## Phase 4 — Dashboard & Export

### 4.1 Summary Cards (Server Component)

`src/components/summary-cards.tsx`:
```tsx
import { getMonthlySummary } from '@/actions/transactions'
import { getPortfolio } from '@/actions/positions'
import { getSettings } from '@/actions/settings'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function SummaryCards() {
  const now = new Date()
  const [summary, portfolio] = await Promise.all([
    getMonthlySummary(now.getFullYear(), now.getMonth() + 1),
    getPortfolio(),
  ])

  const netWorth = summary.cashBalance + portfolio.totalValue

  const cards = [
    { title: 'Monthly Income', value: formatCurrency(summary.totalIncome), sub: 'This month' },
    { title: 'Monthly Expenses', value: formatCurrency(summary.totalExpenses), sub: 'This month' },
    { title: 'Net Cashflow', value: formatCurrency(summary.netCashflow), sub: 'This month', highlight: summary.netCashflow >= 0 },
    { title: 'Cash Balance', value: formatCurrency(summary.cashBalance), sub: 'Starting balance + ledger' },
    { title: 'Portfolio Value', value: formatCurrency(portfolio.totalValue), sub: 'Market value today' },
    { title: 'Net Worth', value: formatCurrency(netWorth), sub: 'Cash + portfolio', highlight: true },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${c.highlight ? 'text-primary' : ''}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

### 4.2 Dashboard Page

`src/app/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'

import { SummaryCards } from '@/components/summary-cards'
import { UpcomingRenewals } from '@/components/upcoming-renewals'
import { BudgetProgress } from '@/components/budget-progress'
import { getDraftCount } from '@/actions/transactions'

export default async function DashboardPage() {
  const drafts = await getDraftCount()

  return (
    <main className="container mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {drafts > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have {drafts} recurring {drafts === 1 ? 'entry' : 'entries'} due this month.{' '}
          <a href="/transactions" className="underline font-medium">Review →</a>
        </div>
      )}
      <SummaryCards />
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium mb-4">Budget this month</h2>
          <BudgetProgress />
        </div>
        <div>
          <h2 className="text-lg font-medium mb-4">Upcoming renewals</h2>
          <UpcomingRenewals />
        </div>
      </div>
    </main>
  )
}
```

---

### 4.3 CSV Export

`src/actions/export.ts`:
```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getPortfolio } from './positions'

export async function exportTransactionsCSV(): Promise<string> {
  const rows = await prisma.transaction.findMany({
    where: { status: 'POSTED' },
    orderBy: { date: 'desc' },
  })

  const header = 'Date,Type,Category,Subcategory,Payee,Amount,Note\n'
  const body = rows
    .map((r) =>
      [
        r.date.toISOString().slice(0, 10),
        r.type,
        r.category,
        r.subcategory ?? '',
        r.payee ?? '',
        r.amount.toFixed(2),
        (r.note ?? '').replace(/,/g, ' '),
      ].join(',')
    )
    .join('\n')

  return header + body
}

export async function exportPortfolioCSV(): Promise<string> {
  const { positions } = await getPortfolio()

  const header = 'Ticker,Lot,Shares,CostBasis,MarketValue,GainLoss\n'
  const body = positions
    .map((p) =>
      [
        p.ticker,
        p.lotLabel ?? '',
        p.shares,
        p.cost?.toFixed(2) ?? '',
        p.marketValue.toFixed(2),
        p.gainLoss?.toFixed(2) ?? '',
      ].join(',')
    )
    .join('\n')

  return header + body
}
```

---

## Phase 5 — Charts & Savings Goals (P3)

### 5.1 Dependencies

```bash
npm install recharts
```

### 5.2 Expense Pie Chart

- Install `npx shadcn@latest add chart` (shadcn chart wrapper around Recharts)
- Create `src/components/expense-chart.tsx` as a client component
- Data: `getCategoryBreakdown()` for current month → pass as prop from server page
- Render: `PieChart` with category labels and USD values in tooltip

### 5.3 Portfolio History

- Add `PortfolioSnapshot` model to Prisma schema: `id`, `date`, `totalValue`, `createdAt`
- Daily snapshot server action: called once per day, stores current `getPortfolio().totalValue`
- Line chart component: fetches last 90 days of snapshots, renders with Recharts `LineChart`

### 5.4 Savings Goals (Future model)

```prisma
model Goal {
  id            String   @id @default(cuid())
  name          String
  targetAmount  Float
  targetDate    DateTime?
  balance       Float    @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

- CRUD server actions in `src/actions/goals.ts`
- Progress bar component: `(balance / targetAmount) * 100`
- Projected completion: `targetAmount - balance` / monthly net cashflow → months remaining

---

## Navigation

`src/components/nav.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/portfolio', label: 'Portfolio' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="border-b">
      <div className="container mx-auto flex items-center gap-6 h-14">
        <span className="font-semibold text-lg">WealthDash</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'text-sm text-muted-foreground hover:text-foreground transition-colors',
              pathname === l.href && 'text-foreground font-medium'
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

---

## Error Handling Contract

All server actions return `{ success: boolean; error?: string }`. Never throw to the client.

| Scenario | Behavior |
|---|---|
| Prisma error | Catch, return `{ success: false, error: 'Human-readable message' }` |
| Yahoo Finance fetch failure | Use stale PriceCache; surface warning badge in UI |
| Delisted / unknown ticker | Return `{ error: 'Price unavailable' }` in StockQuote; show error badge |
| Missing starting balance | Default to 0; prompt user to set it in settings |
| Draft generation — no template | Skip rule silently; log to console |

---

## Definition of Done per Phase

| Phase | Done when |
|---|---|
| 1 | Income and expense CRUD works; monthly summary displays correctly; cash balance reflects starting balance + ledger |
| 2 | Subscriptions create linked Subscription record; renewal dates appear in upcoming widget; budget progress bars render with warning states; recurring drafts generate and can be confirmed or skipped |
| 3 | Portfolio CRUD works; prices fetch from yahoo-finance2; market value and gain/loss calculate correctly; stale warning appears after 24h |
| 4 | Dashboard loads all six summary cards; net worth = cash balance + portfolio value; CSV export downloads valid files |
| 5 | Expense pie chart renders for current month; portfolio line chart shows 90-day history |
