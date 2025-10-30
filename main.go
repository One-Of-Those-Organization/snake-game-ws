package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Gagal upgrade ke WebSocket:", err)
		return
	}
	defer conn.Close()

	fmt.Println("Client terhubung!")

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Client terputus:", err)
			break
		}

		fmt.Printf("Pesan dari client: %s\n", msg)

		reply := fmt.Sprintf("Server menerima: %s", msg)
		err = conn.WriteMessage(messageType, []byte(reply))
		if err != nil {
			log.Println("Gagal kirim pesan:", err)
			break
		}
	}

	fmt.Println("Client terputus")
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)

	fmt.Println("Server WebSocket berjalan di :8080")
	fmt.Println("Endpoint: ws://localhost:8080/ws")

	log.Fatal(http.ListenAndServe(":8080", nil))
}
