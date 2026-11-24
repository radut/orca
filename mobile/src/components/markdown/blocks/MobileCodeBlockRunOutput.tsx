import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { CodeBlockRunState } from '../../../../../src/shared/code-block-terminal-run'
import { useMobileTranslation } from '../../../i18n/use-mobile-translation'
import { colors, spacing, typography } from '../../../theme/mobile-theme'
import { themedStyleSheet } from '../../../theme/themed-styles'
import { scaledMarkdownText } from '../mobile-markdown-styles'

/** A Play run's output, under its code block. */
export function MobileCodeBlockRunOutput({
  state,
  textScale
}: {
  state: CodeBlockRunState
  textScale: number
}) {
  const t = useMobileTranslation()
  const status =
    state.status === 'running'
      ? t('components.markdownBlocks.runRunning', 'Running…')
      : state.status === 'done'
        ? t('components.markdownBlocks.runExited', 'Exit {{code}}', { code: state.exitCode })
        : state.reason === 'timeout'
          ? t('components.markdownBlocks.runTimedOut', 'Stopped after 5 minutes')
          : state.reason === 'closed'
            ? t('components.markdownBlocks.runClosed', 'The terminal closed before it finished')
            : (state.message ?? t('components.markdownBlocks.runFailed', 'Could not run it'))
  const failed = state.status === 'failed' || (state.status === 'done' && state.exitCode !== 0)
  return (
    <View style={styles.root}>
      {state.output ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text selectable style={[styles.output, scaledMarkdownText(styles.output, textScale)]}>
            {state.output}
          </Text>
        </ScrollView>
      ) : null}
      <Text style={[styles.status, failed && styles.statusFailed]}>{status}</Text>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  root: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle
  },
  output: {
    fontFamily: typography.monoFamily,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary
  },
  status: {
    fontSize: 12,
    color: colors.textMuted
  },
  statusFailed: {
    color: colors.statusRed
  }
}))
