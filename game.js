document.addEventListener("DOMContentLoaded", () => {
    // =============================================
    // 1. CONFIGURAZIONI E COSTANTI
    // =============================================
    const CONFIG = {
        // Dimensioni di riferimento
        REFERENCE_WIDTH: 800,
        REFERENCE_HEIGHT: 400,
        MOBILE_BREAKPOINT: 768,
        INITIAL_PAIR_PROBABILITY: 0.1,
        TOTAL_IMAGES: 9,
        
        // Offset ostacoli
        OFFSET_CONFIG: {
            GRANCHIO: { yOffset: 0, mobileYOffset: 15 },
            CASTELLO: { yOffset: 0, mobileYOffset: 10 },
            PALM: { yOffset: 10, mobileYOffset: 5 },
            UMBRELLA: { yOffset: -20, mobileYOffset: -10 }
        },
    
        // Fisica ostacoli
        OBSTACLE_PHYSICS: {
            palm: {
                width: 144 * 1.2 * 0.9,
                graphicHeight: 144 * 1.2 * 0.9,
                collisionHeight: 50,
                hitboxWidthRatio: 0.4,
                offsetKey: "PALM",
                extraOffset: 0
            },
            umbrella: {
                width: 144 * 0.8,
                graphicHeight: 144 * 0.8,
                collisionHeight: 144 * 0.8 * 0.6,
                hitboxWidthRatio: 0.1,
                offsetKey: "UMBRELLA",
                extraOffset: 20
            }
        },
        
        // Gameplay
        get INITIAL_SCROLL_SPEED() { return isMobileDevice() ? 1 : 2; },
        MAX_PAIR_PROBABILITY: 0.5,
        INITIAL_OBSTACLE_INTERVAL: 2000,
        MIN_OBSTACLE_INTERVAL: 2000,
        
        // Animazioni
        MASK_PAUSE_DURATION: 2000,
        MASK_DURATION: 5000
    };

    // =============================================
    // 2. STATO DEL GIOCO
    // =============================================
    const state = {
        animationFrameId: null,
        fontsLoaded: false,
        imagesLoaded: 0,
        audioBuffersLoaded: false,
        currentText: "",
        gamePaused: true,
        gameEnded: false,
        popupState: 0,
        score: 0,
        scrollSpeed: CONFIG.INITIAL_SCROLL_SPEED,
        startTime: null,
        lastObstacleTime: 0,
        lastGranchioTime: 0,
        lastCastelloTime: 0,
        dinaEnterTime: null,
        dinoMoveTime: null,
        maskStartTime: null,
        maskPauseTime: null,
        maskComplete: false,
        isJumpButtonPressed: false,
        isGranchioNext: true,
        coverVideoPlayed: false,
        maskProgress: 0,
        pairProbability: CONFIG.INITIAL_PAIR_PROBABILITY,
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
        canvas: document.getElementById("gameCanvas"),
        ctx: null,
        jumpButton: document.getElementById("jumpButton"),
        coverVideo: createCoverVideo(),
        images: createGameImages(),
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
        prizeMessage: createPrizeMessage()
    };

    // =============================================
    // 4. OGGETTI DI GIOCO
    // =============================================
    const gameObjects = {
        dino: createDinoObject(),
        dina: null,
        gtr1: createGtrObject(),
        palms: [],
        granchio: createGranchioObject(),
        castello: createCastelloObject()
    };

    gameObjects.dina = createDinaObject();
    function alignDinaWithDino() {
        if (!gameObjects.dina) return;
        
        // Mantieni la posizione Y fissa indipendentemente da Dino
        const targetY = isMobileDevice() ? -70 * 0.8 : -70;
        
        // DEBUG
        console.log('Aligning Dina - Current Y:', gameObjects.dina.y, 'Target Y:', targetY);
        
        gameObjects.dina.y = targetY;
    }
    
    alignDinaWithDino();

    // =============================================
    // 5. FUNZIONI DI INIZIALIZZAZIONE
    // =============================================
    function createCoverVideo() {
        const video = document.createElement("video");
        video.src = "assets/cover.mp4";
        video.loop = false;
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
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
    }

    function createGameImages() {
        const images = {
            dino: new Image(),
            dina: new Image(),
            gtr1: new Image(),
            palm: new Image(),
            umbrella: new Image(),
            granchio: new Image(),
            castello: new Image(),
            sfondo: new Image()
        };
        
        Object.keys(images).forEach(key => {
            images[key].onload = checkAllImagesLoaded;
            images[key].onerror = () => console.error(`Error loading image: ${key}`);
        });
        
        return images;
    }

    function createPrizeMessage() {
        const container = document.createElement("div");
        const text = document.createElement("div");
        const button = document.createElement("a");
        
        container.className = "prize-message-container";
        container.appendChild(text);
        container.appendChild(button);
        document.body.appendChild(container);
        
        return { container, text, button };
    }

    function createDinoObject() {
        const dinoHeight = scaleValue(isMobileDevice() ? 180 : 150, false, { isDino: true });
        const groundOffset = isMobileDevice() ? scaleValue(20, false) : 0;
        const groundLevel = elements.canvas.height - dinoHeight - groundOffset;
    
        return {
            x: scaleValue(100),
            y: groundLevel, // Posizione iniziale a terra
            width: scaleValue(isMobileDevice() ? 180 : 150, true, { isDino: true }),
            height: dinoHeight,
            isJumping: false,
            jumpSpeed: isMobileDevice() ? -18 : -18,
            gravity: isMobileDevice() ? 0.55 : 0.55,
            startX: scaleValue(100),
            finalTargetX: elements.canvas.width/2 - scaleValue(150),
            moveSpeed: 2,
            groundLevel: groundLevel,
        };
    }

    function createDinaObject() {
        // 1. Prendiamo le dimensioni reali di Dino come riferimento
        const dinoHeight = gameObjects.dino?.height || scaleValue(150, false, { isDino: true });
        const dinoGroundLevel = gameObjects.dino?.groundLevel || 
                               (elements.canvas.height - dinoHeight - (isMobileDevice() ? scaleValue(20, false) : 0));
    
        // 2. Dimensioni di Dina (valori originali che funzionavano)
        const dinaHeight = scaleValue(isMobileDevice() ? 120 : 320, false, { isDina: true });
        const dinaWidth = scaleValue(isMobileDevice() ? 120 : 320, true, { isDina: true });
    
        // 3. Calcolo posizione Y - Versione corretta che funzionava
        const dinaY = dinoGroundLevel + dinoHeight - dinaHeight - scaleValue(10, false);
    
        console.log('Debug posizione Dina:', {
            canvasHeight: elements.canvas.height,
            dinoGroundLevel: dinoGroundLevel,
            dinoHeight: dinoHeight,
            dinaHeight: dinaHeight,
            calculatedY: dinaY
        });
    
        return {
            startX: elements.canvas.width + scaleValue(100),
            entryTargetX: elements.canvas.width - scaleValue(250),
            finalTargetX: elements.canvas.width/2 + scaleValue(50),
            width: dinaWidth,
            height: dinaHeight,
            entrySpeed: 5,
            moveSpeed: 3,
            x: elements.canvas.width + scaleValue(100),
            y: dinaY, // Posizione corretta già testata
            visible: false,
            state: "hidden"
        };
    }

    function createGtrObject() {
        return {
            offsetX: scaleValue(20),
            offsetY: scaleValue(20, false),
            width: scaleValue(isMobileDevice() ? 150 : 270, true, { isgtr1: true }),
            height: scaleValue(isMobileDevice() ? 150 : 270, false, { isgtr1: true }),
        };
    }

    function createGranchioObject() {
        return { 
            x: elements.canvas.width, 
            y: elements.canvas.height - getMobileObstacleOffset(),
            width: scaleValue(isMobileDevice() ? 200 : 200, true, { isgranchio: true }),
            height: scaleValue(isMobileDevice() ? 200 : 200, true, { isgranchio: true }),
            visible: false
        };
    }

    function createCastelloObject() {
        return { 
            x: elements.canvas.width, 
            y: elements.canvas.height - getMobileObstacleOffset(),
            width: scaleValue(isMobileDevice() ? 50 : 150, true, { isobstacle: true }),
            height: scaleValue(isMobileDevice() ? 50 : 150, true, { isobstacle: true }),
            visible: false 
        };
    }

    // =============================================
    // 6. FUNZIONI UTILITY
    // =============================================
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    }

    function scaleValue(value, isWidth = true, options = {}) {
        const { isDino = false, isObstacle = false } = options;
        const { isDina = false } = options;
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

    function ensureDinaPosition() {
        if (!gameObjects.dino || !gameObjects.dina) return;
        
        const expectedY = gameObjects.dino.groundLevel + gameObjects.dino.height - gameObjects.dina.height - scaleValue(10, false);
        
        if (Math.abs(gameObjects.dina.y - expectedY) > 5) {
            console.log('Correzione posizione Dina:', {
                vecchiaPosizione: gameObjects.dina.y,
                nuovaPosizione: expectedY,
                groundLevel: gameObjects.dino.groundLevel,
                dinoHeight: gameObjects.dino.height,
                dinaHeight: gameObjects.dina.height,
                offset: scaleValue(10, false)
            });
            gameObjects.dina.y = expectedY;
        }
    }

    function getMobileObstacleOffset() {
        return isMobileDevice() ? scaleValue(30, false) : 0;
    }

    function getVerticalOffset(elementKey) {
        const config = CONFIG.OFFSET_CONFIG[elementKey];
        if (!config) return 0;
        
        const baseOffset = scaleValue(config.yOffset, false);
        return isMobileDevice() ? baseOffset + scaleValue(config.mobileYOffset, false) : baseOffset;
    }

    function getObstacleInterval(scrollSpeed) {
        const interval = CONFIG.INITIAL_OBSTACLE_INTERVAL - (scrollSpeed - 5) * 60;
        return Math.max(interval, CONFIG.MIN_OBSTACLE_INTERVAL);
    }

    function getIntegerScale() {
        const targetRatio = CONFIG.REFERENCE_WIDTH / CONFIG.REFERENCE_HEIGHT;
        const maxWidth = Math.floor(window.innerWidth * 0.9);
        const maxHeight = Math.floor(window.innerHeight * 0.9);
        
        const scaleX = Math.floor(maxWidth / CONFIG.REFERENCE_WIDTH);
        const scaleY = Math.floor(maxHeight / CONFIG.REFERENCE_HEIGHT);
        const integerScale = Math.max(1, Math.min(scaleX, scaleY));
        
        return {
            width: CONFIG.REFERENCE_WIDTH * integerScale,
            height: CONFIG.REFERENCE_HEIGHT * integerScale
        };
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
            lineHeight: (isMobile ? config.mobile : config.desktop) * config.lineHeightMultiplier
        };
    }

    // =============================================
    // 7. GESTIONE RISORSE
    // =============================================
    function initResources() {
        loadFonts();
        loadImages();
        initAudioContext();
        if (!elements.audioSources.mare && elements.audioBuffers.mare) {
            startMareAudio(0.5);
        }
    }

    function loadFonts() {
        document.fonts.load('16px "Press Start 2P"').then(() => {
            state.fontsLoaded = true;
        }).catch(console.error);
    }

    function loadImages() {
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

        Object.keys(imgSources).forEach(key => {
            elements.images[key].src = imgSources[key];
        });
    }

    function checkAllImagesLoaded() {
        state.imagesLoaded++;
        if (state.imagesLoaded === CONFIG.TOTAL_IMAGES) {
            console.log("Tutte le immagini caricate");
            if (state.gamePaused) requestAnimationFrame(gameLoop);
        }
    }

    // =============================================
    // 8. GESTIONE AUDIO
    // =============================================
    function initAudioContext() {
        if (!elements.audioContext) {
            elements.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            document.addEventListener('click', resumeAudioContextOnce, { once: true });
        }
        loadAudioBuffers();
    }

    function resumeAudioContext() {
        if (elements.audioContext?.state === 'suspended') {
            elements.audioContext.resume().then(() => console.log("AudioContext riattivato"));
        }
    }

    function resumeAudioContextOnce() {
        resumeAudioContext();
        document.removeEventListener('click', resumeAudioContextOnce);
    }

    async function loadAudioBuffers() {
        try {
            const audioFiles = [
                { key: "mare", url: "assets/mare.mp3" },
                { key: "gtrs", url: "assets/gtrs.mp3" },
                { key: "keys", url: "assets/keys.mp3" },
                { key: "bass", url: "assets/bass.mp3" },
                { key: "drum", url: "assets/drum.mp3" }
            ];

            const buffers = await Promise.all(
                audioFiles.map(async ({ url }) => {
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    return elements.audioContext.decodeAudioData(arrayBuffer);
                })
            );

            audioFiles.forEach(({ key }, index) => {
                elements.audioBuffers[key] = buffers[index];
            });

            state.audioBuffersLoaded = true;
        } catch (error) {
            console.error("Audio loading failed:", error);
        }
    }

    function playAudioBuffer(buffer, volume = 0.75, loop = true) {
        if (!buffer) return null;
        
        const source = elements.audioContext.createBufferSource();
        const gainNode = elements.audioContext.createGain();
        
        source.buffer = buffer;
        source.loop = loop;
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(elements.audioContext.destination);
        source.start(0);
        
        return { source, gainNode };
    }

    function startMareAudio(volume = 0.7) {
        if (!elements.audioSources.mare && elements.audioBuffers.mare) {
            if (!elements.audioContext || elements.audioContext.state === 'suspended') {
                initAudioContext();
                elements.audioContext.resume().then(() => {
                    elements.audioSources.mare = playAudioBuffer(elements.audioBuffers.mare, volume, true);
                });
            } else {
                elements.audioSources.mare = playAudioBuffer(elements.audioBuffers.mare, volume, true);
            }
        } else if (elements.audioSources.mare) {
            elements.audioSources.mare.gainNode.gain.value = volume;
        }
    }

    function startAdditionalAudio() {
        if (!elements.audioSources.gtrs && elements.audioBuffers.gtrs) {
            elements.audioSources.gtrs = playAudioBuffer(elements.audioBuffers.gtrs, 0, true);
        }
        if (!elements.audioSources.keys && elements.audioBuffers.keys) {
            elements.audioSources.keys = playAudioBuffer(elements.audioBuffers.keys, 0, true);
        }
        if (!elements.audioSources.bass && elements.audioBuffers.bass) {
            elements.audioSources.bass = playAudioBuffer(elements.audioBuffers.bass, 0, true);
        }
        if (!elements.audioSources.drum && elements.audioBuffers.drum) {
            elements.audioSources.drum = playAudioBuffer(elements.audioBuffers.drum, 0, true);
        }
    }

    function fadeOutAudio(audio, duration) {
        if (!audio) return;
        
        const startVolume = audio.gainNode.gain.value;
        const startTime = elements.audioContext.currentTime;

        audio.gainNode.gain.setValueAtTime(startVolume, startTime);
        audio.gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    function updateAudioVolumes() {
        // Aggiorna i volumi in base al punteggio
        const score = state.score;
        
        // Audio mare (decresce da 0.75 a 0.075 tra score 0-10)
        if (elements.audioSources.mare) {
            elements.audioSources.mare.gainNode.gain.value = 
                score <= 10 ? 0.75 - (score * 0.0675) : 0.075;
        }
    
        // Audio gtrs (attivato da score 5, volume cresce fino a 1.0 a score 15)
        if (elements.audioSources.gtrs) {
            if (score >= 5 && score <= 15) {
                const volume = (score - 5) * 0.1;
                elements.audioSources.gtrs.gainNode.gain.value = volume;
            } else if (score < 5) {
                elements.audioSources.gtrs.gainNode.gain.value = 0;
            }
        }
    
        // Audio keys (attivato da score 15, volume cresce fino a 1.0 a score 25)
        if (elements.audioSources.keys) {
            if (score >= 15 && score <= 25) {
                const volume = (score - 15) * 0.1;
                elements.audioSources.keys.gainNode.gain.value = volume;
            } else if (score < 15) {
                elements.audioSources.keys.gainNode.gain.value = 0;
            }
        }
    
        // Audio bass (attivato da score 25, volume cresce fino a 1.0 a score 35)
        if (elements.audioSources.bass) {
            if (score >= 25 && score <= 35) {
                const volume = (score - 25) * 0.1;
                elements.audioSources.bass.gainNode.gain.value = volume;
            } else if (score < 25) {
                elements.audioSources.bass.gainNode.gain.value = 0;
            }
        }
    
        // Audio drum (attivato da score 35, volume cresce fino a 1.0 a score 45)
        if (elements.audioSources.drum) {
            if (score >= 35 && score <= 45) {
                const volume = (score - 35) * 0.1;
                elements.audioSources.drum.gainNode.gain.value = volume;
            } else if (score < 35) {
                elements.audioSources.drum.gainNode.gain.value = 0;
            }
        }
    }

    // =============================================
    // 9. GESTIONE DEL GIOCO
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

    function handleJump(event) {
        if ((event.type === "keydown" && event.code === "Space") || 
            event.type === "click" || 
            event.type === "touchstart") {
            event.preventDefault();
            
            if (state.jumpCooldown && performance.now() - state.jumpCooldown < 500) return;
            state.jumpCooldown = performance.now();
            initAudioContext();
            //if (!elements.audioContext) {
            //    initAudioContext();
            //} else if (elements.audioContext.state === 'suspended') {
            //    elements.audioContext.resume();
            //}
            
            if (state.gamePaused) {
                if (state.popupState === 0) {
                    // Primo click - attiva audio
                    startMareAudio(0.7);
                }
                
                if (state.popupState < messages.length - 1) {
                    state.popupState++;
                    draw();
                } else {
                    startGame();
                }
            } else if (!gameObjects.dino.isJumping) {
                gameObjects.dino.isJumping = true;
                gameObjects.dino.jumpSpeed = isMobileDevice() ? -12 : -18;
            }
        }
    }

    function startGame() {
        console.log("Avvio gioco");
        state.gamePaused = false;
        state.startTime = performance.now();
        
        // Avvia tutti gli audio (con volume iniziale a 0)
        startAdditionalAudio();
        
        // Imposta il volume iniziale del mare
        if (elements.audioSources.mare) {
            elements.audioSources.mare.gainNode.gain.value = 0.7;
        }
        
        // Forza il ridimensionamento
        resizeCanvas();
        
        // Avvia il game loop
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        const isMobile = isMobileDevice();
        const targetRatio = CONFIG.REFERENCE_WIDTH / CONFIG.REFERENCE_HEIGHT;
        
        // Calcola dimensioni massime disponibili
        const maxWidth = isMobile ? window.innerWidth : window.innerWidth * 0.9;
        const maxHeight = isMobile ? window.innerHeight : window.innerHeight * 0.9;
        
        // Calcola dimensioni mantenendo l'aspect ratio
        let canvasWidth = maxWidth;
        let canvasHeight = canvasWidth / targetRatio;
    
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * targetRatio;
        }
    
        // Imposta dimensioni REALI del canvas
        elements.canvas.width = canvasWidth;
        elements.canvas.height = canvasHeight;
        
        // Imposta dimensioni VISUALIZZATE (CSS)
        elements.canvas.style.width = `${canvasWidth}px`;
        elements.canvas.style.height = `${canvasHeight}px`;
        
        // Centra il canvas
        elements.canvas.style.position = 'absolute';
        elements.canvas.style.left = '50%';
        elements.canvas.style.top = '50%';
        elements.canvas.style.transform = 'translate(-50%, -50%)';
        
        // Aggiorna le posizioni degli elementi di gioco
        refreshAllSizes();
        setTimeout(() => {
            ensureDinaPosition();
            console.log('Ricalcolo posizione Dina dopo resize');
        }, 0);
    
    }

    function refreshAllSizes() {
        gameObjects.dino.width = scaleValue(100, true, { isDino: true });
        gameObjects.dino.height = scaleValue(100, false, { isDino: true });
        gameObjects.granchio.width = scaleValue(200, true, { isObstacle: true });
        gameObjects.granchio.height = scaleValue(200, false, { isObstacle: true });
        alignDinaWithDino();
    }

    // =============================================
    // 10. GESTIONE OSTACOLI
    // =============================================
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

    // =============================================
    // 11. RENDERING
    // =============================================
    function drawImage(ctx, img, x, y, width, height) {
        ctx.drawImage(
            img, 
            Math.round(x), 
            Math.round(y), 
            Math.round(width), 
            Math.round(height)
        );
    }

    function drawPixelText(ctx, text, x, y, type, options = {}) {
        const sizes = {
            title: { desktop: 24, mobile: 12, lineHeight: 1.2 },
            default: { desktop: 18, mobile: 10, lineHeight: 1.3 }
        };
    
        const config = sizes[type] || sizes.default;
        const fontSize = isMobileDevice() ? config.mobile : config.desktop;
        
        ctx.save();
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = options.color || "white";
        ctx.textAlign = options.align || "center";
        ctx.textBaseline = options.baseline || "middle";
        
        const adjustedX = isMobileDevice() ? x * 0.8 : x;
        const adjustedY = isMobileDevice() ? y * 1.2 : y;
        
        ctx.fillText(text, adjustedX, adjustedY);
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

    function drawGameElements() {
        // 1. Sfondo
        elements.ctx.save();
        elements.ctx.drawImage(
            elements.images.sfondo, 
            0, 0, elements.images.sfondo.width, elements.images.sfondo.height, 
            0, 0, elements.canvas.width, elements.canvas.height
        );
        elements.ctx.restore();

        // 2. Ostacoli
        gameObjects.palms.forEach((obstacle) => {
            const img = obstacle.type === "palm" ? elements.images.palm : elements.images.umbrella;
            drawImage(elements.ctx, img, obstacle.x, obstacle.y, obstacle.width, obstacle.graphicHeight);
        });

        // 3. Granchio
        if (gameObjects.granchio.visible) {
            drawImage(elements.ctx, elements.images.granchio, 
                     gameObjects.granchio.x, gameObjects.granchio.y, 
                     gameObjects.granchio.width, gameObjects.granchio.height);
        }

        // 4. Castello
        if (gameObjects.castello.visible) {
            drawImage(elements.ctx, elements.images.castello, 
                     gameObjects.castello.x, gameObjects.castello.y, 
                     gameObjects.castello.width, gameObjects.castello.height);
        }
        
        // 5. Dino
        drawImage(elements.ctx, elements.images.dino, 
            gameObjects.dino.x, gameObjects.dino.y, 
            gameObjects.dino.width, gameObjects.dino.height);

        // 6. Dina e gtr1 (solo se visibile e non nello stato hidden)
        if (gameObjects.dina.visible && gameObjects.dina.state !== "hidden") {
            drawImage(elements.ctx, elements.images.dina, 
                gameObjects.dina.x, gameObjects.dina.y,
                gameObjects.dina.width, gameObjects.dina.height);
            drawImage(elements.ctx, elements.images.gtr1,
                gameObjects.dina.x + gameObjects.gtr1.offsetX,
                gameObjects.dina.y + gameObjects.gtr1.offsetY,
                gameObjects.gtr1.width, gameObjects.gtr1.height);
        }    

        // 7. Punteggio (solo se il gioco non è finito)
        if (!state.gameEnded) {
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
        }

        // 8. Messaggi iniziali
        if(state.gamePaused && state.popupState < messages.length) {
            const currentMsg = messages[state.popupState];
            drawPixelText(elements.ctx, currentMsg.text, 
                         elements.canvas.width/2, currentMsg.y, 
                         currentMsg.type, { color: currentMsg.color });
        }
    }

    function draw() {
        elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        drawGameElements();
//        if (!elements.ctx) {
//            elements.ctx = elements.canvas.getContext('2d');
//            if (!elements.ctx) return;
//        }

        // Messaggi iniziali
        if(state.gamePaused && state.popupState < messages.length) {
            const currentMsg = messages[state.popupState];
            const { size, lineHeight } = getResponsiveTextSizes(currentMsg.type);
            const maxWidth = elements.canvas.width * 0.8;
            const x = elements.canvas.width / 2;
            let y = elements.canvas.height / 3;
        
            // Sfondo semitrasparente
            elements.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            elements.ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);

            // Testo
            elements.ctx.font = `bold ${size}px 'Press Start 2P'`;
            elements.ctx.fillStyle = currentMsg.color || "white";
            elements.ctx.textAlign = "center";
        
            // Divide il testo in righe
            const words = currentMsg.text.split(' ');
            let line = '';
        
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = elements.ctx.measureText(testLine);
                if (metrics.width > maxWidth && i > 0) {
                    elements.ctx.fillText(line.trim(), x, y);
                    y += lineHeight;
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            elements.ctx.fillText(line.trim(), x, y);
        
            // Istruzioni per continuare
            const continueY = isMobileDevice() 
            ? elements.canvas.height * 0.75  // Sposta più in basso su mobile
            : elements.canvas.height * 0.75;
            const continueText = isMobileDevice() ? "TOCCA PER CONTINUARE" : "PREMI SPAZIO PER CONTINUARE";
            
            elements.ctx.fillText(continueText, x, continueY);
        }

        if (state.maskStartTime && !state.maskComplete) {
            const elapsed = performance.now() - state.maskStartTime;
            state.maskProgress = Math.min(elapsed / CONFIG.MASK_DURATION, 1);
            drawHeartMask(elements.ctx, state.maskProgress);
            
            if (state.maskProgress >= 1) {
                state.maskComplete = true;
            }
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
            showEndGameVideo();
        }
    }

    function showEndGameVideo() {
        state.coverVideoPlayed = true;

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
        elements.coverVideo.load();
        
        setTimeout(() => {
            elements.coverVideo.style.opacity = "1";
            elements.coverVideo.play().catch(error => {
                console.log("Errore riproduzione video:", error);
                elements.coverVideo.muted = true;
                elements.coverVideo.play().catch(e => console.log("Errore anche con muted:", e));
            });
        }, 100);

        elements.prizeMessage.container.style.display = "flex";
        elements.coverVideo.onended = handleVideoEnded;
    }

    function handleVideoEnded() {
        elements.coverVideo.style.opacity = "0";
        setTimeout(() => {
            elements.coverVideo.pause();
            elements.coverVideo.currentTime = 0;
            elements.coverVideo.style.display = "none";
        }, 1000);
    
        if (elements.audioSources.mare) {
            fadeOutAudio(elements.audioSources.mare, 1);
        }
        if (elements.audioSources.gtrs) fadeOutAudio(elements.audioSources.gtrs, 1);
        if (elements.audioSources.keys) fadeOutAudio(elements.audioSources.keys, 1);
        if (elements.audioSources.bass) fadeOutAudio(elements.audioSources.bass, 1);
        if (elements.audioSources.drum) fadeOutAudio(elements.audioSources.drum, 1);
    }

    // =============================================
    // 12. LOGICA DI GIOCO
    // =============================================
    function update(timestamp) {
        if (!state.startTime) state.startTime = timestamp;

        // Solo se il gioco non è finito, aumenta la velocità
        if (!state.gameEnded) {
            state.scrollSpeed += isMobileDevice() ? 0.0001 : 0.001;
        }

        // Scorciatoia debug
        if (state.aKeyPressed && (timestamp - state.aKeyPressStartTime) >= 2000) {
            state.score = 49;
            state.aKeyPressed = false;
        }

        if (state.score >= 5 && state.audioBuffersLoaded && !elements.audioSources.gtrs) {
            startAdditionalAudio();
        }

        // Aggiorna audio
        updateAudioVolumes();

        // Punteggio 50
        if (state.score >= 50 && !state.gameEnded) {
            state.gameEnded = true;
            state.showDina = true;
            alignDinaWithDino();

            // Impedisci la generazione di nuovi ostacoli
            state.lastObstacleTime = Infinity;
                      
            // Avvia l'animazione di Dina dopo un breve ritardo
            gameObjects.dina.visible = true;
            gameObjects.dina.state = "entering";
            gameObjects.dina.x = elements.canvas.width + scaleValue(100);

            gameObjects.palms.forEach(obstacle => obstacle.hit = true);
            gameObjects.granchio.visible = false;
            gameObjects.castello.visible = false;
        }

        // Animazione finale
        if (state.gameEnded) {
            // Gestisci qui TUTTO il movimento finale
            if (gameObjects.dina.state === "movingToCenter") {
                // Muovi Dino verso il centro (con velocità proporzionale alla distanza)
                gameObjects.dino.x = Math.min(
                    gameObjects.dino.x + gameObjects.dino.moveSpeed * 1.5, // Aumenta la velocità
                    gameObjects.dino.finalTargetX
                );
        
                // Muovi Dina verso il centro
                gameObjects.dina.x = Math.max(
                    gameObjects.dina.x - gameObjects.dina.moveSpeed * 1.5,
                    gameObjects.dina.finalTargetX
                );
        
                // Avvia la maschera SOLO quando entrambi sono centrati
                if (Math.abs(gameObjects.dino.x - gameObjects.dino.finalTargetX) < 2 &&
                    Math.abs(gameObjects.dina.x - gameObjects.dina.finalTargetX) < 2) {
                    gameObjects.dina.state = "centered";
                    state.maskStartTime = performance.now(); // Unico punto di attivazione!
                    console.log("Dino e Dina centrati - maschera avviata");
                }
            }
        }

        // Aggiorna maschera
        if (state.gameEnded && gameObjects.dina.state === "centered" && !state.maskStartTime) {
            state.maskStartTime = performance.now();
            console.log("Maschera avviata a:", state.maskStartTime);
            // Blocca tutti gli ostacoli
            gameObjects.palms = [];
            gameObjects.granchio.visible = false;
            gameObjects.castello.visible = false;
        }

        // Aumenta velocità
        state.scrollSpeed += 0.001;

        // Movimento dino
        updateDinoMovement();

        // Movimento ostacoli
        updateObstacles(timestamp);

        // Genera nuovi ostacoli
        generateNewObstacles(timestamp);

        // Animazione Dina
        updateDinaAnimation(timestamp);
    }

    function updateFinalAnimation() {
        if (!state.gameEnded) return;
    
        // Muovi Dino verso il centro
        if (gameObjects.dino.x < gameObjects.dino.finalTargetX) {
            gameObjects.dino.x += gameObjects.dino.moveSpeed;
        }
    
        // Muovi Dina verso il centro
        if (gameObjects.dina.state === "movingToCenter" && 
            gameObjects.dina.x > gameObjects.dina.finalTargetX) {
            gameObjects.dina.x -= gameObjects.dina.moveSpeed;
        }
    
        // Quando entrambi sono centrati, avvia la maschera
        if (Math.abs(gameObjects.dino.x - gameObjects.dino.finalTargetX) < 2 &&
            Math.abs(gameObjects.dina.x - gameObjects.dina.finalTargetX) < 2 &&
            !state.maskStartTime) {
            state.maskStartTime = performance.now();
            gameObjects.dina.state = "centered";
        }
    }

    function updateMaskAnimation(timestamp) {
        // Se la maschera è già completa, non fare nulla
        if (state.maskProgress >= 1) return;
        state.maskComplete = true;
        // Calcola il tempo trascorso
        const elapsedTime = timestamp - state.maskStartTime;
    
        // Gestione delle fasi dell'animazione
        if (state.maskPauseTime) {
            // Siamo in fase di pausa
            if (elapsedTime < state.maskPauseTime + CONFIG.MASK_PAUSE_DURATION) {
                return; // Mantieni la pausa
            }
            // Calcola il progresso dopo la pausa
            state.maskProgress = Math.min(
                (elapsedTime - CONFIG.MASK_PAUSE_DURATION) / 
                (CONFIG.MASK_DURATION - CONFIG.MASK_PAUSE_DURATION), 
                1
            );
        } else {
            // Fase attiva dell'animazione
            state.maskProgress = Math.min(elapsedTime / (CONFIG.MASK_DURATION * 0.5), 1);
            
            // Attiva la pausa quando raggiunge il 50%
            if (state.maskProgress >= 0.5 && !state.maskPauseTime) {
                state.maskPauseTime = timestamp;
            }
        }
    
        // Completa l'animazione
        if (state.maskProgress >= 1) {
            // Ferma solo gli altri audio, non il mare
            if (elements.audioSources.gtrs) fadeOutAudio(elements.audioSources.gtrs, 1);
            if (elements.audioSources.keys) fadeOutAudio(elements.audioSources.keys, 1);
            if (elements.audioSources.bass) fadeOutAudio(elements.audioSources.bass, 1);
            if (elements.audioSources.drum) fadeOutAudio(elements.audioSources.drum, 1);
        }
    }

    function updateDinoMovement() {
        if (gameObjects.dino.isJumping) {
            gameObjects.dino.y += gameObjects.dino.jumpSpeed;
            gameObjects.dino.jumpSpeed += gameObjects.dino.gravity;
            
            // Usa groundLevel memorizzato invece di ricalcolarlo
            if (gameObjects.dino.y >= gameObjects.dino.groundLevel) {
                gameObjects.dino.y = gameObjects.dino.groundLevel;
                gameObjects.dino.isJumping = false;
            }
        } else {
            // Mantiene il dinosauro a terra quando non sta saltando
            gameObjects.dino.y = gameObjects.dino.groundLevel;
        }
    }

    function updateObstacles(timestamp) {
        // Gli ostacoli si muovono sempre, anche dopo la fine del gioco
        gameObjects.palms.forEach((obstacle) => {
            obstacle.x -= state.scrollSpeed;
            
            // Solo controllo collisioni se il gioco non è finito
            if (!state.gameEnded) {
                const physics = CONFIG.OBSTACLE_PHYSICS[obstacle.type];
                const hitboxWidth = obstacle.width * physics.hitboxWidthRatio;
                const hitboxX = obstacle.x + (obstacle.width - hitboxWidth)/2;
                const hitboxTop = obstacle.y + obstacle.graphicHeight - physics.collisionHeight;
                
                const dinoLeft = gameObjects.dino.x + gameObjects.dino.width * 0.2;
                const dinoRight = gameObjects.dino.x + gameObjects.dino.width * 0.8;
                const dinoBottom = gameObjects.dino.y + gameObjects.dino.height;
    
                if (dinoRight > hitboxX && 
                    dinoLeft < hitboxX + hitboxWidth &&
                    dinoBottom > hitboxTop && 
                    !obstacle.hit) {
                    obstacle.hit = true;
                    state.score -= 1;
                }
                
                if (!obstacle.passed && obstacle.x + obstacle.width < gameObjects.dino.x) {
                    obstacle.passed = true;
                    if (!obstacle.hit) state.score += 1;
                }
            }
        });
    
        // Rimuovi ostacoli usciti dallo schermo
        gameObjects.palms = gameObjects.palms.filter(obstacle => 
            obstacle.x + obstacle.width > -50
        );
    
        // Movimento granchio e castello (continua anche dopo la fine del gioco)
        if (gameObjects.granchio.visible) {
            gameObjects.granchio.x -= state.scrollSpeed;
            if (gameObjects.granchio.x + gameObjects.granchio.width < 0) {
                gameObjects.granchio.visible = false;
            }
        }
    
        if (gameObjects.castello.visible) {
            gameObjects.castello.x -= state.scrollSpeed;
            if (gameObjects.castello.x + gameObjects.castello.width < 0) {
                gameObjects.castello.visible = false;
            }
        }
    }

    //function updateSpecialObstacles(timestamp) {
    //    if (gameObjects.granchio.visible) {
    //        gameObjects.granchio.x -= state.scrollSpeed;
    //        if (gameObjects.granchio.x + gameObjects.granchio.width < 0) {
    //            gameObjects.granchio.visible = false;
    //            state.lastGranchioTime = timestamp;
    //        }
    //    }

    //    if (gameObjects.castello.visible) {
    //        gameObjects.castello.x -= state.scrollSpeed;
    //        if (gameObjects.castello.x + gameObjects.castello.width < 0) {
    //            gameObjects.castello.visible = false;
    //            state.lastCastelloTime = timestamp;
    //        }
    //    }
    //}

    function generateNewObstacles(timestamp) {
        if (!state.gameEnded && timestamp - state.lastObstacleTime > getObstacleInterval(state.scrollSpeed)) {
            if (Math.random() < state.pairProbability) {
                gameObjects.palms.push(...createPairOfObstacles());
            } else {
                gameObjects.palms.push(createNewPalm());
            }
            state.lastObstacleTime = timestamp;
            
            state.pairProbability = Math.min(
                CONFIG.MAX_PAIR_PROBABILITY, 
                state.pairProbability + 0.02
            );
        }

        // Genera granchi e castelli
        if (!state.gameEnded && timestamp - state.startTime > 5000) {
            if (state.isGranchioNext && !gameObjects.granchio.visible && !gameObjects.castello.visible && 
                timestamp - state.lastGranchioTime > 6000) {
                spawnGranchio();
            } else if (!state.isGranchioNext && !gameObjects.castello.visible && !gameObjects.granchio.visible && 
                       timestamp - state.lastCastelloTime > 6000) {
                spawnCastello();
            }
        }
    }

    function spawnGranchio() {
        gameObjects.granchio.x = elements.canvas.width;
        gameObjects.granchio.y = elements.canvas.height - gameObjects.granchio.height - scaleValue(50, false) + getMobileObstacleOffset();
        gameObjects.granchio.visible = true;
        state.isGranchioNext = false;
        state.lastGranchioTime = performance.now();
    }

    function spawnCastello() {
        gameObjects.castello.x = elements.canvas.width;
        gameObjects.castello.y = elements.canvas.height - gameObjects.castello.height - scaleValue(50, false) + getMobileObstacleOffset();
        gameObjects.castello.visible = true;
        state.isGranchioNext = true;
        state.lastCastelloTime = performance.now();
    }

    function updateDinaAnimation(timestamp) {
        if (!state.showDina || state.dinaAlreadySpawned) return;
        
        // Imposta il flag per evitare generazioni multiple
        state.dinaAlreadySpawned = true;
    
        switch (gameObjects.dina.state) {
            case "hidden":
                gameObjects.dina.visible = true;
                gameObjects.dina.x = elements.canvas.width + scaleValue(100);
                gameObjects.dina.state = "entering";
                break;
    
            case "entering":
                gameObjects.dina.x -= gameObjects.dina.entrySpeed;
                
                if (gameObjects.dina.x <= gameObjects.dina.entryTargetX) {
                    gameObjects.dina.state = "pausing";
                    state.dinaPauseTime = timestamp;
                }
                break;
    
            case "pausing":
                // Pausa di 1 secondo prima di muoversi al centro
                if (timestamp - state.dinaPauseTime > 1000) {
                    gameObjects.dina.state = "movingToCenter";
                }
                break;
    
            case "movingToCenter":
                // Muovi Dina verso la posizione finale
                gameObjects.dina.x = Math.max(
                    gameObjects.dina.x - gameObjects.dina.moveSpeed,
                    gameObjects.dina.finalTargetX
                );
                
                // Muovi anche Dino verso il centro
                gameObjects.dino.x = Math.min(
                    gameObjects.dino.x + gameObjects.dino.moveSpeed,
                    gameObjects.dino.finalTargetX
                );
                
                // Quando sono entrambi centrati, avvia la maschera
                if (Math.abs(gameObjects.dino.x - gameObjects.dino.finalTargetX) < 2 &&
                    Math.abs(gameObjects.dina.x - gameObjects.dina.finalTargetX) < 2 &&
                    !state.maskStartTime) {
                    state.maskStartTime = timestamp;
                    gameObjects.dina.state = "centered";
                }
                break;
        }
    }

    function setupPrizeMessage() {
        const isMobile = isMobileDevice();
        
        elements.prizeMessage.container.className = "prize-message-container";
        elements.prizeMessage.text.className = "popup-text";
        elements.prizeMessage.button.className = "prize-button";
        
        // Configurazione del pulsante
        elements.prizeMessage.button.textContent = "E ora?";
        elements.prizeMessage.button.href = "https://distrokid.com/hyperfollow/inox209/offline";
        elements.prizeMessage.button.target = "_blank";
        
        // Nascondi inizialmente il container
        elements.prizeMessage.container.style.display = "none";
        
        // Aggiungi stili CSS per posizionarlo correttamente
        elements.prizeMessage.container.style.position = "fixed";
        elements.prizeMessage.container.style.bottom = "20px";
        elements.prizeMessage.container.style.left = "50%";
        elements.prizeMessage.container.style.transform = "translateX(-50%)";
        elements.prizeMessage.container.style.zIndex = "1000";
        elements.prizeMessage.container.style.flexDirection = "column";
        elements.prizeMessage.container.style.alignItems = "center";
        elements.prizeMessage.container.style.gap = "20px";
        
        // Stili per il pulsante
        elements.prizeMessage.button.style.padding = "10px 20px";
        elements.prizeMessage.button.style.borderRadius = "5px";
        elements.prizeMessage.button.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        elements.prizeMessage.button.style.color = "#00ffff";
        elements.prizeMessage.button.style.border = "2px solid #00ffff";
        elements.prizeMessage.button.style.fontFamily = "'Press Start 2P', cursive";
        elements.prizeMessage.button.style.fontSize = isMobile ? "12px" : "14px";
        elements.prizeMessage.button.style.textDecoration = "none";
        elements.prizeMessage.button.style.transition = "all 0.3s";
        
        // Aggiungi gli elementi al container
        elements.prizeMessage.container.appendChild(elements.prizeMessage.text);
        elements.prizeMessage.container.appendChild(elements.prizeMessage.button);
        document.body.appendChild(elements.prizeMessage.container);
        
        // Gestione eventi del pulsante
        elements.prizeMessage.button.addEventListener("mouseenter", () => {
            elements.prizeMessage.button.style.backgroundColor = "#00ffff";
            elements.prizeMessage.button.style.color = "black";
        });
        
        elements.prizeMessage.button.addEventListener("mouseleave", () => {
            elements.prizeMessage.button.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            elements.prizeMessage.button.style.color = "#00ffff";
        });
    }

    // =============================================
    // 13. ANIMAZIONI FINALI
    // =============================================
    function startFinalAnimation() {
        if (state.finalAnimationStarted) return;
        state.finalAnimationStarted = true;
    
        gameObjects.dina.visible = true;
        gameObjects.dina.x = elements.canvas.width - scaleValue(150); 
    
        setTimeout(() => {
            state.startMovingToCenter = true;
        }, 2000);
    }

    function handleFinalAnimation(timestamp) {
        if (!state.gameEnded) return;
    
        // Fase 1: Dina entra nello schermo
        if (gameObjects.dina.state === "entering") {
            gameObjects.dina.x -= gameObjects.dina.entrySpeed;
            
            if (gameObjects.dina.x <= gameObjects.dina.entryTargetX) {
                gameObjects.dina.state = "waiting";
                state.dinaWaitTime = timestamp;
            }
        }
        
        // Fase 2: Breve pausa
        else if (gameObjects.dina.state === "waiting" && 
                 timestamp - state.dinaWaitTime > 1000) {
            gameObjects.dina.state = "movingToCenter";
        }
        
        // Fase 3: Muovi entrambi al centro
        else if (gameObjects.dina.state === "movingToCenter") {
            // Muovi Dino verso il centro
            if (gameObjects.dino.x < gameObjects.dino.finalTargetX) {
                gameObjects.dino.x += gameObjects.dino.moveSpeed;
            }
            
            // Muovi Dina verso il centro
            if (gameObjects.dina.x > gameObjects.dina.finalTargetX) {
                gameObjects.dina.x -= gameObjects.dina.moveSpeed;
            }
            
            // Quando sono centrati, avvia la maschera
            if (Math.abs(gameObjects.dino.x - gameObjects.dino.finalTargetX) < 2 &&
                Math.abs(gameObjects.dina.x - gameObjects.dina.finalTargetX) < 2 &&
                !state.maskStartTime) {
                state.maskStartTime = timestamp;
                gameObjects.dina.state = "centered";
            }
        }
    }

    // =============================================
    // 14. GAME LOOP
    // =============================================
    function gameLoop(timestamp) {
        if (!state.startTime) state.startTime = timestamp;
        
        update(timestamp);
        handleFinalAnimation(timestamp);
        draw();
        updateObstacles(timestamp);
        updateDinaAnimation(timestamp);
        ensureDinaPosition();

        if (!state.gamePaused) {
            state.animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    // =============================================
    // 15. INIZIALIZZAZIONE
    // =============================================
    function init() {
        setupCanvas();
        setupMobile();
        setupEventListeners();
        setupVideo();
        setupPrizeMessage();
        initResources();
        initGamePositions();
        state.animationFrameId = requestAnimationFrame(gameLoop);     
    }

    function initGamePositions() {
        // Prima ridimensiona il canvas
        resizeCanvas();
        
        // Calcola le posizioni basate sulle nuove dimensioni
        const canvasCenterX = elements.canvas.width / 2;
        
        // Imposta dinosauro
        gameObjects.dino.x = scaleValue(100);
        gameObjects.dino.finalTargetX = canvasCenterX - scaleValue(150);
        
        // Ricalcola groundLevel dopo il resize
        const dinoHeight = scaleValue(isMobileDevice() ? 180 : 150, false, { isDino: true });
        const groundOffset = isMobileDevice() ? scaleValue(20, false) : 0;
        gameObjects.dino.groundLevel = elements.canvas.height - dinoHeight - groundOffset;
        gameObjects.dino.y = gameObjects.dino.groundLevel;
        
        // Imposta Dina
        gameObjects.dina.startX = elements.canvas.width + scaleValue(100);
        gameObjects.dina.entryTargetX = elements.canvas.width - scaleValue(250);
        gameObjects.dina.finalTargetX = canvasCenterX + scaleValue(50);
        alignDinaWithDino();
        gameObjects.dina.y = isMobileDevice() ? -70 * 0.8 : -70;
        console.log('Initial Dina position:', gameObjects.dina.y);
    }

    function setupCanvas() {
        elements.ctx = elements.canvas.getContext('2d');
        if (!elements.ctx) {
            alert("Errore: Impossibile inizializzare il contesto del canvas");
            return;
        }

        // Configurazione anti-aliasing
        elements.canvas.style.imageRendering = 'pixelated';
        elements.canvas.style.imageRendering = 'crisp-edges';
        elements.ctx.imageSmoothingEnabled = false;
        
        const dpr = window.devicePixelRatio || 1;
        elements.canvas.width = Math.floor(elements.canvas.clientWidth * dpr);
        elements.canvas.height = Math.floor(elements.canvas.clientHeight * dpr);
        elements.ctx.scale(dpr, dpr);
    }

    function setupMobile() {
        if (isMobileDevice()) {
            elements.jumpButton.style.display = 'block';
            document.head.insertAdjacentHTML('beforeend', `
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
            `);
            
            setTimeout(() => {
                resizeCanvas();
                window.scrollTo(0, 0);
            }, 100);
            
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    resizeCanvas();
                    draw();
                }, 100);
            });
        }
    }

    function setupEventListeners() {
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
    }

    function setupVideo() {
        elements.coverVideo.addEventListener('loadedmetadata', function() {
            if (isMobileDevice()) {
                const videoRatio = this.videoWidth / this.videoHeight;
                const mobileWidth = Math.min(window.innerWidth * 0.95, elements.canvas.width);
                const mobileHeight = mobileWidth / videoRatio;
                
                this.style.width = `${mobileWidth}px`;
                this.style.height = `${mobileHeight}px`;
            }
        });

        if (isMobileDevice()) {
            setTimeout(() => {
                elements.coverVideo.dispatchEvent(new Event('loadedmetadata'));
            }, 500);
        }
    }

    function startGame() {
        console.log("Avvio gioco");
        state.gamePaused = false;
        state.startTime = performance.now();
        state.maskStartTime = null;
        state.maskPauseTime = null;
        state.maskProgress = 0;
        state.maskComplete = false;
        
        // Ripristina il volume audio
        resumeAllAudio();
        
        // Forza il ridimensionamento
        resizeCanvas();
        
        // Avvia il game loop
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = requestAnimationFrame(gameLoop);
    }

    function resumeAllAudio() {
        // Riprendi l'audio context se sospeso
        if (elements.audioContext && elements.audioContext.state === 'suspended') {
            elements.audioContext.resume().then(() => {
                console.log("AudioContext riattivato");
            });
        }
        
        // Ripristina i volumi
        if (elements.audioSources.mare) {
            elements.audioSources.mare.gainNode.gain.value = 0.7;
        }
        if (elements.audioSources.gtrs) {
            elements.audioSources.gtrs.gainNode.gain.value = 0;
        }
        if (elements.audioSources.keys) {
            elements.audioSources.keys.gainNode.gain.value = 0;
        }
        if (elements.audioSources.bass) {
            elements.audioSources.bass.gainNode.gain.value = 0;
        }
        if (elements.audioSources.drum) {
            elements.audioSources.drum.gainNode.gain.value = 0;
        }
    }

    // Avvia il gioco
    init();
});
