import { tool } from "ai";
import { z } from "zod";
import { withGitHub } from "@/lib/auth0-ai";
import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel";

export const listRepositories = withGitHub(
  tool({
    description:
      "List the authenticated user's GitHub repositories. Use this to explore what repos they have.",
    inputSchema: z.object({
      sort: z
        .enum(["updated", "created", "pushed", "full_name"])
        .default("updated")
        .describe("How to sort repositories"),
      limit: z.number().default(10).describe("Max repositories to return"),
    }),
    execute: async ({ sort, limit }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch(
        `https://api.github.com/user/repos?sort=${sort}&per_page=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const repos = await res.json();
      return repos.map((r: any) => ({
        name: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        updated: r.updated_at,
        url: r.html_url,
        open_issues: r.open_issues_count,
      }));
    },
  })
);

export const getRepoIssues = withGitHub(
  tool({
    description:
      "Get issues from a GitHub repository. Use this to investigate bugs, tasks, or feature requests.",
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      state: z.enum(["open", "closed", "all"]).default("open"),
      limit: z.number().default(10),
    }),
    execute: async ({ owner, repo, state, limit }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const issues = await res.json();
      return issues.map((i: any) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        author: i.user?.login,
        labels: i.labels?.map((l: any) => l.name),
        created: i.created_at,
        body: i.body?.slice(0, 300),
      }));
    },
  })
);

export const getRepoPullRequests = withGitHub(
  tool({
    description:
      "Get pull requests from a GitHub repository. Use this to check code review status or deployment pipeline.",
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      state: z.enum(["open", "closed", "all"]).default("open"),
      limit: z.number().default(10),
    }),
    execute: async ({ owner, repo, state, limit }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const prs = await res.json();
      return prs.map((p: any) => ({
        number: p.number,
        title: p.title,
        state: p.state,
        author: p.user?.login,
        branch: p.head?.ref,
        mergeable: p.mergeable,
        created: p.created_at,
        url: p.html_url,
      }));
    },
  })
);

export const createIssue = withGitHub(
  tool({
    description:
      "Create a new issue on a GitHub repository. Use when the agent needs to file a bug or task.",
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      title: z.string().describe("Issue title"),
      body: z.string().describe("Issue body/description"),
      labels: z
        .array(z.string())
        .optional()
        .describe("Labels to apply to the issue"),
    }),
    execute: async ({ owner, repo, title, body, labels }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, body, labels }),
        }
      );
      const issue = await res.json();
      return {
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        state: issue.state,
      };
    },
  })
);

export const getWorkflowRuns = withGitHub(
  tool({
    description:
      "Get recent GitHub Actions workflow runs for a repository. Use to check CI/CD status or investigate deployment failures.",
    inputSchema: z.object({
      owner: z.string().describe("Repository owner"),
      repo: z.string().describe("Repository name"),
      limit: z.number().default(5),
    }),
    execute: async ({ owner, repo, limit }) => {
      const accessToken = getAccessTokenFromTokenVault();
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const data = await res.json();
      return data.workflow_runs?.map((r: any) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        branch: r.head_branch,
        event: r.event,
        created: r.created_at,
        url: r.html_url,
      }));
    },
  })
);
