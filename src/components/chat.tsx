"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import IdentityGraph from "./identity-graph";

interface LatticeEvent {
  service: string;
  action: string;
  timestamp: number;
}

export default function Chat() {
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [pendingConnection, setPendingConnection] = useState<string | null>(
    null
  );
  const [recentActions, setRecentActions] = useState<LatticeEvent[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    onToolCall: ({ toolCall }) => {
      const toolName = toolCall.toolName;
      let service = "";

      if (
        toolName === "listRepositories" ||
        toolName === "getRepoIssues" ||
        toolName === "getRepoPullRequests" ||
        toolName === "createIssue" ||
        toolName === "getWorkflowRuns"
      ) {
        service = "github";
      } else if (
        toolName === "getCalendarEvents" ||
        toolName === "searchEmails" ||
        toolName === "listDriveFiles"
      ) {
        service = "google";
      } else if (
        toolName === "listSlackChannels" ||
        toolName === "getSlackMessages" ||
        toolName === "sendSlackMessage"
      ) {
        service = "slack";
      }

      if (service) {
        setPendingConnection(service);
        setTimeout(() => {
          setActiveConnections((prev) =>
            prev.includes(service) ? prev : [...prev, service]
          );
          setPendingConnection(null);
          setRecentActions((prev) => [
            ...prev.slice(-10),
            { service, action: toolName, timestamp: Date.now() },
          ]);
        }, 1500);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    "Investigate my deployment status — check GitHub Actions and correlate with any recent issues.",
    "What's on my calendar today? Cross-reference with any relevant Slack discussions.",
    "Find all open PRs across my repos and summarize what needs my attention.",
  ];

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
                      const toolPart = part as any;
                      return (
                        <div
                          key={i}
                          className="my-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-violet-400"
                        >
                          <span className="text-zinc-600">tool:</span>{" "}
                          {part.type.replace("tool-", "")}
                          {toolPart.state === "result" && (
                            <span className="text-emerald-500 ml-2">done</span>
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

          {isLoading && (
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
              {pendingConnection && (
                <span>
                  Acquiring{" "}
                  <span className="text-violet-400">{pendingConnection}</span>{" "}
                  token...
                </span>
              )}
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
            activeConnections={activeConnections}
            pendingConnection={pendingConnection}
            recentActions={recentActions}
          />
        </div>

        {/* Token lifecycle log */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Token Lifecycle
          </h3>
          <div className="space-y-2">
            {recentActions.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">
                No tokens acquired yet. Start a mission to build the lattice.
              </p>
            ) : (
              recentActions.map((action) => (
                <motion.div
                  key={action.timestamp}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-violet-400">
                    {action.service}
                  </span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-400 truncate">
                    {action.action}
                  </span>
                  <span className="ml-auto text-zinc-700">
                    {new Date(action.timestamp).toLocaleTimeString()}
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
