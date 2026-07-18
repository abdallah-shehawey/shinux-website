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
  displayName,
  username,
  socialLinks,
}: {
  avatarUrl: string | null;
  initial: string;
  displayName: string;
  username: string;
  socialLinks: SocialLink[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost">
        Edit profile
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost self-start">
        Done editing
      </button>

      <div className="card">
        <h2 className="mb-2 text-lg font-semibold">Photo</h2>
        <AvatarUploader avatarUrl={avatarUrl} initial={initial} />
      </div>

      <div className="card">
        <h2 className="mb-1 text-lg font-semibold">Display name</h2>
        <DisplayNameForm initialDisplayName={displayName} />
      </div>

      <div className="card">
        <h2 className="mb-1 text-lg font-semibold">Username</h2>
        <p className="text-sm text-muted">
          This is how you appear across the site. Must be unique.
        </p>
        <UsernameForm initialUsername={username} />
      </div>

      <div className="card">
        <h2 className="mb-1 text-lg font-semibold">Social links</h2>
        <p className="text-sm text-muted">
          Add as many as you like — more than one of the same platform is fine.
        </p>
        <SocialLinksForm initialLinks={socialLinks} />
      </div>
    </div>
  );
}
