"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GraphNode {
  id: string;
  label: string;
  type: "agent" | "service" | "action";
  status: "idle" | "connecting" | "active" | "used" | "revoked";
  icon: string;
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  status: "pending" | "active" | "transferring" | "revoked";
  label?: string;
  timestamp: number;
}

interface IdentityGraphProps {
  activeConnections: string[];
  pendingConnection?: string | null;
  recentActions: { service: string; action: string; timestamp: number }[];
}

const SERVICE_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  github: { icon: "GH", color: "#8b5cf6", label: "GitHub" },
  "google-oauth2": { icon: "G", color: "#4285f4", label: "Google" },
  google: { icon: "G", color: "#4285f4", label: "Google" },
  "sign-in-with-slack": { icon: "SL", color: "#e01e5a", label: "Slack" },
  slack: { icon: "SL", color: "#e01e5a", label: "Slack" },
  linear: { icon: "LN", color: "#5e6ad2", label: "Linear" },
  notion: { icon: "NT", color: "#000000", label: "Notion" },
};

export default function IdentityGraph({
  activeConnections,
  pendingConnection,
  recentActions,
}: IdentityGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef<number>(0);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [particles, setParticles] = useState<
    { x: number; y: number; vx: number; vy: number; life: number; color: string }[]
  >([]);

  // Build graph from connections
  useEffect(() => {
    const allServices = [
      "github",
      "google",
      "slack",
      "linear",
      "notion",
    ];
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

    const serviceNodes: GraphNode[] = allServices.map((s, i) => {
      const angle = (i * 2 * Math.PI) / allServices.length - Math.PI / 2;
      const config = SERVICE_CONFIG[s] || {
        icon: "?",
        color: "#666",
        label: s,
      };
      const isActive = activeConnections.some(
        (c) =>
          c === s ||
          c === `${s}-oauth2` ||
          c === `sign-in-with-${s}` ||
          SERVICE_CONFIG[c]?.label.toLowerCase() === s
      );
      const isPending =
        pendingConnection &&
        (pendingConnection === s ||
          SERVICE_CONFIG[pendingConnection]?.label.toLowerCase() === s);

      return {
        id: s,
        label: config.label,
        type: "service" as const,
        status: isPending
          ? ("connecting" as const)
          : isActive
            ? ("active" as const)
            : ("idle" as const),
        icon: config.icon,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    const newEdges: GraphEdge[] = serviceNodes
      .filter((n) => n.status === "active" || n.status === "connecting")
      .map((n) => ({
        id: `agent-${n.id}`,
        from: "agent",
        to: n.id,
        status:
          n.status === "connecting"
            ? ("pending" as const)
            : ("active" as const),
        timestamp: Date.now(),
      }));

    setNodes([agentNode, ...serviceNodes]);
    setEdges(newEdges);
  }, [activeConnections, pendingConnection]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localParticles: typeof particles = [];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid background
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

      // Draw edges
      edges.forEach((edge) => {
        const fromNode = nodes.find((n) => n.id === edge.from);
        const toNode = nodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const config = SERVICE_CONFIG[toNode.id] || { color: "#8b5cf6" };

        if (edge.status === "pending") {
          ctx.strokeStyle = `${config.color}40`;
          ctx.setLineDash([5, 5]);
        } else {
          ctx.strokeStyle = `${config.color}80`;
          ctx.setLineDash([]);
        }
        ctx.lineWidth = edge.status === "active" ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Flowing particles on active edges
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

      // Update and draw particles
      localParticles = localParticles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 1,
        }))
        .filter((p) => p.life > 0);

      localParticles.forEach((p) => {
        ctx.fillStyle = `${p.color}${Math.floor((p.life / 50) * 255)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((node) => {
        const config = SERVICE_CONFIG[node.id] || {
          color: "#8b5cf6",
          icon: "L",
        };

        if (node.type === "agent") {
          // Agent node - glowing center
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
          // Service nodes
          const isActive = node.status === "active";
          const isConnecting = node.status === "connecting";
          const nodeColor = config.color;

          if (isConnecting) {
            // Pulsing glow for connecting
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.3;
            const gradient = ctx.createRadialGradient(
              node.x,
              node.y,
              0,
              node.x,
              node.y,
              30
            );
            gradient.addColorStop(0, `${nodeColor}${Math.floor(pulse * 255).toString(16).padStart(2, "0")}`);
            gradient.addColorStop(1, `${nodeColor}00`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
            ctx.fill();
          }

          // Node circle
          ctx.fillStyle = isActive
            ? nodeColor
            : isConnecting
              ? `${nodeColor}80`
              : "#1a1a2e";
          ctx.strokeStyle = isActive
            ? nodeColor
            : isConnecting
              ? nodeColor
              : "#333";
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Icon text
          ctx.fillStyle = isActive || isConnecting ? "#fff" : "#555";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(config.icon, node.x, node.y);

          // Label
          ctx.fillStyle = isActive ? "#e2e8f0" : "#555";
          ctx.font = "10px sans-serif";
          ctx.fillText(node.label, node.x, node.y + 28);
        }
      });

      // Agent label
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

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="w-full rounded-xl border border-white/5 bg-[#0a0a1a]"
      />
      {/* Connection count */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          {activeConnections.length} active{" "}
          {activeConnections.length === 1 ? "edge" : "edges"}
        </div>
      </div>
      {/* Recent actions feed */}
      <AnimatePresence>
        {recentActions.slice(-3).map((action, i) => (
          <motion.div
            key={action.timestamp}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-3 text-xs text-zinc-500"
            style={{ bottom: 12 + i * 18 }}
          >
            <span className="text-violet-400">
              {SERVICE_CONFIG[action.service]?.label || action.service}
            </span>{" "}
            → {action.action}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
