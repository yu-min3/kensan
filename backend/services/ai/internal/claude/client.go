package claude

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	DefaultBaseURL     = "https://api.anthropic.com/v1"
	DefaultModel       = "claude-3-5-sonnet-20241022"
	DefaultMaxTokens   = 4096
	AnthropicVersion   = "2023-06-01"
	DefaultTimeout     = 120 * time.Second
)

// Client represents a Claude API client
type Client struct {
	apiKey     string
	baseURL    string
	model      string
	maxTokens  int
	httpClient *http.Client
}

// ClientOption is a function that configures a Client
type ClientOption func(*Client)

// WithBaseURL sets the base URL for the client
func WithBaseURL(url string) ClientOption {
	return func(c *Client) {
		c.baseURL = url
	}
}

// WithModel sets the model for the client
func WithModel(model string) ClientOption {
	return func(c *Client) {
		c.model = model
	}
}

// WithMaxTokens sets the max tokens for the client
func WithMaxTokens(maxTokens int) ClientOption {
	return func(c *Client) {
		c.maxTokens = maxTokens
	}
}

// WithTimeout sets the HTTP client timeout
func WithTimeout(timeout time.Duration) ClientOption {
	return func(c *Client) {
		c.httpClient.Timeout = timeout
	}
}

// NewClient creates a new Claude API client
func NewClient(apiKey string, opts ...ClientOption) *Client {
	c := &Client{
		apiKey:    apiKey,
		baseURL:   DefaultBaseURL,
		model:     DefaultModel,
		maxTokens: DefaultMaxTokens,
		httpClient: &http.Client{
			Timeout: DefaultTimeout,
		},
	}

	for _, opt := range opts {
		opt(c)
	}

	return c
}

// Message represents a message in the conversation
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// CreateMessageRequest represents a request to create a message
type CreateMessageRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	Messages  []Message `json:"messages"`
	System    string    `json:"system,omitempty"`
}

// ContentBlock represents a content block in the response
type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Usage represents the token usage
type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// CreateMessageResponse represents the response from creating a message
type CreateMessageResponse struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"`
	Role         string         `json:"role"`
	Content      []ContentBlock `json:"content"`
	Model        string         `json:"model"`
	StopReason   string         `json:"stop_reason"`
	StopSequence *string        `json:"stop_sequence"`
	Usage        Usage          `json:"usage"`
}

// APIError represents an error from the Claude API
type APIError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// ErrorResponse represents an error response from the API
type ErrorResponse struct {
	Type  string   `json:"type"`
	Error APIError `json:"error"`
}

// CreateMessage sends a message to the Claude API
func (c *Client) CreateMessage(ctx context.Context, messages []Message, systemPrompt string) (*CreateMessageResponse, error) {
	req := CreateMessageRequest{
		Model:     c.model,
		MaxTokens: c.maxTokens,
		Messages:  messages,
		System:    systemPrompt,
	}

	return c.createMessageWithRequest(ctx, req)
}

// CreateMessageWithOptions sends a message with custom options
func (c *Client) CreateMessageWithOptions(ctx context.Context, messages []Message, systemPrompt string, maxTokens int) (*CreateMessageResponse, error) {
	req := CreateMessageRequest{
		Model:     c.model,
		MaxTokens: maxTokens,
		Messages:  messages,
		System:    systemPrompt,
	}

	return c.createMessageWithRequest(ctx, req)
}

func (c *Client) createMessageWithRequest(ctx context.Context, req CreateMessageRequest) (*CreateMessageResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", AnthropicVersion)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp ErrorResponse
		if err := json.Unmarshal(respBody, &errResp); err != nil {
			return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
		}
		return nil, fmt.Errorf("API error (status %d): %s - %s", resp.StatusCode, errResp.Error.Type, errResp.Error.Message)
	}

	var result CreateMessageResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &result, nil
}

// GetText extracts the text content from a response
func (r *CreateMessageResponse) GetText() string {
	if len(r.Content) == 0 {
		return ""
	}

	var text string
	for _, block := range r.Content {
		if block.Type == "text" {
			text += block.Text
		}
	}
	return text
}
