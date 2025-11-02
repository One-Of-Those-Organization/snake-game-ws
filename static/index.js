// ========================================
// FUNGSI RENDER - Gambar ular di canvas
// ========================================
function renderSnake(ctx, item) {
    ctx.fillStyle = item.color;
    item.body.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, 1, 1);
    });
}

// ========================================
// FUNGSI RENDER - Gambar makanan di canvas
// ========================================
function renderFood(ctx, foods) {
    ctx.fillStyle = 'red';
    foods.forEach(f => {
        ctx.fillRect(f.x, f.y, 1, 1);
    });
}

function sendToWS(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    } else {
        console.warn("WebSocket not open:", ws.readyState);
    }
}

// ========================================
// INISIALISASI GAME
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 16; // optional, if you want to upscale grid cells

    // Konfigurasi
    const speed = 7;
    const snakes = [];
    const foods = [];
    let player_id = -1;

    // Setup WS
    const ip = prompt("Enter server IP (default: localhost):") || "localhost";
    const port = 8080;
    const ws = new WebSocket(`ws://${ip}:${port}/ws`);

    ws.onerror = (_) => {
        const msg = "Failed to connect to the websocket";
        console.error(msg);
        alert(msg);
    };

    ws.onopen = () => {
        sendToWS(ws, { type: "string", data: "ready" });
    };

    ws.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);

        if (data.type === "p_snake") {
            player_id = data.data.id;
        } else if (data.type === "state") {
            snakes.length = 0;
            foods.length = 0;
            snakes.push(...data.data.snakes);
            foods.push(...data.data.foods);
        } else if (data.type === "s_death") {
            alert("Snake Death!");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });

    // ========================================
    // EVENT LISTENER - Tangkap input keyboard
    // ========================================
    const keyToDir = {
        ArrowRight: 0,
        ArrowDown: 1,
        ArrowLeft: 2,
        ArrowUp: 3,
    };

    document.addEventListener('keydown', (event) => {
        const new_dir = keyToDir[event.key];
        if (new_dir === undefined || player_id === -1) return;
        sendToWS(ws, { type: "input", id: player_id, dir: new_dir });
    });

    // ========================================
    // GAME LOOP - Render only (no logic)
    // ========================================
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render makanan
        renderFood(ctx, foods);

        // Render semua ular
        snakes.forEach(item => renderSnake(ctx, item));

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
