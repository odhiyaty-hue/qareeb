import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  requestsTable,
  helpActionsTable,
  reportsTable,
  usersTable,
} from "@workspace/db";
import {
  ListRequestsQueryParams,
  CreateRequestBody,
  GetRequestParams,
  OfferHelpParams,
  OfferHelpBody,
  ListHelpersParams,
  MarkFulfilledParams,
  ReportRequestParams,
  ReportRequestBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

function serializeRequest(
  row: typeof requestsTable.$inferSelect,
  helpersCount: number,
) {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName ?? null,
    title: row.title,
    description: row.description,
    category: row.category,
    city: row.city,
    urgency: row.urgency,
    imageUrl: row.imageUrl ?? null,
    status: row.status,
    helpersCount,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

router.get(
  "/requests/mine",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const userId = req.authUser!.id;
    const rows = await db
      .select({
        request: requestsTable,
        helpersCount: sql<number>`coalesce(count(${helpActionsTable.id}), 0)::int`,
      })
      .from(requestsTable)
      .leftJoin(
        helpActionsTable,
        eq(helpActionsTable.requestId, requestsTable.id),
      )
      .where(eq(requestsTable.userId, userId))
      .groupBy(requestsTable.id)
      .orderBy(desc(requestsTable.createdAt));

    res.json(rows.map((r) => serializeRequest(r.request, r.helpersCount)));
  },
);

router.get("/requests", async (req, res): Promise<void> => {
  const parsed = ListRequestsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { city, category, status } = parsed.data;

  const filters = [eq(requestsTable.status, status ?? "approved")];
  if (city && city.trim().length > 0) {
    filters.push(eq(requestsTable.city, city.trim()));
  }
  if (category && category.trim().length > 0) {
    filters.push(eq(requestsTable.category, category.trim()));
  }

  const rows = await db
    .select({
      request: requestsTable,
      helpersCount: sql<number>`coalesce(count(${helpActionsTable.id}), 0)::int`,
    })
    .from(requestsTable)
    .leftJoin(
      helpActionsTable,
      eq(helpActionsTable.requestId, requestsTable.id),
    )
    .where(and(...filters))
    .groupBy(requestsTable.id)
    .orderBy(desc(requestsTable.createdAt));

  res.json(rows.map((r) => serializeRequest(r.request, r.helpersCount)));
});

router.post(
  "/requests",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = req.authUser!;
    if (user.trustStatus === "restricted") {
      res
        .status(403)
        .json({ error: "Account is restricted from creating new requests" });
      return;
    }

    const parsed = CreateRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const initialStatus = user.trustStatus === "trusted" ? "approved" : "pending";

    const [created] = await db
      .insert(requestsTable)
      .values({
        userId: user.id,
        displayName: parsed.data.displayName?.trim() || null,
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        category: parsed.data.category,
        city: parsed.data.city.trim(),
        urgency: parsed.data.urgency,
        imageUrl: parsed.data.imageUrl?.trim() || null,
        status: initialStatus,
      })
      .returning();

    res.status(201).json(serializeRequest(created, 0));
  },
);

router.get("/requests/:id", async (req, res): Promise<void> => {
  const parsed = GetRequestParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }
  const id = parsed.data.id;

  const [row] = await db
    .select({
      request: requestsTable,
      helpersCount: sql<number>`coalesce(count(${helpActionsTable.id}), 0)::int`,
    })
    .from(requestsTable)
    .leftJoin(
      helpActionsTable,
      eq(helpActionsTable.requestId, requestsTable.id),
    )
    .where(eq(requestsTable.id, id))
    .groupBy(requestsTable.id);

  if (!row) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  res.json(serializeRequest(row.request, row.helpersCount));
});

router.post(
  "/requests/:id/help",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const params = OfferHelpParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request id" });
      return;
    }
    const body = OfferHelpBody.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const [target] = await db
      .select()
      .from(requestsTable)
      .where(eq(requestsTable.id, params.data.id));
    if (!target) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (target.userId === req.authUser!.id) {
      res.status(400).json({ error: "You cannot help your own request" });
      return;
    }

    const [created] = await db
      .insert(helpActionsTable)
      .values({
        requestId: target.id,
        helperUserId: req.authUser!.id,
        message: body.data.message?.trim() || null,
        contactInfo: body.data.contactInfo?.trim() || null,
        status: "offered",
      })
      .returning();

    res.status(201).json({
      id: created.id,
      requestId: created.requestId,
      helperUserId: created.helperUserId,
      message: created.message,
      contactInfo: created.contactInfo,
      status: created.status,
      createdAt:
        created.createdAt instanceof Date
          ? created.createdAt.toISOString()
          : created.createdAt,
    });
  },
);

router.get(
  "/requests/:id/helpers",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const params = ListHelpersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request id" });
      return;
    }

    const [target] = await db
      .select()
      .from(requestsTable)
      .where(eq(requestsTable.id, params.data.id));
    if (!target) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const isOwner = target.userId === req.authUser!.id;
    const isAdmin = req.authUser!.role === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Only the request owner or admin can view helpers" });
      return;
    }

    const rows = await db
      .select({
        action: helpActionsTable,
        helper: usersTable,
      })
      .from(helpActionsTable)
      .innerJoin(usersTable, eq(helpActionsTable.helperUserId, usersTable.id))
      .where(eq(helpActionsTable.requestId, target.id))
      .orderBy(desc(helpActionsTable.createdAt));

    res.json(
      rows.map((r) => ({
        id: r.action.id,
        requestId: r.action.requestId,
        helperUserId: r.action.helperUserId,
        message: r.action.message,
        contactInfo: r.action.contactInfo,
        status: r.action.status,
        createdAt:
          r.action.createdAt instanceof Date
            ? r.action.createdAt.toISOString()
            : r.action.createdAt,
        helperName: r.helper.name,
        helperEmail: r.helper.email,
        helperPhone: r.helper.phone ?? null,
      })),
    );
  },
);

router.get(
  "/my/help-actions",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const userId = req.authUser!.id;

    const rows = await db
      .select({
        action: helpActionsTable,
        request: requestsTable,
      })
      .from(helpActionsTable)
      .innerJoin(requestsTable, eq(helpActionsTable.requestId, requestsTable.id))
      .where(eq(helpActionsTable.helperUserId, userId))
      .orderBy(desc(helpActionsTable.createdAt));

    const ids = rows.map((r) => r.request.id);
    const helperCounts = new Map<number, number>();
    if (ids.length > 0) {
      const counts = await db
        .select({
          requestId: helpActionsTable.requestId,
          c: sql<number>`count(*)::int`,
        })
        .from(helpActionsTable)
        .where(sql`${helpActionsTable.requestId} = ANY(${ids})`)
        .groupBy(helpActionsTable.requestId);
      for (const c of counts) {
        helperCounts.set(c.requestId, c.c);
      }
    }

    res.json(
      rows.map((r) => ({
        id: r.action.id,
        requestId: r.action.requestId,
        helperUserId: r.action.helperUserId,
        message: r.action.message,
        contactInfo: r.action.contactInfo,
        status: r.action.status,
        createdAt:
          r.action.createdAt instanceof Date
            ? r.action.createdAt.toISOString()
            : r.action.createdAt,
        request: serializeRequest(
          r.request,
          helperCounts.get(r.request.id) ?? 0,
        ),
      })),
    );
  },
);

router.post(
  "/requests/:id/fulfill",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const params = MarkFulfilledParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request id" });
      return;
    }

    const [target] = await db
      .select()
      .from(requestsTable)
      .where(eq(requestsTable.id, params.data.id));
    if (!target) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (target.userId !== req.authUser!.id && req.authUser!.role !== "admin") {
      res.status(403).json({ error: "Only the owner can mark fulfilled" });
      return;
    }

    const [updated] = await db
      .update(requestsTable)
      .set({ status: "fulfilled" })
      .where(eq(requestsTable.id, target.id))
      .returning();

    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(helpActionsTable)
      .where(eq(helpActionsTable.requestId, updated.id));

    res.json(serializeRequest(updated, c));
  },
);

router.post(
  "/requests/:id/report",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const params = ReportRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request id" });
      return;
    }
    const body = ReportRequestBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Reason must be at least 5 characters" });
      return;
    }

    const [target] = await db
      .select()
      .from(requestsTable)
      .where(eq(requestsTable.id, params.data.id));
    if (!target) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const [created] = await db
      .insert(reportsTable)
      .values({
        requestId: target.id,
        reporterUserId: req.authUser!.id,
        reason: body.data.reason.trim(),
      })
      .returning();

    res.status(201).json({
      id: created.id,
      requestId: created.requestId,
      reporterUserId: created.reporterUserId,
      reason: created.reason,
      createdAt:
        created.createdAt instanceof Date
          ? created.createdAt.toISOString()
          : created.createdAt,
    });
  },
);

export default router;
