import { Pressable } from 'react-native'
import { ArrowUp } from 'lucide-react-native'
import { colors, radii } from '../../../../theme/mobile-theme'
import { themedStyleSheet } from '../../../../theme/themed-styles'
import { useMobileTranslation } from '../../../../i18n/use-mobile-translation'

/** As on desktop: a reply with words can be read again from its start. */
export function MobileNativeChatScrollToStartButton({
  onPress
}: {
  onPress: () => void
}): React.JSX.Element {
  const t = useMobileTranslation()
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('chat.message.scrollMessageToTop', 'Scroll this message to top')}
      onPress={onPress}
    >
      <ArrowUp size={14} color={colors.textMuted} />
    </Pressable>
  )
}

const styles = themedStyleSheet(() => ({
  button: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control
  },
  pressed: { backgroundColor: colors.bgRaised }
}))
