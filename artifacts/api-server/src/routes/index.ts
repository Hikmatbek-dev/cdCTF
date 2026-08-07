import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ctfRouter from "./ctf";
import learnRouter from "./learn";
import scoreboardRouter from "./scoreboard";
import competitionsRouter from "./competitions";
import talentRouter from "./talent";
import jobsRouter from "./jobs";
import labsRouter from "./labs";
import statsRouter from "./stats";
import ogRouter from "./og";
import usersRouter from "./users";
import adminRouter from "./admin";
import uploadsRouter from "./uploads";
import supportRouter from "./support";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/ctf", ctfRouter);
router.use("/learn", learnRouter);
router.use("/scoreboard", scoreboardRouter);
router.use("/competitions", competitionsRouter);
router.use("/talent", talentRouter);
router.use("/jobs", jobsRouter);
router.use("/labs", labsRouter);
router.use("/stats", statsRouter);
router.use("/og", ogRouter);
router.use("/users", usersRouter);
router.use("/admin", adminRouter);
router.use("/uploads", uploadsRouter);
router.use("/support", supportRouter);

export default router;
