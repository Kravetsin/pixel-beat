import { app, shell, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { importPlaylist, getAudioStreamUrl } from './services/ytdlp'
import { setValue, getValue } from './services/store'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let petOverlayWindow: BrowserWindow | null = null
let petOverlayConfig: unknown = null
let isQuitting = false

function createPetOverlay(config: unknown): void {
  if (petOverlayWindow) return

  petOverlayConfig = config

  petOverlayWindow = new BrowserWindow({
    width: 120,
    height: 120,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  petOverlayWindow.on('ready-to-show', () => {
    petOverlayWindow?.show()
    petOverlayWindow?.webContents.send('pet-overlay:config', petOverlayConfig)
  })

  petOverlayWindow.webContents.on('context-menu', () => {
    const menu = Menu.buildFromTemplate([
      { label: 'Show PixelBeat', click: () => restoreFromPetMode() },
      { type: 'separator' },
      { label: 'Play / Pause', click: () => mainWindow?.webContents.send('tray:toggle-play') },
      { label: 'Next Track', click: () => mainWindow?.webContents.send('tray:next') },
      { label: 'Previous Track', click: () => mainWindow?.webContents.send('tray:previous') },
      { type: 'separator' },
      { label: 'Quit', click: () => { isQuitting = true; app.quit() } }
    ])
    menu.popup({ window: petOverlayWindow! })
  })

  petOverlayWindow.on('closed', () => {
    petOverlayWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    petOverlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/pet-overlay.html')
  } else {
    petOverlayWindow.loadFile(join(__dirname, '../renderer/pet-overlay.html'))
  }
}

function restoreFromPetMode(): void {
  if (petOverlayWindow) {
    petOverlayWindow.close()
    petOverlayWindow = null
  }
  mainWindow?.show()
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show PixelBeat',
      click: () => mainWindow?.show()
    },
    {
      label: 'Play / Pause',
      click: () => mainWindow?.webContents.send('tray:toggle-play')
    },
    {
      label: 'Next Track',
      click: () => mainWindow?.webContents.send('tray:next')
    },
    {
      label: 'Previous Track',
      click: () => mainWindow?.webContents.send('tray:previous')
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('PixelBeat')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => restoreFromPetMode())
}

function createWindow(): void {
  const savedBounds = getValue<{ x: number; y: number; width: number; height: number }>('windowBounds')

  mainWindow = new BrowserWindow({
    ...(savedBounds || { width: 960, height: 700 }),
    minWidth: 800,
    minHeight: 500,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Save window bounds on resize/move
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  const saveBounds = (): void => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
        setValue('windowBounds', mainWindow.getBounds())
      }
    }, 500)
  }
  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow!.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('playlist:import', async (_, url: string) => {
    try {
      return await importPlaylist(url)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })
  ipcMain.handle('audio:get-stream-url', async (_, videoId: string) => {
    try {
      return await getAudioStreamUrl(videoId)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })
  ipcMain.handle('store:set', (_, key: string, value: unknown) => {
    setValue(key, value)
  })
  ipcMain.handle('store:get', (_, key: string) => {
    return getValue(key)
  })
}

function setupAutoUpdater(): void {
  if (is.dev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', info.version)
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:progress', Math.round(progress.percent))
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update:downloaded')
  })

  autoUpdater.on('error', () => {
    // Silent fail — don't bother the user
  })

  ipcMain.on('update:download', () => {
    autoUpdater.downloadUpdate()
  })

  ipcMain.on('update:install', () => {
    isQuitting = true
    autoUpdater.quitAndInstall()
  })

  autoUpdater.checkForUpdates()
}

app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.pixelbeat.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Strip Referer/Origin for googlevideo.com so audio streams aren't rejected
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.googlevideo.com/*'] },
    (details, callback) => {
      delete details.requestHeaders['Referer']
      delete details.requestHeaders['Origin']
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  // Add CORS headers to googlevideo.com responses so Web Audio API can analyze audio
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['*://*.googlevideo.com/*'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*']
        }
      })
    }
  )

  ipcMain.on('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.on('window:close', () => BrowserWindow.getFocusedWindow()?.close())

  ipcMain.on('pet-overlay:enter', (_, config) => {
    mainWindow?.hide()
    createPetOverlay(config)
  })

  ipcMain.on('pet-overlay:restore', () => {
    restoreFromPetMode()
  })

  // Pet overlay dragging — main process polls cursor for smooth movement
  let dragInterval: ReturnType<typeof setInterval> | null = null
  let dragOffsetX = 0
  let dragOffsetY = 0

  ipcMain.on('pet-overlay:drag-start', (_, offsetX: number, offsetY: number) => {
    dragOffsetX = offsetX
    dragOffsetY = offsetY
    if (dragInterval) clearInterval(dragInterval)
    dragInterval = setInterval(() => {
      if (!petOverlayWindow || petOverlayWindow.isDestroyed()) {
        if (dragInterval) { clearInterval(dragInterval); dragInterval = null }
        return
      }
      const cursor = screen.getCursorScreenPoint()
      petOverlayWindow.setPosition(cursor.x - dragOffsetX, cursor.y - dragOffsetY)
    }, 5)
  })

  ipcMain.on('pet-overlay:drag-end', () => {
    if (dragInterval) { clearInterval(dragInterval); dragInterval = null }
  })

  ipcMain.on('pet-overlay:toggle-play', () => {
    mainWindow?.webContents.send('tray:toggle-play')
  })

  ipcMain.on('beat-energy:update', (_, energy) => {
    if (petOverlayWindow && !petOverlayWindow.isDestroyed()) {
      petOverlayWindow.webContents.send('beat-energy:forward', energy)
    }
  })

  registerIpcHandlers()
  createTray()
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
