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
        ticker: data.ticker.toUpperCase().trim(),
        shares: data.shares,
        costBasisPerShare: data.costBasisPerShare,
        lotLabel: data.lotLabel,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      },
    })
    revalidatePath('/portfolio')
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to add position.' }
  }
}

export async function updatePosition(
  id: string,
  data: Partial<{
    ticker: string
    shares: number
    costBasisPerShare: number
    purchaseDate: string
    lotLabel: string
  }>
) {
  try {
    await prisma.position.update({
      where: { id },
      data: {
        ...data,
        ...(data.ticker ? { ticker: data.ticker.toUpperCase().trim() } : {}),
        ...(data.purchaseDate ? { purchaseDate: new Date(data.purchaseDate) } : {}),
      },
    })
    revalidatePath('/portfolio')
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update position.' }
  }
}

export async function deletePosition(id: string) {
  try {
    await prisma.position.delete({ where: { id } })
    revalidatePath('/portfolio')
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete position.' }
  }
}

export async function getPortfolio() {
  const positions = await prisma.position.findMany({ orderBy: { ticker: 'asc' } })
  if (positions.length === 0) {
    return { positions: [], quotes: [], totalValue: 0, totalCost: 0, totalGainLoss: 0 }
  }

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
