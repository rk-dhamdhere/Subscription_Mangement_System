'use client'

import { useState } from 'react'
import { ArrowRight, Menu, Sparkles, X } from 'lucide-react'

const links = [
  ['Product', '#product'],
  ['Simulate', '#simulate'],
  ['Compare', '/#compare'],
  ['Intelligence', '/#intelligence'],
  ['Memory', '/#memory'],
]

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="pointer-events-auto relative z-30 flex min-h-10 items-center justify-between gap-4">
      <a
        href="/"
        className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-[-0.04em] text-white/90 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86EFAC]"
      >
        <span className="grid size-7 place-items-center rounded-lg border border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]">
          <Sparkles aria-hidden="true" className="size-3.5" />
        </span>
        Twin
      </a>
      <nav
        aria-label="Twin navigation"
        className="hidden items-center gap-5 lg:flex"
      >
        {links.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="text-[11px] text-white/50 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86EFAC]"
          >
            {label}
          </a>
        ))}
      </nav>
      <a
        href="/"
        className="ml-auto hidden text-xs text-white/50 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86EFAC] sm:inline-flex lg:ml-0"
      >
        Back to home
      </a>
      <button
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="grid size-9 place-items-center rounded-full border border-white/10 text-white/80 lg:hidden"
      >
        {menuOpen ? (
          <X aria-hidden="true" className="size-4" />
        ) : (
          <Menu aria-hidden="true" className="size-4" />
        )}
      </button>
      {menuOpen && (
        <nav
          aria-label="Twin mobile navigation"
          className="absolute inset-x-0 top-full z-30 mt-3 grid gap-1 rounded-xl border border-white/10 bg-[#0A0B0D] p-3 shadow-xl lg:hidden"
        >
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
            >
              {label}
            </a>
          ))}
          <a
            href="/"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            Back to home <ArrowRight aria-hidden="true" className="ml-1 inline size-3" />
          </a>
        </nav>
      )}
    </header>
  )
}
