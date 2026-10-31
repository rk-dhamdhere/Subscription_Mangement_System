'use client'

import { useSyncExternalStore } from 'react'
import type { SubRole, User, UserRole } from '@/types/api'

const STORAGE_KEY = 'brightloop-auth'

export interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  hasRole: (allowedRoles: UserRole[]) => boolean
  hasSubRole: (allowedSubRoles: SubRole[]) => boolean
}

const listeners = new Set<() => void>()

let state: AuthState = {
  user: null,
  token: null,
  hydrated: false,
  setAuth: (user, token) => updateState({ user, token, hydrated: true }),
  logout: () => updateState({ user: null, token: null, hydrated: true }),
  hasRole: (allowedRoles) =>
    state.user ? allowedRoles.includes(state.user.role) : false,
  hasSubRole: (allowedSubRoles) => {
    if (!state.user) return false
    if (state.user.role === 'ADMIN') return true
    return state.user.subRole
      ? allowedSubRoles.includes(state.user.subRole)
      : false
  },
}

const serverState: AuthState = {
  ...state,
  user: null,
  token: null,
  hydrated: false,
}

function updateState(update: Pick<AuthState, 'user' | 'token' | 'hydrated'>) {
  state = { ...state, ...update }
  if (typeof window !== 'undefined') {
    if (state.user && state.token) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: state.user, token: state.token }),
      )
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function getServerSnapshot(): AuthState {
  return serverState
}

export function hydrateAuthStore() {
  if (typeof window === 'undefined' || state.hydrated) return

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    updateState({ user: null, token: null, hydrated: true })
    return
  }

  try {
    const parsed: unknown = JSON.parse(saved)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('user' in parsed) ||
      !('token' in parsed) ||
      typeof parsed.token !== 'string' ||
      typeof parsed.user !== 'object' ||
      parsed.user === null
    ) {
      throw new Error('Stored authentication data has an invalid shape.')
    }
    const user = parsed.user as User
    if (
      typeof user.id !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.fullName !== 'string' ||
      !['ADMIN', 'STAFF', 'CUSTOMER'].includes(user.role)
    ) {
      throw new Error('Stored authentication user is invalid.')
    }
    updateState({ user, token: parsed.token, hydrated: true })
  } catch (error) {
    window.localStorage.removeItem(STORAGE_KEY)
    updateState({ user: null, token: null, hydrated: true })
    console.error('Unable to restore the saved Twin session.', error)
  }
}

export function useAuthStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function getAuthState() {
  return state
}

export function getHomeRoute(user: User): string {
  if (user.role === 'ADMIN') return '/admin'
  if (user.role === 'CUSTOMER') return '/portal'
  return user.subRole === 'FINANCE' ? '/staff/finance' : '/staff/sales'
}
