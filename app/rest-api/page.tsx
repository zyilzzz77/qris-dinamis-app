import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ApiExampleClient from "../../components/api-example/ApiExampleClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "REST API",
    description: "Halaman uji endpoint REST API internal untuk pengguna yang sudah login.",
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function RestApiPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/sign-in?callbackUrl=/rest-api");
    }

    const [qrisItems, transactionItems] = await Promise.all([
        prisma.qrisStatic.findMany({
            where: {
                userId: session.user.id,
                isActive: true,
            },
            orderBy: {
                updatedAt: "desc",
            },
            select: {
                id: true,
                merchantName: true,
                merchantCity: true,
            },
        }),
        prisma.transaction.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 50,
            select: {
                id: true,
                status: true,
                totalAmount: true,
                createdAt: true,
            },
        }),
    ]);

    const qrisOptions = qrisItems.map((item) => ({
        id: item.id,
        merchantName: item.merchantName,
        merchantCity: item.merchantCity,
    }));

    const transactionOptions = transactionItems.map((item) => ({
        id: item.id,
        status: item.status,
        totalAmount: item.totalAmount,
        createdAt: item.createdAt.toISOString(),
    }));

    return (
        <ApiExampleClient
            userId={session.user.id}
            initialQrisOptions={qrisOptions}
            initialTransactionOptions={transactionOptions}
        />
    );
}
