'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, CircleDollarSign, Mail, Printer } from 'lucide-react'
import { AccessGate } from '@/components/workspace/AccessGate'
import {
  ErrorMessage,
  LoadingMessage,
  MetricCard,
  StatusPill,
  Surface,
  WorkspaceShell,
} from '@/components/workspace/WorkspaceShell'
import { BillingSimulator } from '@/components/finance/BillingSimulator'
import { apiClient } from '@/services/apiClient'
import { formatCurrency, formatDate, localDateInputValue } from '@/lib/format'
import type {
  FinanceDashboard,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  ReceivablesAging,
} from '@/types/api'

const paymentMethods: PaymentMethod[] = ['CREDIT_CARD', 'BANK_TRANSFER', 'CASH', 'CHECK']

export default function FinanceWorkspacePage() {
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [aging, setAging] = useState<ReceivablesAging | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [paymentDate, setPaymentDate] = useState(localDateInputValue())
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState('')
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [invoiceActionId, setInvoiceActionId] = useState<string | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')

  const refresh = useCallback(async () => {
    const [summary, invoiceList, paymentList, agingReport] = await Promise.all([
      apiClient.get<FinanceDashboard>('/finance/dashboard'),
      apiClient.get<Invoice[]>('/invoices'),
      apiClient.get<Payment[]>('/payments'),
      apiClient.get<ReceivablesAging>('/finance/receivables/aging'),
    ])
    setDashboard(summary)
    setInvoices(invoiceList)
    setPayments(paymentList)
    setAging(agingReport)
    setSelectedInvoiceId((current) =>
      invoiceList.some((invoice) => invoice.id === current)
        ? current
        : invoiceList.find((invoice) => invoice.status === 'CONFIRMED' && Number(invoice.amountDue) > 0)?.id ?? '',
    )
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      apiClient.get<FinanceDashboard>('/finance/dashboard'),
      apiClient.get<Invoice[]>('/invoices'),
      apiClient.get<Payment[]>('/payments'),
      apiClient.get<ReceivablesAging>('/finance/receivables/aging'),
    ])
      .then(([summary, invoiceList, paymentList, agingReport]) => {
        if (!active) return
        setDashboard(summary)
        setInvoices(invoiceList)
        setPayments(paymentList)
        setAging(agingReport)
        setSelectedInvoiceId(
          invoiceList.find((invoice) => invoice.status === 'CONFIRMED' && Number(invoice.amountDue) > 0)?.id ?? '',
        )
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load finance data.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId),
    [invoices, selectedInvoiceId],
  )
  const visibleInvoices = useMemo(() => {
    const term = invoiceSearch.trim().toLocaleLowerCase()
    return invoices.filter((invoice) => {
      const matchesStatus = invoiceStatusFilter === 'ALL' || invoice.status === invoiceStatusFilter
      const matchesSearch = !term || [
        invoice.invoiceNumber,
        invoice.customer.firstName,
        invoice.customer.lastName,
        invoice.customer.email,
      ].some((value) => value.toLocaleLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [invoices, invoiceSearch, invoiceStatusFilter])

  async function confirmInvoice(invoiceId: string) {
    setError('')
    try {
      await apiClient.patch<Invoice>(`/invoices/${invoiceId}/status`, { status: 'CONFIRMED' })
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to confirm invoice.')
    }
  }

  async function cancelInvoice(invoiceId: string) {
    if (!window.confirm('Cancel this draft invoice?')) return
    setInvoiceActionId(invoiceId)
    setError('')
    setInvoiceMessage('')
    try {
      await apiClient.patch<Invoice>(`/invoices/${invoiceId}/status`, { status: 'CANCELLED' })
      setInvoiceMessage('Draft invoice cancelled.')
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to cancel invoice.')
    } finally {
      setInvoiceActionId(null)
    }
  }

  async function emailInvoice(invoiceId: string) {
    setInvoiceActionId(invoiceId)
    setError('')
    setInvoiceMessage('')
    try {
      const result = await apiClient.post<{ message: string }>(`/invoices/${invoiceId}/email`, {})
      setInvoiceMessage(result.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to email invoice.')
    } finally {
      setInvoiceActionId(null)
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPaymentMessage('')
    if (!selectedInvoice) {
      setError('Select an invoice before recording a payment.')
      return
    }
    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(selectedInvoice.amountDue)) {
      setError('Enter an amount greater than zero and no more than the selected invoice balance.')
      return
    }
    setRecordingPayment(true)
    try {
      await apiClient.post<Payment>('/payments', {
        customerId: selectedInvoice.customerId,
        paymentReference,
        paymentMethod,
        receivedAt: new Date(`${paymentDate}T12:00:00`).toISOString(),
        amount,
        notes: paymentNotes.trim() || undefined,
        allocations: [{ invoiceId: selectedInvoice.id, amount }],
      })
      setPaymentMessage('Payment recorded successfully.')
      setPaymentReference('')
      setPaymentAmount('')
      setPaymentNotes('')
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to record payment.')
    } finally {
      setRecordingPayment(false)
    }
  }

  return (
    <AccessGate roles={['STAFF', 'ADMIN']} subRoles={['FINANCE']}>
      <WorkspaceShell
        title="Finance workspace"
        description="Monitor receivables, confirm invoices, and run subscription billing."
      >
        {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
        {loading ? <LoadingMessage label="Loading finance dashboard…" /> : (
          <>
            {dashboard && (
              <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Active subscriptions" value={dashboard.activeSubscriptions.toLocaleString()} />
                <MetricCard label="Outstanding invoices" value={dashboard.outstandingInvoices.toLocaleString()} detail={`${formatCurrency(dashboard.outstandingAmount)} open balance`} />
                <MetricCard label="Overdue balance" value={formatCurrency(dashboard.overdueAmount)} detail={`${dashboard.overdueInvoices} overdue invoices`} />
                <MetricCard label="Payments this month" value={formatCurrency(dashboard.paymentsReceivedThisMonth)} detail={`As of ${formatDate(dashboard.asOf)}`} />
              </div>
            )}

            <div className="space-y-5">
              <BillingSimulator onRunComplete={() => { void refresh().catch((refreshError: unknown) => setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh billing data.')) }} />

              {aging && (
                <Surface title="Receivables aging" action={<span className="text-[10px] text-neutral-500">As of {formatDate(aging.asOf)}</span>}>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {aging.buckets.map((bucket) => (
                      <div key={bucket.bucket} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">{bucket.bucket.replaceAll('-', ' ')}</p>
                        <p className="mt-2 text-lg font-medium text-neutral-100">{formatCurrency(bucket.amount)}</p>
                        <p className="mt-1 text-[10px] text-neutral-500">{bucket.invoiceCount} invoices</p>
                      </div>
                    ))}
                  </div>
                </Surface>
              )}

              <Surface title="Invoices">
                {invoiceMessage && <p role="status" className="mb-4 text-xs text-emerald-200">{invoiceMessage}</p>}
                <div className="mb-4 flex flex-wrap gap-3">
                  <input aria-label="Search invoices" value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder="Search invoice or customer" className="h-9 min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#080908] px-3 text-xs text-white outline-none focus:border-emerald-300/40" />
                  <select aria-label="Filter by invoice status" value={invoiceStatusFilter} onChange={(event) => setInvoiceStatusFilter(event.target.value as InvoiceStatus | 'ALL')} className="h-9 rounded-lg border border-white/10 bg-[#080908] px-3 text-xs text-neutral-200">
                    <option value="ALL">All statuses</option>
                    {(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'] as const).map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                {visibleInvoices.length === 0 ? <p className="text-sm text-neutral-500">No invoices match these filters.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3 font-medium">Invoice</th><th className="pb-3 font-medium">Customer</th><th className="pb-3 font-medium">Issue date</th><th className="pb-3 font-medium">Due</th><th className="pb-3 font-medium">Balance</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Action</th></tr></thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {visibleInvoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="py-3.5 pr-4 font-medium text-neutral-200">{invoice.invoiceNumber}</td>
                            <td className="py-3.5 pr-4 text-neutral-400">{invoice.customer.firstName} {invoice.customer.lastName}</td>
                            <td className="py-3.5 pr-4 text-neutral-400">{formatDate(invoice.issueDate)}</td>
                            <td className="py-3.5 pr-4 text-neutral-400">{formatDate(invoice.dueDate)}</td>
                            <td className="py-3.5 pr-4 tabular-nums text-neutral-300">{formatCurrency(invoice.amountDue)}</td>
                            <td className="py-3.5 pr-4"><StatusPill value={invoice.status} /></td>
                            <td className="py-3.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <a href={`/invoices/${invoice.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] text-neutral-300 hover:bg-white/[0.05]">
                                  <Printer className="size-3" /> View / print
                                </a>
                                {invoice.status === 'DRAFT' && (
                                  <>
                                    <button type="button" disabled={invoiceActionId !== null} onClick={() => void confirmInvoice(invoice.id)} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 px-3 py-1.5 text-[10px] text-emerald-200 transition hover:bg-emerald-300/[0.08] disabled:opacity-50">
                                      <ArrowDownToLine className="size-3" /> Confirm
                                    </button>
                                    <button type="button" disabled={invoiceActionId !== null} onClick={() => void cancelInvoice(invoice.id)} className="rounded-full border border-rose-300/20 px-3 py-1.5 text-[10px] text-rose-200 hover:bg-rose-300/[0.06] disabled:opacity-50">
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {(invoice.status === 'CONFIRMED' || invoice.status === 'PAID') && (
                                  <button type="button" disabled={invoiceActionId !== null} onClick={() => void emailInvoice(invoice.id)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] text-neutral-300 hover:bg-white/[0.05] disabled:opacity-50">
                                    <Mail className="size-3" /> Email
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Surface>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
                <Surface title="Record a payment" action={<CircleDollarSign className="size-4 text-emerald-300" />}>
                  <form onSubmit={recordPayment} className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs text-neutral-400 sm:col-span-2">
                      Open invoice
                      <select required value={selectedInvoiceId} onChange={(event) => {
                        setSelectedInvoiceId(event.target.value)
                        setPaymentAmount('')
                      }} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-neutral-200 outline-none focus:border-emerald-300/40">
                        <option value="">Select a confirmed invoice</option>
                        {invoices.filter((invoice) => invoice.status === 'CONFIRMED' && Number(invoice.amountDue) > 0).map((invoice) => (
                          <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} — {invoice.customer.firstName} {invoice.customer.lastName} ({formatCurrency(invoice.amountDue)} due)</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-neutral-400">
                      Payment reference
                      <input required maxLength={255} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-white outline-none focus:border-emerald-300/40" />
                    </label>
                    <label className="text-xs text-neutral-400">
                      Payment method
                      <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-neutral-200 outline-none focus:border-emerald-300/40">
                        {paymentMethods.map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-neutral-400">
                      Received date
                      <input type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-neutral-200 outline-none [color-scheme:dark] focus:border-emerald-300/40" />
                    </label>
                    <label className="text-xs text-neutral-400">
                      Amount
                      <input type="number" required min="0.01" max={selectedInvoice?.amountDue} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-white outline-none focus:border-emerald-300/40" />
                    </label>
                    <label className="text-xs text-neutral-400 sm:col-span-2">
                      Note (optional)
                      <textarea maxLength={2000} value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-[#080908] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40" />
                    </label>
                    {paymentMessage && <p role="status" className="text-xs text-emerald-200 sm:col-span-2">{paymentMessage}</p>}
                    <button type="submit" disabled={recordingPayment || !selectedInvoice} className="h-10 rounded-full bg-emerald-400 px-4 text-xs font-semibold text-[#07120d] transition hover:bg-emerald-300 disabled:opacity-50 sm:col-span-2">
                      {recordingPayment ? 'Recording…' : 'Record payment'}
                    </button>
                  </form>
                </Surface>

                <Surface title="Recent payment activity">
                  {payments.length === 0 ? <p className="text-sm text-neutral-500">No payments recorded.</p> : (
                    <ul className="divide-y divide-white/[0.06]">
                      {payments.slice(0, 6).map((payment) => (
                        <li key={payment.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-neutral-200">{payment.paymentReference}</p>
                            <p className="mt-1 text-[10px] text-neutral-500">{payment.paymentMethod.replaceAll('_', ' ')} · {formatDate(payment.receivedAt)}</p>
                            {payment.notes && <p className="mt-1 truncate text-[10px] text-neutral-600">{payment.notes}</p>}
                          </div>
                          <p className="shrink-0 text-xs tabular-nums text-emerald-200">{formatCurrency(payment.amount)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Surface>
              </div>
            </div>
          </>
        )}
      </WorkspaceShell>
    </AccessGate>
  )
}
