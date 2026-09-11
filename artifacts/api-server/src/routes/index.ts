import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import apartmentsRouter from "./apartments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/profile", profileRouter);
router.use("/apartments", apartmentsRouter);

export default router;
