'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { invalidateCurrencyCache } from '@/lib/currency'

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
  } catch {
    return { success: false, error: 'Failed to update starting balance.' }
  }
}

export async function updateCurrency(currency: string) {
  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { currency },
      create: { id: 1, startingBalance: 0, currency },
    })
    invalidateCurrencyCache()
    revalidatePath('/', 'layout')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update currency.' }
  }
}
