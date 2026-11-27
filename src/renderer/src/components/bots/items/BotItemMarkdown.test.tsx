// @vitest-environment happy-dom
import { cleanup, render as renderInDom, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { afterEach, expect, it } from 'vitest'
import { BotItemMarkdown } from './BotItemMarkdown'

// The code buttons' hover labels need the app's tooltip provider.
const render = (ui: React.ReactElement) => renderInDom(ui, { wrapper: TooltipProvider })

afterEach(cleanup)

it('draws item text as chat does: code block header, literal ~ and unknown tags kept', () => {
  const text =
    'Takes ~5 min, then ~10. Returns Promise<void>.\n\n```powershell\nGet-Item a\nGet-Item b\n```'
  const { container } = render(<BotItemMarkdown text={text} />)
  expect(container.querySelector('[data-code-language="powershell"]')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Wrap lines' })).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Copy code' })).not.toBeNull()
  expect(container.querySelector('del')).toBeNull()
  expect(container.textContent).toContain('Takes ~5 min, then ~10. Returns Promise<void>.')
})
