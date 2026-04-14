/**
 * app/[userId]/[linkId]/route.ts
 * Public short-link route for QRIS dynamic image.
 *
 * Example:
 * GET /<userId>/<transactionId>
 * -> Redirect to /uploads/qris/<userId>/<file>.png
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestOrigin } from "@/lib/seo";
import { markTransactionFailedAndCleanupQrisImage } from "@/lib/transaction-expiry";

type RouteParams = {
    userId: string;
    linkId: string;
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<RouteParams> }
) {
    try {
        const { userId, linkId } = await context.params;

        if (!userId || !linkId) {
            return Response.json(
                { success: false, error: "Parameter link tidak lengkap" },
                { status: 400 }
            );
        }

        const tx = await prisma.transaction.findFirst({
            where: {
                id: linkId,
                userId,
                qrisImageUrl: { not: null },
            },
            select: {
                id: true,
                status: true,
                qrisImageUrl: true,
                expiresAt: true,
            },
        });

        if (!tx?.qrisImageUrl) {
            return Response.json(
                { success: false, error: "Link gambar tidak ditemukan" },
                { status: 404 }
            );
        }

        if (tx.expiresAt && tx.expiresAt.getTime() < Date.now()) {
            if (tx.status !== "PAID") {
                await markTransactionFailedAndCleanupQrisImage({
                    transactionId: tx.id,
                    qrisImageUrl: tx.qrisImageUrl,
                });
            }

            return Response.json(
                {
                    success: false,
                    error: "Link gambar sudah kadaluarsa. Status transaksi menjadi gagal.",
                },
                { status: 410 }
            );
        }

        const destination = new URL(tx.qrisImageUrl, getRequestOrigin(request));
        return NextResponse.redirect(destination, 302);
    } catch (error) {
        console.error("[PUBLIC_QRIS_IMAGE_LINK]", error);
        return Response.json(
            { success: false, error: "Gagal membuka link gambar" },
            { status: 500 }
        );
    }
}
