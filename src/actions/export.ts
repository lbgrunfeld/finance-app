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
