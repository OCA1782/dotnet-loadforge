FROM golang:1.26-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /out/loadforge-worker ./cmd/worker/
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/loadforge ./cmd/cli/

FROM alpine:3.21 AS worker
RUN apk add --no-cache ca-certificates tzdata
COPY --from=build /out/loadforge-worker /usr/local/bin/loadforge-worker
ENTRYPOINT ["loadforge-worker"]

FROM alpine:3.21 AS cli
RUN apk add --no-cache ca-certificates tzdata
COPY --from=build /out/loadforge /usr/local/bin/loadforge
ENTRYPOINT ["loadforge"]
