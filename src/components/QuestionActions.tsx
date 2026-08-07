"use client";

import { useEffect, useState } from "react";

/** Where the "Answer" action sends you: the composer at the foot of the page. */
export const ANSWER_COMPOSER_ID = "answer-composer";

/**
 * The bar under the question: the two things you can actually do with it.
 * There is deliberately no reaction here — a question is answered, not agreed
 * with — and no answer count either, since the answers section below is
 * already headed by one.
 */
export default function QuestionActions() {
  const [shared, setShared] = useState(false);

  // "Link copied" is a transient acknowledgement, not a state to be stuck in.
  useEffect(() => {
    if (!shared) return;
    const timer = setTimeout(() => setShared(false), 2000);
    return () => clearTimeout(timer);
  }, [shared]);

  function focusComposer() {
    const el = document.getElementById(ANSWER_COMPOSER_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // The id is on the form, not the field — in Preview mode there is no
    // textarea to focus at all, and for a signed-out reader the element is the
    // log-in prompt. Scrolling to it is still the right outcome in both cases.
    const field = el.querySelector("textarea");
    // Focusing mid-scroll would jump the page to the field instantly and undo
    // the smooth scroll, so it waits for the scroll to have run.
    if (field) setTimeout(() => field.focus({ preventScroll: true }), 400);
  }

  async function share() {
    const url = window.location.href;
    // The native sheet on mobile; the clipboard everywhere else. A cancelled
    // share throws AbortError — that is the visitor changing their mind, not a
    // failure, so nothing is reported.
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
    } catch {
      /* clipboard blocked (insecure context / denied) — the URL bar still has it */
    }
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-1 border-t border-border pt-1">
        <button type="button" onClick={focusComposer} className="post-action">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" />
          </svg>
          Answer
        </button>

        <button
          type="button"
          onClick={share}
          className="post-action"
          data-active={shared}
          aria-live="polite"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {shared ? (
              <path d="m4 12.5 5 5L20 6.5" />
            ) : (
              <>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
              </>
            )}
          </svg>
          {shared ? "Link copied" : "Share"}
        </button>
      </div>
    </div>
  );
}
