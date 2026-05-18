import { Router, Request, Response, NextFunction } from "express";
import { getQuizInfo, startAttempt, submitAttempt, getAttemptResults } from "../controllers/quizTakingController";

const router = Router();

// Allow embedding quiz pages in iframes from any origin
router.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

router.get("/:slug", getQuizInfo);
router.post("/:slug/start", startAttempt);
router.post("/:slug/:attemptSlug/submit", submitAttempt);
router.get("/:slug/:attemptSlug", getAttemptResults);

export default router;
