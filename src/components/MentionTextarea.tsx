"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { findActiveMention } from "@/lib/mentions";

// ------------------------------------------------------------------------------
// A textarea that suggests people while you type — start an @, keep typing, pick
// a name. Shared by the ask / answer / reply forms so the three behave the same.
//
// The list is anchored under the textarea rather than at the caret on purpose:
// caret coordinates can only be had by mirroring the textarea in a hidden div
// and trusting it to wrap identically, which it will not when the reader's
// browser forces its own font. Under the box it is always in the right place.
// ------------------------------------------------------------------------------

export interface MentionCandidate {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

const SUGGESTION_LIMIT = 6;

export default function MentionTextarea({
  value,
  onChange,
  textareaClassName = "",
  showMentionButton = true,
  autoFocus = false,
  ...textareaProps
}: {
  value: string;
  onChange: (next: string) => void;
  textareaClassName?: string;
  /** The "@" affordance under the box, for people who don't know the shortcut. */
  showMentionButton?: boolean;
  autoFocus?: boolean;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "className"
>) {
  const listId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  // Results carry the query they were fetched for. Keeping them shown while a
  // longer query loads (the `startsWith`) is what stops the list flickering out
  // on every keystroke; a query that is NOT an extension of theirs — a fresh @
  // somewhere else, or a backspace — hides them instead of showing the wrong
  // people for 120ms.
  const [candidates, setCandidates] = useState<{ key: string; items: MentionCandidate[] }>({
    key: "",
    items: [],
  });
  const [activeIndex, setActiveIndex] = useState(0);

  const items =
    mention !== null && mention.query.startsWith(candidates.key) ? candidates.items : [];
  const open = items.length > 0;
  const highlighted = Math.min(activeIndex, items.length - 1);

  const syncMention = useCallback((el: HTMLTextAreaElement) => {
    // selectionStart !== selectionEnd means a selection, not a caret — nothing
    // is being typed, so no suggestions.
    const next =
      el.selectionStart === el.selectionEnd
        ? findActiveMention(el.value, el.selectionStart)
        : null;

    // Three handlers (change, keyup, click) call this for a single keystroke.
    // Returning the SAME object when nothing moved keeps that from looking like
    // a change and re-running the lookup effect three times per character.
    setMention((prev) => {
      if (prev === null && next === null) return prev;
      if (prev && next && prev.start === next.start && prev.query === next.query) return prev;
      return next;
    });
  }, []);

  // Look people up as the query changes. Debounced, and every in-flight lookup
  // is fenced by `cancelled` so a slow response for "ab" can't land on top of
  // the newer results for "abd".
  useEffect(() => {
    if (mention === null) return;

    let cancelled = false;
    const query = mention.query;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const term = query.replace(/[%_,]/g, "");
      let request = supabase
        .from("profiles_public")
        .select("username, display_name, avatar_url")
        .order("username", { ascending: true })
        .limit(SUGGESTION_LIMIT);
      // A bare "@" lists everyone; once there are letters, match a handle from
      // its start (how you'd expect to find a handle) and a display name
      // anywhere (so "adwe" finds "Abdelrahman Adwe Ali").
      if (term) request = request.or(`username.ilike.${term}%,display_name.ilike.%${term}%`);

      const { data } = await request;
      if (cancelled) return;
      setCandidates({ key: query, items: (data as MentionCandidate[] | null) ?? [] });
      setActiveIndex(0);
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mention]);

  const insert = useCallback(
    (handle: string) => {
      const el = textareaRef.current;
      if (!el || mention === null) return;

      const caret = el.selectionStart;
      const next = `${value.slice(0, mention.start)}@${handle} ${value.slice(caret)}`;
      const cursor = mention.start + handle.length + 2; // "@" + handle + trailing space

      setMention(null);
      setCandidates({ key: "", items: [] });
      onChange(next);

      // After React has written the new value back into the DOM node — setting
      // it before that would put the caret in the old string.
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [mention, onChange, value],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (Math.min(i, items.length - 1) + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (Math.min(i, items.length - 1) - 1 + items.length) % items.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insert(items[highlighted].username);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
    }
  }

  function startMention() {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart;
    // A space first unless we're at the start or already after one, so the "@"
    // lands somewhere the parser will actually treat as a mention.
    const before = caret > 0 ? value[caret - 1] : "";
    const prefix = before === "" || /\s/.test(before) ? "@" : " @";
    const next = value.slice(0, caret) + prefix + value.slice(caret);
    const cursor = caret + prefix.length;

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
      syncMention(el);
    });
  }

  const activeId = useMemo(
    () => (open ? `${listId}-option-${highlighted}` : undefined),
    [open, listId, highlighted],
  );

  return (
    <div className="relative">
      <textarea
        {...textareaProps}
        ref={textareaRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          syncMention(e.target);
        }}
        onKeyUp={(e) => syncMention(e.currentTarget)}
        onClick={(e) => syncMention(e.currentTarget)}
        onKeyDown={handleKeyDown}
        // Closing on blur would fire before a click on the list registers, so
        // the list swallows mousedown instead (see onMouseDown below).
        onBlur={() => setMention(null)}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        className={textareaClassName}
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          className="dropdown-panel absolute start-0 top-full z-30 mt-1 max-h-60 w-[min(18rem,100%)] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {items.map((candidate, i) => (
            <li key={candidate.username} id={`${listId}-option-${i}`} role="option" aria-selected={i === highlighted}>
              <button
                type="button"
                onClick={() => insert(candidate.username)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start transition ${
                  i === highlighted ? "bg-bg" : ""
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono text-[10px] font-bold text-accent-fg">
                  {candidate.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={candidate.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (candidate.display_name || candidate.username).trim().charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-fg" dir="auto">
                    {candidate.display_name || candidate.username}
                  </span>
                  <span className="block truncate font-mono text-xs text-muted">
                    @{candidate.username}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showMentionButton && (
        <button
          type="button"
          onClick={startMention}
          title="Mention someone"
          className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-xs text-muted transition hover:border-accent hover:text-accent active:scale-95"
        >
          @ <span className="font-sans">Mention</span>
        </button>
      )}
    </div>
  );
}
