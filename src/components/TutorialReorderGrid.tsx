"use client";

import TrackCard from "./TrackCard";
import DragReorderList from "./DragReorderList";
import { revalidateTutorialCaches } from "@/lib/revalidate-tutorials";
import type { TrackMeta } from "@/lib/tutorials";
import type { Author } from "@/lib/site";

export default function TutorialReorderGrid({
  initialItems,
  authors,
  isAdmin,
}: {
  initialItems: TrackMeta[];
  authors: Record<string, Author>;
  isAdmin: boolean;
}) {
  const gridClassName = "grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3";

  const grid = (items: TrackMeta[]) => (
    <div className={gridClassName}>
      {items.map((track) => (
        <TrackCard key={track.slug} track={track} authors={authors} />
      ))}
    </div>
  );

  if (!isAdmin) return grid(initialItems);

  return (
    <DragReorderList
      initialItems={initialItems}
      getId={(t) => t.slug}
      table="tutorial_track_order"
      idColumn="slug"
      onPersisted={() => void revalidateTutorialCaches()}
      gridClassName={gridClassName}
      renderNormal={grid}
      renderCard={(item) => <TrackCard track={item} authors={authors} />}
    />
  );
}
