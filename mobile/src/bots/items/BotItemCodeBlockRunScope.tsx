import type { ReactNode } from 'react'
import { MobileCodeBlockRunScope } from '../../components/markdown/blocks/mobile-code-block-run'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { botHomeWorktreeId, type HostBot } from '../host-bots-read'

/** Bot items run their code blocks in the bot's home workspace, wherever the page opens. */
export function BotItemCodeBlockRunScope(props: {
  client: RpcClient | null
  bot: Pick<HostBot, 'folderWorkspaceId'>
  children: ReactNode
}) {
  return (
    <MobileCodeBlockRunScope client={props.client} worktreeId={botHomeWorktreeId(props.bot)}>
      {props.children}
    </MobileCodeBlockRunScope>
  )
}
