// ========================================
// KONSTANTA & KONFIGURASI
// ========================================

// Ukuran grid canvas (32x32 kotak)
const SIZE = { x: 32, y: 32 };

// Mapping tombol keyboard ke arah gerakan ular
// 0 = Kanan, 1 = Bawah, 2 = Kiri, 3 = Atas
const keyToDir = {
  ArrowRight: 0,
  ArrowDown: 1,
  ArrowLeft: 2,
  ArrowUp: 3,
};

// ========================================
// FUNGSI INPUT - Membaca input keyboard
// ========================================
readInput = (event, item) => {
    const new_dir = keyToDir[event.key];
    if (new_dir === undefined) return; // Abaikan jika bukan tombol arrow
    
    // Cegah ular berbalik 180 derajat (kecuali panjang ular = 1)
    // Contoh: jika ular ke kanan (0), tidak bisa langsung ke kiri (2)
    if (((item.dir + 2) % 4 !== new_dir) || item.len <= 1) {
        item.dir = new_dir;
    }
};

// ========================================
// FUNGSI UPDATE - Logika pergerakan ular
// ========================================
updateSnake = (item, foods) => {
    // 1. Duplikasi posisi kepala ular untuk gerakan berikutnya
    const head = { ...item.body[0] };

    // 2. Gerakkan kepala sesuai arah yang dipilih
    switch (item.dir) {
        case 0: head.x += 1; break; // Kanan
        case 1: head.y += 1; break; // Bawah
        case 2: head.x -= 1; break; // Kiri
        case 3: head.y -= 1; break; // Atas
    }

    // 3. Implementasi "wrap around" - ular keluar dari satu sisi, masuk dari sisi lain
    if (head.x >= SIZE.x) head.x = 0;        // Keluar kanan, masuk kiri
    if (head.x < 0) head.x = SIZE.x - 1;     // Keluar kiri, masuk kanan
    if (head.y >= SIZE.y) head.y = 0;        // Keluar bawah, masuk atas
    if (head.y < 0) head.y = SIZE.y - 1;     // Keluar atas, masuk bawah

    // 4. Deteksi tabrakan dengan makanan
    for (let i = foods.food.length - 1; i >= 0; i--) {
        const f = foods.food[i];
        if (f.x === head.x && f.y === head.y) {
            item.len += 1;                    // Tambah panjang ular
            foods.food.splice(i, 1);          // Hapus makanan yang dimakan
            syncFoodWithSnake(foods);         // Spawn makanan baru
        }
    }

    // 5. Deteksi tabrakan dengan tubuh sendiri (game over)
    for (let i = 1; i < item.body.length; i++) {
        const part = item.body[i];
        if (part.x === head.x && part.y === head.y) {
            item.dead = true; // Set status mati
            break;
        }
    }

    // 6. Update posisi tubuh ular
    item.body.unshift(head);              // Tambah kepala baru di depan
    while (item.body.length > item.len) {
        item.body.pop();                  // Buang ekor jika panjang berlebih
    }
};

// ========================================
// FUNGSI RENDER - Gambar ular di canvas
// ========================================
renderSnake = (ctx, item) => {
    ctx.fillStyle = item.color; // Set warna ular
    // Gambar setiap segmen tubuh ular
    item.body.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, 1, 1);
    });
};

// ========================================
// FUNGSI RENDER - Gambar makanan di canvas
// ========================================
renderFood = (ctx, foods) => {
    ctx.fillStyle = 'red'; // Warna makanan merah
    // Gambar setiap makanan yang ada
    foods.food.forEach(f => {
        ctx.fillRect(f.x, f.y, 1, 1);
    });
}

// ========================================
// FUNGSI SPAWN - Generate makanan random (Masih 1)
// ========================================
syncFoodWithSnake = (foods, count = 1) => {
    // Set jumlah maksimal makanan
    if (!foods.max) foods.max = count;
    
    // Hapus makanan berlebih (jika ada)
    if (foods.food.length > foods.max) {
        foods.food.length = foods.max;
    }

    // Spawn makanan baru sampai mencapai jumlah max
    while (foods.food.length < foods.max) {
        const x = Math.floor(Math.random() * SIZE.x);
        const y = Math.floor(Math.random() * SIZE.y);
        foods.food.push({ x, y });
    }
};

// ========================================
// INISIALISASI GAME
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    // Setup canvas
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Konfigurasi game
    const speed = 7;              // FPS game (7 frame per detik)
    const snakes = [];            // Array untuk menyimpan semua ular
    const foods = { food: [], max: 1}; // Object makanan
    const player_id = 0;          // ID player utama
    
    // Generate posisi dan arah awal ular secara random
    // Nanti di assign ke WebSocket untuk Player 1 dan Player 2
    const x = Math.floor(Math.random() * (SIZE.x - 0 + 1)) + 0;
    const y = Math.floor(Math.random() * (SIZE.y - 0 + 1)) + 0;
    const dir = Math.floor(Math.random() * (3 - 0 + 1)) + 0;

    let last_time = 0; // Tracker untuk frame timing

    // Buat ular player
    snakes.push({
        id: 0,                      // ID ular
        body: [{ x: y, y: x }],     // Posisi awal (1 segmen)
        len: 1,                     // Panjang awal
        dir: dir,                   // Arah random
        color: 'white'              // Warna ular
    });

    // Spawn makanan pertama
    syncFoodWithSnake(foods, snakes.length);

    // ========================================
    // EVENT LISTENER - Tangkap input keyboard
    // ========================================
    document.addEventListener('keydown', (event) => {
        const player = snakes.find(s => s.id === player_id);
        readInput(event, player);
    });

    // ========================================
    // GAME LOOP - Loop utama game
    // ========================================
    function gameLoop(timestamp) {
        // Kontrol kecepatan game (hanya update setiap 1000/speed ms)
        if (timestamp - last_time > 1000 / speed) {
            // Bersihkan canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update dan render semua ular
            snakes.forEach(item => {
                updateSnake(item, foods);    // Update logika
                renderSnake(ctx, item);      // Gambar ular
                renderFood(ctx, foods);      // Gambar makanan
            });

            last_time = timestamp; // Update waktu frame terakhir
        }
        
        // Loop terus menerus
        requestAnimationFrame(gameLoop);
    }

    // Mulai game loop
    requestAnimationFrame(gameLoop);
});