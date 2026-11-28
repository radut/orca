import { useStopReadAloudWithChat } from '../../../platform/read-aloud/read-aloud-turn'
import { useMobileNativeChatAgentNotice } from './mobile-native-chat-agent-presence-copy'

/** Stops read-aloud when the chat changes and returns the agent exit/restart notice. */
export function useChatOverlayStatus(
  controller: Parameters<typeof useMobileNativeChatAgentNotice>[0],
  activeSessionTabId: string | null | undefined,
  sessionId: string | null,
  sendSurfaceId: string
): ReturnType<typeof useMobileNativeChatAgentNotice> {
  useStopReadAloudWithChat(sendSurfaceId)
  return useMobileNativeChatAgentNotice(controller, activeSessionTabId, sessionId)
}
