package main

import (
	"github.com/gorilla/websocket"
)

type Player struct {
	ID         int              `json:"id"`
	Name       string           `json:"string"`
	InRoom     *int             `json:"room"`
	UniqeID    int              `json:"uniqe"`
	Socket     *websocket.Conn
};
