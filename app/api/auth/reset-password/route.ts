import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";

type ResetPasswordBody = {
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
};

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, { status });
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/auth/reset-password",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const body = (await request.json()) as ResetPasswordBody;
        const currentPassword = String(body.currentPassword ?? "");
        const newPassword = String(body.newPassword ?? "");
        const confirmNewPassword = String(body.confirmNewPassword ?? "");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return jsonResponse(
                { success: false, error: "Semua field password wajib diisi." },
                400
            );
        }

        if (newPassword.length < 8) {
            return jsonResponse(
                { success: false, error: "Password baru minimal 8 karakter." },
                400
            );
        }

        if (newPassword !== confirmNewPassword) {
            return jsonResponse(
                { success: false, error: "Konfirmasi password baru tidak cocok." },
                400
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });

        if (!user) {
            return jsonResponse(
                { success: false, error: "User tidak ditemukan." },
                404
            );
        }

        const looksHashed =
            user.password.startsWith("$2a$") ||
            user.password.startsWith("$2b$") ||
            user.password.startsWith("$2y$");

        const isCurrentPasswordValid = looksHashed
            ? await bcrypt.compare(currentPassword, user.password)
            : currentPassword === user.password;

        if (!isCurrentPasswordValid) {
            return jsonResponse(
                { success: false, error: "Password saat ini salah." },
                400
            );
        }

        const isSameAsOldPassword = looksHashed
            ? await bcrypt.compare(newPassword, user.password)
            : newPassword === user.password;

        if (isSameAsOldPassword) {
            return jsonResponse(
                {
                    success: false,
                    error: "Password baru harus berbeda dari password saat ini.",
                },
                400
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        return jsonResponse({
            success: true,
            message: "Password berhasil diperbarui.",
        });
    } catch (error) {
        console.error("[RESET_PASSWORD]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan server." },
            500
        );
    }
}
