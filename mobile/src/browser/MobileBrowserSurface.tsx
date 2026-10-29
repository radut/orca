import { useEffect, useState, type ComponentProps } from 'react'
import { View } from 'react-native'
import { translate } from '../i18n/mobile-i18n'
import { mobileBrowserPaneStyles } from './mobile-browser-pane-styles'
import { MobileBrowserPane } from './MobileBrowserPane'
import { MobileLocalBrowserPane } from './MobileLocalBrowserPane'
import {
  canRenderBrowserLocally,
  useMobileBrowserLocalTunnel
} from './use-mobile-browser-local-tunnel'

type Props = ComponentProps<typeof MobileBrowserPane> & { hostId: string }

// The choice lasts for the app session, per host.
const streamedHosts = new Set<string>()

/** Draws pages on the phone through the host's network when it can, and streams the host's browser otherwise. */
export function MobileBrowserSurface({ hostId, ...paneProps }: Props): React.JSX.Element {
  const { client, worktreeId, tab, onToast } = paneProps
  const [streamed, setStreamed] = useState(() => streamedHosts.has(hostId))
  const localPossible = canRenderBrowserLocally(client)
  const local = useMobileBrowserLocalTunnel(client, hostId, worktreeId, localPossible && !streamed)

  const failure = !streamed && local.status === 'failed' ? local.message : null
  useEffect(() => {
    if (failure !== null) {
      onToast(
        translate('browser.surface.localFailed', 'Streaming from the host: {{reason}}', {
          reason: failure
        })
      )
    }
  }, [failure, onToast])

  const chooseStreamed = (next: boolean): void => {
    if (next) {
      streamedHosts.add(hostId)
    } else {
      streamedHosts.delete(hostId)
    }
    setStreamed(next)
  }

  if (!streamed && local.status === 'ready') {
    return (
      <MobileLocalBrowserPane
        proxyKey={local.proxyKey}
        storeId={local.storeId}
        initialUrl={tab.url}
        onStreamFromHost={() => chooseStreamed(true)}
        onToast={onToast}
      />
    )
  }
  // The proxy starts in milliseconds; streaming meanwhile would open a screencast only to drop it.
  if (!streamed && local.status === 'starting') {
    return <View style={mobileBrowserPaneStyles.root} />
  }
  return (
    <MobileBrowserPane
      {...paneProps}
      onRenderLocally={localPossible && streamed ? () => chooseStreamed(false) : undefined}
    />
  )
}
