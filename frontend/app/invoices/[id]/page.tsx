'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AccessGate } from '@/components/workspace/AccessGate'
import {
  ErrorMessage,
  LoadingMessage,
  StatusPill,
  WorkspaceShell,
} from '@/components/workspace/WorkspaceShell'
import { formatCurrency, formatDate } from '@/lib/format'
import { apiClient } from '@/services/apiClient'
import { getHomeRoute, useAuthStore } from '@/store/useAuthStore'
import type { Invoice } from '@/types/api'

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiClient.get<Invoice>(`/invoices/${id}`)
      .then((data) => {
        if (active) setInvoice(data)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load invoice.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  return (
    <AccessGate roles={['ADMIN', 'CUSTOMER']} subRoles={['FINANCE']}>
      <WorkspaceShell
        title={invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}
        description="Review the invoice details and print a customer-ready copy."
      >
        {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
        {loading ? <LoadingMessage label="Loading invoice…" /> : invoice && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <a href={user ? getHomeRoute(user) : '/login'} className="text-xs text-neutral-400 hover:text-white">Back to workspace</a>
              <button type="button" onClick={() => window.print()} className="rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold text-[#07120d] hover:bg-emerald-200">
                Print invoice
              </button>
            </div>
            <article id="invoice-paper" className="rounded-2xl border border-white/[0.09] bg-[#101210] p-6 sm:p-9">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Twin</p>
                  <h2 className="mt-4 text-2xl font-medium text-white">Invoice</h2>
                  <p className="mt-1 text-sm text-neutral-400">{invoice.invoiceNumber}</p>
                </div>
                <StatusPill value={invoice.status} />
              </div>
              <div className="mt-8 grid gap-5 border-y border-white/[0.08] py-5 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-neutral-500">Bill to</p><p className="mt-1 text-neutral-100">{invoice.customer.firstName} {invoice.customer.lastName}</p><p className="mt-1 text-xs text-neutral-400">{invoice.customer.email}</p></div>
                <div><p className="text-xs text-neutral-500">Issued</p><p className="mt-1 text-neutral-100">{formatDate(invoice.issueDate)}</p><p className="mt-1 text-xs text-neutral-400">Due {formatDate(invoice.dueDate)}</p></div>
                <div><p className="text-xs text-neutral-500">Subscription</p><p className="mt-1 text-neutral-100">{invoice.subscription.subscriptionNumber}</p></div>
              </div>
              <div className="mt-7 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                    <tr><th className="pb-3 font-medium">Description</th><th className="pb-3 text-right font-medium">Qty</th><th className="pb-3 text-right font-medium">Unit price</th><th className="pb-3 text-right font-medium">Line total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 pr-4 text-neutral-200">{item.description}</td>
                        <td className="py-3 text-right text-neutral-400">{item.quantity}</td>
                        <td className="py-3 text-right text-neutral-400">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 text-right text-neutral-200">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="ml-auto mt-7 grid max-w-sm grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <dt className="text-neutral-500">Subtotal</dt><dd className="text-right text-neutral-200">{formatCurrency(invoice.subtotalAmount)}</dd>
                <dt className="text-neutral-500">Tax</dt><dd className="text-right text-neutral-200">{formatCurrency(invoice.taxAmount)}</dd>
                <dt className="text-neutral-500">Discount</dt><dd className="text-right text-neutral-200">−{formatCurrency(invoice.discountAmount)}</dd>
                <dt className="border-t border-white/[0.08] pt-3 font-medium text-white">Total</dt><dd className="border-t border-white/[0.08] pt-3 text-right font-medium text-white">{formatCurrency(invoice.totalAmount)}</dd>
                <dt className="text-neutral-500">Paid</dt><dd className="text-right text-neutral-400">{formatCurrency(invoice.paidAmount)}</dd>
                <dt className="font-medium text-emerald-100">Balance due</dt><dd className="text-right font-medium text-emerald-100">{formatCurrency(invoice.amountDue)}</dd>
              </dl>
            </article>
          </>
        )}
      </WorkspaceShell>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-paper, #invoice-paper * { visibility: visible !important; }
          #invoice-paper {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            border: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          #invoice-paper * { color: black !important; }
        }
      `}</style>
    </AccessGate>
  )
}
