'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { cancelSubscription } from '@/actions/subscriptions'

export function CancelSubscriptionButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await cancelSubscription(id)
        })
      }
    >
      {pending ? '…' : 'Cancel'}
    </Button>
  )
}
