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

// =============================================================================
// Experiments (AI-generated optimization challenges)
// =============================================================================

export interface Experiment {
  id: string
  situation: string
  evaluation_id: string
  control_context_id: string
  variant_context_id: string
  status: 'pending_review' | 'in_challenge' | 'promoted' | 'rejected'
  challenge_results: Array<{ round_id: string; mapping: Record<string, string>; winner: string | null }>
  win_rate: number | null
  resolved_at: string | null
  created_at: string
  control_name: string
  control_prompt: string
  variant_name: string
  variant_prompt: string
  eval_avg_rating: number | null
  eval_interaction_count: number
  eval_weaknesses: string[]
  eval_strengths: string[]
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const res = await httpClient.get<{ challenges: Experiment[] }>(BASE, '/prompts/challenges')
  return res.challenges
}

export async function fetchExperiment(id: string): Promise<Experiment> {
  return httpClient.get<Experiment>(BASE, `/prompts/challenges/${id}`)
}

export async function resolveExperiment(
  id: string,
  action: 'promote' | 'reject',
): Promise<ResolveResult> {
  return httpClient.post<ResolveResult>(BASE, `/prompts/challenges/${id}/resolve`, { action })
}

// =============================================================================
// Optimization trigger
// =============================================================================

export interface OptimizationResult {
  period_start: string
  period_end: string
  contexts_evaluated: number
  experiments_created: number
  errors: string[]
  optimized_context_ids: string[]
}

export async function runOptimization(force = false): Promise<OptimizationResult> {
  const params = force ? '?force=true' : ''
  return httpClient.post<OptimizationResult>(BASE, `/prompts/run-optimization${params}`, {})
}
