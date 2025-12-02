// src/assets/js/index.js
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 Splash screen démarré');
    
    // Animation de chargement
    let progress = 0;
    const progressBar = document.querySelector('.progress');
    const messageEl = document.querySelector('.message');
    
    if (messageEl) {
        messageEl.textContent = 'Vérification des mises à jour...';
    }
    
    // Simuler un chargement pendant 2 secondes
    const interval = setInterval(() => {
        progress += 5;
        if (progressBar) {
            progressBar.value = progress;
            progressBar.max = 100;
        }
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // Quand le chargement est fini, on passe au launcher
            // Le vrai check se fait dans app.js, on fait juste l'animation ici
            setTimeout(() => {
                window.location.href = 'launcher.html';
            }, 500);
        }
    }, 100);
});