import type { MobileWebBundleReusableAssets } from '../transport/mobile-web-bundle-fetch'
import type { MobileWebBundleAssetRead } from '../transport/mobile-web-bundle-reply-schemas'
import { requireStorablePath } from './generation-asset-path'
import { joinUri } from './generation-cache-uri'
import type { ActiveGeneration } from './generation-store'
import type { GenerationFileSystem } from './generation-store-file-system'

// Copy immutable, previously hash-verified assets without reading them into JS; match content so renamed assets remain reusable.
function cachedFileOf(
  actives: readonly ActiveGeneration[],
  asset: MobileWebBundleAssetRead
): string | null {
  for (const active of actives) {
    const cached = active.manifest.assets.find((entry) => entry.sha256 === asset.sha256)
    if (cached?.byteLength === asset.byteLength) {
      return joinUri(active.directory, requireStorablePath(cached.path))
    }
  }
  return null
}

export function reusableAssetsOf(
  fs: GenerationFileSystem,
  actives: readonly ActiveGeneration[]
): MobileWebBundleReusableAssets {
  return {
    has: (asset) => {
      try {
        return cachedFileOf(actives, asset) !== null
      } catch {
        return false
      }
    },
    check: async (asset) => {
      try {
        const source = cachedFileOf(actives, asset)
        return source !== null && (await fs.fileSize(source)) === asset.byteLength
      } catch {
        return false
      }
    }
  }
}

// Stage from the current activation: an intervening commit may have replaced the download’s source. Missing/incomplete copies fail staging so retry checks the new activation.
export async function copyCachedAsset(
  fs: GenerationFileSystem,
  actives: readonly ActiveGeneration[],
  asset: MobileWebBundleAssetRead,
  target: string
): Promise<void> {
  const source = cachedFileOf(actives, asset)
  if (source === null) {
    throw new Error(`the cached generation no longer holds the reused asset ${asset.path}`)
  }
  await fs.copyFile(source, target)
  if ((await fs.fileSize(target)) !== asset.byteLength) {
    throw new Error(`the reused asset ${asset.path} did not copy whole`)
  }
}
