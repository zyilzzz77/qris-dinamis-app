import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/lib/api-request-log";

type MonthRange = {
    monthLabel: string;
    monthKey: string;
    startAt: Date;
    endAt: Date;
};

function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, { status });
}

function parseMonthRange(monthParam: string | null): MonthRange {
    const now = new Date();

    const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let startAt = fallbackStart;

    const match = monthParam?.match(/^(\d{4})-(\d{2})$/);
    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);

        if (
            Number.isFinite(year) &&
            Number.isFinite(month) &&
            year >= 2000 &&
            year <= 2200 &&
            month >= 1 &&
            month <= 12
        ) {
            startAt = new Date(year, month - 1, 1);
        }
    }

    const endAt = new Date(startAt.getFullYear(), startAt.getMonth() + 1, 1);

    const monthLabel = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
    }).format(startAt);

    const monthKey = `${startAt.getFullYear()}-${String(startAt.getMonth() + 1).padStart(2, "0")}`;

    return {
        monthLabel,
        monthKey,
        startAt,
        endAt,
    };
}

export async function GET(request: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await logApiRequest({
            request,
            endpoint: "/api/transaction/export/monthly",
            userId: userId ?? null,
        });

        if (!userId) {
            return jsonResponse(
                { success: false, error: "Kamu harus login dulu." },
                401
            );
        }

        const requestUrl = new URL(request.url);
        const monthParam = requestUrl.searchParams.get("month");
        const range = parseMonthRange(monthParam);

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                createdAt: {
                    gte: range.startAt,
                    lt: range.endAt,
                },
            },
            include: {
                qrisStatic: {
                    select: {
                        merchantName: true,
                        merchantCity: true,
                        nmid: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        const rows = transactions.map((item, index) => ({
            No: index + 1,
            "Transaction ID": item.id,
            Tanggal: new Date(item.createdAt).toISOString(),
            Merchant: item.qrisStatic?.merchantName || "-",
            Kota: item.qrisStatic?.merchantCity || "-",
            NMID: item.qrisStatic?.nmid || "-",
            Deskripsi: item.description || "-",
            Status: item.status,
            "Nominal Dasar": item.baseAmount,
            Pajak: item.taxAmount,
            "Total Bayar": item.totalAmount,
            "Jenis Pajak": item.taxType,
            "Rate Pajak": item.taxRate,
            "Dikonfirmasi Oleh": item.confirmedBy || "-",
            "Tanggal Konfirmasi": item.confirmedAt ? new Date(item.confirmedAt).toISOString() : "-",
            "Dibuat Pada": new Date(item.createdAt).toISOString(),
            "Diupdate Pada": new Date(item.updatedAt).toISOString(),
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 6 },
            { wch: 28 },
            { wch: 24 },
            { wch: 26 },
            { wch: 20 },
            { wch: 24 },
            { wch: 30 },
            { wch: 16 },
            { wch: 18 },
            { wch: 14 },
            { wch: 18 },
            { wch: 14 },
            { wch: 12 },
            { wch: 24 },
            { wch: 24 },
            { wch: 24 },
            { wch: 24 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap");

        const metadataSheet = XLSX.utils.json_to_sheet([
            { Keterangan: "Periode", Nilai: range.monthLabel },
            { Keterangan: "Total Baris", Nilai: rows.length },
            { Keterangan: "Diekspor Pada", Nilai: new Date().toISOString() },
        ]);
        XLSX.utils.book_append_sheet(workbook, metadataSheet, "Metadata");

        const fileBuffer = XLSX.write(workbook, {
            type: "array",
            bookType: "xlsx",
        }) as ArrayBuffer;

        const filename = `rekap-transaksi-${range.monthKey}.xlsx`;

        return new Response(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[TRANSACTION_EXPORT_MONTHLY]", error);
        return jsonResponse(
            { success: false, error: "Terjadi kesalahan saat export transaksi bulanan." },
            500
        );
    }
}
