import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile, sanitizeFilename } from "@/lib/storage";
import { logApiRequest } from "@/lib/api-request-log";
import { optimizeProofImage } from "@/lib/image-optimizer";
import { markTransactionFailedAndCleanupQrisImage } from "@/lib/transaction-expiry";

type RouteParams = {
    id: string;
};

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, { status });
}

function resolveImageExtension(file: File): string {
    const rawExt = (file.name.split(".").pop() || "").toLowerCase();

    if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"].includes(rawExt)) {
        return rawExt;
    }

    if (file.type === "image/png") return "png";
    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/webp") return "webp";
    if (file.type === "image/gif") return "gif";
    if (file.type === "image/bmp") return "bmp";
    if (file.type === "image/tiff") return "tiff";

    return "jpg";
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
            endpoint: "/api/transaction/[id]/proof",
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
                qrisImageUrl: true,
                expiresAt: true,
            },
        });

        if (!transaction) {
            return jsonResponse(
                { success: false, error: "Transaksi tidak ditemukan." },
                404
            );
        }

        if (transaction.status === "PAID") {
            return jsonResponse(
                { success: false, error: "Transaksi sudah berstatus lunas." },
                400
            );
        }

        const isExpired =
            transaction.status === "EXPIRED" ||
            (transaction.expiresAt ? transaction.expiresAt.getTime() < Date.now() : false);

        if (transaction.status === "FAILED" || isExpired) {
            if (isExpired || transaction.qrisImageUrl) {
                await markTransactionFailedAndCleanupQrisImage({
                    transactionId: transaction.id,
                    qrisImageUrl: transaction.qrisImageUrl,
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

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return jsonResponse(
                {
                    success: false,
                    error: "File bukti transfer wajib diunggah (field: file).",
                },
                400
            );
        }

        if (file.type && !file.type.startsWith("image/")) {
            return jsonResponse(
                { success: false, error: "Format file harus berupa gambar." },
                400
            );
        }

        const ext = resolveImageExtension(file);
        const sourceBuffer = Buffer.from(await file.arrayBuffer());
        const optimizedImage = await optimizeProofImage(sourceBuffer, ext);
        const filename = sanitizeFilename(
            `${Date.now()}-${transaction.id}-proof.${optimizedImage.extension}`
        );

        const proofImageUrl = await saveFile(
            `proofs/${userId}`,
            filename,
            optimizedImage.buffer
        );

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                proofImageUrl,
                status: "WAITING_PROOF",
            },
            select: {
                id: true,
                status: true,
                proofImageUrl: true,
                updatedAt: true,
            },
        });

        return jsonResponse({
            success: true,
            message: "Bukti transfer berhasil diunggah.",
            data: {
                transactionId: updated.id,
                status: updated.status,
                proofImageUrl: updated.proofImageUrl,
                updatedAt: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("[TRANSACTION_PROOF_UPLOAD]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan saat upload bukti transfer." },
            500
        );
    }
}
