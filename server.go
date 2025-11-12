package main

import (
	"encoding/json"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const ARENA_SIZEX = 32
const ARENA_SIZEY = 32

type PlayerPublic struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	UniqeID int    `json:"unique_id"`
}

type Server struct {
	PlayerConn []*Player
	Upgrade    websocket.Upgrader
	Counter    int
	Lock       sync.Mutex
}

type Message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
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
			newPlayer := &Player{
				ID:      newID,
				Name:    name,
				Socket:  conn,
				Snake:   nil,
				UniqeID: rand.Intn(math.MaxInt32),
			}
			s.PlayerConn = append(s.PlayerConn, newPlayer)
			s.Lock.Unlock()

			pub := PlayerPublic{ID: newPlayer.ID, Name: newPlayer.Name, UniqeID: newPlayer.UniqeID}
			ret := map[string]any{"type": "player", "data": pub}
			jsonBytes, _ := json.Marshal(ret)
			conn.WriteMessage(messageType, jsonBytes)

		case "reconnect":
			var rdata struct {
				ID       int `json:"id"`
				UniqueID int `json:"unique_id"`
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

		case "join":
			var room int
			if err := json.Unmarshal(incoming.Data, &room); err != nil {
				var tmp struct {
					Room int `json:"room"`
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
				Color:     "white",
				Direction: rand.Intn(4),
			}

			s.Lock.Lock()
			for _, p := range s.PlayerConn {
				if p.Socket == conn {
					p.Snake = createdSnake
					if p.Room == nil {
						// TODO: Do the whole room stuff
					}

					ret := map[string]any{"type": "snake", "data": createdSnake}
					jsonBytes, _ := json.Marshal(ret)
					conn.WriteMessage(messageType, jsonBytes)
					break
				}
			}
			s.Lock.Unlock()

		case "input":
			var dummy any
			_ = json.Unmarshal(incoming.Data, &dummy)

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
	s.Lock.Unlock()

	log.Println("Client disconnected (handler exit)")
}

func (s *Server) updateGame() {
}

func sendFail(conn *websocket.Conn, msgType int, reason string) {
	state := map[string]any{
		"type": "fail",
		"data": reason,
	}
	jsonBytes, _ := json.Marshal(state)
	_ = conn.WriteMessage(msgType, jsonBytes)
}
