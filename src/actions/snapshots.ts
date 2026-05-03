'use server'

import { prisma } from '@/lib/prisma'
import { getPortfolio } from '@/actions/positions'
import { revalidatePath } from 'next/cache'
import { subDays } from 'date-fns'

export async function takePortfolioSnapshot() {
  try {
    const { totalValue } = await getPortfolio()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.portfolioSnapshot.upsert({
      where: { date: today },
      update: { totalValue },
      create: { date: today, totalValue },
    })

    revalidatePath('/portfolio')
    return { success: true, totalValue }
  } catch {
    return { success: false, error: 'Failed to take snapshot.' }
  }
}

export async function getPortfolioHistory(days = 90) {
  const cutoff = subDays(new Date(), days)
  return prisma.portfolioSnapshot.findMany({
    where: { date: { gte: cutoff } },
    orderBy: { date: 'asc' },
  })
}
