import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import apartmentsRouter from "./apartments";
import inspectionsRouter from "./inspections";
import uploadRouter from "./upload";
import bookingsRouter from "./bookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/profile", profileRouter);
router.use("/apartments", apartmentsRouter);
router.use("/inspections", inspectionsRouter);
router.use("/upload", uploadRouter);
router.use("/bookings", bookingsRouter);

export default router;
