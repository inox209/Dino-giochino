document.addEventListener("DOMContentLoaded", () => {
    // =============================================
    // 1. COSTANTI E CONFIGURAZIONI
    // =============================================
    const CONFIG = {
        // Dimensioni di riferimento
        REFERENCE_WIDTH: 800,
        REFERENCE_HEIGHT: 400,
        MOBILE_BREAKPOINT: 768,
        INITIAL_PAIR_PROBABILITY: 0.1,
        
        // Immagini
        TOTAL_IMAGES: 9,
        
        // Offset ostacoli
        OFFSET_CONFIG: {
            GRANCHIO: { yOffset: 0, mobileYOffset: 15 },
            CASTELLO: { yOffset: 0, mobileYOffset: 10 },
            PALM: { yOffset: 10, mobileYOffset: 5 },       // Solo offset qui
            UMBRELLA: { yOffset: -20, mobileYOffset: -10 } // Solo offset qui
        },
    
        OBSTACLE_PHYSICS: {  // Nuova sezione per le proprietà fisiche
            palm: {
                width: 144 * 1.2 * 0.9,
                graphicHeight: 144 * 1.2 * 0.9,
                collisionHeight: 50,
                hitboxWidthRatio: 0.4, // 20% della larghezza grafica
                offsetKey: "PALM",       // Riferimento a OFFSET_CONFIG
                extraOffset: 0
            },
            umbrella: {
                width: 144 * 0.8,
                graphicHeight: 144 * 0.8,
                collisionHeight: 144 * 0.8 * 0.6,
                hitboxWidthRatio: 0.1, // 15% della larghezza grafica
                offsetKey: "UMBRELLA",   // Riferimento a OFFSET_CONFIG
                extraOffset: 20
            }
        },
        
        // Gameplay
        INITIAL_SCROLL_SPEED: 3,
        MAX_PAIR_PROBABILITY: 0.5,
        INITIAL_OBSTACLE_INTERVAL: 2000,
        MIN_OBSTACLE_INTERVAL: 2000,
        
        // Animazioni
        MASK_PAUSE_DURATION: 2000,
        MASK_DURATION: 5000
    };
    document.head.insertAdjacentHTML('beforeend', `
        <style>
            /* Stili base per i messaggi */
            .prize-message-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 600px;
                background-color: rgba(0, 0, 0, 0.85);
                border-radius: 10px;
                padding: 20px;
                box-sizing: border-box;
                text-align: center;
                z-index: 1001;
                display: none;
                flex-direction: column;
                align-items: center;
            }
            
            .prize-message-container a {
                color: #00ffff;
                font-family: 'Press Start 2P', cursive;
                font-size: 18px;
                text-decoration: none;
                padding: 12px 24px;
                border: 2px solid #00ffff;
                border-radius: 5px;
                margin-top: 20px;
                transition: all 0.3s;
            }
            
            .prize-message-container a:hover {
                background-color: #00ffff;
                color: black;
            }
            
            /* Stili per le scritte iniziali */
            .popup-text {
                font-family: 'Press Start 2P', cursive;
                color: white;
                font-size: 16px;
                line-height: 1.6;
                margin: 10px 0;
                text-align: center;
                word-wrap: break-word;
            }
            
            /* Media query mobile */
            @media (max-width: 768px) {
                #gameCanvas {
                    position: relative !important;
                    z-index: 1;
                    max-height: 90vh !important;
                }
                
                .prize-message-container {
                    position: absolute !important;
                    top: 65% !important;
                    width: 90% !important;
                    padding: 15px !important;
                }
                
                .prize-message-container a {
                    font-size: 14px !important;
                    padding: 10px 15px !important;
                }
                
                .popup-text {
                    font-size: 12px !important;
                    line-height: 1.4 !important;
                    padding: 5px 0 !important;
                }
            }
            
            /* Stili per il pulsante mobile */
            #jumpButton {
                font-family: 'Press Start 2P', cursive;
                z-index: 1002;
            }
        </style>
    `);

    // =============================================
    // 2. VARIABILI DI STATO
    // =============================================
    let state = {
        animationFrameId: null,
        // Caricamento risorse
        fontsLoaded: false,
        imagesLoaded: 0,
        audioBuffersLoaded: false,
        currentText: "",
        
        // Game state
        gamePaused: true,
        gameEnded: false,
        popupState: 0,
        score: 0,
        scrollSpeed: isMobileDevice() ? 3 : 5,
        
        // Timing
        startTime: null,
        lastObstacleTime: 0,
        lastGranchioTime: 0,
        lastCastelloTime: 0,
        dinaEnterTime: null,
        dinoMoveTime: null,
        maskStartTime: null,
        maskPauseTime: null,
        
        // Flags
        isJumpButtonPressed: false,
        isGranchioNext: true,
        coverVideoPlayed: false,
        
        // Progressi
        maskProgress: 0,
        pairProbability: 0.1,

        aKeyPressed: false,
        aKeyPressStartTime: 0,
        startMovingToCenter: false,
        finalAnimationStarted: false,
        showDina: false,
        dinaEntryComplete: false,
        dinaPauseStartTime: null,
        dinaMovingToCenter: false,
        pairProbability: CONFIG.INITIAL_PAIR_PROBABILITY || 0.1
    };

    // =============================================
    // 3. ELEMENTI DEL GIOCO
    // =============================================
    const elements = {
        // Canvas e rendering
        canvas: document.getElementById("gameCanvas"),
        ctx: null,
        
        // Pulsanti
        jumpButton: document.getElementById("jumpButton"),
        
        // Video
        coverVideo: (() => {
            const video = document.createElement("video");
            video.src = "assets/cover.mp4";
            video.loop = false;
            video.muted = true;
            video.setAttribute('playsinline', ''); // Essenziale per iOS
            video.setAttribute('webkit-playsinline', ''); // Per vecchi browser iOS
            video.style.position = "fixed";
            video.style.top = "50%";
            video.style.left = "50%";
            video.style.transform = "translate(-50%, -50%)";
            video.style.maxWidth = "100%";
            video.style.maxHeight = "100%";
            video.style.display = "none";
            video.style.opacity = "0";
            video.style.transition = "opacity 2s";
            video.style.zIndex = "999";
            document.body.appendChild(video);
            return video;
        })(),
        
        // Immagini
        images: {
            dino: new Image(),
            dina: new Image(),
            gtr1: new Image(),
            palm: new Image(),
            umbrella: new Image(),
            granchio: new Image(),
            castello: new Image(),
            sfondo: new Image()
        },
        
        // Audio
        audioContext: null,
        audioBuffers: {
            mare: null,
            gtrs: null,
            keys: null,
            bass: null,
            drum: null
        },
        audioSources: {
            mare: null,
            gtrs: null,
            keys: null,
            bass: null,
            drum: null
        },

        prizeMessage: {
            container: document.createElement("div"),
            text: document.createElement("div"),
            button: document.createElement("a")
        }

    };

    // =============================================
    // 4. OGGETTI DI GIOCO
    // =============================================
    const gameObjects = {
        dino: {
            x: scaleValue(100),
            y: scaleValue(250, false),
            width: scaleValue(isMobileDevice() ? 180 : 150, true, { isDino: true }),
            height: scaleValue(isMobileDevice() ? 180 : 150, false, { isDino: true }),
            isJumping: false,
            jumpSpeed: isMobileDevice() ? -18 : -18,
            gravity: isMobileDevice() ? 0.55 : 0.55,
            maxJumpHeight: isMobileDevice() ? 180 : 250,
            startX: scaleValue(100),
            finalTargetX: elements.canvas.width/2 - scaleValue(150),
            moveSpeed: 2
        },
        
        dina: {
            startX: elements.canvas.width + scaleValue(200), // Inizio FUORI dallo schermo
            entryTargetX: elements.canvas.width - scaleValue(300), // Prima fermata (visibile)
            finalTargetX: elements.canvas.width/2 + scaleValue(100), // Centro + offset
            width: scaleValue(isMobileDevice() ? 150 : 320, true, { isDina: true }),
            height: scaleValue(isMobileDevice() ? 150 : 320, false, { isDina: true }),
            entrySpeed: 2,
            moveSpeed: 2,
            x: elements.canvas.width + scaleValue(200),
            y: isMobileDevice() ? elements.canvas.height * 0.55 : elements.canvas.height * 0.65,
            visible: false,
            state: "hidden"
        },

        gtr1: {
            offsetX: scaleValue(20),
            offsetY: scaleValue(20, false),
            width: scaleValue(isMobileDevice() ? 150 : 270, true, { isgtr1: true }),
            height: scaleValue(isMobileDevice() ? 150 : 270, false, { isgtr1: true }),
        },
        
        palms: [],
        
        granchio: { 
            x: elements.canvas.width, 
            y: elements.canvas.height - getMobileObstacleOffset(),
            width: scaleValue(isMobileDevice() ? 200 : 200, true, { isgranchio: true }),
            height: scaleValue(isMobileDevice() ? 200 : 200, true, { isgranchio: true }),
            visible: false
        },
        
        castello: { 
            x: elements.canvas.width, 
            y: elements.canvas.height - getMobileObstacleOffset(),
            width: scaleValue(isMobileDevice() ? 50 : 150, true, { isobstacle: true }),
            height: scaleValue(isMobileDevice() ? 50 : 150, true, { isobstacle: true }),
            visible: false 
        }
    };

    // =============================================
    // 5. FUNZIONI UTILITY
    // =============================================
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    }

    function getResponsiveTextSizes(type = 'default') {
        const baseSizes = {
            title: {
                desktop: 24,
                mobile: 16,
                lineHeightMultiplier: 1.2
            },
            default: {
                desktop: 18,
                mobile: 14,
                lineHeightMultiplier: 1.3
            }
        };
        
        const config = baseSizes[type] || baseSizes.default;
        const isMobile = isMobileDevice();
        
        return {
            size: isMobile ? config.mobile : config.desktop,
            lineHeight: (isMobile ? config.mobile : config.desktop) * config.lineHeightMultiplier,
            letterSpacing: isMobile ? 0.5 : 1
        };
    }

    function scaleValue(value, isWidth = true, options = {}) {
        const { isDino = false, isObstacle = false } = options;
        const scaleFactor = isWidth ? elements.canvas.width / CONFIG.REFERENCE_WIDTH : 
        elements.canvas.height / CONFIG.REFERENCE_HEIGHT;

        if (isMobileDevice()) {
            if (isDino) return value * scaleFactor * 0.8;
            if (isObstacle) return value * scaleFactor * 0.4;
            return value * scaleFactor;
        } else {
            if (isDino) return value * scaleFactor * 0.9;
            if (isObstacle) return value * scaleFactor * 0.3;
            return value * scaleFactor;
        }
    }

    function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, color) {
        elements.ctx.save();
        elements.ctx.font = `bold ${isMobileDevice() ? 12 : 16}px 'Press Start 2P'`;
        elements.ctx.fillStyle = color;
        elements.ctx.textAlign = "center";
        
        const words = text.split(' ');
        let line = '';
        let testLine;
        let metrics;
        const lines = [];
        
        for (let i = 0; i < words.length; i++) {
            testLine = line + words[i] + ' ';
            metrics = elements.ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lines.push(line);
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        
        for (let i = 0; i < lines.length; i++) {
            elements.ctx.fillText(lines[i].trim(), x, y + (i * lineHeight));
        }
        elements.ctx.restore();
    }

    function refreshAllSizes() {
        gameObjects.dino.width = scaleValue(100, true, { isDino: true });
        gameObjects.dino.height = scaleValue(100, false, { isDino: true });
        gameObjects.granchio.width = scaleValue(200, true, { isObstacle: true });
        gameObjects.granchio.height = scaleValue(200, false, { isObstacle: true });
    }

    function getMobileObstacleOffset() {
        return isMobileDevice() ? scaleValue(30, false) : 0;
    }

    function getVerticalOffset(elementKey) {
        const config = CONFIG.OFFSET_CONFIG[elementKey];
        if (!config) return 0;
        
        const baseOffset = scaleValue(config.yOffset, false);
        
        if (isMobileDevice()) {
            return baseOffset + scaleValue(config.mobileYOffset, false);
        }
        
        return baseOffset;
    }

    // =============================================
    // 6. GESTIONE DELLE RISORSE
    // =============================================
    function initResources() {
        // Carica font
        document.fonts.load('16px "Press Start 2P"').then(() => {
            console.log("Font caricato correttamente");
            state.fontsLoaded = true;
        }).catch(err => {
            console.error("Errore caricamento font:", err);
        });

        // Imposta sorgenti immagini
        const imgSources = {
            dino: "assets/dino.png",
            dina: "assets/dina.png",
            gtr1: "assets/gtr1.png",
            palm: "assets/palm.png",
            umbrella: "assets/ombrellone.png",
            granchio: "assets/granchio.png",
            castello: "assets/castello.png",
            sfondo: "assets/sfondo.png"
        };

        // Carica immagini
        Object.keys(imgSources).forEach(key => {
            elements.images[key].src = imgSources[key];
            elements.images[key].onload = checkAllImagesLoaded;
            elements.images[key].onerror = () => console.error(`Errore nel caricamento di ${imgSources[key]}`);
        });

        // Inizializza canvas context
        elements.ctx = elements.canvas.getContext("2d");

        // Carica audio
        loadAudioBuffers();
    }

    function checkAllImagesLoaded() {
        state.imagesLoaded++;
        console.log(`Immagine caricata ${state.imagesLoaded}/${CONFIG.TOTAL_IMAGES}: ${this.src}`);
        
        if (state.imagesLoaded === CONFIG.TOTAL_IMAGES) {
            console.log("Tutte le immagini sono state caricate");
            console.log("Dimensioni palma:", elements.images.palm.width, elements.images.palm.height);
            console.log("Dimensioni ombrellone:", elements.images.umbrella.width, elements.images.umbrella.height);
            
            if (state.gamePaused) {
                requestAnimationFrame(gameLoop);
            }
            
            if (state.popupState >= 1 && !elements.audioSources.mare) {
                startMareAudio();
            }
        }
    }

    // =============================================
    // 7. GESTIONE AUDIO
    // =============================================
    function initAudioContext() {
        if (!elements.audioContext) {
            elements.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext initialized:", elements.audioContext.state);
            
            // Aggiungi gestore per eventi di interazione globale
            document.addEventListener('click', resumeAudioContextOnce, { once: true });
        }
        return elements.audioContext;
    }

    function resumeAudioContext() {
        if (elements.audioContext && elements.audioContext.state === 'suspended') {
            elements.audioContext.resume().then(() => {
                console.log("AudioContext riattivato");
            });
        }
    }

    async function loadAudioBuffer(url) {
        try {
            if (!elements.audioContext) initAudioContext();
        
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
            const arrayBuffer = await response.arrayBuffer();
            return await elements.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error(`Error loading ${url}:`, error);
            return null;
        }
    }

    function loadAudioBuffers() {
        initAudioContext();
        Promise.all([
            loadAudioBuffer("assets/mare.mp3"),
            loadAudioBuffer("assets/gtrs.mp3"),
            loadAudioBuffer("assets/keys.mp3"),
            loadAudioBuffer("assets/bass.mp3"),
            loadAudioBuffer("assets/drum.mp3")
        ]).then(([mare, gtrs, keys, bass, drum]) => {
            elements.audioBuffers.mare = mare;
            elements.audioBuffers.gtrs = gtrs;
            elements.audioBuffers.keys = keys;
            elements.audioBuffers.bass = bass;
            elements.audioBuffers.drum = drum;
        
            state.audioBuffersLoaded = true;
            console.log("Audio buffers loaded");
        }).catch(error => {
            console.error("Audio loading failed:", error);
        });
    }

    function playAudioBuffer(buffer, volume = 0.75, loop = true) {
        const source = elements.audioContext.createBufferSource();
        const gainNode = elements.audioContext.createGain();
        source.buffer = buffer;
        source.loop = loop;
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(elements.audioContext.destination);
        source.start(0);
        console.log(`Audio started with volume ${volume}`);
        return { source, gainNode };
    }

    function startMareAudio() {
        if (!elements.audioSources.mare && elements.audioBuffers.mare) {
            // Assicurati che l'audio context sia running
            if (elements.audioContext.state === 'suspended') {
                elements.audioContext.resume().then(() => {
                    console.log("AudioContext riattivato");
                    elements.audioSources.mare = playAudioBuffer(elements.audioBuffers.mare, 0.5, true);
                });
            } else {
                elements.audioSources.mare = playAudioBuffer(elements.audioBuffers.mare, 0.5, true);
            }
            console.log("Mare audio started");
        }
    }

    function startAdditionalAudio() {
        if (!elements.audioSources.gtrs && elements.audioBuffers.gtrs) {
            elements.audioSources.gtrs = playAudioBuffer(elements.audioBuffers.gtrs, 0, true);
            console.log("gtrs audio started");
        }
        if (!elements.audioSources.keys && elements.audioBuffers.keys) {
            elements.audioSources.keys = playAudioBuffer(elements.audioBuffers.keys, 0, true);
            console.log("keys audio started");
        }
        if (!elements.audioSources.bass && elements.audioBuffers.bass) {
            elements.audioSources.bass = playAudioBuffer(elements.audioBuffers.bass, 0, true);
            console.log("bass audio started");
        }
        if (!elements.audioSources.drum && elements.audioBuffers.drum) {
            elements.audioSources.drum = playAudioBuffer(elements.audioBuffers.drum, 0, true);
            console.log("drum audio started");
        }
    }

    function fadeOutAudio(audio, duration) {
        const startVolume = audio.gainNode.gain.value;
        const startTime = elements.audioContext.currentTime;

        audio.gainNode.gain.setValueAtTime(startVolume, startTime);
        audio.gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    function updateAudioVolumes() {
        // Volume di mare.mp3
        if (state.score <= 10) {
            const volume = 0.75 - (state.score * 0.0675);
            if (elements.audioSources.mare) elements.audioSources.mare.gainNode.gain.value = volume;
        } else {
            if (elements.audioSources.mare) {
                elements.audioSources.mare.gainNode.gain.value = 0.075;
            }
        }

        // Volume di gtrs (da 5 a 15)
        if (state.score >= 5 && state.score <= 15) {
            const volume = (state.score - 5) * 0.1;
            if (elements.audioSources.gtrs) elements.audioSources.gtrs.gainNode.gain.value = volume;
        }

        // Volume di keys (da 15 a 25)
        if (state.score >= 15 && state.score <= 25) {
            const volume = (state.score - 15) * 0.1;
            if (elements.audioSources.keys) elements.audioSources.keys.gainNode.gain.value = volume;
        }

        // Volume di bass (da 25 a 35)
        if (state.score >= 25 && state.score <= 35) {
            const volume = (state.score - 25) * 0.1;
            if (elements.audioSources.bass) elements.audioSources.bass.gainNode.gain.value = volume;
        }

        // Volume di drum (da 35 a 45)
        if (state.score >= 35 && state.score <= 45) {
            const volume = (state.score - 35) * 0.1;
            if (elements.audioSources.drum) elements.audioSources.drum.gainNode.gain.value = volume;
        }
    }

    function resumeAudioContextOnce() {
        if (elements.audioContext && elements.audioContext.state === 'suspended') {
            elements.audioContext.resume().then(() => {
                console.log("AudioContext attivato dal primo click");
            });
        }
        document.removeEventListener('click', resumeAudioContextOnce);
    }

    // =============================================
    // 8. GESTIONE DEL GIOCO
    // =============================================
    const messages = [
        { 
            text: "Oh no! Sembra che Dino si sia perso tra post, impegni e notifiche. Ora è rimasto indietro...e Dina non si vede più da un po' :(", 
            type: "title", 
            color: "white"
        },
        { 
            text: "Per ritrovarla, Dino dovrà schivare distrazioni e ostacoli che si presenteranno lungo il suo percorso. Lo sapresti aiutare?", 
            type: "title", 
            color: "white"
        },
        { 
            text: "Salta, corri, ascolta! Ogni passo lo avvicina a lei!", 
            type: "title", 
            color: "white"
        }
    ];
    function calculateMessagePositions() {
        messages.forEach(msg => {
            delete msg.y;
        });
    }

    function handleJump(event) {
        if (isMobileDevice() && event.type === 'touchstart') {
            event.preventDefault();
            event.stopPropagation();
        }
        if (state.isJumpButtonPressed) return;
        state.isJumpButtonPressed = true;
    
        if ((event.type === "keydown" && event.code === "Space") || 
            event.type === "click" || 
            event.type === "touchstart") {
            event.preventDefault();
            
            // Aggiungi questa parte per gestire l'audio
            if (!elements.audioContext) {
                initAudioContext();
                resumeAudioContext();
            }
            
            if (state.gamePaused) {
                state.popupState++;
                console.log(`Mostro messaggio ${state.popupState + 1}/${messages.length}`);
                
                if (state.popupState >= messages.length) {
                    startGame();
                }
                draw(); // Chiama draw() senza parametri
                
                // Avvia l'audio mare al primo input
                if (state.popupState === 1 && !elements.audioSources.mare) {
                    startMareAudio();
                }
                
                draw();
            } else if (!gameObjects.dino.isJumping) {
                gameObjects.dino.isJumping = true;
                gameObjects.dino.jumpSpeed = isMobileDevice() ? -12 : -18;
            }
        }
    
        setTimeout(() => {
            state.isJumpButtonPressed = false;
        }, 300);
    }

    function updatePopup() {
        if (state.popupState === 1) {
            console.log("Riproduzione audio mare.mp3");
            startMareAudio();
        }
    }

    function startGame() {
        console.log("Gioco avviato");
        state.gamePaused = false;
        console.log("gamePaused impostato a:", state.gamePaused);
    
        cancelAnimationFrame(state.animationFrameId); // Cancella eventuali frame precedenti
        state.animationFrameId = requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        const isMobile = isMobileDevice();
        const targetRatio = CONFIG.REFERENCE_WIDTH / CONFIG.REFERENCE_HEIGHT;
        
        // Dimensioni massime disponibili
        const maxWidth = isMobile ? window.innerWidth : window.innerWidth * 0.9;
        const maxHeight = isMobile ? window.innerHeight : window.innerHeight * 0.9;
        
        // Calcola dimensioni mantenendo l'aspect ratio
        let canvasWidth = maxWidth;
        let canvasHeight = canvasWidth / targetRatio;
    
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * targetRatio;
        }
    
        // Applica dimensioni (arrotondate per evitare sub-pixel)
        elements.canvas.width = Math.floor(canvasWidth);
        elements.canvas.height = Math.floor(canvasHeight);
        
        // Stili CSS
        elements.canvas.style.width = `${canvasWidth}px`;
        elements.canvas.style.height = `${canvasHeight}px`;
        
        // Centra il canvas
        elements.canvas.style.position = 'absolute';
        elements.canvas.style.left = '50%';
        elements.canvas.style.top = '50%';
        elements.canvas.style.transform = 'translate(-50%, -50%)';
    
        // Aggiorna posizioni elementi
        gameObjects.dino.y = elements.canvas.height * (isMobileDevice() ? 0.6 : 0.65);
        refreshAllSizes();
    }

    function getObstacleInterval(scrollSpeed) {
        const interval = CONFIG.INITIAL_OBSTACLE_INTERVAL - (scrollSpeed - 5) * 60;
        return Math.max(interval, CONFIG.MIN_OBSTACLE_INTERVAL);
    }

    function createNewPalm() {
        const type = Math.random() < 0.5 ? "palm" : "umbrella";
        const physics = CONFIG.OBSTACLE_PHYSICS[type];
        const offsets = CONFIG.OFFSET_CONFIG[physics.offsetKey];
        
        const baseY = elements.canvas.height - scaleValue(50, false);
        const y = baseY - scaleValue(physics.graphicHeight, false) + 
                  getVerticalOffset(physics.offsetKey) + 
                  (physics.extraOffset || 0);
    
        return {
            type,
            x: elements.canvas.width,
            y,
            width: scaleValue(physics.width),
            graphicHeight: scaleValue(physics.graphicHeight, false),
            collisionHeight: scaleValue(physics.collisionHeight, false),
            passed: false,
            hit: false
        };
    }

    function createPairOfObstacles() {
        const obstacleSpacing = scaleValue(100);
        const type1 = Math.random() < 0.5 ? "palm" : "umbrella";
        const type2 = Math.random() < 0.5 ? "palm" : "umbrella";
        const config1 = CONFIG.OBSTACLE_PHYSICS[type1];
        const config2 = CONFIG.OBSTACLE_PHYSICS[type2];
        const baseY = elements.canvas.height - scaleValue(50, false) + (isMobileDevice() ? scaleValue(20, false) : 0);
        
        return [
            {
                type: type1,
                x: elements.canvas.width,
                y: baseY - scaleValue(config1.graphicHeight, false) + 
                   getVerticalOffset(config1.offsetKey) + 
                   (config1.extraOffset || 0) + 
                   getMobileObstacleOffset(),
                width: scaleValue(config1.width),
                graphicHeight: scaleValue(config1.graphicHeight, false),
                collisionHeight: scaleValue(config1.collisionHeight, false),
                passed: false,
                hit: false
            },
            {
                type: type2,
                x: elements.canvas.width + obstacleSpacing,
                y: baseY - scaleValue(config2.graphicHeight, false) + 
                   getVerticalOffset(config2.offsetKey) + 
                   (config2.extraOffset || 0) + 
                   getMobileObstacleOffset(),
                width: scaleValue(config2.width),
                graphicHeight: scaleValue(config2.graphicHeight, false),
                collisionHeight: scaleValue(config2.collisionHeight, false),
                passed: false,
                hit: false
            }
        ];
    }

    function drawPixelText(ctx, text, x, y, type, options = {}) {
        // Dimensioni responsive
        const sizes = {
            title: {
                desktop: 24,
                mobile: 12, // Riduci questo valore per mobile (es. da 16 a 14)
                lineHeight: 1.2
            },
            default: {
                desktop: 18,
                mobile: 10, // Riduci questo valore per mobile (es. da 14 a 12)
                lineHeight: 1.3
            }
        };
    
        const config = sizes[type] || sizes.default;
        const fontSize = isMobileDevice() ? config.mobile : config.desktop;
        
        // Stile del testo
        elements.ctx.save();
        elements.ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
        elements.ctx.fillStyle = options.color || "white";
        elements.ctx.textAlign = options.align || "center";
        elements.ctx.textBaseline = options.baseline || "middle";
        
        // Posizionamento speciale per mobile
        const adjustedX = isMobileDevice() ? x * 0.8 : x; // Riduci l'offset X su mobile
        const adjustedY = isMobileDevice() ? y * 1.2 : y; // Aumenta l'offset Y su mobile
        
        elements.ctx.fillText(text, adjustedX, adjustedY);
        elements.ctx.restore();
    }

    function drawHeartMask(ctx, progress) {
        const centerX = elements.canvas.width / 2;
        const centerY = elements.canvas.height / 2 + scaleValue(100, false);
        const maxRadius = Math.max(elements.canvas.width, elements.canvas.height) * 0.8;
        const radius = maxRadius * (1 - progress);

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = elements.canvas.width;
        tempCanvas.height = elements.canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.fillStyle = "black";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.globalCompositeOperation = "destination-out";
        
        tempCtx.beginPath();
        tempCtx.moveTo(centerX, centerY - radius * 0.7);
        tempCtx.bezierCurveTo(
            centerX + radius * 0.7, centerY - radius * 1.2,
            centerX + radius * 1.2, centerY - radius * 0.4,
            centerX, centerY + radius * 0.6
        );
        tempCtx.bezierCurveTo(
            centerX - radius * 1.2, centerY - radius * 0.4,
            centerX - radius * 0.7, centerY - radius * 1.2,
            centerX, centerY - radius * 0.7
        );
        tempCtx.closePath();
        tempCtx.fill();

        elements.ctx.drawImage(tempCanvas, 0, 0);
    }

    function drawImage(ctx, img, x, y, width, height) {
        elements.ctx.drawImage(img, x, y, width, height);
    }

    function getRelativeSize(percent, isWidth = true) {
        return isWidth 
            ? elements.canvas.width * (percent / 100)
            : elements.canvas.height * (percent / 100);
    }

    function drawGameElements(ctx) {
        // 1. Disegna lo sfondo
        elements.ctx.save();
        elements.ctx.drawImage(elements.images.sfondo, 0, 0, elements.images.sfondo.width, elements.images.sfondo.height, 0, 0, elements.canvas.width, elements.canvas.height);
        elements.ctx.restore();

        // 2. Disegna gli ostacoli
        gameObjects.palms.forEach((obstacle) => {
            if (obstacle.type === "palm") {
                drawImage(elements.ctx, elements.images.palm, obstacle.x, obstacle.y, 
                          obstacle.width, obstacle.graphicHeight);
            } else if (obstacle.type === "umbrella") {
                drawImage(elements.ctx, elements.images.umbrella, obstacle.x, obstacle.y, 
                          obstacle.width, obstacle.graphicHeight);
            }
        });

        // [DEBUG] 2.1 - Hitbox verticali proporzionali
        //gameObjects.palms.forEach((obstacle) => {
        //    const physics = CONFIG.OBSTACLE_PHYSICS[obstacle.type];
        //    const hitboxWidth = obstacle.width * physics.hitboxWidthRatio;
        //    const hitboxX = obstacle.x + (obstacle.width / 2) - (hitboxWidth / 2);
        //    const hitboxTop = obstacle.y + obstacle.graphicHeight - obstacle.collisionHeight;
            
        //   ctx.fillStyle = obstacle.type === "palm" ? "rgba(255, 0, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
        //    ctx.fillRect(hitboxX, hitboxTop, hitboxWidth, obstacle.collisionHeight);
       // });

        // 3. Disegna il granchio
        if (gameObjects.granchio.visible) {
            drawImage(elements.ctx, elements.images.granchio, gameObjects.granchio.x, gameObjects.granchio.y, 
                      gameObjects.granchio.width, gameObjects.granchio.height);
        }

        // 4. Disegna il castello
        if (gameObjects.castello.visible) {
            drawImage(elements.ctx, elements.images.castello, gameObjects.castello.x, gameObjects.castello.y, 
                      gameObjects.castello.width, gameObjects.castello.height);
        }
        
        // 5. Disegna il dinosauro
        drawImage(elements.ctx, elements.images.dino, gameObjects.dino.x, gameObjects.dino.y, 
                  gameObjects.dino.width, gameObjects.dino.height);

        // 6. Disegna Dina e gtr1
        if (gameObjects.dina.visible) {
            // Dina
            drawImage(elements.ctx, elements.images.dina, 
                     gameObjects.dina.x, gameObjects.dina.y,
                     gameObjects.dina.width, gameObjects.dina.height);
            
            // gtr1 (posizione relativa a Dina)
            drawImage(elements.ctx, elements.images.gtr1,
                     gameObjects.dina.x + gameObjects.gtr1.offsetX,
                     gameObjects.dina.y + gameObjects.gtr1.offsetY,
                     gameObjects.gtr1.width, gameObjects.gtr1.height);
        }    

        const scoreX = elements.canvas.width * 0.05;
        const scoreY = elements.canvas.height * 0.05;
        const scoreSize = Math.min(elements.canvas.width, elements.canvas.height) * 0.04;
        
        elements.ctx.save();
        elements.ctx.font = `bold ${scoreSize}px 'Press Start 2P'`;
        elements.ctx.fillStyle = "white";
        elements.ctx.textAlign = "left";
        elements.ctx.textBaseline = "top";
        elements.ctx.fillText(`Punteggio: ${state.score}`, scoreX, scoreY);
        elements.ctx.restore();
        if(state.gamePaused && state.popupState < messages.length) {
            const currentMsg = messages[state.popupState];
            
            // Sfondo semitrasparente
            elements.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            const textWidth = elements.ctx.measureText(currentMsg.text).width;

            // Testo
            drawPixelText(elements.ctx, currentMsg.text, elements.canvas.width/2, currentMsg.y, currentMsg.type, {
                color: currentMsg.color
            });
        }
    }

    function update(timestamp) {
        const groundLevel = elements.canvas.height - gameObjects.dino.height - (isMobileDevice() ? 10 : 0);
        // Controllo scorciatoia per impostare il punteggio a 49
        if (state.aKeyPressed && (timestamp - state.aKeyPressStartTime) >= 3000) {
            state.score = 49;
            state.aKeyPressed = false; // Resetta per evitare ripetizioni
            console.log("Scorciatoia attivata: punteggio impostato a 49");
        }

        if (!state.startTime) state.startTime = timestamp;

        // Se il punteggio è >= 50, avvia la sequenza finale
        if (state.score >= 50 && !state.gameEnded) {
            state.showDina = true;
            state.gameEnded = true;
            gameObjects.dina.state = "hidden"; // Resetta lo stato
            console.log("🎯 Score 50 raggiunto - Attivazione Dina");
            
            document.removeEventListener("keydown", handleJump);
            elements.jumpButton.removeEventListener("click", handleJump);
        }

        // FASE 1: Entrata nello schermo
        if (state.gameEnded && !state.finalAnimationStarted) {
            startFinalAnimation();
        }
    
        if (state.startMovingToCenter) {
            // Muovi Dino (50px a destra)
            gameObjects.dino.x = Math.min(
                gameObjects.dino.x + gameObjects.dino.moveSpeed,
                gameObjects.dino.finalTargetX
            );
    
            // Muovi Dina (100px a sinistra)
            gameObjects.dina.x = Math.max(
                gameObjects.dina.x - gameObjects.dina.moveSpeed,
                gameObjects.dina.finalTargetX
            );
    
            if (gameObjects.dina.x <= gameObjects.dina.finalTargetX && !state.maskStartTime) {
                console.log("Posizioni finali raggiunte");
                state.maskStartTime = timestamp;
            }
        }

        // Aggiorna la maschera
        if (state.maskStartTime) {
            const elapsedTime = timestamp - state.maskStartTime;

            if (state.maskPauseTime && elapsedTime < state.maskPauseTime + CONFIG.MASK_PAUSE_DURATION) {
                // Pausa
            } else {
                state.maskProgress = Math.min((elapsedTime - (state.maskPauseTime ? CONFIG.MASK_PAUSE_DURATION : 0)) / CONFIG.MASK_DURATION, 1);

                if (state.maskProgress >= 0.5 && !state.maskPauseTime) {
                    state.maskPauseTime = elapsedTime;
                }
            }
        }

        // Diminuisci il volume di mare.mp3
        if (state.maskStartTime && elements.audioSources.mare) {
            const elapsedTime = timestamp - state.maskStartTime;
            const volume = Math.max(0, 0.75 - (elapsedTime / CONFIG.MASK_DURATION));
            elements.audioSources.mare.gainNode.gain.value = volume;

            if (state.maskProgress >= 1) {
                elements.audioSources.mare.gainNode.gain.value = 0;
                elements.audioSources.mare.source.stop();
            }
        }

        // Aumenta la velocità
        state.scrollSpeed += 0.001;

        // Movimento del dinosauro
        if (gameObjects.dino.isJumping) {
            gameObjects.dino.y += gameObjects.dino.jumpSpeed;
            gameObjects.dino.jumpSpeed += gameObjects.dino.gravity;
            
            // Terra ferma (mobile)
            const groundLevel = isMobileDevice() 
                ? elements.canvas.height - gameObjects.dino.height - scaleValue(20, false)
                : scaleValue(250, false);
            
            if (gameObjects.dino.y >= groundLevel) {
                gameObjects.dino.y = groundLevel;
                gameObjects.dino.isJumping = false;
            }
        }

        // Movimento degli ostacoli
        gameObjects.palms.forEach((obstacle) => {
            obstacle.x -= state.scrollSpeed;
            
            const physics = CONFIG.OBSTACLE_PHYSICS[obstacle.type];
            const hitboxWidth = obstacle.width * physics.hitboxWidthRatio;
            const hitboxX = obstacle.x + (obstacle.width - hitboxWidth)/2;
            const hitboxTop = obstacle.y + obstacle.graphicHeight - physics.collisionHeight;
            // Area dinosauro (riduci leggermente la hitbox del dino)
            const dinoLeft = gameObjects.dino.x + gameObjects.dino.width * 0.2;
            const dinoRight = gameObjects.dino.x + gameObjects.dino.width * 0.8;
            const dinoBottom = gameObjects.dino.y + gameObjects.dino.height;

            if (dinoRight > hitboxX && 
                dinoLeft < hitboxX + hitboxWidth &&
                dinoBottom > hitboxTop) {            
                // Controlla collisione
                if (gameObjects.dino.x + gameObjects.dino.width > hitboxX && 
                    gameObjects.dino.x < hitboxX + hitboxWidth &&
                    gameObjects.dino.y + gameObjects.dino.height > hitboxTop) {
                    if (!obstacle.hit) {
                        obstacle.hit = true;
                        state.score -= 1; // Permette valori negativi
                        console.log("Collisione! Punteggio:", state.score);
                    }
                }
            }
            
            // Controlla se superato
            if (!obstacle.passed && obstacle.x + obstacle.width < gameObjects.dino.x) {
                obstacle.passed = true;
                if (!obstacle.hit) {
                    state.score += 1;
                    console.log("Ostacolo superato! Punteggio:", state.score);
                }
            }
        });

        // Aggiorna i volumi audio
        updateAudioVolumes();

        // Rimuovi ostacoli usciti dallo schermo
        gameObjects.palms = gameObjects.palms.filter(obstacle => 
            obstacle.x + (obstacle.type === "palm" ? scaleValue(144 * 1.2 * 0.9) : scaleValue(144 * 0.8)) > 0
        );

        // Movimento del granchio e castello
        if (gameObjects.granchio.visible) {
            gameObjects.granchio.x -= state.scrollSpeed;
            if (gameObjects.granchio.x + gameObjects.granchio.width < 0) {
                gameObjects.granchio.visible = false;
                state.lastGranchioTime = timestamp;
            }
        }

        if (gameObjects.castello.visible) {
            gameObjects.castello.x -= state.scrollSpeed;
            if (gameObjects.castello.x + gameObjects.castello.width < 0) {
                gameObjects.castello.visible = false;
                state.lastCastelloTime = timestamp;
            }
        }

        // Genera nuovi ostacoli
        if (!state.gameEnded && timestamp - state.lastObstacleTime > getObstacleInterval(state.scrollSpeed)) {
            if (Math.random() < state.pairProbability) {
                const newObstacles = createPairOfObstacles();
                gameObjects.palms.push(...newObstacles);
                console.log("Generata coppia di ostacoli:", newObstacles);
            } else {
                const newObstacle = createNewPalm();
                gameObjects.palms.push(newObstacle);
                console.log("Generato ostacolo singolo:", newObstacle);
            }
            state.lastObstacleTime = timestamp;
            
            // Aumenta gradualmente la probabilità di coppie
            state.pairProbability = Math.min(
                CONFIG.MAX_PAIR_PROBABILITY, 
                state.pairProbability + 0.02
            );
        }

        // Genera granchi e castelli
        if (!state.gameEnded && timestamp - state.startTime > 5000) {
            if (state.isGranchioNext && !gameObjects.granchio.visible && !gameObjects.castello.visible && 
                timestamp - state.lastGranchioTime > 6000) {
                gameObjects.granchio.x = elements.canvas.width;
                gameObjects.granchio.y = elements.canvas.height - gameObjects.granchio.height - scaleValue(50, false) + getMobileObstacleOffset();
                gameObjects.granchio.visible = true;
                state.isGranchioNext = false;
                state.lastGranchioTime = timestamp;
            } else if (!state.isGranchioNext && !gameObjects.castello.visible && !gameObjects.granchio.visible && 
                       timestamp - state.lastCastelloTime > 6000) {
                gameObjects.castello.x = elements.canvas.width;
                gameObjects.castello.y = elements.canvas.height - gameObjects.castello.height - scaleValue(50, false) + getMobileObstacleOffset();
                gameObjects.castello.visible = true;
                state.isGranchioNext = true;
                state.lastCastelloTime = timestamp;
            }
        }

        // Avvia audio aggiuntivi
        if (state.score >= 5 && state.audioBuffersLoaded && !elements.audioSources.gtrs) {
            startAdditionalAudio();
        }

        if (state.gameEnded) {
            handleFinalAnimation(timestamp);
        }

        if (state.score >= 50 && !state.showDina) {
            state.showDina = true;
            gameObjects.dina.x = gameObjects.dina.startX; // Reset posizione iniziale
            console.log("🎯 Score 50 raggiunto - Attivazione Dina");
        }
        
        updateDinaAnimation(timestamp);
    
    }

    function draw() {
        if (!elements.ctx) {
            elements.ctx = elements.canvas.getContext('2d');
            if (!elements.ctx) {
                console.error("Impossibile ottenere il contesto del canvas");
                return;
            }
        }
        
        elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        drawGameElements();
        // Messaggi iniziali
        if(state.gamePaused && state.popupState < messages.length) {
            const currentMsg = messages[state.popupState];
    
            // Sfondo semitrasparente fullscreen
            elements.ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            elements.ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    
            // Testo con wrap automatico (mobile-specific)
            const fontSize = isMobileDevice() ? 12 : 18;
            const lineHeight = fontSize * 1.4;
            const maxWidth = elements.canvas.width * 0.9;
    
            elements.ctx.font = `bold ${fontSize}px 'Press Start 2P'`;
            elements.ctx.fillStyle = "white";
            elements.ctx.textAlign = "center";
    
            const lines = [];
            const words = currentMsg.text.split(' ');
            let currentLine = words[0];
    
            for (let i = 1; i < words.length; i++) {
                const testLine = currentLine + ' ' + words[i];
                const metrics = elements.ctx.measureText(testLine);
                if (metrics.width < maxWidth) {
                    currentLine = testLine;
                } else {
                    lines.push(currentLine);
                    currentLine = words[i];
                }
            }
            lines.push(currentLine);
    
            // Posizionamento verticale
            const startY = elements.canvas.height / 2 - (lines.length * lineHeight) / 2;
    
            lines.forEach((line, i) => {
                elements.ctx.fillText(line, elements.canvas.width / 2, startY + (i * lineHeight));
            });
        }
    
        // Maschera a cuore
        if (state.maskProgress > 0) {
            drawHeartMask(elements.ctx, state.maskProgress);
            document.querySelectorAll('#jumpButton, #desktopMessage').forEach(el => {
                el.style.display = 'none';
            });
        }
    
        // Fine gioco
        if (state.maskProgress >= 1 && !state.coverVideoPlayed) {
            console.log("Maschera completamente chiusa - Nascondi la scritta e il tasto 'Salta'");
            state.coverVideoPlayed = true;
    
            // Imposta le dimensioni per mobile
            if (isMobileDevice()) {
                elements.coverVideo.style.width = "auto";
                elements.coverVideo.style.height = "80vh";
                elements.coverVideo.style.maxWidth = "100%";
            } else {
                elements.coverVideo.style.width = `${Math.min(window.innerWidth * 0.9, elements.canvas.width)}px`;
                elements.coverVideo.style.height = "auto";
            }
        
            elements.coverVideo.style.display = "block";
            elements.coverVideo.style.opacity = "0";
            
            // Forza il caricamento su mobile
            elements.coverVideo.load();
            
            setTimeout(() => {
                elements.coverVideo.style.opacity = "1";
                
                // Gestione speciale per la riproduzione su mobile
                const playPromise = elements.coverVideo.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Errore riproduzione video:", error);
                        // Soluzione alternativa per iOS
                        elements.coverVideo.muted = true;
                        elements.coverVideo.play().catch(e => console.log("Errore anche con muted:", e));
                    });
                }
            }, 100);
        
            // Mostra il messaggio dopo 1 secondo
            setTimeout(() => {
                elements.prizeMessage.container.style.display = "flex";
            }, 1000);
    
            elements.coverVideo.onended = () => {
                elements.coverVideo.style.opacity = "0";
                setTimeout(() => {
                    elements.coverVideo.pause();
                    elements.coverVideo.currentTime = 0;
                    elements.coverVideo.style.display = "none";
                }, 1000);
            
                if (elements.audioSources.mare) {
                    elements.audioSources.mare.gainNode.gain.setValueAtTime(
                        elements.audioSources.mare.gainNode.gain.value, 
                        elements.audioContext.currentTime
                    );
                    elements.audioSources.mare.gainNode.gain.linearRampToValueAtTime(
                        0, 
                        elements.audioContext.currentTime + 1
                    );
                    elements.audioSources.mare.source.stop();
                }
                if (elements.audioSources.gtrs) fadeOutAudio(elements.audioSources.gtrs, 1);
                if (elements.audioSources.keys) fadeOutAudio(elements.audioSources.keys, 1);
                if (elements.audioSources.bass) fadeOutAudio(elements.audioSources.bass, 1);
                if (elements.audioSources.drum) fadeOutAudio(elements.audioSources.drum, 1);
            };
        }
    }

    function setupPrizeMessage() {
        elements.prizeMessage.container.className = "prize-message-container";
        const isMobile = isMobileDevice();
        elements.prizeMessage.text.style.fontSize = isMobile ? "14px" : "24px";
        elements.prizeMessage.text.style.padding = isMobile ? "0 20px" : "0";
        elements.prizeMessage.text.style.marginBottom = isMobile ? "15px" : "20px";   
        elements.prizeMessage.button.style.fontSize = isMobile ? "12px" : "18px";
        elements.prizeMessage.button.style.padding = isMobile ? "8px 16px" : "10px 20px";
        
        // Aggiungi questo per gestire meglio il touch su mobile
        elements.prizeMessage.button.style.webkitTapHighlightColor = "transparent";
        elements.prizeMessage.button.style.userSelect = "none";

        // Configura il contenitore del messaggio
        elements.prizeMessage.container.style.position = "fixed";
        elements.prizeMessage.container.style.top = "auto";
        elements.prizeMessage.container.style.bottom = "20px";
        elements.prizeMessage.container.style.left = "50%";
        elements.prizeMessage.container.style.transform = "translateX(-50%)";
        elements.prizeMessage.container.style.display = "none";
        elements.prizeMessage.container.style.flexDirection = "column";
        elements.prizeMessage.container.style.alignItems = "center";
        elements.prizeMessage.container.style.justifyContent = "center";
        elements.prizeMessage.container.style.zIndex = "1000";
        elements.prizeMessage.container.style.textAlign = "center";
        elements.prizeMessage.container.style.pointerEvents = "auto";
        elements.prizeMessage.container.style.width = "100%";
        elements.prizeMessage.container.style.background = "none";
        elements.prizeMessage.container.style.border = "none";
        
        // Configura il pulsante
        elements.prizeMessage.button.textContent = "E ora?";
        elements.prizeMessage.button.href = "https://distrokid.com/hyperfollow/inox209/una-nuova-scusa";
        elements.prizeMessage.button.target = "_blank";
        elements.prizeMessage.button.style.color = "#00ffff";
        elements.prizeMessage.button.style.fontFamily = "'Press Start 2P', monospace";
        elements.prizeMessage.button.style.fontSize = isMobileDevice() ? "14px" : "18px";
        elements.prizeMessage.button.style.textDecoration = "none";
        elements.prizeMessage.button.style.border = "2px solid #00ffff";
        elements.prizeMessage.button.style.padding = "10px 20px";
        elements.prizeMessage.button.style.borderRadius = "5px";
        elements.prizeMessage.button.style.cursor = "pointer";
        elements.prizeMessage.button.style.transition = "all 0.3s";
        elements.prizeMessage.button.style.textShadow = "1px 1px 2px rgba(0, 0, 0, 0.8)"; // Aggiunto ombreggiatura
        elements.prizeMessage.button.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        elements.prizeMessage.button.style.margin = "0 auto";
        
        // Effetto hover per il pulsante
        elements.prizeMessage.button.addEventListener("mouseenter", () => {
            elements.prizeMessage.button.style.backgroundColor = "#00ffff";
            elements.prizeMessage.button.style.color = "black";
            elements.prizeMessage.button.style.textShadow = "none";
        });
        
        elements.prizeMessage.button.addEventListener("mouseleave", () => {
            elements.prizeMessage.button.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            elements.prizeMessage.button.style.color = "#00ffff";
            elements.prizeMessage.button.style.textShadow = "1px 1px 2px rgba(0, 0, 0, 0.8)";
        });
        
        // Aggiungi gli elementi al DOM
        elements.prizeMessage.container.appendChild(elements.prizeMessage.text);
        elements.prizeMessage.container.appendChild(elements.prizeMessage.button);
        document.body.appendChild(elements.prizeMessage.container);

        if(isMobileDevice()) {
            elements.prizeMessage.container.style.top = "75%";
            elements.prizeMessage.container.style.padding = "10px";
            elements.prizeMessage.button.style.fontSize = "10px";
            elements.prizeMessage.button.style.padding = "6px 12px";
            elements.prizeMessage.text.style.fontSize = "10px";
            elements.prizeMessage.text.style.lineHeight = "1.4";
            elements.prizeMessage.text.style.marginBottom = "10px";
        }
    }
    
    function gameLoop(timestamp) {
        // Modifica questa funzione così:
        if (!state.startTime) state.startTime = timestamp;
        // Esegui sempre update e draw, ma controlla gamePaused in update
        update(timestamp);
        draw();
        
        // Continua il loop solo se il gioco non è in pausa
        if (!state.gamePaused) {
            state.animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    function startFinalAnimation() {
        if (state.finalAnimationStarted) return;
        state.finalAnimationStarted = true;
    
        gameObjects.dina.visible = true;
        gameObjects.dina.x = elements.canvas.width - scaleValue(150); 
        console.log("Posizionate a destra");
    
        setTimeout(() => {
            state.startMovingToCenter = true;
            console.log("Inizio movimento");
        }, 2000);
    }

    function handleFinalAnimation(timestamp) {
        // FASE 1: Entrata dallo schermo
        if (!state.dinaEntryComplete && gameObjects.dina.x > gameObjects.dina.entryTargetX) {
            gameObjects.dina.x -= gameObjects.dina.entrySpeed;
            return;
        }
    
        // FASE 2: Prima fermata
        if (!state.dinaEntryComplete) {
            state.dinaEntryComplete = true;
            state.dinaPauseStartTime = timestamp;
            console.log("Dina entrata completamente, pausa...");
            return;
        }
    
        // FASE 3: Dopo 2 secondi di pausa, muovi verso il centro
        if (state.dinaEntryComplete && !state.dinaMovingToCenter && 
            timestamp - state.dinaPauseStartTime > 2000) {
            state.dinaMovingToCenter = true;
            console.log("Inizio movimento verso il centro");
        }
    
        // FASE 4: Movimento verso il centro
        if (state.dinaMovingToCenter) {
            // Muovi Dino a destra
            if (gameObjects.dino.x < gameObjects.dino.finalTargetX) {
                gameObjects.dino.x += gameObjects.dino.moveSpeed;
            }
    
            // Muovi Dina a sinistra
            if (gameObjects.dina.x > gameObjects.dina.finalTargetX) {
                gameObjects.dina.x -= gameObjects.dina.moveSpeed;
            }
    
            // Verifica completamento
            if (gameObjects.dino.x >= gameObjects.dino.finalTargetX && 
                gameObjects.dina.x <= gameObjects.dina.finalTargetX && 
                !state.maskStartTime) {
                state.maskStartTime = timestamp;
                console.log("Posizioni finali raggiunte");
                elements.jumpButton.classList.add('hidden');
                document.getElementById('desktopMessage').classList.add('hidden');
            }
        }
    }

    function updateDinaAnimation(timestamp) {
    if (!state.showDina) return;

    switch (gameObjects.dina.state) {
        case "hidden":
            gameObjects.dina.visible = true;
            gameObjects.dina.state = "entering";
            gameObjects.dina.x = gameObjects.dina.startX;
            console.log("Dina: Inizio entrata da destra");
            break;

        case "entering":
            gameObjects.dina.x -= gameObjects.dina.entrySpeed;
            
            if (gameObjects.dina.x <= gameObjects.dina.entryTargetX) {
                gameObjects.dina.state = "pausing";
                gameObjects.dina.pauseStartTime = timestamp;
                console.log("Dina: Entrata completata, pausa di 2 secondi");
            }
            break;

        case "pausing":
            if (timestamp - gameObjects.dina.pauseStartTime >= 2000) {
                gameObjects.dina.state = "movingToCenter";
                console.log("Dina: Fine pausa, inizio movimento al centro");
            }
            break;

        case "movingToCenter":
            if (gameObjects.dino.x < gameObjects.dino.finalTargetX) {
                gameObjects.dino.x += gameObjects.dino.moveSpeed;
            }

            if (gameObjects.dina.x > gameObjects.dina.finalTargetX) {
                gameObjects.dina.x -= gameObjects.dina.moveSpeed;
            }

            if (Math.abs(gameObjects.dino.x - gameObjects.dino.finalTargetX) < 1 && 
                Math.abs(gameObjects.dina.x - gameObjects.dina.finalTargetX) < 1) {
                gameObjects.dina.state = "centered";
                state.maskStartTime = timestamp;
                console.log("Dina: Centratura completata");
                elements.jumpButton.classList.add('hidden');
                document.getElementById('desktopMessage').classList.add('hidden');
            }
            break;
    }
    }

    function setupVideoForMobile() {
        if (!isMobileDevice()) return;
        
        // Gestione speciale per iOS
        document.body.addEventListener('click', function videoPlayHandler() {
            if (state.coverVideoPlayed && elements.coverVideo.style.display === "block") {
                elements.coverVideo.muted = false; // Riattiva l'audio se necessario
                elements.coverVideo.play().catch(e => console.log("Errore play:", e));
            }
            document.body.removeEventListener('click', videoPlayHandler);
        }, { once: true });
        
        // Ridimensionamento dinamico per mobile
        window.addEventListener('resize', function() {
            if (state.coverVideoPlayed) {
                elements.coverVideo.style.height = "80vh";
                elements.coverVideo.style.maxWidth = "100%";
            }
        });
    }

    // =============================================
    // 9. INIZIALIZZAZIONE
    // =============================================
    function init() {
        elements.ctx = elements.canvas.getContext('2d');
        if (!elements.ctx) {
            alert("Errore: Impossibile inizializzare il contesto del canvas");
            return;
        }
        if (isMobileDevice()) {
            document.head.insertAdjacentHTML('beforeend', `
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
            `);
            // Forza ridimensionamento iniziale
            setTimeout(() => {
                resizeCanvas();
                window.scrollTo(0, 0);
            }, 100);
        }
        if(isMobileDevice()) {
            // Forza ridisegno completo al cambio orientamento
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    resizeCanvas();
                    draw();
                }, 100);
            });
        }
        // Inizializza canvas e risorse
        resizeCanvas();
        initResources();
        setupPrizeMessage();
        
        // Configura event listeners
        window.addEventListener("resize", resizeCanvas);
        document.addEventListener("keydown", handleJump);
        elements.jumpButton.addEventListener("click", handleJump);
        elements.jumpButton.addEventListener("touchstart", handleJump, { passive: true });


        document.addEventListener('keydown', (e) => {
            if (e.key === 'a' || e.key === 'A') {
                if (!state.aKeyPressed) {
                    state.aKeyPressed = true;
                    state.aKeyPressStartTime = performance.now();
                }
            }
        });
    
        document.addEventListener('keyup', (e) => {
            if (e.key === 'a' || e.key === 'A') {
                state.aKeyPressed = false;
            }
        });

        // Avvia il primo frame
        if (state.gamePaused) {
            state.animationFrameId = requestAnimationFrame(gameLoop);
        }

        gameObjects.dino.finalTargetX = elements.canvas.width/2 - scaleValue(150);
        gameObjects.dina.finalTargetX = elements.canvas.width/2 + scaleValue(50);
        gameObjects.dino.x = gameObjects.dino.startX;
        gameObjects.dina.x = gameObjects.dina.startX;
        gameObjects.dina.visible = false;
        elements.coverVideo.addEventListener('loadedmetadata', function() {
            // Imposta le dimensioni corrette per mobile
            if (isMobileDevice()) {
                const videoRatio = this.videoWidth / this.videoHeight;
                const mobileWidth = Math.min(window.innerWidth * 0.95, elements.canvas.width);
                const mobileHeight = mobileWidth / videoRatio;
                
                this.style.width = `${mobileWidth}px`;
                this.style.height = `${mobileHeight}px`;
            }
        });

        elements.canvas.style.imageRendering = '-webkit-optimize-contrast';
        elements.canvas.style.imageRendering = 'pixelated';
        elements.canvas.style.imageRendering = 'crisp-edges';
        elements.ctx.imageSmoothingEnabled = false;
        // Aggiungi queste proprietà ANTIALIASING
        elements.canvas.style.imageRendering = 'pixelated';
        elements.ctx.imageSmoothingEnabled = false;
        // Forza dimensioni intere per canvas
        const dpr = window.devicePixelRatio || 1;
        elements.canvas.width = Math.floor(elements.canvas.clientWidth * dpr);
        elements.canvas.height = Math.floor(elements.canvas.clientHeight * dpr);
        elements.ctx.scale(dpr, dpr);        
        // Forza il ridimensionamento iniziale su mobile
        if (isMobileDevice()) {
            setTimeout(() => {
                elements.coverVideo.dispatchEvent(new Event('loadedmetadata'));
            }, 500);
        }
        setupVideoForMobile();
        // Listener per cambiamenti orientamento
        window.addEventListener('resize', () => {
            setTimeout(resizeCanvas, 100);
        });
    
        // Forza ridimensionamento iniziale
        resizeCanvas();
    }

    // Avvia il gioco
    init();
});
