// Feature flags for easy toggling of functionality
// Set to true to use Clockify as the master source for projects/tasks
// When enabled:
// - Project/Task CRUD (create/delete) is disabled in the UI
// - Only goal tag assignment is allowed for projects
// - Projects and tasks are synced from Clockify

export const CLOCKIFY_MASTER_MODE = false

// To restore full CRUD functionality, set CLOCKIFY_MASTER_MODE = false
