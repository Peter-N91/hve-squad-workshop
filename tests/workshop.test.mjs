import test from 'node:test'
import assert from 'node:assert/strict'
import { agenda, autopilotMode, lessons, installation, lifecycleSteps, modeGuidance, observationNote, packSetup, pdfReadiness, repositorySetup } from '../src/content.ts'
import { agentSelection, decodeState, defaults, experiences, missingSetup, missingTarget, nextExperience, renderPrompt, setupCheckId } from '../src/state.ts'
import { readFile } from 'node:fs/promises'

test('agenda is exactly 210 minutes and ends with 30 minutes of discussion', () => {
  assert.equal(agenda.reduce((total, item) => total + item.minutes, 0), 210)
  assert.deepEqual(agenda.at(-1), { time: '12:00', end: '12:30', title: 'Discuss & reflect', lesson: 'discussion', minutes: 30 })
  for (let i = 1; i < agenda.length; i++) assert.equal(agenda[i - 1].end, agenda[i].time)
})
test('all learning stages have evidence, checks, recovery and unique identifiers', () => {
  assert.equal(new Set(lessons.map(x => x.id)).size, lessons.length)
  for (const lesson of lessons) {
    assert.ok(lesson.steps.length && lesson.checks.length && lesson.evidence.length && lesson.recovery)
  }
})
test('saved state round-trips and deduplicates checkpoint IDs', () => {
  const state = decodeState(JSON.stringify({ schema: 1, checked: ['product-0', 'product-0'], settings: defaults }))
  assert.deepEqual(state.checked, ['product-0'])
  assert.deepEqual(state.settings, defaults)
  assert.deepEqual(decodeState(null).checked, [])
})
test('corrupt and unknown saved formats are rejected explicitly', () => {
  for (const raw of ['not json', '{}', 'null', '{"schema":2}', JSON.stringify({ schema: 1, checked: [1], settings: defaults }), JSON.stringify({ schema: 1, checked: [], settings: { ...defaults, experience: 'invalid' } })]) {
    assert.throws(() => decodeState(raw))
  }
})
test('target prompts are blocked until approved target fields are provided', () => {
  const prompt = { title: 'Preview', text: 'Inspect only.', entry: 'squad', target: true }
  assert.equal(missingTarget(defaults).length, 4)
  assert.throws(() => renderPrompt(prompt, defaults), /Complete Session setup/)
  const settings = { ...defaults, organization: 'test-org', project: 'test-project', participant: 'learner-01', documentTarget: 'approved-repo/docs' }
  assert.match(renderPrompt(prompt, settings), /test-project/)
  assert.match(renderPrompt(prompt, settings), /Inspect only/)
})
test('App and CLI receive the same explicit autopilot mode followed by business wording', () => {
  const prompt = { title: 'Test', text: 'Ask "why".\nWait.', entry: 'squad-federation' }
  assert.equal(renderPrompt(prompt, defaults), `${autopilotMode}\n\n${prompt.text}`)
  assert.equal(renderPrompt(prompt, { ...defaults, experience: 'app' }), `${autopilotMode}\n\n${prompt.text}`)
  assert.equal(renderPrompt(installation.apm, { ...defaults, experience: 'app' }), installation.apm.text)
})
test('agent selection is host-specific and installation-aware', () => {
  const cli = agentSelection('squad', defaults)
  assert.match(cli.instruction, /type \/agent/)
  assert.equal(cli.identifier, 'hve-squad:squad-coordinator')
  const app = agentSelection('squad-federation', { ...defaults, experience: 'app' })
  assert.match(app.instruction, /agent dropdown/)
  assert.ok(!app.instruction.includes('/agent'))
  assert.equal(app.identifier, 'hve-squad:squad-federation-coordinator')
  assert.equal(agentSelection('squad', { ...defaults, install: 'apm' }).identifier, 'Squad Coordinator')
  const vscode = agentSelection('squad-federation', { ...defaults, experience: 'vscode' })
  assert.equal(vscode.identifier, '/squad-federation')
  assert.match(vscode.instruction, /VS Code Copilot Chat/)
  assert.match(vscode.instruction, /not a similarly named skill/)
  assert.ok(!vscode.instruction.includes('/agent'))
})
test('one product kickoff covers the complete package, with observation-only steps', () => {
  const product = lessons.find(x => x.id === 'product')
  assert.ok(product.launch)
  for (const term of ['business case', 'business requirements', 'product requirements', 'experiment', 'backlog', 'acceptance criteria']) {
    assert.ok(product.launch.text.includes(term), `Missing ${term}`)
  }
  assert.ok(product.steps.every(step => !step.prompt))
  assert.deepEqual(product.launch.requiresSetup, ['planning-team'])
  const request = renderPrompt(product.launch, defaults)
  assert.equal(request, `${autopilotMode}\n\n${product.launch.text}`)
  assert.ok(product.behaviors.some(x => /intake/i.test(x)))
  assert.ok(product.behaviors.some(x => /additional roles/.test(x)))
})
test('promotion, federation expansion and implementation are separate stages', () => {
  const federation = lessons.find(x => x.id === 'federation')
  const implementation = lessons.find(x => x.id === 'implementation')
  assert.ok(!federation.launch)
  assert.deepEqual(federation.setup.map(step => step.request.lifecycle), ['promote', 'init'])
  assert.equal(implementation.launch.entry, 'squad-federation')
  assert.deepEqual(implementation.launch.requiresSetup, ['delivery-team'])
  for (const term of ['agreed backlog', 'knowledge-docs', 'first release', 'acceptance criteria']) {
    assert.ok(implementation.launch.text.includes(term), `Missing ${term}`)
  }
  assert.ok(federation.steps.every(step => !step.prompt))
  assert.ok(implementation.steps.every(step => !step.prompt))
  assert.ok(implementation.launch && !implementation.continuation)
})
test('repository and knowledge-docs preparation precede either installation method', () => {
  const prepare = lessons.find(item => item.id === 'prepare')
  assert.equal(prepare.beforeInstall.length, 2)
  assert.equal(prepare.beforeInstall[0].prompt, repositorySetup)
  assert.match(prepare.beforeInstall[0].body, /repository root/)
  assert.match(prepare.beforeInstall[1].body, /before installing/)
  assert.match(prepare.beforeInstall[1].body, /knowledge-docs at the root/)
  assert.ok(repositorySetup.shell)
  for (const term of ['Test-Path', 'git init -b main', '.\\knowledge-docs', '.\\.gitignore']) {
    assert.ok(repositorySetup.text.includes(term), `Missing repository setup step: ${term}`)
  }
  assert.ok(!/apm install|copilot plugin install/.test(repositorySetup.text))
})
test('case-dependent requests use root knowledge-docs instead of chat attachments', () => {
  const requests = lessons.flatMap(item => [
    item.launch, ...(item.setup ?? []).map(step => step.request), ...item.steps.map(step => step.prompt),
  ]).filter(Boolean)
  for (const request of requests) {
    assert.ok(!/attached|attachment/i.test(request.text), request.title)
    if (/business case/i.test(request.text)) {
      assert.match(request.text, /knowledge-docs/, request.title)
    }
  }
  const prepare = lessons.find(item => item.id === 'prepare')
  assert.match(prepare.steps.find(step => step.prompt).prompt.text, /root of this repository/)
  assert.match(lessons.find(item => item.id === 'product').launch.text, /business case document inside it/)
})
test('delivery fulfills a first-release backlog slice with a missing-scope decision and honest partial completion', () => {
  const product = lessons.find(item => item.id === 'product')
  const delivery = lessons.find(item => item.id === 'implementation')
  assert.match(product.launch.text, /proposed first-release scope/)
  assert.match(delivery.launch.text, /Work through the items in that release/)
  assert.match(delivery.launch.text, /If the release scope is not defined yet/)
  assert.match(delivery.launch.text, /agree before building/)
  assert.match(delivery.launch.text, /what has been tested and what remains/)
  assert.ok(!/first small, high-priority item/.test(delivery.launch.text))
  assert.match(delivery.recovery, /not a requirement/)
  assert.match(delivery.recovery, /final 30 minutes/)
})
test('lifecycle messages use init/promote with context, not explicit profile selection', () => {
  assert.deepEqual(lifecycleSteps.map(step => step.id), ['planning-team', 'promote', 'delivery-team'])
  assert.deepEqual(lifecycleSteps.map(step => step.request.lifecycle), ['init', 'promote', 'init'])
  for (const step of lifecycleSteps) {
    const request = renderPrompt(step.request, defaults)
    assert.equal(request, `${step.request.lifecycle}\n\n${step.request.text}`)
    assert.equal(renderPrompt(step.request, { ...defaults, experience: 'app' }), request)
    assert.ok(!/profile\s*=|product profile|architecture profile|power-platform pack|\/squad/i.test(request))
    assert.ok(!step.request.shell)
    assert.ok(step.expected.length && step.checkpoint)
  }
  assert.match(lifecycleSteps[0].request.text, /business and product requirements/)
  assert.match(lifecycleSteps[0].request.text, /Stop once the team is ready/)
  assert.match(lifecycleSteps[1].request.text, /do not add a delivery team or start implementation yet/)
  assert.match(lifecycleSteps[2].request.text, /without starting implementation/)
})
test('setup dependencies enforce init then promote then delivery init before work', () => {
  const work = lessons.find(x => x.id === 'implementation').launch
  const init = lifecycleSteps[0].request
  const promote = lifecycleSteps[1].request
  const expand = lifecycleSteps[2].request
  const planning = setupCheckId('planning-team')
  const promotion = setupCheckId('promote')
  const delivery = setupCheckId('delivery-team')
  assert.deepEqual(missingSetup(init, []), [])
  assert.deepEqual(missingSetup(promote, []).map(step => step.id), ['planning-team'])
  assert.deepEqual(missingSetup(expand, [planning]).map(step => step.id), ['promote'])
  assert.deepEqual(missingSetup(work, []).map(step => step.id), ['planning-team', 'promote', 'delivery-team'])
  assert.deepEqual(missingSetup(work, [planning, promotion]).map(step => step.id), ['delivery-team'])
  assert.deepEqual(missingSetup(work, [planning, promotion, delivery]), [])
  assert.deepEqual(missingSetup(work, [delivery]).map(step => step.id), ['planning-team', 'promote'])
})
test('new lifecycle progress does not reuse existing business checkpoint identities', () => {
  const legacyIds = lessons.flatMap(item => item.checks.map((_, index) => `${item.id}-${index}`))
  const setupIds = lifecycleSteps.map(item => setupCheckId(item.id))
  assert.equal(new Set([...legacyIds, ...setupIds]).size, legacyIds.length + setupIds.length)
  const state = decodeState(JSON.stringify({ schema: 1, checked: ['product-0', ...setupIds], settings: defaults }))
  assert.deepEqual(state.checked, ['product-0', ...setupIds])
  assert.deepEqual(missingSetup(lessons.find(x => x.id === 'product').launch, legacyIds).map(item => item.id), ['planning-team'])
})
test('all copied requests describe outcomes without prescribing internal HVE mechanics', () => {
  const prompts = lessons.flatMap(lesson => [lesson.launch, ...lesson.steps.map(step => step.prompt)]).filter(Boolean)
  const internals = /\b(hve|squad|coordinator|agent|role|roster|profile|pack|autopilot|intake|gate|registry|ledger|scribe|validator)\b|handoff\.md|backlog-execute|meta-routing|\.copilot-tracking|request=|\/squad/i
  for (const prompt of prompts) {
    assert.ok(!internals.test(prompt.text), prompt.title)
    assert.ok(prompt.text.trim().split(/\s+/).length <= 90, `${prompt.title} should sound like a normal request`)
  }
  assert.equal(lessons.find(x => x.id === 'ado').launch.target, true)
  const ado = lessons.find(x => x.id === 'ado')
  assert.ok(ado.behaviors.some(x => /waits for explicit approval/.test(x)))
  assert.ok(ado.behaviors.some(x => /Consent to add a role is separate/.test(x)))
  assert.match(observationNote, /not instructions to paste/)
  assert.match(observationNote, /capture the gap/)
})
test('personalization adds ordinary project facts, not internal procedures or missing-value instructions', () => {
  const prompt = lessons.find(x => x.id === 'ado').launch
  const settings = { ...defaults, organization: 'org', project: 'Project "Alpha"', participant: 'learner', documentTarget: 'docs' }
  const result = renderPrompt(prompt, settings)
  assert.match(result, /Our project details:/)
  assert.ok(result.includes('Project: "Project \\"Alpha\\""'))
  assert.ok(!/Project process:|Area path:|Iteration:|Confirm with me|handoff|ledger|executor/i.test(result))
  assert.equal(renderPrompt(prompt, { ...settings, experience: 'app' }), result)
  assert.match(renderPrompt(prompt, { ...settings, process: 'Scrum' }), /Project process: "Scrum"/)
})
test('branding uses the local official logo and HVE green/blue palette', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  const svg = await readFile(new URL('../public/hve-squad-logo.svg', import.meta.url), 'utf8')
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  for (const color of ['#3ddc97', '#5aa9ff', '#0b0f14']) assert.ok(css.includes(color))
  assert.ok(!/b11f4b|fd8ea1|177,\s*31,\s*75|253,\s*142,\s*161/i.test(css))
  assert.match(svg, /aria-label="hve-squad logo"/)
  assert.ok(!/<script|\bonload\s*=|<foreignObject/i.test(svg))
  assert.match(html, /%BASE_URL%hve-squad-logo.svg/)
})
test('PDF readiness requires actual source comparison and makes Python conditional', () => {
  const prepare = lessons.find(lesson => lesson.id === 'prepare')
  assert.match(pdfReadiness.requirement, /three requirements/)
  assert.match(pdfReadiness.requirement, /page or section references/)
  assert.match(pdfReadiness.requirement, /Compare its answer with the source/)
  assert.match(pdfReadiness.python, /Python is optional/)
  assert.match(pdfReadiness.python, /same Python environment/)
  assert.match(pdfReadiness.fallback, /does not perform OCR/)
  assert.match(pdfReadiness.fallback, /approved plain-text copy/i)
  assert.match(pdfReadiness.fallback, /access restrictions/)
  assert.equal(prepare.checks.at(-1), pdfReadiness.checkpoint)
  const readiness = prepare.steps.find(step => step.prompt).prompt
  assert.match(readiness.text, /three requirements/)
  assert.match(readiness.text, /page or section references/)
  assert.match(readiness.text, /do not start planning or implementation/)
})
test('optional PDF reader setup uses one Python interpreter and surfaces install/import failures', () => {
  assert.ok(pdfReadiness.setup.shell)
  assert.match(pdfReadiness.setup.text, /python -m pip install pypdf/)
  assert.match(pdfReadiness.setup.text, /sys.executable/)
  assert.match(pdfReadiness.setup.text, /import sys, pypdf/)
  assert.match(pdfReadiness.setup.text, /pypdf installation failed/)
  assert.match(pdfReadiness.setup.text, /pypdf cannot be imported/)
  assert.ok(!/PdfReader|extract_text|decrypt/.test(pdfReadiness.setup.text))
  assert.equal(renderPrompt(pdfReadiness.setup, defaults), pdfReadiness.setup.text)
})
const nonSetupRequests = lessons.flatMap(lesson => [
  lesson.launch, ...lesson.steps.map(step => step.prompt),
]).filter(Boolean)
const sampleSettings = {
  ...defaults, organization: 'sample-org', project: 'Release "A" \\ path',
  participant: 'learner-01', documentTarget: 'docs\\planning',
}
function parseVscode(command) {
  const match = /^(\/squad(?:-federation)?)(?: (init|promote|mode="autopilot"))? request=(.*)$/s.exec(command)
  assert.ok(match, `Unexpected VS Code command: ${command}`)
  return { entry: match[1], option: match[2], request: JSON.parse(match[3]) }
}
test('every non-setup request uses autopilot in all three hosts, including readiness and resume', () => {
  assert.equal(nonSetupRequests.length, 5)
  for (const prompt of nonSetupRequests) {
    const app = renderPrompt(prompt, { ...sampleSettings, experience: 'app' })
    assert.ok(app.startsWith(`${autopilotMode}\n\n`), prompt.title)
    assert.equal(renderPrompt(prompt, { ...sampleSettings, experience: 'cli' }), app)
    const vscode = parseVscode(renderPrompt(prompt, { ...sampleSettings, experience: 'vscode' }))
    assert.equal(vscode.option, autopilotMode)
    assert.equal(vscode.entry, `/${prompt.entry ?? 'squad'}`)
    assert.equal(vscode.request, app.slice(`${autopilotMode}\n\n`.length))
  }
})
test('VS Code uses documented lifecycle inputs and never adds autopilot to init/promote', () => {
  for (const step of lifecycleSteps) {
    for (const experience of experiences) {
      const command = renderPrompt(step.request, { ...defaults, experience })
      assert.ok(!command.includes(autopilotMode), step.id)
    }
    const result = parseVscode(renderPrompt(step.request, { ...defaults, experience: 'vscode' }))
    assert.equal(result.entry, `/${step.request.entry}`)
    if (step.id === 'planning-team') {
      assert.equal(result.option, undefined)
      assert.equal(result.request, `init\n\n${step.request.text}`)
    } else {
      assert.equal(result.option, step.request.lifecycle)
      assert.equal(result.request, step.request.text)
    }
  }
})
test('shell commands are untouched on all tabs', () => {
  for (const prompt of [repositorySetup, installation.apm, installation.plugin, packSetup, pdfReadiness.setup]) {
    for (const experience of experiences) {
      assert.equal(renderPrompt(prompt, { ...defaults, experience }), prompt.text)
      assert.ok(!renderPrompt(prompt, { ...defaults, experience }).includes(autopilotMode))
    }
  }
})
test('VS Code safely quotes multiline requests and project metadata', () => {
  const prompt = {
    title: 'Quoted', entry: 'squad', target: true,
    text: 'Read "knowledge-docs".\nDo not interpret \\ paths as parameters.',
  }
  const text = renderPrompt(prompt, sampleSettings).slice(`${autopilotMode}\n\n`.length)
  const parsed = parseVscode(renderPrompt(prompt, { ...sampleSettings, experience: 'vscode' }))
  assert.equal(parsed.request, text)
  assert.ok(parsed.request.includes(JSON.stringify(sampleSettings.project)))
  assert.throws(() => renderPrompt(prompt, { ...defaults, experience: 'vscode' }), /Complete Session setup/)
})
test('old App/CLI settings and new VS Code settings preserve checkpoints', () => {
  for (const experience of experiences) {
    const state = { schema: 1, settings: { ...sampleSettings, experience }, checked: ['product-0', 'setup:planning-team'] }
    assert.deepEqual(decodeState(JSON.stringify(state)), state)
  }
})
test('three-tab keyboard navigation wraps and supports Home/End', () => {
  assert.equal(nextExperience('app', 'ArrowRight'), 'cli')
  assert.equal(nextExperience('cli', 'ArrowRight'), 'vscode')
  assert.equal(nextExperience('vscode', 'ArrowRight'), 'app')
  assert.equal(nextExperience('app', 'ArrowLeft'), 'vscode')
  assert.equal(nextExperience('vscode', 'ArrowLeft'), 'cli')
  for (const current of experiences) {
    assert.equal(nextExperience(current, 'Home'), 'app')
    assert.equal(nextExperience(current, 'End'), 'vscode')
    assert.equal(nextExperience(current, 'Tab'), undefined)
  }
})
test('autopilot guidance retains scope and mandatory human approvals', () => {
  assert.match(modeGuidance, /every request other than init and promote/)
  assert.match(modeGuidance, /including readiness/)
  assert.match(modeGuidance, /does not waive required approvals/)
  assert.match(modeGuidance, /read-only question/)
})
