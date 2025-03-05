document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const jumpButton = document.getElementById("jumpButton");

    // Elemento video per la copertina
    const coverVideo = document.createElement("video");
    coverVideo.src = "assets/cover.mp4";
    coverVideo.loop = false; // Disabilita il loop
    coverVideo.muted = true;
    coverVideo.style.position = "absolute";
    coverVideo.style.display = "none"; // Inizialmente nascosto
    coverVideo.style.opacity = "0"; // Inizia con opacità 0
    coverVideo.style.transition = "opacity 2s"; // Transizione di 2 secondi per il fade
    document.body.appendChild(coverVideo);

    // Variabile per controllare se il video "cover" è stato riprodotto
    let coverVideoPlayed = false;

    // Variabile per controllare se il gioco è in pausa (finestra di istruzioni aperta)
    let gamePaused = true;

    // Finestra di istruzioni
    const instructionsDiv = document.createElement("div");
    instructionsDiv.style.position = "absolute";
    instructionsDiv.style.top = "50%";
    instructionsDiv.style.left = "50%";
    instructionsDiv.style.transform = "translate(-50%, -50%)";
    instructionsDiv.style.backgroundColor = "rgba(255, 255, 255, 0.9)"; // Sfondo bianco semi-trasparente
    instructionsDiv.style.color = "#333"; // Colore del testo scuro
    instructionsDiv.style.padding = "30px";
    instructionsDiv.style.borderRadius = "15px";
    instructionsDiv.style.textAlign = "center";
    instructionsDiv.style.fontFamily = "Arial, sans-serif";
    instructionsDiv.style.zIndex = "1000";
    instructionsDiv.style.width = "400px"; // Larghezza della finestra
    instructionsDiv.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)"; // Ombra per un effetto 3D
    instructionsDiv.style.border = "2px solid rgb(97, 189, 255)"; // Bordo colorato
    instructionsDiv.innerHTML = `
        <h1 style="font-size: 24px; color: rgb(97, 194, 255); margin-bottom: 20px;">FortunaDino!</h1>
        <p style="font-size: 16px; line-height: 1.6;">Sono sicuro che da qualche parte troverà la sua Dina...</p>
        <p style="font-size: 16px; line-height: 1.6;">...ma solo tu puoi aiutarlo!</p>
        <p style="font-size: 16px; line-height: 1.6;">In questa ricerca, Dino dovrà saltare alcuni ostacoli che si presenteranno man mano sul suo cammino e, se riuscirai a saltarli tutti, potrete finalmente godervi un po' di dolce compagnia.</p>
        <p style="font-size: 18px; font-weight: bold; color: rgb(97, 194, 255); margin-top: 20px;">Salta per continuare</p>
    `;
    document.body.appendChild(instructionsDiv);

    // Dimensioni di riferimento (800x400)
    const referenceWidth = 800;
    const referenceHeight = 400;

    // Funzione per scalare le dimensioni in base al canvas
    function scaleValue(value, isWidth = true) {
        const scaleFactor = isWidth ? canvas.width / referenceWidth : canvas.height / referenceHeight;
        return value * scaleFactor;
    }

    // Variabili di gioco
    let dino = {
        x: scaleValue(100), // Posizione X scalata
        y: scaleValue(250, false), // Posizione Y scalata
        width: scaleValue(150 * 3), // Larghezza aumentata di 3 volte
        height: scaleValue(150 * 3, false), // Altezza aumentata di 3 volte
        isJumping: false,
        jumpSpeed: 1, // Salto più lento
        gravity: 0.35 // Gravità ridotta
    };

    // Funzione per chiudere la finestra di istruzioni e avviare il gioco
    function startGame() {
        gamePaused = false;
        instructionsDiv.style.display = "none"; // Nascondi la finestra di istruzioni
        requestAnimationFrame(gameLoop); // Avvia il loop del gioco
    }

    // Gestione degli eventi per chiudere la finestra di istruzioni
    document.addEventListener("keydown", (event) => {
        if (gamePaused && event.code === "Space") {
            startGame();
        }
    });

    jumpButton.addEventListener("click", handleJump);
    jumpButton.addEventListener("touchstart", handleJump); // Aggiungi l'evento touch

    // Stile del pulsante "Salta"
    jumpButton.style.position = "fixed"; // Usa "fixed" per garantire la visibilità
    jumpButton.style.left = "50%";
    jumpButton.style.bottom = "20px"; // Posizione fissa dal basso
    jumpButton.style.transform = "translateX(-50%)";
    jumpButton.style.width = `${scaleValue(150)}px`; // Larghezza scalata
    jumpButton.style.height = `${scaleValue(50, false)}px`; // Altezza scalata
    jumpButton.style.fontSize = `${scaleValue(20, false)}px`; // Dimensione del font scalata
    jumpButton.style.zIndex = "1000"; // Assicura che il pulsante sia sopra altri elementi
    jumpButton.style.backgroundColor = "#4CAF50"; // Colore di sfondo
    jumpButton.style.color = "white"; // Colore del testo
    jumpButton.style.border = "none"; // Rimuovi il bordo
    jumpButton.style.borderRadius = "10px"; // Bordi arrotondati
    jumpButton.style.cursor = "pointer"; // Cambia il cursore al passaggio del mouse
    jumpButton.style.display = "block"; // Assicurati che sia visibile

    // Funzione per ridimensionare e posizionare il video
    function resizeCoverVideo() {
        const videoWidth = canvas.width * 0.8; // 80% della larghezza del canvas
        const videoHeight = canvas.height * 0.8; // 80% dell'altezza del canvas

        // Calcola le coordinate rispetto al canvas
        const canvasRect = canvas.getBoundingClientRect(); // Ottieni la posizione del canvas nella pagina
        const videoTop = canvasRect.top + (canvas.height - videoHeight) / 2; // Centra verticalmente rispetto al canvas
        const videoLeft = canvasRect.left + (canvas.width - videoWidth) / 2; // Centra orizzontalmente rispetto al canvas

        // Imposta le dimensioni e la posizione del video
        coverVideo.style.width = `${videoWidth}px`;
        coverVideo.style.height = `${videoHeight}px`;
        coverVideo.style.top = `${videoTop}px`;
        coverVideo.style.left = `${videoLeft}px`;
    }

    // Funzione per ridimensionare il canvas in base al dispositivo
    function resizeCanvas() {
        const maxWidth = window.innerWidth * 0.9; // 90% della larghezza dello schermo
        const maxHeight = window.innerHeight * 0.9; // 90% dell'altezza dello schermo

        // Proporzioni originali del canvas (800x400)
        const aspectRatio = referenceWidth / referenceHeight;

        // Calcola le dimensioni del canvas mantenendo le proporzioni
        let canvasWidth = maxWidth;
        let canvasHeight = canvasWidth / aspectRatio;

        // Se l'altezza calcolata supera l'altezza massima, riduci la larghezza
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }

        // Imposta le dimensioni del canvas
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        // Centra il canvas nello schermo
        canvas.style.position = "absolute";
        canvas.style.left = "50%";
        canvas.style.top = "50%";
        canvas.style.transform = "translate(-50%, -50%)";

        // Adeguare la posizione del dinosauro
        dino.y = canvas.height * 0.6; // Posizione Y del dinosauro (60% dell'altezza del canvas)

        // Ridimensiona e posiziona il video "cover"
        resizeCoverVideo();
    }

    // Ridimensiona il canvas all'avvio
    resizeCanvas();

    // Ridimensiona il canvas quando la finestra viene ridimensionata (utile per il cambio orientamento su mobile)
    window.addEventListener("resize", () => {
        resizeCanvas();
    });

    // Caricamento immagini
    const dinoImg = new Image();
    dinoImg.src = "assets/dino.png";

    const dinaImg = new Image();
    dinaImg.src = "assets/dina.png";

    const gtr1Img = new Image(); // Immagine della chitarra gtr1
    gtr1Img.src = "assets/gtr1.png";

    const gtr3Img = new Image(); // Immagine della chitarra gtr3
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

    // Verifica caricamento immagini
    let imagesLoaded = 0;
    const totalImages = 9; // Rimuovi 1 perché cover.png non viene più caricata

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
    let dina = {
        x: canvas.width, // Inizia fuori dallo schermo a destra
        y: scaleValue(250, false), // Stessa altezza di dino
        width: scaleValue(108), // Ingrandita del 10%
        height: scaleValue(108, false), // Ingrandita del 10%
        visible: false, // Inizialmente invisibile
        targetX: canvas.width - scaleValue(150), // Posizione finale a destra
        isMoving: false // Controlla se Dina si sta muovendo
    };
    let gtr3 = {
        x: canvas.width + scaleValue(200), // Inizia fuori dallo schermo a destra, più lontano di Dina
        y: scaleValue(230, false), // Alzata di 20 pixel rispetto a Dina
        width: scaleValue(150), // Larghezza aumentata ulteriormente
        height: scaleValue(150, false), // Altezza aumentata ulteriormente
        visible: false, // Inizialmente invisibile
        targetX: canvas.width - scaleValue(300), // Posizione finale a destra, più a sinistra di Dina
        isMoving: false // Controlla se gtr3 si sta muovendo
    };
    let palms = [];
    let granchio = { x: canvas.width, y: scaleValue(250, false), width: scaleValue(70), height: scaleValue(70, false), visible: false }; // Granchio inizialmente invisibile
    let castello = { x: canvas.width, y: canvas.height - scaleValue(80, false), width: scaleValue(50), height: scaleValue(50, false), visible: false }; // Castello più in basso
    let scrollSpeed = 5; // Velocità iniziale ridotta
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

    // Offset verticale per l'ombrellone e le palme
    const umbrellaYOffset = -20; // Alza gli ombrelloni (valore negativo per spostarli verso l'alto)
    const palmYOffset = 10; // Abbassa le palme (valore positivo per spostarle verso il basso)

    // Dimensioni delle immagini modificate
    const palmWidth = scaleValue(144 * 1.2 * 0.9); // Aumenta del 20% e poi rimpicciolisce del 10%
    const palmHeight = scaleValue(144 * 1.2 * 0.9, false); // Aumenta del 20% e poi rimpicciolisce del 10%
    const umbrellaWidth = scaleValue(144 * 0.8); // Riduci del 20%
    const umbrellaHeight = scaleValue(144 * 0.8, false); // Riduci del 20%

    // Altezza ridotta per la sagoma della palma
    const palmCollisionHeight = palmHeight * 0.7; // Riduci l'altezza della sagoma del 30%

    // Probabilità di generare coppie di ostacoli
    let pairProbability = 0.1; // Inizia con 10% di probabilità
    const maxPairProbability = 0.5; // Massima probabilità (50%)

    // Distanza orizzontale tra gli ostacoli in una coppia
    const obstacleSpacing = scaleValue(100); // Distanza di 100 pixel tra i due ostacoli

    // Intervallo di generazione degli ostacoli
    const initialObstacleInterval = 2000; // 2 secondi all'inizio
    const minObstacleInterval = 2000; // 2 secondi alla massima velocità

    // Funzione per calcolare l'intervallo di generazione in base alla velocità
    function getObstacleInterval(scrollSpeed) {
        // Calcola l'intervallo in modo che diminuisca gradualmente con la velocità
        const interval = initialObstacleInterval - (scrollSpeed - 5) * 50; // Formula dinamica
        return Math.max(interval, minObstacleInterval); // Non scendere sotto 2 secondi
    }

    // Funzioni di supporto
    function createNewPalm() {
        const obstacleTypes = ["palm", "umbrella"];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const x = canvas.width;
        const y = type === "umbrella" 
            ? canvas.height - umbrellaHeight - scaleValue(50, false) + umbrellaYOffset + 20 // Abbassa ombrelloni di 20 pixel
            : canvas.height - palmHeight - scaleValue(50, false) + palmYOffset; // Ripristina palme alla posizione originale
        return { type, x, y, passed: false, hit: false };
    }

    function createPairOfObstacles() {
        const obstacleTypes = ["palm", "umbrella"];
        const type1 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const type2 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

        const x1 = canvas.width;
        const x2 = x1 + obstacleSpacing; // Distanza orizzontale tra i due ostacoli

        const y1 = type1 === "umbrella" 
            ? canvas.height - umbrellaHeight - scaleValue(50, false) + umbrellaYOffset + 20 // Abbassa ombrelloni di 20 pixel
            : canvas.height - palmHeight - scaleValue(50, false) + palmYOffset; // Ripristina palme alla posizione originale

        const y2 = type2 === "umbrella" 
            ? canvas.height - umbrellaHeight - scaleValue(50, false) + umbrellaYOffset + 20 // Abbassa ombrelloni di 20 pixel
            : canvas.height - palmHeight - scaleValue(50, false) + palmYOffset; // Ripristina palme alla posizione originale

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

        // 2. Disegna il granchio (se visibile)
        if (granchio.visible) {
            drawImage(ctx, granchioImg, granchio.x, granchio.y, granchio.width, granchio.height);
        }

        // 3. Disegna il castello (se visibile)
        if (castello.visible) {
            drawImage(ctx, castelloImg, castello.x, castello.y, castello.width, castello.height);
        }

        // 4. Disegna gli ostacoli (palme e ombrelloni)
        palms.forEach((obstacle) => {
            if (obstacle.type === "palm") {
                drawImage(ctx, palmImg, obstacle.x, obstacle.y, palmWidth, palmHeight);
            } else if (obstacle.type === "umbrella") {
                drawImage(ctx, umbrellaImg, obstacle.x, obstacle.y, umbrellaWidth, umbrellaHeight);
            }
        });

        // 5. Disegna il dinosauro
        drawImage(ctx, dinoImg, dino.x, dino.y, dino.width, dino.height);

        // 6. Disegna "dina" se visibile
        if (dina.visible) {
            drawImage(ctx, dinaImg, dina.x, dina.y, dina.width, dina.height);

            // Disegna la chitarra gtr1 sopra Dina
            const gtr1X = dina.x + scaleValue(10); // Spostata leggermente a sinistra
            const gtr1Y = dina.y + scaleValue(10, false); // Spostata leggermente verso il basso
            const gtr1Width = scaleValue(80); // Larghezza della chitarra
            const gtr1Height = scaleValue(80, false); // Altezza della chitarra
            drawImage(ctx, gtr1Img, gtr1X, gtr1Y, gtr1Width, gtr1Height);

            // Disegna la chitarra gtr3 a sinistra di Dina
            const gtr3X = dina.x - scaleValue(150); // Posizionata a sinistra di Dina (con spazio aggiuntivo)
            const gtr3Y = dina.y - scaleValue(20, false); // Alzata di 20 pixel rispetto a Dina
            const gtr3Width = scaleValue(150); // Larghezza aumentata ulteriormente
            const gtr3Height = scaleValue(150, false); // Altezza aumentata ulteriormente
            drawImage(ctx, gtr3Img, gtr3X, gtr3Y, gtr3Width, gtr3Height);
        }

        // 7. Disegna il punteggio
        ctx.fillStyle = "black";
        ctx.font = `${scaleValue(24)}px Arial`; // Scala il font
        ctx.fillText(`Punteggio: ${score}`, scaleValue(20), scaleValue(30, false));
    }

    // AudioContext per sincronizzare gli audio
    let audioContext;
    let mareBuffer, gtrsBuffer, keysBuffer, bassBuffer, drumBuffer;
    let mareAudio, gtrsAudio, keysAudio, bassAudio, drumAudio;
    let audioBuffersLoaded = false;

    // Funzione per caricare un file audio come buffer
    async function loadAudioBuffer(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    }

    // Funzione per riprodurre un buffer audio in loop
    function playAudioBuffer(buffer, volume = 0, loop = true) {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = buffer;
        source.loop = loop; // Abilita il loop
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
        return { source, gainNode };
    }

    // Avvia la riproduzione di mare.mp3 al primo salto
    function startMareAudio() {
        if (!mareAudio && mareBuffer) {
            mareAudio = playAudioBuffer(mareBuffer, 0.75, true); // Volume iniziale al 75%, loop attivato
        }
    }

    // Avvia la riproduzione degli altri audio al punteggio 5
    function startAdditionalAudio() {
        if (!gtrsAudio && gtrsBuffer) {
            gtrsAudio = playAudioBuffer(gtrsBuffer, 0, true); // Inizia con volume 0
        }
        if (!keysAudio && keysBuffer) {
            keysAudio = playAudioBuffer(keysBuffer, 0, true); // Inizia con volume 0
        }
        if (!bassAudio && bassBuffer) {
            bassAudio = playAudioBuffer(bassBuffer, 0, true); // Inizia con volume 0
        }
        if (!drumAudio && drumBuffer) {
            drumAudio = playAudioBuffer(drumBuffer, 0, true); // Inizia con volume 0
        }
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

    // Loop del gioco
    function gameLoop(timestamp) {
        if (!startTime) startTime = timestamp; // Imposta il tempo di inizio

        update(timestamp);
        draw();

        // Continua il loop del gioco anche dopo il punteggio 50
        requestAnimationFrame(gameLoop);
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
                granchio.y = canvas.height - granchio.height - scaleValue(50, false); // Posizione Y corretta
                granchio.visible = true;
                isGranchioNext = false;
                lastGranchioTime = timestamp;
            } else if (!isGranchioNext && !castello.visible && !granchio.visible && timestamp - lastCastelloTime > 6000) {
                castello.x = canvas.width;
                castello.y = canvas.height - castello.height - scaleValue(50, false); // Posizione Y corretta
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

        // 3. Se il cuore è completamente chiuso, mostra e riproduci il video
        if (maskProgress >= 1 && !coverVideoPlayed) {
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

    // Funzione per gestire il salto
    function handleJump(event) {
        if ((event.type === "keydown" && event.code === "Space") || event.type === "click" || event.type === "touchstart") {
            if (!dino.isJumping) {
                dino.isJumping = true;
                dino.jumpSpeed = -15; // Resetta la velocità del salto
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    loadAudioBuffers(); // Carica i buffer audio dopo il primo salto
                }
                if (!mareAudio) {
                    startMareAudio(); // Avvia mare.mp3 al primo salto
                }
            }
        }
    }

    // Gestione degli eventi
    document.addEventListener("keydown", handleJump);
    jumpButton.addEventListener("click", handleJump);
    jumpButton.addEventListener("touchstart", handleJump); // Aggiungi l'evento touch

    // Ridimensionamento dinamico del canvas
    window.addEventListener("resize", () => {
        resizeCanvas();
    });

    // Funzione per caricare i buffer audio
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
        });
    }
});
