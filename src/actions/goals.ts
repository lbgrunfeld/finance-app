'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createGoal(data: {
  name: string
  targetAmount: number
  targetDate?: string
  balance?: number
}) {
  try {
    await prisma.goal.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        balance: data.balance ?? 0,
      },
    })
    revalidatePath('/goals')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to create goal.' }
  }
}

export async function updateGoalBalance(id: string, balance: number) {
  try {
    await prisma.goal.update({ where: { id }, data: { balance } })
    revalidatePath('/goals')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update balance.' }
  }
}

export async function deleteGoal(id: string) {
  try {
    await prisma.goal.delete({ where: { id } })
    revalidatePath('/goals')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete goal.' }
  }
}

export async function getGoals() {
  return prisma.goal.findMany({ orderBy: { createdAt: 'desc' } })
}
