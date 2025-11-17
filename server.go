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

// small helper type for deferred writes (so we don't write under lock)
type writeJob struct {
	conn    *websocket.Conn
	msgType int
	msg     []byte
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

		// We'll collect any writes that must be performed after releasing locks
		var toWrite []writeJob

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
			_ = conn.WriteMessage(messageType, jsonBytes)

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
			var respMsg []byte

			s.Lock.Lock()
			for _, p := range s.PlayerConn {
				if p.ID == rdata.ID && p.UniqeID == rdata.UniqueID {
					// close old socket if present
					if p.Socket != nil && p.Socket != conn {
						_ = p.Socket.Close()
					}
					p.Socket = conn
					pPtr = p

					pub := PlayerPublic{ID: p.ID, Name: p.Name, UniqeID: p.UniqeID}
					ret := map[string]any{"response": "reconnect", "type": "player", "data": pub}
					jsonBytes, _ := json.Marshal(ret)
					respMsg = jsonBytes
					found = true
					break
				}
			}
			s.Lock.Unlock()

			if !found {
				sendFail(conn, messageType, "reconnect", "Failed to reconnect with that id and unique_id")
				continue
			}
			// write after unlocking
			if respMsg != nil {
				_ = conn.WriteMessage(messageType, respMsg)
			}

		case "create":
			if pPtr == nil {
				sendFail(conn, messageType, "create", "Connect first to access create.")
				continue
			}
			if pPtr.Room != nil {
				// already in a room; ignore
				continue
			}

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

			// mutate server state under lock, but don't write socket messages while locked
			s.Lock.Lock()
			s.Room = append(s.Room, newRoom)
			// point pPtr.Room to the newly appended room
			pPtr.Room = &s.Room[len(s.Room)-1]
			// capture a copy of the room to send to client
			roomToSend := s.Room[len(s.Room)-1]
			s.Lock.Unlock()

			ret := map[string]any{"response": "create", "type": "room", "data": roomToSend}
			jsonBytes, _ := json.Marshal(ret)
			_ = conn.WriteMessage(messageType, jsonBytes)

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

			// capture values for logging and response while still under lock
			logRoomID := roomPtr.UniqeID
			totalPlayers := len(roomPtr.Players)
			// prepare response data (snake)
			createdSnakeCopy := *createdSnake
			s.Lock.Unlock()

			log.Printf("Player %d (%s) joined room %s. Total players: %d\n", pPtr.ID, pPtr.Name, logRoomID, totalPlayers)

			ret := map[string]any{"response": "join", "type": "snake", "data": createdSnakeCopy}
			jsonBytes, _ := json.Marshal(ret)
			_ = conn.WriteMessage(messageType, jsonBytes)

		case "disconnect":
			s.Lock.Lock()
			if pPtr == nil {
				s.Lock.Unlock()
				sendFail(conn, messageType, "disconnect", "Connect first to access disconnect.")
				continue
			}
			if pPtr.Room == nil {
				s.Lock.Unlock()
				sendFail(conn, messageType, "disconnect", "Join first to disconnect.")
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
				// remove player from room slice
				pPtr.Room.Players = append(pPtr.Room.Players[:index], pPtr.Room.Players[index+1:]...)
				pPtr.Room = nil
			} else {
				s.Lock.Unlock()
				sendFail(conn, messageType, "disconnect", "Failed to disconnect the player.")
				continue
			}
			s.Lock.Unlock()

			ret := map[string]any{"response": "disconnect", "type": "ok", "data": true}
			jsonBytes, _ := json.Marshal(ret)
			_ = conn.WriteMessage(messageType, jsonBytes)

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
			// Protect mutation of direction with the server lock to avoid racing with updateGame
			s.Lock.Lock()
			if (pPtr.Snake.Direction+2)%4 != int(rdata.Direction) || pPtr.Snake.BodyLen <= 1 {
				pPtr.Snake.Direction = int(rdata.Direction)
			}
			s.Lock.Unlock()

		default:
			// ignore unknown messages
		}

		// perform any queued writes (none in current switch branches, but kept for pattern)
		for _, wj := range toWrite {
			if wj.conn != nil && wj.msg != nil {
				_ = wj.conn.WriteMessage(wj.msgType, wj.msg)
			}
		}
	}
	if pPtr != nil {
		s.Lock.Lock()
		pPtr.Socket = nil
		pPtr.LastActive = time.Now()
		s.Lock.Unlock()
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
			if p.Socket != nil {
				// still connected
				continue
			}
			if now.After(p.LastActive.Add(PLAYER_TIMEOUT)) {
				if p.Room != nil {
					// remove player from its room
					for j := range p.Room.Players {
						if p.ID == p.Room.Players[j].ID {
							p.Room.Players = append(p.Room.Players[:j], p.Room.Players[j+1:]...)
							break
						}
					}
					p.Room = nil
				}
				// optional: you could also remove the Player from s.PlayerConn here (left as-is)
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
		// We'll collect outgoing messages and perform writes after unlocking
		var writeJobs []writeJob

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

				// run game logic under lock
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
					// capture socket and message for later writing outside lock
					writeJobs = append(writeJobs, writeJob{conn: p.Socket, msgType: websocket.TextMessage, msg: jsonBytes})
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
					writeJobs = append(writeJobs, writeJob{conn: p.Socket, msgType: websocket.TextMessage, msg: jsonBytes})
				}
			}
		}

		// remove empty rooms - iterate backwards to avoid index shifting issues
		for _, eroom := range emptyRooms {
			for i := len(s.Room) - 1; i >= 0; i-- {
				if eroom == s.Room[i].UniqeID {
					s.Room = append(s.Room[:i], s.Room[i+1:]...)
				}
			}
		}

		s.Lock.Unlock()

		// perform writes outside the lock
		for _, wj := range writeJobs {
			if wj.conn != nil && wj.msg != nil {
				_ = wj.conn.WriteMessage(wj.msgType, wj.msg)
			}
		}
	}
}

// Broadcast failure message
func sendFail(conn *websocket.Conn, msgType int, responseTo string, reason string) {
	state := map[string]any{
		"response": responseTo,
		"type":     "fail",
		"data":     reason,
	}
	jsonBytes, _ := json.Marshal(state)
	_ = conn.WriteMessage(msgType, jsonBytes)
}

// Spawn food in the room
func (s *Server) spawnFood(room *Room) {
	f := Food{
		Position: Vector2{
			X: rand.Intn(ARENA_SIZEX),
			Y: rand.Intn(ARENA_SIZEY),
		},
	}
	room.Foods = append(room.Foods, f)
}

// Check collision between snakes (if crash into another snake)
func (s *Server) checkSnakesCollision(player *Player) {
	if player.Room == nil {
		return
	}
	if player.Snake == nil || len(player.Snake.Body) == 0 || player.Snake.Dead {
		return
	}
	head := player.Snake.Body[0]

	for _, p := range player.Room.Players {
		if p.ID == player.ID || p.Snake == nil || p.Snake.Dead {
			continue
		}
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
	if player.Room == nil {
		return
	}
	if player.Snake == nil || len(player.Snake.Body) == 0 {
		return
	}
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
