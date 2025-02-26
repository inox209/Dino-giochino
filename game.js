const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const jumpButton = document.getElementById("jumpButton");

// Funzione per ridimensionare il canvas
function resizeCanvas() {
    const gameContainer = document.getElementById("gameContainer");
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
    console.log("Canvas ridimensionato:", canvas.width, canvas.height); // Debug
}

// Imposta le dimensioni iniziali del canvas
resizeCanvas();

// Caricamento immagini
const dinoImg = new Image();
dinoImg.src = "assets/dino.png";

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
const totalImages = 6;

function checkAllImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("Tutte le immagini sono state caricate");
        requestAnimationFrame(gameLoop); // Avvia il gioco dopo il caricamento
    }
}

dinoImg.onload = checkAllImagesLoaded;
dinoImg.onerror = () => console.error("Errore nel caricamento di dino.png");

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
let dino = { 
    x: 100, 
    y: 250, 
    width: 100, 
    height: 100, 
    isJumping: false, 
    jumpSpeed: -15, // Salto più lento
    gravity: 0.5 // Gravità ridotta
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
let pairProbability = 0; // Inizia con 0% di probabilità
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

// AudioContext per sincronizzare gli audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Funzione per caricare un file audio come buffer
async function loadAudioBuffer(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}

// Caricamento buffer audio
let mareBuffer, gtrsBuffer, bassBuffer, drumBuffer, keysBuffer;
Promise.all([
    loadAudioBuffer("assets/mare.mp3").then(buffer => mareBuffer = buffer),
    loadAudioBuffer("assets/gtrs.mp3").then(buffer => gtrsBuffer = buffer),
    loadAudioBuffer("assets/bass.mp3").then(buffer => bassBuffer = buffer),
    loadAudioBuffer("assets/drum.mp3").then(buffer => drumBuffer = buffer),
    loadAudioBuffer("assets/keys.mp3").then(buffer => keysBuffer = buffer),
]).then(() => {
    console.log("Tutti gli audio sono stati caricati");
    // Avvia la riproduzione di mare.mp3 all'inizio del gioco, in loop
    mareAudio = playAudioBuffer(mareBuffer, 0.5, true); // Loop attivato
});

// Funzione per riprodurre un buffer audio in loop
function playAudioBuffer(buffer, volume = 1, loop = false) {
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

// Variabili per gli audio
let mareAudio, gtrsAudio, bassAudio, drumAudio, keysAudio;

// Funzione per gestire il volume degli audio in base al punteggio
function updateAudioVolumes() {
    // Volume di mare.mp3 (riprodotto in loop fino al punteggio 10)
    if (score <= 10) {
        const volume = 0.5 - (score * 0.05); // Diminuisce dal 50% al 0% al punteggio 10
        if (mareAudio) mareAudio.gainNode.gain.value = volume;
    } else {
        if (mareAudio) {
            mareAudio.gainNode.gain.value = 0; // Spegne l'audio a punteggio 10
            mareAudio.source.stop(); // Ferma la riproduzione
        }
    }

    // Avvia gtrs.mp3, keys.mp3, bass.mp3 e drum.mp3 quando il punteggio raggiunge 5
    if (score >= 5 && !gtrsAudio) {
        gtrsAudio = playAudioBuffer(gtrsBuffer, 0);
        keysAudio = playAudioBuffer(keysBuffer, 0);
        bassAudio = playAudioBuffer(bassBuffer, 0);
        drumAudio = playAudioBuffer(drumBuffer, 0);
    }

    // Volume di gtrs.mp3 (punteggio 5-10)
    if (score >= 5 && score <= 10) {
        const volume = (score - 5) * 0.2; // Aumenta del 20% per ogni punto da 5 a 10
        if (gtrsAudio) gtrsAudio.gainNode.gain.value = volume;
    } else if (score > 10) {
        if (gtrsAudio) gtrsAudio.gainNode.gain.value = 1; // Fissa il volume al 100% dopo il punteggio 10
    }

    // Volume di keys.mp3 (punteggio 10-20)
    if (score >= 10 && score <= 20) {
        const volume = (score - 10) * 0.1; // Aumenta del 10% per ogni punto da 10 a 20
        if (keysAudio) keysAudio.gainNode.gain.value = volume;
    } else if (score > 20) {
        if (keysAudio) keysAudio.gainNode.gain.value = 1; // Fissa il volume al 100% dopo il punteggio 20
    }

    // Volume di bass.mp3 (punteggio 20-30)
    if (score >= 20 && score <= 30) {
        const volume = (score - 20) * 0.1; // Aumenta del 10% per ogni punto da 20 a 30
        if (bassAudio) bassAudio.gainNode.gain.value = volume;
    } else if (score > 30) {
        if (bassAudio) bassAudio.gainNode.gain.value = 1; // Fissa il volume al 100% dopo il punteggio 30
    }

    // Volume di drum.mp3 (punteggio 30-40)
    if (score >= 30 && score <= 40) {
        const volume = (score - 30) * 0.1; // Aumenta del 10% per ogni punto da 30 a 40
        if (drumAudio) drumAudio.gainNode.gain.value = volume;
    } else if (score > 40) {
        if (drumAudio) drumAudio.gainNode.gain.value = 1; // Fissa il volume al 100% dopo il punteggio 40
    }
}

// Loop del gioco
function gameLoop(timestamp) {
    if (!startTime) startTime = timestamp; // Imposta il tempo di inizio

    update(timestamp);
    draw();

    // Aumenta gradualmente la probabilità di generare coppie di ostacoli
    pairProbability = Math.min(maxPairProbability, (timestamp - startTime) / 60000); // Aumenta fino al 50% in 1 minuto

    // Calcola l'intervallo di generazione degli ostacoli in base alla velocità
    const obstacleInterval = getObstacleInterval(scrollSpeed);

    // Genera nuovi ostacoli
    if (timestamp - lastObstacleTime > obstacleInterval) {
        if (Math.random() < pairProbability) {
            // Genera una coppia di ostacoli
            palms.push(...createPairOfObstacles());
        } else {
            // Genera un singolo ostacolo
            palms.push(createNewPalm());
        }
        lastObstacleTime = timestamp;
    }

    requestAnimationFrame(gameLoop);
}

// Aggiorna lo stato del gioco
function update(timestamp) {
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

    // Genera granchi e castelli
    if (timestamp - startTime > 5000) {
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
}

// Disegna il gioco
function draw() {
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

    // 6. Disegna il punteggio
    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.fillText(`Punteggio: ${score}`, 20, 30);
}

// Gestione degli eventi
document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !dino.isJumping) {
        dino.isJumping = true;
        dino.jumpSpeed = -15; // Resetta la velocità del salto
    }
});

jumpButton.addEventListener("click", () => {
    if (!dino.isJumping) {
        dino.isJumping = true;
        dino.jumpSpeed = -15; // Resetta la velocità del salto
    }
});

// Ridimensionamento dinamico del canvas
window.addEventListener("resize", () => {
    resizeCanvas();
});