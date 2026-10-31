'use client'

import { FormEvent, useState } from 'react'
import { ErrorMessage, Surface } from '@/components/workspace/WorkspaceShell'
import { apiClient } from '@/services/apiClient'
import { localDateInputValue } from '@/lib/format'
import type {
  BillingFrequency,
  DiscountRule,
  Plan,
  Product,
  TaxRule,
} from '@/types/api'

const fieldClass =
  'mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#080908] px-3 text-sm text-neutral-100 outline-none focus:border-emerald-300/40'
const billingPeriods: BillingFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

export function CatalogManagement({
  products,
  plans,
  onCreated,
}: {
  products: Product[]
  plans: Plan[]
  onCreated: () => Promise<void>
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [variantProductId, setVariantProductId] = useState('')
  const [templateProductId, setTemplateProductId] = useState('')
  const [templatePlanId, setTemplatePlanId] = useState('')

  async function submit(
    event: FormEvent<HTMLFormElement>,
    key: string,
    action: (form: FormData) => Promise<void>,
    successMessage: string,
  ) {
    event.preventDefault()
    const formElement = event.currentTarget
    setBusy(key)
    setError('')
    setMessage('')
    try {
      await action(new FormData(event.currentTarget))
      await onCreated()
      formElement.reset()
      setMessage(successMessage)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save catalog changes.')
    } finally {
      setBusy('')
    }
  }

  async function createProduct(form: FormData) {
    await apiClient.post<Product>('/catalog/products', {
      name: text(form, 'name'),
      productType: text(form, 'productType'),
      salesPrice: number(form, 'salesPrice'),
      costPrice: number(form, 'costPrice'),
      notes: optionalText(form, 'notes'),
    })
  }

  async function createVariant(form: FormData) {
    const productId = text(form, 'productId')
    await apiClient.post('/catalog/products/' + productId + '/variants', {
      name: text(form, 'name'),
      priceExtra: number(form, 'priceExtra'),
    })
  }

  async function createPlan(form: FormData) {
    await apiClient.post<Plan>('/catalog/plans', {
      name: text(form, 'name'),
      billingPeriod: text(form, 'billingPeriod'),
      price: number(form, 'price'),
      minQuantity: number(form, 'minQuantity'),
      startDate: text(form, 'startDate'),
      endDate: optionalText(form, 'endDate') || undefined,
      autoClose: form.has('autoClose'),
      canPause: form.has('canPause'),
      canCloseEarly: form.has('canCloseEarly'),
      canRenew: form.has('canRenew'),
      isActive: true,
    })
  }

  async function createTaxRule(form: FormData) {
    await apiClient.post<TaxRule>('/catalog/tax-rules', {
      name: text(form, 'name'),
      ratePercentage: number(form, 'ratePercentage'),
      effectiveFrom: text(form, 'effectiveFrom'),
      effectiveUntil: optionalText(form, 'effectiveUntil') || undefined,
      isActive: true,
    })
  }

  async function createDiscountRule(form: FormData) {
    const maxUses = optionalText(form, 'maxUses')
    await apiClient.post<DiscountRule>('/catalog/discount-rules', {
      code: text(form, 'code').toUpperCase(),
      discountType: text(form, 'discountType'),
      value: number(form, 'value'),
      minPurchaseAmount: number(form, 'minPurchaseAmount'),
      minQuantity: number(form, 'minQuantity'),
      maxUses: maxUses ? Number(maxUses) : undefined,
      startDate: text(form, 'startDate'),
      endDate: text(form, 'endDate'),
      isActive: true,
    })
  }

  async function createTemplate(form: FormData) {
    await apiClient.post('/quotation-templates', {
      name: text(form, 'name'),
      planId: text(form, 'planId'),
      validityDays: number(form, 'validityDays'),
      items: [{
        productId: text(form, 'productId'),
        variantId: optionalText(form, 'variantId') || undefined,
        quantity: number(form, 'quantity'),
      }],
    })
  }

  return (
    <div className="space-y-5">
      {error && <ErrorMessage message={error} />}
      {message && <p role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm text-emerald-100">{message}</p>}

      <Surface title="Add product">
        <form onSubmit={(event) => void submit(event, 'product', createProduct, 'Product created.')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TextField name="name" label="Product name" required />
          <TextField name="productType" label="Type" placeholder="SOFTWARE or ADD_ON" required />
          <TextField name="salesPrice" label="Sales price (INR)" type="number" min="0" step="0.01" required />
          <TextField name="costPrice" label="Cost price (INR)" type="number" min="0" step="0.01" required />
          <TextField name="notes" label="Notes" />
          <SubmitButton busy={busy === 'product'}>Create product</SubmitButton>
        </form>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface title="Add product variant">
          <form onSubmit={(event) => void submit(event, 'variant', createVariant, 'Variant created.')} className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-neutral-400 sm:col-span-2">
              Product
              <select name="productId" required value={variantProductId || products[0]?.id || ''} onChange={(event) => setVariantProductId(event.target.value)} className={fieldClass}>
                <option value="">Select a product</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <TextField name="name" label="Variant name" required />
            <TextField name="priceExtra" label="Price increase (INR)" type="number" min="0" step="0.01" required />
            <SubmitButton busy={busy === 'variant'} disabled={!products.length}>Add variant</SubmitButton>
          </form>
        </Surface>

        <Surface title="Create subscription plan">
          <form onSubmit={(event) => void submit(event, 'plan', createPlan, 'Plan created.')} className="grid gap-4 sm:grid-cols-2">
            <TextField name="name" label="Plan name" required />
            <label className="text-xs text-neutral-400">
              Billing period
              <select name="billingPeriod" defaultValue="MONTHLY" className={fieldClass}>
                {billingPeriods.map((period) => <option key={period} value={period}>{period}</option>)}
              </select>
            </label>
            <TextField name="price" label="Price (INR)" type="number" min="0" step="0.01" required />
            <TextField name="minQuantity" label="Minimum quantity" type="number" min="1" defaultValue="1" required />
            <TextField name="startDate" label="Available from" type="date" defaultValue={localDateInputValue()} required />
            <TextField name="endDate" label="Available until" type="date" />
            <div className="grid gap-2 text-xs text-neutral-300 sm:col-span-2 sm:grid-cols-2">
              <Checkbox name="autoClose" label="Close automatically at end date" />
              <Checkbox name="canPause" label="Allow pause and resume" defaultChecked />
              <Checkbox name="canCloseEarly" label="Allow early closure" defaultChecked />
              <Checkbox name="canRenew" label="Allow renewal" defaultChecked />
            </div>
            <SubmitButton busy={busy === 'plan'}>Create plan</SubmitButton>
          </form>
        </Surface>

        <Surface title="Add tax rule">
          <form onSubmit={(event) => void submit(event, 'tax', createTaxRule, 'Tax rule created.')} className="grid gap-4 sm:grid-cols-2">
            <TextField name="name" label="Rule name" required />
            <TextField name="ratePercentage" label="Rate (%)" type="number" min="0" max="100" step="0.0001" required />
            <TextField name="effectiveFrom" label="Effective from" type="date" defaultValue={localDateInputValue()} required />
            <TextField name="effectiveUntil" label="Effective until" type="date" />
            <SubmitButton busy={busy === 'tax'}>Create tax rule</SubmitButton>
          </form>
        </Surface>

        <Surface title="Add discount rule">
          <form onSubmit={(event) => void submit(event, 'discount', createDiscountRule, 'Discount rule created.')} className="grid gap-4 sm:grid-cols-2">
            <TextField name="code" label="Discount code" required />
            <label className="text-xs text-neutral-400">
              Discount type
              <select name="discountType" defaultValue="PERCENTAGE" className={fieldClass}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <TextField name="value" label="Value" type="number" min="0.01" step="0.01" required />
            <TextField name="minPurchaseAmount" label="Minimum purchase (INR)" type="number" min="0" step="0.01" defaultValue="0" required />
            <TextField name="minQuantity" label="Minimum quantity" type="number" min="0" defaultValue="0" required />
            <TextField name="maxUses" label="Maximum uses (blank = unlimited)" type="number" min="1" />
            <TextField name="startDate" label="Starts" type="date" defaultValue={localDateInputValue()} required />
            <TextField name="endDate" label="Ends" type="date" required />
            <SubmitButton busy={busy === 'discount'}>Create discount</SubmitButton>
          </form>
        </Surface>

        <Surface title="Create quotation template">
          <form onSubmit={(event) => void submit(event, 'template', createTemplate, 'Quotation template created.')} className="grid gap-4 sm:grid-cols-2">
            <TextField name="name" label="Template name" required />
            <TextField name="validityDays" label="Validity (days)" type="number" min="1" defaultValue="30" required />
            <label className="text-xs text-neutral-400">
              Plan
              <select name="planId" required value={templatePlanId || plans[0]?.id || ''} onChange={(event) => setTemplatePlanId(event.target.value)} className={fieldClass}>
                <option value="">Select a plan</option>
                {plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-neutral-400">
              Product
              <select name="productId" required value={templateProductId || products[0]?.id || ''} onChange={(event) => setTemplateProductId(event.target.value)} className={fieldClass}>
                <option value="">Select a product</option>
                {products.filter((product) => product.isActive).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-neutral-400">
              Variant
              <select name="variantId" className={fieldClass}>
                <option value="">No variant</option>
                {products.find((product) => product.id === (templateProductId || products[0]?.id))?.variants.filter((variant) => variant.isActive).map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.name}</option>
                ))}
              </select>
            </label>
            <TextField name="quantity" label="Item quantity" type="number" min="1" defaultValue="1" required />
            <SubmitButton busy={busy === 'template'} disabled={!products.length || !plans.length}>Create template</SubmitButton>
          </form>
        </Surface>
      </div>
    </div>
  )
}

function TextField({
  name,
  label,
  type = 'text',
  defaultValue,
  min,
  max,
  step,
  placeholder,
  required = false,
}: {
  name: string
  label: string
  type?: string
  defaultValue?: string
  min?: string
  max?: string
  step?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="text-xs text-neutral-400">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        required={required}
        className={`${fieldClass} [color-scheme:dark]`}
      />
    </label>
  )
}

function Checkbox({
  name,
  label,
  defaultChecked = false,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-2">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="accent-emerald-300" />
      {label}
    </label>
  )
}

function SubmitButton({
  busy,
  disabled = false,
  children,
}: {
  busy: boolean
  disabled?: boolean
  children: string
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="h-10 rounded-full bg-emerald-300 px-4 text-xs font-semibold text-[#07120d] transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-50"
    >
      {busy ? 'Saving…' : children}
    </button>
  )
}

function text(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(form: FormData, key: string): string | undefined {
  return text(form, key) || undefined
}

function number(form: FormData, key: string): number {
  return Number(text(form, key))
}
