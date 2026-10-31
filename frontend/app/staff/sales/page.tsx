'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { AccessGate } from '@/components/workspace/AccessGate'
import {
  ErrorMessage,
  LoadingMessage,
  Surface,
  WorkspaceShell,
} from '@/components/workspace/WorkspaceShell'
import { StateMachineBar } from '@/components/subscriptions/StateMachineBar'
import { apiClient } from '@/services/apiClient'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Subscription, SubscriptionStatus } from '@/types/api'

export default function SalesWorkspacePage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiClient
      .get<Subscription[]>('/subscriptions')
      .then((data) => {
        if (active) setSubscriptions(data)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load subscriptions.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function transition(id: string, status: SubscriptionStatus) {
    if (status === 'CLOSED' && !window.confirm('Close this active subscription?')) return
    setTransitioning(id)
    setError('')
    try {
      const updated = await apiClient.patch<Subscription>(`/subscriptions/${id}/status`, { status })
      setSubscriptions((current) => current.map((subscription) => subscription.id === id
        ? { ...subscription, status: updated.status }
        : subscription))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update subscription status.')
    } finally {
      setTransitioning(null)
    }
  }

  return (
    <AccessGate roles={['STAFF', 'ADMIN']} subRoles={['SALES', 'GENERAL']}>
      <WorkspaceShell
        title="Sales workspace"
        description="Track customer subscriptions and move each one through its valid lifecycle."
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-emerald-100">Subscription lifecycle</p>
            <p className="mt-1 text-xs text-neutral-500">Status transitions are validated by the subscription service.</p>
          </div>
          <a href="/staff/finance" className="inline-flex items-center gap-1 text-xs text-neutral-400 transition hover:text-emerald-200">Finance view <ArrowUpRight className="size-3" /></a>
        </div>
        {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
        {loading ? <LoadingMessage label="Loading subscriptions…" /> : !error && (
          subscriptions.length ? (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <Surface key={subscription.id} title={subscription.subscriptionNumber}>
                  <div className="mb-5 grid gap-4 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <Detail label="Customer" value={`${subscription.customer.firstName} ${subscription.customer.lastName}`} />
                    <Detail label="Plan" value={subscription.plan.name} />
                    <Detail label="Next billing" value={formatDate(subscription.nextBillingDate)} />
                    <Detail label="Total" value={formatCurrency(subscription.totalAmount)} />
                  </div>
                  <StateMachineBar
                    currentStatus={subscription.status}
                    isLoading={transitioning === subscription.id}
                    isStaffOrAdmin
                    onTransition={(status) => transition(subscription.id, status)}
                  />
                </Surface>
              ))}
            </div>
          ) : <Surface title="Subscriptions"><p className="text-sm text-neutral-500">No subscriptions found.</p></Surface>
        )}
      </WorkspaceShell>
    </AccessGate>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1.5 truncate text-neutral-200">{value}</p></div>
}
