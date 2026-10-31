'use client'

import { ArrowRight, CheckCircle2 } from 'lucide-react'
import type { SubscriptionStatus } from '@/types/api'
import { StatusPill } from '@/components/workspace/WorkspaceShell'

const STEPS: SubscriptionStatus[] = [
  'DRAFT',
  'QUOTATION',
  'CONFIRMED',
  'ACTIVE',
  'CLOSED',
]

const NEXT_STATUS: Partial<Record<SubscriptionStatus, SubscriptionStatus>> = {
  DRAFT: 'QUOTATION',
  QUOTATION: 'CONFIRMED',
  CONFIRMED: 'ACTIVE',
  ACTIVE: 'CLOSED',
}

const ACTION_LABEL: Record<SubscriptionStatus, string> = {
  DRAFT: 'Generate quotation',
  QUOTATION: 'Confirm quotation',
  CONFIRMED: 'Activate subscription',
  ACTIVE: 'Close subscription',
  CLOSED: 'Closed',
}

export function StateMachineBar({
  currentStatus,
  onTransition,
  isLoading,
  isStaffOrAdmin,
}: {
  currentStatus: SubscriptionStatus
  onTransition: (targetStatus: SubscriptionStatus) => void
  isLoading: boolean
  isStaffOrAdmin: boolean
}) {
  const currentIndex = STEPS.indexOf(currentStatus)
  const nextStatus = NEXT_STATUS[currentStatus]

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-300">Subscription lifecycle</p>
        <StatusPill value={currentStatus} />
      </div>
      <ol className="flex items-center" aria-label="Subscription status lifecycle">
        {STEPS.map((step, index) => {
          const completed = index < currentIndex
          const current = index === currentIndex
          return (
            <li key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div className="flex items-center gap-1.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                    completed
                      ? 'bg-emerald-400 text-[#07120d]'
                      : current
                        ? 'bg-emerald-300/15 text-emerald-200 ring-1 ring-emerald-300/45'
                        : 'bg-white/[0.07] text-neutral-500'
                  }`}
                >
                  {completed ? <CheckCircle2 className="size-4" /> : index + 1}
                </span>
                <span className={`hidden text-[10px] sm:inline ${current ? 'text-emerald-200' : 'text-neutral-500'}`}>
                  {step}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <span className={`mx-2 h-px flex-1 ${completed ? 'bg-emerald-400/60' : 'bg-white/10'}`} />
              )}
            </li>
          )
        })}
      </ol>
      {isStaffOrAdmin && nextStatus && (
        <div className="mt-4 flex justify-end border-t border-white/[0.07] pt-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onTransition(nextStatus)}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition disabled:cursor-wait disabled:opacity-50 ${
              nextStatus === 'CLOSED'
                ? 'border border-rose-300/20 bg-rose-400/[0.08] text-rose-200 hover:bg-rose-400/[0.15]'
                : 'bg-emerald-400 text-[#07120d] hover:bg-emerald-300'
            }`}
          >
            {isLoading ? 'Updating…' : ACTION_LABEL[currentStatus]}
            {!isLoading && <ArrowRight className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
