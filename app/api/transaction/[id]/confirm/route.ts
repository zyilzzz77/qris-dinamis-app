import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";

type RouteParams = {
    id: string;
};

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, { status });
}

export async function POST(
    request: Request,
    context: { params: Promise<RouteParams> }
) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/transaction/[id]/confirm",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const { id } = await context.params;

        if (!id) {
            return jsonResponse(
                { success: false, error: "ID transaksi tidak valid." },
                400
            );
        }

        const transaction = await prisma.transaction.findFirst({
            where: { id, userId },
            select: {
                id: true,
                status: true,
                expiresAt: true,
                proofImageUrl: true,
                confirmedAt: true,
            },
        });

        if (!transaction) {
            return jsonResponse(
                { success: false, error: "Transaksi tidak ditemukan." },
                404
            );
        }

        if (transaction.status === "PAID") {
            return jsonResponse({
                success: true,
                message: "Transaksi sudah berstatus LUNAS.",
                data: {
                    transactionId: transaction.id,
                    status: transaction.status,
                    confirmedAt: transaction.confirmedAt?.toISOString() ?? null,
                },
            });
        }

        const isExpired =
            transaction.status === "EXPIRED" ||
            (transaction.expiresAt ? transaction.expiresAt.getTime() < Date.now() : false);

        if (transaction.status === "FAILED" || isExpired) {
            if (transaction.status !== "FAILED") {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: "FAILED" },
                });
            }

            return jsonResponse(
                {
                    success: false,
                    error: "Transaksi sudah gagal atau melewati batas waktu 10 menit.",
                },
                410
            );
        }

        if (!transaction.proofImageUrl) {
            return jsonResponse(
                {
                    success: false,
                    error: "Upload bukti transfer dulu sebelum menandai lunas.",
                },
                400
            );
        }

        const confirmedBy =
            session?.user?.email ?? session?.user?.name ?? "DASHBOARD_USER";

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: "PAID",
                confirmedAt: new Date(),
                confirmedBy,
            },
            select: {
                id: true,
                status: true,
                confirmedAt: true,
                confirmedBy: true,
            },
        });

        return jsonResponse({
            success: true,
            message: "Transaksi berhasil ditandai lunas.",
            data: {
                transactionId: updated.id,
                status: updated.status,
                confirmedAt: updated.confirmedAt?.toISOString() ?? null,
                confirmedBy: updated.confirmedBy,
            },
        });
    } catch (error) {
        console.error("[TRANSACTION_CONFIRM]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan saat konfirmasi transaksi." },
            500
        );
    }
}
