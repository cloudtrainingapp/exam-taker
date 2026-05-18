import { useParams } from "react-router-dom";

export default function QuizLanding() {
  const { quizSlug } = useParams<{ quizSlug: string }>();
  return <h1 className="text-2xl font-bold">Quiz: {quizSlug}</h1>;
}
