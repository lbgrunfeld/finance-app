import { getTransactions } from '@/actions/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCurrentCurrency } from '@/lib/currency'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteTransactionButton } from '@/components/delete-transaction-button'
import { EditTransactionDialog } from '@/components/edit-transaction-dialog'

export async function TransactionList({
  filters,
}: {
  filters?: Parameters<typeof getTransactions>[0]
}) {
  const [transactions, currency] = await Promise.all([
    getTransactions(filters),
    getCurrentCurrency(),
  ])

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No transactions yet. Add your first one above.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Payee / Source</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => (
          <TableRow key={t.id}>
            <TableCell>{formatDate(t.date)}</TableCell>
            <TableCell>{t.payee ?? '—'}</TableCell>
            <TableCell>
              <span className="capitalize">{t.category}</span>
              {t.subcategory && (
                <span className="text-muted-foreground"> · {t.subcategory}</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={t.type === 'INCOME' ? 'default' : 'secondary'}>
                {t.type}
              </Badge>
              {t.isSubscription && (
                <Badge variant="outline" className="ml-1">
                  SUB
                </Badge>
              )}
            </TableCell>
            <TableCell
              className={`text-right font-medium ${
                t.type === 'INCOME' ? 'text-green-600' : ''
              }`}
            >
              {t.type === 'EXPENSE' ? '–' : '+'}
              {formatCurrency(t.amount, currency)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <EditTransactionDialog
                  id={t.id}
                  defaults={{
                    date: t.date.toISOString().slice(0, 10),
                    amount: t.amount,
                    category: t.category,
                    subcategory: t.subcategory,
                    payee: t.payee,
                    note: t.note,
                  }}
                />
                <DeleteTransactionButton id={t.id} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
