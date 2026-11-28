import { Camera, Image, Paperclip } from 'lucide-react-native'
import type { ActionSheetAction } from '../../../../components/sheets/ActionSheetModal'
import type { Translate } from '../../../../i18n/mobile-i18n'

// Dismiss the sheet before opening pickers because iOS cannot present them over its Modal.
export function mobileNativeChatAttachActions(args: {
  onPhotos?: (() => void) | undefined
  onCamera?: (() => void) | undefined
  onFiles: (() => void) | undefined
  t: Translate
}): ActionSheetAction[] {
  const actions: ActionSheetAction[] = []
  if (args.onPhotos) {
    actions.push({
      id: 'photos',
      label: args.t('session.nativeChatAttachActions.photos', 'Photos'),
      icon: Image,
      closeBeforePress: true,
      onPress: args.onPhotos
    })
  }
  if (args.onCamera) {
    actions.push({
      id: 'camera',
      label: args.t('session.terminalInputActions.takePhoto', 'Take a photo'),
      icon: Camera,
      closeBeforePress: true,
      onPress: args.onCamera
    })
  }
  if (args.onFiles) {
    actions.push({
      id: 'files',
      label: args.t('session.nativeChatAttachActions.files', 'Files'),
      icon: Paperclip,
      closeBeforePress: true,
      onPress: args.onFiles
    })
  }
  return actions
}
