'use client'

import { useTransition } from 'react'
import { confirmDraft, skipDraft } from '@/actions/transactions'
import { Button } from '@/components/ui/button'

export function DraftActions({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await confirmDraft(id)
          })
        }
      >
        Confirm
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await skipDraft(id)
          })
        }
      >
        Skip
      </Button>
    </div>
  )
}
