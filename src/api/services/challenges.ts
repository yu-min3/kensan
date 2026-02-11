// Comparison (Version-based A/B) API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'

export interface ComparisonRound {
  round_id: string
  mapping: Record<string, number> // {A: version_num, B: version_num}
  winner: 'A' | 'B' | 'tie' | null
}

export interface Comparison {
  id: string
  context_id: string
  context_name: string
  situation: string
  version_a: number
  version_b: number
  version_a_prompt: string
  version_b_prompt: string
  version_a_changelog: string | null
  version_b_changelog: string | null
  status: 'active' | 'adopted_a' | 'adopted_b' | 'dismissed'
  rounds: ComparisonRound[]
  win_rate_b: number | null
  created_at: string
  resolved_at: string | null
}

export interface InitRoundResult {
  round_id: string
  context_id: string
  version_a: number // randomized
  version_b: number // randomized
}

export interface VoteResult {
  round_id: string
  winner: string
  total_rounds: number
  decided_rounds: number
  win_rate_b: number | null
}

export interface ResolveResult {
  status: string
  message: string
}

const BASE = API_CONFIG.baseUrls.ai

export async function createComparison(
  contextId: string,
  versionA: number,
  versionB: number,
): Promise<Comparison> {
  return httpClient.post<Comparison>(BASE, '/prompts/comparisons', {
    context_id: contextId,
    version_a: versionA,
    version_b: versionB,
  })
}

export async function fetchComparisons(
  contextId?: string,
  status?: string,
): Promise<Comparison[]> {
  const params = new URLSearchParams()
  if (contextId) params.set('context_id', contextId)
  if (status) params.set('status', status)
  const query = params.toString() ? `?${params.toString()}` : ''
  const res = await httpClient.get<{ comparisons: Comparison[] }>(
    BASE,
    `/prompts/comparisons${query}`,
  )
  return res.comparisons
}

export async function fetchComparison(id: string): Promise<Comparison> {
  return httpClient.get<Comparison>(BASE, `/prompts/comparisons/${id}`)
}

export async function initRound(id: string): Promise<InitRoundResult> {
  return httpClient.post<InitRoundResult>(
    BASE,
    `/prompts/comparisons/${id}/init-round`,
    {},
  )
}

export async function voteRound(
  id: string,
  roundId: string,
  winner: string,
): Promise<VoteResult> {
  return httpClient.post<VoteResult>(BASE, `/prompts/comparisons/${id}/vote`, {
    round_id: roundId,
    winner,
  })
}

export async function resolveComparison(
  id: string,
  action: 'adopt_a' | 'adopt_b' | 'dismiss',
): Promise<ResolveResult> {
  return httpClient.post<ResolveResult>(
    BASE,
    `/prompts/comparisons/${id}/resolve`,
    { action },
  )
}
