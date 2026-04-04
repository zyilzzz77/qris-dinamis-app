"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import QrisUploader from "./QrisUploader";
import CreateQrisModal from "./CreateQrisModal";
import type { QrisStatic, Transaction, DashboardStats } from "@/types";
import { List, CheckCircle, Clock, Banknote } from "lucide-react";

interface DashboardContentProps {
  user: { name?: string | null; email?: string | null };
  qrisStatic: QrisStatic | null;
  recentTransactions: (Transaction & {
    qrisStatic?: { merchantName: string };
  })[];
  stats: DashboardStats;
}

export default function DashboardContent({
  user,
  qrisStatic,
  recentTransactions,
  stats,
}: DashboardContentProps) {
  const [currentQrisStatic, setCurrentQrisStatic] =
    useState<QrisStatic | null>(qrisStatic);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const statCards = [
    {
      label: "Total Transaksi",
      value: stats.totalTransactions,
      color: "var(--color-nb-yellow)",
      Icon: List,
    },
    {
      label: "Lunas",
      value: stats.paidTransactions,
      color: "#00C853",
      Icon: CheckCircle,
    },
    {
      label: "Proses",
      value: stats.pendingTransactions,
      color: "#FF6B00",
      Icon: Clock,
    },
    {
      label: "Total Pendapatan",
      value: formatCurrency(stats.totalRevenue),
      color: "#2563FF",
      Icon: Banknote,
      isRevenue: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 lg:pb-0">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-3xl lg:text-4xl text-nb-black">
          Halo, {user.name?.split(" ")[0] || "Kamu"}!
        </h1>
        <p className="font-mono text-sm text-nb-gray font-bold mt-1">
          Kelola QRIS dan transaksi kamu dari sini.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="card-nb p-4"
            style={{ borderLeftColor: stat.color, borderLeftWidth: 4 }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-mono text-xs font-bold text-nb-gray uppercase tracking-wider">
                {stat.label}
              </p>
              <stat.Icon size={16} strokeWidth={2} color={stat.color} />
            </div>
            <p
              className="font-heading text-2xl lg:text-3xl font-black mt-1 text-nb-black"
            >
              {stat.isRevenue ? stat.value : stat.value.toString()}
            </p>
          </div>
        ))}
      </div>

      {/* QRIS Static Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-2xl text-nb-black">QRIS Statis Kamu</h2>
        </div>

        {currentQrisStatic ? (
          <div className="card-nb p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge-nb badge-nb-paid">QRIS AKTIF</span>
                </div>
                <h3 className="font-heading text-2xl text-nb-black">
                  {currentQrisStatic.merchantName}
                </h3>
                <p className="font-mono text-sm text-nb-gray font-bold mt-1">
                  {currentQrisStatic.merchantCity}
                </p>
                <p className="font-mono text-xs text-nb-gray mt-1">
                  NMID: {currentQrisStatic.nmid || "-"}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-3">
                <Button
                  variant="black"
                  size="lg"
                  onClick={() => setIsCreateModalOpen(true)}
                  id="create-qris-btn"
                >
                  + Buat QRIS Dinamis
                </Button>
                <button
                  onClick={() => setCurrentQrisStatic(null)}
                  className="font-mono text-xs text-nb-gray hover:text-nb-red underline"
                >
                  Ganti QRIS statis
                </button>
              </div>
            </div>
          </div>
        ) : (
          <QrisUploader onSuccess={setCurrentQrisStatic} />
        )}
      </section>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-2xl text-nb-black">
              Transaksi Terbaru
            </h2>
            <Link href="/history">
              <Button variant="white" size="sm">
                Lihat Semua →
              </Button>
            </Link>
          </div>

          <div className="card-nb overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-nb">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Deskripsi</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-mono text-xs">
                        #{tx.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="font-sans text-sm max-w-xs truncate">
                        {tx.description || "-"}
                      </td>
                      <td className="font-mono text-sm font-bold">
                        {formatCurrency(tx.totalAmount)}
                      </td>
                      <td>
                        <Badge status={tx.status} />
                      </td>
                      <td className="font-mono text-xs text-nb-gray">
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
        </section>
      )}

      {/* Create QRIS Modal */}
      {isCreateModalOpen && (
        <CreateQrisModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
