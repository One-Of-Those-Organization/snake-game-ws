package main

import (
	"log"
	"fmt"
	"sync"
	"github.com/gorilla/websocket"
	"net/http"
	"encoding/json"
	"strconv"
)

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

	// TODO: Add timer and if this `player` didnt send anything then disconnect them!
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
			case "connect": {
				s.Lock.Lock()
				defer s.Lock.Unlock()

				newPlayer := Player{
					ID: s.Counter,
					Name: msgData,
					Socket: conn,
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
			case "join": {
				s.Lock.Lock()
				defer s.Lock.Unlock()

				for _, p := range s.PlayerConn {
					if p.Socket == conn {
						convert, err := strconv.Atoi(msgData)
						if err != nil { sendFail(conn, messageType, fmt.Sprintf("%v", err)) }
						*p.InRoom = convert;
						break
					}
				}

				// TODO: Return snake
				ret := map[string]any{
					"type": "snake",
					"data": nil,
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
