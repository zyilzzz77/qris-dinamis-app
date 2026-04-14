import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import SupportClientPage from "@/components/dashboard/SupportClientPage";

export const metadata: Metadata = {
    title: "Support",
    description:
        "Kirim kendala aplikasi ke customer service bikinqrisdinamis dengan lampiran bukti foto atau video.",
};

export default async function SupportPage() {
    const session = await auth();
    const supportRecipientEmail =
        process.env.CUSTOMER_SERVICE_INBOX_EMAIL?.trim() ||
        process.env.SMTP_FROM_CUSTOMER_SERVICE?.trim() ||
        "customer-services@bikinqrisdinamis.app";

    if (!session?.user?.id) {
        redirect("/sign-in");
    }

    return (
        <SupportClientPage
            defaultEmail={session.user.email ?? ""}
            defaultName={session.user.name ?? null}
            supportRecipientEmail={supportRecipientEmail}
        />
    );
}