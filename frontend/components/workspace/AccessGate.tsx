'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { SubRole, UserRole } from '@/types/api'
import { getHomeRoute, hydrateAuthStore, useAuthStore } from '@/store/useAuthStore'

export function AccessGate({
  roles,
  subRoles,
  children,
}: {
  roles: UserRole[]
  subRoles?: SubRole[]
  children: ReactNode
}) {
  const { user, hydrated, hasRole, hasSubRole } = useAuthStore()
  const [redirecting, setRedirecting] = useState(false)
  const allowed =
    !!user &&
    hasRole(roles) &&
    (!subRoles || hasSubRole(subRoles))

  useEffect(() => {
    hydrateAuthStore()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      setRedirecting(true)
      window.location.replace('/login')
    } else if (!allowed) {
      setRedirecting(true)
      window.location.replace(getHomeRoute(user))
    }
  }, [allowed, hydrated, user])

  if (!hydrated || !allowed || redirecting) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070807] px-5 text-neutral-300">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-[#101210] px-6 py-5 text-sm"
          role="status"
        >
          {!hydrated ? 'Restoring your secure session…' : 'Taking you to your workspace…'}
        </motion.div>
      </main>
    )
  }

  return <>{children}</>
}
