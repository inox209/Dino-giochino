document.addEventListener("DOMContentLoaded", () => {
    // =============================================
    // 1. COSTANTI E CONFIGURAZIONI
    // =============================================
    const CONFIG = {
        // Dimensioni di riferimento
        REFERENCE_WIDTH: 800,
        REFERENCE_HEIGHT: 400,
        MOBILE_BREAKPOINT: 768,
        
        // Immagini
        TOTAL_IMAGES: 9,
        
        // Offset ostacoli
        OFFSET_CONFIG: {
            PALM: { yOffset: 10, mobileYOffset: 5 },
            UMBRELLA: { yOffset: -20, mobileYOffset: -10 },
            GRANCHIO: { yOffset: 0, mobileYOffset: 15 },
            CASTELLO: { yOffset: 0, mobileYOffset: 10 }
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
        dinaMovingToCenter: false
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
            video.style.position = "absolute";
            video.style.display = "none";
            video.style.opacity = "0";
            video.style.transition = "opacity 2s";
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
        }
    };

    // =============================================
    // 4. OGGETTI DI GIOCO
    // =============================================
    const gameObjects = {
        dino: {
            x: scaleValue(100),
            y: scaleValue(250, false),
            width: scaleValue(isMobileDevice() ? 150 : 120, true, { isDino: true }),
            height: scaleValue(isMobileDevice() ? 150 : 120, false, { isDino: true }),
            isJumping: false,
            jumpSpeed: isMobileDevice() ? -12 : -18,
            gravity: isMobileDevice() ? 0.8 : 0.5,
            maxJumpHeight: isMobileDevice() ? 160 : 220,
            startX: scaleValue(100),
            finalTargetX: elements.canvas.width/2 - scaleValue(150),
            moveSpeed: 2
        },
        
        dina: {
            startX: elements.canvas.width + scaleValue(200), // Inizio FUORI dallo schermo
            entryTargetX: elements.canvas.width - scaleValue(200), // Prima fermata (visibile)
            finalTargetX: elements.canvas.width/2 + scaleValue(50), // Centro + offset
            width: scaleValue(isMobileDevice() ? 150 : 320, true, { isDina: true }),
            height: scaleValue(isMobileDevice() ? 150 : 320, false, { isDina: true }),
            entrySpeed: 2,
            moveSpeed: 2,
            x: 0, // Verrà impostato in init()
            y: isMobileDevice() ? scaleValue(200, false) : scaleValue(200, false),
            visible: false
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
            width: scaleValue(200, true, { isObstacle: true }), 
            height: scaleValue(200, false, { isObstacle: true }),
            visible: false
        },
        
        castello: { 
            x: elements.canvas.width, 
            y: elements.canvas.height - getMobileObstacleOffset(),
            width: scaleValue(450, true, { isObstacle: true }),
            height: scaleValue(450, false, { isObstacle: true }),
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

    function drawWrappedText(context, text, x, y, maxWidth, lineHeight, color, options = {}) {
        const {
            font = "20px 'Press Start 2P'",
            letterSpacing = 0,
            lineSpacing = 1.2,
            align = "center",
            baseline = "middle"
        } = options;
    
        context.save();
        context.font = font;
        context.fillStyle = color;
        context.textAlign = align;
        context.textBaseline = baseline;
    
        // Misura del testo con spaziatura
        const measureText = (text) => {
            if (letterSpacing === 0) return context.measureText(text).width;
            let total = 0;
            for (let i = 0; i < text.length; i++) {
                total += context.measureText(text[i]).width + (i < text.length - 1 ? letterSpacing : 0);
            }
            return total;
        };
    
        // Suddivisione in righe
        const words = text.split(' ');
        let lines = [];
        let currentLine = '';
    
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = measureText(testLine);
    
            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
    
        // Disegno delle righe
        const actualLineHeight = lineHeight * lineSpacing;
        const startY = y - ((lines.length - 1) * actualLineHeight) / 2;
    
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (letterSpacing === 0) {
                context.fillText(line, x, startY + (i * actualLineHeight));
            } else {
                // Calcola la larghezza totale della riga con spaziatura
                const totalWidth = measureText(line);
                // Posizione iniziale per centrare il testo
                let currentX = x - totalWidth / 2;
                
                for (let j = 0; j < line.length; j++) {
                    context.fillText(line[j], currentX, startY + (i * actualLineHeight));
                    currentX += context.measureText(line[j]).width + letterSpacing;
                }
            }
        }
    
        context.restore();
        return lines.length * actualLineHeight;
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
        console.log(`Immagine caricata ${state.imagesLoaded}/${CONFIG.TOTAL_IMAGES}`);
        
        if (state.imagesLoaded === CONFIG.TOTAL_IMAGES) {
            console.log("Tutte le immagini sono state caricate");
            
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
        const maxWidth = window.innerWidth * (isMobile ? 0.95 : 0.9);
        const maxHeight = window.innerHeight * (isMobile ? 0.95 : 0.9);

        const aspectRatio = CONFIG.REFERENCE_WIDTH / CONFIG.REFERENCE_HEIGHT;
        let canvasWidth = maxWidth;
        let canvasHeight = canvasWidth / aspectRatio;
    
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }

        elements.canvas.width = canvasWidth;
        elements.canvas.height = canvasHeight;
        elements.canvas.style.width = `${canvasWidth}px`;
        elements.canvas.style.height = `${canvasHeight}px`;

        gameObjects.dino.y = elements.canvas.height * 0.65;
        gameObjects.dina.y = scaleValue(250, false) - (isMobile ? scaleValue(30, false) : 0);

        elements.canvas.style.position = "absolute";
        elements.canvas.style.left = "50%";
        elements.canvas.style.top = "50%";
        elements.canvas.style.transform = "translate(-50%, -50%)";

        if(elements.coverVideo) {
            elements.coverVideo.style.width = `${Math.min(window.innerWidth * 0.9, elements.canvas.width)}px`;
            elements.coverVideo.style.height = `${Math.min(window.innerHeight * 0.9, elements.canvas.height)}px`;
            elements.coverVideo.style.objectFit = "contain";
        }
        refreshAllSizes();
        calculateMessagePositions();
    }

    function getObstacleInterval(scrollSpeed) {
        const interval = CONFIG.INITIAL_OBSTACLE_INTERVAL - (scrollSpeed - 5) * 60;
        return Math.max(interval, CONFIG.MIN_OBSTACLE_INTERVAL);
    }

    function createNewPalm() {
        const obstacleTypes = ["palm", "umbrella"];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const x = elements.canvas.width;       
        const baseY = elements.canvas.height - scaleValue(50, false);       
        const obstacleConfig = {
            palm: {
                height: scaleValue(144 * 1.2 * 0.9, false),
                offsetKey: "PALM"
            },
            umbrella: {
                height: scaleValue(144 * 0.8, false),
                offsetKey: "UMBRELLA",
                extraOffset: 20
            }
        };
    
        const config = obstacleConfig[type];
        const y = baseY - config.height + 
                  getVerticalOffset(config.offsetKey) + 
                  (config.extraOffset || 0);
        return { 
            type, 
            x, 
            y, 
            passed: false, 
            hit: false 
        };
    }

    function createPairOfObstacles() {
        const obstacleSpacing = scaleValue(100);
        const obstacleTypes = ["palm", "umbrella"];
        const type1 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const type2 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

        const x1 = elements.canvas.width;
        const x2 = x1 + obstacleSpacing;

        const y1 = type1 === "umbrella" 
            ? elements.canvas.height - scaleValue(144 * 0.8, false) - scaleValue(50, false) + getVerticalOffset("UMBRELLA") + 20 + getMobileObstacleOffset()
            : elements.canvas.height - scaleValue(144 * 1.2 * 0.9, false) - scaleValue(50, false) + getVerticalOffset("PALM") + getMobileObstacleOffset();

        const y2 = type2 === "umbrella" 
            ? elements.canvas.height - scaleValue(144 * 0.8, false) - scaleValue(50, false) + getVerticalOffset("UMBRELLA") + 20 + getMobileObstacleOffset()
            : elements.canvas.height - scaleValue(144 * 1.2 * 0.9, false) - scaleValue(50, false) + getVerticalOffset("PALM") + getMobileObstacleOffset();

        return [
            { type: type1, x: x1, y: y1, passed: false, hit: false },
            { type: type2, x: x2, y: y2, passed: false, hit: false },
        ];
    }

    function drawPixelText(ctx, text, x, y, type, options = {}) {
        const config = {
            title: {
                size: isMobileDevice() ? 20 : 30,
                color: options.color || "white"
            },
            //subtitle: {
            //    size: isMobileDevice() ? 16 : 24,
            //    color: options.color || "white"
            //},
            default: {
                size: isMobileDevice() ? 12 : 18,
                color: options.color || "white"
            }
        };
        
        const style = config[type] || config.default;
        
        ctx.save();
        ctx.font = `bold ${style.size}px 'Press Start 2P', monospace`;
        ctx.fillStyle = style.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y);
        ctx.restore();
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

        ctx.drawImage(tempCanvas, 0, 0);
    }

    function drawImage(ctx, img, x, y, width, height) {
        ctx.drawImage(img, x, y, width, height);
    }

    function drawGameElements(ctx) {
        // 1. Disegna lo sfondo
        ctx.drawImage(elements.images.sfondo, 0, 0, elements.canvas.width, elements.canvas.height);

        // 2. Disegna gli ostacoli
        gameObjects.palms.forEach((obstacle) => {
            if (obstacle.type === "palm") {
                drawImage(ctx, elements.images.palm, obstacle.x, obstacle.y, 
                          scaleValue(144 * 1.2 * 0.9), scaleValue(144 * 1.2 * 0.9, false));
            } else if (obstacle.type === "umbrella") {
                drawImage(ctx, elements.images.umbrella, obstacle.x, obstacle.y, 
                          scaleValue(144 * 0.8), scaleValue(144 * 0.8, false));
            }
        });

        // 3. Disegna il granchio
        if (gameObjects.granchio.visible) {
            drawImage(ctx, elements.images.granchio, gameObjects.granchio.x, gameObjects.granchio.y, 
                      gameObjects.granchio.width, gameObjects.granchio.height);
        }

        // 4. Disegna il castello
        if (gameObjects.castello.visible) {
            drawImage(ctx, elements.images.castello, gameObjects.castello.x, gameObjects.castello.y, 
                      gameObjects.castello.width, gameObjects.castello.height);
        }
        
        // 5. Disegna il dinosauro
        drawImage(ctx, elements.images.dino, gameObjects.dino.x, gameObjects.dino.y, 
                  gameObjects.dino.width, gameObjects.dino.height);

        // 6. Disegna Dina e gtr1
        if (gameObjects.dina.visible) {
            // Dina
            drawImage(ctx, elements.images.dina, 
                     gameObjects.dina.x, gameObjects.dina.y,
                     gameObjects.dina.width, gameObjects.dina.height);
            
            // gtr1 (posizione relativa a Dina)
            drawImage(ctx, elements.images.gtr1,
                     gameObjects.dina.x + gameObjects.gtr1.offsetX,
                     gameObjects.dina.y + gameObjects.gtr1.offsetY,
                     gameObjects.gtr1.width, gameObjects.gtr1.height);
        }

        drawPixelText(ctx, `Punteggio: ${state.score}`, scaleValue(150), scaleValue(30, false), "title");
        if(state.gamePaused && state.popupState < messages.length) {
            const currentMsg = messages[state.popupState];
            
            // Sfondo semitrasparente
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            const textWidth = ctx.measureText(currentMsg.text).width;

            // Testo
            drawPixelText(ctx, currentMsg.text, elements.canvas.width/2, currentMsg.y, currentMsg.type, {
                color: currentMsg.color
            });
        }
    }

    function update(timestamp) {
        // Controllo scorciatoia per impostare il punteggio a 49
        if (state.aKeyPressed && (timestamp - state.aKeyPressStartTime) >= 3000) {
            state.score = 49;
            state.aKeyPressed = false; // Resetta per evitare ripetizioni
            console.log("Scorciatoia attivata: punteggio impostato a 49");
        }

        if (!state.startTime) state.startTime = timestamp;

        // Se il punteggio è >= 50, avvia la sequenza finale
        if (state.score >= 50 && !state.gameEnded) {
            state.gameEnded = true;
            gameObjects.dina.x = elements.canvas.width + scaleValue(200); // Reset posizione iniziale
            
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
            
            if (isMobileDevice()) {
                const currentHeight = scaleValue(250, false) - gameObjects.dino.y;
                if (currentHeight > gameObjects.dino.maxJumpHeight) {
                    gameObjects.dino.y = scaleValue(250, false) - gameObjects.dino.maxJumpHeight;
                    gameObjects.dino.jumpSpeed = 0;
                }
            }
            
            // Atterraggio
            if (gameObjects.dino.y >= scaleValue(250, false)) {
                gameObjects.dino.y = scaleValue(250, false);
                gameObjects.dino.isJumping = false;
            }
        }

        // Movimento degli ostacoli
        gameObjects.palms.forEach((obstacle) => {
            obstacle.x -= state.scrollSpeed;

            const obstacleWidth = obstacle.type === "palm" ? scaleValue(144 * 1.2 * 0.9) : scaleValue(144 * 0.8);
            const obstacleHeight = obstacle.type === "palm" ? scaleValue(144 * 1.2 * 0.9, false) * 0.7 : scaleValue(144 * 0.8, false);

            if (obstacle.x + obstacleWidth < gameObjects.dino.x && !obstacle.passed) {
                const requiredJumpHeight = obstacle.y + (obstacleHeight * 0.25);
                if (gameObjects.dino.y + gameObjects.dino.height < requiredJumpHeight) {
                    state.score += 1;
                } else {
                    state.score -= 1;
                }
                obstacle.passed = true;
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
                gameObjects.palms.push(...createPairOfObstacles());
            } else {
                gameObjects.palms.push(createNewPalm());
            }
            state.lastObstacleTime = timestamp;
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
        
        handleDinaAnimation(timestamp);
    
    }

    function draw() {
        elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        drawGameElements(elements.ctx);
    
        // Messaggi iniziali
        if(state.gamePaused && state.popupState < messages.length) {
            elements.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            elements.ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
            
            // Mostra SOLO il messaggio corrente (non quelli precedenti)
            const currentMsg = messages[state.popupState];
            const maxWidth = elements.canvas.width * 0.8; // Lascia un margine del 10% su ogni lato
            const lineHeight = 30;
            const font = currentMsg.type === "title" ? "bold 24px 'Press Start 2P'" : "18px 'Press Start 2P'";
            
            drawWrappedText(
                elements.ctx,
                currentMsg.text,
                elements.canvas.width / 2,
                elements.canvas.height / 2,
                elements.canvas.width * 0.8, // maxWidth
                30, // lineHeight (altezza base di ogni riga)
                currentMsg.color,
                {
                    font: currentMsg.type === "title" 
                          ? "bold 24px 'Press Start 2P'" 
                          : "18px 'Press Start 2P'",
                    letterSpacing: 1,   // 1px tra i caratteri
                    lineSpacing: 1.5,   // 1.5 volte l'altezza di linea
                    align: "center",
                    baseline: "middle"
                }
            );
        }
    
        // Maschera a cuore
        if (state.maskProgress > 0) {
            drawHeartMask(elements.ctx, state.maskProgress);
        }
    
        // Fine gioco
        if (state.maskProgress >= 1 && !state.coverVideoPlayed) {
            console.log("Maschera completamente chiusa - Nascondi la scritta e il tasto 'Salta'");
    
            const desktopMessage = document.getElementById("desktopMessage");
            if (desktopMessage) {
                desktopMessage.style.display = "none";
            }
    
            if (elements.jumpButton) {
                elements.jumpButton.style.display = "none";
            }
    
            state.coverVideoPlayed = true;
            elements.coverVideo.style.display = "block";
            elements.coverVideo.style.opacity = "0";
            setTimeout(() => {
                elements.coverVideo.style.opacity = "1";
            }, 100);

            if (elements.coverVideo.readyState >= 3) {
                elements.coverVideo.play();
            }

            elements.coverVideo.onended = () => {
                elements.coverVideo.style.opacity = "0";
                setTimeout(() => {
                    elements.coverVideo.pause();
                    elements.coverVideo.currentTime = 0;
                    elements.coverVideo.style.display = "none";
                }, 2000);

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
    
    function handleDinaAnimation(timestamp) {
        if (!state.showDina) return;
    
        // FASE 1: Generazione fuori dallo schermo e ingresso progressivo
        if (!state.dinaEntryComplete) {
            gameObjects.dina.visible = true;
            gameObjects.dina.x = Math.max(gameObjects.dina.entryTargetX, gameObjects.dina.x - gameObjects.dina.entrySpeed);
            
            // Verifica se ha completato l'entrata
            if (gameObjects.dina.x <= gameObjects.dina.entryTargetX) {
                state.dinaEntryComplete = true;
                state.dinaPauseStartTime = timestamp;
                console.log("Dina completamente entrata nello schermo - pausa di 2 secondi");
            }
            return;
        }
    
        // FASE 2: Pausa di 2 secondi dopo l'entrata completa
        if (!state.dinaMovingToCenter && timestamp - state.dinaPauseStartTime < 2000) {
            return;
        }
    
        // FASE 3: Movimento verso il centro
        if (!state.dinaMovingToCenter) {
            state.dinaMovingToCenter = true;
            console.log("Inizio movimento verso il centro");
        }
    
        // Muovi DINO verso SINISTRA (al centro)
        if (gameObjects.dino.x < gameObjects.dino.finalTargetX) {
            gameObjects.dino.x += gameObjects.dino.moveSpeed;
        }
    
        // Muovi DINA verso DESTRA (al centro)
        if (gameObjects.dina.x > gameObjects.dina.finalTargetX) {
            gameObjects.dina.x -= gameObjects.dina.moveSpeed;
        }
    
        // Verifica se hanno raggiunto il centro
        const dinaReady = Math.abs(gameObjects.dina.x - gameObjects.dina.finalTargetX) < 1;
        const dinoReady = Math.abs(gameObjects.dino.x - gameObjects.dino.finalTargetX) < 1;
        
        if (dinaReady && dinoReady && !state.maskStartTime) {
            state.maskStartTime = timestamp;
            console.log("Centratura completata - inizio maschera a cuore");
        }
    }

    function gameLoop(timestamp) {
        // Modifica questa funzione così:
        if (!state.startTime) {
            state.startTime = timestamp;
        }

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
            }
        }
    }

    // =============================================
    // 9. INIZIALIZZAZIONE
    // =============================================
    function init() {
        // Inizializza canvas e risorse
        resizeCanvas();
        initResources();
        
        // Configura event listeners
        window.addEventListener("resize", resizeCanvas);
        document.addEventListener("keydown", handleJump);
        elements.jumpButton.addEventListener("click", handleJump);
        elements.jumpButton.addEventListener("touchstart", handleJump, { passive: true });
        
        // Configurazioni specifiche per piattaforma
        //if (!isMobileDevice()) {
        //    gameObjects.dino.width = scaleValue(180, true, true);
        //    gameObjects.dino.height = scaleValue(180, false, true);
        //}

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

        gameObjects.dino.x = gameObjects.dino.startX;
        gameObjects.dina.x = gameObjects.dina.startX;
        gameObjects.dina.visible = false;
    }

    // Avvia il gioco
    init();
});
