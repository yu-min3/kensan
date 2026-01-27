package errors

import (
	"errors"
	"testing"
)

// Test entity-specific "not found" error helpers
func TestEntityNotFoundHelpers(t *testing.T) {
	tests := []struct {
		name     string
		errFunc  func() error
		wantBase error
	}{
		{"TaskNotFound", TaskNotFound, ErrNotFound},
		{"GoalNotFound", GoalNotFound, ErrNotFound},
		{"MilestoneNotFound", MilestoneNotFound, ErrNotFound},
		{"TagNotFound", TagNotFound, ErrNotFound},
		{"TimeBlockNotFound", TimeBlockNotFound, ErrNotFound},
		{"TimeEntryNotFound", TimeEntryNotFound, ErrNotFound},
		{"UserNotFound", UserNotFound, ErrNotFound},
		{"NoteNotFound", NoteNotFound, ErrNotFound},
		{"MemoNotFound", MemoNotFound, ErrNotFound},
		{"DiaryNotFound", DiaryNotFound, ErrNotFound},
		{"RecordNotFound", RecordNotFound, ErrNotFound},
		{"RoutineNotFound", RoutineNotFound, ErrNotFound},
		{"TodoNotFound", TodoNotFound, ErrNotFound},
		{"EntityMemoNotFound", EntityMemoNotFound, ErrNotFound},
		{"TimerNotFound", TimerNotFound, ErrNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.errFunc()
			if !errors.Is(err, tt.wantBase) {
				t.Errorf("%s() error = %v, want error wrapping %v", tt.name, err, tt.wantBase)
			}
			if !IsNotFound(err) {
				t.Errorf("IsNotFound(%s()) = false, want true", tt.name)
			}
		})
	}
}

// Test validation error helpers
func TestValidationErrorHelpers(t *testing.T) {
	t.Run("InvalidStatus", func(t *testing.T) {
		err := InvalidStatus("task")
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("InvalidStatus() error = %v, want error wrapping %v", err, ErrInvalidInput)
		}
		if !IsInvalidInput(err) {
			t.Errorf("IsInvalidInput(InvalidStatus()) = false, want true")
		}
	})

	t.Run("InvalidDate", func(t *testing.T) {
		err := InvalidDate()
		if !errors.Is(err, ErrInvalidFormat) {
			t.Errorf("InvalidDate() error = %v, want error wrapping %v", err, ErrInvalidFormat)
		}
	})

	t.Run("InvalidFrequency", func(t *testing.T) {
		err := InvalidFrequency()
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("InvalidFrequency() error = %v, want error wrapping %v", err, ErrInvalidInput)
		}
	})

	t.Run("InvalidEntityType", func(t *testing.T) {
		err := InvalidEntityType()
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("InvalidEntityType() error = %v, want error wrapping %v", err, ErrInvalidInput)
		}
	})

	t.Run("InvalidTime", func(t *testing.T) {
		err := InvalidTime()
		if !errors.Is(err, ErrInvalidFormat) {
			t.Errorf("InvalidTime() error = %v, want error wrapping %v", err, ErrInvalidFormat)
		}
	})

	t.Run("InvalidInput", func(t *testing.T) {
		err := InvalidInput()
		if err != ErrInvalidInput {
			t.Errorf("InvalidInput() error = %v, want %v", err, ErrInvalidInput)
		}
	})

	t.Run("RequiredField", func(t *testing.T) {
		err := RequiredField("name")
		if !errors.Is(err, ErrRequired) {
			t.Errorf("RequiredField() error = %v, want error wrapping %v", err, ErrRequired)
		}
		if !IsRequired(err) {
			t.Errorf("IsRequired(RequiredField()) = false, want true")
		}
	})
}

// Test existing helper functions
func TestExistingHelperFunctions(t *testing.T) {
	t.Run("NotFound", func(t *testing.T) {
		err := NotFound("custom entity")
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("NotFound() error = %v, want error wrapping %v", err, ErrNotFound)
		}
		if !IsNotFound(err) {
			t.Errorf("IsNotFound(NotFound()) = false, want true")
		}
	})

	t.Run("AlreadyExists", func(t *testing.T) {
		err := AlreadyExists("user")
		if !errors.Is(err, ErrAlreadyExists) {
			t.Errorf("AlreadyExists() error = %v, want error wrapping %v", err, ErrAlreadyExists)
		}
		if !IsAlreadyExists(err) {
			t.Errorf("IsAlreadyExists(AlreadyExists()) = false, want true")
		}
	})

	t.Run("Required", func(t *testing.T) {
		err := Required("email")
		if !errors.Is(err, ErrRequired) {
			t.Errorf("Required() error = %v, want error wrapping %v", err, ErrRequired)
		}
		if !IsRequired(err) {
			t.Errorf("IsRequired(Required()) = false, want true")
		}
	})

	t.Run("InvalidFormat", func(t *testing.T) {
		err := InvalidFormat("date", "YYYY-MM-DD")
		if !errors.Is(err, ErrInvalidFormat) {
			t.Errorf("InvalidFormat() error = %v, want error wrapping %v", err, ErrInvalidFormat)
		}
		if !IsInvalidFormat(err) {
			t.Errorf("IsInvalidFormat(InvalidFormat()) = false, want true")
		}
	})
}

// Test EntityError type
func TestEntityError(t *testing.T) {
	err := &EntityError{Entity: "test", Base: ErrNotFound}

	t.Run("Error message", func(t *testing.T) {
		want := "test not found"
		if got := err.Error(); got != want {
			t.Errorf("EntityError.Error() = %v, want %v", got, want)
		}
	})

	t.Run("Unwrap", func(t *testing.T) {
		if got := err.Unwrap(); got != ErrNotFound {
			t.Errorf("EntityError.Unwrap() = %v, want %v", got, ErrNotFound)
		}
	})
}

// Test FieldError type
func TestFieldError(t *testing.T) {
	err := &FieldError{Field: "email", Base: ErrRequired}

	t.Run("Error message", func(t *testing.T) {
		want := "email required"
		if got := err.Error(); got != want {
			t.Errorf("FieldError.Error() = %v, want %v", got, want)
		}
	})

	t.Run("Unwrap", func(t *testing.T) {
		if got := err.Unwrap(); got != ErrRequired {
			t.Errorf("FieldError.Unwrap() = %v, want %v", got, ErrRequired)
		}
	})
}
