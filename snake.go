package main

import (
)

type Vector2 struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Snake struct {
	ID         int       `json:"id"`
	Body       []Vector2 `json:"body"`
	BodyLen    int       `json:"body_len"`
	Direction  int       `json:"dir"`
	Color      string    `json:"color"`
}
