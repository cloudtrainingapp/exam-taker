import { Router } from "express";
import { getQuizInfo, startAttempt, submitAttempt, getAttemptResults } from "../controllers/quizTakingController";

const router = Router();

router.get("/:slug", getQuizInfo);
router.post("/:slug/start", startAttempt);
router.post("/:slug/:attemptSlug/submit", submitAttempt);
router.get("/:slug/:attemptSlug", getAttemptResults);

export default router;
