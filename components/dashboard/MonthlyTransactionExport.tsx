"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import Button from "@/components/ui/Button";

function getDefaultMonthInputValue(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

export default function MonthlyTransactionExport() {
    const [month, setMonth] = useState(getDefaultMonthInputValue());

    const downloadUrl = useMemo(() => {
        const encodedMonth = encodeURIComponent(month);
        return `/api/transaction/export/monthly?month=${encodedMonth}`;
    }, [month]);

    function handleDownload() {
        window.location.href = downloadUrl;
    }

    return (
        <section className="card-nb p-6">
            <h2 className="font-heading text-2xl text-nb-black mb-2">Download Rekap Bulanan</h2>
            <p className="font-mono text-sm text-nb-gray font-bold mb-4">
                Export semua transaksi berdasarkan bulan dalam format Excel (.xlsx).
            </p>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div>
                    <label className="font-mono text-xs font-bold text-nb-gray uppercase tracking-wider block mb-1">
                        Pilih Bulan
                    </label>
                    <input
                        type="month"
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                        className="input-nb"
                    />
                </div>

                <Button
                    variant="black"
                    icon={<Download size={16} />}
                    onClick={handleDownload}
                    disabled={!month}
                >
                    Download Excel
                </Button>
            </div>
        </section>
    );
}
