import { getMonthlySummary } from '@/actions/transactions'
import { getPortfolio } from '@/actions/positions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function SummaryCards() {
  const now = new Date()
  const [summary, portfolio] = await Promise.all([
    getMonthlySummary(now.getFullYear(), now.getMonth() + 1),
    getPortfolio(),
  ])

  const netWorth = summary.cashBalance + portfolio.totalValue
  const fmt = (n: number) => formatCurrency(n)

  const cards = [
    { title: 'Monthly Income', value: fmt(summary.totalIncome), sub: 'This month' },
    { title: 'Monthly Expenses', value: fmt(summary.totalExpenses), sub: 'This month' },
    {
      title: 'Net Cashflow',
      value: fmt(summary.netCashflow),
      sub: 'This month',
      highlight: summary.netCashflow >= 0,
    },
    {
      title: 'Cash Balance',
      value: fmt(summary.cashBalance),
      sub: 'Starting balance + ledger',
    },
    {
      title: 'Portfolio Value',
      value: fmt(portfolio.totalValue),
      sub: 'Market value today',
    },
    {
      title: 'Net Worth',
      value: fmt(netWorth),
      sub: 'Cash + portfolio',
      highlight: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${c.highlight ? 'text-primary' : ''}`}>
              {c.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
