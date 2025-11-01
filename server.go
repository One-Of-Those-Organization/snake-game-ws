package main

import (
	"sync"
	"log"
	"fmt"
	"net/http"
	"time"
	"github.com/gorilla/websocket"
	"encoding/json"
	"math/rand"
)

type Server struct {
	snakes  []Snake
	foods   []Food
	cons    []*websocket.Conn
	lock    sync.Mutex
	counter int
	aw, ah  int
	upgrade websocket.Upgrader
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
		if msgType == "input" {
			dir, ok := data["dir"].(float64)
			if ok {
				s.lock.Lock()
				for i := range s.snakes {
					if s.snakes[i].ID == int(data["id"].(float64)) {
						// prevent 180 turn
						if (s.snakes[i].Direction+2)%4 != int(dir) || s.snakes[i].BodyLen <= 1 {
							s.snakes[i].Direction = int(dir)
						}
					}
				}
				s.lock.Unlock()
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

func (s *Server) updateGame() {
	ticker := time.NewTicker(150 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		s.lock.Lock()
		// Move snakes, handle growth and death
		for i := range s.snakes {
			if s.snakes[i].Dead {
				continue
			}
			s.moveSnake(&s.snakes[i])
			s.checkFoodCollision(&s.snakes[i])
			s.checkSelfCollision(&s.snakes[i])
		}

		// Ensure food exists
		for len(s.foods) < 1 {
			s.spawnFood()
		}

		// Broadcast state
		state := map[string]any{
			"type": "state",
			"data": map[string]any{
				"snakes": s.snakes,
				"foods":  s.foods,
			},
		}
		jsonBytes, _ := json.Marshal(state)
		for _, conn := range s.cons {
			conn.WriteMessage(websocket.TextMessage, jsonBytes)
		}
		s.lock.Unlock()
	}
}

func (s *Server) moveSnake(sn *Snake) {
	if len(sn.Body) == 0 {
		return
	}
	head := sn.Body[0]

	switch sn.Direction {
	case 0:
		head.X += 1
	case 1:
		head.Y += 1
	case 2:
		head.X -= 1
	case 3:
		head.Y -= 1
	}

	// wrap-around
	if head.X >= s.aw {
		head.X = 0
	}
	if head.X < 0 {
		head.X = s.aw - 1
	}
	if head.Y >= s.ah {
		head.Y = 0
	}
	if head.Y < 0 {
		head.Y = s.ah - 1
	}

	// insert new head
	sn.Body = append([]Vector2{head}, sn.Body...)

	// trim tail
	for len(sn.Body) > sn.BodyLen {
		sn.Body = sn.Body[:len(sn.Body)-1]
	}
}

func (s *Server) spawnFood() {
	f := Food{
		X: rand.Intn(s.aw),
		Y: rand.Intn(s.ah),
	}
	s.foods = append(s.foods, f)
}

func (s *Server) checkFoodCollision(sn *Snake) {
	if len(sn.Body) == 0 {
		return
	}
	head := sn.Body[0]
	for i := len(s.foods) - 1; i >= 0; i-- {
		f := s.foods[i]
		if f.X == head.X && f.Y == head.Y {
			s.foods = append(s.foods[:i], s.foods[i+1:]...)
			s.spawnFood()
			sn.BodyLen++
			break
		}
	}
}

func (s *Server) checkSelfCollision(sn *Snake) {
	head := sn.Body[0]
	for i := 1; i < len(sn.Body); i++ {
		if sn.Body[i].X == head.X && sn.Body[i].Y == head.Y {
			sn.Dead = true
			return
		}
	}
}
