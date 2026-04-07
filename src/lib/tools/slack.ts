import { tool } from "ai";
import { z } from "zod";
import { withSlack } from "@/lib/auth0-ai";
import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";

export const listSlackChannels = withSlack(
  tool({
    description:
      "List Slack channels the user has access to. Use to find relevant communication channels.",
    inputSchema: z.object({
      limit: z.number().default(20).describe("Max channels to return"),
    }),
    execute: async ({ limit }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch(
        `https://slack.com/api/conversations.list?limit=${limit}&types=public_channel,private_channel`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();
      return (data.channels || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        topic: c.topic?.value,
        purpose: c.purpose?.value,
        members: c.num_members,
      }));
    },
  })
);

export const getSlackMessages = withSlack(
  tool({
    description:
      "Get recent messages from a Slack channel. Use to understand conversation context or find information.",
    inputSchema: z.object({
      channel: z.string().describe("Slack channel ID"),
      limit: z.number().default(15).describe("Max messages to return"),
    }),
    execute: async ({ channel, limit }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();
      return (data.messages || []).map((m: any) => ({
        user: m.user,
        text: m.text,
        timestamp: m.ts,
        type: m.type,
        reactions: m.reactions?.map((r: any) => `${r.name}:${r.count}`),
      }));
    },
  })
);

export const sendSlackMessage = withSlack(
  tool({
    description:
      "Send a message to a Slack channel. Use to notify team members or share findings.",
    inputSchema: z.object({
      channel: z.string().describe("Slack channel ID"),
      text: z.string().describe("Message text to send"),
    }),
    execute: async ({ channel, text }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel, text }),
      });
      const data = await res.json();
      return {
        ok: data.ok,
        channel: data.channel,
        ts: data.ts,
        message: data.ok ? "Message sent successfully" : data.error,
      };
    },
  })
);
