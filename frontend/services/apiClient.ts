'use client'

import { getAuthState } from '@/store/useAuthStore'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthState().token
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    if (response.status === 401 && token) {
      getAuthState().logout()
      if (typeof window !== 'undefined') window.location.assign('/login')
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function readErrorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null)
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload
  ) {
    const message = payload.message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) {
      return message.filter((entry): entry is string => typeof entry === 'string').join(', ')
    }
  }
  return `Request failed with status ${response.status}.`
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
