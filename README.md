# 🐍 Multiplayer Snake Game - Real-time WebSocket

## 👥 Anggota Kelompok
- **Federico Matthew Pratama** - NIM: 233405001
- **Fernando Perry** - NIM: 233406005

---

## 📖 Deskripsi Singkat Aplikasi

**Multiplayer Snake Game** adalah game klasik Snake yang dapat dimainkan secara real-time oleh banyak pemain dalam satu room menggunakan **WebSocket**. 

**Mengapa WebSocket?**
- ✅ Komunikasi **real-time** untuk multiplayer gaming
- ✅ **Low-latency** - pergerakan snake update instant tanpa delay
- ✅ **Bidirectional** - server dan client saling kirim data secara bersamaan
- ✅ **Efficient** - tidak perlu HTTP polling yang boros bandwidth

**Teknologi:**
- Backend: **Golang** (gorilla/websocket)
- Frontend: **React + TypeScript + Vite**
- Styling: **TailwindCSS**

---

## 🚀 Petunjuk Cara Menjalankan Aplikasi

### Prerequisites
Pastikan sudah terinstall:
- Go 1.21+ ([Download](https://go.dev/dl/))
- Node.js 18+ & npm ([Download](https://nodejs.org/))
- Git

### 1️⃣ Clone Repository
```bash
git clone https://github.com/One-Of-Those-Organization/snake-game-ws.git
cd snake-game-ws
```

### 2️⃣ Run Backend (Terminal 1)
```bash
# Install dependencies
go mod download

# Run server
go run .
```

### 3️⃣ Run Frontend (Terminal 2)
```bash
# Masuk ke folder frontend
cd frontend/snake-frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 4️⃣ Mulai Bermain
1. Buka browser dan akses `http://localhost:5173`
2. Input **nama pemain**
3. Input **server IP** (default: `localhost`) dan **port** (default: `8080`)
4. Klik **"Connect & Start"**
5. Pilih **"Create Room"** untuk membuat room baru atau **"Join Room"** untuk bergabung
6. Gunakan **Arrow Keys** atau **WASD** untuk menggerakkan snake
7. Kumpulkan makanan (merah) dan hindari tabrakan!

---

## 📸 Cuplikan Tampilan (Screenshot)

### 1. Login Screen
![Login Screen](images/login)

*User input nama dan konfigurasi server (IP dan port)*

---

### 2. Main Menu
![Main Menu](images/menu)

*Pilihan untuk Create Room (membuat room baru) atau Join Room (bergabung dengan room yang sudah ada)*

---

### 3. Create Room & Gameplay
![Create Room & Gameplay](images/create_room_and_gameplay)

*Room ID ter-generate otomatis (contoh: ABC12) dan dapat dibagikan ke teman. Gameplay menampilkan multiple snakes dalam satu arena dengan real-time synchronization*

---

### 4. Join Room View
![Join Room](images/join_room_view)

*Input 5-digit Room ID untuk bergabung ke room yang sudah dibuat oleh pemain lain*

---

### 5. Game Over
![Game Over](images/game_over)

*Notifikasi ketika snake mati karena collision (tabrakan dengan snake lain atau dinding)*

---

## 🎯 Contoh Interaksi Real-time WebSocket

### Message Flow Diagram
```
Client A                    Server                    Client B
   |                          |                          |
   |--[connect: "PlayerA"]--->|                          |
   |<-----[player: id=1]------|                          |
   |                          |                          |
   |-----[create room]------->|                          |
   |<----[room: "ABC12"]------|                          |
   |                          |                          |
   |                          |<--[join: "ABC12"]--------|
   |                          |------[snake data]------->|
   |                          |                          |
   |----[input: dir=0]------->|                          |
   |                          |--[broadcast state]------>|
   |<---[broadcast state]-----|                          |
   |                          |                          |
   (Game loop continues with real-time state broadcast ~60 FPS)
```

### Real-time Features Implemented:
1. **Instant Movement Update**: Setiap input keyboard langsung dikirim ke server dan di-broadcast ke semua client dalam room
2. **Collision Detection**: Server mendeteksi tabrakan secara real-time dan langsung notify semua pemain
3. **Food Spawning**: Makanan baru spawn otomatis saat dimakan dan langsung visible untuk semua pemain
4. **Player Join/Leave**: Notifikasi real-time ketika ada pemain baru bergabung atau keluar dari room
5. **Reconnect Mechanism**: Jika koneksi terputus, client otomatis reconnect dan restore session

---

## 📁 Struktur Project

```
snake-game-ws/
├── main.go              # Entry point backend server
├── server.go            # WebSocket server & game loop logic
├── player.go            # Player struct & management
├── room.go              # Room management & creation
├── snake.go             # Snake movement & collision detection
├── food.go              # Food spawning system
├── other.go             # Utility functions
├── go.mod               # Go module dependencies
├── go.sum               # Go dependencies checksum
│
├── images/              # Screenshots untuk dokumentasi
│   ├── login
│   ├── menu
│   ├── create_room_and_gameplay
│   ├── join_room_view
│   └── game_over
│
├── frontend/
│   └── snake-frontend/
│       ├── src/
│       │   ├── components/       # React UI components
│       │   ├── context/          # WebSocket state management
│       │   ├── hooks/            # Custom React hooks
│       │   ├── pages/            # Game canvas & rendering
│       │   └── api/              # TypeScript interfaces
│       └── package.json
│
└── README.md            # Dokumentasi (file ini)
```

---

## 🔬 Implementasi Konsep Pemrograman Jaringan

### OSI Layer & TCP/IP Model
| Layer | Protocol | Implementasi |
|-------|----------|--------------|
| **Application (L7)** | WebSocket, HTTP | WebSocket protocol untuk real-time game |
| **Presentation (L6)** | JSON | Message serialization |
| **Session (L5)** | WebSocket Session | Persistent connection per player |
| **Transport (L4)** | TCP | Reliable data delivery |
| **Network (L3)** | IP | Client-server addressing |

### Client-Server Model
- **Centralized Authority**: Server Golang sebagai single source of truth untuk game state
- **Multiple Clients**: Support multiple concurrent connections
- **Stateful Connection**: WebSocket maintain persistent connection untuk real-time updates
- **Server-side Validation**: Game logic dan collision detection di-handle oleh server
- **Broadcast Pattern**: Server broadcast game state ke semua client dalam room

### Socket & WebSocket Programming
**Mengapa WebSocket lebih baik dari HTTP Polling?**

```
HTTP Polling (Traditional approach):
Client → [GET /game-state] → Server
Client ← [Response: game state] ← Server
(Request diulang setiap 100ms)
❌ Bandwidth boros
❌ Latency tinggi
❌ Server load berat

WebSocket (Modern approach):
Client ↔ [Persistent Connection] ↔ Server
[Instant bidirectional updates]
✅ Efficient bandwidth
✅ Low latency (~5-10ms)
✅ Perfect untuk real-time game
```

**Keunggulan WebSocket:**
- ✅ **Full-duplex Communication**: Client dan server bisa kirim data bersamaan
- ✅ **Low Overhead**: Header size kecil setelah connection established
- ✅ **Event-driven**: Message handler untuk setiap event type
- ✅ **Persistent Connection**: Tidak perlu handshake berulang seperti HTTP

---

## 📝 License
This project is created for educational purposes as part of **UTS Pemrograman Jaringan** course at Universitas Katolik Darma Cendika.

---

## 🙏 Credits
- **Gorilla WebSocket Library**: https://github.com/gorilla/websocket
- **React**: https://react.dev
- **Vite**: https://vitejs.dev
- **TailwindCSS**: https://tailwindcss.com

---

**GitHub Repository**: https://github.com/One-Of-Those-Organization/snake-game-ws

**Contributors**:
- Federico Matthew Pratama ([@MashuNakamura](https://github.com/MashuNakamura))
- Fernando Perry ([@commrade-goad](https://github.com/commrade-goad))
