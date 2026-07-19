"use client";

import { useState } from "react";
import Link from "next/link";

function StatTile({ label, count, href }: { label: string; count: number; href: string }) {
  return count > 0 ? (
    <Link
      href={href}
      className="card active:scale-[0.98] active:opacity-90 flex flex-col items-center gap-1 py-6 text-center transition-colors hover:border-accent"
    >
      <span className="font-mono text-2xl font-bold text-accent">{count}</span>
      <span className="text-sm text-muted">{label}</span>
    </Link>
  ) : (
    <div className="card flex flex-col items-center gap-1 py-6 text-center opacity-50">
      <span className="font-mono text-2xl font-bold text-muted">0</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

export default function ProfileStats({
  username,
  articlesCount,
  tutorialsCount,
  questionsCount,
  answersCount,
}: {
  username: string;
  articlesCount: number;
  tutorialsCount: number;
  questionsCount: number;
  answersCount: number;
}) {
  const [qaOpen, setQaOpen] = useState(false);
  const qaTotal = questionsCount + answersCount;

  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Articles" count={articlesCount} href={`/u/${username}/articles`} />
        <StatTile label="Tutorials" count={tutorialsCount} href={`/u/${username}/tutorials`} />

        {qaTotal > 0 ? (
          <button
            type="button"
            onClick={() => setQaOpen((v) => !v)}
            aria-expanded={qaOpen}
            className="card active:scale-[0.98] active:opacity-90 flex flex-col items-center gap-1 py-6 text-center transition-colors hover:border-accent"
          >
            <span className="font-mono text-2xl font-bold text-accent">{qaTotal}</span>
            <span className="flex items-center gap-1 text-sm text-muted">
              Q&amp;A
              <svg
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 transition-transform ${qaOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path fill="currentColor" d="M7 10l5 5 5-5z" />
              </svg>
            </span>
          </button>
        ) : (
          <div className="card flex flex-col items-center gap-1 py-6 text-center opacity-50">
            <span className="font-mono text-2xl font-bold text-muted">0</span>
            <span className="text-sm text-muted">Q&amp;A</span>
          </div>
        )}
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          qaOpen ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-4">
            <StatTile
              label="Questions Asked"
              count={questionsCount}
              href={`/u/${username}/questions/asked`}
            />
            <StatTile
              label="Answers Given"
              count={answersCount}
              href={`/u/${username}/questions/answered`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
