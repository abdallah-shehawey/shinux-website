"use client";

import QuestionCard from "./QuestionCard";
import DragReorderList from "./DragReorderList";
import type { QuestionSummary } from "@/lib/questions";

export default function QuestionReorderGrid({
  initialItems,
  isAdmin,
}: {
  initialItems: QuestionSummary[];
  isAdmin: boolean;
}) {
  const gridClassName = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  const grid = (items: QuestionSummary[]) => (
    <div className={gridClassName}>
      {items.map((question) => (
        <QuestionCard key={question.id} question={question} />
      ))}
    </div>
  );

  if (!isAdmin) return grid(initialItems);

  return (
    <DragReorderList
      initialItems={initialItems}
      getId={(q) => q.id}
      table="question_order"
      idColumn="question_id"
      gridClassName={gridClassName}
      renderNormal={grid}
      renderCard={(item) => <QuestionCard question={item} />}
    />
  );
}
