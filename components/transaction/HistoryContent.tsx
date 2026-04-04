"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { Transaction, PaginationMeta, TransactionStatus } from "@/types";
import { SearchX } from "lucide-react";

interface HistoryContentProps {
  transactions: (Transaction & {
    qrisStatic?: { merchantName: string; merchantCity: string };
  })[];
  meta: PaginationMeta;
  currentStatus: string;
  currentSearch: string;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "WAITING_PROOF", label: "Unggah Bukti" },
  { value: "PAID", label: "Lunas" },
  { value: "FAILED", label: "Gagal" },
  { value: "EXPIRED", label: "Kadaluarsa" },
];

export default function HistoryContent({
  transactions,
  meta,
  currentStatus,
  currentSearch,
}: HistoryContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset to page 1
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", search);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl lg:text-4xl text-nb-black">
          Riwayat Transaksi
        </h1>
        <p className="font-mono text-sm text-nb-gray font-bold mt-1">
          {meta.total} total transaksi
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            className="input-nb flex-1"
            placeholder="Cari deskripsi atau ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-transactions"
          />
          <Button type="submit" variant="black" size="md">
            Cari
          </Button>
        </form>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => updateFilter("status", f.value)}
            className={`btn-nb text-xs py-1.5 px-3 ${
              currentStatus === f.value
                ? "btn-nb-black"
                : "btn-nb-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isPending ? (
        <div className="text-center py-16">
          <div className="spinner mx-auto" style={{ width: 40, height: 40 }} />
          <p className="font-mono text-sm text-nb-gray mt-4 font-bold">Loading...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card-nb p-12 text-center">
          <SearchX size={48} strokeWidth={1.5} className="mx-auto mb-4 text-nb-gray" />
          <h3 className="font-heading text-xl text-nb-black mb-2">
            Tidak ada transaksi
          </h3>
          <p className="font-sans text-sm text-nb-gray">
            {currentStatus || currentSearch
              ? "Coba ubah filter pencarian."
              : "Belum ada transaksi. Buat QRIS dinamis pertamamu!"}
          </p>
          {!currentStatus && !currentSearch && (
            <Link href="/dashboard" className="inline-block mt-4">
              <Button variant="black">Buat QRIS Dinamis</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="card-nb overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-nb">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Merchant</th>
                  <th>Deskripsi</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-mono text-xs font-bold">
                      #{tx.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="font-sans text-sm">
                      {tx.qrisStatic?.merchantName || "-"}
                    </td>
                    <td className="font-sans text-sm max-w-xs">
                      <span className="block truncate">
                        {tx.description || "-"}
                      </span>
                    </td>
                    <td className="font-mono text-sm font-bold whitespace-nowrap">
                      {formatCurrency(tx.totalAmount)}
                    </td>
                    <td>
                      <Badge status={tx.status as TransactionStatus} />
                    </td>
                    <td className="font-mono text-xs text-nb-gray whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td>
                      <Link href={`/transaction/${tx.id}`}>
                        <Button variant="white" size="sm">
                          Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-nb-gray font-bold">
            Hal {meta.page} dari {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="white"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() =>
                updateFilter("page", String(meta.page - 1))
              }
            >
              ← Prev
            </Button>
            <Button
              variant="white"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() =>
                updateFilter("page", String(meta.page + 1))
              }
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
