import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignUpClientPage from "@/components/auth/SignUpClientPage";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <SignUpClientPage />;
}
