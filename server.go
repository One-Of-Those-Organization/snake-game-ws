package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Server struct (some arena game and player timeout as const)
const ARENA_SIZEX = 32
const ARENA_SIZEY = 32
const PLAYER_TIMEOUT = 5 * time.Minute

// some server struct
type Server struct {
	PlayerConn []*Player
	Room       []Room
	Upgrade    websocket.Upgrader
	Counter    int
	Lock       sync.Mutex
}

// Handling websocket connections
func (s *Server) handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := s.Upgrade.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade failed:", err)
		return
	}
	defer conn.Close()

	timeout := 240 * time.Second
	conn.SetReadDeadline(time.Now().Add(timeout))

	var pPtr *Player = nil

	// Read messages loop
	for {
		messageType, msgBytes, err := conn.ReadMessage()
		if err != nil {
			if pPtr != nil {
				s.Lock.Lock()
				pPtr.Socket = nil
				pPtr.LastActive = time.Now()
				s.Lock.Unlock()
			}
			log.Println("ReadMessage error / client disconnected:", err)
			break
		}
		conn.SetReadDeadline(time.Now().Add(timeout))

		// Parse incoming message
		var incoming Message
		if err := json.Unmarshal(msgBytes, &incoming); err != nil {
			log.Println("Invalid JSON message:", err)
			sendFail(conn, messageType, "", "Invalid JSON")
			continue
		}

		// Handle different connection message types
		switch incoming.Type {
		case "connect":
			var name string
			if err := json.Unmarshal(incoming.Data, &name); err != nil {
				var tmp struct{ Name string `json:"name"` }
				if err2 := json.Unmarshal(incoming.Data, &tmp); err2 != nil {
					sendFail(conn, messageType, "connect", "Failed to parse connect data")
					continue
				}
				name = tmp.Name
			}

			s.Lock.Lock()
			newID := s.Counter
			s.Counter++
			pPtr = &Player{
				ID:      newID,
				Name:    name,
				Socket:  conn,
				Room:    nil,
				Snake:   nil,
				UniqeID: strings.ToUpper(fmt.Sprintf("%05s", strconv.FormatInt(rand.Int63n(36*36*36*36*36), 36))),
			}
			s.PlayerConn = append(s.PlayerConn, pPtr)
			s.Lock.Unlock()

			pub := PlayerPublic{ID: pPtr.ID, Name: pPtr.Name, UniqeID: pPtr.UniqeID}
			ret := map[string]any{"response": "connect", "type": "player", "data": pub}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

		case "reconnect":
			var rdata struct {
				ID       int    `json:"id"`
				UniqueID string `json:"unique_id"`
			}
			if err := json.Unmarshal(incoming.Data, &rdata); err != nil {
				sendFail(conn, messageType, "reconnect", "Failed to parse reconnect data")
				continue
			}

			found := false
			s.Lock.Lock()
			for _, p := range s.PlayerConn {
				if p.ID == rdata.ID && p.UniqeID == rdata.UniqueID {
					if p.Socket != nil && p.Socket != conn {
						_ = p.Socket.Close()
					}
					p.Socket = conn
					pPtr = p

					pub := PlayerPublic{ID: p.ID, Name: p.Name, UniqeID: p.UniqeID}
					ret := map[string]any{"response": "reconnect", "type": "player", "data": pub}
					jsonBytes, _ := json.Marshal(ret)
					conn.WriteMessage(messageType, jsonBytes)
					found = true
					break
				}
			}
			s.Lock.Unlock()

			if !found {
				sendFail(conn, messageType, "reconnect", "Failed to reconnect with that id and unique_id")
			}

		case "create":
			if pPtr == nil {
				sendFail(conn, messageType, "create", "Connect first to access create.")
				continue
			}
			if pPtr.Room != nil { continue }

			newSnake := Snake{
				Body:      []Vector2{{X: rand.Intn(ARENA_SIZEX), Y: rand.Intn(ARENA_SIZEY)}},
				BodyLen:   1,
				Color:     generate_random_color(),
				Direction: rand.Intn(4),
			}
			pPtr.Snake = &newSnake
			newRoom := Room{
				UniqeID: strings.ToUpper(fmt.Sprintf("%05s", strconv.FormatInt(rand.Int63n(36*36*36*36*36), 36))),
				Players: []*Player{pPtr},
				Foods:   make([]Food, 0, 10),
			}
			s.Room = append(s.Room, newRoom)
			pPtr.Room = &s.Room[len(s.Room) -1]
			ret := map[string]any{"response": "create", "type": "room", "data": newRoom}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

		case "join":
			if pPtr == nil {
				sendFail(conn, messageType, "join", "Connect first to access join.")
				continue
			}
			var room string
			if err := json.Unmarshal(incoming.Data, &room); err != nil {
				var tmp struct {
					Room string `json:"room"`
				}
				if err2 := json.Unmarshal(incoming.Data, &tmp); err2 != nil {
					sendFail(conn, messageType, "join", "Failed to parse join data")
					continue
				}
				room = tmp.Room
			}

			room = strings.ToUpper(room)

			createdSnake := &Snake{
				Body:      []Vector2{{X: rand.Intn(ARENA_SIZEX), Y: rand.Intn(ARENA_SIZEY)}},
				BodyLen:   1,
				Color:     generate_random_color(),
				Direction: rand.Intn(4),
			}

			var roomPtr *Room = nil
			s.Lock.Lock()
			for i := range s.Room {
				if s.Room[i].UniqeID == room {
					roomPtr = &s.Room[i]
					break
				}
			}

			if roomPtr == nil {
				s.Lock.Unlock()
				sendFail(conn, messageType, "join", "There is no room with that id.")
				continue
			}

			if pPtr.Room != nil {
				s.Lock.Unlock()
				sendFail(conn, messageType, "join", "Already joined another room.")
				continue
			}

			pPtr.Snake = createdSnake
			pPtr.Room = roomPtr

			roomPtr.Players = append(roomPtr.Players, pPtr)

			log.Printf("Player %d (%s) joined room %s. Total players: %d\n", pPtr.ID, pPtr.Name, roomPtr.UniqeID, len(roomPtr.Players))

			ret := map[string]any{"response": "join", "type": "snake", "data": createdSnake}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

			s.Lock.Unlock()

		case "disconnect":
			s.Lock.Lock()
			if pPtr == nil {
				sendFail(conn, messageType, "disconnect", "Connect first to access disconnect.")
				s.Lock.Unlock()
				continue
			}
			if pPtr.Room == nil {
				sendFail(conn, messageType, "disconnect", "Join first to disconnect.")
				s.Lock.Unlock()
				continue
			}
			var index int = -1
			for i, p := range pPtr.Room.Players {
				if p.ID == pPtr.ID {
					index = i
					break
				}
			}
			if index >= 0 {
				pPtr.Room.Players = append(pPtr.Room.Players[:index], pPtr.Room.Players[index+1:]...)
				pPtr.Room = nil
			}
			sendFail(conn, messageType, "disconnect", "Failed to disconnect the player.")

			ret := map[string]any{"response": "disconnect", "type": "ok", "data": true}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

			s.Lock.Unlock()

		case "input":
			if pPtr == nil || pPtr.Snake == nil {
				continue
			}
			var rdata struct {
				Direction int `json:"dir"`
			}
			if err := json.Unmarshal(incoming.Data, &rdata); err != nil {
				sendFail(conn, messageType, "input", "Failed to parse input data")
				continue
			}
			if (pPtr.Snake.Direction+2)%4 != int(rdata.Direction) || pPtr.Snake.BodyLen <= 1 {
				pPtr.Snake.Direction = int(rdata.Direction)
			}

		default:
		}
	}
	if pPtr != nil {
		pPtr.Socket = nil
		pPtr.LastActive = time.Now()
	}
	log.Printf("Connection handler exiting for player: %v\n", pPtr)
}

// Some function to clean up inactive players and update game state
func (s *Server) cleanUpService() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		s.Lock.Lock()
		for i := range s.PlayerConn {
			p := s.PlayerConn[i]
			now := time.Now()
			if p.Socket != nil { continue }
			if now.After(p.LastActive.Add(PLAYER_TIMEOUT)) {
				if p.Room != nil {
					for j := range p.Room.Players {
						if p.ID == p.Room.Players[j].ID {
							p.Room.Players = append(p.Room.Players[:j], p.Room.Players[j+1:]...)
							break
						}
					}
					p.Room = nil
				}
			}
		}
		s.Lock.Unlock()
	}
}

// Game update loop
func (s *Server) updateGame() {
	ticker := time.NewTicker(150 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		s.Lock.Lock()
		var emptyRooms []string

		for i := range s.Room {
			room := &s.Room[i]
			var alivePlayers []*Player
			var deadPlayers []*Player

			for _, p := range room.Players {
				if p.Snake == nil {
					deadPlayers = append(deadPlayers, p)
					continue
				}

				if p.Snake.Dead {
					deadPlayers = append(deadPlayers, p)
					continue
				}

				p.Snake.move()
				p.Snake.checkSelfCollision()
				s.checkFoodCollision(p)
				s.checkSnakesCollision(p)

				if p.Snake.Dead {
					deadPlayers = append(deadPlayers, p)
				} else {
					alivePlayers = append(alivePlayers, p)
				}
			}

			for _, p := range deadPlayers {
				ret := map[string]any{
					"type": "broadcast_snake_ded",
					"data": p,
				}
				jsonBytes, _ := json.Marshal(ret)
				if p.Socket != nil {
					_ = p.Socket.WriteMessage(websocket.TextMessage, jsonBytes)
				}

				p.Room = nil
				p.Snake = nil
			}

			room.Players = alivePlayers

			for len(room.Foods) < len(room.Players) {
				s.spawnFood(room)
			}

			if len(room.Players) == 0 {
				emptyRooms = append(emptyRooms, room.UniqeID)
				continue
			}

			roomBroadcast := map[string]any{
				"type": "broadcast_room",
				"data": map[string]any{
					"snakes": room.Players,
					"foods":  room.Foods,
				},
			}
			jsonBytes, _ := json.Marshal(roomBroadcast)
			for _, p := range room.Players {
				if p.Socket != nil {
					_ = p.Socket.WriteMessage(websocket.TextMessage, jsonBytes)
				}
			}
		}

		for _, eroom := range emptyRooms {
			for i, roomIter := range s.Room {
				if eroom == roomIter.UniqeID {
					s.Room = append(s.Room[:i], s.Room[i+1:]...)
					break
				}
			}
		}

		s.Lock.Unlock()
	}
}

// Broadcast failure message
func sendFail(conn *websocket.Conn, msgType int, responseTo string, reason string) {
	state := map[string]any{
		"response": responseTo,
		"type": "fail",
		"data": reason,
	}
	jsonBytes, _ := json.Marshal(state)
	_ = conn.WriteMessage(msgType, jsonBytes)
}

// Spawn food in the room
func (s *Server) spawnFood(room *Room) {
	f := Food {
		Position: Vector2 {
			X: rand.Intn(ARENA_SIZEX),
			Y: rand.Intn(ARENA_SIZEY),
		},
	}
	room.Foods = append(room.Foods, f)
}

// Check collision between snakes (if crash into another snake)
func (s *Server) checkSnakesCollision(player *Player) {
	if player.Room == nil { return }
	if len(player.Snake.Body) == 0 || player.Snake.Dead { return }
	head := player.Snake.Body[0]

	for _, p := range player.Room.Players {
		if p.ID == player.ID || p.Snake.Dead { continue }
		for _, seg := range p.Snake.Body {
			if head.X == seg.X && head.Y == seg.Y {
				player.Snake.Dead = true
				return
			}
		}
	}
}

// Check collision between snake and food
func (s *Server) checkFoodCollision(player *Player) {
	if player.Room == nil { return }
	if len(player.Snake.Body) == 0 { return }
	head := player.Snake.Body[0]
	for i, f := range player.Room.Foods {
		if f.Position.X == head.X && f.Position.Y == head.Y {
			player.Room.Foods = append(player.Room.Foods[:i], player.Room.Foods[i+1:]...)
			s.spawnFood(player.Room)
			player.Snake.BodyLen++
			break
		}
	}
}
