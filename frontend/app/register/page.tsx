'use client'

import { FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { userFromAccessToken } from '@/lib/auth'
import { apiClient } from '@/services/apiClient'
import { getHomeRoute, hydrateAuthStore, useAuthStore } from '@/store/useAuthStore'
import type { LoginResponse } from '@/types/api'

export default function RegisterPage() {
  const { hydrated, setAuth, user } = useAuthStore()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
      const response = await apiClient.post<LoginResponse>('/auth/register', {
        firstName,
        lastName,
        email,
        password,
      })
      const account = userFromAccessToken(response.accessToken)
      setAuth(account, response.accessToken)
      window.location.assign(getHomeRoute(account))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#070807] px-5 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(16,185,129,0.12),transparent_52%)]" />
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-[470px] rounded-[26px] border border-white/[0.1] bg-[#101210]/90 p-7 shadow-[0_24px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-9"
      >
        <a href="/" className="mb-9 inline-flex items-center gap-2.5">
          <Image src="/twin-logo.png" alt="" width={36} height={36} className="size-9 object-contain" />
          <span className="text-[17px] font-semibold tracking-[-0.06em]">Twin</span>
        </a>
        <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-300/75">
          <Sparkles className="size-3.5" /> Customer account
        </p>
        <h1 className="text-3xl font-medium tracking-[-0.055em]">Get started</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">Create your account to manage subscriptions and invoices in one place.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={firstName} onChange={setFirstName} autoComplete="given-name" maxLength={100} />
            <Field label="Last name" value={lastName} onChange={setLastName} autoComplete="family-name" maxLength={100} />
          </div>
          <Field label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" maxLength={255} placeholder="name@business.com" />
          <label className="block text-xs text-neutral-300">
            Password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={9}
              maxLength={128}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,128}"
              title="Use at least 9 characters with uppercase, lowercase, and a special character."
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080908] px-3.5 text-sm outline-none transition focus:border-emerald-300/50"
              placeholder="At least 9 characters, with a symbol"
            />
          </label>
          <p className="text-[11px] leading-5 text-neutral-500">Use at least 9 characters with an uppercase letter, a lowercase letter, and a special character.</p>
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 text-sm font-semibold text-[#07120d] transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
            {!loading && <ArrowRight className="size-4" />}
          </button>
        </form>

        <div className="mt-6 border-t border-white/[0.08] pt-5 text-center text-xs text-neutral-400">
          Already have an account? <a href="/login" className="text-emerald-200 hover:text-emerald-100">Sign in</a>
        </div>
      </motion.section>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  maxLength,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete: string
  maxLength: number
  placeholder?: string
}) {
  return (
    <label className="block text-xs text-neutral-300">
      {label}
      <input
        type={type}
        autoComplete={autoComplete}
        required
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080908] px-3.5 text-sm outline-none transition focus:border-emerald-300/50"
        placeholder={placeholder}
      />
    </label>
  )
}
