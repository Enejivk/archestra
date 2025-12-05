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

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pageFromUrl = params.page as string | undefined;
  const pageSizeFromUrl = params.pageSize as string | undefined;
  const sortByFromUrl = params.sortBy as string | undefined;
  const sortDirectionFromUrl = params.sortDirection as "asc" | "desc" | null;

  const pageIndex = Number(pageFromUrl || "1") - 1;
  const pageSize = Number(pageSizeFromUrl || DEFAULT_PAGE_SIZE);
  const sortBy = (sortByFromUrl || "createdAt") as
    | "name"
    | "createdAt"
    | "origin"
    | "agent"
    | "allowUsageWhenUntrustedDataIsPresent";
  const sortDirection = sortDirectionFromUrl || "desc";

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
            offset: pageIndex * pageSize,
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
