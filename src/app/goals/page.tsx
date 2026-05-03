export const dynamic = 'force-dynamic'

import { GoalForm } from '@/components/goal-form'
import { GoalList } from '@/components/goal-list'

export default function GoalsPage() {
  return (
    <main className="container mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-semibold">Savings goals</h1>
      <GoalForm />
      <GoalList />
    </main>
  )
}
