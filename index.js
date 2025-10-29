const SIZE = { x: 32, y: 32 };
const keyToDir = {
  ArrowRight: 0,
  ArrowDown: 1,
  ArrowLeft: 2,
  ArrowUp: 3,
};

readInput = (event, item) => {
    const new_dir = keyToDir[event.key];
    if (new_dir === undefined) return;
    if (((item.dir + 2) % 4 !== new_dir) || item.len <= 1) {
        item.dir = new_dir;
    }
};

updateSnake = (item, foods) => {
    const head = { ...item.body[0] };

    switch (item.dir) {
        case 0: head.x += 1; break;
        case 1: head.y += 1; break;
        case 2: head.x -= 1; break;
        case 3: head.y -= 1; break;
    }

    if (head.x >= SIZE.x) head.x = 0;
    if (head.x < 0) head.x = SIZE.x - 1;
    if (head.y >= SIZE.y) head.y = 0;
    if (head.y < 0) head.y = SIZE.y - 1;

    for (let i = foods.food.length - 1; i >= 0; i--) {
        const f = foods.food[i];
        if (f.x === head.x && f.y === head.y) {
            item.len += 1;
            foods.food.splice(i, 1);
            syncFoodWithSnake(foods);
        }
    }

    for (let i = 1; i < item.body.length; i++) {
        const part = item.body[i];
        if (part.x === head.x && part.y === head.y) {
            item.dead = true;
            break;
        }
    }

    item.body.unshift(head);
    while (item.body.length > item.len) {
        item.body.pop();
    }
};

renderSnake = (ctx, item) => {
    ctx.fillStyle = item.color;
    item.body.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, 1, 1);
    });
};

renderFood = (ctx, foods) => {
    ctx.fillStyle = 'red';
    foods.food.forEach(f => {
        ctx.fillRect(f.x, f.y, 1, 1);
    });
}

syncFoodWithSnake = (foods, count = 1) => {
    if (!foods.max) foods.max = count;
    if (foods.food.length > foods.max) {
        foods.food.length = foods.max;
    }

    while (foods.food.length < foods.max) {
        const x = Math.floor(Math.random() * SIZE.x);
        const y = Math.floor(Math.random() * SIZE.y);
        foods.food.push({ x, y });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const speed = 7;
    const snakes = [];
    const foods = { food: [], max: 1};
    const player_id = 0;
    const x = Math.floor(Math.random() * (SIZE.x - 0 + 1)) + 0;
    const y = Math.floor(Math.random() * (SIZE.y - 0 + 1)) + 0;
    const dir = Math.floor(Math.random() * (3 - 0 + 1)) + 0;

    let last_time = 0;

    snakes.push({
        id: 0,
        body: [{ x: y, y: x }],
        len: 1,
        dir: dir,
        color: 'white'
    });

    syncFoodWithSnake(foods, snakes.length);

    document.addEventListener('keydown', (event) => {
        const player = snakes.find(s => s.id === player_id);
        readInput(event, player);
    });

    function gameLoop(timestamp) {
        if (timestamp - last_time > 1000 / speed) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            snakes.forEach(item => {
                updateSnake(item, foods);
                renderSnake(ctx, item);
                renderFood(ctx, foods);
            });

            last_time = timestamp;
        }
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
