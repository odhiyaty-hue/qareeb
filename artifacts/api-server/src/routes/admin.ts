// @ts-nocheck
import { Router, type IRouter, type Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  requestsTable,
  helpActionsTable,
  reportsTable,
  usersTable,
} from "@workspace/db";
import {
  AdminListRequestsQueryParams,
  AdminUpdateRequestStatusParams,
  AdminUpdateRequestStatusBody,
  AdminDeleteRequestParams,
  AdminUpdateUserTrustParams,
  AdminUpdateUserTrustBody,
} from "@workspace/api-zod";
import {
  requireAdmin,
  toPublicUser,
  type AuthedRequest,
} from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/admin/requests",
  requireAdmin(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = AdminListRequestsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }

    const baseQuery = db
      .select({
        request: requestsTable,
        helpersCount: sql<number>`coalesce(count(${helpActionsTable.id}), 0)::int`,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userTrustStatus: usersTable.trustStatus,
      })
      .from(requestsTable)
      .innerJoin(usersTable, eq(usersTable.id, requestsTable.userId))
      .leftJoin(
        helpActionsTable,
        eq(helpActionsTable.requestId, requestsTable.id),
      )
      .groupBy(requestsTable.id, usersTable.id);

    const rows = parsed.data.status
      ? await baseQuery
          .where(eq(requestsTable.status, parsed.data.status))
          .orderBy(desc(requestsTable.createdAt))
      : await baseQuery.orderBy(desc(requestsTable.createdAt));

    res.json(
      rows.map((r) => ({
        id: r.request.id,
        userId: r.request.userId,
        displayName: r.request.displayName ?? null,
        title: r.request.title,
        description: r.request.description,
        category: r.request.category,
        city: r.request.city,
        urgency: r.request.urgency,
        imageUrl: r.request.imageUrl ?? null,
        status: r.request.status,
        helpersCount: r.helpersCount,
        createdAt:
          r.request.createdAt instanceof Date
            ? r.request.createdAt.toISOString()
            : r.request.createdAt,
        userName: r.userName,
        userEmail: r.userEmail,
        userTrustStatus: r.userTrustStatus,
      })),
    );
  },
);

router.patch(
  "/admin/requests/:id/status",
  requireAdmin(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const params = AdminUpdateRequestStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = AdminUpdateRequestStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const [updated] = await db
      .update(requestsTable)
      .set({ status: body.data.status })
      .where(eq(requestsTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(helpActionsTable)
      .where(eq(helpActionsTable.requestId, updated.id));

    res.json({
      id: updated.id,
      userId: updated.userId,
      displayName: updated.displayName ?? null,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      city: updated.city,
      urgency: updated.urgency,
      imageUrl: updated.imageUrl ?? null,
      status: updated.status,
      helpersCount: c,
      createdAt:
        updated.createdAt instanceof Date
          ? updated.createdAt.toISOString()
          : updated.createdAt,
    });
  },
);

router.delete(
  "/admin/requests/:id",
  requireAdmin(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const params = AdminDeleteRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db
      .delete(requestsTable)
      .where(eq(requestsTable.id, params.data.id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.sendStatus(204);
  },
);

router.get(
  "/admin/users",
  requireAdmin(),
  async (_req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select({
        user: usersTable,
        requestsCount: sql<number>`(select count(*) from ${requestsTable} where ${requestsTable.userId} = ${usersTable.id})::int`,
        helpActionsCount: sql<number>`(select count(*) from ${helpActionsTable} where ${helpActionsTable.helperUserId} = ${usersTable.id})::int`,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json(
      rows.map((r) => ({
        ...toPublicUser(r.user),
        requestsCount: r.requestsCount,
        helpActionsCount: r.helpActionsCount,
      })),
    );
  },
);

router.patch(
  "/admin/users/:id/trust",
  requireAdmin(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const params = AdminUpdateUserTrustParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = AdminUpdateUserTrustBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid trust status" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ trustStatus: body.data.trustStatus })
      .where(eq(usersTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(toPublicUser(updated));
  },
);

router.get(
  "/admin/reports",
  requireAdmin(),
  async (_req: AuthedRequest, res: Response): Promise<void> => {
    const rows = await db
      .select({
        report: reportsTable,
        requestTitle: requestsTable.title,
        reporterName: usersTable.name,
      })
      .from(reportsTable)
      .innerJoin(requestsTable, eq(reportsTable.requestId, requestsTable.id))
      .innerJoin(usersTable, eq(reportsTable.reporterUserId, usersTable.id))
      .orderBy(desc(reportsTable.createdAt));

    res.json(
      rows.map((r) => ({
        id: r.report.id,
        requestId: r.report.requestId,
        reporterUserId: r.report.reporterUserId,
        reason: r.report.reason,
        createdAt:
          r.report.createdAt instanceof Date
            ? r.report.createdAt.toISOString()
            : r.report.createdAt,
        requestTitle: r.requestTitle,
        reporterName: r.reporterName,
      })),
    );
  },
);

router.get(
  "/admin/stats",
  requireAdmin(),
  async (_req: AuthedRequest, res: Response): Promise<void> => {
    const [pending] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(requestsTable)
      .where(eq(requestsTable.status, "pending"));
    const [approved] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(requestsTable)
      .where(eq(requestsTable.status, "approved"));
    const [fulfilled] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(requestsTable)
      .where(eq(requestsTable.status, "fulfilled"));
    const [rejected] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(requestsTable)
      .where(eq(requestsTable.status, "rejected"));
    const [users] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(usersTable);
    const [reports] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(reportsTable);
    const [actions] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(helpActionsTable);

    res.json({
      pendingRequests: pending?.c ?? 0,
      approvedRequests: approved?.c ?? 0,
      fulfilledRequests: fulfilled?.c ?? 0,
      rejectedRequests: rejected?.c ?? 0,
      totalUsers: users?.c ?? 0,
      totalReports: reports?.c ?? 0,
      totalHelpActions: actions?.c ?? 0,
    });
  },
);

export default router;
