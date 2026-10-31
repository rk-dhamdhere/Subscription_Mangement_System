'use client'

import { useEffect, useState } from 'react'
import { Boxes, PackageCheck } from 'lucide-react'
import { AccessGate } from '@/components/workspace/AccessGate'
import {
  ErrorMessage,
  LoadingMessage,
  StatusPill,
  Surface,
  WorkspaceShell,
} from '@/components/workspace/WorkspaceShell'
import { apiClient } from '@/services/apiClient'
import { formatCurrency } from '@/lib/format'
import type { DiscountRule, Plan, Product, TaxRule } from '@/types/api'

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [taxRules, setTaxRules] = useState<TaxRule[]>([])
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      apiClient.get<Product[]>('/catalog/products'),
      apiClient.get<Plan[]>('/catalog/plans'),
      apiClient.get<TaxRule[]>('/catalog/tax-rules'),
      apiClient.get<DiscountRule[]>('/catalog/discount-rules'),
    ])
      .then(([productList, planList, taxRuleList, discountRuleList]) => {
        if (!active) return
        setProducts(productList)
        setPlans(planList)
        setTaxRules(taxRuleList)
        setDiscountRules(discountRuleList)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load catalog data.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <AccessGate roles={['ADMIN']}>
      <WorkspaceShell
        title="Admin catalog"
        description="Review the products, variants, and subscription plans available across Brightloop."
      >
        {error && <ErrorMessage message={error} />}
        {loading ? (
          <LoadingMessage label="Loading product and plan catalog…" />
        ) : !error ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-[#101210]/90 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-300/[0.09] text-emerald-200"><Boxes className="size-5" /></span>
                <div><p className="text-xs text-neutral-500">Products</p><p className="mt-1 text-2xl font-medium">{products.length}</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-[#101210]/90 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-300/[0.09] text-emerald-200"><PackageCheck className="size-5" /></span>
                <div><p className="text-xs text-neutral-500">Plans</p><p className="mt-1 text-2xl font-medium">{plans.length}</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-[#101210]/90 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-300/[0.09] text-emerald-200"><PackageCheck className="size-5" /></span>
                <div><p className="text-xs text-neutral-500">Tax rules</p><p className="mt-1 text-2xl font-medium">{taxRules.length}</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-[#101210]/90 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-300/[0.09] text-emerald-200"><PackageCheck className="size-5" /></span>
                <div><p className="text-xs text-neutral-500">Discount rules</p><p className="mt-1 text-2xl font-medium">{discountRules.length}</p></div>
              </div>
            </div>

            <Surface title="Product catalog">
              {products.length === 0 ? <p className="text-sm text-neutral-500">No products found.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3 font-medium">Product</th><th className="pb-3 font-medium">Type</th><th className="pb-3 font-medium">Sales price</th><th className="pb-3 font-medium">Variants</th><th className="pb-3 font-medium">Status</th></tr></thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td className="py-3.5 pr-4"><p className="font-medium text-neutral-200">{product.name}</p>{product.notes && <p className="mt-1 max-w-[280px] truncate text-[10px] text-neutral-500">{product.notes}</p>}</td>
                          <td className="py-3.5 pr-4 text-neutral-400">{product.productType}</td>
                          <td className="py-3.5 pr-4 tabular-nums text-neutral-300">{formatCurrency(product.salesPrice)}</td>
                          <td className="py-3.5 pr-4 text-neutral-400">{product.variants.filter((variant) => variant.isActive).length}</td>
                          <td className="py-3.5"><StatusPill value={product.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Surface>

            <Surface title="Subscription plans">
              {plans.length === 0 ? <p className="text-sm text-neutral-500">No plans found.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3 font-medium">Plan</th><th className="pb-3 font-medium">Billing cycle</th><th className="pb-3 font-medium">Price</th><th className="pb-3 font-medium">Minimum quantity</th><th className="pb-3 font-medium">Status</th></tr></thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {plans.map((plan) => (
                        <tr key={plan.id}>
                          <td className="py-3.5 pr-4 font-medium text-neutral-200">{plan.name}</td>
                          <td className="py-3.5 pr-4 text-neutral-400">{plan.billingPeriod}</td>
                          <td className="py-3.5 pr-4 tabular-nums text-neutral-300">{formatCurrency(plan.price)}</td>
                          <td className="py-3.5 pr-4 text-neutral-400">{plan.minQuantity}</td>
                          <td className="py-3.5"><StatusPill value={plan.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Surface>

            <div className="grid gap-5 xl:grid-cols-2">
              <Surface title="Tax rules">
                {taxRules.length === 0 ? <p className="text-sm text-neutral-500">No tax rules found.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3 font-medium">Rule</th><th className="pb-3 font-medium">Rate</th><th className="pb-3 font-medium">Effective from</th><th className="pb-3 font-medium">Status</th></tr></thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {taxRules.map((rule) => (
                          <tr key={rule.id}>
                            <td className="py-3.5 pr-3 font-medium text-neutral-200">{rule.name}</td>
                            <td className="py-3.5 pr-3 text-neutral-300">{rule.ratePercentage}%</td>
                            <td className="py-3.5 pr-3 text-neutral-400">{rule.effectiveFrom.slice(0, 10)}</td>
                            <td className="py-3.5"><StatusPill value={rule.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Surface>

              <Surface title="Discount rules">
                {discountRules.length === 0 ? <p className="text-sm text-neutral-500">No discount rules found.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3 font-medium">Code</th><th className="pb-3 font-medium">Discount</th><th className="pb-3 font-medium">Uses</th><th className="pb-3 font-medium">Status</th></tr></thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {discountRules.map((rule) => (
                          <tr key={rule.id}>
                            <td className="py-3.5 pr-3 font-medium text-neutral-200">{rule.code}</td>
                            <td className="py-3.5 pr-3 text-neutral-300">{rule.discountType === 'PERCENTAGE' ? `${rule.value}%` : formatCurrency(rule.value)}</td>
                            <td className="py-3.5 pr-3 text-neutral-400">{rule.currentUses}{rule.maxUses === null ? '' : ` / ${rule.maxUses}`}</td>
                            <td className="py-3.5"><StatusPill value={rule.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Surface>
            </div>
            <p className="px-1 text-[11px] text-neutral-500">Staff management is not exposed by the current backend API.</p>
          </div>
        ) : null}
      </WorkspaceShell>
    </AccessGate>
  )
}
