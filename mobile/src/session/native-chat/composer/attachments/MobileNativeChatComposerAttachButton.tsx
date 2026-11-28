import { useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useThemedStyles } from '../../../../theme/themed-styles'
import { useMobileColors } from '../../../../theme/use-mobile-color-scheme'
import { useMobileTranslation } from '../../../../i18n/use-mobile-translation'
import { mobileNativeChatAttachActions } from './mobile-native-chat-attach-actions'
import { MobileNativeChatAddContextSheet } from './MobileNativeChatAddContextSheet'
import {
  MobileNativeChatAddContextRows,
  type MobileNativeChatAddSheet,
  type MobileNativeChatPlanSwitch
} from './MobileNativeChatAddContextRows'
import type {
  AddContextChoice,
  MobileComposerImagePick,
  MobilePickedFileSource
} from '../../../../platform/media-picking/media-picker-contract'
import { useMediaPicker } from '../../../../platform/media-picking/media-picker'
import {
  COMPOSER_CONTROL_HIT_SLOP,
  composerInputStylesSheet as inputStylesSheet
} from '../../../../components/composer-input/composer-input-styles'

/** The composer's + button: opens the Add context sheet (photos, camera, files and, in a structured chat, workspace context). */
export function MobileNativeChatComposerAttachButton({
  onAttachImages,
  onAttachFiles,
  structured,
  isAttaching,
  disabled,
  menu,
  plan,
  onGoal
}: {
  onAttachImages: ((pick: MobileComposerImagePick) => void) | undefined
  onAttachFiles: ((from: MobilePickedFileSource) => void) | undefined
  structured: boolean
  isAttaching: boolean
  disabled: boolean
  /** A chat's workspace-context rows; without it the sheet offers only what onAttach* can add. */
  menu?: MobileNativeChatAddSheet
  plan?: MobileNativeChatPlanSwitch
  /** Enters goal mode; absent while it is on or where the chat has none. */
  onGoal?: (() => void) | undefined
}): React.JSX.Element | null {
  const inputStyles = useThemedStyles(inputStylesSheet)
  const colors = useMobileColors()
  const t = useMobileTranslation()
  const picker = useMediaPicker()
  const [attachOpen, setAttachOpen] = useState(false)
  if (!onAttachImages && !onAttachFiles && !(structured && menu)) {
    return null
  }
  const sheet = structured ? menu : undefined
  const run = (choice: AddContextChoice): void => {
    if (choice.choice === 'recent') {
      if (onAttachImages) {
        onAttachImages({ recentPhotos: choice.images, release: choice.release })
      } else {
        choice.release()
      }
    } else if (choice.choice === 'camera' || choice.choice === 'photos') {
      onAttachImages?.(choice.choice === 'camera' ? 'camera' : 'library')
    } else if (choice.choice === 'files' || choice.choice === 'videos') {
      onAttachFiles?.(choice.choice)
    } else if (choice.choice === 'workspaceFile') {
      sheet?.openFileMenu()
    } else if (choice.choice === 'skills' || choice.choice === 'commands') {
      sheet?.openSlashMenu(choice.choice === 'skills' ? 'skill' : 'command')
    } else if (choice.choice === 'planOn' || choice.choice === 'planOff') {
      void plan?.set(choice.choice === 'planOn')
    } else if (choice.choice === 'goal') {
      onGoal?.()
    }
  }
  // On the served page the shell draws the sheet, so the photo library never reaches the page.
  const { openAddContext, recentPhotos: library } = picker
  const open = openAddContext
    ? () => {
        const options = {
          images: onAttachImages !== undefined,
          files: onAttachFiles !== undefined,
          structured: sheet !== undefined,
          skillCount: sheet?.skillCount ?? 0,
          ...(plan && !plan.disabled ? { plan: plan.on } : {}),
          ...(onGoal ? { goal: true } : {})
        }
        openAddContext(options).then(run, (error: unknown) => {
          console.warn('[add-context] the shell sheet failed; drawing it in the page', error)
          setAttachOpen(true)
        })
      }
    : () => setAttachOpen(true)
  const attachPress = () => {
    Keyboard.dismiss()
    open()
  }
  return (
    <>
      <Pressable
        accessibilityLabel={t('chat.composer.addToMessage', 'Add to message')}
        style={({ pressed }) => [inputStyles.controlButton, pressed && inputStyles.pressed]}
        onPress={attachPress}
        disabled={isAttaching || disabled}
        hitSlop={COMPOSER_CONTROL_HIT_SLOP}
      >
        {isAttaching ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Plus size={19} color={colors.textPrimary} strokeWidth={2} />
        )}
      </Pressable>
      <MobileNativeChatAddContextSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPhotos={onAttachImages && (() => onAttachImages('library'))}
        onCamera={onAttachImages && (() => onAttachImages('camera'))}
        library={library}
        onRecentPhotos={
          onAttachImages && library
            ? (ids) => onAttachImages({ recentPhotos: library.pick(ids), release: () => {} })
            : undefined
        }
        actions={mobileNativeChatAttachActions({
          onFiles: onAttachFiles && (() => onAttachFiles('files')),
          onVideos: onAttachFiles && (() => onAttachFiles('videos')),
          t
        })}
      >
        {(closeThen) => <MobileNativeChatAddContextRows {...{ sheet, plan, onGoal, closeThen }} />}
      </MobileNativeChatAddContextSheet>
    </>
  )
}
