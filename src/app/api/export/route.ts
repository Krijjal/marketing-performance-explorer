import type { NextRequest } from "next/server";
import { getExportRows, toCsv } from "../../../analytics/exportRows";
import { getFilterOptions, parseFilters } from "../../../analytics/filters";
import { getAppPool } from "../../../db/appPool";
import { logger } from "../../../logging/logger";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const pool = getAppPool();
    const options = await getFilterOptions(pool);
    if (!options) {
      return new Response("No data has been loaded yet", { status: 404 });
    }

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const rows = await getExportRows(pool, parseFilters(params, options));
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="marketing-performance.csv"',
      },
    });
  } catch (error) {
    logger.error({ err: error }, "csv export failed");
    return new Response("The export failed", { status: 500 });
  }
}
