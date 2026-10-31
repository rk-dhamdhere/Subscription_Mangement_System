'use client'

import { FormEvent, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/services/apiClient'

export default function ResetPasswordPage() {
  const [mode, setMode] = useState<'request' | 'complete'>('request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const response =
        mode === 'request'
          ? await apiClient.post<{ message: string }>('/auth/password-reset/request', { email })
          : await apiClient.post<{ message: string }>('/auth/password-reset/complete', {
              token,
              password,
            })
      setMessage(response.message)
      if (mode === 'complete') {
        setToken('')
        setPassword('')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Password reset failed.')
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
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[430px] rounded-[26px] border border-white/[0.1] bg-[#101210]/90 p-7 shadow-[0_24px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-9"
      >
        <a href="/" className="mb-9 inline-flex items-center gap-2.5">
          <Image src="/twin-logo.png" alt="" width={36} height={36} className="size-9 object-contain" />
          <span className="text-[17px] font-semibold tracking-[-0.06em]">Twin</span>
        </a>
        <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-300/75"><KeyRound className="size-3.5" /> Account recovery</p>
        <h1 className="text-3xl font-medium tracking-[-0.055em]">{mode === 'request' ? 'Reset your password' : 'Choose a new password'}</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          {mode === 'request'
            ? 'We’ll send reset instructions if an active account exists for the email.'
            : 'Enter the single-use token from your reset email and your new password.'}
        </p>

        <div className="mt-6 flex rounded-full border border-white/[0.08] bg-[#080908] p-1">
          <button type="button" onClick={() => { setMode('request'); setError(''); setMessage('') }} className={`flex-1 rounded-full py-2 text-xs transition ${mode === 'request' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-200'}`}>Request link</button>
          <button type="button" onClick={() => { setMode('complete'); setError(''); setMessage('') }} className={`flex-1 rounded-full py-2 text-xs transition ${mode === 'complete' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-200'}`}>Set new password</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'request' ? (
            <label className="block text-xs text-neutral-300">
              Email address
              <input type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080908] px-3.5 text-sm outline-none transition focus:border-emerald-300/50" placeholder="name@business.com" />
            </label>
          ) : (
            <>
              <label className="block text-xs text-neutral-300">
                Reset token
                <input required minLength={32} maxLength={128} value={token} onChange={(event) => setToken(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080908] px-3.5 text-sm outline-none transition focus:border-emerald-300/50" placeholder="Paste the token from your email" />
              </label>
              <label className="block text-xs text-neutral-300">
                New password
                <input type="password" autoComplete="new-password" required minLength={9} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,128}" title="Use at least 9 characters with uppercase, lowercase, and a special character." value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080908] px-3.5 text-sm outline-none transition focus:border-emerald-300/50" placeholder="At least 9 characters, with a symbol" />
              </label>
            </>
          )}
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm text-emerald-100">{message}</p>}
          <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-[#07120d] transition hover:bg-emerald-300 disabled:opacity-50">
            {loading ? 'Submitting…' : mode === 'request' ? 'Send reset instructions' : 'Update password'}
          </button>
        </form>
        <a href="/login" className="mt-6 inline-flex items-center gap-2 text-xs text-neutral-400 transition hover:text-emerald-200"><ArrowLeft className="size-3.5" /> Back to sign in</a>
      </motion.section>
    </main>
  )
}
