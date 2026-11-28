import { ArrowLeftRight, Cast, MapPin, Maximize2, Minimize2 } from 'lucide-react-native'
import type { ActionSheetAction } from '../components/sheets/ActionSheetModal'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import type { MobileBrowserDrawing } from '../storage/preferences'

export type MobileBrowserFullScreenToggle = { active: boolean; onToggle: () => void }

// What a streamed tab offers when the phone can also draw it.
export type MobileBrowserStreamedDrawing = {
  onDrawingChange: (drawing: MobileBrowserDrawing) => void
  fullScreen: MobileBrowserFullScreenToggle | null
}

/** The bottom bar's ⋯ group for how the tab is drawn, and full screen: the same whether it streams or the phone draws it. */
export function useMobileBrowserDrawingMenu(
  current: MobileBrowserDrawing,
  offer: MobileBrowserStreamedDrawing | null
): ActionSheetAction[] | null {
  const t = useMobileTranslation()
  if (!offer) {
    return null
  }
  const pick = (next: MobileBrowserDrawing) => () => {
    if (next !== current) {
      offer.onDrawingChange(next)
    }
  }
  const actions: ActionSheetAction[] = [
    {
      id: 'drawStream',
      label: t('browser.localPane.streamFromHost', 'Stream from the host instead'),
      icon: Cast,
      checked: current === 'stream',
      onPress: pick('stream')
    },
    {
      id: 'drawHost',
      label: t('browser.localPane.throughHost', 'Connect through the host'),
      icon: ArrowLeftRight,
      checked: current === 'host',
      onPress: pick('host')
    },
    {
      id: 'drawPhone',
      label: t('browser.localPane.phoneNetwork', "Connect on the phone's network"),
      icon: MapPin,
      checked: current === 'phone',
      onPress: pick('phone')
    }
  ]
  const fullScreen = offer.fullScreen
  if (fullScreen) {
    actions.push({
      id: 'fullScreen',
      label: fullScreen.active
        ? t('browser.localPane.leaveFullScreen', 'Leave full screen')
        : t('browser.localPane.fullScreen', 'Full screen'),
      icon: fullScreen.active ? Minimize2 : Maximize2,
      onPress: fullScreen.onToggle
    })
  }
  return actions
}
