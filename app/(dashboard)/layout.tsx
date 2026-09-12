import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/Toaster";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<LoadingScreen />}>
          {children}
        </Suspense>
      </main>
      <Toaster />
    </div>
  );
}
