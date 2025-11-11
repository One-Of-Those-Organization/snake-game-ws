package main

import (
	"math"
	"math/rand"
	"log"
	"fmt"
	"sync"
	"github.com/gorilla/websocket"
	"net/http"
	"encoding/json"
	"strconv"
	"time"
)

const ARENA_SIZEX = 32
const ARENA_SIZEY = 32

type Server struct {
	PlayerConn []Player;
	Upgrade    websocket.Upgrader
	Counter    int
	Lock       sync.Mutex
};

func (s *Server) handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := s.Upgrade.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Gagal upgrade ke WebSocket:", err)
		return
	}
	defer conn.Close()

	timeout := 120 * time.Second
	conn.SetReadDeadline(time.Now().Add(timeout))

	// TODO: Add timer and if this `player` didnt send anything then disconnect them!
	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Client terputus:", err)
			break
		}

		conn.SetReadDeadline(time.Now().Add(timeout))

		var data map[string]any
		if err := json.Unmarshal(msg, &data); err != nil {
			log.Println("Error decode:", err)
			continue
		}

		msgType, _ := data["type"].(string)

		switch msgType {
			case "connect": {
				s.Lock.Lock()
				defer s.Lock.Unlock()

				msgData, err := data["data"].(string)
				if err { sendFail(conn, messageType, "Failed to parse data to string!") }
				newPlayer := Player{
					ID: s.Counter,
					Name: msgData,
					Socket: conn,
					Snake: nil,
					UniqeID: rand.Intn(math.MaxInt),
				}
				s.Counter++
				s.PlayerConn = append(s.PlayerConn, newPlayer)

				ret := map[string]any{
					"type": "player",
					"data": newPlayer,
				}
				jsonBytes, _ := json.Marshal(ret)
				conn.WriteMessage(messageType, jsonBytes)

				break;
			}
			case "reconnect":{
				s.Lock.Lock()
				defer s.Lock.Unlock()

				msgData, err := data["data"].(struct { ID float64; UniqueID float64; })
				if err { sendFail(conn, messageType, "Failed to parse data to a custom struct") }

				for _, p := range s.PlayerConn {
					if p.ID == int(msgData.ID) && p.UniqeID == int(msgData.UniqueID) {
						if p.Socket != nil { p.Socket.Close() }
						p.Socket = conn
						ret := map[string]any{
							"type": "player",
							"data": p,
						}
						jsonBytes, _ := json.Marshal(ret)
						conn.WriteMessage(messageType, jsonBytes)
						break
					}
				}
				sendFail(conn, messageType, "Failed to reconnect with that id and uniqeid!")

				break;
			}
			case "join": {
				s.Lock.Lock()
				defer s.Lock.Unlock()

				msgData, err := data["data"].(string)
				if err { sendFail(conn, messageType, "Failed to parse data to string!") }
				for _, p := range s.PlayerConn {
					if p.Socket == conn {
						convert, err := strconv.Atoi(msgData)
						if err != nil { sendFail(conn, messageType, fmt.Sprintf("%v", err)) }
						*p.InRoom = convert;
						break
					}
				}

				newSnake := Snake{
					Body:      []Vector2{{x: rand.Intn(ARENA_SIZEX), y: rand.Intn(ARENA_SIZEY)}},
					BodyLen:   1,
					Color:     "white",
					Direction: rand.Intn(4),
				}

				for _, p := range s.PlayerConn {
					if p.Socket == conn {
						*p.Snake = newSnake
						break
					}
				}

				ret := map[string]any{
					"type": "snake",
					"data": newSnake,
				}

				jsonBytes, _ := json.Marshal(ret)
				conn.WriteMessage(messageType, jsonBytes)

				break;
			}
			default: {
				break;
			}
		}
	}
}

func (s *Server) updateGame() {
}

func sendFail(conn *websocket.Conn, msgType int, reason string) {
	state := map[string]any{
		"type": "fail",
		"data": reason,
	}
	jsonBytes, _ := json.Marshal(state)
	conn.WriteMessage(msgType, jsonBytes)
}
