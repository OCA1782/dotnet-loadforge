package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/loadforge/engine/core"
	httprunner "github.com/loadforge/engine/protocols/http"
	"github.com/loadforge/engine/internal/random"
	nats "github.com/nats-io/nats.go"
)

const (
	streamName     = "LOADFORGE_SHARDS"
	subject        = "loadforge.shard.jobs"
	consumerName   = "go-worker-pool"
	heartbeatEvery = 15 * time.Second
	fetchTimeout   = 5 * time.Second
)

func main() {
	natsURL := envOrDefault("NATS_URL", nats.DefaultURL)
	workerID := envOrDefault("WORKER_ID", buildWorkerID())

	log.Printf("[worker] %s starting — NATS: %s", workerID, natsURL)

	nc, err := nats.Connect(natsURL,
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(2*time.Second),
		nats.DisconnectErrHandler(func(_ *nats.Conn, e error) {
			log.Printf("[worker] NATS disconnected: %v", e)
		}),
		nats.ReconnectHandler(func(_ *nats.Conn) {
			log.Println("[worker] NATS reconnected")
		}),
	)
	if err != nil {
		log.Fatalf("[worker] nats connect: %v", err)
	}
	defer nc.Close()

	js, err := nc.JetStream()
	if err != nil {
		log.Fatalf("[worker] jetstream: %v", err)
	}

	ensureStream(js)

	sub, err := js.PullSubscribe(
		subject,
		consumerName,
		nats.ManualAck(),
		nats.AckWait(15*time.Minute),
		nats.MaxDeliver(3),
		nats.BindStream(streamName),
	)
	if err != nil {
		log.Fatalf("[worker] subscribe: %v", err)
	}
	defer sub.Unsubscribe()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Printf("[worker] %s ready — waiting for shard jobs", workerID)

	for {
		select {
		case <-ctx.Done():
			log.Println("[worker] shutting down")
			return
		default:
		}

		msgs, err := sub.Fetch(1, nats.MaxWait(fetchTimeout))
		if err == nats.ErrTimeout {
			continue
		}
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("[worker] fetch error: %v — retrying in 1s", err)
			time.Sleep(time.Second)
			continue
		}

		for _, msg := range msgs {
			processJob(ctx, msg, workerID)
		}
	}
}

func processJob(ctx context.Context, msg *nats.Msg, workerID string) {
	var job ShardJobMessage
	if err := json.Unmarshal(msg.Data, &job); err != nil {
		log.Printf("[worker] invalid payload: %v", err)
		_ = msg.Nak()
		return
	}

	log.Printf("[worker] %s — shard %d/%d run=%s", workerID, job.ShardIndex+1, job.ShardCount, job.TestRunId)

	plan, err := planFromJob(&job)
	if err != nil {
		log.Printf("[worker] plan error: %v", err)
		_ = msg.Nak()
		return
	}

	baseURL := ""
	if plan.Steps[0].Request.URL == "" {
		log.Printf("[worker] no URL in scenario steps")
		_ = msg.Nak()
		return
	}

	runner := httprunner.NewRunner(baseURL, nil)
	engine := core.NewEngine(plan, runner)
	streamer := core.NewStreamer(job.TestRunId, job.ApiBaseUrl, 5*time.Second, engine.Metrics())

	jobCtx, jobCancel := context.WithCancel(ctx)

	streamDone := make(chan struct{})
	go func() {
		defer close(streamDone)
		streamer.Run(jobCtx)
	}()

	hbDone := make(chan struct{})
	go func() {
		defer close(hbDone)
		sendHeartbeats(jobCtx, job.ApiBaseUrl, job.ShardId)
	}()

	engine.Run(jobCtx)
	jobCancel()

	<-streamDone
	<-hbDone

	snap := engine.Metrics().Snapshot()
	passed := evaluateQualityGate(&job, snap)

	log.Printf("[worker] shard %d/%d done — reqs:%d errors:%d p95:%dms passed:%v",
		job.ShardIndex+1, job.ShardCount, snap.TotalRequests, snap.TotalErrors, snap.P95Ms, passed)

	reportShardComplete(job.ApiBaseUrl, job.ShardId, passed, snap)

	_ = msg.Ack()
}

func sendHeartbeats(ctx context.Context, apiBaseURL, shardID string) {
	ticker := time.NewTicker(heartbeatEvery)
	defer ticker.Stop()

	client := &http.Client{Timeout: 5 * time.Second}
	endpoint := apiBaseURL + "/internal/shards/" + shardID + "/heartbeat"

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			resp, err := client.Post(endpoint, "application/json", nil)
			if err != nil {
				log.Printf("[worker] heartbeat error: %v", err)
				continue
			}
			resp.Body.Close()
		}
	}
}

type completePayload struct {
	Passed    bool    `json:"passed"`
	ErrorRate float64 `json:"errorRate"`
	P95Ms     int64   `json:"p95Ms"`
	P99Ms     int64   `json:"p99Ms"`
}

func reportShardComplete(apiBaseURL, shardID string, passed bool, snap core.MetricSnapshot) {
	payload := completePayload{
		Passed:    passed,
		ErrorRate: snap.ErrorRate,
		P95Ms:     snap.P95Ms,
		P99Ms:     snap.P99Ms,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[worker] marshal complete payload: %v", err)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	endpoint := apiBaseURL + "/internal/shards/" + shardID + "/complete"

	resp, err := client.Post(endpoint, "application/json", bytes.NewReader(data))
	if err != nil {
		log.Printf("[worker] report complete error: %v", err)
		return
	}
	resp.Body.Close()
}

func ensureStream(js nats.JetStreamContext) {
	cfg := &nats.StreamConfig{
		Name:     streamName,
		Subjects: []string{subject},
		MaxAge:   24 * time.Hour,
		Storage:  nats.FileStorage,
	}
	if _, err := js.AddStream(cfg); err != nil {
		if _, err2 := js.UpdateStream(cfg); err2 != nil {
			log.Printf("[worker] stream setup (may already exist): %v", err)
		}
	}
}

func buildWorkerID() string {
	host, _ := os.Hostname()
	uid := random.UUIDv4()
	if len(uid) >= 8 {
		return host + "-" + uid[:8]
	}
	return host
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
