import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HistoryContent from "@/components/transaction/HistoryContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riwayat Transaksi",
  description: "Riwayat semua transaksi QRIS kamu",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Next.js 16: searchParams is a Promise
  const { page = "1", status, search = "" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = 10;

  const where = {
    userId: session.user.id,
    ...(status ? { status: status as any } : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
            { id: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        qrisStatic: { select: { merchantName: true, merchantCity: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return (
    <HistoryContent
      transactions={JSON.parse(JSON.stringify(transactions))}
      meta={{
        total,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }}
      currentStatus={status || ""}
      currentSearch={search}
    />
  );
}
