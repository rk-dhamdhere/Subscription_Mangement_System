import type { BackendStaffRole, User, UserRole } from '@/types/api'

export function userFromAccessToken(token: string): User {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('The server returned an invalid access token.')

  let claims: unknown
  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    claims = JSON.parse(window.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
  } catch {
    throw new Error('The server returned an unreadable access token.')
  }

  if (typeof claims !== 'object' || claims === null) {
    throw new Error('The server returned incomplete account information.')
  }
  const payload = claims as {
    sub?: unknown
    email?: unknown
    fullName?: unknown
    role?: unknown
    staffRole?: unknown
    exp?: unknown
  }
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    !['ADMIN', 'STAFF', 'CUSTOMER'].includes(String(payload.role)) ||
    (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now())
  ) {
    throw new Error('The server returned incomplete or expired account information.')
  }

  const role = payload.role as UserRole
  const staffRole = payload.staffRole as BackendStaffRole | undefined
  return {
    id: payload.sub,
    email: payload.email,
    fullName: typeof payload.fullName === 'string' ? payload.fullName : payload.email,
    role,
    ...(role === 'STAFF'
      ? { subRole: staffRole === 'SALES' || staffRole === 'FINANCE' ? staffRole : 'GENERAL' }
      : {}),
  }
}
