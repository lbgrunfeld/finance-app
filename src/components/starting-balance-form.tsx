'use client'

import { useState, useTransition } from 'react'
import { updateStartingBalance } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function StartingBalanceForm({ current }: { current: number }) {
  const [value, setValue] = useState(String(current))
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) {
      setError('Enter a number')
      return
    }
    start(async () => {
      const result = await updateStartingBalance(parsed)
      if (result.success) {
        setEditing(false)
        setError(null)
      } else {
        setError(result.error ?? 'Failed to save.')
      }
    })
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Edit starting balance
      </Button>
    )
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="startingBalance" className="text-xs">
          Starting balance
        </Label>
        <Input
          id="startingBalance"
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40"
        />
      </div>
      <Button size="sm" disabled={pending} onClick={save}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setEditing(false)
          setValue(String(current))
          setError(null)
        }}
      >
        Cancel
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
