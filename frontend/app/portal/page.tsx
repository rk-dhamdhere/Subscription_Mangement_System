'use client'

import { useEffect, useState } from 'react'
import { AccessGate } from '@/components/workspace/AccessGate'
import {
  ErrorMessage,
  LoadingMessage,
  MetricCard,
  StatusPill,
  Surface,
  WorkspaceShell,
} from '@/components/workspace/WorkspaceShell'
import { apiClient } from '@/services/apiClient'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Invoice, Subscription } from '@/types/api'

export default function CustomerPortalPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      apiClient.get<Subscription[]>('/subscriptions'),
      apiClient.get<Invoice[]>('/invoices'),
    ])
      .then(([subscriptionList, invoiceList]) => {
        if (!active) return
        setSubscriptions(subscriptionList)
        setInvoices(invoiceList)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load your account.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const openBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.amountDue), 0)
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'ACTIVE').length

  return (
    <AccessGate roles={['CUSTOMER']}>
      <WorkspaceShell
        title="Your subscription portal"
        description="A clear view of your active services, upcoming billing, and invoice history."
      >
        {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
        {loading ? <LoadingMessage label="Loading your subscriptions and invoices…" /> : !error && (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Subscriptions" value={subscriptions.length.toString()} />
              <MetricCard label="Active subscriptions" value={activeSubscriptions.toString()} />
              <MetricCard label="Open invoice balance" value={formatCurrency(openBalance)} />
            </div>

            <div className="space-y-5">
              <Surface title="Your subscriptions">
                {subscriptions.length === 0 ? <p className="text-sm text-neutral-500">No subscriptions yet.</p> : (
                  <div className="space-y-3">
                    {subscriptions.map((subscription) => (
                      <div key={subscription.id} className="rounded-xl border border-white/[0.07] bg-[#080908]/55 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-neutral-100">{subscription.plan.name}</p>
                            <p className="mt-1 text-[10px] text-neutral-500">{subscription.subscriptionNumber} · {subscription.plan.billingPeriod.toLowerCase()}</p>
                          </div>
                          <StatusPill value={subscription.status} />
                        </div>
                        <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-3 text-xs sm:grid-cols-3">
                          <div><p className="text-[10px] text-neutral-500">Started</p><p className="mt-1 text-neutral-300">{formatDate(subscription.startDate)}</p></div>
                          <div><p className="text-[10px] text-neutral-500">Next billing</p><p className="mt-1 text-neutral-300">{formatDate(subscription.nextBillingDate)}</p></div>
                          <div><p className="text-[10px] text-neutral-500">Subscription total</p><p className="mt-1 text-neutral-300">{formatCurrency(subscription.totalAmount)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Surface>

              <Surface title="Invoice history">
                {invoices.length === 0 ? <p className="text-sm text-neutral-500">No invoices found.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3 font-medium">Invoice</th><th className="pb-3 font-medium">Subscription</th><th className="pb-3 font-medium">Issued</th><th className="pb-3 font-medium">Amount due</th><th className="pb-3 font-medium">Status</th></tr></thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="py-3.5 pr-4 font-medium text-neutral-200">{invoice.invoiceNumber}</td>
                            <td className="py-3.5 pr-4 text-neutral-400">{invoice.subscription.subscriptionNumber}</td>
                            <td className="py-3.5 pr-4 text-neutral-400">{formatDate(invoice.issueDate)}</td>
                            <td className="py-3.5 pr-4 tabular-nums text-neutral-300">{formatCurrency(invoice.amountDue)}</td>
                            <td className="py-3.5"><StatusPill value={invoice.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Surface>
            </div>
          </>
        )}
      </WorkspaceShell>
    </AccessGate>
  )
}
