package main

import (
	"github.com/gorilla/websocket"
)

type Player struct {
	ID         int              `json:"id"`
	Name       string           `json:"string"`
	Room       *Room            `json:"room"`
	UniqeID    int              `json:"uniqe"`
	Snake      *Snake           `json:"snake"`
	Socket     *websocket.Conn
};

type PlayerPublic struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	UniqeID int    `json:"unique_id"`
}

