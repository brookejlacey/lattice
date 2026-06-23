"use client";

import { useState, useRef, useEffect, useMemo, FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { motion, AnimatePresence } from "framer-motion";
import IdentityGraph, {
  ServiceState,
  LifecycleEntry,
} from "./identity-graph";

// Which service each tool belongs to - the agent's only map from a tool call
// to an identity edge.
const TOOL_SERVICE: Record<string, string> = {
  listRepositories: "github",
  getRepoIssues: "github",
  getRepoPullRequests: "github",
  createIssue: "github",
  getWorkflowRuns: "github",
  getCalendarEvents: "google",
  searchEmails: "google",
  listDriveFiles: "google",
  listSlackChannels: "slack",
  getSlackMessages: "slack",
  sendSlackMessage: "slack",
};

// Auth0 connection name (from the Token Vault interrupt) → service node.
const CONNECTION_SERVICE: Record<string, string> = {
  github: "github",
  "google-oauth2": "google",
  "sign-in-with-slack": "slack",
};

const SERVICE_LABEL: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  slack: "Slack",
};

// Builds the /auth/login URL that grants a federated connection into the Token
// Vault. requiredScopes come straight off the interrupt the agent raised.
function connectUrl(connection: string, requiredScopes: string[]) {
  const params = new URLSearchParams({
    connection,
    returnTo: "/agent",
    access_type: "offline",
    prompt: "consent",
  });
  if (requiredScopes?.length) {
    params.set("connection_scope", requiredScopes.join(","));
  }
  return `/auth/login?${params.toString()}`;
}

export default function Chat() {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // useInterruptions invokes this creator synchronously and unconditionally on
  // every render, so useChat keeps a stable hook order. The lint rule can't see
  // that through the callback, hence the targeted disable.
  const { messages, sendMessage, status, error, toolInterrupt } =
    useInterruptions((errorHandler) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useChat({
        onError: errorHandler((e) => console.error(e)),
      })
    );

  const isLoading = status === "streaming" || status === "submitted";

  // Derive the identity graph + token lifecycle from REAL message + interrupt
  // state - nothing here is simulated or timer-driven.
  const { serviceStatus, lifecycle } = useMemo(() => {
    const serviceStatus: Record<string, ServiceState> = {
      github: "idle",
      google: "idle",
      slack: "idle",
    };
    const lifecycle: LifecycleEntry[] = [];

    let order = 0;
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (!part.type?.startsWith("tool-")) continue;
        const toolName = part.type.replace("tool-", "");
        const service = TOOL_SERVICE[toolName];
        if (!service) continue;

        const state = (part as { state?: string }).state;
        const callId =
          (part as { toolCallId?: string }).toolCallId ??
          `${toolName}-${order++}`;

        if (state === "output-available") {
          serviceStatus[service] = "active";
          lifecycle.push({
            id: callId,
            service,
            detail: toolName,
            kind: "used",
          });
        } else if (
          state === "input-available" ||
          state === "input-streaming"
        ) {
          if (serviceStatus[service] === "idle") {
            serviceStatus[service] = "acquiring";
          }
        }
      }
    }

    // A live Token Vault interrupt means the agent is waiting on the user to
    // approve a brand-new connection.
    if (toolInterrupt) {
      const connection: string | undefined = toolInterrupt.connection;
      const service = connection
        ? CONNECTION_SERVICE[connection] ?? connection
        : undefined;
      if (service && service in serviceStatus) {
        serviceStatus[service] = "connecting";
        lifecycle.push({
          id: `consent-${connection}`,
          service,
          detail: "consent requested",
          kind: "consent",
        });
      }
    }

    return { serviceStatus, lifecycle };
  }, [messages, toolInterrupt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleConnect = () => {
    if (!toolInterrupt) return;
    const connection: string = toolInterrupt.connection;
    const requiredScopes: string[] =
      toolInterrupt.requiredScopes ?? toolInterrupt.scopes ?? [];
    const url = connectUrl(connection, requiredScopes);
    const resume = toolInterrupt.resume;

    const popup = window.open(url, "lattice-connect", "width=520,height=720");
    if (!popup) {
      // Popup blocked - fall back to a full-page redirect.
      window.location.href = url;
      return;
    }
    // When the consent window closes, retry the interrupted tool. If the grant
    // didn't land, the agent simply raises the interrupt again - safe to retry.
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        resume();
      }
    }, 600);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const suggestedPrompts = [
    "What repos do I have? Check my recent activity across GitHub.",
    "Investigate my deployment status - check GitHub Actions and correlate with any recent issues.",
    "What's on my calendar today? Cross-reference with any relevant Slack discussions.",
    "Find all open PRs across my repos and summarize what needs my attention.",
  ];

  const interruptService: string | undefined = toolInterrupt
    ? CONNECTION_SERVICE[toolInterrupt.connection ?? ""] ??
      toolInterrupt.connection
    : undefined;

  return (
    <div className="flex h-full gap-6 w-full">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-8 py-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-white">
                  Identity graph: empty
                </h2>
                <p className="text-zinc-500 max-w-md">
                  Give me a goal. I&apos;ll discover what I need access to and
                  build my identity lattice in real-time.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left text-sm text-zinc-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-zinc-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                    message.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-white/5 text-zinc-300 border border-white/5"
                  }`}
                >
                  {message.parts?.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <div
                          key={i}
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                        >
                          {part.text}
                        </div>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as { state?: string };
                      return (
                        <div
                          key={i}
                          className="my-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-violet-400"
                        >
                          <span className="text-zinc-600">tool:</span>{" "}
                          {part.type.replace("tool-", "")}
                          {toolPart.state === "output-available" && (
                            <span className="text-emerald-500 ml-2">done</span>
                          )}
                          {toolPart.state === "output-error" && (
                            <span className="text-red-400 ml-2">error</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Token Vault consent - the runtime identity-acquisition moment */}
          {toolInterrupt && interruptService && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                New connection required
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                The agent needs authenticated access to{" "}
                <span className="font-medium text-white">
                  {SERVICE_LABEL[interruptService] ?? interruptService}
                </span>{" "}
                to continue. Approve the connection through Auth0 Token Vault to
                add this edge to the lattice.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleConnect}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
                >
                  Connect{" "}
                  {SERVICE_LABEL[interruptService] ?? interruptService}
                </button>
                <button
                  onClick={() => toolInterrupt.resume()}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  I&apos;ve connected - resume
                </button>
              </div>
            </motion.div>
          )}

          {isLoading && !toolInterrupt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-zinc-500"
            >
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]" />
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {error.message}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-3 pt-4">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Give me a mission..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-violet-500/20"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600"
          >
            Execute
          </button>
        </form>
      </div>

      {/* Identity Graph Sidebar */}
      <div className="hidden w-[420px] flex-col gap-4 lg:flex">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Identity Graph
          </h3>
          <IdentityGraph
            serviceStatus={serviceStatus}
            recentActions={lifecycle}
          />
        </div>

        {/* Token lifecycle log */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Token Lifecycle
          </h3>
          <div className="space-y-2">
            {lifecycle.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">
                No tokens acquired yet. Start a mission to build the lattice.
              </p>
            ) : (
              lifecycle.map((action) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs"
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      action.kind === "consent"
                        ? "bg-violet-400"
                        : "bg-emerald-500"
                    }`}
                  />
                  <span className="font-mono text-violet-400">
                    {action.service}
                  </span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-400 truncate">
                    {action.detail}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
