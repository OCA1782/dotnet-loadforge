package random

import (
	"crypto/rand"
	mrand "math/rand/v2"
	"time"
)

// Jitter returns a random duration within ±pct percent of base.
func Jitter(base time.Duration, pct float64) time.Duration {
	delta := float64(base) * pct
	return base + time.Duration((mrand.Float64()*2-1)*delta)
}

// UUIDv4 returns a random UUID string.
func UUIDv4() string {
	var b [16]byte
	rand.Read(b[:]) //nolint:errcheck // crypto/rand.Read never returns error
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return formatUUID(b)
}

func formatUUID(b [16]byte) string {
	const hx = "0123456789abcdef"
	buf := make([]byte, 36)
	j := 0
	for i := 0; i < 36; i++ {
		switch i {
		case 8, 13, 18, 23:
			buf[i] = '-'
		default:
			buf[i] = hx[b[j]>>4]
			i++
			buf[i] = hx[b[j]&0x0f]
			j++
		}
	}
	return string(buf)
}
