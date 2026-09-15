import { autopilotMode, lifecycleSteps } from './content.ts'
import type { Prompt, SetupId } from './content.ts'

export const experiences = ['app', 'cli', 'vscode'] as const
export type Experience = typeof experiences[number]
export const experienceLabels: Record<Experience, string> = {
  app: 'Copilot App', cli: 'Copilot CLI', vscode: 'VS Code',
}
export type Settings = {
  experience: Experience
  install: 'plugin' | 'apm'
  organization: string
  project: string
  process: string
  participant: string
  area: string
  iteration: string
  documentTarget: string
}
export type SavedState = { schema: 1; checked: string[]; settings: Settings }
export const defaults: Settings = {
  experience: 'cli', install: 'plugin', organization: '', project: '', process: '',
  participant: '', area: '', iteration: '', documentTarget: '',
}
export const storageKey = 'qubix-hve-workshop-2026-09-16-v1'
export function nextExperience(current: Experience, key: string): Experience | undefined {
  if (key === 'Home') return experiences[0]
  if (key === 'End') return experiences[experiences.length - 1]
  const direction = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0
  return direction ? experiences[(experiences.indexOf(current) + direction + experiences.length) % experiences.length] : undefined
}
export function setupCheckId(id: SetupId): string {
  return `setup:${id}`
}
export function missingSetup(prompt: Pick<Prompt, 'requiresSetup'>, checked: string[]) {
  const ordered: typeof lifecycleSteps = []
  const visited = new Set<SetupId>()
  const active = new Set<SetupId>()
  function visit(id: SetupId) {
    if (active.has(id)) throw new Error(`Circular setup prerequisite: ${id}.`)
    if (visited.has(id)) return
    const step = lifecycleSteps.find(candidate => candidate.id === id)
    if (!step) throw new Error(`Unknown setup prerequisite: ${id}.`)
    active.add(id)
    for (const parent of step.request.requiresSetup ?? []) visit(parent)
    active.delete(id)
    visited.add(id)
    ordered.push(step)
  }
  for (const id of prompt.requiresSetup ?? []) visit(id)
  return ordered.filter(step => !checked.includes(setupCheckId(step.id)))
}
export function decodeState(raw: string | null): SavedState {
  if (!raw) return { schema: 1, checked: [], settings: { ...defaults } }
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || !('schema' in parsed) || parsed.schema !== 1) {
    throw new Error('Saved workshop progress has an unsupported format.')
  }
  const data = parsed as Record<string, unknown>
  if (!Array.isArray(data.checked) || !data.checked.every(x => typeof x === 'string') ||
    !data.settings || typeof data.settings !== 'object') {
    throw new Error('Saved workshop progress is damaged.')
  }
  const settings = { ...defaults }
  const input = data.settings as Record<string, unknown>
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    if (typeof input[key] !== 'string') throw new Error(`Missing saved setting: ${key}.`)
    if (key !== 'experience' && key !== 'install') settings[key] = input[key].slice(0, 300)
  }
  if (input.experience !== 'cli' && input.experience !== 'app' && input.experience !== 'vscode') throw new Error('Unknown Copilot experience.')
  if (input.install !== 'plugin' && input.install !== 'apm') throw new Error('Unknown installation method.')
  settings.experience = input.experience
  settings.install = input.install
  return { schema: 1, checked: [...new Set(data.checked)], settings }
}
export function missingTarget(settings: Settings): string[] {
  const required: [keyof Settings, string][] = [
    ['organization', 'organization'], ['project', 'project'],
    ['participant', 'participant prefix'], ['documentTarget', 'documentation destination'],
  ]
  return required.filter(([key]) => !settings[key].trim()).map(([, label]) => label)
}
export function agentSelection(entry: Prompt['entry'], settings: Settings) {
  const federation = entry === 'squad-federation'
  const name = federation ? 'Squad Federation Coordinator' : 'Squad Coordinator'
  if (settings.experience === 'vscode') {
    const identifier = federation ? '/squad-federation' : '/squad'
    return {
      name, identifier,
      instruction: `In VS Code Copilot Chat, run the ${identifier} prompt. Choose the prompt described as handing a request to the coordinator, not a similarly named skill.`,
    }
  }
  const identifier = settings.install === 'plugin'
    ? `hve-squad:${federation ? 'squad-federation-coordinator' : 'squad-coordinator'}`
    : name
  return {
    name,
    identifier,
    instruction: settings.experience === 'cli'
      ? `In Copilot CLI, type /agent and choose ${name}.`
      : `In the GitHub Copilot App, open the agent dropdown and choose ${name}.`,
  }
}
export function renderPrompt(prompt: Prompt, settings: Settings): string {
  if (prompt.shell) return prompt.text
  let request = prompt.text
  if (prompt.target) {
    const missing = missingTarget(settings)
    if (missing.length) {
      throw new Error(`Complete Session setup first: ${missing.join(', ')}.`)
    }
    const details: [string, string][] = [
      ['Azure DevOps organization', settings.organization],
      ['Project', settings.project],
      ['My work-item prefix', settings.participant],
      ['Documentation location', settings.documentTarget],
      ['Project process', settings.process],
      ['Area path', settings.area],
      ['Iteration', settings.iteration],
    ]
    request += '\n\nOur project details:\n' + details
      .filter(([, value]) => value.trim())
      .map(([label, value]) => `${label}: ${JSON.stringify(value.trim())}`)
      .join('\n')
  }
  if (settings.experience === 'vscode') {
    const entry = prompt.entry ?? 'squad'
    if (entry === 'squad-federation' && prompt.lifecycle) {
      return `/${entry} ${prompt.lifecycle} request=${JSON.stringify(request)}`
    }
    if (prompt.lifecycle) {
      // The single-squad prompt has no init input; express setup intent in request.
      return `/${entry} request=${JSON.stringify(`${prompt.lifecycle}\n\n${request}`)}`
    }
    return `/${entry} ${autopilotMode} request=${JSON.stringify(request)}`
  }
  return `${prompt.lifecycle ?? autopilotMode}\n\n${request}`
}
