// ========================================
// RENDER FUNCTIONS
// ========================================
function renderSnake(ctx, item) {
    ctx.fillStyle = item.color;
    item.body.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, 1, 1);
    });
}

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
// MAIN LOGIC
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 16;
    const snakes = [];
    const foods = [];
    let player_id = -1;

    // === CONNECT TO SERVER ===
    const ip = prompt("Enter server IP (default: localhost):") || "localhost";
    const port = 8080;
    const ws = new WebSocket(`ws://${ip}:${port}/ws`);

    ws.onerror = (_) => {
        const msg = "Failed to connect to the WebSocket";
        console.error(msg);
        alert(msg);
    };

    ws.onopen = () => {
        // Ask if user wants to reconnect
        const reconnectChoice = confirm("Reconnect to existing snake?");
        if (reconnectChoice) {
            const idInput = prompt("Enter your snake ID:");
            const parsed = parseInt(idInput);
            if (!isNaN(parsed)) {
                player_id = parsed;
                sendToWS(ws, { type: "connect", data: String(parsed) });
            } else {
                alert("Invalid ID, starting new snake instead.");
                sendToWS(ws, { type: "string", data: "ready" });
            }
        } else {
            sendToWS(ws, { type: "string", data: "ready" });
        }
    };

    ws.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);

        if (data.type === "p_snake") {
            player_id = data.data.id;
            console.log("Assigned snake ID:", player_id);
        } else if (data.type === "state") {
            snakes.length = 0;
            foods.length = 0;
            snakes.push(...data.data.snakes);
            foods.push(...data.data.foods);
        } else if (data.type === "s_death") {
            alert(`Your snake (${data.data}) died!`);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ws.close();
        } else if (data.type === "fail") {
            alert("Failed to connect: " + data.data);
            ws.close();
        }
    });

    // ========================================
    // INPUT
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
    // RENDER LOOP
    // ========================================
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderFood(ctx, foods);
        snakes.forEach(item => renderSnake(ctx, item));
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
