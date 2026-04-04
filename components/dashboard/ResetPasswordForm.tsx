"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type ResetPasswordResponse = {
    success?: boolean;
    message?: string;
    error?: string;
};

export default function ResetPasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setError("Semua field password wajib diisi.");
            return;
        }

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
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentPassword,
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

            if (!response.ok || !data?.success) {
                setError(data?.error || `Gagal reset password (HTTP ${response.status}).`);
                return;
            }

            setSuccess(data.message || "Password berhasil diperbarui.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch {
            setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="card-nb p-6">
            <div className="flex items-center gap-2 mb-4">
                <KeyRound size={18} className="text-nb-black" />
                <h2 className="font-heading text-2xl text-nb-black">Reset Password</h2>
            </div>
            <p className="font-mono text-sm text-nb-gray font-bold mb-5">
                Gunakan password minimal 8 karakter agar akun lebih aman.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                    id="current-password"
                    label="Password Saat Ini"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Masukkan password saat ini"
                    autoComplete="current-password"
                />

                <Input
                    id="new-password"
                    label="Password Baru"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                />

                <Input
                    id="confirm-new-password"
                    label="Konfirmasi Password Baru"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                />

                {error && (
                    <div
                        className="p-3 font-mono text-sm font-bold text-white"
                        style={{
                            backgroundColor: "#FF3B3B",
                            border: "2px solid #0D0D0D",
                        }}
                    >
                        ⚠ {error}
                    </div>
                )}

                {success && (
                    <div
                        className="p-3 font-mono text-sm font-bold"
                        style={{
                            backgroundColor: "#00C853",
                            border: "2px solid #0D0D0D",
                            color: "#0D0D0D",
                        }}
                    >
                        ✓ {success}
                    </div>
                )}

                <Button
                    type="submit"
                    variant="black"
                    loading={loading}
                    className="w-full sm:w-auto"
                >
                    Simpan Password Baru
                </Button>
            </form>
        </section>
    );
}
