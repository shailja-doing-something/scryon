import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { ChatBot } from "@/components/ChatBot";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-canvas">
      <Nav />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
      <ChatBot />
    </div>
  );
}
