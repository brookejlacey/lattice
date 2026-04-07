import { auth0 } from "@/lib/auth0";
import Chat from "@/components/chat";

export default async function AgentPage() {
  const session = await auth0.getSession();

  return (
    <div className="flex min-h-screen flex-col bg-[#050510]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            L
          </div>
          <span className="font-mono text-sm font-semibold text-white tracking-wider">
            LATTICE
          </span>
          <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-400 border border-violet-500/20">
            agent
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500">
            {session?.user?.email}
          </span>
          <a
            href="/auth/logout"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            Logout
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden p-6">
        <Chat />
      </main>
    </div>
  );
}
