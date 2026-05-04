'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, addMonths, addYears } from 'date-fns'

export type TransactionResult = {
  success: boolean
  error?: string
  id?: string
}

export type MonthlySummary = {
  totalIncome: number
  totalExpenses: number
  netCashflow: number
  cashBalance: number
}

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
  subscription?: {
    billingCycle: 'MONTHLY' | 'ANNUAL'
    nextRenewal: string
  }
}): Promise<TransactionResult> {
  try {
    const id = await prisma.$transaction(async (tx) => {
      let recurringRuleId = data.recurringRuleId
      if (data.subscription && !recurringRuleId) {
        const rule = await tx.recurringRule.create({
          data: {
            frequency: data.subscription.billingCycle,
            startDate: new Date(data.date),
          },
        })
        recurringRuleId = rule.id
      }

      const txn = await tx.transaction.create({
        data: {
          date: new Date(data.date),
          amount: data.amount,
          type: data.type,
          category: data.category,
          subcategory: data.subcategory?.trim() || null,
          payee: data.payee?.trim() || null,
          note: data.note?.trim() || null,
          isSubscription: data.isSubscription ?? false,
          isRecurring: !!recurringRuleId || (data.isRecurring ?? false),
          recurringRuleId,
          status: 'POSTED',
        },
      })

      if (data.subscription) {
        const annualCost =
          data.subscription.billingCycle === 'MONTHLY'
            ? data.amount * 12
            : data.amount
        await tx.subscription.create({
          data: {
            transactionId: txn.id,
            billingCycle: data.subscription.billingCycle,
            nextRenewal: new Date(data.subscription.nextRenewal),
            annualCost,
            status: 'ACTIVE',
          },
        })
      }

      return txn.id
    })

    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true, id }
  } catch {
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
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: {
          ...(data.date ? { date: new Date(data.date) } : {}),
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
          ...(data.subcategory !== undefined
            ? { subcategory: data.subcategory.trim() || null }
            : {}),
          ...(data.payee !== undefined
            ? { payee: data.payee.trim() || null }
            : {}),
          ...(data.note !== undefined
            ? { note: data.note.trim() || null }
            : {}),
        },
      })

      if (data.amount !== undefined) {
        const sub = await tx.subscription.findUnique({
          where: { transactionId: id },
        })
        if (sub) {
          const annualCost =
            sub.billingCycle === 'MONTHLY' ? data.amount * 12 : data.amount
          await tx.subscription.update({
            where: { id: sub.id },
            data: { annualCost },
          })
        }
      }
    })

    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update transaction.' }
  }
}

export async function deleteTransaction(id: string): Promise<TransactionResult> {
  try {
    await prisma.transaction.delete({ where: { id } })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch {
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
      ...(filters?.from || filters?.to
        ? {
            date: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    include: { subscription: true },
  })
}

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

// --- Recurring drafts ---

export async function generateRecurringDrafts(): Promise<{ generated: number }> {
  const rules = await prisma.recurringRule.findMany({
    where: {
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: {
      transactions: {
        where: { status: 'POSTED' },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  let generated = 0
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  for (const rule of rules) {
    const template = rule.transactions[0]
    if (!template) continue

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
        note: 'Auto-draft from recurring rule',
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
    const draft = await prisma.transaction.findUnique({ where: { id } })
    if (!draft) return { success: false, error: 'Draft not found.' }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id }, data: { status: 'POSTED' } })

      if (draft.recurringRuleId && draft.isSubscription) {
        const sub = await tx.subscription.findFirst({
          where: {
            status: 'ACTIVE',
            transaction: { recurringRuleId: draft.recurringRuleId },
          },
        })
        if (sub) {
          const next =
            sub.billingCycle === 'MONTHLY'
              ? addMonths(sub.nextRenewal, 1)
              : addYears(sub.nextRenewal, 1)
          await tx.subscription.update({
            where: { id: sub.id },
            data: { nextRenewal: next },
          })
        }
      }
    })

    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to confirm draft.' }
  }
}

export async function skipDraft(id: string): Promise<TransactionResult> {
  try {
    await prisma.transaction.delete({ where: { id } })
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to skip draft.' }
  }
}

export async function getDraftCount(): Promise<number> {
  return prisma.transaction.count({
    where: {
      status: 'DRAFT',
      date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
    },
  })
}

// --- Budgets ---

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
  } catch {
    return { success: false, error: 'Failed to save budget.' }
  }
}
