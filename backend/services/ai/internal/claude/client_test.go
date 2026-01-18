package claude

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ========== HTTP Mock Tests (always run) ==========

func TestClient_CreateMessage_MockServer(t *testing.T) {
	mockResponse := CreateMessageResponse{
		ID:   "msg_123",
		Type: "message",
		Role: "assistant",
		Content: []ContentBlock{
			{Type: "text", Text: "Hello! How can I help you today?"},
		},
		Model:      "claude-3-5-sonnet-20241022",
		StopReason: "end_turn",
		Usage: Usage{
			InputTokens:  10,
			OutputTokens: 15,
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/messages", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "test-api-key", r.Header.Get("x-api-key"))
		assert.Equal(t, AnthropicVersion, r.Header.Get("anthropic-version"))

		// Decode request body
		var req CreateMessageRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		require.NoError(t, err)
		assert.Equal(t, "claude-3-5-sonnet-20241022", req.Model)
		assert.Len(t, req.Messages, 1)
		assert.Equal(t, "user", req.Messages[0].Role)

		// Return mock response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	client := NewClient("test-api-key", WithBaseURL(server.URL))
	messages := []Message{{Role: "user", Content: "Hello"}}

	resp, err := client.CreateMessage(context.Background(), messages, "")

	require.NoError(t, err)
	assert.Equal(t, "msg_123", resp.ID)
	assert.Equal(t, "Hello! How can I help you today?", resp.GetText())
	assert.Equal(t, 10, resp.Usage.InputTokens)
	assert.Equal(t, 15, resp.Usage.OutputTokens)
}

func TestClient_CreateMessage_WithSystemPrompt(t *testing.T) {
	var receivedSystem string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req CreateMessageRequest
		json.NewDecoder(r.Body).Decode(&req)
		receivedSystem = req.System

		resp := CreateMessageResponse{
			ID:      "msg_456",
			Content: []ContentBlock{{Type: "text", Text: "Response"}},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewClient("test-api-key", WithBaseURL(server.URL))
	messages := []Message{{Role: "user", Content: "Test"}}
	systemPrompt := "You are a helpful assistant."

	_, err := client.CreateMessage(context.Background(), messages, systemPrompt)

	require.NoError(t, err)
	assert.Equal(t, "You are a helpful assistant.", receivedSystem)
}

func TestClient_CreateMessage_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		errResp := ErrorResponse{
			Type: "error",
			Error: APIError{
				Type:    "invalid_request_error",
				Message: "messages: field required",
			},
		}
		json.NewEncoder(w).Encode(errResp)
	}))
	defer server.Close()

	client := NewClient("test-api-key", WithBaseURL(server.URL))
	messages := []Message{}

	resp, err := client.CreateMessage(context.Background(), messages, "")

	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "invalid_request_error")
	assert.Contains(t, err.Error(), "messages: field required")
}

func TestClient_CreateMessage_Unauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		errResp := ErrorResponse{
			Type: "error",
			Error: APIError{
				Type:    "authentication_error",
				Message: "invalid x-api-key",
			},
		}
		json.NewEncoder(w).Encode(errResp)
	}))
	defer server.Close()

	client := NewClient("invalid-key", WithBaseURL(server.URL))
	messages := []Message{{Role: "user", Content: "Hello"}}

	resp, err := client.CreateMessage(context.Background(), messages, "")

	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "authentication_error")
}

func TestClient_Options(t *testing.T) {
	client := NewClient("api-key",
		WithModel("claude-3-opus-20240229"),
		WithMaxTokens(8192),
	)

	assert.Equal(t, "claude-3-opus-20240229", client.model)
	assert.Equal(t, 8192, client.maxTokens)
}

func TestCreateMessageResponse_GetText(t *testing.T) {
	t.Run("single text block", func(t *testing.T) {
		resp := &CreateMessageResponse{
			Content: []ContentBlock{
				{Type: "text", Text: "Hello world"},
			},
		}
		assert.Equal(t, "Hello world", resp.GetText())
	})

	t.Run("multiple text blocks", func(t *testing.T) {
		resp := &CreateMessageResponse{
			Content: []ContentBlock{
				{Type: "text", Text: "Hello "},
				{Type: "text", Text: "world"},
			},
		}
		assert.Equal(t, "Hello world", resp.GetText())
	})

	t.Run("empty content", func(t *testing.T) {
		resp := &CreateMessageResponse{
			Content: []ContentBlock{},
		}
		assert.Equal(t, "", resp.GetText())
	})

	t.Run("non-text blocks ignored", func(t *testing.T) {
		resp := &CreateMessageResponse{
			Content: []ContentBlock{
				{Type: "text", Text: "Hello"},
				{Type: "tool_use", Text: "ignored"},
			},
		}
		assert.Equal(t, "Hello", resp.GetText())
	})
}

// ========== Real API Tests (skip if ANTHROPIC_API_KEY not set) ==========

func TestClient_RealAPI_CreateMessage(t *testing.T) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		t.Skip("ANTHROPIC_API_KEY not set, skipping real API test")
	}

	client := NewClient(apiKey)
	messages := []Message{
		{Role: "user", Content: "Say 'test successful' and nothing else."},
	}

	resp, err := client.CreateMessage(context.Background(), messages, "")

	require.NoError(t, err)
	assert.NotEmpty(t, resp.ID)
	assert.Contains(t, resp.GetText(), "test successful")
	assert.Greater(t, resp.Usage.InputTokens, 0)
	assert.Greater(t, resp.Usage.OutputTokens, 0)

	t.Logf("Response: %s", resp.GetText())
	t.Logf("Tokens: input=%d, output=%d", resp.Usage.InputTokens, resp.Usage.OutputTokens)
}
