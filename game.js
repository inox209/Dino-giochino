document.addEventListener("DOMContentLoaded", () => {
    // =============================================
    // 1. COSTANTI DI CONFIGURAZIONE BASE
    // =============================================
    const referenceWidth = 800;
    const referenceHeight = 400;
    const mobileBreakpoint = 768;
    const totalImages = 9;
    const umbrellaYOffset = -20;
    const palmYOffset = 25;
    const maxPairProbability = 0.5;
    const OFFSET_CONFIG = {
    PALM: { 
        yOffset: -10, 
        mobileYOffset: -5 
    },
    UMBRELLA: { 
        yOffset: -20, 
        mobileYOffset: -10 
    },
    GRANCHIO: { 
        yOffset: 0, 
        mobileYOffset: 15 
    },
    CASTELLO: { 
        yOffset: 0, 
        mobileYOffset: 10 
    }
    };
    function getVerticalOffset(elementKey) {
        const config = OFFSET_CONFIG[elementKey];
        if (!config) return 0;
        
        const baseOffset = scaleValue(config.yOffset, false);
        
        if (isMobileDevice()) {
            return baseOffset + scaleValue(config.mobileYOffset, false);
        }
        
        return baseOffset;
    }

    // =============================================
    // 2. INIZIALIZZAZIONE ELEMENTI DOM
    // =============================================
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const jumpButton = document.getElementById("jumpButton");
    // Elemento video per la copertina
    const coverVideo = document.createElement("video");
    coverVideo.src = "assets/cover.mp4";
    coverVideo.loop = false;
    coverVideo.muted = true;
    coverVideo.style.position = "absolute";
    coverVideo.style.display = "none";
    coverVideo.style.opacity = "0";
    coverVideo.style.transition = "opacity 2s";
    document.body.appendChild(coverVideo);
    //coverVideo.playsInline = true;
    //coverVideo.setAttribute('playsinline', '');
    //coverVideo.setAttribute('webkit-playsinline', ''); 
    //coverVideo.style.left = "50%";
    //coverVideo.style.top = "50%";
    //coverVideo.style.transform = "translate(-50%, -50%)";
    // Caricamento immagini
    const dinoImg = new Image();
    dinoImg.src = "assets/dino.png";
    const dinaImg = new Image();
    dinaImg.src = "assets/dina.png";
    const gtr1Img = new Image();
    gtr1Img.src = "assets/gtr1.png";
    const gtr3Img = new Image();
    gtr3Img.src = "assets/gtr3.png";
    const palmImg = new Image();
    palmImg.src = "assets/palm.png";
    const umbrellaImg = new Image();
    umbrellaImg.src = "assets/ombrellone.png";
    const granchioImg = new Image();
    granchioImg.src = "assets/granchio.png";
    const castelloImg = new Image();
    castelloImg.src = "assets/castello.png";
    const sfondoImg = new Image();
    sfondoImg.src = "assets/sfondo.png";
    // Caricamenro audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let mareBuffer, gtrsBuffer, keysBuffer, bassBuffer, drumBuffer;
    let mareAudio, gtrsAudio, keysAudio, bassAudio, drumAudio;

    // =============================================
    // 3. FUNZIONI UTILITY
    // =============================================
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= mobileBreakpoint;
    }

    function scaleValue(value, isWidth = true, options = {}) {
    const { isDino = false, isObstacle = false } = options;
    const scaleFactor = isWidth ? canvas.width / referenceWidth : canvas.height / referenceHeight;

    // Regole MOBILE
    if (isMobileDevice()) {
        if (isDino) return value * scaleFactor * 0.8;    // Dino: 20% più piccolo
        if (isObstacle) return value * scaleFactor * 0.4; // Ostacoli: 40% più piccoli
        return value * scaleFactor;
    }
    // Regole DESKTOP
    else {
        if (isDino) return value * scaleFactor * 0.2;          // Dino: dimensione normale
        if (isObstacle) return value * scaleFactor * 0.3; // Ostacoli: 30% più piccoli
        return value * scaleFactor;
    }
}

    function refreshAllSizes() {
        // Ricalcola le dimensioni del dinosauro
        dino.width = scaleValue(150, true, { isDino: true });
        dino.height = scaleValue(150, false, { isDino: true });
        granchio.width = scaleValue(200, true, { isObstacle: true });
        granchio.height = scaleValue(200, false, { isObstacle: true });
    }

    function getMobileObstacleOffset() {
        return isMobileDevice() ? scaleValue(30, false) : 0;
    }

    // =============================================
    // 4. INIZIALIZZAZIONE OGGETTI DI GIOCO
    // =============================================
    let dino = {
        x: scaleValue(100),
        y: scaleValue(250, false),
        width: scaleValue(150, true, { isDino: true }),
        height: scaleValue(150, false, { isDino: true }),
        isJumping: false,
        jumpSpeed: isMobileDevice() ? -8 : -15,
        gravity: isMobileDevice() ? 0.8 : 0.35,
        maxJumpHeight: isMobileDevice() ? 140 : Infinity
    };

    let dina = {
        x: canvas.width,
        y: isMobileDevice() ? scaleValue(200, false) : scaleValue(250, false),
        width: scaleValue(108),
        height: scaleValue(108, false),
        visible: false,
        targetX: canvas.width - (isMobileDevice() ? scaleValue(180) : scaleValue(150)),
        isMoving: false
    };

    let gtr3 = {
        x: canvas.width + scaleValue(200),
        y: isMobileDevice() ? scaleValue(180, false) : scaleValue(230, false),
        width: scaleValue(150),
        height: scaleValue(150, false),
        visible: false,
        targetX: canvas.width - (isMobileDevice() ? scaleValue(350) : scaleValue(300)),
        isMoving: false
    };

    let palms = [];
    let granchio = { 
        x: canvas.width, 
        y: canvas.height - getMobileObstacleOffset(),
        width: scaleValue(200, true, { isObstacle: true }), 
        height: scaleValue(200, false, { isObstacle: true }),
        visible: false
    };

    let castello = { 
        x: canvas.width, 
        y: canvas.height - getMobileObstacleOffset(),
        width: scaleValue(150, true, { isObstacle: true }),
        height: scaleValue(150, false, { isObstacle: true }),
        visible: false 
    };

    // =============================================
    // 5. CARICAMENTO RISORSE
    // =============================================
    function loadAudioBuffers() {
        Promise.all([
            loadAudioBuffer("assets/mare.mp3"),
            loadAudioBuffer("assets/gtrs.mp3"),
            loadAudioBuffer("assets/keys.mp3"),
            loadAudioBuffer("assets/bass.mp3"),
            loadAudioBuffer("assets/drum.mp3"),
           ]).then(([mare, gtrs, keys, bass, drum]) => {
            mareBuffer = mare;
            gtrsBuffer = gtrs;
            keysBuffer = keys;
            bassBuffer = bass;
            drumBuffer = drum;
            audioBuffersLoaded = true; // Segnala che i buffer sono stati caricati
            console.log("All audio buffers loaded"); // Debug
        }).catch((error) => {
            console.error("Error loading audio buffers:", error);
        });
    }

    function checkAllImagesLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            console.log("Tutte le immagini sono state caricate");
        }
    }

    // =============================================
    // 6. FUNZIONI DI GIOCO PRINCIPALI
    // =============================================
    function resizeCanvas() {
        const isMobile = isMobileDevice();
        const maxWidth = window.innerWidth * (isMobile ? 0.95 : 0.9);
        const maxHeight = window.innerHeight * (isMobile ? 0.95 : 0.9);

        // Proporzioni originali del canvas (800x400)
        const aspectRatio = referenceWidth / referenceHeight;
        let canvasWidth = maxWidth;
        let canvasHeight = canvasWidth / aspectRatio;
    
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }

        // Imposta le dimensioni del canvas
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        // Reset delle posizioni
        dino.y = canvas.height * 0.6;
        dina.y = scaleValue(250, false) - (isMobile ? scaleValue(30, false) : 0);

        // Centra il canvas nello schermo
        canvas.style.position = "absolute";
        canvas.style.left = "50%";
        canvas.style.top = "50%";
        canvas.style.transform = "translate(-50%, -50%)";

        // Adeguare la posizione del dinosauro
        //dino.y = canvas.height * 0.6; // Posizione Y del dinosauro (60% dell'altezza del canvas)

        // Ridimensionamento dinamico del video
        if(coverVideo) {
        coverVideo.style.width = `${Math.min(window.innerWidth * 0.9, canvas.width)}px`;
        coverVideo.style.height = `${Math.min(window.innerHeight * 0.9, canvas.height)}px`;
        coverVideo.style.objectFit = "contain";
        }
        refreshAllSizes(); // <-- Aggiungi questa linea
    }

    function gameLoop(timestamp) {
        console.log("gameLoop chiamato");
        if (!startTime) startTime = timestamp; // Imposta il tempo di inizio

        update(timestamp);
        draw();

        // Continua il loop del gioco anche dopo il punteggio 50
        requestAnimationFrame(gameLoop);
    }

    // =============================================
    // 7. INIZIALIZZAZIONE FINALE
    // =============================================
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    loadAudioBuffers();
    // Configurazioni specifiche per piattaforma
    if (!isMobileDevice()) {
        dino.width = scaleValue(180, true, true);
        dino.height = scaleValue(180, false, true);
    }

    // Funzione per ottenere l'offset verticale degli ostacoli su mobile
    function getMobileObstacleOffset() {
        return isMobileDevice() ? scaleValue(30, false) : 0;
    }

    //granchio.y = canvas.height - granchio.height - scaleValue(50, false) - getMobileObstacleOffset();
    //castello.y = canvas.height - castello.height - scaleValue(50, false) - getMobileObstacleOffset();

    // Stato del pop-up
    let popupState = 0; // 0: TEST 1, 1: TEST 2, 2: TEST 3, 3: Gioco inizia
    let gamePaused = true; // Variabile per controllare se il gioco è in pausa
    console.log("Stato iniziale di gamePaused:", gamePaused); // Debug

    // Messaggi in stile pixel art
    const messages = [
        { text: "TEST 1", type: "title", y: canvas.height / 2 },
        { text: "TEST 2", type: "subtitle", y: canvas.height / 2 + 50 },
        { text: "TEST 3", type: "description", y: canvas.height / 2 + 100 }
    ];

    // Funzione per disegnare il testo in stile pixel art
    function drawPixelText(ctx, text, x, y, type) {
        // 1. Configurazione dimensioni responsive
        const sizeConfig = {
            title: {
                desktop: 20,
                mobile: 14, // Ridotto da 16 a 14 (-12.5%)
                scale: 1.0
            },
            subtitle: {
                desktop: 16,
                mobile: 12, // Ridotto da 14 a 12 (-14%)
                scale: 0.9
            },
            default: {
                desktop: 12,
                mobile: 10,
                scale: 0.8
            }
        };
    
        // 2. Seleziona configurazione in base al tipo
        const config = sizeConfig[type] || sizeConfig.default;
        
        // 3. Imposta valori in base al dispositivo
        const fontSize = isMobileDevice() ? config.mobile : config.desktop;
        const scale = isMobileDevice() ? config.scale : 1;
        const posX = isMobileDevice() ? scaleValue(60) : x; // Spostato più a destra (da 80 a 60)
        const posY = isMobileDevice() ? scaleValue(35, false) : y; // Leggermente più in alto (da 40 a 35)
    
        // 4. Applica le impostazioni
        ctx.save(); // Salva lo stato corrente del contesto
        ctx.font = `${fontSize}px 'Press Start 2P'`;
        ctx.fillStyle = "white";
        ctx.textAlign = isMobileDevice() ? "left" : "center"; // Allineamento diverso su mobile
        ctx.scale(scale, scale); // Applica lo scaling
        
        // 5. Disegna il testo (aggiustando la posizione per lo scaling)
        ctx.fillText(text, posX / scale, posY / scale);
        ctx.restore(); // Ripristina lo stato del contesto
    }

    // Variabile per controllare se il video "cover" è stato riprodotto
    let coverVideoPlayed = false;

    // Funzione per gestire il salto
    let isJumpButtonPressed = false; // Variabile per controllare se il tasto di salto è stato premuto

    function handleJump(event) {
        if (isJumpButtonPressed) return; // Se il tasto è già stato premuto, esci
        isJumpButtonPressed = true; // Imposta il tasto come premuto
    
        if ((event.type === "keydown" && event.code === "Space") || event.type === "click" || event.type === "touchstart") {
            event.preventDefault(); // Previeni il comportamento predefinito
            console.log("Pulsante di salto premuto"); // Debug
    
            if (gamePaused) {
                popupState++;
                console.log(`Popup aggiornato: stato ${popupState}`); // Debug
                if (popupState >= messages.length) {
                    startGame(); // Avvia il gioco se è in pausa
                } else {
                    updatePopup();
                }
            } else if (!dino.isJumping) {
                dino.isJumping = true;
                dino.jumpSpeed = -15; // Resetta la velocità del salto
            }
        }
    
        // Resetta lo stato del tasto di salto dopo un breve ritardo
        setTimeout(() => {
            isJumpButtonPressed = false;
        }, 300); // Ritardo di 300 millisecondi
    }

    // Funzione per aggiornare il pop-up
    function updatePopup() {
        if (popupState === 1) {
            console.log("Riproduzione audio mare.mp3"); // Debug
            startMareAudio();
        }
    }

    // Avvia la riproduzione di mare.mp3 all'apertura del pop-up
        function startMareAudio() {
        if (!mareAudio && mareBuffer) {
            mareAudio = playAudioBuffer(mareBuffer, 0.5, true); // Volume iniziale al 75%, loop attivato
            console.log("Mare audio started"); // Debug
        } else {
            console.log("Mare audio not started: mareBuffer is", mareBuffer); // Debug
        }
    }

    // Funzione per chiudere la finestra di istruzioni e avviare il gioco
    function startGame() {
        console.log("Gioco avviato"); // Debug
        gamePaused = false;
        console.log("gamePaused impostato a:", gamePaused); // Debug
        requestAnimationFrame(gameLoop); // Avvia il loop del gioco
    }

    // Gestione degli eventi per chiudere la finestra di istruzioni
    document.addEventListener("keydown", handleJump);
    jumpButton.addEventListener("click", handleJump);
    jumpButton.addEventListener("touchstart", handleJump, { passive: true });

    // Dimensioni di riferimento (800x400)
    //const referenceWidth = 800;
    //const referenceHeight = 400;

    // AudioContext per sincronizzare gli audio
    let audioBuffersLoaded = false;

    // Funzione per caricare un file audio come buffer
    async function loadAudioBuffer(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            console.log(`Audio file loaded successfully: ${url}`); // Debug
            return await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error("Error loading audio buffer:", error);
            throw error;
        }
    }

    // Funzione per riprodurre un buffer audio in loop
    function playAudioBuffer(buffer, volume = 0.75, loop = true) {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = buffer;
        source.loop = loop; // Abilita il loop
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
        console.log(`Audio started with volume ${volume}`); // Debug
        return { source, gainNode };
    }

    // Funzione per avviare gli audio aggiuntivi
    function startAdditionalAudio() {
        if (!gtrsAudio && gtrsBuffer) {
            gtrsAudio = playAudioBuffer(gtrsBuffer, 0, true); // Volume iniziale a 0, aumenterà gradualmente
            console.log("gtrs audio started");
        }
        if (!keysAudio && keysBuffer) {
            keysAudio = playAudioBuffer(keysBuffer, 0, true); // Volume iniziale a 0, aumenterà gradualmente
            console.log("keys audio started");
        }
        if (!bassAudio && bassBuffer) {
            bassAudio = playAudioBuffer(bassBuffer, 0, true); // Volume iniziale a 0, aumenterà gradualmente
            console.log("bass audio started");
        }
        if (!drumAudio && drumBuffer) {
            drumAudio = playAudioBuffer(drumBuffer, 0, true); // Volume iniziale a 0, aumenterà gradualmente
            console.log("drum audio started");
        }
    }

    // Inizializza l'audioContext e carica i buffer audio

    console.log("AudioContext initialized:", audioContext.state); // Debug

    // Funzione per riattivare l'audioContext se sospeso
    function resumeAudioContext() {
        if (audioContext.state === "suspended") {
            audioContext.resume().then(() => {
                console.log("AudioContext riattivato");
            });
        }
    }

    // Aggiungi un listener per riattivare l'audioContext al primo clic
    document.addEventListener("click", resumeAudioContext);

    // Verifica caricamento immagini
    let imagesLoaded = 0;

    function checkAllImagesLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            console.log("Tutte le immagini sono state caricate");
        }
    }

    dinoImg.onload = checkAllImagesLoaded;
    dinoImg.onerror = () => console.error("Errore nel caricamento di dino.png");
    dinaImg.onload = checkAllImagesLoaded;
    dinaImg.onerror = () => console.error("Errore nel caricamento di dina.png");
    gtr1Img.onload = checkAllImagesLoaded;
    gtr1Img.onerror = () => console.error("Errore nel caricamento di gtr1.png");
    gtr3Img.onload = checkAllImagesLoaded;
    gtr3Img.onerror = () => console.error("Errore nel caricamento di gtr3.png");
    palmImg.onload = checkAllImagesLoaded;
    palmImg.onerror = () => console.error("Errore nel caricamento di palm.png");
    umbrellaImg.onload = checkAllImagesLoaded;
    umbrellaImg.onerror = () => console.error("Errore nel caricamento di ombrellone.png");
    granchioImg.onload = checkAllImagesLoaded;
    granchioImg.onerror = () => console.error("Errore nel caricamento di granchio.png");
    castelloImg.onload = checkAllImagesLoaded;
    castelloImg.onerror = () => console.error("Errore nel caricamento di castello.png");
    sfondoImg.onload = checkAllImagesLoaded;
    sfondoImg.onerror = () => console.error("Errore nel caricamento di sfondo.png");

    // Variabili di gioco
    let scrollSpeed = isMobileDevice() ? 3 : 5; // Velocità iniziale ridotta per mobile
    let score = 0;
    let lastObstacleTime = 0;
    let lastGranchioTime = 0; // Tempo dell'ultimo granchio generato
    let lastCastelloTime = 0; // Tempo dell'ultimo castello generato
    let startTime = null; // Tempo di inizio del gioco
    let isGranchioNext = true; // Alterna tra granchio e castello
    let gameEnded = false; // Stato del gioco
    let dinaEnterTime = null; // Tempo in cui Dina inizia a entrare
    let dinoMoveTime = null; // Tempo in cui Dino inizia a muoversi verso il centro
    let maskProgress = 0; // Progresso della maschera nera (0 = nessuna maschera, 1 = completamente coperto)
    let maskStartTime = null; // Tempo in cui inizia la maschera
    let maskPauseTime = null; // Tempo in cui la maschera si ferma
    const maskPauseDuration = 2000; // Durata della pausa (2 secondi)
    const maskDuration = 5000; // Durata totale della maschera (5 secondi)

    // Dimensioni delle immagini modificate
    const palmWidth = scaleValue(144 * 1.2 * 0.9); // Aumenta del 20% e poi rimpicciolisce del 10%
    const palmHeight = scaleValue(144 * 1.2 * 0.9, false); // Aumenta del 20% e poi rimpicciolisce del 10%
    const umbrellaWidth = scaleValue(144 * 0.8); // Riduci del 20%
    const umbrellaHeight = scaleValue(144 * 0.8, false); // Riduci del 20%

    // Altezza ridotta per la sagoma della palma
    const palmCollisionHeight = palmHeight * 0.7; // Riduci l'altezza della sagoma del 30%

    // Probabilità di generare coppie di ostacoli
    let pairProbability = 0.1; // Inizia con 10% di probabilità

    // Distanza orizzontale tra gli ostacoli in una coppia
    const obstacleSpacing = scaleValue(100); // Distanza di 100 pixel tra i due ostacoli

    // Intervallo di generazione degli ostacoli
    const initialObstacleInterval = 2000; // 2 secondi all'inizio
    const minObstacleInterval = 2000; // 2 secondi alla massima velocità

    // Funzione per calcolare l'intervallo di generazione in base alla velocità
    function getObstacleInterval(scrollSpeed) {
        // Calcola l'intervallo in modo che diminuisca gradualmente con la velocità
        const interval = initialObstacleInterval - (scrollSpeed - 5) * 60; // Formula dinamica
        return Math.max(interval, minObstacleInterval); // Non scendere sotto 2 secondi
    }

    // Funzioni di supporto
    function createNewPalm() {
        const obstacleTypes = ["palm", "umbrella"];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const x = canvas.width;       
        // Calcolo base per la posizione Y
        const baseY = canvas.height - scaleValue(50, false);       
        // Configurazione per tipo di ostacolo
        const obstacleConfig = {
            palm: {
                height: palmHeight,
                offsetKey: "PALM" // Corrisponde alla chiave in OFFSET_CONFIG
            },
            umbrella: {
                height: umbrellaHeight,
                offsetKey: "UMBRELLA",
                extraOffset: 20 // Valore extra specifico per ombrelloni
            }
        };
    
        const config = obstacleConfig[type];
        // Calcolo posizione Y finale
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
        const obstacleTypes = ["palm", "umbrella"];
        const type1 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const type2 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

        const x1 = canvas.width;
        const x2 = x1 + obstacleSpacing; // Distanza orizzontale tra i due ostacoli

        const y1 = type1 === "umbrella" 
            ? canvas.height - umbrellaHeight - scaleValue(50, false) + umbrellaYOffset + 20 + getMobileObstacleOffset() // Abbassa ombrelloni di 20 pixel
            : canvas.height - palmHeight - scaleValue(50, false) + palmYOffset + getMobileObstacleOffset(); // Ripristina palme alla posizione originale

        const y2 = type2 === "umbrella" 
            ? canvas.height - umbrellaHeight - scaleValue(50, false) + umbrellaYOffset + 20 + getMobileObstacleOffset() // Abbassa ombrelloni di 20 pixel
            : canvas.height - palmHeight - scaleValue(50, false) + palmYOffset + getMobileObstacleOffset(); // Ripristina palme alla posizione originale

        return [
            { type: type1, x: x1, y: y1, passed: false, hit: false },
            { type: type2, x: x2, y: y2, passed: false, hit: false },
        ];
    }

    function drawImage(ctx, img, x, y, width, height) {
        ctx.drawImage(img, x, y, width, height);
    }

    // Funzione per disegnare la maschera a forma di cuore
    function drawHeartMask(ctx, progress) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + scaleValue(100, false); // Abbassa il cuore di 100 pixel rispetto al centro
        const maxRadius = Math.max(canvas.width, canvas.height) * 0.8; // Raggio massimo del cuore
        const radius = maxRadius * (1 - progress); // Raggio in base al progresso

        // Creiamo un canvas temporaneo
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        // 1. Disegniamo un rettangolo nero sul canvas temporaneo
        tempCtx.fillStyle = "black";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 2. Impostiamo il metodo di composizione per "pulire" l'area del cuore
        tempCtx.globalCompositeOperation = "destination-out";

        // 3. Disegniamo il cuore sul canvas temporaneo
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
        tempCtx.fill(); // "Pulisce" l'area del cuore, rendendola trasparente

        // 4. Copiamo il canvas temporaneo sul canvas principale
        ctx.drawImage(tempCanvas, 0, 0);
    }

    function drawGameElements(ctx) {
        // 1. Disegna lo sfondo
        ctx.drawImage(sfondoImg, 0, 0, canvas.width, canvas.height);

         // 8. Disegna i messaggi di test
         console.log("Coordinate dei messaggi:");
         messages.forEach((message, index) => {
             console.log(`Messaggio ${index + 1}:`, message.text, "Y:", message.y);
        });
        
        console.log("Stato del gioco (gamePaused):", gamePaused);
        console.log("Stato del pop-up (popupState):", popupState);
        console.log("Numero di messaggi:", messages.length);

        if (gamePaused && popupState < messages.length) {
            console.log("Disegno le scritte di test");
            messages.forEach((message, index) => {
                if (index <= popupState) {
                    console.log(`Disegnando: ${message.text}`);
                    drawPixelText(ctx, message.text, canvas.width / 2, message.y, message.type);
                }
            });
        }

        // 4. Disegna gli ostacoli (palme e ombrelloni)
        palms.forEach((obstacle) => {
            if (obstacle.type === "palm") {
                drawImage(ctx, palmImg, obstacle.x, obstacle.y, palmWidth, palmHeight);
            } else if (obstacle.type === "umbrella") {
                drawImage(ctx, umbrellaImg, obstacle.x, obstacle.y, umbrellaWidth, umbrellaHeight);
            }
        });

        // 2. Disegna il granchio (se visibile)
        if (granchio.visible) {
            drawImage(ctx, granchioImg, granchio.x, granchio.y, granchio.width, granchio.height);
        }

        // 3. Disegna il castello (se visibile)
        if (castello.visible) {
            drawImage(ctx, castelloImg, castello.x, castello.y, castello.width, castello.height);
        }
        
        // 5. Disegna il dinosauro
        drawImage(ctx, dinoImg, dino.x, dino.y, dino.width, dino.height);

        // 6. Disegna "dina" se visibile
        if (dina.visible) {
            drawImage(ctx, dinaImg, dina.x, dina.y, dina.width, dina.height);

            // Disegna la chitarra gtr1 sopra Dina
            const gtr1X = dina.x + (isMobileDevice() ? scaleValue(15) : scaleValue(10));
            const gtr1Y = dina.y + (isMobileDevice() ? scaleValue(15, false) : scaleValue(10, false)); // Spostata leggermente verso il basso
            const gtr1Width = scaleValue(80); // Larghezza della chitarra
            const gtr1Height = scaleValue(80, false); // Altezza della chitarra
            drawImage(ctx, gtr1Img, gtr1X, gtr1Y, gtr1Width, gtr1Height);

            // Disegna la chitarra gtr3 a sinistra di Dina
            const gtr3X = dina.x - scaleValue(150); //scaleValue(isMobileDevice() ? 180 : 150); // Posizionata a sinistra di Dina (con spazio aggiuntivo)
            const gtr3Y = dina.y - scaleValue(20, false); //scaleValue(isMobileDevice() ? 30 : 20, false); // Alzata di 20 pixel rispetto a Dina
            const gtr3Width = scaleValue(150); // Larghezza aumentata ulteriormente
            const gtr3Height = scaleValue(150, false); // Altezza aumentata ulteriormente
            drawImage(ctx, gtr3Img, gtr3X, gtr3Y, gtr3Width, gtr3Height);
        }

        drawPixelText(ctx, `Punteggio: ${score}`, scaleValue(100), scaleValue(30, false), "title");
    }

    // Funzione per gestire il volume degli audio in base al punteggio
    function updateAudioVolumes() {
        // Volume di mare.mp3 (riprodotto in loop fino al punteggio 10)
        if (score <= 10) {
            const volume = 0.75 - (score * 0.0675); // Diminuisce dal 75% al 7.5% al punteggio 10
            if (mareAudio) mareAudio.gainNode.gain.value = volume;
        } else {
            if (mareAudio) {
                mareAudio.gainNode.gain.value = 0.075; // Fissa il volume al 7.5% dopo il punteggio 10
            }
        }

        // Volume di gtrs (da 5 a 15)
        if (score >= 5 && score <= 15) {
            const volume = (score - 5) * 0.1; // Aumenta da 0 a 1 tra punteggio 5 e 15
            if (gtrsAudio) gtrsAudio.gainNode.gain.value = volume;
        }

        // Volume di keys (da 15 a 25)
        if (score >= 15 && score <= 25) {
            const volume = (score - 15) * 0.1; // Aumenta da 0 a 1 tra punteggio 15 e 25
            if (keysAudio) keysAudio.gainNode.gain.value = volume;
        }

        // Volume di bass (da 25 a 35)
        if (score >= 25 && score <= 35) {
            const volume = (score - 25) * 0.1; // Aumenta da 0 a 1 tra punteggio 25 e 35
            if (bassAudio) bassAudio.gainNode.gain.value = volume;
        }

        // Volume di drum (da 35 a 45)
        if (score >= 35 && score <= 45) {
            const volume = (score - 35) * 0.1; // Aumenta da 0 a 1 tra punteggio 35 e 45
            if (drumAudio) drumAudio.gainNode.gain.value = volume;
        }
    }

    // Funzione per abbassare gradualmente il volume degli audio
    function fadeOutAudio(audio, duration) {
        const startVolume = audio.gainNode.gain.value;
        const startTime = audioContext.currentTime;

        audio.gainNode.gain.setValueAtTime(startVolume, startTime);
        audio.gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    // Aggiorna lo stato del gioco
    function update(timestamp) {
        // Se il punteggio è >= 50, disabilita l'input dell'utente e avvia l'animazione di Dina
        if (score >= 50 && !gameEnded) {
            gameEnded = true; // Segnala che il gioco è finito
            dina.visible = true; // Mostra "dina"
            gtr3.visible = true; // Mostra "gtr3"
            dinaEnterTime = timestamp; // Registra il tempo in cui Dina inizia a entrare

            // Disabilita l'input dell'utente
            document.removeEventListener("keydown", handleJump);
            jumpButton.removeEventListener("click", handleJump);

            // Non abbassare il volume degli audio aggiuntivi immediatamente
            // Aspetta che il video finisca prima di abbassare il volume
        }

        // Animazione di Dina e gtr3: entrano da destra verso sinistra
        if (dina.visible && dina.x > dina.targetX) {
            const speed = 3; // Velocità di movimento
            dina.x -= speed;
            gtr3.x -= speed; // gtr3 si muove insieme a Dina
        }

        // Dopo 2 secondi che Dina è arrivata, inizia a muovere i dinosauri verso il centro
        if (dina.visible && dina.x <= dina.targetX && !dinoMoveTime) {
            dinoMoveTime = timestamp; // Registra il tempo in cui i dinosauri iniziano a muoversi
        }

        // Muovi i dinosauri verso il centro
        if (dinoMoveTime && timestamp - dinoMoveTime > 2000) { // Aspetta 2 secondi prima di muoversi
            const centerX = canvas.width / 2;
            const dinoTargetX = centerX - scaleValue(150); // Dino si ferma leggermente a sinistra del centro
            const dinaTargetX = centerX + scaleValue(50); // Dina si ferma leggermente a destra del centro
            const gtr3TargetX = centerX - scaleValue(250); // gtr3 si ferma più a sinistra di Dino

            // Muovi Dino verso il centro
            if (dino.x < dinoTargetX) {
                dino.x += 2; // Velocità di movimento di Dino
            }

            // Muovi Dina verso il centro
            if (dina.x > dinaTargetX) {
                dina.x -= 2; // Velocità di movimento di Dina
            }

            // Muovi gtr3 verso il centro
            if (gtr3.x > gtr3TargetX) {
                gtr3.x -= 2; // Velocità di movimento di gtr3
            }

            // Dopo 3 secondi, inizia la maschera nera
            if (!maskStartTime && timestamp - dinoMoveTime > 5000) {
                maskStartTime = timestamp;
            }
        }

        // Aggiorna il progresso della maschera nera
        if (maskStartTime) {
            const elapsedTime = timestamp - maskStartTime;

            // Se la maschera è in pausa, non aggiornare il progresso
            if (maskPauseTime && elapsedTime < maskPauseTime + maskPauseDuration) {
                // Non fare nulla durante la pausa
            } else {
                // Calcola il progresso della maschera
                maskProgress = Math.min((elapsedTime - (maskPauseTime ? maskPauseDuration : 0)) / maskDuration, 1);

                // Se il progresso raggiunge il 50%, avvia la pausa
                if (maskProgress >= 0.5 && !maskPauseTime) {
                    maskPauseTime = elapsedTime; // Registra il tempo in cui inizia la pausa
                }
            }
        }

        // Diminuisci gradualmente il volume di "mare.mp3"
        if (maskStartTime && mareAudio) {
            const elapsedTime = timestamp - maskStartTime;
            const fadeDuration = maskDuration; // Durata del fade (5 secondi)
            const volume = Math.max(0, 0.75 - (elapsedTime / fadeDuration)); // Volume diminuisce da 0.75 a 0
            mareAudio.gainNode.gain.value = volume;

            // Se la maschera è completamente chiusa, imposta il volume a 0
            if (maskProgress >= 1) {
                mareAudio.gainNode.gain.value = 0;
                mareAudio.source.stop(); // Ferma completamente l'audio "mare"
            }
        }

        // Aumenta la velocità gradualmente (incremento ridotto)
        scrollSpeed += 0.001;

        // Movimento del dinosauro
        if (dino.isJumping) {
            dino.y += dino.jumpSpeed;
            dino.jumpSpeed += dino.gravity;
            
            // Doppio controllo (fisica + limite fisso)
            if (isMobileDevice()) {
                const currentHeight = scaleValue(250, false) - dino.y;
                if (currentHeight > dino.maxJumpHeight) {
                    dino.y = scaleValue(250, false) - dino.maxJumpHeight;
                    dino.jumpSpeed = 0;
                }
            }
            
            // Atterraggio
            if (dino.y >= scaleValue(250, false)) {
                dino.y = scaleValue(250, false);
                dino.isJumping = false;
            }
        }

        // Movimento degli ostacoli
        palms.forEach((obstacle) => {
            obstacle.x -= scrollSpeed;

            // Calcola le dimensioni dell'ostacolo
            const obstacleWidth = obstacle.type === "palm" ? palmWidth : umbrellaWidth;
            const obstacleHeight = obstacle.type === "palm" ? palmCollisionHeight : umbrellaHeight; // Usa l'altezza ridotta per la palma

            // Verifica se l'ostacolo è stato superato
            if (obstacle.x + obstacleWidth < dino.x && !obstacle.passed) {
                // Controlla se il dinosauro ha saltato correttamente
                const requiredJumpHeight = obstacle.y + (obstacleHeight * 0.25); // Il dinosauro deve superare il 75% dell'altezza dell'ostacolo
                if (dino.y + dino.height < requiredJumpHeight) {
                    score += 1;  // Punto per aver superato l'ostacolo
                    console.log("Ostacolo superato! Punteggio:", score); // Debug
                } else {
                    score -= 1;  // Penalità per non aver saltato correttamente
                    console.log("Ostacolo non superato! Punteggio:", score); // Debug
                }
                obstacle.passed = true; // Segnala che l'ostacolo è stato superato
            }
        });

        // Aggiorna il volume delle tracce audio in base al punteggio
        updateAudioVolumes();

        // Rimuovi gli ostacoli usciti dallo schermo
        palms = palms.filter((obstacle) => obstacle.x + (obstacle.type === "palm" ? palmWidth : umbrellaWidth) > 0);

        // Movimento del granchio e del castello
        if (granchio.visible) {
            console.log("Granchio visibile:", granchio.x, granchio.y); // Debug
            granchio.x -= scrollSpeed;
            if (granchio.x + granchio.width < 0) {
                granchio.visible = false;
                lastGranchioTime = timestamp;
            }
        }

        if (castello.visible) {
            castello.x -= scrollSpeed;
            if (castello.x + castello.width < 0) {
                castello.visible = false;
                lastCastelloTime = timestamp;
            }
        }

        // Genera nuovi ostacoli solo se il gioco non è finito
        if (!gameEnded && timestamp - lastObstacleTime > getObstacleInterval(scrollSpeed)) {
            if (Math.random() < pairProbability) {
                // Genera una coppia di ostacoli
                palms.push(...createPairOfObstacles());
                console.log("Coppia di ostacoli generata"); // Debug
            } else {
                // Genera un singolo ostacolo
                palms.push(createNewPalm());
                console.log("Singolo ostacolo generato"); // Debug
            }
            lastObstacleTime = timestamp;
        }

        // Genera granchi e castelli solo se il gioco non è finito
        if (!gameEnded && timestamp - startTime > 5000) {
            if (isGranchioNext && !granchio.visible && !castello.visible && timestamp - lastGranchioTime > 6000) {
                granchio.x = canvas.width;
                granchio.y = canvas.height - granchio.height - scaleValue(50, false) + getMobileObstacleOffset(); // Posizione Y corretta
                granchio.visible = true;
                isGranchioNext = false;
                lastGranchioTime = timestamp;
            } else if (!isGranchioNext && !castello.visible && !granchio.visible && timestamp - lastCastelloTime > 6000) {
                castello.x = canvas.width;
                castello.y = canvas.height - castello.height - scaleValue(50, false) + getMobileObstacleOffset(); // Posizione Y corretta
                castello.visible = true;
                isGranchioNext = true;
                lastCastelloTime = timestamp;
            }
        }

        // Avvia gli audio aggiuntivi al punteggio 5
        if (score >= 5 && audioBuffersLoaded && !gtrsAudio) {
            startAdditionalAudio();
        }
    }

    // Disegna il gioco
    function draw() {
        // 1. Disegna gli elementi del gioco
        drawGameElements(ctx);
    
        // 2. Se la maschera è attiva, disegna la maschera a forma di cuore
        if (maskProgress > 0) {
            drawHeartMask(ctx, maskProgress);
        }
    
        // 3. Se il cuore è completamente chiuso, nascondi la scritta e il tasto "Salta"
        if (maskProgress >= 1 && !coverVideoPlayed) {
            console.log("Maschera completamente chiusa - Nascondi la scritta e il tasto 'Salta'");
    
            // Nascondi la scritta "Salto = Barra spaziatrice" (versione desktop)
            const desktopMessage = document.getElementById("desktopMessage");
            if (desktopMessage) {
                desktopMessage.style.display = "none";
            }
    
            // Nascondi il tasto "Salta" (versione mobile)
            const jumpButton = document.getElementById("jumpButton"); // Assicurati che l'elemento abbia l'ID corretto
            if (jumpButton) {
                jumpButton.style.display = "none";
            }
    
            coverVideoPlayed = true; // Imposta la variabile a true per evitare ripetizioni

            // Mostra il video
            coverVideo.style.display = "block";
            coverVideo.style.opacity = "0"; // Inizia con opacità 0
            setTimeout(() => {
                coverVideo.style.opacity = "1"; // Fade-in del video
            }, 100);

            // Riproduci il video (assicurati che sia pronto)
            if (coverVideo.readyState >= 3) { // 3 = HAVE_FUTURE_DATA, 4 = HAVE_ENOUGH_DATA
                coverVideo.play();
            }

            // Aspetta che il video finisca prima di abbassare il volume degli audio aggiuntivi
            coverVideo.onended = () => {
                coverVideo.style.opacity = "0"; // Fade-out del video
                setTimeout(() => {
                    coverVideo.pause(); // Blocca il video
                    coverVideo.currentTime = 0; // Riporta il video all'inizio
                    coverVideo.style.display = "none"; // Nascondi il video
                }, 2000); // Aspetta 2 secondi per il fade-out

                // Abbassa il volume degli audio aggiuntivi
                if (mareAudio) {
                    mareAudio.gainNode.gain.setValueAtTime(mareAudio.gainNode.gain.value, audioContext.currentTime);
                    mareAudio.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1); // Fade out in 1 secondo
                    mareAudio.source.stop(); // Ferma completamente l'audio "mare"
                }
                if (gtrsAudio) fadeOutAudio(gtrsAudio, 1);
                if (keysAudio) fadeOutAudio(keysAudio, 1);
                if (bassAudio) fadeOutAudio(bassAudio, 1);
                if (drumAudio) fadeOutAudio(drumAudio, 1);
            };
        }
    }
});
