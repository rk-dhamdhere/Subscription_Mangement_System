'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { ArrowUpRight, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { getHomeRoute, useAuthStore } from '@/store/useAuthStore'
import type { User } from '@/types/api'

const roleLabels: Record<User['role'], string> = {
  ADMIN: 'Administrator',
  STAFF: 'Staff',
  CUSTOMER: 'Customer',
}

export function WorkspaceShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const { user, logout } = useAuthStore()

  return (
    <main className="min-h-screen bg-[#070807] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080908]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a href={user ? getHomeRoute(user) : '/'} className="flex items-center gap-2.5">
            <Image src="/twin-logo.png" alt="" width={32} height={32} className="size-8 object-contain" />
            <span className="text-[17px] font-semibold tracking-[-0.06em]">Twin</span>
          </a>
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="/" className="hidden items-center gap-1 text-xs text-neutral-500 transition hover:text-emerald-200 sm:inline-flex">
              Twin home <ArrowUpRight className="size-3" />
            </a>
            <div className="hidden text-right sm:block">
              <p className="max-w-52 truncate text-xs font-medium text-neutral-200">{user?.fullName}</p>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                {user ? roleLabel(user) : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                window.location.assign('/login')
              }}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-neutral-300 transition hover:border-white/20 hover:text-white"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="mb-8">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300/75">
              Twin workspace
            </p>
            <h1 className="text-3xl font-medium tracking-[-0.055em] sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">{description}</p>
          </div>
          {children}
        </motion.div>
      </div>
    </main>
  )
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#101210]/90 p-5 shadow-[0_12px_38px_rgba(0,0,0,0.2)]">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-3 text-2xl font-medium tracking-[-0.05em] text-white">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-neutral-500">{detail}</p>}
    </div>
  )
}

export function Surface({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101210]/85">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/[0.07] px-5">
        <h2 className="text-sm font-medium text-neutral-100">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  )
}

export function LoadingMessage({ label = 'Loading workspace data…' }: { label?: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center gap-3 text-sm text-neutral-400" role="status">
      <span className="size-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
      {label}
    </div>
  )
}

export function StatusPill({ value }: { value: string }) {
  const isPositive = ['ACTIVE', 'CONFIRMED', 'PAID', 'COMPLETED', 'INVOICED'].includes(value)
  const isNegative = ['CLOSED', 'CANCELLED', 'FAILED', 'SKIPPED'].includes(value)
  const color = isPositive
    ? 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200'
    : isNegative
      ? 'border-rose-300/20 bg-rose-300/[0.08] text-rose-200'
      : 'border-white/10 bg-white/[0.04] text-neutral-300'
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide ${color}`}>
      {value.replaceAll('_', ' ')}
    </span>
  )
}

function roleLabel(user: User) {
  if (user.role === 'STAFF' && user.subRole) return `${user.subRole} staff`
  return roleLabels[user.role]
}
