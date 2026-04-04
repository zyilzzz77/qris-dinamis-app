/**
 * app/api/auth/register/route.ts
 * POST — Register a new user
 */

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";

export async function POST(request: NextRequest) {
    try {
        await logApiRequest({
            request,
            endpoint: "/api/auth/register",
            userId: null,
        });

        const body = await request.json();
        const { name, email, password } = body;
        const normalizedEmail = String(email ?? "").trim().toLowerCase();
        const normalizedName = String(name ?? "").trim();

        if (!normalizedName || !normalizedEmail || !password) {
            return Response.json(
                { success: false, error: "Semua field wajib diisi" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return Response.json(
                { success: false, error: "Password minimal 8 karakter" },
                { status: 400 }
            );
        }

        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (existing) {
            return Response.json(
                { success: false, error: "Email sudah terdaftar" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: { name: normalizedName, email: normalizedEmail, password: hashedPassword },
            select: { id: true, name: true, email: true, createdAt: true },
        });

        return Response.json(
            { success: true, data: user, message: "Berhasil registrasi" },
            { status: 201 }
        );
    } catch (error) {
        console.error("[REGISTER]", error);
        return Response.json(
            { success: false, error: "Terjadi kesalahan server" },
            { status: 500 }
        );
    }
}
