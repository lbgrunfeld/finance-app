'use client'

import { useState, useTransition } from 'react'
import { upsertBudget } from '@/actions/transactions'
import { EXPENSE_CATEGORIES } from '@/lib/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function BudgetForm() {
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    const parsed = parseFloat(limit)
    if (!category) {
      setError('Pick a category')
      return
    }
    if (isNaN(parsed) || parsed <= 0) {
      setError('Enter a positive limit')
      return
    }
    start(async () => {
      const result = await upsertBudget(category, parsed)
      if (result.success) {
        setCategory('')
        setLimit('')
        setError(null)
      } else {
        setError(result.error ?? 'Failed to save budget.')
      }
    })
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="limit" className="text-xs">
            Monthly limit
          </Label>
          <Input
            id="limit"
            type="number"
            step="0.01"
            min="0"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" disabled={pending} onClick={save}>
        {pending ? 'Saving…' : 'Set budget'}
      </Button>
    </div>
  )
}
