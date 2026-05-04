import { getTransactions } from '@/actions/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DraftActions } from '@/components/draft-actions'

export async function DraftList() {
  const drafts = await getTransactions({ status: 'DRAFT' })
  if (drafts.length === 0) return null

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50/40 p-4 space-y-2">
      <h2 className="text-sm font-medium text-amber-900">
        Recurring drafts ({drafts.length}) — review and confirm
      </h2>
      <ul className="divide-y">
        {drafts.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <div>
              <div className="font-medium">
                {d.payee ?? d.category}{' '}
                <span className="text-muted-foreground capitalize">· {d.category}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(d.date)} · {d.type}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{formatCurrency(d.amount)}</span>
              <DraftActions id={d.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
