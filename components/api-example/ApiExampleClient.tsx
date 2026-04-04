"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

interface ApiCallResult {
    status: number;
    payload: unknown;
}

type EndpointMethod = "GET" | "POST" | "OPTIONS" | "GET | POST";
type EndpointBodyType = "none" | "json" | "multipart-file";

interface EndpointDoc {
    id: string;
    method: EndpointMethod;
    path: string;
    auth: "Public";
    description: string;
    bodyType: EndpointBodyType;
    sampleBody?: string;
    testable: boolean;
}

interface EndpointGroup {
    title: string;
    items: EndpointDoc[];
}

interface QrisOption {
    id: string;
    merchantName: string;
    merchantCity: string;
}

interface TransactionOption {
    id: string;
    status: string;
    totalAmount: number;
    createdAt: string;
}

const SAMPLE_RESPONSE = {
    success: true,
    data: {
        transactionId: "cmnkxxxxx0000abcde12345",
        qrisId: "cmnkxxxxx0000qris12345",
        merchantName: "TOKO CONTOH",
        merchantCity: "JAKARTA",
        qrisString: "000201010212...",
        qrisImageUrl: "/uploads/qris/userid123/1743742054123-qrisid-qris-dynamic.png",
        qrisImageFullUrl:
            "https://bikinqrisdinamis.app/uploads/qris/userid123/1743742054123-qrisid-qris-dynamic.png",
        imageLink: "https://bikinqrisdinamis.app/userid123/cmnkxxxxx0000abcde12345",
        baseAmount: 100000,
        taxAmount: 0,
        totalAmount: 100000,
        expiresAt: "2026-04-04T09:00:00.000Z",
        docsUrl: "https://bikinqrisdinamis.app/rest-api",
        paymentEndpoints: {
            proofUploadUrl: "https://bikinqrisdinamis.app/api/payment/userid123/cmnkxxxxx0000abcde12345/proof",
            statusCheckUrl: "https://bikinqrisdinamis.app/api/payment/userid123/cmnkxxxxx0000abcde12345/status",
            confirmPaymentUrl:
                "https://bikinqrisdinamis.app/api/payment/userid123/cmnkxxxxx0000abcde12345/confirm",
        },
    },
};

interface ApiExampleClientProps {
    userId: string;
    initialQrisOptions: QrisOption[];
    initialTransactionOptions: TransactionOption[];
}

function getPayloadData(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const data = (payload as { data?: unknown }).data;
    if (!data || typeof data !== "object") {
        return null;
    }

    return data as Record<string, unknown>;
}

function getTransactionIdFromPayload(payload: unknown): string {
    const data = getPayloadData(payload);
    const transactionId = data?.transactionId;
    return typeof transactionId === "string" ? transactionId : "";
}

function getTransactionStatusFromPayload(payload: unknown): string {
    const data = getPayloadData(payload);
    const status = data?.status;
    return typeof status === "string" ? status : "PENDING";
}

function getTransactionAmountFromPayload(payload: unknown): number {
    const data = getPayloadData(payload);
    const totalAmount = data?.totalAmount;
    return typeof totalAmount === "number" ? totalAmount : 0;
}

function isTransactionEndpoint(endpointId: string): boolean {
    return (
        endpointId === "public-payment-proof-post" ||
        endpointId === "public-payment-status-get" ||
        endpointId === "public-payment-confirm-post" ||
        endpointId === "public-image-link-get"
    );
}

export default function ApiExampleClient({
    userId,
    initialQrisOptions,
    initialTransactionOptions,
}: ApiExampleClientProps) {
    const [qrisOptions, setQrisOptions] = useState<QrisOption[]>(initialQrisOptions);
    const [transactionOptions, setTransactionOptions] = useState<TransactionOption[]>(initialTransactionOptions);
    const [qrisId, setQrisId] = useState(initialQrisOptions[0]?.id ?? "");
    const [nominal, setNominal] = useState("10000");
    const [transactionId, setTransactionId] = useState(initialTransactionOptions[0]?.id ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
    const [requestBody, setRequestBody] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [endpointResults, setEndpointResults] = useState<Record<string, ApiCallResult>>({});

    const safeUser = useMemo(() => encodeURIComponent(userId.trim() || "userId"), [userId]);
    const safeQris = useMemo(() => encodeURIComponent(qrisId.trim() || "qrisId"), [qrisId]);
    const safeNominal = useMemo(() => encodeURIComponent(nominal.trim() || "1000"), [nominal]);
    const safeTransactionId = useMemo(
        () => encodeURIComponent(transactionId.trim() || "transactionId"),
        [transactionId]
    );

    const endpointGroups = useMemo<EndpointGroup[]>(
        () => [
            {
                title: "Public Endpoint (Website Eksternal)",
                items: [
                    {
                        id: "public-generate-get",
                        method: "GET",
                        path: `/api/${safeUser}/${safeQris}/${safeNominal}`,
                        auth: "Public",
                        description: "Generate QRIS dinamis + buat transaksi baru (sudah support CORS).",
                        bodyType: "none",
                        testable: true,
                    },
                    {
                        id: "public-payment-proof-post",
                        method: "POST",
                        path: `/api/payment/${safeUser}/${safeTransactionId}/proof`,
                        auth: "Public",
                        description: "Upload bukti transfer (multipart/form-data, field: file, support CORS).",
                        bodyType: "multipart-file",
                        testable: true,
                    },
                    {
                        id: "public-payment-status-get",
                        method: "GET",
                        path: `/api/payment/${safeUser}/${safeTransactionId}/status`,
                        auth: "Public",
                        description: "Cek status transaksi otomatis (termasuk validasi expiry/proof, support CORS).",
                        bodyType: "none",
                        testable: true,
                    },
                    {
                        id: "public-payment-confirm-post",
                        method: "POST",
                        path: `/api/payment/${safeUser}/${safeTransactionId}/confirm`,
                        auth: "Public",
                        description: "Konfirmasi pembayaran. Wajib ada bukti transfer (support CORS).",
                        bodyType: "json",
                        sampleBody: JSON.stringify({ confirmedBy: "PUBLIC_API" }, null, 2),
                        testable: true,
                    },
                    {
                        id: "public-image-link-get",
                        method: "GET",
                        path: `/${safeUser}/${safeTransactionId}`,
                        auth: "Public",
                        description: "Short-link untuk redirect ke gambar QR dinamis.",
                        bodyType: "none",
                        testable: true,
                    },
                ],
            },
        ],
        [safeNominal, safeQris, safeTransactionId, safeUser]
    );

    const allEndpoints = useMemo(
        () => endpointGroups.flatMap((group) => group.items),
        [endpointGroups]
    );

    const selectedEndpoint = useMemo(
        () => allEndpoints.find((item) => item.id === selectedEndpointId) ?? null,
        [allEndpoints, selectedEndpointId]
    );

    const selectedPreviewJson = useMemo(() => {
        if (!selectedEndpointId) {
            return JSON.stringify(SAMPLE_RESPONSE, null, 2);
        }

        return JSON.stringify(endpointResults[selectedEndpointId]?.payload ?? SAMPLE_RESPONSE, null, 2);
    }, [endpointResults, selectedEndpointId]);

    useEffect(() => {
        setQrisOptions(initialQrisOptions);

        const hasSelectedQris = initialQrisOptions.some((item) => item.id === qrisId);
        if (!hasSelectedQris) {
            setQrisId(initialQrisOptions[0]?.id ?? "");
        }
    }, [initialQrisOptions, qrisId]);

    useEffect(() => {
        setTransactionOptions(initialTransactionOptions);

        const hasSelectedTransaction = initialTransactionOptions.some((item) => item.id === transactionId);
        if (!hasSelectedTransaction) {
            setTransactionId(initialTransactionOptions[0]?.id ?? "");
        }
    }, [initialTransactionOptions, transactionId]);

    useEffect(() => {
        if (!allEndpoints.length || !selectedEndpointId) {
            return;
        }

        const isStillValid = allEndpoints.some((item) => item.id === selectedEndpointId);
        if (!isStillValid) {
            setSelectedEndpointId(null);
        }
    }, [allEndpoints, selectedEndpointId]);

    useEffect(() => {
        if (!selectedEndpoint) {
            return;
        }

        setUploadFile(null);

        if (selectedEndpoint.bodyType === "json") {
            setRequestBody(selectedEndpoint.sampleBody ?? "{}");
            return;
        }

        setRequestBody("");
    }, [selectedEndpoint]);

    async function testEndpoint() {
        setError("");
        setInfo("");

        if (!selectedEndpoint) {
            setError("Pilih endpoint dulu.");
            return;
        }

        if (selectedEndpoint.id === "public-generate-get") {
            if (!qrisId.trim()) {
                setError("Pilih/isi QRIS ID untuk endpoint generate.");
                return;
            }

            if (!nominal.trim()) {
                setError("Masukkan nominal untuk endpoint generate.");
                return;
            }
        }

        if (isTransactionEndpoint(selectedEndpoint.id) && !transactionId.trim()) {
            setError("Pilih/isi transactionId untuk endpoint ini.");
            return;
        }

        if (selectedEndpoint.bodyType === "multipart-file" && !uploadFile) {
            setError("Pilih file gambar dulu untuk endpoint upload.");
            return;
        }

        if (selectedEndpoint.bodyType === "json" && requestBody.trim()) {
            try {
                JSON.parse(requestBody);
            } catch {
                setError("Body JSON tidak valid. Periksa format JSON kamu.");
                return;
            }
        }

        setLoading(true);

        try {
            const requestMethod = selectedEndpoint.method === "GET | POST" ? "GET" : selectedEndpoint.method;
            const requestInit: RequestInit = {
                method: requestMethod,
                credentials: "include",
            };

            if (selectedEndpoint.bodyType === "json") {
                requestInit.headers = {
                    "Content-Type": "application/json",
                };
                requestInit.body = requestBody || "{}";
            }

            if (selectedEndpoint.bodyType === "multipart-file" && uploadFile) {
                const formData = new FormData();
                formData.append("file", uploadFile);
                requestInit.body = formData;
            }

            const response = await fetch(selectedEndpoint.path, requestInit);
            const text = await response.text();

            let payload: unknown = text;
            try {
                payload = JSON.parse(text);
            } catch {
                // Keep plain text payload when response is not JSON.
            }

            setEndpointResults((previous) => ({
                ...previous,
                [selectedEndpoint.id]: {
                    status: response.status,
                    payload,
                },
            }));

            const foundTransactionId = getTransactionIdFromPayload(payload);
            if (foundTransactionId) {
                setTransactionId(foundTransactionId);
                setTransactionOptions((previous) => {
                    const alreadyExists = previous.some((item) => item.id === foundTransactionId);
                    if (alreadyExists) {
                        return previous;
                    }

                    return [
                        {
                            id: foundTransactionId,
                            status: getTransactionStatusFromPayload(payload),
                            totalAmount: getTransactionAmountFromPayload(payload),
                            createdAt: new Date().toISOString(),
                        },
                        ...previous,
                    ];
                });
                setInfo(`Request selesai. transactionId otomatis terisi: ${foundTransactionId}`);
                return;
            }

            setInfo("Request endpoint terpilih selesai.");
        } catch {
            setError("Gagal memanggil endpoint. Pastikan server berjalan.");
        } finally {
            setLoading(false);
        }
    }

    async function copyEndpointUrl(path: string) {
        try {
            const absoluteUrl = `${window.location.origin}${path}`;
            await navigator.clipboard.writeText(absoluteUrl);
            setInfo(`Endpoint berhasil disalin: ${path}`);
        } catch {
            setError("Clipboard tidak tersedia di browser ini.");
        }
    }

    async function copySelectedJson() {
        try {
            await navigator.clipboard.writeText(selectedPreviewJson);
            setInfo("JSON result endpoint terpilih berhasil disalin.");
        } catch {
            setError("Clipboard tidak tersedia di browser ini.");
        }
    }

    function closeSelectedEndpoint() {
        setSelectedEndpointId(null);
        setUploadFile(null);
        setRequestBody("");
        setError("");
        setInfo("");
    }

    function renderInlineTesterPanel(endpoint: EndpointDoc) {
        const endpointResult = endpointResults[endpoint.id] ?? null;
        const endpointPreviewJson = JSON.stringify(endpointResult?.payload ?? SAMPLE_RESPONSE, null, 2);
        const needsGenerateParams = endpoint.id === "public-generate-get";
        const needsTransactionId = isTransactionEndpoint(endpoint.id);

        return (
            <div className="border-2 border-nb-black bg-white p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <p className="font-heading text-lg text-nb-black">Uji Coba Endpoint</p>
                        <p className="font-sans text-xs text-nb-gray mt-1">
                            Input akan menyesuaikan URL endpoint yang kamu pilih.
                        </p>
                    </div>
                    <Button variant="white" size="sm" onClick={closeSelectedEndpoint}>
                        X
                    </Button>
                </div>

                {needsGenerateParams && (
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="font-mono text-xs font-bold text-nb-gray block mb-1">
                                QRIS ID (otomatis dari database)
                            </label>
                            {qrisOptions.length > 0 ? (
                                <select
                                    className="input-nb"
                                    value={qrisId}
                                    onChange={(event) => setQrisId(event.target.value)}
                                >
                                    <option value="">-- pilih qrisId --</option>
                                    {qrisOptions.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.merchantName} ({option.merchantCity}) - {option.id}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className="input-nb"
                                    value={qrisId}
                                    onChange={(event) => setQrisId(event.target.value)}
                                    placeholder="Masukkan qrisId"
                                />
                            )}
                        </div>
                        <div>
                            <label className="font-mono text-xs font-bold text-nb-gray block mb-1">Nominal</label>
                            <input
                                className="input-nb"
                                value={nominal}
                                onChange={(event) => setNominal(event.target.value.replace(/\D/g, ""))}
                                placeholder="10000"
                            />
                        </div>
                    </div>
                )}

                {needsTransactionId && (
                    <div>
                        <label className="font-mono text-xs font-bold text-nb-gray block mb-1">
                            Transaction ID (pilih dari database)
                        </label>
                        {transactionOptions.length > 0 ? (
                            <select
                                className="input-nb"
                                value={transactionId}
                                onChange={(event) => setTransactionId(event.target.value)}
                            >
                                <option value="">-- pilih transactionId --</option>
                                {transactionOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.id} | {option.status} | Rp {option.totalAmount.toLocaleString("id-ID")}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                className="input-nb"
                                value={transactionId}
                                onChange={(event) => setTransactionId(event.target.value)}
                                placeholder="Masukkan transactionId"
                            />
                        )}
                    </div>
                )}

                {endpoint.bodyType === "json" && (
                    <div>
                        <label className="font-mono text-xs font-bold text-nb-gray block mb-1">JSON Body</label>
                        <textarea
                            className="input-nb min-h-[140px] font-mono text-xs"
                            value={requestBody}
                            onChange={(event) => setRequestBody(event.target.value)}
                            placeholder='{"key":"value"}'
                        />
                    </div>
                )}

                {endpoint.bodyType === "multipart-file" && (
                    <div>
                        <label className="font-mono text-xs font-bold text-nb-gray block mb-1">Upload File</label>
                        <input
                            type="file"
                            className="input-nb"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/tiff"
                            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                        />
                        {uploadFile && (
                            <p className="font-mono text-xs text-nb-gray mt-2">File: {uploadFile.name}</p>
                        )}
                    </div>
                )}

                {info && (
                    <div
                        className="p-3 font-mono text-xs text-nb-black"
                        style={{ background: "var(--color-nb-yellow)", border: "2px solid #0D0D0D" }}
                    >
                        {info}
                    </div>
                )}

                {error && (
                    <div
                        className="p-3 font-mono text-xs text-white"
                        style={{ background: "#FF3B3B", border: "2px solid #0D0D0D" }}
                    >
                        {error}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="black" loading={loading} onClick={testEndpoint} disabled={!endpoint.testable}>
                        Tes Endpoint
                    </Button>
                    {endpointResult && (
                        <span className="font-mono text-xs font-bold text-nb-gray">
                            HTTP Status: <span className="text-nb-black">{endpointResult.status}</span>
                        </span>
                    )}
                </div>

                <div className="card-nb p-3 bg-nb-bg">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="font-mono text-xs font-bold text-nb-gray">Result JSON (endpoint terpilih)</p>
                        <Button variant="white" size="sm" onClick={copySelectedJson}>
                            Salin JSON
                        </Button>
                    </div>
                    <pre className="font-mono text-xs leading-relaxed p-4 border-2 border-nb-black bg-white overflow-auto">
                        {endpointPreviewJson}
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-nb-bg pattern-dots">
            <section className="section-nb">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="badge-nb badge-nb-pending mb-2">REST API Docs</p>
                            <h1 className="font-heading text-4xl text-nb-black">Contoh JSON API QRIS</h1>
                            <p className="font-sans text-nb-gray mt-2">
                                Input uji coba akan berubah sesuai endpoint yang kamu pilih.
                            </p>
                            <p className="font-mono text-xs text-nb-gray font-bold mt-2">userId aktif: {userId}</p>
                        </div>
                        <Link href="/dashboard" className="btn-nb btn-nb-white text-xs no-underline">
                            Kembali ke Dashboard
                        </Link>
                    </div>

                    <Card padding="lg">
                        <CardHeader>
                            <CardTitle>Daftar Semua Endpoint</CardTitle>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            <p className="font-sans text-sm text-nb-gray">
                                Klik salah satu endpoint untuk buka panel uji coba. Klik X untuk menutup pilihan.
                            </p>

                            {endpointGroups.map((group) => (
                                <div key={group.title} className="card-nb p-3 bg-white space-y-2">
                                    <p className="font-heading text-lg text-nb-black">{group.title}</p>

                                    {group.items.map((item) => {
                                        const isSelected = selectedEndpoint?.id === item.id;

                                        return (
                                            <Fragment key={`${group.title}-${item.id}`}>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => setSelectedEndpointId(item.id)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault();
                                                            setSelectedEndpointId(item.id);
                                                        }
                                                    }}
                                                    className={`border-2 border-nb-black p-3 cursor-pointer transition-transform ${isSelected
                                                        ? "bg-nb-yellow shadow-[6px_6px_0_#0D0D0D] -translate-y-[1px]"
                                                        : "bg-nb-bg"
                                                        }`}
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-mono text-[10px] font-bold px-2 py-1 border-2 border-nb-black bg-nb-green text-nb-black">
                                                                {item.method}
                                                            </span>
                                                            <span className="font-mono text-[10px] font-bold px-2 py-1 border-2 border-nb-black bg-white text-nb-black">
                                                                {item.auth}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="font-mono text-[10px] font-bold px-2 py-1 border-2 border-nb-black bg-nb-black text-white">
                                                                    DIPILIH
                                                                </span>
                                                            )}
                                                        </div>

                                                        <Button
                                                            variant="white"
                                                            size="sm"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                copyEndpointUrl(item.path);
                                                            }}
                                                        >
                                                            Salin URL
                                                        </Button>
                                                    </div>

                                                    <p className="font-mono text-xs text-nb-black break-all mt-2">{item.path}</p>
                                                    <p className="font-sans text-xs text-nb-gray mt-1">{item.description}</p>
                                                </div>

                                                {isSelected && renderInlineTesterPanel(item)}
                                            </Fragment>
                                        );
                                    })}
                                </div>
                            ))}
                        </CardBody>
                    </Card>
                </div>
            </section>
        </main>
    );
}
