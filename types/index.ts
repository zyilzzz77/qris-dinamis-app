/**
 * types/index.ts — TypeScript types for bikinqrisdinamis
 */

export type TransactionStatus =
  | "PENDING"
  | "WAITING_PROOF"
  | "PAID"
  | "FAILED"
  | "EXPIRED";

export type TaxType = "NONE" | "PPN" | "PPH" | "CUSTOM";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrisStatic {
  id: string;
  userId: string;
  rawString: string;
  merchantName: string;
  merchantCity: string;
  nmid: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  qrisStaticId: string;
  description: string | null;
  baseAmount: number;
  taxType: TaxType;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  qrisString: string;
  qrisImageUrl: string | null;
  status: TransactionStatus;
  proofImageUrl: string | null;
  confirmedAt: Date | null;
  confirmedBy: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  qrisStatic?: QrisStatic;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** Pagination */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Dashboard stats */
export interface DashboardStats {
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  totalRevenue: number;
}

/** QRIS Generate request */
export interface GenerateQrisRequest {
  baseAmount: number;
  taxType: TaxType;
  customTaxRate?: number;
  description?: string;
}

/** QRIS Generate response */
export interface GenerateQrisResponse {
  transactionId: string;
  qrisString: string;
  qrisImageUrl: string;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  expiresAt: string;
}

/** Status badge config */
export const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Menunggu", className: "badge-nb badge-nb-pending" },
  WAITING_PROOF: { label: "Unggah Bukti", className: "badge-nb badge-nb-waiting" },
  PAID: { label: "Lunas", className: "badge-nb badge-nb-paid" },
  FAILED: { label: "Gagal", className: "badge-nb badge-nb-failed" },
  EXPIRED: { label: "Kadaluarsa", className: "badge-nb badge-nb-expired" },
};
