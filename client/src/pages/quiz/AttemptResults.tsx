import { useParams } from "react-router-dom";

export default function AttemptResults() {
  const { quizSlug, attemptSlug } = useParams<{ quizSlug: string; attemptSlug: string }>();
  return (
    <h1 className="text-2xl font-bold">
      Results — {quizSlug} / {attemptSlug}
    </h1>
  );
}
