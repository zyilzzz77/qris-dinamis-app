"use client";

import { useState, FormEvent } from "react";
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
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError("");

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

            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
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
                        Buat Akun Baru
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

                    <form onSubmit={handleSubmit} className="space-y-5" id="sign-up-form">
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
