"use client";

import { useState } from "react";
import AvatarUploader from "@/components/AvatarUploader";
import DisplayNameForm from "@/components/DisplayNameForm";
import UsernameForm from "@/components/UsernameForm";
import SocialLinksForm from "@/components/SocialLinksForm";

type SocialLink = { platform: string; label: string; url: string };

export default function ProfileEditor({
  avatarUrl,
  initial,
  headerName,
  initialDisplayName,
  username,
  email,
  memberSince,
  socialLinks,
}: {
  avatarUrl: string | null;
  initial: string;
  headerName: string;
  initialDisplayName: string;
  username: string;
  email: string;
  memberSince: string | null;
  socialLinks: SocialLink[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono text-xl font-bold text-accent-fg">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={headerName} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-fg">{headerName}</p>
            <p className="text-sm text-muted">@{username || "—"}</p>
            <p className="text-sm text-muted">{email}</p>
            {memberSince && (
              <p className="text-sm text-muted">Member since {memberSince}</p>
            )}
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-ghost shrink-0"
          >
            Edit profile
          </button>
        )}
      </div>

      {open && (
        <div className="mt-6 flex flex-col gap-6 border-t border-border pt-6">
          <div>
            <h2 className="mb-2 text-lg font-semibold">Photo</h2>
            <AvatarUploader avatarUrl={avatarUrl} initial={initial} />
          </div>

          <div>
            <h2 className="mb-1 text-lg font-semibold">Display name</h2>
            <DisplayNameForm initialDisplayName={initialDisplayName} />
          </div>

          <div>
            <h2 className="mb-1 text-lg font-semibold">Username</h2>
            <p className="text-sm text-muted">
              This is how you appear across the site. Must be unique.
            </p>
            <UsernameForm initialUsername={username} />
          </div>

          <div>
            <h2 className="mb-1 text-lg font-semibold">Social links</h2>
            <p className="text-sm text-muted">
              Add as many as you like — more than one of the same platform is fine.
            </p>
            <SocialLinksForm initialLinks={socialLinks} />
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-ghost self-start"
          >
            Done editing
          </button>
        </div>
      )}
    </div>
  );
}
