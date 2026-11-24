import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let appPath = ''
vi.mock('electron', () => ({ app: { getAppPath: () => appPath } }))

type PackageJson = { version?: string; updateFeedUrl?: string }

async function pinWith(packageJson: PackageJson | null) {
  if (packageJson) {
    await writeFile(join(appPath, 'package.json'), JSON.stringify(packageJson))
  }
  vi.resetModules()
  const { pinPrivateUpdateFeed } = await import('./updater-private-feed')
  const setFeedURL = vi.fn()
  const result = await pinPrivateUpdateFeed({ setFeedURL }, () => true)
  return { result, setFeedURL }
}

describe('pinPrivateUpdateFeed', () => {
  beforeEach(async () => {
    appPath = await mkdtemp(join(tmpdir(), 'private-feed-'))
  })
  afterEach(async () => {
    await rm(appPath, { recursive: true, force: true })
  })

  it('points the updater at the https feed the build carries', async () => {
    const { result, setFeedURL } = await pinWith({
      version: '1.0.0',
      updateFeedUrl: 'https://updates.example.com/mac'
    })
    expect(result).toBe('ready')
    expect(setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://updates.example.com/mac'
    })
  })

  it('leaves GitHub releases in charge without a feed, a non-https feed, or a package.json', async () => {
    expect((await pinWith({ version: '1.0.0' })).result).toBeNull()
    expect((await pinWith({ updateFeedUrl: 'http://updates.example.com/mac' })).result).toBeNull()
    await rm(join(appPath, 'package.json'))
    expect((await pinWith(null)).result).toBeNull()
  })
})
