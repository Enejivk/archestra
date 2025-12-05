import {
  archestraApiSdk,
  type archestraApiTypes,
  type ErrorExtended,
} from "@shared";

import { ServerErrorFallback } from "@/components/error-fallback";
import { getServerApiHeaders } from "@/lib/server-utils";
import { ToolsClient } from "./page.client";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;

// Helper to extract single string from query param (handles arrays)
function toSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

// Safe integer parser with defaults and clamping
function parseSafeInt(
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, parsed));
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Normalize query params to single strings
  const pageFromUrl = toSingle(params.page);
  const pageSizeFromUrl = toSingle(params.pageSize);
  const sortByFromUrl = toSingle(params.sortBy);
  const sortDirectionFromUrl = toSingle(params.sortDirection);

  // Parse and validate numeric params with safe defaults
  const page = parseSafeInt(pageFromUrl, 1, 1, 10000);
  const pageSize = parseSafeInt(pageSizeFromUrl, DEFAULT_PAGE_SIZE, 1, 100);
  const pageIndex = page - 1;
  const offset = pageIndex * pageSize;

  // Validate and normalize sortBy
  const validSortByValues = [
    "name",
    "createdAt",
    "origin",
    "agent",
    "allowUsageWhenUntrustedDataIsPresent",
  ] as const;
  type ValidSortBy = (typeof validSortByValues)[number];
  const sortBy = (validSortByValues as readonly string[]).includes(
    sortByFromUrl ?? "",
  )
    ? (sortByFromUrl as ValidSortBy)
    : "createdAt";

  // Validate and normalize sortDirection
  const sortDirection =
    sortDirectionFromUrl === "asc" || sortDirectionFromUrl === "desc"
      ? sortDirectionFromUrl
      : "desc";

  let initialData: {
    agentTools: archestraApiTypes.GetAllAgentToolsResponses["200"];
    profiles: archestraApiTypes.GetAllAgentsResponses["200"];
    mcpServers: archestraApiTypes.GetMcpServersResponses["200"];
  } = {
    agentTools: {
      data: [],
      pagination: {
        currentPage: 1,
        limit: pageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    },
    profiles: [],
    mcpServers: [],
  };

  try {
    const headers = await getServerApiHeaders();
    initialData = {
      agentTools: (
        await archestraApiSdk.getAllAgentTools({
          headers,
          query: {
            limit: pageSize,
            offset,
            sortBy,
            sortDirection,
            excludeArchestraTools: true,
          },
        })
      ).data || {
        data: [],
        pagination: {
          currentPage: 1,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      },
      profiles: (await archestraApiSdk.getAllAgents({ headers })).data || [],
      mcpServers: (await archestraApiSdk.getMcpServers({ headers })).data || [],
    };
  } catch (error) {
    console.error(error);
    return <ServerErrorFallback error={error as ErrorExtended} />;
  }

  return <ToolsClient initialData={initialData} />;
}
