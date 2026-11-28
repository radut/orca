import { useState } from 'react'
import { AtSign, Goal, Package, PencilRuler, Terminal, type LucideIcon } from 'lucide-react-native'
import { spacing } from '../../../../theme/mobile-theme'
import { themedStyleSheet, useThemedStyles } from '../../../../theme/themed-styles'
import { useMobileColors } from '../../../../theme/use-mobile-color-scheme'
import { useMobileTranslation } from '../../../../i18n/use-mobile-translation'
import { LIST_LEADING_INSET, ListGroup, ListRow } from '../../../../components/list/ListGroup'
import { MobileSwitch } from '../../../../components/controls/MobileSwitch'

/** Plan mode as the + sheet's switch; absent where the chat has none. */
export type MobileNativeChatPlanSwitch = {
  on: boolean
  disabled: boolean
  set: (on: boolean) => Promise<unknown>
}

/** A structured chat's workspace context rows. */
export type MobileNativeChatAddSheet = {
  openFileMenu: () => void
  openSlashMenu: (kind: 'skill' | 'command') => void
  skillCount: number
}

/** The Add context sheet's rows below the media: workspace context, plan mode and goal. */
export function MobileNativeChatAddContextRows({
  sheet,
  plan,
  onGoal,
  closeThen
}: {
  sheet: MobileNativeChatAddSheet | undefined
  plan: MobileNativeChatPlanSwitch | undefined
  onGoal: (() => void) | undefined
  /** Pickers wait for the sheet to go: iOS cannot present them over its Modal. */
  closeThen: (action: () => void) => void
}): React.JSX.Element {
  const styles = useThemedStyles(stylesSheet)
  const colors = useMobileColors()
  const t = useMobileTranslation()
  const [planPending, setPlanPending] = useState<boolean | null>(null)
  const later = (action: () => void) => () => closeThen(action)
  const icon = (Icon: LucideIcon) => <Icon size={16} color={colors.textSecondary} />
  const planOn = planPending ?? plan?.on === true
  const setPlan = (on: boolean) => {
    if (!plan || planPending !== null) {
      return
    }
    setPlanPending(on)
    void plan.set(on).finally(() => setPlanPending(null))
  }
  const planLabel = t('session.nativeChatAttachActions.plan', 'Plan first')
  return (
    <>
      {sheet ? (
        <ListGroup separatorInset={LIST_LEADING_INSET} style={styles.group}>
          <ListRow
            key="workspaceFile"
            title={t('session.nativeChatAttachActions.workspaceFile', 'Workspace file')}
            leading={icon(AtSign)}
            navigates
            onPress={later(sheet.openFileMenu)}
          />
          <ListRow
            key="skills"
            title={t('session.nativeChatAttachActions.skills', 'Skills')}
            leading={icon(Package)}
            {...(sheet.skillCount > 0 ? { value: String(sheet.skillCount) } : {})}
            navigates
            onPress={later(() => sheet.openSlashMenu('skill'))}
          />
          <ListRow
            key="commands"
            title={t('session.nativeChatAttachActions.commands', 'Commands')}
            leading={icon(Terminal)}
            navigates
            onPress={later(() => sheet.openSlashMenu('command'))}
          />
        </ListGroup>
      ) : null}
      {plan || onGoal ? (
        <ListGroup separatorInset={LIST_LEADING_INSET} style={styles.group}>
          {plan ? (
            <ListRow
              key="plan"
              title={planLabel}
              leading={icon(PencilRuler)}
              accessory={
                <MobileSwitch
                  value={planOn}
                  disabled={plan.disabled || planPending !== null}
                  accessibilityLabel={planLabel}
                  onValueChange={setPlan}
                />
              }
            />
          ) : null}
          {onGoal ? (
            <ListRow
              key="goal"
              title={t('session.nativeChatAttachActions.goal', 'Set a goal')}
              leading={icon(Goal)}
              navigates
              onPress={later(onGoal)}
            />
          ) : null}
        </ListGroup>
      ) : null}
    </>
  )
}

const stylesSheet = themedStyleSheet(() => ({
  group: { marginTop: spacing.lg }
}))
