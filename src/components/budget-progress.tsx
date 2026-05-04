import { getBudgetStatus } from '@/actions/transactions'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export async function BudgetProgress() {
  const now = new Date()
  const statuses = await getBudgetStatus(now.getFullYear(), now.getMonth() + 1)
  const fmt = (n: number) => formatCurrency(n)

  if (statuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No budgets set. Add one to track monthly spending limits.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {statuses.map((b) => (
        <div key={b.category}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium capitalize">{b.category}</span>
            <span className="text-muted-foreground">
              {fmt(b.spent)} / {fmt(b.monthlyLimit)}
              {b.isWarning && !b.isOver && (
                <Badge variant="outline" className="ml-2 text-amber-600">
                  80%
                </Badge>
              )}
              {b.isOver && (
                <Badge variant="destructive" className="ml-2">
                  Over
                </Badge>
              )}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                b.isOver
                  ? 'bg-destructive'
                  : b.isWarning
                    ? 'bg-amber-500'
                    : 'bg-primary'
              }`}
              style={{ width: `${Math.min(b.pct * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
