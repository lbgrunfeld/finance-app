'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/categories'
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

export function TransactionFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  const type = params.get('type') ?? ''
  const category = params.get('category') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    start(() => {
      router.replace(`/transactions?${next.toString()}`)
    })
  }

  function clear() {
    start(() => {
      router.replace('/transactions')
    })
  }

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-md border p-4">
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select value={type} onValueChange={(v) => update('type', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCOME">Income</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Category</Label>
        <Select value={category} onValueChange={(v) => update('category', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => update('from', e.target.value || null)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => update('to', e.target.value || null)}
        />
      </div>
      <div className="flex items-end">
        <Button variant="ghost" size="sm" onClick={clear} disabled={pending}>
          Clear
        </Button>
      </div>
    </div>
  )
}
