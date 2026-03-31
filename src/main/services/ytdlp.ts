import { execFile } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import type { Track, ImportResult } from '../../shared/types'

const BINARY_NAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

function getYtDlpPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'yt-dlp', BINARY_NAME)
  }
  return join(__dirname, '..', '..', 'resources', 'yt-dlp', BINARY_NAME)
}

const BASE_ARGS = ['--no-warnings', '--cookies-from-browser', 'firefox']

function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      getYtDlpPath(),
      [...BASE_ARGS, ...args],
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

export async function importPlaylist(url: string): Promise<ImportResult> {
  const output = await runYtDlp(['--flat-playlist', '--dump-json', url])

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
  const output = await runYtDlp(['-f', 'bestaudio', '--get-url', url])
  return output.trim()
}
