'use client'

import { useTransition } from 'react'
import { updateCurrency } from '@/actions/settings'
import { CURRENCIES } from '@/lib/currency'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function CurrencySelect({ current }: { current: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs">Currency</Label>
      <Select
        value={current}
        onValueChange={(v) => {
          if (!v) return
          start(async () => {
            await updateCurrency(v)
          })
        }}
      >
        <SelectTrigger className="w-24" disabled={pending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
