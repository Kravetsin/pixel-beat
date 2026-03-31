/**
 * Downloads the latest yt-dlp binary for the current (or specified) platform.
 * Usage: node scripts/download-ytdlp.mjs [win|mac|linux]
 */
import { execSync } from 'child_process'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(__dirname, '..', 'resources', 'yt-dlp')

const BINARIES = {
  win: { name: 'yt-dlp.exe', url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' },
  mac: { name: 'yt-dlp_macos', url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos' },
  linux: { name: 'yt-dlp_linux', url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux' }
}

const platformArg = process.argv[2]
let platform
if (platformArg) {
  platform = platformArg
} else if (process.platform === 'win32') {
  platform = 'win'
} else if (process.platform === 'darwin') {
  platform = 'mac'
} else {
  platform = 'linux'
}

const binary = BINARIES[platform]
if (!binary) {
  console.error(`Unknown platform: ${platform}`)
  process.exit(1)
}

if (!existsSync(resourcesDir)) {
  mkdirSync(resourcesDir, { recursive: true })
}

const outPath = join(resourcesDir, binary.name)
console.log(`Downloading yt-dlp for ${platform}...`)
execSync(`curl -L -o "${outPath}" "${binary.url}"`, { stdio: 'inherit' })

if (platform !== 'win') {
  execSync(`chmod +x "${outPath}"`)
}

console.log(`Done: ${outPath}`)
