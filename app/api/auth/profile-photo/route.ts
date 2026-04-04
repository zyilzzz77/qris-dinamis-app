import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, sanitizeFilename, saveFile } from "@/lib/storage";
import { logApiRequest } from "@/lib/api-request-log";

const MAX_PROFILE_PHOTO_SIZE_BYTES = 3 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, { status });
}

function isSafeAvatarPath(pathname: string, userId: string): boolean {
    return pathname.startsWith(`/uploads/avatars/${userId}/`);
}

function resolveImageExtension(file: File): string {
    const rawExt = (file.name.split(".").pop() || "").toLowerCase();

    if (["png", "jpg", "jpeg", "webp", "gif"].includes(rawExt)) {
        return rawExt;
    }

    if (file.type === "image/png") return "png";
    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/webp") return "webp";
    if (file.type === "image/gif") return "gif";

    return "jpg";
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/auth/profile-photo",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return jsonResponse(
                { success: false, error: "File foto profil wajib diunggah." },
                400
            );
        }

        if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
            return jsonResponse(
                { success: false, error: "Ukuran foto profil maksimal 3MB." },
                413
            );
        }

        if (file.type && !file.type.startsWith("image/")) {
            return jsonResponse(
                { success: false, error: "Format file harus berupa gambar." },
                400
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                image: true,
            },
        });

        if (!existingUser) {
            return jsonResponse(
                { success: false, error: "User tidak ditemukan." },
                404
            );
        }

        const ext = resolveImageExtension(file);
        const filename = sanitizeFilename(`${Date.now()}-${userId}-avatar.${ext}`);
        const imageBuffer = Buffer.from(await file.arrayBuffer());
        const imageUrl = await saveFile(`avatars/${userId}`, filename, imageBuffer);

        await prisma.user.update({
            where: { id: userId },
            data: {
                image: imageUrl,
            },
        });

        if (
            existingUser.image &&
            existingUser.image !== imageUrl &&
            isSafeAvatarPath(existingUser.image, userId)
        ) {
            await deleteFile(existingUser.image);
        }

        return jsonResponse({
            success: true,
            message: "Foto profil berhasil diperbarui.",
            data: {
                imageUrl,
            },
        });
    } catch (error) {
        console.error("[PROFILE_PHOTO_UPLOAD]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan saat upload foto profil." },
            500
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/auth/profile-photo",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                image: true,
            },
        });

        if (user?.image && isSafeAvatarPath(user.image, userId)) {
            await deleteFile(user.image);
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                image: null,
            },
        });

        return jsonResponse({
            success: true,
            message: "Foto profil berhasil dihapus.",
            data: {
                imageUrl: null,
            },
        });
    } catch (error) {
        console.error("[PROFILE_PHOTO_DELETE]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan saat menghapus foto profil." },
            500
        );
    }
}
