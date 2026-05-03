import YahooFinance from 'yahoo-finance2'
import { prisma } from '@/lib/prisma'

const yahooFinance = new YahooFinance()

type CachedPrice = {
  price: number
  change: number
  changePct: number
  cachedAt: number
}

const memCache = new Map<string, CachedPrice>()
const CACHE_TTL_MS = 60 * 1000
const STALE_LIMIT_MS = 24 * 60 * 60 * 1000

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
    const quote = (await yahooFinance.quote(ticker)) as {
      regularMarketPrice?: number
      regularMarketChange?: number
      regularMarketChangePercent?: number
    } | null
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

    const today = new Date().toISOString().slice(0, 10)
    await prisma.priceCache.upsert({
      where: { ticker },
      update: { closePrice: result.price, priceDate: today, fetchedAt: new Date(now) },
      create: { ticker, closePrice: result.price, priceDate: today, fetchedAt: new Date(now) },
    }).catch(() => {})

    return { ticker, ...result, stale: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[stock] getQuote(${ticker}) failed:`, msg)
    if (cached) {
      return { ticker, ...cached, stale: true }
    }

    const persisted = await prisma.priceCache
      .findUnique({ where: { ticker } })
      .catch(() => null)
    if (persisted) {
      const ageMs = now - persisted.fetchedAt.getTime()
      const stale = ageMs > STALE_LIMIT_MS
      return {
        ticker,
        price: persisted.closePrice,
        change: 0,
        changePct: 0,
        stale,
        ...(stale ? {} : {}),
      }
    }

    return {
      ticker,
      price: 0,
      change: 0,
      changePct: 0,
      stale: true,
      error: msg.slice(0, 100),
    }
  }
}

export async function getQuotes(tickers: string[]): Promise<StockQuote[]> {
  return Promise.all(tickers.map(getQuote))
}
