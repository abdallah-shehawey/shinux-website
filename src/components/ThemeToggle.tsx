"use client";

// The visible icon is driven purely by the `dark` class via CSS (no React
// state), so there is never a hydration mismatch. Clicking flips the class and
// persists the choice in a long-lived cookie so ThemeScript can restore it.
export default function ThemeToggle() {
  function toggle() {
    const d = document.documentElement;
    const next = !d.classList.contains("dark");
    d.classList.toggle("dark", next);
    d.style.colorScheme = next ? "dark" : "light";
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:text-fg hover:border-accent active:scale-90"
    >
      {/* Sun shown in dark mode (click -> light) */}
      <svg
        className="hidden h-4 w-4 dark:block"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {/* Moon shown in light mode (click -> dark) */}
      <svg
        className="block h-4 w-4 dark:hidden"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
