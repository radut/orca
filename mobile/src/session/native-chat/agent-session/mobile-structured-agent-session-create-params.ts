import type { TuiAgent } from '../../../../../src/shared/agent-launch/catalog/tui-agent'
import {
  structuredAgentSessionCreateParams,
  type StructuredAgentSessionCreateParams,
  type StructuredAgentSessionForkSource,
  type StructuredAgentSessionResumeSource
} from '../../../../../src/shared/agent-session/lifecycle/operations/structured-agent-session-create'
import { createOrcaSessionId } from '../../../../../src/shared/agent-session/identity/orca-session-address'
import { randomV4Uuid } from '../../../platform/random-v4-uuid'

/** A chat starts fresh, forks a native chat, or resumes a provider conversation. */
export type CreateSource = {
  forkFrom?: StructuredAgentSessionForkSource
  resumeFrom?: StructuredAgentSessionResumeSource
}

/** The create request: a new session id, its source and placement, and the chat's first prompt when given. */
export function createParamsFor(
  agent: TuiAgent,
  worktree: string,
  source: CreateSource,
  tabPlacement: StructuredAgentSessionCreateParams['tabPlacement'],
  firstMessageText?: string
): StructuredAgentSessionCreateParams {
  return structuredAgentSessionCreateParams({
    sessionId: createOrcaSessionId(randomV4Uuid),
    worktree,
    agent,
    ...source,
    ...(tabPlacement ? { tabPlacement } : {}),
    ...(firstMessageText
      ? {
          firstMessage: {
            clientMessageId: randomV4Uuid(),
            body: {
              kind: 'message' as const,
              role: 'user' as const,
              blocks: [{ type: 'text' as const, text: firstMessageText }]
            }
          }
        }
      : {}),
    randomUuid: randomV4Uuid
  })
}
