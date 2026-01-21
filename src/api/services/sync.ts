// Sync API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'

interface SyncResult {
  projectsSynced: number
  entriesSynced: number
}

interface ClockifyWorkspace {
  id: string
  name: string
}

interface ClockifyUser {
  id: string
  email: string
  name: string
  activeWorkspace: string
}

interface ValidateApiKeyResponse {
  user: ClockifyUser
  workspaces: ClockifyWorkspace[]
}

export const syncApi = {
  // Validate Clockify API key and get workspaces
  async validateApiKey(apiKey: string): Promise<ValidateApiKeyResponse> {
    return httpClient.post<ValidateApiKeyResponse>(
      API_CONFIG.baseUrls.sync,
      '/sync/clockify/workspaces',
      { apiKey }
    )
  },

  // Trigger full sync (projects + time entries for last 30 days)
  async triggerSync(): Promise<SyncResult> {
    return httpClient.post<SyncResult>(
      API_CONFIG.baseUrls.sync,
      '/sync/trigger'
    )
  },
}
