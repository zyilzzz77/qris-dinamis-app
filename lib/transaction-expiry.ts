import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

const EXPIRABLE_TRANSACTION_STATUSES = ["PENDING", "WAITING_PROOF", "EXPIRED"];

export async function cleanupExpiredTransactionsForUser(userId: string): Promise<void> {
    const now = new Date();

    const expiredWithQrisImage = await prisma.transaction.findMany({
        where: {
            userId,
            status: { in: EXPIRABLE_TRANSACTION_STATUSES },
            expiresAt: { lt: now },
            qrisImageUrl: { not: null },
        },
        select: {
            id: true,
            qrisImageUrl: true,
        },
    });

    await prisma.transaction.updateMany({
        where: {
            userId,
            status: { in: EXPIRABLE_TRANSACTION_STATUSES },
            expiresAt: { lt: now },
        },
        data: {
            status: "FAILED",
        },
    });

    if (expiredWithQrisImage.length === 0) {
        return;
    }

    await Promise.all(
        expiredWithQrisImage.map(async (transaction) => {
            if (!transaction.qrisImageUrl) {
                return;
            }

            await deleteFile(transaction.qrisImageUrl);
        })
    );

    await prisma.transaction.updateMany({
        where: {
            id: {
                in: expiredWithQrisImage.map((transaction) => transaction.id),
            },
        },
        data: {
            qrisImageUrl: null,
        },
    });
}

export async function markTransactionFailedAndCleanupQrisImage(params: {
    transactionId: string;
    qrisImageUrl: string | null;
}): Promise<void> {
    if (params.qrisImageUrl) {
        await deleteFile(params.qrisImageUrl);
    }

    await prisma.transaction.updateMany({
        where: {
            id: params.transactionId,
            status: {
                not: "PAID",
            },
        },
        data: {
            status: "FAILED",
            qrisImageUrl: null,
        },
    });
}