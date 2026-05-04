export const dynamic = 'force-dynamic'

import { PositionList } from '@/components/position-list'
import { PositionForm } from '@/components/position-form'
import { PortfolioChart } from '@/components/portfolio-chart'
import { SnapshotButton } from '@/components/snapshot-button'
import { getPortfolioHistory } from '@/actions/snapshots'

export default async function PortfolioPage() {
  const history = await getPortfolioHistory(90)

  const chartData = history.map((s) => ({
    date: s.date.toISOString().slice(0, 10),
    totalValue: s.totalValue,
  }))

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <SnapshotButton />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">90-day history</h2>
        <div className="rounded-md border p-6">
          <PortfolioChart data={chartData} />
        </div>
      </div>

      <PositionForm />
      <PositionList />
    </main>
  )
}
