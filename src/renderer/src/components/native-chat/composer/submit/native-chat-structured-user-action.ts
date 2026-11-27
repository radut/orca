import { emitNativeChatMessageSent } from '@/components/native-chat/telemetry/native-chat-telemetry'
import { useAppStore } from '@/store'
import type { AgentType } from '../../../../../../shared/agent-status/contracts/agent-status-types'
import type { NativeChatStructuredComposerTransport } from './native-chat-structured-composer-transport'
import { reopenDoneWorkspaceOnChatSend } from './native-chat-send-reopens-done-workspace'

// User admission owns reveal; draft consumption belongs only to draft submission.
export function completeNativeChatStructuredUserAction(
  agent: AgentType,
  transport: NativeChatStructuredComposerTransport,
  reveal: (() => void) | undefined
): void {
  // Structured chats spawn no PTY, so without this a project in use never rises under Recent order.
  if (transport.worktreeId) {
    useAppStore.getState().bumpWorktreeActivity(transport.worktreeId)
  }
  emitNativeChatMessageSent({ agent, runtime: transport.runtime })
  reopenDoneWorkspaceOnChatSend({ worktreeId: transport.worktreeId })
  reveal?.()
}
