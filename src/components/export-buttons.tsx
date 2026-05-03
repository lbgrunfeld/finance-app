'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { exportTransactionsCSV, exportPortfolioCSV } from '@/actions/export'

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ExportButtons() {
  const [pending, start] = useTransition()

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const csv = await exportTransactionsCSV()
            triggerDownload(csv, 'transactions.csv')
          })
        }
      >
        Export transactions
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const csv = await exportPortfolioCSV()
            triggerDownload(csv, 'portfolio.csv')
          })
        }
      >
        Export portfolio
      </Button>
    </div>
  )
}
