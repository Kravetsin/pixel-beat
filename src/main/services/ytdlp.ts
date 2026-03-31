import { execFile } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import type { Track, ImportResult } from '../../shared/types'
import { getValue, setValue } from './store'

const BINARY_NAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const BROWSERS = ['firefox', 'chrome', 'edge', 'brave', 'chromium', 'opera', 'vivaldi']

function getYtDlpPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'yt-dlp', BINARY_NAME)
  }
  return join(__dirname, '..', '..', 'resources', 'yt-dlp', BINARY_NAME)
}

function getCookiesPath(): string {
  return join(app.getPath('userData'), 'cookies.txt')
}

function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      getYtDlpPath(),
      ['--no-warnings', ...args],
      { maxBuffer: 1024 * 1024 * 10 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve(stdout)
        }
      }
    )
  })
}

function runYtDlpWithCookieArgs(cookieArgs: string[], args: string[]): Promise<string> {
  return runYtDlp([...cookieArgs, ...args])
}

function isBotError(msg: string): boolean {
  return msg.includes('Sign in to confirm') || msg.includes('not a bot')
}

function isDpapiError(msg: string): boolean {
  return msg.includes('Failed to decrypt with DPAPI')
}

/**
 * Try to run yt-dlp with automatic cookie detection.
 * Order: no cookies → cookies.txt file → each browser
 * Caches the working method for future calls.
 */
async function runWithCookies(args: string[]): Promise<string> {
  const cachedMethod = getValue<string>('cookieMethod')

  // If we have a cached working method, try it first
  if (cachedMethod) {
    const cookieArgs = getCookieArgs(cachedMethod)
    try {
      return await runYtDlpWithCookieArgs(cookieArgs, args)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      // If the cached method fails with bot/dpapi, fall through to retry all
      if (!isBotError(msg) && !isDpapiError(msg)) {
        throw e // Real error (video unavailable etc.), don't retry
      }
      // Cached method no longer works, clear it
      setValue('cookieMethod', null)
    }
  }

  // Try without cookies first
  try {
    const result = await runYtDlpWithCookieArgs([], args)
    setValue('cookieMethod', 'none')
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (!isBotError(msg)) throw e
  }

  // Try cookies.txt file
  const cookiesFile = getCookiesPath()
  if (existsSync(cookiesFile)) {
    try {
      const result = await runYtDlpWithCookieArgs(['--cookies', cookiesFile], args)
      setValue('cookieMethod', 'file')
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (!isBotError(msg)) throw e
    }
  }

  // Try each browser
  for (const browser of BROWSERS) {
    try {
      const result = await runYtDlpWithCookieArgs(
        ['--cookies-from-browser', browser],
        args
      )
      setValue('cookieMethod', `browser:${browser}`)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (isDpapiError(msg) || isBotError(msg)) {
        continue // Try next browser
      }
      throw e // Real error
    }
  }

  throw new Error(
    'YouTube requires authentication. Please export your cookies to a cookies.txt file ' +
    'and place it at: ' + cookiesFile +
    '\n\nYou can use a browser extension like "Get cookies.txt LOCALLY" to export cookies from YouTube.'
  )
}

function getCookieArgs(method: string): string[] {
  if (method === 'none') return []
  if (method === 'file') return ['--cookies', getCookiesPath()]
  if (method.startsWith('browser:')) return ['--cookies-from-browser', method.slice(8)]
  return []
}

export async function importPlaylist(url: string): Promise<ImportResult> {
  const output = await runWithCookies(['--flat-playlist', '--dump-json', url])

  const lines = output.trim().split('\n')
  let playlistTitle = 'Imported Playlist'

  const tracks: Track[] = lines.map((line) => {
    const data = JSON.parse(line)
    if (data.playlist_title) {
      playlistTitle = data.playlist_title
    }
    return {
      id: data.id,
      title: data.title || 'Unknown',
      artist: data.uploader || data.channel || 'Unknown',
      duration: data.duration || 0,
      thumbnail: `https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`
    }
  })

  return { title: playlistTitle, tracks }
}

export async function getAudioStreamUrl(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  const output = await runWithCookies(['-f', 'bestaudio', '--get-url', url])
  return output.trim()
}
