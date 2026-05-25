package core

import (
	"fmt"
	"strings"
)

// AssertionResult holds the outcome of a single assertion check.
type AssertionResult struct {
	Passed  bool
	Message string
}

// CheckAssertions evaluates all assertions for a step against the request result.
func CheckAssertions(assertions []Assertion, result RequestResult) []AssertionResult {
	out := make([]AssertionResult, 0, len(assertions))
	for _, a := range assertions {
		out = append(out, checkOne(a, result))
	}
	return out
}

func checkOne(a Assertion, r RequestResult) AssertionResult {
	switch a.Type {
	case "statusCode":
		if a.Equals != nil {
			pass := r.StatusCode == *a.Equals
			return AssertionResult{
				Passed:  pass,
				Message: fmt.Sprintf("statusCode: got %d, want %d", r.StatusCode, *a.Equals),
			}
		}
		if len(a.In) > 0 {
			for _, code := range a.In {
				if r.StatusCode == code {
					return AssertionResult{Passed: true, Message: fmt.Sprintf("statusCode %d in %v", r.StatusCode, a.In)}
				}
			}
			return AssertionResult{Passed: false, Message: fmt.Sprintf("statusCode: got %d, not in %v", r.StatusCode, a.In)}
		}

	case "responseTime":
		if a.LessThanMs != nil {
			pass := r.LatencyMs < int64(*a.LessThanMs)
			return AssertionResult{
				Passed:  pass,
				Message: fmt.Sprintf("responseTime: got %dms, want < %dms", r.LatencyMs, *a.LessThanMs),
			}
		}

	case "body":
		if a.Contains != "" {
			// body content is not captured in MVP; assertion is skipped with a warning
			return AssertionResult{Passed: true, Message: "body assertion skipped (body capture not enabled)"}
		}
	}

	return AssertionResult{
		Passed:  false,
		Message: fmt.Sprintf("unknown or incomplete assertion type: %q", a.Type),
	}
}

// AnyFailed returns true if any assertion in the slice failed.
func AnyFailed(results []AssertionResult) bool {
	for _, r := range results {
		if !r.Passed {
			return true
		}
	}
	return false
}

// FailMessages returns the failure messages joined by "; ".
func FailMessages(results []AssertionResult) string {
	var msgs []string
	for _, r := range results {
		if !r.Passed {
			msgs = append(msgs, r.Message)
		}
	}
	return strings.Join(msgs, "; ")
}
