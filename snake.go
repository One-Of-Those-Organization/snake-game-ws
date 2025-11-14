package main

import (
)

type Vector2 struct {
	X int `json:"x"`
	Y int `json:"y"`
};

type Snake struct {
	Body       []Vector2 `json:"body"`
	BodyLen    int       `json:"body_len"`
	Direction  int       `json:"dir"`
	Color      string    `json:"color"`
	Dead       bool      `json:"dead"`
};

func (s *Snake) move() {
	if len(s.Body) == 0 { return }
	head := s.Body[0]
	switch s.Direction {
	case 0:
		head.X += 1
	case 1:
		head.Y += 1
	case 2:
		head.X -= 1
	case 3:
		head.Y -= 1
	}

	if head.X >= ARENA_SIZEX { head.X = 0 }
	if head.X < 0            { head.X = ARENA_SIZEX - 1 }
	if head.Y >= ARENA_SIZEY { head.Y = 0 }
	if head.Y < 0            { head.Y = ARENA_SIZEY - 1 }

	s.Body = append([]Vector2{head}, s.Body...)
	for len(s.Body) > s.BodyLen {
		s.Body = s.Body[:len(s.Body)-1]
	}
}

func (s *Snake) checkSelfCollision() {
	head := s.Body[0]
	for i := 1; i < len(s.Body); i++ {
		if s.Body[i].X == head.X && s.Body[i].Y == head.Y {
			s.Dead = true
			return
		}
	}
}
