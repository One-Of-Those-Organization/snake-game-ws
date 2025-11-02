package main

import (
	"sync"
	"log"
	"fmt"
	"net/http"
	"strconv"
	"time"
	"github.com/gorilla/websocket"
	"encoding/json"
	"math/rand"
)

type Mapping struct {
	snakeID int
	soc     *websocket.Conn
}

type Server struct {
	snakes  []Snake
	foods   []Food
	cons    []Mapping
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

	var socMap *Mapping = nil

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Client terputus:", err)
			break
		}

		var data map[string]any
		if err := json.Unmarshal(msg, &data); err != nil {
			log.Println("Error decode:", err)
			continue
		}

		msgType, _ := data["type"].(string)
		msgData, _ := data["data"].(string)

		switch msgType {
		// ----------------------------------------
		// RECONNECT EXISTING SNAKE
		// ----------------------------------------
		case "connect":
			cID, err := strconv.Atoi(msgData)
			if err != nil {
				sendFail(conn, messageType, "Invalid ID format")
				continue
			}

			s.lock.Lock()
			found := false
			for i := range s.snakes {
				if s.snakes[i].ID == cID {
					found = true
					socMap = &Mapping{soc: conn, snakeID: cID}

					// Remove old mapping if exists
					for j := range s.cons {
						if s.cons[j].snakeID == cID {
							// s.cons[j].soc.Close() // force disconnect old socket
							// s.cons[j].soc = conn  // rebind
							// s.lock.Unlock()
							// log.Printf("Reconnected to snake ID %d\n", cID)
							//
							// // Notify client of successful reconnection
							// state := map[string]any{
							// 	"type": "p_snake",
							// 	"data": s.snakes[i],
							// }
							// jsonBytes, _ := json.Marshal(state)
							// conn.WriteMessage(messageType, jsonBytes)
							sendFail(conn, messageType, "That id is already controlled.")
							socMap = nil
							s.lock.Unlock()
							socMap = nil
							return
						}
					}

					// No previous mapping (e.g. disconnected earlier)
					s.cons = append(s.cons, *socMap)
					log.Printf("Reconnected (new mapping) to snake ID %d\n", cID)

					// Notify client of successful reconnection
					state := map[string]any{
						"type": "p_snake",
						"data": s.snakes[i],
					}
					jsonBytes, _ := json.Marshal(state)
					conn.WriteMessage(messageType, jsonBytes)
					break
				}
			}
			s.lock.Unlock()

			if !found {
				sendFail(conn, messageType, fmt.Sprintf("No snake found with ID %d", cID))
				continue
			}

		// ----------------------------------------
		// CREATE NEW PLAYER
		// ----------------------------------------
		case "string":
			if msgData == "ready" {
				s.lock.Lock()

				newSnake := Snake{
					ID:        s.counter,
					Body:      []Vector2{{X: rand.Intn(s.aw), Y: rand.Intn(s.ah)}},
					BodyLen:   1,
					Color:     generate_random_color(),
					Direction: rand.Intn(4),
				}

				socMap = &Mapping{soc: conn, snakeID: newSnake.ID}
				s.cons = append(s.cons, *socMap)
				s.snakes = append(s.snakes, newSnake)
				s.counter++

				s.lock.Unlock()

				ret := map[string]any{
					"type": "p_snake",
					"data": newSnake,
				}
				jsonBytes, _ := json.Marshal(ret)
				conn.WriteMessage(messageType, jsonBytes)
			}

		// ----------------------------------------
		// HANDLE INPUT
		// ----------------------------------------
		case "input":
			dir, ok := data["dir"].(float64)
			if ok && socMap != nil {
				s.lock.Lock()
				for i := range s.snakes {
					if s.snakes[i].ID == socMap.snakeID {
						if (s.snakes[i].Direction+2)%4 != int(dir) || s.snakes[i].BodyLen <= 1 {
							s.snakes[i].Direction = int(dir)
						}
					}
				}
				s.lock.Unlock()
			}
		}
	}

	// ----------------------------------------
	// HANDLE DISCONNECT
	// ----------------------------------------
	log.Println("Client terputus")
	s.lock.Lock()
	index := -1
	for i, excon := range s.cons {
		if conn == excon.soc {
			index = i
			break
		}
	}

	if index >= 0 {
		s.cons = append(s.cons[:index], s.cons[index+1:]...)
	}
	s.lock.Unlock()
}

func (s *Server) updateGame() {
	ticker := time.NewTicker(150 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		s.lock.Lock()
		// Move snakes, handle growth and death
		foundDeath := -1
		for i := range s.snakes {
			if s.snakes[i].Dead {
				if foundDeath < 0 { foundDeath = i }
				continue
			}
			s.moveSnake(&s.snakes[i])
			s.checkFoodCollision(&s.snakes[i])
			s.checkSelfCollision(&s.snakes[i])
			s.checkOtherCollision(&s.snakes[i])
		}
		if foundDeath >= 0 {
			// Send msg that the snake is death
			var index int = 0;
			for i, c := range s.cons {
				if c.snakeID == s.snakes[foundDeath].ID {
					state := map[string]any{
						"type": "s_death",
						"data": c.snakeID,
					}
					jsonBytes, _ := json.Marshal(state)
					c.soc.WriteMessage(websocket.TextMessage, jsonBytes)
					index = i
					break
				}
			}
			s.snakes = append(s.snakes[:foundDeath], s.snakes[foundDeath+1:]...)
			s.cons[index].soc.Close()
			s.cons = append(s.cons[:index], s.cons[index+1:]...)
		}

		// Ensure food exists
		for len(s.foods) < len(s.snakes) {
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
			conn.soc.WriteMessage(websocket.TextMessage, jsonBytes)
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

func (s *Server) checkOtherCollision(sn *Snake) {
	if len(sn.Body) == 0 || sn.Dead {
		return
	}

	head := sn.Body[0]

	for _, other := range s.snakes {
		if other.ID == sn.ID || other.Dead {
			continue
		}

		for _, seg := range other.Body {
			if head.X == seg.X && head.Y == seg.Y {
				sn.Dead = true
				return
			}
		}
	}
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

func sendFail(conn *websocket.Conn, msgType int, reason string) {
	state := map[string]any{
		"type": "fail",
		"data": reason,
	}
	jsonBytes, _ := json.Marshal(state)
	conn.WriteMessage(msgType, jsonBytes)
}
