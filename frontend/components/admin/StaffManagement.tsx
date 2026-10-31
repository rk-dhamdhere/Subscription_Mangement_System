'use client'

import { FormEvent, useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import {
  ErrorMessage,
  StatusPill,
  Surface,
} from '@/components/workspace/WorkspaceShell'
import { apiClient } from '@/services/apiClient'
import type { BackendStaffRole, StaffMember } from '@/types/api'

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [staffRole, setStaffRole] = useState<BackendStaffRole>('SALES')

  useEffect(() => {
    let active = true
    apiClient
      .get<StaffMember[]>('/staff')
      .then((members) => {
        if (active) setStaff(members)
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load staff accounts.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setCreating(true)
    try {
      const created = await apiClient.post<StaffMember>('/staff', {
        firstName,
        lastName,
        email,
        password: temporaryPassword,
        staffRole,
      })
      setStaff((current) =>
        [...current, created].sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`,
          ),
        ),
      )
      setFirstName('')
      setLastName('')
      setEmail('')
      setTemporaryPassword('')
      setMessage(
        'Staff account created. Share the temporary password securely.',
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create staff account.',
      )
    } finally {
      setCreating(false)
    }
  }

  async function updateStaff(
    id: string,
    changes: { staffRole?: BackendStaffRole; isActive?: boolean },
  ) {
    const member = staff.find((candidate) => candidate.id === id)
    if (!member) return
    if (
      changes.isActive === false &&
      !window.confirm(`Deactivate ${member.firstName} ${member.lastName}?`)
    )
      return

    setError('')
    setMessage('')
    setWorkingId(id)
    try {
      const updated = await apiClient.patch<StaffMember>(
        `/staff/${id}`,
        changes,
      )
      setStaff((current) =>
        current.map((candidate) => (candidate.id === id ? updated : candidate)),
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update staff account.',
      )
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <Surface title="Staff management">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}
      <form
        onSubmit={createStaff}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
      >
        <label className="text-xs text-neutral-400">
          First name
          <input
            required
            maxLength={100}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-white outline-none focus:border-emerald-300/50"
          />
        </label>
        <label className="text-xs text-neutral-400">
          Last name
          <input
            required
            maxLength={100}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-white outline-none focus:border-emerald-300/50"
          />
        </label>
        <label className="text-xs text-neutral-400">
          Email
          <input
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-white outline-none focus:border-emerald-300/50"
          />
        </label>
        <label className="text-xs text-neutral-400">
          Temporary password
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}"
            title="Use uppercase, lowercase, and a special character."
            value={temporaryPassword}
            onChange={(event) => setTemporaryPassword(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-white outline-none focus:border-emerald-300/50"
          />
        </label>
        <label className="text-xs text-neutral-400">
          Workspace
          <select
            value={staffRole}
            onChange={(event) =>
              setStaffRole(event.target.value as BackendStaffRole)
            }
            className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-white outline-none focus:border-emerald-300/50"
          >
            <option value="NONE">General</option>
            <option value="SALES">Sales</option>
            <option value="FINANCE">Finance</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={creating}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 text-xs font-semibold text-[#07120d] transition hover:bg-emerald-300 disabled:opacity-50"
        >
          <UserPlus className="size-3.5" />
          {creating ? 'Creating…' : 'Add staff'}
        </button>
      </form>
      <p className="mt-3 text-[11px] leading-5 text-neutral-500">
        Passwords must contain uppercase, lowercase, and a symbol. Staff can
        request a password reset after signing in.
      </p>
      {message && (
        <p role="status" className="mt-3 text-xs text-emerald-200">
          {message}
        </p>
      )}
      <div className="mt-5 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-neutral-500">Loading staff accounts…</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-neutral-500">No staff accounts found.</p>
        ) : (
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Workspace</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="py-3.5 pr-4 text-neutral-200">
                    {member.firstName} {member.lastName}
                  </td>
                  <td className="py-3.5 pr-4 text-neutral-400">
                    {member.email}
                  </td>
                  <td className="py-3.5 pr-4">
                    <select
                      aria-label={`Workspace for ${member.email}`}
                      value={member.staffRole}
                      disabled={!member.isActive || workingId === member.id}
                      onChange={(event) =>
                        void updateStaff(member.id, {
                          staffRole: event.target.value as BackendStaffRole,
                        })
                      }
                      className="rounded-md border border-white/10 bg-[#080908] px-2 py-1 text-neutral-200 disabled:opacity-50"
                    >
                      <option value="NONE">General</option>
                      <option value="SALES">Sales</option>
                      <option value="FINANCE">Finance</option>
                    </select>
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusPill
                      value={member.isActive ? 'ACTIVE' : 'INACTIVE'}
                    />
                  </td>
                  <td className="py-3.5">
                    <button
                      type="button"
                      disabled={workingId === member.id}
                      onClick={() =>
                        void updateStaff(member.id, {
                          isActive: !member.isActive,
                        })
                      }
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-neutral-300 transition hover:border-rose-300/30 hover:text-rose-200 disabled:opacity-50"
                    >
                      {member.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Surface>
  )
}
