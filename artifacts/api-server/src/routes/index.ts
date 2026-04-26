// @ts-nocheck
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import requestsRouter from "./requests";
import statsRouter from "./stats";
import adminRouter from "./admin";
import { attachUser } from "../lib/auth";

const router: IRouter = Router();

router.use(attachUser());

router.use(healthRouter);
router.use(authRouter);
router.use(requestsRouter);
router.use(statsRouter);
router.use(adminRouter);

export default router;
