package core

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// Scenario is the root of the LoadForge DSL.
type Scenario struct {
	Version     string            `yaml:"version"     json:"version"`
	Name        string            `yaml:"name"        json:"name"`
	Config      ScenarioConfig    `yaml:"config"      json:"config"`
	Environments map[string]Env   `yaml:"environments" json:"environments"`
	Steps       []Step            `yaml:"steps"       json:"steps"`
}

type ScenarioConfig struct {
	Duration     string `yaml:"duration"     json:"duration"`     // e.g. "10m"
	VirtualUsers int    `yaml:"virtualUsers" json:"virtualUsers"`
	RampUp       string `yaml:"rampUp"       json:"rampUp"`       // e.g. "2m"
	TargetRps    int    `yaml:"targetRps"    json:"targetRps"`
	ThinkTime    string `yaml:"thinkTime"    json:"thinkTime"`    // e.g. "250ms"
}

type Env struct {
	BaseURL   string            `yaml:"baseUrl"   json:"baseUrl"`
	Variables map[string]string `yaml:"variables" json:"variables"`
}

type Step struct {
	Name      string     `yaml:"name"      json:"name"`
	Protocol  string     `yaml:"protocol"  json:"protocol"` // "http", "grpc", "ws"
	Request   Request    `yaml:"request"   json:"request"`
	Assertions []Assertion `yaml:"assertions" json:"assertions"`
}

type Request struct {
	Method  string            `yaml:"method"  json:"method"`
	URL     string            `yaml:"url"     json:"url"`
	Headers map[string]string `yaml:"headers" json:"headers"`
	Body    *Body             `yaml:"body"    json:"body"`
	TimeoutMs int             `yaml:"timeoutMs" json:"timeoutMs"`
}

type Body struct {
	JSON interface{} `yaml:"json" json:"json"`
	Raw  string      `yaml:"raw"  json:"raw"`
}

type Assertion struct {
	Type        string `yaml:"type"        json:"type"`        // statusCode, responseTime, body
	Equals      *int   `yaml:"equals"      json:"equals"`
	In          []int  `yaml:"in"          json:"in"`
	LessThanMs  *int   `yaml:"lessThanMs"  json:"lessThanMs"`
	Contains    string `yaml:"contains"    json:"contains"`
}

// ParseFile reads and parses a YAML or JSON scenario file.
func ParseFile(path string) (*Scenario, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading scenario file: %w", err)
	}
	return Parse(data, path)
}

// Parse parses scenario content from bytes; format is inferred from path extension.
func Parse(data []byte, path string) (*Scenario, error) {
	s, err := ParseRaw(data, path)
	if err != nil {
		return nil, err
	}
	if err := validate(s); err != nil {
		return nil, err
	}
	return s, nil
}

// ParseRaw parses without validation; callers can override fields then call BuildPlan.
func ParseRaw(data []byte, path string) (*Scenario, error) {
	var s Scenario
	var err error

	if strings.HasSuffix(path, ".json") {
		err = json.Unmarshal(data, &s)
	} else {
		err = yaml.Unmarshal(data, &s)
	}

	if err != nil {
		return nil, fmt.Errorf("parsing scenario: %w", err)
	}
	return &s, nil
}

func validate(s *Scenario) error {
	if s.Name == "" {
		return fmt.Errorf("scenario.name is required")
	}
	if s.Config.VirtualUsers <= 0 {
		return fmt.Errorf("scenario.config.virtualUsers must be > 0")
	}
	if len(s.Steps) == 0 {
		return fmt.Errorf("scenario must have at least one step")
	}
	for i, step := range s.Steps {
		if step.Name == "" {
			return fmt.Errorf("step[%d].name is required", i)
		}
		if step.Request.URL == "" {
			return fmt.Errorf("step[%d].request.url is required", i)
		}
		if step.Protocol == "" {
			s.Steps[i].Protocol = "http"
		}
	}
	return nil
}
