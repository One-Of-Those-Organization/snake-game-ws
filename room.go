package main

import (
)

type Room struct {
	UniqeID string    `json:"id"`
	Players []*Player `json:"players"`
	Foods   []Food    `json:"foods"`
};
