"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function getAuthErrorMessage(errorCode?: string | null) {
    if (!errorCode || errorCode === "undefined" || errorCode === "null") {
        return "Login gagal. Silakan coba lagi.";
    }

    if (errorCode === "CredentialsSignin") {
        return "Email atau password salah, atau email belum diverifikasi.";
    }

    if (errorCode === "Configuration") {
        return "Konfigurasi login bermasalah. Coba lagi sebentar.";
    }

    return `Login gagal (${errorCode}).`;
}

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const urlError = searchParams.get("error");
        if (urlError) {
            setError(getAuthErrorMessage(urlError));
        }
    }, [searchParams]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                callbackUrl,
                redirect: false,
            });

            if (!result) {
                setError("Login gagal. Silakan coba lagi.");
                return;
            }

            if (result.error) {
                setError(getAuthErrorMessage(result.error));
                return;
            }

            if (result.ok === false) {
                setError("Login gagal. Silakan coba lagi.");
                return;
            }

            router.push(result.url || callbackUrl);
            router.refresh();
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
                        Platform QRIS Dinamis untuk UMKM INDONESIA
                    </p>
                </div>

                <div
                    className="bg-white p-8"
                    style={{
                        border: "3px solid #0D0D0D",
                        boxShadow: "8px 8px 0px #0D0D0D",
                    }}
                >
                    <h2 className="font-heading text-2xl text-nb-black mb-6">
                        Masuk ke Akun
                    </h2>

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

                    <form onSubmit={handleSubmit} className="space-y-5" id="sign-in-form">
                        <Input
                            id="sign-in-email"
                            type="email"
                            label="Email"
                            placeholder="kamu@email.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            autoComplete="email"
                        />
                        <Input
                            id="sign-in-password"
                            type="password"
                            label="Password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            autoComplete="current-password"
                        />

                        <Button
                            type="submit"
                            variant="black"
                            size="lg"
                            loading={loading}
                            className="w-full"
                            id="sign-in-submit"
                        >
                            Masuk →
                        </Button>
                    </form>

                    <p className="font-mono text-sm text-nb-gray text-center mt-6 font-bold">
                        Belum punya akun?{" "}
                        <Link
                            href="/sign-up"
                            className="text-nb-blue underline underline-offset-2"
                        >
                            Daftar Gratis
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

function SignInFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-nb-yellow pattern-dots p-4">
            <p className="font-mono text-sm font-bold text-nb-black">Memuat halaman login...</p>
        </div>
    );
}

export default function SignInClientPage() {
    return (
        <Suspense fallback={<SignInFallback />}>
            <SignInForm />
        </Suspense>
    );
}
