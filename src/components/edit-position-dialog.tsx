'use client'

import { useState, useTransition } from 'react'
import { updatePosition } from '@/actions/positions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Defaults = {
  ticker: string
  shares: number
  costBasisPerShare: number | null
  purchaseDate: string | null
  lotLabel: string | null
}

export function EditPositionDialog({
  id,
  defaults,
}: {
  id: string
  defaults: Defaults
}) {
  const [open, setOpen] = useState(false)
  const [ticker, setTicker] = useState(defaults.ticker)
  const [shares, setShares] = useState(String(defaults.shares))
  const [cost, setCost] = useState(
    defaults.costBasisPerShare != null ? String(defaults.costBasisPerShare) : ''
  )
  const [date, setDate] = useState(defaults.purchaseDate ?? '')
  const [lot, setLot] = useState(defaults.lotLabel ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    const sh = parseFloat(shares)
    if (isNaN(sh) || sh <= 0) {
      setError('Shares must be positive')
      return
    }
    start(async () => {
      const result = await updatePosition(id, {
        ticker,
        shares: sh,
        costBasisPerShare: cost ? parseFloat(cost) : undefined,
        purchaseDate: date || undefined,
        lotLabel: lot || undefined,
      })
      if (result.success) {
        setOpen(false)
        setError(null)
      } else {
        setError(result.error ?? 'Failed to save.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>Edit</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit position</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Ticker</Label>
            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Shares</Label>
            <Input
              type="number"
              step="0.0001"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cost basis / share</Label>
            <Input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Purchase date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Lot label</Label>
            <Input value={lot} onChange={(e) => setLot(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
