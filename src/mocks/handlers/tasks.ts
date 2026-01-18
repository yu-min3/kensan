// Tasks & Projects MSW handlers
import { http, HttpResponse } from 'msw'
import { projects, tasks, generateId } from '../data'
import type { Project, Task, GoalTag } from '@/types'

const BASE_URL = 'http://localhost:8082/api/v1'

// Transform to API response format
const toProjectResponse = (p: Project) => ({
  id: p.id,
  name: p.name,
  goalTag: p.goalTag,
  color: p.color,
  isArchived: p.isArchived,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const toTaskResponse = (t: Task) => ({
  id: t.id,
  name: t.name,
  projectId: t.projectId,
  parentTaskId: t.parentTaskId,
  estimatedMinutes: t.estimatedMinutes,
  completed: t.completed,
  dueDate: t.dueDate,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const taskHandlers = [
  // GET /projects
  http.get(`${BASE_URL}/projects`, ({ request }) => {
    const url = new URL(request.url)
    const archived = url.searchParams.get('archived')
    const goalTag = url.searchParams.get('goal_tag') as GoalTag | null

    let result = [...projects]
    if (archived !== null) {
      result = result.filter(p => p.isArchived === (archived === 'true'))
    }
    if (goalTag) {
      result = result.filter(p => p.goalTag === goalTag)
    }

    return HttpResponse.json(result.map(toProjectResponse))
  }),

  // GET /projects/:id
  http.get(`${BASE_URL}/projects/:id`, ({ params }) => {
    const project = projects.find(p => p.id === params.id)
    if (!project) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Project not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(toProjectResponse(project))
  }),

  // POST /projects
  http.post(`${BASE_URL}/projects`, async ({ request }) => {
    const body = await request.json() as { name: string; goalTag?: GoalTag; color?: string }
    const newProject: Project = {
      id: generateId('p'),
      name: body.name,
      goalTag: body.goalTag,
      color: body.color,
      isArchived: false,
    }
    projects.push(newProject)
    return HttpResponse.json(toProjectResponse(newProject), { status: 201 })
  }),

  // PUT /projects/:id
  http.put(`${BASE_URL}/projects/:id`, async ({ params, request }) => {
    const index = projects.findIndex(p => p.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Project not found' },
        { status: 404 }
      )
    }
    const body = await request.json() as Partial<Project>
    projects[index] = { ...projects[index], ...body }
    return HttpResponse.json(toProjectResponse(projects[index]))
  }),

  // DELETE /projects/:id
  http.delete(`${BASE_URL}/projects/:id`, ({ params }) => {
    const index = projects.findIndex(p => p.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Project not found' },
        { status: 404 }
      )
    }
    projects.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /tasks
  http.get(`${BASE_URL}/tasks`, ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const completed = url.searchParams.get('completed')
    const parentId = url.searchParams.get('parent_id')

    let result = [...tasks]
    if (projectId) {
      result = result.filter(t => t.projectId === projectId)
    }
    if (completed !== null) {
      result = result.filter(t => t.completed === (completed === 'true'))
    }
    if (parentId) {
      result = result.filter(t => t.parentTaskId === parentId)
    }

    return HttpResponse.json(result.map(toTaskResponse))
  }),

  // GET /tasks/:id
  http.get(`${BASE_URL}/tasks/:id`, ({ params }) => {
    const task = tasks.find(t => t.id === params.id)
    if (!task) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Task not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(toTaskResponse(task))
  }),

  // POST /tasks
  http.post(`${BASE_URL}/tasks`, async ({ request }) => {
    const body = await request.json() as {
      name: string
      projectId: string
      parentTaskId?: string
      estimatedMinutes?: number
      dueDate?: string
    }
    const newTask: Task = {
      id: generateId('t'),
      name: body.name,
      projectId: body.projectId,
      parentTaskId: body.parentTaskId,
      estimatedMinutes: body.estimatedMinutes,
      dueDate: body.dueDate,
      completed: false,
    }
    tasks.push(newTask)
    return HttpResponse.json(toTaskResponse(newTask), { status: 201 })
  }),

  // PUT /tasks/:id
  http.put(`${BASE_URL}/tasks/:id`, async ({ params, request }) => {
    const index = tasks.findIndex(t => t.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Task not found' },
        { status: 404 }
      )
    }
    const body = await request.json() as Partial<Task>
    tasks[index] = { ...tasks[index], ...body }
    return HttpResponse.json(toTaskResponse(tasks[index]))
  }),

  // PATCH /tasks/:id/complete
  http.patch(`${BASE_URL}/tasks/:id/complete`, ({ params }) => {
    const index = tasks.findIndex(t => t.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Task not found' },
        { status: 404 }
      )
    }
    tasks[index].completed = !tasks[index].completed
    return HttpResponse.json(toTaskResponse(tasks[index]))
  }),

  // DELETE /tasks/:id
  http.delete(`${BASE_URL}/tasks/:id`, ({ params }) => {
    const index = tasks.findIndex(t => t.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Task not found' },
        { status: 404 }
      )
    }
    tasks.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
