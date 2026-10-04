const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const alphabet = katakana.split("");

const fontSize = 16;
let columns = Math.floor(canvas.width / fontSize);

let rainDrops = [];

function initRainDrops() {
    const rows = Math.floor(canvas.height / fontSize);
            
    rainDrops = [];
    for (let x = 0; x < columns; x++) {
        rainDrops[x] = Math.floor(Math.random() * rows) * -1;
    }
}

initRainDrops();

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(4, 0, 255, 0.2)'; 
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet[Math.floor(Math.random() * alphabet.length)];
        const x = i * fontSize;
        const y = rainDrops[i] * fontSize;

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
            rainDrops[i] = 0;
        }
                
        // Move the raindrop down one row
        rainDrops[i]++;
    }
}

let animationInterval = setInterval(draw, 30);

window.addEventListener('resize', () => {
    resizeCanvas();
    columns = Math.floor(canvas.width / fontSize);
    rainDrops = [];
    initRainDrops();
});