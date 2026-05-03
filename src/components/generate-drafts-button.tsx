'use client'

import { useState, useTransition } from 'react'
import { generateRecurringDrafts } from '@/actions/transactions'
import { Button } from '@/components/ui/button'

export function GenerateDraftsButton() {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const { generated } = await generateRecurringDrafts()
            setMessage(
              generated > 0
                ? `Generated ${generated} draft${generated === 1 ? '' : 's'}.`
                : 'No new drafts — already up to date this month.'
            )
            setTimeout(() => setMessage(null), 4000)
          })
        }
      >
        {pending ? 'Generating…' : 'Generate recurring drafts'}
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  )
}
