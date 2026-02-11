package demo

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	user "github.com/kensan/backend/services/user/internal"
	"github.com/kensan/backend/shared/auth"
	"github.com/kensan/backend/shared/middleware"
)

// Persona defines a demo persona with its user data and seed SQL files.
type Persona struct {
	UserID   string
	Email    string
	Name     string
	SQLFiles []string
}

var personas = map[string]Persona{
	"tanaka": {
		UserID: "dddddddd-dddd-dddd-dddd-dddddddddddd",
		Email:  "demo@kensan.dev",
		Name:   "田中翔太",
		SQLFiles: []string{
			"001_user_and_master.sql",
			"010_time_blocks.sql",
			"020_time_entries.sql",
			"030_todos_completions.sql",
			"040_notes.sql",
			"050_entity_memos.sql",
			"060_ai_data.sql",
			"070_ai_challenges.sql",
		},
	},
	"misaki": {
		UserID: "d1111111-1111-1111-1111-111111111111",
		Email:  "misaki@kensan.dev",
		Name:   "鈴木美咲",
		SQLFiles: []string{
			"002_user_misaki.sql",
			"011_time_blocks_misaki.sql",
			"021_time_entries_misaki.sql",
			"031_todos_completions_misaki.sql",
			"041_notes_misaki.sql",
			"051_entity_memos_misaki.sql",
			"061_ai_data_misaki.sql",
			"071_ai_challenges_misaki.sql",
		},
	},
	"takuya": {
		UserID: "d2222222-2222-2222-2222-222222222222",
		Email:  "takuya@kensan.dev",
		Name:   "山田拓也",
		SQLFiles: []string{
			"003_user_takuya.sql",
			"012_time_blocks_takuya.sql",
			"022_time_entries_takuya.sql",
			"032_todos_completions_takuya.sql",
			"042_notes_takuya.sql",
			"052_entity_memos_takuya.sql",
			"062_ai_data_takuya.sql",
			"072_ai_challenges_takuya.sql",
		},
	},
	"aya": {
		UserID: "d3333333-3333-3333-3333-333333333333",
		Email:  "aya@kensan.dev",
		Name:   "高橋彩",
		SQLFiles: []string{
			"004_user_aya.sql",
			"013_time_blocks_aya.sql",
			"023_time_entries_aya.sql",
			"033_todos_completions_aya.sql",
			"043_notes_aya.sql",
			"053_entity_memos_aya.sql",
			"063_ai_data_aya.sql",
			"073_ai_challenges_aya.sql",
		},
	},
}

// Handler handles demo login requests.
type Handler struct {
	pool       *pgxpool.Pool
	jwtManager *auth.JWTManager
	seedDir    string
}

// NewHandler creates a new demo handler.
func NewHandler(pool *pgxpool.Pool, jwtManager *auth.JWTManager) *Handler {
	seedDir := os.Getenv("DEMO_SEED_DIR")
	if seedDir == "" {
		seedDir = "/app/demo-seed"
	}
	return &Handler{
		pool:       pool,
		jwtManager: jwtManager,
		seedDir:    seedDir,
	}
}

// RegisterRoutes registers demo login routes (public, no auth required).
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/auth/demo-login", h.DemoLogin)
}

// demoLoginRequest represents the demo login request payload.
type demoLoginRequest struct {
	Persona string `json:"persona"`
}

// DemoLogin handles demo persona login.
// Each call creates a brand-new user with unique UUIDs so that
// multiple participants can use the same persona simultaneously.
// POST /api/v1/auth/demo-login
func (h *Handler) DemoLogin(w http.ResponseWriter, r *http.Request) {
	var req demoLoginRequest
	if !middleware.DecodeJSONBody(w, r, &req) {
		return
	}

	persona, ok := personas[req.Persona]
	if !ok {
		middleware.Error(w, r, http.StatusBadRequest, "INVALID_PERSONA", "Unknown persona: "+req.Persona)
		return
	}

	ctx := r.Context()

	newUserID := uuid.New().String()
	newEmail := fmt.Sprintf("demo-%s@kensan.dev", newUserID[:8])

	// Execute seed SQL files with UUID/email replacement
	if err := h.seedPersonaWithNewIDs(ctx, persona, newUserID, newEmail); err != nil {
		slog.ErrorContext(ctx, "Failed to seed persona data", "persona", req.Persona, "error", err)
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to prepare demo data")
		return
	}

	// Generate JWT token for the new user
	token, err := h.jwtManager.GenerateToken(newUserID, newEmail)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to generate token", "persona", req.Persona, "error", err)
		middleware.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate token")
		return
	}

	response := user.AuthResponse{
		Token: token,
		User: &user.User{
			ID:        newUserID,
			Email:     newEmail,
			Name:      persona.Name,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	slog.InfoContext(ctx, "Demo login successful", "persona", req.Persona, "user_id", newUserID, "email", newEmail)
	middleware.JSON(w, r, http.StatusOK, response)
}

// cleanupPersona deletes all data for a specific persona user.
func (h *Handler) cleanupPersona(ctx context.Context, userID string) error {
	_, err := h.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	return err
}

// seedPersona executes the seed SQL files for a persona.
func (h *Handler) seedPersona(ctx context.Context, persona Persona) error {
	for _, sqlFile := range persona.SQLFiles {
		filePath := filepath.Join(h.seedDir, sqlFile)
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read seed file %s: %w", sqlFile, err)
		}
		if _, err := h.pool.Exec(ctx, string(content)); err != nil {
			return fmt.Errorf("failed to execute seed file %s: %w", sqlFile, err)
		}
	}
	return nil
}

// seedPersonaWithNewIDs reads all seed SQL files, builds a single UUID mapping
// across all files (so cross-file FK references stay consistent), then executes
// the transformed SQL in order.
func (h *Handler) seedPersonaWithNewIDs(ctx context.Context, persona Persona, newUserID, newEmail string) error {
	// Read all files first to build a complete UUID map
	contents := make([]string, 0, len(persona.SQLFiles))
	for _, sqlFile := range persona.SQLFiles {
		filePath := filepath.Join(h.seedDir, sqlFile)
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read seed file %s: %w", sqlFile, err)
		}
		contents = append(contents, string(content))
	}

	// Build UUID map from all files
	uuidMap := buildUUIDMap(strings.Join(contents, "\n"), persona.UserID, newUserID)

	// Execute each file with the shared UUID map
	for i, content := range contents {
		transformed := applyUUIDMap(content, uuidMap, persona.Email, newEmail)
		if _, err := h.pool.Exec(ctx, transformed); err != nil {
			return fmt.Errorf("failed to execute seed file %s: %w", persona.SQLFiles[i], err)
		}
	}
	return nil
}

var uuidRegex = regexp.MustCompile(`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)

// buildUUIDMap scans all SQL content for UUIDs and creates a mapping from
// each original UUID to a new unique UUID. personaUserID is explicitly
// mapped to newUserID.
func buildUUIDMap(allContent, personaUserID, newUserID string) map[string]string {
	uuidMap := map[string]string{
		personaUserID: newUserID,
	}

	matches := uuidRegex.FindAllString(allContent, -1)
	for _, m := range matches {
		if _, exists := uuidMap[m]; !exists {
			uuidMap[m] = uuid.New().String()
		}
	}

	return uuidMap
}

// applyUUIDMap replaces all UUIDs in content using the provided map,
// and also replaces the persona email with the new email.
func applyUUIDMap(content string, uuidMap map[string]string, personaEmail, newEmail string) string {
	result := content
	for oldUUID, newUUID := range uuidMap {
		result = strings.ReplaceAll(result, oldUUID, newUUID)
	}
	result = strings.ReplaceAll(result, personaEmail, newEmail)
	return result
}
