'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteTransaction } from '@/actions/transactions'

export function DeleteTransactionButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteTransaction(id)
        })
      }
    >
      {pending ? '…' : 'Delete'}
    </Button>
  )
}
