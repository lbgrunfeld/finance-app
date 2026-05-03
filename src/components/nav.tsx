'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/goals', label: 'Goals' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="border-b">
      <div className="container mx-auto flex items-center gap-6 h-14">
        <span className="font-semibold text-lg">WealthDash</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'text-sm text-muted-foreground hover:text-foreground transition-colors',
              pathname === l.href && 'text-foreground font-medium'
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
