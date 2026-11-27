import * as z from 'zod'
import { lazyZodSchema } from '../../schema/lazy-zod-schema'
import {
  CHAT_FORK_TRANSFER_CHUNK_BASE64_MAX_CHARS,
  CHAT_FORK_TRANSFER_CHUNK_BYTES,
  CHAT_FORK_TRANSFER_MAX_BYTES
} from '../../ai-vault/fork-transfer/chat-fork-transfer-limits'
import { WorktreeSelector } from '../terminal/agent-session-params'

const TransferId = lazyZodSchema(() => z.uuid())
const Sha256Hex = lazyZodSchema(() => z.string().regex(/^[0-9a-f]{64}$/))
const Base64Chunk = lazyZodSchema(() =>
  z
    .string()
    .min(4)
    .max(CHAT_FORK_TRANSFER_CHUNK_BASE64_MAX_CHARS)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
)
const ByteOffset = lazyZodSchema(() =>
  z.number().int().nonnegative().max(CHAT_FORK_TRANSFER_MAX_BYTES)
)

// The host looks the source up by id among its own transcripts; no path ever travels.
export const AiVaultExportChatForkParams = lazyZodSchema(() =>
  z.union([
    z
      .object({
        terminal: z
          .object({ sessionId: z.uuid(), throughEntryId: z.string().min(1).max(512) })
          .strict()
      })
      .strict(),
    z
      .object({
        structured: z
          .object({
            sessionId: z.string().min(1).max(512),
            workspaceId: z.string().min(1).max(512),
            throughItemId: z.string().min(1).max(512)
          })
          .strict()
      })
      .strict()
  ])
)

export const AiVaultReadChatForkExportParams = lazyZodSchema(() =>
  z
    .object({
      exportId: TransferId,
      offset: ByteOffset,
      length: z.number().int().min(1).max(CHAT_FORK_TRANSFER_CHUNK_BYTES)
    })
    .strict()
)

export const AiVaultReleaseChatForkExportParams = lazyZodSchema(() =>
  z.object({ exportId: TransferId }).strict()
)

export const AiVaultBeginChatForkImportParams = lazyZodSchema(() =>
  z
    .object({
      agent: z.literal('claude'),
      worktree: WorktreeSelector,
      byteLength: z.number().int().min(1).max(CHAT_FORK_TRANSFER_MAX_BYTES),
      sha256: Sha256Hex,
      sourceSessionId: z.uuid(),
      title: z.string().min(1).max(200).optional()
    })
    .strict()
)

export const AiVaultAppendChatForkImportParams = lazyZodSchema(() =>
  z
    .object({
      importId: TransferId,
      offset: ByteOffset,
      bytesBase64: Base64Chunk
    })
    .strict()
)

export const AiVaultChatForkImportIdParams = lazyZodSchema(() =>
  z.object({ importId: TransferId }).strict()
)

export type AiVaultExportChatForkRequest = z.infer<typeof AiVaultExportChatForkParams>
export type AiVaultReadChatForkExportRequest = z.infer<typeof AiVaultReadChatForkExportParams>
export type AiVaultBeginChatForkImportRequest = z.infer<typeof AiVaultBeginChatForkImportParams>
export type AiVaultAppendChatForkImportRequest = z.infer<typeof AiVaultAppendChatForkImportParams>

// Results are parsed by the relaying client, which trusts neither host.
export const AiVaultExportChatForkResultSchema = lazyZodSchema(() =>
  z.object({
    exportId: TransferId,
    agent: z.literal('claude'),
    byteLength: z.number().int().min(1).max(CHAT_FORK_TRANSFER_MAX_BYTES),
    sha256: Sha256Hex,
    sourceSessionId: z.uuid(),
    chunkBytes: z.number().int().min(1),
    title: z.string().min(1).max(200).optional()
  })
)

export const AiVaultReadChatForkExportResultSchema = lazyZodSchema(() =>
  z.object({
    bytesBase64: z.string().max(CHAT_FORK_TRANSFER_CHUNK_BASE64_MAX_CHARS),
    eof: z.boolean()
  })
)

export const AiVaultReleaseChatForkExportResultSchema = lazyZodSchema(() =>
  z.object({ released: z.boolean() })
)

export const AiVaultBeginChatForkImportResultSchema = lazyZodSchema(() =>
  z.object({
    importId: TransferId,
    chunkBytes: z.number().int().min(1)
  })
)

export const AiVaultAppendChatForkImportResultSchema = lazyZodSchema(() =>
  z.object({
    acknowledgedOffset: ByteOffset
  })
)

/** The placed chat on the target host: resume it by session id in that worktree. */
export const AiVaultCommitChatForkImportResultSchema = lazyZodSchema(() =>
  z.object({
    agent: z.literal('claude'),
    sessionId: z.uuid(),
    filePath: z.string().min(1),
    cwd: z.string().min(1),
    worktreeId: z.string().min(1),
    resumeCursor: z.string().min(1)
  })
)

export const AiVaultCancelChatForkImportResultSchema = lazyZodSchema(() =>
  z.object({ cancelled: z.boolean() })
)

export type AiVaultExportChatForkResult = z.infer<typeof AiVaultExportChatForkResultSchema>
export type AiVaultReadChatForkExportResult = z.infer<typeof AiVaultReadChatForkExportResultSchema>
export type AiVaultReleaseChatForkExportResult = z.infer<
  typeof AiVaultReleaseChatForkExportResultSchema
>
export type AiVaultBeginChatForkImportResult = z.infer<
  typeof AiVaultBeginChatForkImportResultSchema
>
export type AiVaultAppendChatForkImportResult = z.infer<
  typeof AiVaultAppendChatForkImportResultSchema
>
export type AiVaultCommitChatForkImportResult = z.infer<
  typeof AiVaultCommitChatForkImportResultSchema
>
export type AiVaultCancelChatForkImportResult = z.infer<
  typeof AiVaultCancelChatForkImportResultSchema
>
