"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type ForgotPasswordResponse = {
    success?: boolean;
    message?: string;
    error?: string;
};

export default function ForgotPasswordClientPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            let data: ForgotPasswordResponse | null = null;
            try {
                data = (await response.json()) as ForgotPasswordResponse;
            } catch {
                data = null;
            }

            if (!response.ok) {
                setError(data?.error || "Gagal memproses permintaan lupa password.");
                return;
            }

            setSuccess(
                data?.message ||
                "Instruksi reset password sudah dikirim ke email kamu."
            );
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-nb-yellow pattern-dots p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/">
                        <h1 className="font-heading text-4xl text-nb-black inline-block">
                            bikinqrisdinamis
                        </h1>
                    </Link>
                    <p className="font-mono text-sm text-nb-gray mt-2 font-bold">
                        Atur ulang password akun kamu
                    </p>
                </div>

                <div
                    className="bg-white p-8"
                    style={{
                        border: "3px solid #0D0D0D",
                        boxShadow: "8px 8px 0px #0D0D0D",
                    }}
                >
                    <h2 className="font-heading text-2xl text-nb-black mb-6">Lupa Password</h2>

                    {success && (
                        <div
                            className="mb-4 p-3 font-mono text-sm font-bold text-nb-black"
                            style={{
                                backgroundColor: "#9FD9B4",
                                border: "2px solid #0D0D0D",
                            }}
                        >
                            {success}
                        </div>
                    )}

                    {error && (
                        <div
                            className="mb-4 p-3 font-mono text-sm font-bold text-white"
                            style={{
                                backgroundColor: "#FF3B3B",
                                border: "2px solid #0D0D0D",
                            }}
                        >
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" id="forgot-password-form">
                        <Input
                            id="forgot-password-email"
                            type="email"
                            label="Email"
                            placeholder="kamu@email.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                        />

                        <Button
                            type="submit"
                            variant="black"
                            size="lg"
                            className="w-full"
                            loading={loading}
                            id="forgot-password-submit"
                        >
                            Kirim Link Reset Password
                        </Button>
                    </form>

                    <p className="font-mono text-sm text-nb-gray text-center mt-6 font-bold">
                        Kembali ke halaman login?{" "}
                        <Link
                            href="/sign-in"
                            className="text-nb-blue underline underline-offset-2"
                        >
                            Masuk
                        </Link>
                    </p>
                </div>

                <p className="text-center font-mono text-xs text-nb-gray mt-6">
                    © 2026 bikinqrisdinamis
                </p>
            </div>
        </div>
    );
}
