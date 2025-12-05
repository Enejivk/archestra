import {
  archestraApiSdk,
  type archestraApiTypes,
  type ErrorExtended,
} from "@shared";

import { ServerErrorFallback } from "@/components/error-fallback";
import { getServerApiHeaders } from "@/lib/server-utils";
import ProfilesPage from "./page.client";

export const dynamic = "force-dynamic";

export default async function ProfilesPageServer({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pageFromUrl = params.page as string | undefined;
  const pageSizeFromUrl = params.pageSize as string | undefined;
  const nameFilter = (params.name as string) || "";
  const sortByFromUrl = params.sortBy as
    | "name"
    | "createdAt"
    | "toolsCount"
    | "team"
    | null;
  const sortDirectionFromUrl = params.sortDirection as "asc" | "desc" | null;

  const pageIndex = Number(pageFromUrl || "1") - 1;
  const pageSize = Number(pageSizeFromUrl || "20");
  const offset = pageIndex * pageSize;

  // Default sorting
  const sortBy = sortByFromUrl || "createdAt";
  const sortDirection = sortDirectionFromUrl || "desc";

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
