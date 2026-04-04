/**
 * lib/utils.ts — Utility functions for bikinqrisdinamis
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency to IDR */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format date to locale string */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/** Format date for display only */
export function formatDateOnly(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(new Date(date));
}

/** Generate a short random ID */
export function generateId(prefix = ""): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return prefix ? `${prefix}-${rand}` : rand;
}

/** Calculate tax based on type */
export function calculateTax(
  baseAmount: number,
  taxType: "NONE" | "PPN" | "PPH" | "CUSTOM",
  customRate = 0
): { taxRate: number; taxAmount: number; totalAmount: number } {
  let taxRate = 0;

  switch (taxType) {
    case "PPN":
      taxRate = 0.11; // 11% PPN
      break;
    case "PPH":
      taxRate = 0.02; // 2% PPh Pasal 22
      break;
    case "CUSTOM":
      taxRate = customRate / 100;
      break;
    default:
      taxRate = 0;
  }

  const taxAmount = Math.round(baseAmount * taxRate);
  const totalAmount = baseAmount + taxAmount;

  return { taxRate, taxAmount, totalAmount };
}


/** Truncate text */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

/** Get initials from name */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Sleep helper */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
