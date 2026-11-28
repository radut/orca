import { useRef, useState } from 'react'
import { View } from 'react-native'
import {
  OrcaProxiedBrowser,
  orcaProxiedBrowserView,
  type OrcaProxiedBrowserViewHandle,
  type ProxiedBrowserNavigationState
} from '../../modules/orca-proxied-browser/src'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import type { MobileLocalBrowserNetwork } from '../storage/preferences'
import { useThemedStyles } from '../theme/themed-styles'
import type { MobileBrowserViewMode } from './screencast/browser-screencast-request-parameters'
import { displayBrowserUrl, normalizeBrowserUrl } from './pane-view/browser-url'
import { mobileBrowserPaneStylesSheet } from './pane-view/mobile-browser-pane-styles'
import { MobileBrowserBottomBar } from './pane-view/MobileBrowserBottomBar'
import { useMobileBrowserPageMenu } from './pane-view/use-mobile-browser-page-menu'
import {
  useMobileBrowserDrawingMenu,
  type MobileBrowserFullScreenToggle
} from './mobile-browser-drawing-menu'

type Props = {
  network: MobileLocalBrowserNetwork
  // Unused on the phone's network.
  proxyKey: string
  storeId: string
  initialUrl: string
  // Desktop or mobile site layout, as in the streamed browser.
  viewMode: MobileBrowserViewMode
  onViewModeChange: (mode: MobileBrowserViewMode) => void
  // Full screen is a separate view; the ⋯ menu opens or leaves it.
  fullScreen: MobileBrowserFullScreenToggle | null
  // Switch this tab back to frames streamed from the host's browser.
  onStreamFromHost: () => void
  onNetworkChange: (network: MobileLocalBrowserNetwork) => void
  onUrlChange: (url: string) => void
  onToast: (message: string, durationMs?: number) => void
  // The bottom bar's room under it, and how far the keyboard lifts it while the address is edited.
  bottomInset?: number
  keyboardLift?: number
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

/** Draws the page in a web view on this phone, connecting through the host or on the phone's own network. */
export function MobileLocalBrowserPane({
  network,
  proxyKey,
  storeId,
  initialUrl,
  viewMode,
  onViewModeChange,
  fullScreen,
  onStreamFromHost,
  onNetworkChange,
  onUrlChange,
  onToast,
  bottomInset = 0,
  keyboardLift = 0
}: Props): React.JSX.Element {
  const t = useMobileTranslation()
  const styles = useThemedStyles(mobileBrowserPaneStylesSheet)
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

  const pageMenu = useMobileBrowserPageMenu({
    url: navigation.url || url,
    canGoForward: navigation.canGoForward,
    controlsDisabled: false,
    browserViewMode: viewMode,
    selectBrowserViewMode: onViewModeChange,
    goForward: () => void viewRef.current?.goForward(),
    proceedUnsafe: null,
    onToast
  })
  const drawingMenu = useMobileBrowserDrawingMenu(network, {
    onDrawingChange: (next) => (next === 'stream' ? onStreamFromHost() : onNetworkChange(next)),
    fullScreen
  })

  return (
    <View style={styles.root}>
      <View style={styles.viewport}>
        {ProxiedBrowserView && (
          <ProxiedBrowserView
            ref={viewRef}
            style={styles.viewport}
            proxyKey={proxyKey}
            storeId={storeId}
            url={url}
            direct={network === 'phone'}
            desktopSite={viewMode === 'web'}
            onNavigationState={(event) => {
              const next = event.nativeEvent
              setNavigation(next)
              if (next.url) {
                onUrlChange(next.url)
                if (!addressFocused) {
                  setAddressValue(displayBrowserUrl(next.url))
                }
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
      <MobileBrowserBottomBar
        bare={false}
        url={navigation.url || url}
        canGoBack={navigation.canGoBack}
        loading={navigation.loading}
        loadFailed={navigation.error !== undefined}
        bottomInset={bottomInset}
        keyboardLift={keyboardLift}
        controlsDisabled={false}
        addressValue={addressValue}
        addressFocused={addressFocused}
        setAddressValue={setAddressValue}
        setAddressFocused={setAddressFocused}
        focusWhenReady={false}
        navigateToAddress={navigateToAddress}
        showStop={navigation.loading}
        stopPage={() => void viewRef.current?.stopLoading()}
        reloadPage={() => void viewRef.current?.reload()}
        goBack={() => void viewRef.current?.goBack()}
        menuGroups={drawingMenu ? [...pageMenu, drawingMenu] : pageMenu}
      />
    </View>
  )
}
