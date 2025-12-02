/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

class Home {
    static id = "home";
    
    async init(config) {
        this.config = config;
        this.db = new database();
        
        await this.applyMinecraftFix();
        
        this.news()
        this.socialLick()
        await this.instancesSelect()
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))
    }

    async applyMinecraftFix() {
        try {
            const librariesPath = path.join(__dirname, '../node_modules/minecraft-java-core/build/Minecraft/Minecraft-Libraries.js');
            
            if (await this.fileExists(librariesPath)) {
                let content = await fs.readFile(librariesPath, 'utf8');
                
                console.log('🔧 Application du correctif pour les chemins...');
                
                if (content.includes('${this.options.path}/instances/${this.options.instance}')) {
                    console.log('✅ Correctif déjà appliqué');
                    return true;
                }
                
                const oldPattern = /path:\s*this\.options\.instance\s*\?\s*`instances\/\$\{this\.options\.instance\}\/\$\{asset\.path\}`\s*:\s*asset\.path,/g;
                
                const newCode = `path: this.options.instance
                    ? \`\${this.options.path}/instances/\${this.options.instance}/\${asset.path}\`
                    : \`\${this.options.path}/\${asset.path}\`,`;
                
                if (content.match(oldPattern)) {
                    content = content.replace(oldPattern, newCode);
                    await fs.writeFile(librariesPath, content, 'utf8');
                    console.log('✅ Correctif appliqué avec succès !');
                    return true;
                }
                return false;
            } else {
                console.log('❌ Fichier Minecraft-Libraries.js introuvable');
                return false;
            }
        } catch (error) {
            console.log('❌ Erreur lors de l\'application du correctif:', error);
            return false;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews().then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Aucun news n'ai actuellement disponible.</div>
                        </div>
                        <div class="date">
                            <div class="day">1</div>
                            <div class="month">Janvier</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Vous pourrez suivre ici toutes les news relative au serveur.</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author">Auteur - <span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">1</div>
                            <div class="month">Janvier</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Impossible de contacter le serveur des news.</br>Merci de vérifier votre configuration.</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block')

        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(e.target.dataset.url)
            })
        });
    }

    // MÉTHODE CRITIQUE - Créer les éléments HTML manquants
    createMissingStatusElements() {
        console.log('🔧 Création des éléments de statut manquants...');
        
        // Vérifier si les éléments existent déjà
        if (document.querySelector('.server-status-container')) {
            console.log('✅ Éléments de statut déjà existants');
            return;
        }
        
        // Chercher où mettre le statut
        const possibleContainers = [
            document.querySelector('.home-panel'),
            document.querySelector('.main-content'), 
            document.querySelector('.panel-content'),
            document.querySelector('.home-container'),
            document.querySelector('.container'),
            document.body
        ];
        
        const container = possibleContainers.find(el => el !== null);
        
        if (!container) {
            console.log('❌ Aucun conteneur trouvé');
            return;
        }
        
        // CRÉER LES ÉLÉMENTS MANQUANTS
        const statusContainer = document.createElement('div');
        statusContainer.className = 'server-status-container';
        statusContainer.style.cssText = `
            background: #2c2f33;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #36b030;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        statusContainer.innerHTML = `
            <div class="server-status-info">
                <div class="server-status-text" style="font-size: 18px; font-weight: bold; color: #36b030;">
                    🟢 Chargement...
                </div>
                <div class="server-details" style="margin-top: 10px; font-size: 14px;">
                    <span class="player-count">Joueurs: 0/100</span> | 
                    <span class="server-ip">IP: Chargement...</span>
                </div>
            </div>
        `;
        
        // Ajouter au début du conteneur
        container.prepend(statusContainer);
        console.log('✅ Éléments de statut créés avec succès!');
        
        return statusContainer;
    }

    // SERVEUR EN DUR DANS LE LAUNCHER
    getHardcodedServer() {
        console.log('🎯 Chargement du serveur en dur...');
        
        const server = {
            name: "zendariom",
            url: "https://config-20dh.onrender.com/files?instance=zendariom",
            loadder: {
                minecraft_version: "1.20.1",
                loadder_type: "fabric",
                loadder_version: "latest"
            },
            verify: true,
            ignored: [
                "config",
                "logs",
                "resourcepacks",
                "options.txt",
                "optionsof.txt"
            ],
            whitelist: ["Luuxis"],
            whitelistActive: false,
            status: {
                nameServer: "ZENDARIOM",
                ip: "91.197.6.16:26710",
                port: 26710
            }
        };
        
        console.log('📦 Serveur en dur chargé:', server);
        return server;
    }

    async instancesSelect() {
        try {
            console.log('🔍 Début instancesSelect()');
            
            // CRÉER LES ÉLÉMENTS IMMÉDIATEMENT
            this.createMissingStatusElements();
            
            let configClient = await this.db.readData('configClient') || {};
            
            // CHARGEMENT DU SERVEUR EN DUR
            let server = this.getHardcodedServer();
            
            // FORCER LA SÉLECTION DU SERVEUR ZENDARIOM
            configClient.instance_selct = "zendariom";
            await this.db.updateData('configClient', configClient);
            
            console.log('🎯 Serveur sélectionné: zendariom');
            
            // CACHER LA SÉLECTION D'INSTANCE PUISQU'IL N'Y A QU'UN SEUL SERVEUR
            let instanceSelect = document.querySelector('.instance-select');
            if (instanceSelect) {
                instanceSelect.style.display = 'none';
            }
            
            let instanceBTN = document.querySelector('.play-instance');
            if (instanceBTN) {
                instanceBTN.style.paddingRight = '0';
            }
            
            // VÉRIFICATION AUTOMATIQUE DU STATUT
            console.log('🚀 Vérification automatique du statut pour: ZENDARIOM');
            await this.checkAndDisplayServerStatus(server);

            // GESTION DU BOUTON PLAY
            if (instanceBTN) {
                instanceBTN.addEventListener('click', async e => {
                    this.startGame();
                });
            }

            // ACTUALISATION AUTOMATIQUE TOUTES LES 30 SECONDES
            if (this.statusInterval) {
                clearInterval(this.statusInterval);
            }
            
            this.statusInterval = setInterval(async () => {
                console.log('🔄 Actualisation automatique du statut...');
                await this.checkAndDisplayServerStatus(server);
            }, 30000);

        } catch (error) {
            console.log('❌ Erreur dans instancesSelect:', error);
            const server = this.getHardcodedServer();
            await this.checkAndDisplayServerStatus(server);
        }
    }

    // MÉTHODE PRINCIPALE: Vérification automatique du statut
    async checkAndDisplayServerStatus(server) {
        try {
            if (!server || !server.status) {
                await this.showServerStatus('offline', 'Configuration manquante');
                return;
            }

            const statusConfig = server.status;
            console.log('🔍 Vérification automatique du statut:', statusConfig);

            // Afficher "Vérification..." pendant la requête
            await this.showServerStatus('checking', 'Vérification du serveur...');

            // Vérifier le statut en temps réel
            const realTimeStatus = await this.getRealTimeServerStatus(statusConfig);
            
            // Combiner la config statique avec le statut temps réel
            const finalStatus = {
                ...statusConfig,
                online: realTimeStatus.online,
                players: realTimeStatus.players || { online: 0, max: 100 }
            };

            console.log('📊 Statut final:', finalStatus);
            await this.showServerStatus(finalStatus);

        } catch (error) {
            console.log('❌ Erreur vérification automatique:', error);
            await this.showServerStatus('error', 'Erreur de vérification');
        }
    }

    // MÉTHODE: Obtenir le statut en temps réel
    async getRealTimeServerStatus(statusConfig) {
        try {
            if (!statusConfig.ip && !statusConfig.port) {
                return { online: false, players: { online: 0, max: 100 } };
            }

            let host = statusConfig.ip;
            
            // Si l'IP est fournie sans port, ajouter le port par défaut
            if (host && !host.includes(':') && statusConfig.port) {
                host = `${host}:${statusConfig.port}`;
            }

            console.log('🌐 Vérification du serveur:', host);

            // Utilisation de l'API mcstatus.io pour vérifier le serveur Java
            const response = await fetch(`https://api.mcstatus.io/v2/status/java/${host}`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'MinecraftLauncher/1.0'
                }
            });

            if (response && response.ok) {
                const data = await response.json();
                console.log('✅ Statut API:', data);
                
                return {
                    online: data.online || false,
                    players: {
                        online: data.players?.online || 0,
                        max: data.players?.max || 100
                    }
                };
            } else {
                console.log('❌ Réponse API non-OK:', response?.status);
                return { online: false, players: { online: 0, max: 100 } };
            }

        } catch (error) {
            console.log('❌ Erreur API statut:', error);
            return { online: false, players: { online: 0, max: 100 } };
        }
    }

    async showServerStatus(status, customMessage = null) {
        try {
            console.log('🔄 Affichage du statut:', status);
            
            // S'ASSURER QUE LES ÉLÉMENTS EXISTENT
            this.createMissingStatusElements();
            
            // MAINTENANT CHERCHER LES ÉLÉMENTS
            const statusText = document.querySelector('.server-status-text');
            const playerCount = document.querySelector('.player-count');
            const serverIp = document.querySelector('.server-ip');
            
            console.log('🔍 Éléments trouvés:', {
                statusText: !!statusText,
                playerCount: !!playerCount, 
                serverIp: !!serverIp
            });
            
            if (!statusText) {
                console.log('❌ Impossible de trouver les éléments même après création');
                return;
            }
            
            let statusInfo = {
                text: 'Statut inconnu',
                color: '#888888',
                players: '0/0',
                ip: 'Non disponible'
            };
            
            // GESTION DU STATUT
            if (customMessage) {
                statusInfo.text = customMessage;
                statusInfo.color = '#ff4444';
            } else if (status === 'checking') {
                statusInfo.text = '🔄 Vérification du serveur...';
                statusInfo.color = '#ffaa00';
            } else if (typeof status === 'string') {
                switch(status.toLowerCase()) {
                    case 'online':
                        statusInfo.text = '🟢 Serveur en ligne';
                        statusInfo.color = '#36b030';
                        break;
                    case 'offline':
                        statusInfo.text = '🔴 Serveur hors ligne';
                        statusInfo.color = '#ff4444';
                        break;
                    default:
                        statusInfo.text = status;
                }
            } else if (typeof status === 'object' && status !== null) {
                const serverName = status.nameServer || 'Serveur';
                
                if (status.online) {
                    statusInfo.text = `🟢 ${serverName}`;
                    statusInfo.color = '#36b030';
                    statusInfo.players = `${status.players?.online || 0}/${status.players?.max || 100}`;
                } else {
                    statusInfo.text = `🔴 ${serverName}`;
                    statusInfo.color = '#ff4444';
                    statusInfo.players = '0/0';
                }
                
                statusInfo.ip = status.ip || 'Non disponible';
            }
            
            // APPLIQUER LE STATUT
            statusText.textContent = statusInfo.text;
            statusText.style.color = statusInfo.color;
            
            if (playerCount) {
                playerCount.textContent = `Joueurs: ${statusInfo.players}`;
            }
            
            if (serverIp) {
                serverIp.textContent = `IP: ${statusInfo.ip}`;
            }
            
            console.log('✅ Statut affiché:', statusInfo);
            
        } catch (error) {
            console.log('❌ Erreur affichage statut:', error);
        }
    }

    async startGame() {
        try {
            console.log('=== DÉBUT LANCEMENT ===');
            
            await this.applyMinecraftFix();

            let configClient = await this.db.readData('configClient') || {};
            
            // UTILISER LE SERVEUR EN DUR
            let server = this.getHardcodedServer();

            let authenticator = await this.db.readData('accounts', configClient.account_selected);

            let minecraftVersion = '1.20.1';
            let loaderType = 'fabric';
            let loaderVersion = 'latest';

            if (server.loadder) {
                minecraftVersion = server.loadder.minecraft_version || minecraftVersion;
                loaderType = server.loadder.loadder_type || loaderType;
                loaderVersion = server.loadder.loadder_version || loaderVersion;
            }

            const SERVER_FILES_URL = "https://config-20dh.onrender.com/files?instance=zendariom";
            const instancePath = `${await appdata()}/.${this.config.dataDirectory}/instances/zendariom`;

            console.log('📁 Chemin instance:', instancePath);
            console.log('🌐 URL serveur:', SERVER_FILES_URL);

            let playInstanceBTN = document.querySelector('.play-instance');
            let infoStartingBOX = document.querySelector('.info-starting-game');
            let infoStarting = document.querySelector(".info-starting-game-text");
            let progressBar = document.querySelector('.progress-bar');

            // PRÉPARATION INTERFACE
            if (playInstanceBTN) playInstanceBTN.style.display = "none";
            if (infoStartingBOX) infoStartingBOX.style.display = "block";
            if (progressBar) progressBar.style.display = "";
            if (infoStarting) infoStarting.innerHTML = 'Initialisation...';
            await this.showServerStatus('download', 'Préparation...');

            // TÉLÉCHARGEMENT DES FICHIERS
            console.log('📥 Téléchargement des fichiers personnalisés...');
            if (infoStarting) infoStarting.innerHTML = 'Téléchargement des mods et configs...';
            await this.downloadCustomFiles(instancePath, SERVER_FILES_URL);

            // CONFIGURATION
            const opt = {
                url: null,
                authenticator: authenticator,
                path: instancePath,
                instance: 'zendariom',
                version: minecraftVersion,
                detached: configClient.launcher_config?.closeLauncher == "close-all" ? false : true,
                downloadFileMultiple: 3,
                intelEnabledMac: configClient.launcher_config?.intelEnabledMac || false,

                loader: {
                    type: loaderType,
                    build: loaderVersion,
                    enable: loaderType !== 'none'
                },

                verify: server.verify || true,
                forceUpdate: false,

                ignored: server.ignored || [
                    "config",
                    "mods",  
                    "resourcepacks",
                    "shaderpacks",
                    "logs",
                    "options.txt",
                    "optionsof.txt"
                ],

                java: {
                    path: configClient.java_config?.java_path || '',
                },

                JVM_ARGS: this.getJVMArgs(loaderType, server.jvm_args),
                
                GAME_ARGS: server.game_args && Array.isArray(server.game_args) ? server.game_args : [],

                screen: {
                    width: configClient.game_config?.screen_size?.width || 854,
                    height: configClient.game_config?.screen_size?.height || 480
                },

                memory: {
                    min: `${(configClient.java_config?.java_memory?.min || 4) * 1024}M`,
                    max: `${(configClient.java_config?.java_memory?.max || 8) * 1024}M`
                }
            };

            console.log('✅ Configuration optimisée');

            // LANCEMENT
            console.log('🚀 Lancement de Minecraft...');
            if (infoStarting) infoStarting.innerHTML = 'Lancement du jeu...';
            await this.launchGame(opt, infoStarting, progressBar, playInstanceBTN, infoStartingBOX, server);

        } catch (error) {
            console.log('❌ Erreur lors du démarrage:', error);
            this.handleLaunchError(error);
        }
    }

    // TÉLÉCHARGER LES FICHIERS PERSONNALISÉS
    async downloadCustomFiles(instancePath, serverUrl) {
        try {
            console.log('📥 Téléchargement des fichiers personnalisés depuis le serveur...');
            
            const response = await fetch(serverUrl);
            if (!response.ok) {
                throw new Error(`Serveur inaccessible:`);
            }
            
            const customFiles = await response.json();
            
            const folders = ['mods', 'config', 'resourcepacks', 'shaderpacks'];
            
            let totalFiles = 0;
            let downloadedFiles = 0;
            
            for (const folder of folders) {
                if (customFiles[folder] && Array.isArray(customFiles[folder])) {
                    totalFiles += customFiles[folder].length;
                    console.log(`📁 Traitement des ${folder} (${customFiles[folder].length} fichiers)`);
                    await this.downloadFolderFiles(customFiles[folder], instancePath, folder);
                    downloadedFiles += customFiles[folder].length;
                }
            }
            
            console.log(`✅ ${downloadedFiles}/${totalFiles} fichiers personnalisés traités`);
            
        } catch (error) {
            console.log('❌ Erreur téléchargement fichiers personnalisés:', error);
        }
    }

    // TÉLÉCHARGER LES FICHIERS D'UN DOSSIER SPÉCIFIQUE
    async downloadFolderFiles(files, instancePath, folder) {
        for (const file of files) {
            if (!file.path || !file.url) {
                console.log('⚠️ Fichier ignoré (path ou url manquant):', file);
                continue;
            }
            
            const filePath = path.join(instancePath, file.path);
            const fileDir = path.dirname(filePath);
            
            try {
                await fs.mkdir(fileDir, { recursive: true });
                
                const needsDownload = await this.checkFileNeedsDownload(filePath, file.hash, file.size);
                
                if (needsDownload) {
                    console.log(`⬇️  Téléchargement: ${file.path}`);
                    await this.downloadSingleFile(file.url, filePath);
                } else {
                    console.log(`✅ Fichier à jour: ${file.path}`);
                }
            } catch (error) {
                console.log(`❌ Erreur avec le fichier ${file.path}:`, error.message);
            }
        }
    }

    // VÉRIFIER SI UN FICHIER DOIT ÊTRE TÉLÉCHARGÉ
    async checkFileNeedsDownload(filePath, expectedHash, expectedSize) {
        try {
            await fs.access(filePath);
            
            const stats = await fs.stat(filePath);
            
            if (expectedSize && stats.size !== expectedSize) {
                console.log(`📏 Taille incorrecte: ${filePath} (${stats.size} au lieu de ${expectedSize})`);
                return true;
            }
            
            if (expectedHash) {
                const fileBuffer = await fs.readFile(filePath);
                const fileHash = crypto.createHash('sha1').update(fileBuffer).digest('hex');
                if (fileHash !== expectedHash.toLowerCase()) {
                    console.log(`🔍 Hash incorrect: ${filePath}`);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            return true;
        }
    }

    // TÉLÉCHARGER UN FICHIER INDIVIDUEL
    async downloadSingleFile(url, filePath) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(filePath, buffer);
            
        } catch (error) {
            console.log(`❌ Erreur téléchargement ${url}:`, error.message);
            throw error;
        }
    }

    // LANCEMENT DU JEU
    async launchGame(opt, infoStarting, progressBar, playInstanceBTN, infoStartingBOX, server) {
        return new Promise((resolve, reject) => {
            try {
                const launch = new Launch();

                launch.on('progress', (progress, size, element) => {
                    let percent = ((progress / size) * 100).toFixed(0);
                    if (infoStarting) infoStarting.innerHTML = `Téléchargement ${percent}% (${element || 'Mojang'})`;
                    if (progressBar) {
                        progressBar.value = progress;
                        progressBar.max = size;
                    }
                    ipcRenderer.send('main-window-progress', { progress, size });
                });

                launch.on('check', (progress, size, element) => {
                    let percent = ((progress / size) * 100).toFixed(0);
                    if (infoStarting) infoStarting.innerHTML = `Vérification ${percent}% (${element || 'fichiers'})`;
                    if (progressBar) {
                        progressBar.value = progress;
                        progressBar.max = size;
                    }
                });

                launch.on('extract', (extract) => {
                    if (infoStarting) infoStarting.innerHTML = 'Extraction des natives...';
                    console.log('📦 Extraction des fichiers...');
                });

                launch.on('patch', (patch) => {
                    if (infoStarting) infoStarting.innerHTML = 'Installation du loader...';
                    console.log('🔧 Installation du loader...');
                });

                launch.on('data', (e) => {
                    if (progressBar) progressBar.style.display = "none";
                    if (infoStarting) infoStarting.innerHTML = 'Démarrage du jeu...';
                    
                    if (opt.detached === false) {
                        ipcRenderer.send("main-window-hide");
                    }
                    
                    let loaderName = this.getLoaderName(opt.loader.type);
                    new logger(`Minecraft ${opt.version} ${loaderName}`, '#36b030');
                    console.log('✅ Jeu lancé avec succès !');
                    resolve();
                });

                launch.on('close', (code) => {
                    ipcRenderer.send('main-window-progress-reset');
                    if (infoStartingBOX) infoStartingBOX.style.display = "none";
                    if (playInstanceBTN) playInstanceBTN.style.display = "flex";
                    if (infoStarting) infoStarting.innerHTML = "Prêt";
                    new logger(pkg.name, '#7289da');
                    
                    if (opt.detached === false) {
                        ipcRenderer.send("main-window-show");
                    }
                    
                    if (server.status) {
                        this.checkAndDisplayServerStatus(server);
                    }
                    
                    console.log('🔚 Jeu fermé');
                });

                launch.on('error', (err) => {
                    console.log('❌ Erreur de lancement:', err);
                    reject(err);
                });

                console.log('🎯 Début du processus de lancement...');
                launch.Launch(opt);

            } catch (error) {
                reject(error);
            }
        });
    }

    handleLaunchError(error) {
        console.log('❌ Gestion erreur:', error);
        let popupError = new popup();
        popupError.openPopup({
            title: 'Erreur de lancement',
            content: error.message,
            color: 'red',
            options: true
        });
        
        let playInstanceBTN = document.querySelector('.play-instance');
        let infoStartingBOX = document.querySelector('.info-starting-game');
        if (playInstanceBTN) playInstanceBTN.style.display = "flex";
        if (infoStartingBOX) infoStartingBOX.style.display = "none";
        
        this.showServerStatus('error', error.message);
    }

    getJVMArgs(loaderType, customArgs = []) {
        let baseArgs = [
            '-XX:+UnlockExperimentalVMOptions',
            '-XX:+UseG1GC',
            '-XX:G1NewSizePercent=20',
            '-XX:G1ReservePercent=20',
            '-XX:MaxGCPauseMillis=50',
            '-XX:G1HeapRegionSize=32M'
        ];

        if (loaderType === 'forge') {
            baseArgs.push(
                '-Dfml.ignoreInvalidMinecraftCertificates=true',
                '-Dfml.ignorePatchDiscrepancies=true'
            );
        } else if (loaderType === 'fabric') {
            baseArgs.push(
                '-DFabricMcEmu= net.minecraft.client.main.Main'
            );
        }

        if (customArgs && Array.isArray(customArgs)) {
            baseArgs.push(...customArgs);
        }

        return baseArgs;
    }

    getLoaderName(loaderType) {
        const names = {
            'none': 'Vanilla',
            'forge': 'Forge',
            'fabric': 'Fabric',
            'quilt': 'Quilt'
        };
        return names[loaderType] || loaderType;
    }

    getdate(e) {
        let date = new Date(e);
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let allMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        return { year: year, month: allMonth[month - 1], day: day };
    }

    // NETTOYAGE
    destroy() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }
}

export default Home;