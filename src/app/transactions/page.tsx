export const dynamic = 'force-dynamic'

import { TransactionList } from '@/components/transaction-list'
import { TransactionForm } from '@/components/transaction-form'
import { DraftList } from '@/components/draft-list'
import { GenerateDraftsButton } from '@/components/generate-drafts-button'
import { TransactionFilters } from '@/components/transaction-filters'

type SearchParams = {
  type?: string
  category?: string
  from?: string
  to?: string
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const filterType: 'INCOME' | 'EXPENSE' | undefined =
    sp.type === 'INCOME' ? 'INCOME' : sp.type === 'EXPENSE' ? 'EXPENSE' : undefined
  const filters = {
    type: filterType,
    category: sp.category || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
  }

  return (
    <main className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <GenerateDraftsButton />
      </div>
      <DraftList />
      <TransactionForm />
      <TransactionFilters />
      <TransactionList filters={filters} />
    </main>
  )
}
