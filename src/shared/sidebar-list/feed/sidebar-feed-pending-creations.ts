import type { WorkspaceCreation } from '../feed-facts/workspace-creations'

/** Creations still in flight: those whose workspace is not listed yet, so the row plan shows a placeholder. */
export function listPendingFeedCreations(
  creations: ReadonlyMap<string, WorkspaceCreation>,
  listedWorktreeIds: ReadonlySet<string>
): { creationId: string; repoId: string }[] {
  return [...creations].flatMap(([creationId, creation]) =>
    creation.worktreeId !== undefined && listedWorktreeIds.has(creation.worktreeId)
      ? []
      : [{ creationId, repoId: creation.repoId }]
  )
}
