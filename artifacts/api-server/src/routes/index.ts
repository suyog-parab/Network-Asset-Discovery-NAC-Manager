import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import devicesRouter from "./devices";
import discoveryRouter from "./discovery";
import vlansRouter from "./vlans";
import switchesRouter from "./switches";
import sitesRouter from "./sites";
import radiusRouter from "./radius";
import policiesRouter from "./policies";
import alertsRouter from "./alerts";
import auditRouter from "./audit";
import reportsRouter from "./reports";
import usersRouter from "./users";
import authRouter from "./auth";
import ciscoRouter from "./cisco";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);
router.use("/devices", devicesRouter);
router.use("/discovery", discoveryRouter);
router.use("/vlans", vlansRouter);
router.use("/switches", switchesRouter);
router.use("/sites", sitesRouter);
router.use("/radius", radiusRouter);
router.use("/policies", policiesRouter);
router.use("/alerts", alertsRouter);
router.use("/audit", auditRouter);
router.use("/reports", reportsRouter);
router.use("/users", usersRouter);
router.use(authRouter);
router.use("/cisco", ciscoRouter);

export default router;
