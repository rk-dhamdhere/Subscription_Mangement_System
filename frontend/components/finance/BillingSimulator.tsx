'use client'

import { useState } from 'react'
import { CalendarDays, Eye, Play } from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import { formatCurrency, formatDate, localDateInputValue } from '@/lib/format'
import type { BillingPreview, BillingRun, Subscription } from '@/types/api'
import { ErrorMessage, Surface, StatusPill } from '@/components/workspace/WorkspaceShell'

export function BillingSimulator({
  onRunComplete,
}: {
  onRunComplete?: () => void
}) {
  const [targetDate, setTargetDate] = useState(localDateInputValue())
  const [preview, setPreview] = useState<BillingPreview | null>(null)
  const [run, setRun] = useState<BillingRun | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  async function previewBilling() {
    if (!targetDate) {
      setError('Choose a target billing date.')
      return
    }
    setLoadingPreview(true)
    setError('')
    setRun(null)
    try {
      const subscriptions = await apiClient.get<Subscription[]>('/subscriptions')
      setPreview(calculatePreview(subscriptions, targetDate))
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setLoadingPreview(false)
    }
  }

  async function executeBilling() {
    if (!targetDate) {
      setError('Choose a target billing date.')
      return
    }
    const confirmed = window.confirm(
      `Run billing for ${targetDate}? This operation can create invoices and advance subscription billing dates.`,
    )
    if (!confirmed) return

    setRunning(true)
    setError('')
    setRun(null)
    try {
      const result = await apiClient.post<BillingRun>('/billing-runs', {
        billingDate: targetDate,
      })
      setRun(result)
      setPreview(null)
      onRunComplete?.()
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setRunning(false)
    }
  }

  return (
    <Surface title="Automated billing day engine">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="flex flex-col gap-2 text-xs text-neutral-400">
          Target billing date
          <span className="flex h-10 w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-neutral-200">
            <CalendarDays className="size-4 text-emerald-300" />
            <input
              type="date"
              value={targetDate}
              onChange={(event) => {
                setTargetDate(event.target.value)
                setPreview(null)
                setRun(null)
              }}
              className="bg-transparent text-sm outline-none [color-scheme:dark]"
            />
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={previewBilling}
            disabled={loadingPreview || running}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs text-neutral-200 transition hover:border-emerald-300/40 hover:text-emerald-100 disabled:opacity-50"
          >
            <Eye className="size-3.5" />
            {loadingPreview ? 'Previewing…' : 'Preview billing'}
          </button>
          <button
            type="button"
            onClick={executeBilling}
            disabled={running || loadingPreview}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-400 px-4 text-xs font-semibold text-[#07120d] transition hover:bg-emerald-300 disabled:opacity-50"
          >
            <Play className="size-3.5" />
            {running ? 'Running…' : 'Execute run'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-5 text-neutral-500">
        Preview is an estimate calculated from active subscriptions. The backend currently exposes the execution endpoint only; its billing engine determines final skips and invoice totals.
      </p>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {preview && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
          <PreviewMetric label="Subscriptions due" value={preview.dueCount.toString()} />
          <PreviewMetric label="Estimated invoices" value={preview.invoicesToCreate.toString()} />
          <PreviewMetric label="Potential skips" value={preview.skippedCount.toString()} />
          <PreviewMetric label="Projected revenue" value={formatCurrency(preview.projectedTotal)} />
        </div>
      )}

      {run && (
        <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-100">Billing run completed</p>
              <p className="mt-1 text-xs text-neutral-400">
                {formatDate(run.billingDate)} · {run.candidateCount} candidates
              </p>
            </div>
            <StatusPill value={run.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PreviewMetric label="Invoices created" value={run.invoicedCount.toString()} />
            <PreviewMetric label="Skipped" value={run.skippedCount.toString()} />
            <PreviewMetric label="Run date" value={run.billingDate.slice(0, 10)} />
          </div>
        </div>
      )}
    </Surface>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#080908]/60 p-4">
      <p className="text-[10px] text-neutral-500">{label}</p>
      <p className="mt-2 text-lg font-medium tracking-[-0.04em] text-white">{value}</p>
    </div>
  )
}

function calculatePreview(
  subscriptions: Subscription[],
  targetDate: string,
): BillingPreview {
  const due = subscriptions.filter(
    (subscription) =>
      subscription.status === 'ACTIVE' &&
      subscription.nextBillingDate.slice(0, 10) <= targetDate,
  )
  const eligible = due.filter((subscription) => {
    const cycleDate = subscription.nextBillingDate.slice(0, 10)
    const subscriptionExpired = cycleDate > subscription.expiryDate.slice(0, 10)
    const planExpired =
      subscription.plan.endDate !== null &&
      cycleDate > subscription.plan.endDate.slice(0, 10)
    return !subscriptionExpired && !planExpired
  })

  return {
    dueCount: due.length,
    invoicesToCreate: eligible.length,
    skippedCount: due.length - eligible.length,
    projectedTotal: eligible.reduce(
      (total, subscription) => total + Number(subscription.totalAmount),
      0,
    ),
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'The billing request failed.'
}
