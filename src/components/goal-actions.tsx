'use client'

import { useState, useTransition } from 'react'
import { updateGoalBalance, deleteGoal } from '@/actions/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function GoalActions({
  id,
  balance,
}: {
  id: string
  balance: number
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(balance))
  const [pending, start] = useTransition()

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 h-8"
        />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const parsed = parseFloat(value)
              if (!isNaN(parsed)) {
                await updateGoalBalance(id, parsed)
                setEditing(false)
              }
            })
          }
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(false)
            setValue(String(balance))
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        Update balance
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deleteGoal(id)
          })
        }
      >
        Delete
      </Button>
    </div>
  )
}
