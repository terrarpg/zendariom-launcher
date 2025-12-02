/**
 * Zendariom Games Launcher
 * Launcher Minecraft pour Selvania
 */

const { app, ipcMain, nativeTheme, BrowserWindow } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Variables
let dev = process.env.NODE_ENV === 'dev';
let mainWindow = null;

// Configuration autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

console.log('🚀 Zendariom Launcher - Version:', app.getVersion());
console.log('📱 Mode:', dev ? 'Développement' : 'Production');

// Fonction pour créer la fenêtre principale
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        icon: path.join(__dirname, 'assets/images/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'launcher.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Fonction pour vérifier les mises à jour (SANS CRASH)
async function checkForUpdates() {
    console.log('🔍 Vérification des mises à jour sur GitHub...');
    
    if (dev) {
        console.log('🧪 Mode dev - Pas de vérification');
        return { updateAvailable: false, version: app.getVersion() };
    }
    
    try {
        // Attendre 1s pour que la fenêtre s'affiche
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifier les mises à jour
        const result = await autoUpdater.checkForUpdates();
        
        if (result && result.updateInfo) {
            console.log('⬆️ Mise à jour disponible:', result.updateInfo.version);
            return {
                updateAvailable: true,
                version: result.updateInfo.version,
                releaseDate: result.updateInfo.releaseDate
            };
        } else {
            console.log('✅ Aucune mise à jour disponible');
            return { updateAvailable: false, version: app.getVersion() };
        }
        
    } catch (error) {
        console.log('⚠️ Erreur de vérification:', error.message);
        console.log('➡️ Lancement du launcher quand même...');
        
        // EN CAS D'ERREUR, ON CONTINUE QUAND MÊME
        return {
            updateAvailable: false,
            version: app.getVersion(),
            error: error.message,
            continue: true
        };
    }
}

// Quand l'app est prête
app.whenReady().then(async () => {
    console.log('✅ Application prête');
    
    if (dev) {
        // Mode développement : on lance directement
        console.log('⚡ Mode dev - Lancement direct');
        createMainWindow();
    } else {
        // Mode production : on vérifie les mises à jour D'ABORD
        console.log('🌐 Mode production - Vérification GitHub...');
        
        // Créer une fenêtre de splash temporaire
        const splashWindow = new BrowserWindow({
            width: 400,
            height: 300,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true
            }
        });
        
        splashWindow.loadFile(path.join(__dirname, 'index.html'));
        splashWindow.show();
        
        // Vérifier les mises à jour
        const updateResult = await checkForUpdates();
        
        if (updateResult.updateAvailable) {
            // Si mise à jour disponible, fermer splash et ouvrir fenêtre update
            splashWindow.close();
            
            // Ici tu devrais créer ta fenêtre de mise à jour
            // Pour l'instant, on lance le launcher quand même
            console.log('📦 Mise à jour disponible mais lancement du launcher...');
            createMainWindow();
        } else {
            // Pas de mise à jour ou erreur → lancer le launcher
            splashWindow.close();
            console.log('🎮 Lancement du launcher...');
            createMainWindow();
        }
    }
});

// IPC Handlers
ipcMain.handle('update-app', async () => {
    return await checkForUpdates();
});

ipcMain.handle('Microsoft-window', async (_, client_id) => {
    return await new Microsoft(client_id).getAuth();
});

ipcMain.handle('is-dark-theme', (_, theme) => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle('path-user-data', () => app.getPath('userData'));
ipcMain.handle('appData', () => app.getPath('appData'));

ipcMain.on('main-window-close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.on('main-window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('main-window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

// Gestion de la fermeture
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});