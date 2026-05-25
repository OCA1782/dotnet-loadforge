package core

import "testing"

func TestCheckAssertions_StatusCodeEquals_Pass(t *testing.T) {
	code := 200
	assertions := []Assertion{{Type: "statusCode", Equals: &code}}
	result := RequestResult{StatusCode: 200, LatencyMs: 50}

	results := CheckAssertions(assertions, result)
	if len(results) != 1 || !results[0].Passed {
		t.Errorf("expected pass, got: %+v", results)
	}
}

func TestCheckAssertions_StatusCodeEquals_Fail(t *testing.T) {
	code := 200
	assertions := []Assertion{{Type: "statusCode", Equals: &code}}
	result := RequestResult{StatusCode: 404, LatencyMs: 50}

	results := CheckAssertions(assertions, result)
	if len(results) != 1 || results[0].Passed {
		t.Errorf("expected fail, got: %+v", results)
	}
}

func TestCheckAssertions_StatusCodeIn_Pass(t *testing.T) {
	assertions := []Assertion{{Type: "statusCode", In: []int{200, 201}}}
	result := RequestResult{StatusCode: 201, LatencyMs: 30}

	results := CheckAssertions(assertions, result)
	if !results[0].Passed {
		t.Errorf("expected pass for 201 in [200,201]")
	}
}

func TestCheckAssertions_ResponseTime_Pass(t *testing.T) {
	ms := 500
	assertions := []Assertion{{Type: "responseTime", LessThanMs: &ms}}
	result := RequestResult{StatusCode: 200, LatencyMs: 300}

	results := CheckAssertions(assertions, result)
	if !results[0].Passed {
		t.Errorf("expected pass for 300ms < 500ms")
	}
}

func TestCheckAssertions_ResponseTime_Fail(t *testing.T) {
	ms := 500
	assertions := []Assertion{{Type: "responseTime", LessThanMs: &ms}}
	result := RequestResult{StatusCode: 200, LatencyMs: 600}

	results := CheckAssertions(assertions, result)
	if results[0].Passed {
		t.Errorf("expected fail for 600ms < 500ms")
	}
}

func TestAnyFailed(t *testing.T) {
	if AnyFailed([]AssertionResult{{Passed: true}, {Passed: true}}) {
		t.Error("expected no failure")
	}
	if !AnyFailed([]AssertionResult{{Passed: true}, {Passed: false, Message: "x"}}) {
		t.Error("expected failure")
	}
}
