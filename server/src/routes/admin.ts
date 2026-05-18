import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { getDashboardStats, listAttempts } from "../controllers/adminController";
import { listQuizzes, createQuiz, getQuiz, updateQuiz, deleteQuiz } from "../controllers/quizController";
import { createQuestion, bulkCreateQuestions, updateQuestion, deleteQuestion } from "../controllers/questionController";

const router = Router();

router.use(requireAdmin);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Results
router.get("/results", listAttempts);

// Quizzes
router.get("/quizzes", listQuizzes);
router.post("/quizzes", createQuiz);
router.get("/quizzes/:quizId", getQuiz);
router.patch("/quizzes/:quizId", updateQuiz);
router.delete("/quizzes/:quizId", deleteQuiz);

// Questions
router.post("/quizzes/:quizId/questions", createQuestion);
router.post("/quizzes/:quizId/questions/bulk", bulkCreateQuestions);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);

export default router;
