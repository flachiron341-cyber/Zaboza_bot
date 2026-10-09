import { Router, type IRouter } from "express";
import botDashboardRouter from "./botDashboard";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botDashboardRouter);

export default router;
