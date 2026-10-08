// Types shared by the React client and the Express server.

export interface Choice {
  id: string;
  label: string;
  price: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: 'single' | 'multi';
  required?: boolean;
  choices: Choice[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string | null;
  available: boolean;
  featured: boolean;
  tags: string[];
  optionGroups: OptionGroup[];
  sort: number;
}

export interface Selection {
  groupId: string;
  groupName: string;
  choiceId: string;
  label: string;
  price: number;
}

/** What a client sends for one cart line; the server re-prices it. */
export interface CartLineInput {
  itemId: string;
  qty: number;
  choiceIds: Record<string, string[]>;
  note?: string;
}

export interface OrderLine {
  itemId: string;
  name: string;
  qty: number;
  basePrice: number;
  selections: Selection[];
  unitPrice: number;
  lineTotal: number;
  note?: string;
}

export type OrderType = 'dine-in' | 'takeout' | 'pickup';
export type PaymentMethod = 'cash' | 'qr' | 'card' | 'bank';
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'refunded';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type DiscountType = 'none' | 'senior' | 'pwd';

export interface Totals {
  subtotal: number;
  discounts: { label: string; amount: number }[];
  discountTotal: number;
  fee: number;
  feeLabel: string | null;
  total: number;
  pointsEarned: number;
}

export interface Order extends Totals {
  id: string;
  number: number;
  businessDate: string;
  createdAt: string;
  updatedAt: string;
  source: 'online' | 'pos';
  customerName: string;
  phone: string | null;
  type: OrderType;
  table: string | null;
  pickupTime: string | null;
  notes: string | null;
  lines: OrderLine[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRef: string | null;
  cardLast4: string | null;
  cashTendered: number | null;
  change: number | null;
  voucherCode: string | null;
  pointsRedeemed: number;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string; by?: string }[];
  handledBy: string | null;
}

export interface OrderRequest {
  customerName: string;
  phone?: string;
  type: OrderType;
  table?: string;
  pickupTime?: string;
  notes?: string;
  lines: CartLineInput[];
  voucherCode?: string;
  redeemPoints?: number;
  paymentMethod: PaymentMethod;
  // POS only
  discountType?: DiscountType;
  discountIdNo?: string;
  cashTendered?: number;
  paymentRef?: string;
  /** POS: open a tab and collect payment later. */
  payLater?: boolean;
}

export interface Voucher {
  code: string;
  description: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  active: boolean;
}

export type InquiryStatus = 'new' | 'contacted' | 'confirmed' | 'declined';

export interface Inquiry {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  email: string;
  service: 'coffee-cart' | 'food-packs' | 'both';
  eventType: string;
  eventDate: string;
  eventTime: string;
  guests: number;
  venue: string;
  notes: string;
  status: InquiryStatus;
}

export type StaffRole = 'cashier' | 'manager';

export interface StaffSession {
  token: string;
  name: string;
  role: StaffRole;
}

export interface BoardData {
  preparing: number[];
  ready: number[];
}

export interface Report {
  date: string;
  orderCount: number;
  gross: number;
  discounts: number;
  fees: number;
  net: number;
  averageTicket: number;
  byPayment: { method: PaymentMethod; count: number; total: number }[];
  byType: { type: OrderType; count: number }[];
  byHour: { hour: number; total: number; count: number }[];
  topItems: { name: string; qty: number; total: number }[];
  cancelled: number;
  refunded: number;
}
