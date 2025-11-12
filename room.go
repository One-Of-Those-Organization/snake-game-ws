package main

import (
)

type Room struct {
	UniqeID int       `json:"id"`
	Players []*Player `json:"players"`
	Foods   []Food    `json:"foods"`
};
