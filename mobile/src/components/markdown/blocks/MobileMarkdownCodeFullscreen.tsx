import { X } from 'lucide-react-native'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { StyleProp, TextStyle } from 'react-native'
import type { MobileSyntaxSegment } from '../../../files/session-documents/mobile-file-syntax'
import { useMobileTranslation } from '../../../i18n/use-mobile-translation'
import { useWindowSafeAreaInsets } from '../../../layout/side-safe-area'
import { colors, pressedStyle, spacing, typography } from '../../../theme/mobile-theme'
import { themedStyleSheet } from '../../../theme/themed-styles'
import { useMobileColorScheme } from '../../../theme/use-mobile-color-scheme'
import { MobileSourceCopyButton } from '../../code-presentation/MobileSourceCopyButton'
import { MobileSyntaxSegments } from '../../code-presentation/MobileSyntaxSegments'

export function MobileMarkdownCodeFullscreen({
  label,
  code,
  segments,
  lineNumbers,
  textStyle,
  onClose
}: {
  label: string
  code: string
  segments: MobileSyntaxSegment[] | null
  lineNumbers: string
  textStyle: StyleProp<TextStyle>
  onClose: () => void
}) {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const insets = useWindowSafeAreaInsets()
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View
        style={[
          styles.sheet,
          {
            paddingTop: insets.top,
            paddingRight: insets.right,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left
          }
        ]}
      >
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>
          <MobileSourceCopyButton
            text={code}
            accessibilityLabel={t('components.markdownBlocks.copyCode', 'Copy code')}
          />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Close')}
            hitSlop={8}
            style={({ pressed }) => [styles.closeButton, pressed && pressedStyle]}
          >
            <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
          </Pressable>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.row}>
            <Text selectable={false} aria-hidden style={[textStyle, styles.lineNumbers]}>
              {lineNumbers}
            </Text>
            <ScrollView horizontal>
              <Text selectable style={[textStyle, styles.lines]}>
                {segments ? <MobileSyntaxSegments segments={segments} /> : code}
              </Text>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = themedStyleSheet(() => ({
  sheet: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.metaSize,
    textTransform: 'uppercase'
  },
  closeButton: { padding: spacing.xs },
  body: { flex: 1 },
  bodyContent: { paddingVertical: spacing.md },
  row: { flexDirection: 'row' },
  lineNumbers: { paddingHorizontal: spacing.sm, color: colors.textMuted, textAlign: 'right' },
  lines: { paddingRight: spacing.md }
}))
