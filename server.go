package main

import (
	"strings"
	"strconv"
	"encoding/json"
	"log"
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const ARENA_SIZEX = 32
const ARENA_SIZEY = 32

type Server struct {
	PlayerConn []*Player
	Room       []Room
	Upgrade    websocket.Upgrader
	Counter    int
	Lock       sync.Mutex
}

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

	for {
		messageType, msgBytes, err := conn.ReadMessage()
		if err != nil {
			log.Println("ReadMessage error / client disconnected:", err)
			break
		}
		conn.SetReadDeadline(time.Now().Add(timeout))

		var incoming Message
		if err := json.Unmarshal(msgBytes, &incoming); err != nil {
			log.Println("Invalid JSON message:", err)
			sendFail(conn, messageType, "Invalid JSON")
			continue
		}

		switch incoming.Type {
		case "connect":
			var name string
			if err := json.Unmarshal(incoming.Data, &name); err != nil {
				var tmp struct{ Name string `json:"name"` }
				if err2 := json.Unmarshal(incoming.Data, &tmp); err2 != nil {
					sendFail(conn, messageType, "Failed to parse connect data")
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
				Snake:   nil,
				UniqeID: strings.ToUpper(fmt.Sprintf("%05s", strconv.FormatInt(rand.Int63n(36*36*36*36*36), 36))),
			}
			s.PlayerConn = append(s.PlayerConn, pPtr)
			s.Lock.Unlock()

			pub := PlayerPublic{ID: pPtr.ID, Name: pPtr.Name, UniqeID: pPtr.UniqeID}
			ret := map[string]any{"type": "player", "data": pub}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

		case "reconnect":
			var rdata struct {
				ID       int    `json:"id"`
				UniqueID string `json:"unique_id"`
			}
			if err := json.Unmarshal(incoming.Data, &rdata); err != nil {
				sendFail(conn, messageType, "Failed to parse reconnect data")
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
					ret := map[string]any{"type": "player", "data": pub}
					jsonBytes, _ := json.Marshal(ret)
					conn.WriteMessage(messageType, jsonBytes)
					found = true
					break
				}
			}
			s.Lock.Unlock()

			if !found {
				sendFail(conn, messageType, "Failed to reconnect with that id and unique_id")
			}

		case "create":
			newSnake := Snake {
				Body:      []Vector2{{X: rand.Intn(ARENA_SIZEX), Y: rand.Intn(ARENA_SIZEY)}},
				BodyLen:   1,
				Color:     generate_random_color(),
				Direction: rand.Intn(4),
			}
			pPtr.Snake = &newSnake
			newRoom := Room {
				UniqeID: strings.ToUpper(fmt.Sprintf("%05s", strconv.FormatInt(rand.Int63n(36*36*36*36*36), 36))),
				Players: make([]*Player, 1),
				Foods: make([]Food, 10),
			}
			newRoom.Players = append(newRoom.Players, pPtr)
			s.Room = append(s.Room, newRoom)
			ret := map[string]any{"type": "room", "data": newRoom}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

		case "join":
			if pPtr == nil {
				sendFail(conn, messageType, "Connect first to access join.")
				continue
			}
			var room string
			if err := json.Unmarshal(incoming.Data, &room); err != nil {
				var tmp struct {
					Room string `json:"room"`
				}
				if err2 := json.Unmarshal(incoming.Data, &tmp); err2 != nil {
					sendFail(conn, messageType, "Failed to parse join data")
					continue
				}
				room = tmp.Room
			}

			createdSnake := &Snake{
				Body:      []Vector2{{X: rand.Intn(ARENA_SIZEX), Y: rand.Intn(ARENA_SIZEY)}},
				BodyLen:   1,
				Color:     generate_random_color(),
				Direction: rand.Intn(4),
			}

			var roomPtr *Room = nil
			for _, r := range s.Room {
				if r.UniqeID == room {
					roomPtr = &r
					break
				}
			}

			if roomPtr == nil {
				sendFail(conn, messageType, "There is no room with that id.")
				continue
			}

			s.Lock.Lock()
			for _, p := range s.PlayerConn {
				if p.Socket == conn {
					p.Snake = createdSnake
					if p.Room == nil {
						p.Room = roomPtr
					} else {
						sendFail(conn, messageType, "Already joined another room.")
						break
					}
					// NOTE: What todo when player is on other room and trying to join
					// diff room? should it be stopped? i think it should

					ret := map[string]any{"type": "snake", "data": createdSnake}
					jsonBytes, _ := json.Marshal(ret)
					conn.WriteMessage(messageType, jsonBytes)
					break
				}
			}
			s.Lock.Unlock()

		case "disconnect":
			s.Lock.Lock()
			if pPtr == nil {
				sendFail(conn, messageType, "Connect first to access disconnect.")
				continue
			}
			if pPtr.Room == nil {
				sendFail(conn, messageType, "Join first to disconnect.")
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

			ret := map[string]any{"type": "ok", "data": true}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

			s.Lock.Unlock()


		case "input":
			var rdata struct {
				Direction int `json:"dir"`
			}
			if err := json.Unmarshal(incoming.Data, &rdata); err != nil {
				sendFail(conn, messageType, "Failed to parse reconnect data")
				continue
			}
			if (pPtr.Snake.Direction+2)%4 != int(rdata.Direction) || pPtr.Snake.BodyLen <= 1 {
				pPtr.Snake.Direction = int(rdata.Direction)
			}

		default:
		}
	}

	s.Lock.Lock()
	index := -1
	for i, p := range s.PlayerConn {
		if p.Socket == conn {
			index = i
			break
		}
	}
	if index >= 0 {
		s.PlayerConn = append(s.PlayerConn[:index], s.PlayerConn[index+1:]...)
	}
	// TODO: Disconnect from room too
	s.Lock.Unlock()

	log.Println("Client disconnected (handler exit)")
}

func (s *Server) updateGame() {
	ticker := time.NewTicker(150 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		s.Lock.Lock()

		// TODO: Finish this: backup/server.go:240
		for _, conn := range s.PlayerConn {
			conn.Socket.WriteMessage(websocket.TextMessage, make([]byte, 10))
		}

		s.Lock.Unlock()
	}
}

func sendFail(conn *websocket.Conn, msgType int, reason string) {
	state := map[string]any{
		"type": "fail",
		"data": reason,
	}
	jsonBytes, _ := json.Marshal(state)
	_ = conn.WriteMessage(msgType, jsonBytes)
}
