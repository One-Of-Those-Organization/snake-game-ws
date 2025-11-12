package main

import (
)

type Vector2 struct {
	X, Y int
};

type Snake struct {
	Body       []Vector2 `json:"body"`
	BodyLen    int       `json:"body_len"`
	Direction  int       `json:"dir"`
	Color      string    `json:"color"`
	Dead       bool      `json:"dead"`
};
