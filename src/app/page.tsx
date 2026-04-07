import Link from "next/link";

function LatticeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Center node */}
      <circle cx="50" cy="50" r="8" fill="#8b5cf6" />
      <circle cx="50" cy="50" r="12" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />

      {/* Outer nodes */}
      <circle cx="50" cy="15" r="5" fill="#4285f4" />
      <circle cx="82" cy="32" r="5" fill="#e01e5a" />
      <circle cx="82" cy="68" r="5" fill="#5e6ad2" />
      <circle cx="50" cy="85" r="5" fill="#34a853" />
      <circle cx="18" cy="68" r="5" fill="#ff6b35" />
      <circle cx="18" cy="32" r="5" fill="#1da1f2" />

      {/* Edges */}
      <line x1="50" y1="50" x2="50" y2="15" stroke="#4285f4" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="50" x2="82" y2="32" stroke="#e01e5a" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="50" x2="82" y2="68" stroke="#5e6ad2" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="50" x2="50" y2="85" stroke="#34a853" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="50" x2="18" y2="68" stroke="#ff6b35" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="50" x2="18" y2="32" stroke="#1da1f2" strokeWidth="1" opacity="0.5" />

      {/* Animated pulse on center */}
      <circle cx="50" cy="50" r="20" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.15">
        <animate attributeName="r" values="15;25;15" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050510] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
            L
          </div>
          <span className="font-mono text-lg font-semibold tracking-wider">
            LATTICE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/brookejlacey/lattice"
            target="_blank"
            className="text-sm text-zinc-500 transition-colors hover:text-white"
          >
            GitHub
          </a>
          <Link
            href="/agent"
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium transition-all hover:bg-violet-500"
          >
            Launch Agent
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-8">
        <div className="max-w-4xl text-center space-y-8">
          {/* Animated lattice icon */}
          <div className="flex justify-center">
            <LatticeIcon className="h-32 w-32" />
          </div>

          <h1 className="text-6xl font-bold leading-tight tracking-tight sm:text-7xl">
            Identity that
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              grows at runtime
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-400">
            LATTICE is an autonomous AI agent that starts with zero connections.
            Give it a goal — it discovers what services it needs, acquires
            authenticated access through Auth0 Token Vault in real-time, and
            builds an expanding identity graph as it works.
          </p>

          <div className="flex justify-center gap-4">
            <Link
              href="/agent"
              className="group rounded-xl bg-violet-600 px-8 py-4 text-base font-semibold transition-all hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/25"
            >
              Launch Agent
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-white/10 px-8 py-4 text-base font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/5"
            >
              How It Works
            </a>
          </div>
        </div>
      </main>

      {/* How it works */}
      <section id="how-it-works" className="px-8 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-16 text-center text-3xl font-bold">
            Dynamic Identity Acquisition
          </h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Zero-knowledge start",
                description:
                  "The agent begins with no service connections. No pre-configured integrations. Just a goal from you.",
                color: "violet",
              },
              {
                step: "02",
                title: "Runtime discovery",
                description:
                  "As the agent works, it discovers which services it needs. Token Vault handles OAuth flows, consent, and token management automatically.",
                color: "purple",
              },
              {
                step: "03",
                title: "Expanding lattice",
                description:
                  "Each new connection adds an edge to the identity graph. Watch the lattice grow in real-time as the agent chains across services.",
                color: "fuchsia",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.03]"
              >
                <div className="mb-4 text-sm font-mono text-violet-500">
                  {item.step}
                </div>
                <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Token Vault Features */}
      <section className="px-8 py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold">
            Powered by Auth0 Token Vault
          </h2>
          <p className="mb-16 text-center text-zinc-500 max-w-2xl mx-auto">
            Every feature of Token Vault working together — not as configuration, but as emergent runtime behavior.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Async Auth",
                desc: "Agent requests access while you're away. Approve from any device.",
                icon: "⟳",
              },
              {
                title: "Step-Up Auth",
                desc: "Sensitive actions trigger elevated consent. Permissions escalate, then revoke.",
                icon: "↑",
              },
              {
                title: "Token Lifecycle",
                desc: "Tokens acquired, used, refreshed, and revoked — all visible in real-time.",
                icon: "◎",
              },
              {
                title: "Consent Delegation",
                desc: "You control what each connection can do. The agent operates within your boundaries.",
                icon: "◈",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-6"
              >
                <div className="mb-3 text-2xl">{item.icon}</div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <div className="h-5 w-5 rounded bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
              L
            </div>
            LATTICE
          </div>
          <div className="text-xs text-zinc-700">
            Built for the Auth0 Authorized to Act Hackathon
          </div>
        </div>
      </footer>
    </div>
  );
}
