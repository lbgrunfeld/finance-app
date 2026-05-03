'use client'

import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/utils'

const config = {
  totalValue: { label: 'Portfolio value', color: '#0ea5e9' },
} satisfies ChartConfig

export function PortfolioChart({
  data,
  currency,
}: {
  data: { date: string; totalValue: number }[]
  currency: string
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No history yet. Take a snapshot to start tracking.
      </p>
    )
  }

  return (
    <ChartContainer config={config} className="h-72 w-full">
      <LineChart data={data} margin={{ left: 12, right: 12, top: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(v) => formatCurrency(v, currency)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                typeof value === 'number' ? formatCurrency(value, currency) : value
              }
            />
          }
        />
        <Line
          type="monotone"
          dataKey="totalValue"
          stroke="var(--color-totalValue)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
