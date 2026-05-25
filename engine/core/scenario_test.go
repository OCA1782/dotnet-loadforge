package core

import (
	"testing"
)

const validYAML = `
version: "1.0"
name: smoke-test
config:
  duration: 30s
  virtualUsers: 5
  rampUp: 5s
  targetRps: 10
  thinkTime: 100ms
environments:
  default:
    baseUrl: "http://localhost:8080"
steps:
  - name: get-health
    protocol: http
    request:
      method: GET
      url: "/health"
    assertions:
      - type: statusCode
        equals: 200
      - type: responseTime
        lessThanMs: 500
`

func TestParse_ValidYAML(t *testing.T) {
	s, err := Parse([]byte(validYAML), "scenario.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.Name != "smoke-test" {
		t.Errorf("name = %q, want smoke-test", s.Name)
	}
	if s.Config.VirtualUsers != 5 {
		t.Errorf("virtualUsers = %d, want 5", s.Config.VirtualUsers)
	}
	if len(s.Steps) != 1 {
		t.Errorf("steps count = %d, want 1", len(s.Steps))
	}
}

func TestParse_MissingName(t *testing.T) {
	yaml := `
config:
  virtualUsers: 5
steps:
  - name: step1
    request:
      url: /foo
`
	_, err := Parse([]byte(yaml), "x.yaml")
	if err == nil {
		t.Fatal("expected error for missing name, got nil")
	}
}

func TestParse_MissingSteps(t *testing.T) {
	yaml := `
name: test
config:
  virtualUsers: 5
steps: []
`
	_, err := Parse([]byte(yaml), "x.yaml")
	if err == nil {
		t.Fatal("expected error for empty steps, got nil")
	}
}
