export const dynamic = 'force-dynamic'

import { SummaryCards } from '@/components/summary-cards'
import { UpcomingRenewals } from '@/components/upcoming-renewals'
import { BudgetProgress } from '@/components/budget-progress'
import { BudgetForm } from '@/components/budget-form'
import { ExportButtons } from '@/components/export-buttons'
import { StartingBalanceForm } from '@/components/starting-balance-form'
import { CurrencySelect } from '@/components/currency-select'
import { ExpenseChart } from '@/components/expense-chart'
import { getCategoryBreakdown, getDraftCount } from '@/actions/transactions'
import { getSettings } from '@/actions/settings'

export default async function DashboardPage() {
  const now = new Date()
  const [drafts, settings, breakdown] = await Promise.all([
    getDraftCount(),
    getSettings(),
    getCategoryBreakdown(now.getFullYear(), now.getMonth() + 1),
  ])

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <CurrencySelect current={settings.currency} />
          <StartingBalanceForm current={settings.startingBalance} />
          <ExportButtons />
        </div>
      </div>

      {drafts > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have {drafts} recurring {drafts === 1 ? 'entry' : 'entries'} due this month.{' '}
          <a href="/transactions" className="underline font-medium">
            Review →
          </a>
        </div>
      )}

      <SummaryCards />

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Budget this month</h2>
          <BudgetForm />
          <BudgetProgress />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Upcoming renewals</h2>
          <UpcomingRenewals />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">Expense breakdown</h2>
        <div className="rounded-md border p-6">
          <ExpenseChart data={breakdown} currency={settings.currency} />
        </div>
      </div>
    </main>
  )
}
