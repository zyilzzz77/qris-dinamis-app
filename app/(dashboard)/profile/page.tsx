import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, Code2, Mail, ReceiptText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countApiRequestsByUserAndRange } from "@/lib/api-request-log";
import ProfilePhotoUploader from "@/components/dashboard/ProfilePhotoUploader";
import MonthlyTransactionExport from "@/components/dashboard/MonthlyTransactionExport";
import ResetPasswordForm from "@/components/dashboard/ResetPasswordForm";

export const metadata: Metadata = {
    title: "Profil",
    description: "Kelola profil akun dan keamanan akun kamu.",
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/sign-in?callbackUrl=/profile");
    }

    const userId = session.user.id as string;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [user, totalTransactionsThisMonth, totalApiRequestsThisMonth] =
        await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    name: true,
                    email: true,
                    image: true,
                    createdAt: true,
                },
            }),
            prisma.transaction.count({
                where: {
                    userId,
                    createdAt: {
                        gte: monthStart,
                        lt: nextMonthStart,
                    },
                },
            }),
            countApiRequestsByUserAndRange(userId, monthStart, nextMonthStart),
        ]);

    if (!user) {
        redirect("/sign-in");
    }

    const monthLabel = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
    }).format(now);

    const joinedAt = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
    }).format(user.createdAt);

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 lg:pb-0">
            <section>
                <h1 className="font-heading text-3xl lg:text-4xl text-nb-black">Profil Akun</h1>
                <p className="font-mono text-sm text-nb-gray font-bold mt-1">
                    Kelola data akun, keamanan password, dan ringkasan aktivitas bulan ini.
                </p>
            </section>

            <section className="card-nb p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <ProfilePhotoUploader
                        initialImage={user.image}
                        displayName={user.name || user.email || "User"}
                    />

                    <div className="flex-1 space-y-2 min-w-0">
                        <h2 className="font-heading text-2xl text-nb-black truncate">
                            {user.name || "User"}
                        </h2>

                        <div className="flex items-center gap-2 font-mono text-sm text-nb-gray font-bold min-w-0">
                            <Mail size={14} />
                            <span className="truncate">{user.email}</span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-sm text-nb-gray font-bold">
                            <CalendarClock size={14} />
                            <span>Bergabung sejak {joinedAt}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-nb p-5" style={{ borderLeftWidth: 4, borderLeftColor: "#00C853" }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-xs font-bold text-nb-gray uppercase tracking-wider">
                            Total Transaksi ({monthLabel})
                        </p>
                        <ReceiptText size={18} color="#00C853" />
                    </div>
                    <p className="font-heading text-4xl text-nb-black">
                        {numberFormatter.format(totalTransactionsThisMonth)}
                    </p>
                </div>

                <div className="card-nb p-5" style={{ borderLeftWidth: 4, borderLeftColor: "#2563FF" }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-xs font-bold text-nb-gray uppercase tracking-wider">
                            Total Request REST API ({monthLabel})
                        </p>
                        <Code2 size={18} color="#2563FF" />
                    </div>
                    <p className="font-heading text-4xl text-nb-black">
                        {numberFormatter.format(totalApiRequestsThisMonth)}
                    </p>
                    <p className="font-mono text-xs text-nb-gray mt-2">
                        Dihitung dari seluruh endpoint REST API yang tercatat di database log.
                    </p>
                </div>
            </section>

            <MonthlyTransactionExport />

            <ResetPasswordForm />
        </div>
    );
}
