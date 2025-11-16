package main

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
)

// Message struct for communication
type Message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// Converts HSL (0–360, 0–1, 0–1) to RGB (0–255 each)
func HSLToRGB(h, s, l float64) (r, g, b int) {
	c := (1 - math.Abs(2*l-1)) * s
	x := c * (1 - math.Abs(math.Mod(h/60, 2)-1))
	m := l - c/2

	var r1, g1, b1 float64
	switch {
	case h < 60:
		r1, g1, b1 = c, x, 0
	case h < 120:
		r1, g1, b1 = x, c, 0
	case h < 180:
		r1, g1, b1 = 0, c, x
	case h < 240:
		r1, g1, b1 = 0, x, c
	case h < 300:
		r1, g1, b1 = x, 0, c
	default:
		r1, g1, b1 = c, 0, x
	}

	r = int((r1 + m) * 255)
	g = int((g1 + m) * 255)
	b = int((b1 + m) * 255)
	return
}

func generate_random_color() string {
	h := rand.Float64() * 360       // random hue 0–360
	s := 1.0                        // full saturation
	l := 0.5 + rand.Float64()*0.2   // slightly bright (0.5–0.7)
	r, g, b := HSLToRGB(h, s, l)

	// Clamp brightness to 100–255 if needed
	if r < 100 { r = 100 }
	if g < 100 { g = 100 }
	if b < 100 { b = 100 }

	color := fmt.Sprintf("#%02x%02x%02x", r, g, b)
	return color
}
