import {
  archestraApiSdk,
  type archestraApiTypes,
  type ErrorExtended,
} from "@shared";

import { ServerErrorFallback } from "@/components/error-fallback";
import { getServerApiHeaders } from "@/lib/server-utils";
import ProfilesPage from "./page.client";

export const dynamic = "force-dynamic";

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

export default async function ProfilesPageServer({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Normalize query params to single strings
  const pageFromUrl = toSingle(params.page);
  const pageSizeFromUrl = toSingle(params.pageSize);
  const nameFilter = toSingle(params.name) || "";
  const sortByFromUrl = toSingle(params.sortBy);
  const sortDirectionFromUrl = toSingle(params.sortDirection);

  // Parse and validate numeric params with safe defaults
  const page = parseSafeInt(pageFromUrl, 1, 1, 10000);
  const pageSize = parseSafeInt(pageSizeFromUrl, 20, 1, 100);
  const pageIndex = page - 1;
  const offset = pageIndex * pageSize;

  // Validate and normalize sortBy
  const validSortByValues = [
    "name",
    "createdAt",
    "toolsCount",
    "team",
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
    profiles: archestraApiTypes.GetAgentsResponses["200"];
    teams: archestraApiTypes.GetTeamsResponses["200"];
  } = {
    profiles: {
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
    teams: [],
  };

  try {
    const headers = await getServerApiHeaders();
    initialData = {
      profiles: (
        await archestraApiSdk.getAgents({
          headers,
          query: {
            limit: pageSize,
            offset,
            sortBy,
            sortDirection,
            name: nameFilter || undefined,
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
      teams: (await archestraApiSdk.getTeams({ headers })).data || [],
    };
  } catch (error) {
    console.error(error);
    return <ServerErrorFallback error={error as ErrorExtended} />;
  }

  return <ProfilesPage initialData={initialData} />;
}
