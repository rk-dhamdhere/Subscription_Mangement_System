export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER'
export type SubRole = 'SALES' | 'FINANCE' | 'GENERAL'
export type BackendStaffRole = 'SALES' | 'FINANCE' | 'NONE'

export type BillingFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type SubscriptionStatus =
  'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED'
export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED'
export type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'RAZORPAY'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  subRole?: SubRole
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
}

export interface ProductVariant {
  id: string
  name: string
  priceExtra: string
  isActive: boolean
}

export interface Product {
  id: string
  name: string
  productType: string
  salesPrice: string
  costPrice: string
  notes: string | null
  isActive: boolean
  variants: ProductVariant[]
}

export interface Plan {
  id: string
  name: string
  billingPeriod: BillingFrequency
  price: string
  minQuantity: number
  startDate: string
  endDate: string | null
  autoClose: boolean
  canPause: boolean
  canCloseEarly: boolean
  canRenew: boolean
  isActive: boolean
}

export interface TaxRule {
  id: string
  name: string
  ratePercentage: string
  effectiveFrom: string
  effectiveUntil: string | null
  isActive: boolean
}

export interface DiscountRule {
  id: string
  code: string
  discountType: 'FIXED' | 'PERCENTAGE'
  value: string
  minPurchaseAmount: string
  minQuantity: number
  maxUses: number | null
  currentUses: number
  startDate: string
  endDate: string
  isActive: boolean
}

export interface SubscriptionCustomer {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface SubscriptionLineItem {
  id: string
  productName: string
  variantName: string | null
  quantity: number
  unitPrice: string
  taxRate: string
  subtotal: string
}

export interface Subscription {
  id: string
  subscriptionNumber: string
  customerId: string
  customer: SubscriptionCustomer
  planId: string
  plan: Plan
  status: SubscriptionStatus
  startDate: string
  expiryDate: string
  nextBillingDate: string
  paymentTerms: string
  subtotalAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  items: SubscriptionLineItem[]
}

export interface InvoiceCustomer {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface InvoiceSubscription {
  id: string
  subscriptionNumber: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  subscriptionId: string
  customerId: string
  customer: InvoiceCustomer
  subscription: InvoiceSubscription
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  subtotalAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  paidAmount: string
  amountDue: string
  items: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  itemType: 'PRODUCT' | 'PLAN_FEE' | 'DISCOUNT' | 'ADJUSTMENT'
  description: string
  quantity: number
  unitPrice: string
  preTaxAmount: string
  taxRate: string
  taxAmount: string
  totalAmount: string
}

export interface FinanceDashboard {
  asOf: string
  activeSubscriptions: number
  outstandingInvoices: number
  outstandingAmount: string
  overdueInvoices: number
  overdueAmount: string
  paymentsReceivedThisMonth: string
}

export interface ReceivablesAging {
  asOf: string
  buckets: Array<{
    bucket: string
    invoiceCount: number
    amount: string
  }>
}

export interface BillingRunItem {
  id: string
  outcome: 'INVOICED' | 'SKIPPED' | 'FAILED'
  message: string | null
  subscription: Subscription
}

export interface BillingRun {
  id: string
  billingDate: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  candidateCount: number
  invoicedCount: number
  skippedCount: number
  items: BillingRunItem[]
}

export interface Payment {
  id: string
  customerId: string
  paymentReference: string
  paymentMethod: string
  receivedAt: string
  amount: string
  status: 'POSTED' | 'VOIDED'
  notes: string | null
}

export interface RazorpayOrder {
  keyId: string
  orderId: string
  amount: number
  currency: 'INR'
  invoiceNumber: string
}

export interface BillingPreview {
  billingDate: string
  alreadyExecuted: boolean
  candidateCount: number
  invoicedCount: number
  skippedCount: number
  projectedTotal: string
  items: BillingPreviewItem[]
}

export interface BillingPreviewItem {
  subscriptionId: string
  subscriptionNumber: string
  billingCycleDate: string
  outcome: 'INVOICED' | 'SKIPPED' | 'FAILED'
  estimatedTotal: string | null
  message: string | null
}

export interface StaffMember {
  id: string
  email: string
  firstName: string
  lastName: string
  staffRole: BackendStaffRole
  isActive: boolean
  createdAt: string
}

export interface CustomerSummary {
  id: string
  email: string
  firstName: string
  lastName: string
  profile: { legalName: string | null } | null
}

export interface QuotationTemplate {
  id: string
  name: string
  validityDays: number
  plan: Plan
  items: Array<{
    id: string
    quantity: number
    product: Product
    variant: ProductVariant | null
  }>
}
