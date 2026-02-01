import fs from 'node:fs'
import path from 'node:path'

const AUTH_FILE = path.join(import.meta.dirname, '..', '.auth', 'user.json')

/** Extract JWT token from the storageState file */
export function getAuthToken(): string {
  const raw = fs.readFileSync(AUTH_FILE, 'utf-8')
  const state = JSON.parse(raw)

  // Look for the Zustand auth store in localStorage
  for (const origin of state.origins ?? []) {
    for (const item of origin.localStorage ?? []) {
      if (item.name === 'kensan-auth') {
        const parsed = JSON.parse(item.value)
        return parsed?.state?.token ?? ''
      }
    }
  }
  return ''
}

/** Make an authenticated API request */
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
}

/** Create a note via API and return it */
export async function createNote(data: {
  type: string
  title: string
  content: string
  format?: string
  date?: string
}) {
  const res = await apiRequest('http://localhost:8091/api/v1/notes', {
    method: 'POST',
    body: JSON.stringify({
      type: data.type,
      title: data.title,
      content: data.content,
      format: data.format ?? 'markdown',
      date: data.date,
    }),
  })
  const json = await res.json()
  return json.data
}

/** Delete a note via API */
export async function deleteNote(id: string) {
  await apiRequest(`http://localhost:8091/api/v1/notes/${id}`, {
    method: 'DELETE',
  })
}
