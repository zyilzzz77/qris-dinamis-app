import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logApiRequest } from "@/lib/api-request-log";
import { extractQrisInput, validateAndParseQris } from "./upload-input";
import { upsertActiveQrisStatic } from "./upload-persistence";

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
    return Response.json(body, {
        status,
        headers,
    });
}

export async function handleQrisUploadRequest(request: Request): Promise<Response> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/qris/upload",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const rateLimit = checkRateLimit(request, {
            keyPrefix: "dashboard-qris-upload",
            windowMs: 60_000,
            maxRequests: 20,
        });

        if (!rateLimit.allowed) {
            return jsonResponse(
                {
                    success: false,
                    error: "Terlalu banyak request. Coba lagi beberapa saat.",
                },
                429,
                rateLimitHeaders(rateLimit)
            );
        }

        const formData = await request.formData();
        const inputResult = await extractQrisInput(formData, userId);

        if (!inputResult.ok) {
            return inputResult.response;
        }

        const parseResult = await validateAndParseQris(
            inputResult.rawQris,
            inputResult.uploadedImageUrl
        );

        if (!parseResult.ok) {
            return parseResult.response;
        }

        const qrisStatic = await upsertActiveQrisStatic({
            userId,
            rawQris: inputResult.rawQris,
            merchantName: parseResult.merchantName,
            merchantCity: parseResult.merchantCity,
            nmid: parseResult.nmid,
            uploadedImageUrl: inputResult.uploadedImageUrl,
        });

        return jsonResponse({
            success: true,
            message: "QRIS statis berhasil diproses.",
            data: qrisStatic,
        });
    } catch (error) {
        console.error("[DASHBOARD_QRIS_UPLOAD]", error);
        return jsonResponse(
            {
                success: false,
                error: "Terjadi kesalahan saat memproses QRIS.",
            },
            500
        );
    }
}