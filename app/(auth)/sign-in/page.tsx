import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignInClientPage from "@/components/auth/SignInClientPage";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <SignInClientPage />;
}
