'use client'

import { Pie, PieChart, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/utils'

const COLORS = [
  '#0ea5e9',
  '#a855f7',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#84cc16',
  '#06b6d4',
]

export function ExpenseChart({
  data,
  currency,
}: {
  data: { category: string; total: number }[]
  currency: string
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No expenses this month yet.</p>
    )
  }

  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.category,
      { label: d.category, color: COLORS[i % COLORS.length] },
    ])
  )

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-72">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                typeof value === 'number' ? formatCurrency(value, currency) : value
              }
            />
          }
        />
        <Pie data={data} dataKey="total" nameKey="category" outerRadius={100}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
