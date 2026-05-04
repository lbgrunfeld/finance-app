import { getUpcomingRenewals } from '@/actions/subscriptions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CancelSubscriptionButton } from '@/components/cancel-subscription-button'

export async function UpcomingRenewals() {
  const renewals = await getUpcomingRenewals()

  if (renewals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active subscriptions.</p>
    )
  }

  return (
    <ul className="divide-y rounded-md border">
      {renewals.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
          <div>
            <div className="font-medium">{r.transaction.payee ?? r.transaction.category}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(r.nextRenewal)} · {r.billingCycle.toLowerCase()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium">{formatCurrency(r.transaction.amount)}</span>
            <CancelSubscriptionButton id={r.id} />
          </div>
        </li>
      ))}
    </ul>
  )
}
