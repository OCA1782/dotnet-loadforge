package clock

import "time"

func Now() time.Time          { return time.Now() }
func Since(t time.Time) int64 { return time.Since(t).Milliseconds() }
