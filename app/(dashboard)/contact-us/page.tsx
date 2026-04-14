import type { Metadata } from "next";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
    title: "Contact Us",
    description: "Hubungi tim bikinqrisdinamis melalui WhatsApp, Instagram, atau Email.",
};

const CONTACT_LINKS = [
    {
        id: "wa",
        label: "WhatsApp",
        value: "wa.me/6283872749541",
        href: "https://wa.me/6283872749541",
        buttonVariant: "green" as const,
    },
    {
        id: "ig",
        label: "Instagram",
        value: "@zyilzzz",
        href: "https://instagram.com/zyilzzz",
        buttonVariant: "primary" as const,
    },
    {
        id: "email",
        label: "Email",
        value: "customer-services@bikinqrisdinamis.app",
        href: "mailto:customer-services@bikinqrisdinamis.app",
        buttonVariant: "black" as const,
    },
];

export default function ContactUsPage() {
    return (
        <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
            <div className="mb-6">
                <h1 className="font-heading text-3xl lg:text-4xl text-nb-black">Contact Us</h1>
                <p className="font-sans text-sm text-nb-gray mt-2">
                    Jika kamu butuh bantuan atau ingin kerja sama, hubungi kami melalui salah
                    satu kanal di bawah ini.
                </p>
            </div>

            <section className="grid sm:grid-cols-3 gap-4">
                {CONTACT_LINKS.map((contact) => (
                    <article key={contact.id} className="card-nb p-5 flex flex-col gap-4">
                        <div>
                            <h2 className="font-heading text-xl text-nb-black">{contact.label}</h2>
                            <p className="font-mono text-xs text-nb-gray font-bold mt-1 break-all">
                                {contact.value}
                            </p>
                        </div>

                        <a href={contact.href} target="_blank" rel="noopener noreferrer">
                            <Button variant={contact.buttonVariant} className="w-full">
                                Buka {contact.label}
                            </Button>
                        </a>
                    </article>
                ))}
            </section>
        </div>
    );
}
