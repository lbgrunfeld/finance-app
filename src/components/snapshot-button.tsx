'use client'

import { useState, useTransition } from 'react'
import { takePortfolioSnapshot } from '@/actions/snapshots'
import { Button } from '@/components/ui/button'

export function SnapshotButton() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await takePortfolioSnapshot()
            setMsg(result.success ? 'Snapshot taken.' : (result.error ?? 'Failed.'))
            setTimeout(() => setMsg(null), 3000)
          })
        }
      >
        {pending ? 'Saving…' : 'Take snapshot'}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  )
}
