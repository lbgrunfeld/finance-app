'use client'

import { useRef, useState, useTransition } from 'react'
import { createGoal } from '@/actions/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function GoalForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const data = new FormData(form)

    const name = (data.get('name') as string)?.trim()
    const target = parseFloat(data.get('targetAmount') as string)
    if (!name || isNaN(target) || target <= 0) {
      setError('Name and a positive target are required.')
      return
    }

    start(async () => {
      const result = await createGoal({
        name,
        targetAmount: target,
        targetDate: (data.get('targetDate') as string) || undefined,
        balance: parseFloat((data.get('balance') as string) || '0'),
      })
      if (result.success) {
        form.reset()
        setError(null)
      } else {
        setError(result.error ?? 'Failed to save.')
      }
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border p-6"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="name">Goal name</Label>
          <Input id="name" name="name" placeholder="e.g. Emergency fund" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="targetAmount">Target amount</Label>
          <Input
            id="targetAmount"
            name="targetAmount"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="balance">Starting balance</Label>
          <Input id="balance" name="balance" type="number" step="0.01" min="0" defaultValue="0" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="targetDate">Target date (optional)</Label>
          <Input id="targetDate" name="targetDate" type="date" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Add goal'}
      </Button>
    </form>
  )
}
