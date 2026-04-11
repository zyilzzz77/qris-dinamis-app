"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SignUpClientPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationEmail, setVerificationEmail] = useState("");
    const [isVerificationStage, setIsVerificationStage] = useState(false);
    const [infoMessage, setInfoMessage] = useState("");
    const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        if (resendCooldownSeconds <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setResendCooldownSeconds((current) => {
                if (current <= 1) {
                    clearInterval(timer);
                    return 0;
                }

                return current - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [resendCooldownSeconds]);

    async function handleRegisterSubmit(event: FormEvent) {
        event.preventDefault();
        setError("");
        setInfoMessage("");

        if (password !== confirmPassword) {
            setError("Password dan konfirmasi password tidak cocok.");
            return;
        }

        if (password.length < 8) {
            setError("Password minimal 8 karakter.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Gagal registrasi.");
                return;
            }

            setVerificationEmail(String(data?.data?.email || email).trim().toLowerCase());
            setIsVerificationStage(true);
            setInfoMessage(
                data.message || "Registrasi berhasil. Cek email kamu untuk kode verifikasi."
            );
            setResendCooldownSeconds(60);
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerificationSubmit(event: FormEvent) {
        event.preventDefault();
        setError("");
        setInfoMessage("");

        const normalizedCode = verificationCode.trim();
        if (!/^\d{6}$/.test(normalizedCode)) {
            setError("Kode verifikasi harus 6 digit angka.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: verificationEmail, code: normalizedCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Verifikasi gagal.");
                return;
            }

            const signInResult = await signIn("credentials", {
                email: verificationEmail,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                setInfoMessage("Email berhasil diverifikasi. Silakan login untuk lanjut.");
                router.push("/sign-in");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResendCode() {
        setError("");
        setInfoMessage("");
        setResendLoading(true);

        try {
            const response = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: verificationEmail }),
            });

            const data = await response.json();
            const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "0", 10);

            if (!response.ok) {
                if (Number.isFinite(retryAfter) && retryAfter > 0) {
                    setResendCooldownSeconds(retryAfter);
                }

                setError(data.error || "Gagal kirim ulang kode verifikasi.");
                return;
            }

            setInfoMessage(data.message || "Kode verifikasi baru sudah dikirim.");
            setResendCooldownSeconds(60);
        } catch {
            setError("Terjadi kesalahan saat kirim ulang kode.");
        } finally {
            setResendLoading(false);
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
                        Daftar Gratis — Mulai Sekarang
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
                        {isVerificationStage ? "Verifikasi Email" : "Buat Akun Baru"}
                    </h2>

                    {infoMessage && (
                        <div
                            className="mb-4 p-3 font-mono text-sm font-bold text-nb-black"
                            style={{
                                backgroundColor: "#9FD9B4",
                                border: "2px solid #0D0D0D",
                            }}
                        >
                            {infoMessage}
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

                    {!isVerificationStage ? (
                        <form
                            onSubmit={handleRegisterSubmit}
                            className="space-y-5"
                            id="sign-up-form"
                        >
                            <Input
                                id="sign-up-name"
                                type="text"
                                label="Nama Lengkap"
                                placeholder="Ahmad Santoso"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                required
                                autoComplete="name"
                            />
                            <Input
                                id="sign-up-email"
                                type="email"
                                label="Email"
                                placeholder="kamu@email.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                autoComplete="email"
                            />
                            <Input
                                id="sign-up-password"
                                type="password"
                                label="Password"
                                placeholder="Min. 8 karakter"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                hint="Minimal 8 karakter"
                                required
                                autoComplete="new-password"
                            />
                            <Input
                                id="sign-up-confirm-password"
                                type="password"
                                label="Konfirmasi Password"
                                placeholder="Ulangi password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                required
                                autoComplete="new-password"
                            />

                            <Button
                                type="submit"
                                variant="black"
                                size="lg"
                                loading={loading}
                                className="w-full"
                                id="sign-up-submit"
                            >
                                Buat Akun Gratis
                            </Button>
                        </form>
                    ) : (
                        <form
                            onSubmit={handleVerificationSubmit}
                            className="space-y-5"
                            id="verify-email-form"
                        >
                            <Input
                                id="verify-email-address"
                                type="email"
                                label="Email"
                                value={verificationEmail}
                                readOnly
                                disabled
                            />
                            <Input
                                id="verify-email-code"
                                type="text"
                                label="Kode Verifikasi"
                                placeholder="6 digit kode"
                                value={verificationCode}
                                onChange={(event) => setVerificationCode(event.target.value)}
                                required
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                autoComplete="one-time-code"
                            />

                            <Button
                                type="submit"
                                variant="black"
                                size="lg"
                                loading={loading}
                                className="w-full"
                                id="verify-email-submit"
                            >
                                Verifikasi Email
                            </Button>

                            <Button
                                type="button"
                                variant="white"
                                size="md"
                                loading={resendLoading}
                                className="w-full"
                                id="verify-email-resend"
                                disabled={resendCooldownSeconds > 0 || resendLoading}
                                onClick={handleResendCode}
                            >
                                {resendCooldownSeconds > 0
                                    ? `Kirim Ulang (${resendCooldownSeconds}s)`
                                    : "Kirim Ulang Kode"}
                            </Button>
                        </form>
                    )}

                    <p className="font-mono text-sm text-nb-gray text-center mt-6 font-bold">
                        Sudah punya akun?{" "}
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
