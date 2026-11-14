import type { NativeChatMessage } from '../../../../../src/shared/native-chat/native-chat-types'
import { isRootAgentJournalItem } from '../../../../../src/shared/agent-session/journal/agent-session-journal-producer'

function holdsWords(message: NativeChatMessage): boolean {
  return (
    message.role === 'assistant' &&
    message.source === 'transcript' &&
    !message.agentStart &&
    isRootAgentJournalItem(message) &&
    message.blocks.some((block) => block.type === 'text' && block.text.trim().length > 0)
  )
}

/** A terminal chat's finished replies, as desktop draws them: each turn's last row with words.
 *  Tool, status and hook rows after it stay in its turn; a queued send ends nothing while the
 *  agent works, and the latest turn ends only once the agent is idle. */
export function mobileNativeChatTerminalForkPoints(
  messages: readonly NativeChatMessage[],
  agentWorking: boolean
): ReadonlySet<string> {
  const ids = new Set<string>()
  let reply: string | undefined
  for (const message of messages) {
    if (message.role === 'user') {
      if (agentWorking && (message.queued || message.pendingSend === 'queued')) {
        continue
      }
      if (reply) {
        ids.add(reply)
      }
      reply = undefined
    } else if (holdsWords(message)) {
      reply = message.id
    }
  }
  if (reply && !agentWorking) {
    ids.add(reply)
  }
  return ids
}
