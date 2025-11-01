package main

import (
	"sync"
	"log"
	"fmt"
	"net/http"
	"github.com/gorilla/websocket"
	"encoding/json"
	"math/rand"
)

type Server struct {
	snakes []Snake
	cons []*websocket.Conn

	lock sync.Mutex
	upgrade websocket.Upgrader
	counter int
	aw, ah int
}

func (s *Server) handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrade.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Gagal upgrade ke WebSocket:", err)
		return
	}
	defer conn.Close()

	log.Println("Client terhubung!")

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Client terputus:", err)
			break
		}

		var data map[string] any
		if err := json.Unmarshal([]byte(msg), &data); err != nil {
			fmt.Println("Error:", err)
			return
		}

		fmt.Printf("Server menerima: %v\n", data)

		msgType, _ := data["type"].(string)
		msgData, _ := data["data"].(string)

		if msgType == "connect" {}
		if msgType == "string" && msgData == "ready" {
			s.lock.Lock()
			found := false
			for _, excon := range s.cons {
				if (conn == excon) {
					found = true
					break
				}
			}

			newSnake := Snake{
				ID: s.counter,
				Body: []Vector2 {
					{
						X: rand.Intn(s.aw - 0) + 0,
						Y: rand.Intn(s.ah - 0) + 0,
					},
				},
				BodyLen: 1,
				Color: "white",
				Direction: rand.Intn(4 - 0) + 0,
			}
			if !found {
				s.cons = append(s.cons, conn)
				s.snakes = append(s.snakes, newSnake)
			}
			s.counter++
			s.lock.Unlock()

			ret := map[string]any{
				"type": "p_snake",
				"data": newSnake,
			}
			jsonBytes, err := json.Marshal(ret)
			if err != nil {
				log.Printf("Failed to parse `%v` to json: %s\n", ret, err)
				break
			}
			err = conn.WriteMessage(messageType, []byte(jsonBytes))
			if err != nil {
				log.Println("Gagal kirim pesan:", err)
				continue
			}
		}


	}

	log.Println("Client terputus")
	s.lock.Lock()
	index := -1
	for i, excon := range s.cons {
		if (conn == excon) {
			index = i
			break
		}
	}

	if index >= 0 {
		s.cons = append(s.cons[:index], s.cons[index+1:]...)
		s.snakes = append(s.snakes[:index], s.snakes[index+1:]...)
	}
	s.lock.Unlock()
}
