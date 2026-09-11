import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import apartmentsRouter from "./apartments";
import inspectionsRouter from "./inspections";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/profile", profileRouter);
router.use("/apartments", apartmentsRouter);
router.use("/inspections", inspectionsRouter);
router.use("/upload", uploadRouter);

export default router;
