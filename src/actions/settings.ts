'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, startingBalance: 0 },
  })
}

export async function updateStartingBalance(amount: number) {
  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { startingBalance: amount },
      create: { id: 1, startingBalance: amount },
    })
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update starting balance.' }
  }
}
