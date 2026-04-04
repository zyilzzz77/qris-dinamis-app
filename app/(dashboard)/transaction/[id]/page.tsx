import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TransactionDetail from "@/components/transaction/TransactionDetail";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Transaksi #${id.slice(-6).toUpperCase()}`,
  };
}

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Next.js 16: params is a Promise — must await
  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    include: { qrisStatic: true },
  });

  if (!transaction) {
    notFound();
  }

  return (
    <TransactionDetail
      transaction={JSON.parse(JSON.stringify(transaction))}
    />
  );
}
