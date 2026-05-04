import { getGoals } from '@/actions/goals'
import { getMonthlySummary } from '@/actions/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { GoalActions } from '@/components/goal-actions'

export async function GoalList() {
  const now = new Date()
  const [goals, summary] = await Promise.all([
    getGoals(),
    getMonthlySummary(now.getFullYear(), now.getMonth() + 1),
  ])

  if (goals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No goals yet. Add one above.
      </p>
    )
  }

  const monthlyNet = summary.netCashflow
  const fmt = (n: number) => formatCurrency(n)

  return (
    <ul className="space-y-4">
      {goals.map((g) => {
        const pct = g.targetAmount > 0 ? g.balance / g.targetAmount : 0
        const remaining = Math.max(g.targetAmount - g.balance, 0)
        const monthsRemaining =
          monthlyNet > 0 ? Math.ceil(remaining / monthlyNet) : null
        return (
          <li key={g.id} className="rounded-md border p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmt(g.balance)} / {fmt(g.targetAmount)} · {(pct * 100).toFixed(0)}%
                  {g.targetDate && ` · target ${formatDate(g.targetDate)}`}
                </div>
              </div>
              <GoalActions id={g.id} balance={g.balance} />
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </div>
            {monthsRemaining != null && remaining > 0 && (
              <p className="text-xs text-muted-foreground">
                At your current monthly net cashflow ({fmt(monthlyNet)}/mo), you&apos;ll
                hit this in ~{monthsRemaining} {monthsRemaining === 1 ? 'month' : 'months'}.
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
