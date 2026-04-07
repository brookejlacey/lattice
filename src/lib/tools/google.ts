import { tool } from "ai";
import { z } from "zod";
import { withGoogle } from "@/lib/auth0-ai";
import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";

export const getCalendarEvents = withGoogle(
  tool({
    description:
      "Get upcoming events from Google Calendar. Use to check availability, find meetings, or schedule context.",
    inputSchema: z.object({
      maxResults: z.number().default(10).describe("Max events to return"),
      timeMin: z
        .string()
        .optional()
        .describe("Start time in ISO format (defaults to now)"),
    }),
    execute: async ({ maxResults, timeMin }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const now = timeMin || new Date().toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${encodeURIComponent(now)}&orderBy=startTime&singleEvents=true`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();
      return (data.items || []).map((e: any) => ({
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location,
        attendees: e.attendees?.map((a: any) => a.email),
        status: e.status,
        link: e.htmlLink,
      }));
    },
  })
);

export const searchEmails = withGoogle(
  tool({
    description:
      "Search Gmail for emails matching a query. Use to find relevant communications, notifications, or context.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Gmail search query (e.g., 'from:alice subject:deployment')"
        ),
      maxResults: z.number().default(10),
    }),
    execute: async ({ query, maxResults }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const listRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const listData = await listRes.json();
      if (!listData.messages?.length)
        return { results: [], message: "No emails found" };

      const emails = await Promise.all(
        listData.messages.slice(0, 5).map(async (msg: any) => {
          const res = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const data = await res.json();
          const headers = data.payload?.headers || [];
          return {
            id: data.id,
            subject: headers.find((h: any) => h.name === "Subject")?.value,
            from: headers.find((h: any) => h.name === "From")?.value,
            date: headers.find((h: any) => h.name === "Date")?.value,
            snippet: data.snippet,
          };
        })
      );
      return emails;
    },
  })
);

export const listDriveFiles = withGoogle(
  tool({
    description:
      "List recent files from Google Drive. Use to find documents, spreadsheets, or shared resources.",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Search query for Drive files"),
      maxResults: z.number().default(10),
    }),
    execute: async ({ query, maxResults }) => {
      const accessToken = getAccessTokenFromTokenVault();
      let url = `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,webViewLink,owners)`;
      if (query) url += `&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return (data.files || []).map((f: any) => ({
        name: f.name,
        type: f.mimeType,
        modified: f.modifiedTime,
        url: f.webViewLink,
        owner: f.owners?.[0]?.displayName,
      }));
    },
  })
);
