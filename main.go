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
		upgrade: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		snakes: make([]Snake, 0, 10),
		counter: 0,
		aw: 32,
		ah: 32,
	}
	http.HandleFunc("/ws", s.handleConnection)
	log.Printf("Started at: ws://locahost:%d\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
