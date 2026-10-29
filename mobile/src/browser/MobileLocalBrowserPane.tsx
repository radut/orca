import { useRef, useState } from 'react'
import { View } from 'react-native'
import { ChevronLeft, ChevronRight, MonitorUp, RefreshCw } from 'lucide-react-native'
import {
  OrcaProxiedBrowser,
  orcaProxiedBrowserView,
  type OrcaProxiedBrowserViewHandle,
  type ProxiedBrowserNavigationState
} from '../../modules/orca-proxied-browser/src'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'
import { displayBrowserUrl, normalizeBrowserUrl } from './browser-url'
import { buttonColor } from './mobile-browser-frame-state'
import { mobileBrowserPaneStyles as styles } from './mobile-browser-pane-styles'
import { MobileBrowserAddressField } from './MobileBrowserAddressField'
import { MobileBrowserToolbarIconButton } from './MobileBrowserToolbarIconButton'

type Props = {
  proxyKey: string
  storeId: string
  initialUrl: string
  // Switch this tab back to frames streamed from the host's browser.
  onStreamFromHost: () => void
  onToast: (message: string, durationMs?: number) => void
}

// Resolved once: binaries without the module never render this pane (canRenderBrowserLocally).
const ProxiedBrowserView = OrcaProxiedBrowser ? orcaProxiedBrowserView() : null

const IDLE_STATE: ProxiedBrowserNavigationState = {
  url: '',
  title: '',
  loading: true,
  canGoBack: false,
  canGoForward: false,
  progress: 0
}

/** Draws the page in a web view on this phone; its traffic goes through the host, so it sees the host's network. */
export function MobileLocalBrowserPane({
  proxyKey,
  storeId,
  initialUrl,
  onStreamFromHost,
  onToast
}: Props): React.JSX.Element {
  const t = useMobileTranslation()
  useMobileColorScheme()
  const viewRef = useRef<OrcaProxiedBrowserViewHandle>(null)
  const [url, setUrl] = useState(initialUrl)
  const [navigation, setNavigation] = useState(IDLE_STATE)
  const [addressValue, setAddressValue] = useState(displayBrowserUrl(initialUrl))
  const [addressFocused, setAddressFocused] = useState(false)

  const navigateToAddress = (): void => {
    const next = normalizeBrowserUrl(addressValue)
    if (!next) {
      return
    }
    setAddressFocused(false)
    setUrl(next)
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <MobileBrowserToolbarIconButton
          disabled={!navigation.canGoBack}
          label={t('common.back', 'Back')}
          onPress={() => void viewRef.current?.goBack()}
        >
          <ChevronLeft size={15} color={buttonColor(navigation.canGoBack)} />
        </MobileBrowserToolbarIconButton>
        <MobileBrowserToolbarIconButton
          disabled={!navigation.canGoForward}
          label={t('browser.paneView.forward', 'Forward')}
          onPress={() => void viewRef.current?.goForward()}
        >
          <ChevronRight size={15} color={buttonColor(navigation.canGoForward)} />
        </MobileBrowserToolbarIconButton>
        <MobileBrowserToolbarIconButton
          label={t('browser.paneView.reload', 'Reload')}
          onPress={() => void viewRef.current?.reload()}
        >
          <RefreshCw size={15} color={buttonColor(true)} />
        </MobileBrowserToolbarIconButton>
        <MobileBrowserAddressField
          value={addressValue}
          onChangeText={setAddressValue}
          onFocus={() => setAddressFocused(true)}
          onBlur={() => setAddressFocused(false)}
          onSubmit={navigateToAddress}
          focused={addressFocused}
          disabled={false}
          loading={navigation.loading}
          loadFailed={navigation.error !== undefined}
        />
        <MobileBrowserToolbarIconButton
          label={t('browser.localPane.streamFromHost', 'Stream from the host instead')}
          onPress={onStreamFromHost}
        >
          <MonitorUp size={15} color={buttonColor(true)} />
        </MobileBrowserToolbarIconButton>
      </View>
      <View style={styles.viewport}>
        {ProxiedBrowserView && (
          <ProxiedBrowserView
            ref={viewRef}
            style={styles.viewport}
            proxyKey={proxyKey}
            storeId={storeId}
            url={url}
            onNavigationState={(event) => {
              const next = event.nativeEvent
              setNavigation(next)
              if (!addressFocused && next.url) {
                setAddressValue(displayBrowserUrl(next.url))
              }
              if (next.error) {
                onToast(
                  t('browser.localPane.loadFailed', 'Page did not load: {{error}}', {
                    error: next.error
                  })
                )
              }
            }}
          />
        )}
      </View>
    </View>
  )
}
