package main

import (
	"fmt"
	"log"
	"net/http"
	"github.com/gorilla/websocket"
)

func main() {
	port := 8080
	var s = Server {
		Upgrade: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		Counter: 0,
	}

	go s.updateGame()
	// go s.cleanupExpiredPlayers()

	http.HandleFunc("/ws", s.handleConnection)
	log.Printf("Hosted at: ws://locahost:%d\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
