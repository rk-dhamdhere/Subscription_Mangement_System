'use client'

import { FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/services/apiClient'
import { getHomeRoute, hydrateAuthStore, useAuthStore } from '@/store/useAuthStore'
import { userFromAccessToken } from '@/lib/auth'
import type { LoginResponse } from '@/types/api'

export default function LoginPage() {
  const { hydrated, setAuth, user } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    hydrateAuthStore()
  }, [])

  useEffect(() => {
    if (hydrated && user) window.location.replace(getHomeRoute(user))
  }, [hydrated, user])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      })
      const authenticatedUser = userFromAccessToken(response.accessToken)
      setAuth(authenticatedUser, response.accessToken)
      window.location.assign(getHomeRoute(authenticatedUser))
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#070807] px-5 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(16,185,129,0.12),transparent_52%)]" />
      <motion.section
        initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative w-full max-w-[430px] rounded-[26px] border border-white/[0.1] bg-[#101210]/90 p-7 shadow-[0_24px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-9"
      >
        <a href="/" className="mb-9 inline-flex items-center gap-2.5">
          <Image src="/twin-logo.png" alt="" width={36} height={36} className="size-9 object-contain" />
          <span className="text-[17px] font-semibold tracking-[-0.06em]">Twin</span>
        </a>
        <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-300/75">
          <Sparkles className="size-3.5" /> Secure workspace
        </p>
        <h1 className="text-3xl font-medium tracking-[-0.055em]">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">Sign in to manage subscriptions, billing, and customer accounts.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-xs text-neutral-300">
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080908] px-3.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/10"
              placeholder="name@business.com"
            />
          </label>
          <label className="block text-xs text-neutral-300">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080908] px-3.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/10"
              placeholder="Enter your password"
            />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 text-sm font-semibold text-[#07120d] transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading && <ArrowRight className="size-4" />}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-5 text-xs">
          <a href="/reset-password" className="text-neutral-400 transition hover:text-emerald-200">Forgot password?</a>
          <a href="/register" className="text-neutral-400 transition hover:text-emerald-200">Create customer account</a>
        </div>
        <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-[11px] leading-5 text-neutral-500">
          Demo accounts are listed in the project README. All seeded accounts share the configured demo password.
        </div>
      </motion.section>
    </main>
  )
}
