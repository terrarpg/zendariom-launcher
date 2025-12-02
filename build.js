const fs = require("fs");
const path = require("path");

const builder = require('electron-builder');
const JavaScriptObfuscator = require('javascript-obfuscator');
const nodeFetch = require('node-fetch');
const png2icons = require('png2icons');
const Jimp = require('jimp');

const { preductname } = require('./package.json');

class Index {
    constructor() {
        this.obf = true;
        this.Fileslist = [];
    }

    async init() {
        // Attendre que tous les arguments soient traités
        const promises = [];
        
        for (const val of process.argv.slice(2)) {
            if (val.startsWith('--icon')) {
                const url = val.split('=')[1];
                if (url) {
                    promises.push(this.iconSet(url));
                } else {
                    console.error('URL manquante pour --icon');
                }
            } else if (val.startsWith('--obf')) {
                const obfValue = val.split('=')[1];
                this.obf = obfValue ? JSON.parse(obfValue) : true;
                this.Fileslist = this.getFiles("src");
            } else if (val.startsWith('--build')) {
                const buildType = val.split('=')[1];
                if (buildType === 'platform') {
                    promises.push(this.buildPlatform());
                }
            }
        }
        
        // Attendre que toutes les opérations asynchrones soient terminées
        await Promise.all(promises);
    }

    async Obfuscate() {
        if (fs.existsSync("./app")) {
            fs.rmSync("./app", { recursive: true });
        }

        fs.mkdirSync("./app", { recursive: true });

        for (const filePath of this.Fileslist) {
            const fileName = path.basename(filePath);
            const extFile = path.extname(filePath).toLowerCase();
            const relativePath = path.relative("src", filePath);
            const destFolder = path.dirname(path.join("./app", relativePath));
            const destPath = path.join(destFolder, fileName);

            if (!fs.existsSync(destFolder)) {
                fs.mkdirSync(destFolder, { recursive: true });
            }

            if (extFile === '.js') {
                try {
                    let code = fs.readFileSync(filePath, "utf8");
                    code = code.replace(/src\//g, 'app/');
                    
                    if (this.obf) {
                        console.log(`Obfuscate ${filePath}`);
                        const obfuscated = JavaScriptObfuscator.obfuscate(code, { 
                            optionsPreset: 'medium-obfuscation', 
                            disableConsoleOutput: false 
                        });
                        fs.writeFileSync(destPath, obfuscated.getObfuscatedCode(), "utf8");
                    } else {
                        console.log(`Copy ${filePath}`);
                        fs.writeFileSync(destPath, code, "utf8");
                    }
                } catch (error) {
                    console.error(`Erreur lors du traitement de ${filePath}:`, error);
                }
            } else {
                fs.copyFileSync(filePath, destPath);
            }
        }
    }

    async buildPlatform() {
        try {
            await this.Obfuscate();
            
            const config = {
                generateUpdatesFilesForAllChannels: false,
                appId: preductname,
                productName: preductname,
                copyright: 'Copyright © 2025 WW-DJY',
                artifactName: "${productName}-${os}-${arch}.${ext}",
                extraMetadata: { 
                    main: 'app/app.js' 
                },
                files: ["app/**/*", "package.json", "LICENSE.md"],
                directories: { 
                    output: "dist"
                },
                compression: 'normal',
                asar: true,
                electronDownload: {
                    cache: "./node_modules/.cache/electron"
                },
                nodeGypRebuild: false,
                npmRebuild: true,
                publish: [{
                    provider: "github",
                    releaseType: 'release',
                }],
                win: {
                    icon: "./app/assets/images/icon.ico",
                    target: [{
                        target: "nsis",
                        arch: "x64"
                    }]
                },
                nsis: {
                    oneClick: true,
                    allowToChangeInstallationDirectory: false,
                    createDesktopShortcut: true,
                    runAfterFinish: true
                },
                mac: {
                    icon: "./app/assets/images/icon.icns",
                    category: "public.app-category.games",
                    identity: null,
                    hardenedRuntime: false,
                    gatekeeperAssess: false,
                    mergeASARs: true,
                    singleArchFiles: "node_modules/sqlite3/**/*",
                    target: [{
                        target: "dmg",
                        arch: "universal"
                    },
                    {
                        target: "zip", 
                        arch: "universal"
                    }]
                },
                dmg: {
                    sign: false,
                    contents: [
                        { x: 130, y: 220 },
                        { x: 410, y: 220, type: 'link', path: '/Applications' }
                    ],
                    artifactName: "${productName}-mac-${arch}.${ext}",
                    format: "ULFO"
                },
                linux: {
                    icon: "./app/assets/images/icon.png",
                    target: [{
                        target: "AppImage",
                        arch: "x64"
                    }]
                }
            };

            await builder.build({
                config: config
            });
            
            console.log('Le build est terminé avec succès');
        } catch (err) {
            console.error('Erreur lors du build:', err);
            process.exit(1);
        }
    }

    getFiles(dirPath, filesArray = []) {
        if (!fs.existsSync(dirPath)) {
            console.warn(`Le répertoire ${dirPath} n'existe pas`);
            return filesArray;
        }

        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            
            try {
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    this.getFiles(fullPath, filesArray);
                } else {
                    filesArray.push(fullPath);
                }
            } catch (error) {
                console.error(`Erreur d'accès à ${fullPath}:`, error);
            }
        }
        
        return filesArray;
    }

    async iconSet(url) {
        try {
            const response = await nodeFetch(url);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const image = await Jimp.read(Buffer.from(buffer));
            
            const resizedBuffer = await image.resize(256, 256).getBufferAsync(Jimp.MIME_PNG);
            
            // Créer le dossier des icônes si nécessaire
            const iconDir = "src/assets/images";
            if (!fs.existsSync(iconDir)) {
                fs.mkdirSync(iconDir, { recursive: true });
            }

            // Générer les icônes
            const icnsData = png2icons.createICNS(resizedBuffer, png2icons.BILINEAR, 0);
            const icoData = png2icons.createICO(resizedBuffer, png2icons.HERMITE, 0, false);
            
            if (icnsData) {
                fs.writeFileSync(path.join(iconDir, "icon.icns"), icnsData);
            }
            
            if (icoData) {
                fs.writeFileSync(path.join(iconDir, "icon.ico"), icoData);
            }
            
            fs.writeFileSync(path.join(iconDir, "icon.png"), resizedBuffer);
            
            console.log('Nouvelles icônes générées avec succès');
        } catch (error) {
            console.error('Erreur lors de la génération des icônes:', error);
        }
    }
}

// Exécuter le script
new Index().init().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
});