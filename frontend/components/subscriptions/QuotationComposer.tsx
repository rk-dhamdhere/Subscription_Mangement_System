'use client'

import { FormEvent, useState } from 'react'
import { ErrorMessage, Surface } from '@/components/workspace/WorkspaceShell'
import { localDateInputValue } from '@/lib/format'
import { apiClient } from '@/services/apiClient'
import type { CustomerSummary, QuotationTemplate, Subscription } from '@/types/api'

const fieldClass =
  'mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-neutral-100 outline-none focus:border-emerald-300/40'

export function QuotationComposer({
  customers,
  templates,
  onCreated,
}: {
  customers: CustomerSummary[]
  templates: QuotationTemplate[]
  onCreated: (subscription: Subscription) => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [startDate, setStartDate] = useState(localDateInputValue())
  const [expiryDate, setExpiryDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('NET_30')
  const [discountCode, setDiscountCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedTemplate = templates.find((template) => template.id === templateId)

  function updateDates(nextStartDate: string, selectedTemplateId = templateId) {
    setStartDate(nextStartDate)
    const template = templates.find((item) => item.id === selectedTemplateId)
    if (!template || !nextStartDate) return
    const date = new Date(`${nextStartDate}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() + template.validityDays)
    setExpiryDate(date.toISOString().slice(0, 10))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const quotation = await apiClient.post<Subscription>('/subscriptions/from-template', {
        customerId,
        templateId,
        startDate,
        expiryDate,
        paymentTerms,
        discountCode: discountCode.trim() || undefined,
      })
      onCreated(quotation)
      setMessage(`Quotation ${quotation.subscriptionNumber} created.`)
      setDiscountCode('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create quotation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Surface title="Create a customer quotation">
      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
      {message && <p role="status" className="mb-4 text-xs text-emerald-200">{message}</p>}
      {!customers.length || !templates.length ? (
        <p className="text-sm text-neutral-500">
          {customers.length ? 'Create an active quotation template in Admin first.' : 'No customer accounts are available yet.'}
        </p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-xs text-neutral-400">
            Customer
            <select required value={customerId || customers[0]?.id || ''} onChange={(event) => setCustomerId(event.target.value)} className={fieldClass}>
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.profile?.legalName || `${customer.firstName} ${customer.lastName}`} · {customer.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-neutral-400">
            Quotation template
            <select
              required
              value={templateId}
              onChange={(event) => {
                setTemplateId(event.target.value)
                updateDates(startDate, event.target.value)
              }}
              className={fieldClass}
            >
              <option value="">Select a template</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-neutral-400">
            Start date
            <input type="date" required value={startDate} onChange={(event) => updateDates(event.target.value)} className={`${fieldClass} [color-scheme:dark]`} />
          </label>
          <label className="text-xs text-neutral-400">
            Offer expires
            <input type="date" required min={startDate} value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className={`${fieldClass} [color-scheme:dark]`} />
          </label>
          <label className="text-xs text-neutral-400">
            Payment terms
            <select value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} className={fieldClass}>
              <option value="DUE_ON_RECEIPT">Due on receipt</option>
              <option value="NET_15">Net 15</option>
              <option value="NET_30">Net 30</option>
              <option value="NET_60">Net 60</option>
            </select>
          </label>
          <label className="text-xs text-neutral-400">
            Discount code (optional)
            <input maxLength={50} value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} className={fieldClass} placeholder="SEAT10" />
          </label>
          {selectedTemplate && (
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-400 sm:col-span-2 xl:col-span-3">
              {selectedTemplate.plan.name} · {selectedTemplate.plan.billingPeriod.toLowerCase()} · valid for {selectedTemplate.validityDays} days
              <span className="ml-2 text-neutral-500">
                {selectedTemplate.items.map((item) => `${item.product.name}${item.variant ? ` / ${item.variant.name}` : ''} × ${item.quantity}`).join(', ')}
              </span>
            </div>
          )}
          <button type="submit" disabled={busy || !templateId} className="h-10 rounded-full bg-emerald-300 px-4 text-xs font-semibold text-[#07120d] transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-50">
            {busy ? 'Creating quotation…' : 'Create quotation'}
          </button>
        </form>
      )}
    </Surface>
  )
}
