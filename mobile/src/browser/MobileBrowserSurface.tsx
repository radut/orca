import { useCallback, useState, type ComponentProps } from 'react'
import { View } from 'react-native'
import { translate } from '../i18n/mobile-i18n'
import { useShellLocalBrowser } from '../platform/shell-local-browser'
import { mobileBrowserPaneStyles } from './mobile-browser-pane-styles'
import { MobileBrowserPane } from './MobileBrowserPane'
import { MobileLocalBrowser } from './MobileLocalBrowser'
import { canRenderBrowserLocally } from './use-mobile-browser-local-tunnel'

type Props = ComponentProps<typeof MobileBrowserPane> & { hostId: string }

// The choice lasts for the app session, per host.
const streamedHosts = new Set<string>()

/** Draws pages on the phone when it can, on the network the browser settings pick, and streams the host's browser otherwise. */
export function MobileBrowserSurface({ hostId, ...paneProps }: Props): React.JSX.Element {
  const { client, worktreeId, tab, onToast } = paneProps
  const [streamed, setStreamed] = useState(() => streamedHosts.has(hostId))
  const [tunnelFailed, setTunnelFailed] = useState(false)
  const localPossible = canRenderBrowserLocally(client)
  // A page served into the app shell cannot host native views, so it asks the shell to show one.
  const openInShell = useShellLocalBrowser()

  const onHostTunnelFailed = useCallback(
    (reason: string) => {
      setTunnelFailed(true)
      onToast(
        translate('browser.surface.localFailed', 'Streaming from the host: {{reason}}', { reason })
      )
    },
    [onToast]
  )

  const chooseStreamed = (next: boolean): void => {
    if (next) {
      streamedHosts.add(hostId)
    } else {
      streamedHosts.delete(hostId)
    }
    setTunnelFailed(false)
    setStreamed(next)
  }

  if (localPossible && !streamed && !tunnelFailed) {
    return (
      <MobileLocalBrowser
        client={client}
        hostId={hostId}
        worktreeId={worktreeId}
        initialUrl={tab.url}
        // The proxy starts in milliseconds; streaming meanwhile would open a screencast only to drop it.
        pending={<View style={mobileBrowserPaneStyles.root} />}
        onStreamFromHost={() => chooseStreamed(true)}
        onHostTunnelFailed={onHostTunnelFailed}
        onToast={onToast}
      />
    )
  }
  return (
    <MobileBrowserPane
      {...paneProps}
      onRenderLocally={
        localPossible
          ? () => chooseStreamed(false)
          : openInShell
            ? () =>
                void openInShell({ worktreeId, url: tab.url }).catch((error: unknown) =>
                  onToast(
                    translate(
                      'browser.surface.localFailed',
                      'Streaming from the host: {{reason}}',
                      {
                        reason: error instanceof Error ? error.message : String(error)
                      }
                    )
                  )
                )
            : undefined
      }
    />
  )
}
