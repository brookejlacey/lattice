"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ServiceState = "idle" | "acquiring" | "connecting" | "active";

export interface LifecycleEntry {
  id: string;
  service: string;
  detail: string;
  kind: "consent" | "acquiring" | "used";
}

interface GraphNode {
  id: string;
  label: string;
  type: "agent" | "service";
  status: ServiceState;
  icon: string;
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  status: ServiceState;
}

interface IdentityGraphProps {
  serviceStatus: Record<string, ServiceState>;
  recentActions: LifecycleEntry[];
}

const SERVICE_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  github: { icon: "GH", color: "#8b5cf6", label: "GitHub" },
  google: { icon: "G", color: "#4285f4", label: "Google" },
  slack: { icon: "SL", color: "#e01e5a", label: "Slack" },
};

const ALL_SERVICES = ["github", "google", "slack"];

export default function IdentityGraph({
  serviceStatus,
  recentActions,
}: IdentityGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef<number>(0);

  // Derive graph geometry from real per-service status (no setState-in-effect).
  const { nodes, edges } = useMemo(() => {
    const centerX = 200;
    const centerY = 150;
    const radius = 110;

    const agentNode: GraphNode = {
      id: "agent",
      label: "LATTICE",
      type: "agent",
      status: "active",
      icon: "L",
      x: centerX,
      y: centerY,
    };

    const serviceNodes: GraphNode[] = ALL_SERVICES.map((s, i) => {
      const angle = (i * 2 * Math.PI) / ALL_SERVICES.length - Math.PI / 2;
      const config = SERVICE_CONFIG[s];
      return {
        id: s,
        label: config.label,
        type: "service" as const,
        status: serviceStatus[s] ?? "idle",
        icon: config.icon,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    const edges: GraphEdge[] = serviceNodes
      .filter((n) => n.status !== "idle")
      .map((n) => ({
        id: `agent-${n.id}`,
        from: "agent",
        to: n.id,
        status: n.status,
      }));

    return { nodes: [agentNode, ...serviceNodes], edges };
  }, [serviceStatus]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localParticles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }[] = [];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid background
      ctx.strokeStyle = "rgba(139, 92, 246, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Edges
      edges.forEach((edge) => {
        const fromNode = nodes.find((n) => n.id === edge.from);
        const toNode = nodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const config = SERVICE_CONFIG[toNode.id] || { color: "#8b5cf6" };
        const pending = edge.status === "connecting" || edge.status === "acquiring";

        if (pending) {
          ctx.strokeStyle = `${config.color}40`;
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = `${config.color}80`;
          ctx.setLineDash([]);
          ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Flowing particles only on fully-active (token-acquired) edges
        if (edge.status === "active" && Math.random() < 0.05) {
          localParticles.push({
            x: fromNode.x,
            y: fromNode.y,
            vx: (toNode.x - fromNode.x) * 0.02,
            vy: (toNode.y - fromNode.y) * 0.02,
            life: 50,
            color: config.color,
          });
        }
      });

      localParticles = localParticles
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
        .filter((p) => p.life > 0);

      localParticles.forEach((p) => {
        ctx.fillStyle = `${p.color}${Math.floor((p.life / 50) * 255)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Nodes
      nodes.forEach((node) => {
        const config = SERVICE_CONFIG[node.id] || {
          color: "#8b5cf6",
          icon: "L",
        };

        if (node.type === "agent") {
          const gradient = ctx.createRadialGradient(
            node.x,
            node.y,
            0,
            node.x,
            node.y,
            35
          );
          gradient.addColorStop(0, "rgba(139, 92, 246, 0.3)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 35, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#8b5cf6";
          ctx.beginPath();
          ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#fff";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("L", node.x, node.y);
        } else {
          const isActive = node.status === "active";
          const isPending =
            node.status === "connecting" || node.status === "acquiring";
          const nodeColor = config.color;

          if (isPending) {
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.3;
            const gradient = ctx.createRadialGradient(
              node.x,
              node.y,
              0,
              node.x,
              node.y,
              30
            );
            gradient.addColorStop(
              0,
              `${nodeColor}${Math.floor(pulse * 255)
                .toString(16)
                .padStart(2, "0")}`
            );
            gradient.addColorStop(1, `${nodeColor}00`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = isActive
            ? nodeColor
            : isPending
              ? `${nodeColor}80`
              : "#1a1a2e";
          ctx.strokeStyle = isActive || isPending ? nodeColor : "#333";
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isActive || isPending ? "#fff" : "#555";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(config.icon, node.x, node.y);

          ctx.fillStyle = isActive ? "#e2e8f0" : "#555";
          ctx.font = "10px sans-serif";
          ctx.fillText(node.label, node.x, node.y + 28);
        }
      });

      const agentNode = nodes.find((n) => n.id === "agent");
      if (agentNode) {
        ctx.fillStyle = "#c4b5fd";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LATTICE", agentNode.x, agentNode.y + 34);
      }

      animFrame.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animFrame.current);
  }, [nodes, edges]);

  const activeCount = Object.values(serviceStatus).filter(
    (s) => s === "active"
  ).length;

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="w-full rounded-xl border border-white/5 bg-[#0a0a1a]"
      />
      {/* Live edge count */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          {activeCount} active {activeCount === 1 ? "edge" : "edges"}
        </div>
      </div>
      {/* Recent actions feed */}
      <AnimatePresence>
        {recentActions.slice(-3).map((action, i) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-3 text-xs text-zinc-500"
            style={{ bottom: 12 + i * 18 }}
          >
            <span className="text-violet-400">
              {SERVICE_CONFIG[action.service]?.label || action.service}
            </span>{" "}
            → {action.detail}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
