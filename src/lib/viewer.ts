/**
 * The signed-in reader, as the Q&A composers need to see them: enough to draw
 * their avatar next to the box they are typing in. Resolved once per request on
 * the server (see the question page) instead of each composer fetching its own
 * profile on the client.
 */
export interface ThreadViewer {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}
