import { NativeChatUsageLimitActionsProvider } from '@/components/native-chat/usage/NativeChatUsageLimitActions'
import {
  NativeChatHostSetupContext,
  type NativeChatHostSetup
} from '@/components/native-chat/host-access/native-chat-host-setup'
import { NativeChatRowActionsProvider } from './NativeChatRowActionsProvider'

type UsageLimitProps = React.ComponentProps<typeof NativeChatUsageLimitActionsProvider>
type RowActionsProps = React.ComponentProps<typeof NativeChatRowActionsProvider>

/** What a structured chat's transcript rows offer: usage-limit recovery outside, so a Fork window
 *  opened from a row sees the limit, then rewind, fork and the host's setup. */
export function NativeChatStructuredRowProviders({
  pane,
  recovery,
  directory,
  view,
  chat,
  forks,
  messages,
  setup,
  children
}: Omit<UsageLimitProps, 'children'> &
  Pick<RowActionsProps, 'chat' | 'forks'> & {
    setup: NativeChatHostSetup | null
    children: React.ReactNode
  }): React.JSX.Element {
  return (
    <NativeChatUsageLimitActionsProvider
      recovery={recovery}
      pane={pane}
      directory={directory}
      messages={messages}
      view={view}
    >
      <NativeChatRowActionsProvider pane={pane} chat={chat} forks={forks} messages={messages}>
        <NativeChatHostSetupContext.Provider value={setup}>
          {children}
        </NativeChatHostSetupContext.Provider>
      </NativeChatRowActionsProvider>
    </NativeChatUsageLimitActionsProvider>
  )
}
