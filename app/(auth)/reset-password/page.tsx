import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ResetPasswordClientPage from "@/components/auth/ResetPasswordClientPage";

export default async function ResetPasswordPage() {
    const session = await auth();

    if (session?.user?.id) {
        redirect("/dashboard");
    }

    return <ResetPasswordClientPage />;
}
