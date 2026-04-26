// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, sql, and, ne } from "drizzle-orm";
import {
  db,
  requestsTable,
  helpActionsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/overview", async (_req, res): Promise<void> => {
  const [approved] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(requestsTable)
    .where(eq(requestsTable.status, "approved"));

  const [fulfilled] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(requestsTable)
    .where(eq(requestsTable.status, "fulfilled"));

  const [helpers] = await db
    .select({
      c: sql<number>`count(distinct ${helpActionsTable.helperUserId})::int`,
    })
    .from(helpActionsTable);

  const [cities] = await db
    .select({
      c: sql<number>`count(distinct ${requestsTable.city})::int`,
    })
    .from(requestsTable)
    .where(
      and(
        ne(requestsTable.status, "rejected"),
        ne(requestsTable.status, "pending"),
      ),
    );

  res.json({
    totalApprovedRequests: approved?.c ?? 0,
    totalFulfilledRequests: fulfilled?.c ?? 0,
    totalHelpers: helpers?.c ?? 0,
    totalCities: cities?.c ?? 0,
  });
});

router.get("/stats/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: requestsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(requestsTable)
    .where(eq(requestsTable.status, "approved"))
    .groupBy(requestsTable.category)
    .orderBy(sql`count(*) desc`);

  res.json(rows.map((r) => ({ category: r.category, count: r.count })));
});

router.get("/stats/cities", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      city: requestsTable.city,
      count: sql<number>`count(*)::int`,
    })
    .from(requestsTable)
    .where(eq(requestsTable.status, "approved"))
    .groupBy(requestsTable.city)
    .orderBy(sql`count(*) desc`);

  res.json(rows.map((r) => ({ city: r.city, count: r.count })));
});

export default router;
