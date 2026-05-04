import { getPortfolio } from '@/actions/positions'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeletePositionButton } from '@/components/delete-position-button'
import { EditPositionDialog } from '@/components/edit-position-dialog'

export async function PositionList() {
  const { positions, totalValue, totalGainLoss } = await getPortfolio()
  const fmt = (n: number) => formatCurrency(n)

  if (positions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No positions yet. Add your first holding above.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Lot</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Day Change</TableHead>
            <TableHead className="text-right">Market Value</TableHead>
            <TableHead className="text-right">Gain / Loss</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.ticker}</TableCell>
              <TableCell className="text-muted-foreground">{p.lotLabel ?? '—'}</TableCell>
              <TableCell className="text-right">{p.shares}</TableCell>
              <TableCell className="text-right">
                {p.quote?.error ? (
                  <Badge variant="destructive">Error</Badge>
                ) : p.quote?.stale ? (
                  <span className="text-amber-600">{fmt(p.quote.price)} ⚠</span>
                ) : (
                  fmt(p.quote?.price ?? 0)
                )}
              </TableCell>
              <TableCell
                className={`text-right ${
                  (p.quote?.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {p.quote?.change != null
                  ? `${p.quote.change >= 0 ? '+' : ''}${fmt(p.quote.change)} (${p.quote.changePct.toFixed(2)}%)`
                  : '—'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {fmt(p.marketValue)}
              </TableCell>
              <TableCell
                className={`text-right ${
                  (p.gainLoss ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {p.gainLoss != null
                  ? `${p.gainLoss >= 0 ? '+' : ''}${fmt(p.gainLoss)}`
                  : '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <EditPositionDialog
                    id={p.id}
                    defaults={{
                      ticker: p.ticker,
                      shares: p.shares,
                      costBasisPerShare: p.costBasisPerShare,
                      purchaseDate: p.purchaseDate
                        ? p.purchaseDate.toISOString().slice(0, 10)
                        : null,
                      lotLabel: p.lotLabel,
                    }}
                  />
                  <DeletePositionButton id={p.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-8 text-sm font-medium pt-2 border-t">
        <span>Total value: {fmt(totalValue)}</span>
        <span className={totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
          Total gain/loss: {totalGainLoss >= 0 ? '+' : ''}
          {fmt(totalGainLoss)}
        </span>
      </div>
    </div>
  )
}
