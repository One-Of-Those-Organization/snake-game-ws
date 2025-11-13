package main

import (
	"github.com/gorilla/websocket"
)

type Player struct {
	ID         int              `json:"id"`
	Name       string           `json:"string"`
	Room       *Room            `json:"room"`
	UniqeID    string           `json:"uniqe"`
	Snake      *Snake           `json:"snake"`
	Socket     *websocket.Conn  `json:"-"`
};

type PlayerPublic struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	UniqeID string `json:"unique_id"`
}

