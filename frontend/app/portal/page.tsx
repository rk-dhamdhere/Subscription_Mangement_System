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
import type { Invoice, Payment, RazorpayOrder, Subscription, SubscriptionStatus } from '@/types/api'

interface RazorpaySuccess {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayFailure {
  error?: { description?: string }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string }
  theme: { color: string }
  handler: (response: RazorpaySuccess) => void
  modal: { ondismiss: () => void }
}

interface RazorpayCheckout {
  open: () => void
  on: (event: 'payment.failed', handler: (response: RazorpayFailure) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout
  }
}

export default function CustomerPortalPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checkoutInvoiceId, setCheckoutInvoiceId] = useState<string | null>(null)
  const [subscriptionActionId, setSubscriptionActionId] = useState<string | null>(null)

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

  async function refreshInvoices() {
    setInvoices(await apiClient.get<Invoice[]>('/invoices'))
  }

  async function changeSubscriptionStatus(
    subscription: Subscription,
    status: SubscriptionStatus,
  ) {
    if (
      status === 'CLOSED' &&
      !window.confirm(`Close ${subscription.subscriptionNumber}? This cannot be undone.`)
    ) return
    setSubscriptionActionId(subscription.id)
    setError('')
    setNotice('')
    try {
      const updated = await apiClient.patch<Subscription>(
        `/subscriptions/${subscription.id}/status`,
        { status },
      )
      setSubscriptions((current) => current.map((item) =>
        item.id === updated.id ? { ...item, status: updated.status } : item,
      ))
      setNotice(`${subscription.subscriptionNumber} is now ${updated.status.toLowerCase()}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update subscription.')
    } finally {
      setSubscriptionActionId(null)
    }
  }

  async function renewSubscription(subscription: Subscription) {
    setSubscriptionActionId(subscription.id)
    setError('')
    setNotice('')
    try {
      const renewed = await apiClient.post<Subscription>(
        `/subscriptions/${subscription.id}/renew`,
        {},
      )
      setSubscriptions((current) => [renewed, ...current])
      setNotice(`Renewal draft ${renewed.subscriptionNumber} is ready.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to renew subscription.')
    } finally {
      setSubscriptionActionId(null)
    }
  }

  async function startCheckout(invoice: Invoice) {
    setCheckoutInvoiceId(invoice.id)
    setError('')
    setNotice('')
    try {
      const order = await apiClient.post<RazorpayOrder>('/payments/razorpay/orders', {
        invoiceId: invoice.id,
      })
      const Razorpay = await loadRazorpay()
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Twin',
        description: `Invoice ${order.invoiceNumber}`,
        order_id: order.orderId,
        prefill: {
          name: invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : '',
          email: invoice.customer?.email ?? '',
        },
        theme: { color: '#34d399' },
        handler: (response) => {
          void apiClient.post<Payment>('/payments/razorpay/verify', response)
            .then(refreshInvoices)
            .then(() => setNotice(`Payment received for ${order.invoiceNumber}.`))
            .catch((requestError: unknown) => {
              setError(requestError instanceof Error ? requestError.message : 'Payment verification failed.')
            })
            .finally(() => setCheckoutInvoiceId(null))
        },
        modal: {
          ondismiss: () => setCheckoutInvoiceId(null),
        },
      })
      checkout.on('payment.failed', (failure) => {
        setError(failure.error?.description || 'Payment was not completed. You can try again.')
        setCheckoutInvoiceId(null)
      })
      checkout.open()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to start checkout.')
      setCheckoutInvoiceId(null)
    }
  }

  const openBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.amountDue), 0)
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'ACTIVE').length

  return (
    <AccessGate roles={['CUSTOMER']}>
      <WorkspaceShell
        title="Your subscription portal"
        description="A clear view of your active services, upcoming billing, and invoice history."
      >
        {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
        {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm text-emerald-100">{notice}</p>}
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
                        {(subscription.status === 'ACTIVE' || subscription.status === 'PAUSED' || subscription.status === 'CLOSED') && (
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                            {subscription.status === 'ACTIVE' && subscription.plan.canPause && (
                              <SubscriptionAction
                                disabled={subscriptionActionId !== null}
                                onClick={() => void changeSubscriptionStatus(subscription, 'PAUSED')}
                              >
                                Pause
                              </SubscriptionAction>
                            )}
                            {subscription.status === 'PAUSED' && subscription.plan.canPause && (
                              <SubscriptionAction
                                disabled={subscriptionActionId !== null}
                                onClick={() => void changeSubscriptionStatus(subscription, 'ACTIVE')}
                              >
                                Resume
                              </SubscriptionAction>
                            )}
                            {(subscription.status === 'ACTIVE' || subscription.status === 'PAUSED') && subscription.plan.canCloseEarly && (
                              <SubscriptionAction
                                disabled={subscriptionActionId !== null}
                                destructive
                                onClick={() => void changeSubscriptionStatus(subscription, 'CLOSED')}
                              >
                                Close early
                              </SubscriptionAction>
                            )}
                            {subscription.status === 'CLOSED' && subscription.plan.canRenew && (
                              <SubscriptionAction
                                disabled={subscriptionActionId !== null}
                                onClick={() => void renewSubscription(subscription)}
                              >
                                {subscriptionActionId === subscription.id ? 'Preparing…' : 'Renew'}
                              </SubscriptionAction>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Surface>

              <Surface title="Invoice history">
                {invoices.length === 0 ? <p className="text-sm text-neutral-500">No invoices found.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3 font-medium">Invoice</th><th className="pb-3 font-medium">Subscription</th><th className="pb-3 font-medium">Issued</th><th className="pb-3 font-medium">Amount due</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Action</th></tr></thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="py-3.5 pr-4 font-medium text-neutral-200">{invoice.invoiceNumber}</td>
                            <td className="py-3.5 pr-4 text-neutral-400">{invoice.subscription.subscriptionNumber}</td>
                            <td className="py-3.5 pr-4 text-neutral-400">{formatDate(invoice.issueDate)}</td>
                            <td className="py-3.5 pr-4 tabular-nums text-neutral-300">{formatCurrency(invoice.amountDue)}</td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <StatusPill value={invoice.status} />
                                {invoice.status === 'CONFIRMED' && Number(invoice.amountDue) > 0 && (
                                  <button
                                    type="button"
                                    disabled={checkoutInvoiceId !== null}
                                    onClick={() => void startCheckout(invoice)}
                                    className="rounded-full bg-emerald-300 px-3 py-1.5 text-[10px] font-semibold text-[#07120d] transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-50"
                                  >
                                    {checkoutInvoiceId === invoice.id ? 'Opening…' : 'Pay now'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5">
                              <a href={`/invoices/${invoice.id}`} className="text-[10px] text-neutral-300 underline decoration-white/20 underline-offset-4 hover:text-emerald-200">
                                View / print
                              </a>
                            </td>
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

function SubscriptionAction({
  disabled,
  destructive = false,
  onClick,
  children,
}: {
  disabled: boolean
  destructive?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[10px] transition disabled:cursor-wait disabled:opacity-50 ${
        destructive
          ? 'border-rose-300/20 text-rose-200 hover:bg-rose-400/[0.08]'
          : 'border-emerald-300/20 text-emerald-100 hover:bg-emerald-300/[0.08]'
      }`}
    >
      {children}
    </button>
  )
}

function loadRazorpay(): Promise<NonNullable<Window['Razorpay']>> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  const currentScript = document.querySelector<HTMLScriptElement>(
    'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
  )
  if (currentScript?.dataset.loaded === 'true') {
    return window.Razorpay
      ? Promise.resolve(window.Razorpay)
      : Promise.reject(new Error('Razorpay Checkout did not initialize.'))
  }

  return new Promise((resolve, reject) => {
    const script = currentScript ?? document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      if (window.Razorpay) resolve(window.Razorpay)
      else reject(new Error('Razorpay Checkout did not initialize.'))
    }
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'))
    if (!currentScript) document.body.appendChild(script)
  })
}
