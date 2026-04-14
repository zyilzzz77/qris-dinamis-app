"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type ResetPasswordResponse = {
    success?: boolean;
    message?: string;
    error?: string;
};

function PasswordToggleButton({
    visible,
    onToggle,
    inputId,
}: {
    visible: boolean;
    onToggle: () => void;
    inputId: string;
}) {
    return (
        <button
            type="button"
            aria-label={visible ? "Sembunyikan password" : "Lihat password"}
            aria-controls={inputId}
            onClick={onToggle}
            className="text-nb-gray hover:text-nb-black transition-colors"
        >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
    );
}

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = String(searchParams.get("token") ?? "").trim();
    const emailHint = String(searchParams.get("email") ?? "").trim();

    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isTokenMissing = token.length === 0;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword.length < 8) {
            setError("Password baru minimal 8 karakter.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError("Konfirmasi password baru tidak cocok.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    newPassword,
                    confirmNewPassword,
                }),
            });

            let data: ResetPasswordResponse | null = null;
            try {
                data = (await response.json()) as ResetPasswordResponse;
            } catch {
                data = null;
            }

            if (!response.ok) {
                setError(data?.error || "Reset password gagal. Silakan coba lagi.");
                return;
            }

            setSuccess(data?.message || "Password berhasil direset.");

            setTimeout(() => {
                router.push("/sign-in?reset=success");
            }, 1000);
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
                        Buat password baru akun kamu
                    </p>
                </div>

                <div
                    className="bg-white p-8"
                    style={{
                        border: "3px solid #0D0D0D",
                        boxShadow: "8px 8px 0px #0D0D0D",
                    }}
                >
                    <h2 className="font-heading text-2xl text-nb-black mb-6">Reset Password</h2>

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

                    {isTokenMissing ? (
                        <div className="space-y-4">
                            <p className="font-mono text-sm text-nb-gray font-bold">
                                Link reset password tidak valid. Coba minta link baru.
                            </p>
                            <Link
                                href="/forgot-password"
                                className="inline-block font-mono text-sm text-nb-blue underline underline-offset-2"
                            >
                                Minta Link Reset Baru
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5" id="reset-password-public-form">
                            {emailHint && (
                                <Input
                                    id="reset-password-email"
                                    type="email"
                                    label="Email"
                                    value={emailHint}
                                    readOnly
                                    disabled
                                />
                            )}

                            <Input
                                id="reset-password-new-password"
                                type={showNewPassword ? "text" : "password"}
                                label="Password Baru"
                                placeholder="Minimal 8 karakter"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                autoComplete="new-password"
                                required
                                rightIcon={
                                    <PasswordToggleButton
                                        visible={showNewPassword}
                                        onToggle={() => setShowNewPassword((current) => !current)}
                                        inputId="reset-password-new-password"
                                    />
                                }
                            />

                            <Input
                                id="reset-password-confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                label="Konfirmasi Password Baru"
                                placeholder="Ulangi password baru"
                                value={confirmNewPassword}
                                onChange={(event) => setConfirmNewPassword(event.target.value)}
                                autoComplete="new-password"
                                required
                                rightIcon={
                                    <PasswordToggleButton
                                        visible={showConfirmPassword}
                                        onToggle={() => setShowConfirmPassword((current) => !current)}
                                        inputId="reset-password-confirm-password"
                                    />
                                }
                            />

                            <Button
                                type="submit"
                                variant="black"
                                size="lg"
                                className="w-full"
                                loading={loading}
                                id="reset-password-public-submit"
                            >
                                Simpan Password Baru
                            </Button>
                        </form>
                    )}

                    <p className="font-mono text-sm text-nb-gray text-center mt-6 font-bold">
                        Kembali ke login?{" "}
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

function ResetPasswordFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-nb-yellow pattern-dots p-4">
            <p className="font-mono text-sm font-bold text-nb-black">Memuat halaman reset password...</p>
        </div>
    );
}

export default function ResetPasswordClientPage() {
    return (
        <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
