import type { Metadata } from "next";
import { getCachedPublicQuestions, getAllQuestionTags } from "@/lib/questions";
import { getQuestionOrder } from "@/lib/question-order";
import QuestionsBrowser from "@/components/QuestionsBrowser";

export const metadata: Metadata = { title: "Questions" };

// Statically prerendered — see the note in src/app/articles/page.tsx. Every
// read here goes through the shared "questions" data-cache tag, so asking,
// answering, approving or reordering still refreshes this page immediately
// (revalidateQuestionCaches → updateTag("questions")), while an ordinary visit
// costs no server render at all.
export default async function QuestionsPage() {
  const [questions, tags, order] = await Promise.all([
    getCachedPublicQuestions(),
    getAllQuestionTags(),
    getQuestionOrder(),
  ]);

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
        <p className="mt-2 text-muted">
          An archive of Linux questions asked by the community, answered by anyone.
        </p>
      </header>

      <QuestionsBrowser questions={questions} order={order} tags={tags} />
    </div>
  );
}
