import { useRouter } from 'expo-router'
import { ListRow } from '../components/list/ListGroup'
import type { Translate } from '../i18n/mobile-i18n'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import {
  DEFAULT_BROWSER_DRAWING,
  DEFAULT_LINK_OPEN_MODE,
  loadBrowserDrawing,
  loadLinkOpenMode,
  saveBrowserDrawing,
  saveLinkOpenMode,
  type MobileBrowserDrawing,
  type MobileLinkOpenMode
} from '../storage/preferences'
import { SettingsNote, SettingsScreen, SettingsSection } from './settings-screen-frame'
import { useSavedBrowserPreference } from './use-saved-browser-preference'

type Option<T> = { value: T; label: string; subtitle: string }

function linkModeOptions(t: Translate): Option<MobileLinkOpenMode>[] {
  return [
    {
      value: 'ask',
      label: t('settings.browserSettingsScreen.askEachTime', 'Ask each time'),
      subtitle: t('settings.browserSettingsScreen.askHint', 'Pick a browser or copy the link')
    },
    {
      value: 'orca-browser',
      label: t('settings.browserSettingsScreen.desktopBrowser', 'Orca browser on desktop'),
      subtitle: t('settings.browserSettingsScreen.desktopHint', 'Streamed from your computer')
    },
    {
      value: 'phone-browser',
      label: t('settings.browserSettingsScreen.phoneBrowser', 'Phone browser'),
      subtitle: t('settings.browserSettingsScreen.phoneHint', 'Safari, Chrome or another app')
    }
  ]
}

function drawingOptions(t: Translate): Option<MobileBrowserDrawing>[] {
  return [
    {
      value: 'stream',
      label: t('settings.browserSettingsScreen.streamDrawing', 'Stream from the host'),
      subtitle: t('settings.browserSettingsScreen.streamHint', 'Pictures of the computer’s browser')
    },
    {
      value: 'host',
      label: t('settings.browserSettingsScreen.hostDrawing', 'Draw on the phone, through the host'),
      subtitle: t(
        'settings.browserSettingsScreen.hostNetworkHint',
        'Uses your computer’s network and proxy'
      )
    },
    {
      value: 'phone',
      label: t('settings.browserSettingsScreen.phoneDrawing', 'Draw on the phone, on its network'),
      subtitle: t('settings.browserSettingsScreen.phoneNetworkHint', 'Like any app on this phone')
    }
  ]
}

export default function BrowserSettingsScreen({
  onBack
}: {
  onBack?: () => void
}): React.JSX.Element {
  const t = useMobileTranslation()
  const router = useRouter()
  const linkMode = useSavedBrowserPreference(
    loadLinkOpenMode,
    saveLinkOpenMode,
    DEFAULT_LINK_OPEN_MODE
  )
  const drawing = useSavedBrowserPreference(
    loadBrowserDrawing,
    saveBrowserDrawing,
    DEFAULT_BROWSER_DRAWING
  )
  const error = linkMode.error ?? drawing.error

  const errorNote = error ? (
    <SettingsNote error>
      {error === 'load'
        ? t(
            'settings.browserSettingsScreen.loadFailed',
            'Could not load browser preferences. Try again.'
          )
        : t(
            'settings.browserSettingsScreen.saveFailed',
            'Could not save browser preferences. Try again.'
          )}
    </SettingsNote>
  ) : null

  return (
    <SettingsScreen
      title={t('settings.browserSettingsScreen.title', 'Browser')}
      onBack={onBack ?? (() => router.back())}
    >
      <SettingsSection
        first
        radioGroup
        title={t('settings.browserSettingsScreen.openLinks', 'Open links')}
        footer={errorNote}
      >
        {linkModeOptions(t).map((option) => (
          <ListRow
            key={option.value}
            title={option.label}
            subtitle={option.subtitle}
            selected={linkMode.value === option.value}
            onPress={() => linkMode.select(option.value)}
          />
        ))}
      </SettingsSection>
      <SettingsSection
        radioGroup
        title={t('settings.browserSettingsScreen.showTabs', 'Show tabs')}
        footer={t(
          'settings.browserSettingsScreen.tabsFooter',
          'The phone button in a tab still draws that tab here.'
        )}
      >
        {drawingOptions(t).map((option) => (
          <ListRow
            key={option.value}
            title={option.label}
            subtitle={option.subtitle}
            selected={drawing.value === option.value}
            onPress={() => drawing.select(option.value)}
          />
        ))}
      </SettingsSection>
    </SettingsScreen>
  )
}
