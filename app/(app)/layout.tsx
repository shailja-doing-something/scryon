import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { BackgroundGraphics } from "@/components/BackgroundGraphics";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-canvas relative">
      <BackgroundGraphics />
      <Nav />
      <main className="flex-1 ml-60 min-h-screen relative" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
