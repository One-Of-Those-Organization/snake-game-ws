package main

import (
	"time"

	"github.com/gorilla/websocket"
)

// Data that let only server knows
type Player struct {
	ID              int              `json:"id"`
	Name            string           `json:"name"`
	Room            *Room            `json:"-"`
	UniqeID         string           `json:"unique_id"`
	Snake           *Snake           `json:"snake"`
	Socket          *websocket.Conn  `json:"-"`
	LastActive      time.Time        `json:"-"`
}

// Data that is safe to be broadcasted
type PlayerPublic struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	UniqeID string `json:"unique_id"`
}
