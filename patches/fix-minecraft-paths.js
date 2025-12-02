// patches/fix-minecraft-paths.js
const fs = require('fs');
const path = require('path');

function applyMinecraftFix() {
    try {
        const librariesPath = path.join(__dirname, '../node_modules/minecraft-java-core/build/Minecraft/Minecraft-Libraries.js');
        
        if (fs.existsSync(librariesPath)) {
            let content = fs.readFileSync(librariesPath, 'utf8');
            
            console.log('🔧 Application du correctif pour minecraft-java-core...');
            
            // Vérifier si le correctif est déjà appliqué
            if (content.includes('${this.options.path}/instances/${this.options.instance}')) {
                console.log('✅ Correctif déjà appliqué');
                return true;
            }
            
            // CORRIGER la ligne problématique
            const oldPattern = /path:\s*this\.options\.instance\s*\?\s*`instances\/\$\{this\.options\.instance\}\/\$\{asset\.path\}`\s*:\s*asset\.path,/g;
            
            const newCode = `path: this.options.instance
                    ? \`\${this.options.path}/instances/\${this.options.instance}/\${asset.path}\`
                    : \`\${this.options.path}/\${asset.path}\`,`;
            
            if (content.match(oldPattern)) {
                content = content.replace(oldPattern, newCode);
                fs.writeFileSync(librariesPath, content, 'utf8');
                console.log('✅ Correctif appliqué avec succès !');
                return true;
            } else {
                console.log('ℹ️  Le correctif a déjà été appliqué ou la ligne est introuvable');
                return true;
            }
        } else {
            console.log('❌ Fichier Minecraft-Libraries.js introuvable');
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur lors de l\'application du correctif:', error);
        return false;
    }
}

// Appliquer automatiquement au chargement
if (require.main === module) {
    applyMinecraftFix();
}

module.exports = { applyMinecraftFix };