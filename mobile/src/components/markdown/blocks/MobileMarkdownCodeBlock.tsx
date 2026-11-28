import { Play, TextWrap } from 'lucide-react-native'
import { memo, useContext, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useMobileTranslation } from '../../../i18n/use-mobile-translation'
import { highlightMobileCode } from '../../../files/session-documents/mobile-file-syntax'
import {
  MobileNativeChatMarkdownRowKeyContext,
  useMobileNativeChatDisclosure
} from '../../../session/native-chat/transcript/viewport/mobile-native-chat-disclosure-store'
import { pressedStyle } from '../../../theme/mobile-theme'
import { useMobileColors } from '../../../theme/use-mobile-color-scheme'
import { MobileSyntaxSegments } from '../../code-presentation/MobileSyntaxSegments'
import { MobileSourceCopyButton } from '../../code-presentation/MobileSourceCopyButton'
import { scaledMarkdownText, stylesSheet } from '../mobile-markdown-styles'
import { MarkdownText } from '../mobile-markdown-text'
import { useThemedStyles } from '../../../theme/themed-styles'
import { codeBlockTerminalScript } from '../../../../../src/shared/code-block-terminal-script'
import type { CodeBlockRunState } from '../../../../../src/shared/code-block-terminal-run'
import { MobileCodeBlockRunContext } from './mobile-code-block-run'
import { MobileCodeBlockRunOutput } from './MobileCodeBlockRunOutput'

// Play is the block's main action, so it gets a full 32 pt target beside the 24 pt wrap toggle.
const RUN_BUTTON_SIZE = { width: 32, height: 32 }

export const MobileMarkdownCodeBlock = memo(function MobileMarkdownCodeBlock({
  code,
  language,
  textScale,
  sourceLine
}: {
  code: string
  language: string | undefined
  textScale: number
  /** The fence's line in the message; with the chat row it names this block's wrap choice. */
  sourceLine?: number
}) {
  const colors = useMobileColors()
  const styles = useThemedStyles(stylesSheet)
  const t = useMobileTranslation()
  // In chat the transcript keeps the wrap choice, never persisted; elsewhere it is local.
  const rowKey = useContext(MobileNativeChatMarkdownRowKeyContext)
  const run = useContext(MobileCodeBlockRunContext)
  const command = useMemo(() => codeBlockTerminalScript(code, language), [code, language])
  const [runState, setRunState] = useState<CodeBlockRunState | null>(null)
  const [wrapped, setWrapped] = useMobileNativeChatDisclosure(
    rowKey && sourceLine !== undefined ? `code-wrap:${rowKey}:${sourceLine}` : undefined,
    false
  )
  const segments = useMemo(
    () => (language ? highlightMobileCode(code, language.toLowerCase()).segments : null),
    [code, language]
  )
  const lineNumbers = useMemo(
    () => Array.from({ length: code.split('\n').length }, (_, index) => index + 1).join('\n'),
    [code]
  )
  const metrics = [styles.codeText, scaledMarkdownText(styles.codeText, textScale)]
  const lines = (
    <MarkdownText
      selectable
      style={[metrics, styles.codeLines, wrapped && styles.codeLinesWrapped]}
    >
      {segments ? <MobileSyntaxSegments segments={segments} /> : code}
    </MarkdownText>
  )
  const wrapLabel = wrapped
    ? t('components.markdownBlocks.disableLineWrap', 'Disable line wrap')
    : t('components.markdownBlocks.wrapLines', 'Wrap lines')
  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text numberOfLines={1} style={styles.codeLanguage}>
          {language || t('components.markdownBlocks.codeLabel', 'Code')}
        </Text>
        <View style={styles.codeActions}>
          {run && command ? (
            <Pressable
              style={({ pressed }) => [
                styles.codeWrapButton,
                RUN_BUTTON_SIZE,
                pressed && pressedStyle
              ]}
              hitSlop={8}
              disabled={runState?.status === 'running'}
              accessibilityRole="button"
              accessibilityLabel={t('components.markdownBlocks.runInTerminal', 'Run')}
              onPress={() => void run(command, setRunState)}
            >
              <Play
                size={16}
                color={runState?.status === 'running' ? colors.textPrimary : colors.textMuted}
              />
            </Pressable>
          ) : null}
          {code ? (
            <Pressable
              style={({ pressed }) => [
                styles.codeWrapButton,
                wrapped && styles.codeWrapButtonOn,
                pressed && pressedStyle
              ]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={wrapLabel}
              accessibilityState={{ selected: wrapped }}
              aria-pressed={wrapped}
              onPress={() => setWrapped(!wrapped)}
            >
              <TextWrap size={14} color={wrapped ? colors.textPrimary : colors.textMuted} />
            </Pressable>
          ) : null}
          {code ? (
            <MobileSourceCopyButton
              text={code}
              accessibilityLabel={t('components.markdownBlocks.copyCode', 'Copy code')}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.codeBody}>
        {/* A separate column, so selecting or copying the code never picks up line numbers.
            Wrapped lines would drift from it, so wrapping drops it. */}
        {code && !wrapped ? (
          <Text selectable={false} aria-hidden style={[metrics, styles.codeLineNumbers]}>
            {lineNumbers}
          </Text>
        ) : null}
        {wrapped ? (
          lines
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {lines}
          </ScrollView>
        )}
      </View>
      {runState ? <MobileCodeBlockRunOutput state={runState} textScale={textScale} /> : null}
    </View>
  )
})
