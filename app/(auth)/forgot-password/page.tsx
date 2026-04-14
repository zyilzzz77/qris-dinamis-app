import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ForgotPasswordClientPage from "@/components/auth/ForgotPasswordClientPage";

export default async function ForgotPasswordPage() {
    const session = await auth();

    if (session?.user?.id) {
        redirect("/dashboard");
    }

    return <ForgotPasswordClientPage />;
}
