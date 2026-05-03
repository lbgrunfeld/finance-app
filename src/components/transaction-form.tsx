'use client'

import { useRef, useState, useTransition } from 'react'
import { createTransaction } from '@/actions/transactions'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function defaultNextRenewal(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function TransactionForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [isSubscription, setIsSubscription] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')
  const [nextRenewal, setNextRenewal] = useState(defaultNextRenewal())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const selectedCat = categories.find((c) => c.value === category)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const data = new FormData(form)

    startTransition(async () => {
      const result = await createTransaction({
        date: data.get('date') as string,
        amount: parseFloat(data.get('amount') as string),
        type,
        category,
        subcategory: subcategory || undefined,
        payee: (data.get('payee') as string) || undefined,
        note: (data.get('note') as string) || undefined,
        isSubscription,
        subscription: isSubscription ? { billingCycle, nextRenewal } : undefined,
      })
      if (result.success) {
        form.reset()
        setCategory('')
        setSubcategory('')
        setIsSubscription(false)
        setBillingCycle('MONTHLY')
        setNextRenewal(defaultNextRenewal())
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
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={type === 'INCOME' ? 'default' : 'outline'}
          onClick={() => {
            setType('INCOME')
            setCategory('')
            setSubcategory('')
            setIsSubscription(false)
          }}
        >
          Income
        </Button>
        <Button
          type="button"
          variant={type === 'EXPENSE' ? 'default' : 'outline'}
          onClick={() => {
            setType('EXPENSE')
            setCategory('')
            setSubcategory('')
          }}
        >
          Expense
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="space-y-1">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v ?? '')
              setSubcategory('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCat && selectedCat.subcategories.length > 0 && (
          <div className="space-y-1">
            <Label>Subcategory</Label>
            <Select value={subcategory} onValueChange={(v) => setSubcategory(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {selectedCat.subcategories.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="payee">Payee / Source</Label>
          <Input id="payee" name="payee" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={2} />
      </div>

      {type === 'EXPENSE' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isSubscription}
            onChange={(e) => setIsSubscription(e.target.checked)}
            className="size-4"
          />
          Mark as subscription (auto-creates a recurring rule)
        </label>
      )}

      {isSubscription && (
        <div className="grid md:grid-cols-2 gap-4 rounded-md border bg-muted/30 p-4">
          <div className="space-y-1">
            <Label>Billing cycle</Label>
            <Select
              value={billingCycle}
              onValueChange={(v) =>
                setBillingCycle((v ?? 'MONTHLY') as 'MONTHLY' | 'ANNUAL')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="ANNUAL">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nextRenewal">Next renewal</Label>
            <Input
              id="nextRenewal"
              type="date"
              value={nextRenewal}
              onChange={(e) => setNextRenewal(e.target.value)}
              required
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending || !category}>
        {isPending ? 'Saving…' : 'Add transaction'}
      </Button>
    </form>
  )
}
