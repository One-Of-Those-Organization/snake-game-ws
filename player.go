package main

import (
	"time"
	"github.com/gorilla/websocket"
)

type Player struct {
	ID              int              `json:"id"`
	Name            string           `json:"name"`
	Room            *Room            `json:"room"`
	UniqeID         string           `json:"unique_id"`
	Snake           *Snake           `json:"snake"`
	Socket          *websocket.Conn  `json:"-"`
	DisconnectedAt  *time.Time       `json:"-"`
	IsConnected     bool             `json:"-"`
}

type PlayerPublic struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	UniqeID string `json:"unique_id"`
}
