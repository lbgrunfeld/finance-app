'use client'

import { useRef, useState, useTransition } from 'react'
import { createPosition } from '@/actions/positions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PositionForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const data = new FormData(form)

    const ticker = (data.get('ticker') as string)?.trim()
    const shares = parseFloat(data.get('shares') as string)
    if (!ticker || isNaN(shares) || shares <= 0) {
      setError('Ticker and a positive share count are required.')
      return
    }

    const cost = data.get('costBasisPerShare') as string
    const date = data.get('purchaseDate') as string
    const lot = data.get('lotLabel') as string

    startTransition(async () => {
      const result = await createPosition({
        ticker,
        shares,
        costBasisPerShare: cost ? parseFloat(cost) : undefined,
        purchaseDate: date || undefined,
        lotLabel: lot || undefined,
      })
      if (result.success) {
        form.reset()
        setError(null)
      } else {
        setError(result.error ?? 'Something went wrong.')
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
        <div className="space-y-1">
          <Label htmlFor="ticker">Ticker</Label>
          <Input id="ticker" name="ticker" placeholder="AAPL" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="shares">Shares</Label>
          <Input
            id="shares"
            name="shares"
            type="number"
            step="0.0001"
            min="0"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="costBasisPerShare">Cost basis per share</Label>
          <Input
            id="costBasisPerShare"
            name="costBasisPerShare"
            type="number"
            step="0.01"
            min="0"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="purchaseDate">Purchase date</Label>
          <Input id="purchaseDate" name="purchaseDate" type="date" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="lotLabel">Lot label (optional)</Label>
          <Input id="lotLabel" name="lotLabel" placeholder="e.g. 2024 Roth IRA" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Add position'}
      </Button>
    </form>
  )
}
