import { ArrowLeftRight, Cast, MapPin, Maximize2, Minimize2 } from 'lucide-react-native'
import type { ActionSheetAction } from '../components/sheets/ActionSheetModal'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import type { MobileBrowserStreamedDrawing } from './MobileBrowserDrawingButtons'

/** A streamed tab's ⋯ group: draw it on the phone instead (through the host or on the phone's network), and full screen. */
export function useMobileBrowserDrawingMenu(
  drawing: MobileBrowserStreamedDrawing | null
): ActionSheetAction[] | null {
  const t = useMobileTranslation()
  if (!drawing) {
    return null
  }
  const actions: ActionSheetAction[] = [
    {
      id: 'drawStream',
      label: t('browser.localPane.streamFromHost', 'Stream from the host instead'),
      icon: Cast,
      checked: true,
      onPress: () => {}
    },
    {
      id: 'drawHost',
      label: t('browser.localPane.throughHost', 'Connect through the host'),
      icon: ArrowLeftRight,
      onPress: () => drawing.onDrawingChange('host')
    },
    {
      id: 'drawPhone',
      label: t('browser.localPane.phoneNetwork', "Connect on the phone's network"),
      icon: MapPin,
      onPress: () => drawing.onDrawingChange('phone')
    }
  ]
  const fullScreen = drawing.fullScreen
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
