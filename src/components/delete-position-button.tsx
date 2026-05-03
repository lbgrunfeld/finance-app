'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deletePosition } from '@/actions/positions'

export function DeletePositionButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deletePosition(id)
        })
      }
    >
      {pending ? '…' : 'Delete'}
    </Button>
  )
}
