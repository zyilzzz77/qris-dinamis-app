import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

export async function upsertActiveQrisStatic(params: {
    userId: string;
    rawQris: string;
    merchantName: string;
    merchantCity: string;
    nmid: string;
    uploadedImageUrl: string | null;
}) {
    const existingActive = await prisma.qrisStatic.findFirst({
        where: {
            userId: params.userId,
            isActive: true,
        },
        select: {
            id: true,
            imageUrl: true,
        },
    });

    if (existingActive) {
        const qrisStatic = await prisma.qrisStatic.update({
            where: { id: existingActive.id },
            data: {
                rawString: params.rawQris,
                merchantName: params.merchantName,
                merchantCity: params.merchantCity,
                nmid: params.nmid,
                imageUrl: params.uploadedImageUrl ?? existingActive.imageUrl ?? null,
                isActive: true,
            },
        });

        if (
            params.uploadedImageUrl &&
            existingActive.imageUrl &&
            existingActive.imageUrl !== params.uploadedImageUrl
        ) {
            await deleteFile(existingActive.imageUrl);
        }

        return qrisStatic;
    }

    return prisma.qrisStatic.create({
        data: {
            userId: params.userId,
            rawString: params.rawQris,
            merchantName: params.merchantName,
            merchantCity: params.merchantCity,
            nmid: params.nmid,
            imageUrl: params.uploadedImageUrl,
            isActive: true,
        },
    });
}