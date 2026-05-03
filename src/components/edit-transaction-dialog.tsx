'use client'

import { useState, useTransition } from 'react'
import { updateTransaction } from '@/actions/transactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Defaults = {
  date: string
  amount: number
  category: string
  subcategory: string | null
  payee: string | null
  note: string | null
}

export function EditTransactionDialog({
  id,
  defaults,
}: {
  id: string
  defaults: Defaults
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(defaults.date)
  const [amount, setAmount] = useState(String(defaults.amount))
  const [category, setCategory] = useState(defaults.category)
  const [subcategory, setSubcategory] = useState(defaults.subcategory ?? '')
  const [payee, setPayee] = useState(defaults.payee ?? '')
  const [note, setNote] = useState(defaults.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed < 0) {
      setError('Invalid amount')
      return
    }
    start(async () => {
      const result = await updateTransaction(id, {
        date,
        amount: parsed,
        category,
        subcategory: subcategory || undefined,
        payee: payee || undefined,
        note: note || undefined,
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
          <DialogTitle>Edit transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subcategory</Label>
              <Input
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Payee</Label>
              <Input value={payee} onChange={(e) => setPayee(e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
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
