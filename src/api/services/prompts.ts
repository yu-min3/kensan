// Prompt Management API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'

export interface AIContext {
  id: string
  name: string
  situation: string
  version: string
  is_active: boolean
  is_default: boolean
  system_prompt: string
  allowed_tools: string[]
  max_turns: number
  temperature: number
  created_at: string
  updated_at: string
  current_version_number: number | null
}

export interface AIContextUpdateInput {
  system_prompt?: string
  allowed_tools?: string[]
  max_turns?: number
  temperature?: number
  changelog?: string
}

export interface AIContextVersion {
  id: string
  context_id: string
  version_number: number
  system_prompt: string
  allowed_tools: string[]
  max_turns: number
  temperature: number
  changelog: string | null
  created_at: string
}

export interface VariableMetadata {
  name: string
  description: string
  example: string
  excludes_tools: string[]
}

export interface ToolMetadata {
  name: string
  description: string
  readonly: boolean
}

export interface PromptMetadata {
  variables: VariableMetadata[]
  tools: ToolMetadata[]
}

const BASE = API_CONFIG.baseUrls.ai

// kensan-ai returns JSON directly (no {data: ...} envelope),
// but httpClient.request unwraps json.data if present, otherwise returns json as-is.

export async function fetchMetadata(): Promise<PromptMetadata> {
  return httpClient.get<PromptMetadata>(BASE, '/prompts/metadata')
}

export async function fetchContexts(situation?: string): Promise<AIContext[]> {
  const query = situation ? `?situation=${encodeURIComponent(situation)}` : ''
  return httpClient.get<AIContext[]>(BASE, `/prompts${query}`)
}

export async function fetchContext(id: string): Promise<AIContext> {
  return httpClient.get<AIContext>(BASE, `/prompts/${id}`)
}

export async function updateContext(id: string, data: AIContextUpdateInput): Promise<AIContext> {
  return httpClient.patch<AIContext>(BASE, `/prompts/${id}`, data)
}

export async function fetchVersions(contextId: string): Promise<AIContextVersion[]> {
  return httpClient.get<AIContextVersion[]>(BASE, `/prompts/${contextId}/versions`)
}

export async function fetchVersion(contextId: string, versionNumber: number): Promise<AIContextVersion> {
  return httpClient.get<AIContextVersion>(BASE, `/prompts/${contextId}/versions/${versionNumber}`)
}

export async function rollbackToVersion(contextId: string, versionNumber: number): Promise<AIContext> {
  return httpClient.post<AIContext>(BASE, `/prompts/${contextId}/rollback/${versionNumber}`)
}
