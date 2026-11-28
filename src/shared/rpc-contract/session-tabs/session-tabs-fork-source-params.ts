import { z } from 'zod'
import { lazyZodSchema } from '../../schema/lazy-zod-schema'

// A local chat session's fork; a terminal Claude chat's fork also stops at throughEntryId.
export const SourceChatForkParam = lazyZodSchema(() =>
  z
    .object({
      sessionId: z.string().min(1),
      throughEntryId: z.string().min(1).max(512).optional()
    })
    .strict()
)

// A chat another host exported and this host placed (aiVault.commitChatForkImport).
export const SourceChatImportParam = lazyZodSchema(() => z.object({ importId: z.uuid() }).strict())

export function checkSingleForkSource(
  value: { sourceChatFork?: unknown; sourceChatImport?: unknown },
  context: z.RefinementCtx
): void {
  if (value.sourceChatFork && value.sourceChatImport) {
    context.addIssue({
      code: 'custom',
      path: ['sourceChatImport'],
      message: 'A fork has one source'
    })
  }
}
