import { prisma } from '@/lib/prisma'

let cached: { value: string; expiry: number } | null = null
const CACHE_TTL_MS = 30_000

export async function getCurrentCurrency(): Promise<string> {
  if (cached && cached.expiry > Date.now()) return cached.value
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  const value = settings?.currency ?? 'USD'
  cached = { value, expiry: Date.now() + CACHE_TTL_MS }
  return value
}

export function invalidateCurrencyCache() {
  cached = null
}
