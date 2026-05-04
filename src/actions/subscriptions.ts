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
  } catch {
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

export async function getUpcomingRenewals(days = 400) {
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
  } catch {
    return { success: false, error: 'Failed to cancel subscription.' }
  }
}
