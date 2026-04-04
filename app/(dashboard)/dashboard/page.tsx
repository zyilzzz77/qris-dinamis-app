import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardContent from "@/components/dashboard/DashboardContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard bikinqrisdinamis — kelola QRIS dan transaksi kamu",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // TypeScript: after the redirect guard, session.user.id is guaranteed
  const userId = session.user.id as string;

  // Fetch user's QRIS static & recent transactions
  const [qrisStatic, recentTransactions, stats] = await Promise.all([
    prisma.qrisStatic.findFirst({
      where: { userId, isActive: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        qrisStatic: { select: { merchantName: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
  ]);

  // Compute stats — explicit types to avoid 'implicit any'
  const totalTransactions = stats.reduce(
    (sum: number, s: { _count: { id: number } }) => sum + s._count.id,
    0
  );
  const paidStats = stats.find(
    (s: { status: string }) => s.status === "PAID"
  );
  const pendingStats = stats.find(
    (s: { status: string }) => s.status === "PENDING"
  );
  const waitingStats = stats.find(
    (s: { status: string }) => s.status === "WAITING_PROOF"
  );

  const dashboardStats = {
    totalTransactions,
    paidTransactions: paidStats?._count.id ?? 0,
    pendingTransactions:
      (pendingStats?._count.id ?? 0) + (waitingStats?._count.id ?? 0),
    totalRevenue: paidStats?._sum.totalAmount ?? 0,
  };

  return (
    <DashboardContent
      user={session.user}
      qrisStatic={qrisStatic ? JSON.parse(JSON.stringify(qrisStatic)) : null}
      recentTransactions={JSON.parse(JSON.stringify(recentTransactions))}
      stats={dashboardStats}
    />
  );
}
