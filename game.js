const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const jumpButton = document.getElementById("jumpButton");

// Funzione per rilevare i dispositivi mobili
function isMobileDevice() {
    return window.innerWidth <= 768; // Considera mobile se la larghezza è <= 768px
}

// Funzione per ridimensionare il canvas
function resizeCanvas() {
    const gameContainer = document.getElementById("gameContainer");

    if (isMobileDevice()) {
        // Ridimensionamento per dispositivi mobili
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * pixelRatio;
        canvas.height = window.innerHeight * pixelRatio;
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
        ctx.scale(pixelRatio, pixelRatio);
    } else {
        // Mantieni le dimensioni originali per desktop
        canvas.width = gameContainer.clientWidth;
        canvas.height = gameContainer.clientHeight;
    }

    console.log("Canvas ridimensionato:", canvas.width, canvas.height); // Debug
}

// Imposta le dimensioni iniziali del canvas
resizeCanvas();

// Funzione per calcolare il fattore di scala (solo per mobile)
function getScaleFactor() {
    const baseWidth = 800; // Larghezza di riferimento (ad esempio, la larghezza del canvas su desktop)
    return canvas.width / baseWidth;
}

// Funzione per aggiornare gli elementi del gioco (solo per mobile)
function updateGameElements() {
    if (isMobileDevice()) {
        const scaleFactor = getScaleFactor();

        // Ridimensiona il dinosauro
        dino.width = 100 * scaleFactor;
        dino.height = 100 * scaleFactor;
        dino.y = canvas.height - dino.height - 50;

        // Ridimensiona gli ostacoli
        palms.forEach((obstacle) => {
            if (obstacle.type === "palm") {
                obstacle.width = palmWidth * scaleFactor;
                obstacle.height = palmHeight * scaleFactor;
            } else if (obstacle.type === "umbrella") {
                obstacle.width = umbrellaWidth * scaleFactor;
                obstacle.height = umbrellaHeight * scaleFactor;
            }
            obstacle.y = canvas.height - (obstacle.type === "palm" ? palmHeight : umbrellaHeight) - 50;
        });
    }
}

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

const coverImg = new Image(); // Immagine della copertina
coverImg.src = "assets/cover.png";

// Verifica caricamento immagini
let imagesLoaded = 0;
const totalImages = 10; // Aggiunto "cover"

function checkAllImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("Tutte le immagini sono state caricate");
        requestAnimationFrame(gameLoop); // Avvia il gioco dopo il caricamento
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

coverImg.onload = checkAllImagesLoaded;
coverImg.onerror = () => console.error("Errore nel caricamento di cover.png");

// Variabili di gioco
let dino = { 
    x: 100, 
    y: 250, 
    width: 100, 
    height: 100, 
    isJumping: false, 
    jumpSpeed: -15, // Salto più lento
    gravity: 0.5 // Gravità ridotta
};
let dina = {
    x: canvas.width, // Inizia fuori dallo schermo a destra
    y: 250, // Stessa altezza di dino
    width: 108, // Ingrandita del 10%
    height: 108, // Ingrandita del 10%
    visible: false, // Inizialmente invisibile
    targetX: canvas.width - 150, // Posizione finale a destra
    isMoving: false // Controlla se Dina si sta muovendo
};
let gtr3 = {
    x: canvas.width + 200, // Inizia fuori dallo schermo a destra, più lontano di Dina
    y: 230, // Alzata di 20 pixel rispetto a Dina
    width: 150, // Larghezza aumentata ulteriormente
    height: 150, // Altezza aumentata ulteriormente
    visible: false, // Inizialmente invisibile
    targetX: canvas.width - 300, // Posizione finale a destra, più a sinistra di Dina
    isMoving: false // Controlla se gtr3 si sta muovendo
};
let palms = [];
let granchio = { x: canvas.width, y: 250, width: 70, height: 70, visible: false }; // Granchio inizialmente invisibile
let castello = { x: canvas.width, y: canvas.height - 80, width: 50, height: 50, visible: false }; // Castello più in basso
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
const palmWidth = 144 * 1.2 * 0.9; // Aumenta del 20% e poi rimpicciolisce del 10%
const palmHeight = 144 * 1.2 * 0.9; // Aumenta del 20% e poi rimpicciolisce del 10%
const umbrellaWidth = 144 * 0.8; // Riduci del 20%
const umbrellaHeight = 144 * 0.8; // Riduci del 20%

// Altezza ridotta per la sagoma della palma
const palmCollisionHeight = palmHeight * 0.7; // Riduci l'altezza della sagoma del 30%

// Probabilità di generare coppie di ostacoli
let pairProbability = 0.1; // Inizia con 10% di probabilità
const maxPairProbability = 0.5; // Massima probabilità (50%)

// Distanza orizzontale tra gli ostacoli in una coppia
const obstacleSpacing = 100; // Distanza di 100 pixel tra i due ostacoli

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
        ? canvas.height - umbrellaHeight - 50 + umbrellaYOffset + 20 // Abbassa ombrelloni di 20 pixel
        : canvas.height - palmHeight - 50 + palmYOffset; // Ripristina palme alla posizione originale
    return { type, x, y, passed: false, hit: false };
}

function createPairOfObstacles() {
    const obstacleTypes = ["palm", "umbrella"];
    const type1 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const type2 = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

    const x1 = canvas.width;
    const x2 = x1 + obstacleSpacing; // Distanza orizzontale tra i due ostacoli

    const y1 = type1 === "umbrella" 
        ? canvas.height - umbrellaHeight - 50 + umbrellaYOffset + 20 // Abbassa ombrelloni di 20 pixel
        : canvas.height - palmHeight - 50 + palmYOffset; // Ripristina palme alla posizione originale

    const y2 = type2 === "umbrella" 
        ? canvas.height - umbrellaHeight - 50 + umbrellaYOffset + 20 // Abbassa ombrelloni di 20 pixel
        : canvas.height - palmHeight - 50 + palmYOffset; // Ripristina palme alla posizione originale

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
    const centerY = canvas.height / 2 + 100; // Abbassa il cuore di 100 pixel rispetto al centro
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
        const gtr1X = dina.x + 10; // Spostata leggermente a sinistra
        const gtr1Y = dina.y + 10; // Spostata leggermente verso il basso
        const gtr1Width = 80; // Larghezza della chitarra
        const gtr1Height = 80; // Altezza della chitarra
        drawImage(ctx, gtr1Img, gtr1X, gtr1Y, gtr1Width, gtr1Height);

        // Disegna la chitarra gtr3 a sinistra di Dina
        const gtr3X = dina.x - 150; // Posizionata a sinistra di Dina (con spazio aggiuntivo)
        const gtr3Y = dina.y - 20; // Alzata di 20 pixel rispetto a Dina
        const gtr3Width = 150; // Larghezza aumentata ulteriormente
        const gtr3Height = 150; // Altezza aumentata ulteriormente
        drawImage(ctx, gtr3Img, gtr3X, gtr3Y, gtr3Width, gtr3Height);
    }

    // 7. Disegna il punteggio
    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.fillText(`Punteggio: ${score}`, 20, 30);
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
        mareAudio = playAudioBuffer(mareBuffer, 1, true); // Volume iniziale al 100%, loop attivato
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
        const volume = 1 - (score * 0.09); // Diminuisce dal 100% al 10% al punteggio 10
        if (mareAudio) mareAudio.gainNode.gain.value = volume;
    } else {
        if (mareAudio) {
            mareAudio.gainNode.gain.value = 0.1; // Fissa il volume al 10% dopo il punteggio 10
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

        // Abbassa gradualmente il volume degli audio aggiuntivi
        if (gtrsAudio) fadeOutAudio(gtrsAudio, 5);
        if (keysAudio) fadeOutAudio(keysAudio, 5);
        if (bassAudio) fadeOutAudio(bassAudio, 5);
        if (drumAudio) fadeOutAudio(drumAudio, 5);
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
        const dinoTargetX = centerX - 150; // Dino si ferma leggermente a sinistra del centro
        const dinaTargetX = centerX + 50; // Dina si ferma leggermente a destra del centro
        const gtr3TargetX = centerX - 250; // gtr3 si ferma più a sinistra di Dino

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
        const volume = Math.max(0, 1 - (elapsedTime / fadeDuration)); // Volume diminuisce da 1 a 0
        mareAudio.gainNode.gain.value = volume;

        // Se la maschera è completamente chiusa, imposta il volume a 0
        if (maskProgress >= 1) {
            mareAudio.gainNode.gain.value = 0;
        }
    }

    // Aumenta la velocità gradualmente (incremento ridotto)
    scrollSpeed += 0.001;

    // Movimento del dinosauro
    if (dino.isJumping) {
        dino.y += dino.jumpSpeed;
        dino.jumpSpeed += dino.gravity;

        if (dino.y >= 250) {
            dino.y = 250;
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
            granchio.visible = true;
            isGranchioNext = false;
        } else if (!isGranchioNext && !castello.visible && !granchio.visible && timestamp - lastCastelloTime > 6000) {
            castello.x = canvas.width;
            castello.visible = true;
            isGranchioNext = true;
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

    // 3. Se il cuore è completamente chiuso, disegna la copertina
    if (maskProgress >= 1) {
        const coverHeight = canvas.height * 0.9; // 90% dell'altezza dello schermo
        const coverWidth = (coverImg.width / coverImg.height) * coverHeight; // Mantieni le proporzioni
        const coverX = (canvas.width - coverWidth) / 2; // Centra orizzontalmente
        const coverY = (canvas.height - coverHeight) / 2; // Centra verticalmente

        ctx.drawImage(coverImg, coverX, coverY, coverWidth, coverHeight);
    }
}

// Funzione per gestire il salto
function handleJump(event) {
    if ((event.type === "keydown" && event.code === "Space") || event.type === "click") {
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

// Ridimensionamento dinamico del canvas
window.addEventListener("resize", () => {
    resizeCanvas();
    updateGameElements();
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
