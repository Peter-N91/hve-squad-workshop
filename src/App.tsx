import { useEffect, useRef, useState } from 'react'
import { agenda, baseline, installation, lessons, lifecycleSteps, observationNote, packSetup, pdfReadiness, sources, troubleshooting } from './content'
import type { Lesson, LessonStep, Prompt } from './content'
import { agentSelection, decodeState, defaults, missingSetup, missingTarget, renderPrompt, setupCheckId, storageKey } from './state'
import type { SavedState, Settings } from './state'

const checkIds = new Set([
  ...lessons.flatMap(lesson => lesson.checks.map((_, index) => `${lesson.id}-${index}`)),
  ...lifecycleSteps.map(step => setupCheckId(step.id)),
])
function readInitial() {
  try {
    const data = decodeState(localStorage.getItem(storageKey))
    data.checked = data.checked.filter(id => checkIds.has(id))
    return { data, error: '' }
  } catch (error) {
    return {
      data: { schema: 1, checked: [], settings: { ...defaults } } satisfies SavedState,
      error: `Browser progress could not be loaded. Saving is paused; existing data has not been replaced. ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function App() {
  const [initial] = useState(readInitial)
  const [saved, setSaved] = useState(initial.data)
  const [storageError, setStorageError] = useState(initial.error)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(() => window.location.hash.slice(1) || 'overview')
  const [setupOpen, setSetupOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const heading = useRef<HTMLDivElement>(null)
  const resetDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const handle = () => {
      setPage(window.location.hash.slice(1) || 'overview')
      setMenuOpen(false)
    }
    window.addEventListener('hashchange', handle)
    return () => window.removeEventListener('hashchange', handle)
  }, [])
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])
  useEffect(() => {
    if (resetOpen) resetDialog.current?.showModal()
    else resetDialog.current?.close()
  }, [resetOpen])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const active = lessons.find(lesson => lesson.id === page)
  const selection = agentSelection(
    active?.launch?.entry ?? (['federation', 'implementation', 'resume'].includes(page) ? 'squad-federation' : 'squad'),
    saved.settings,
  )
  const progress = Math.round(saved.checked.length / checkIds.size * 100)
  function updateSaved(next: SavedState) {
    setSaved(next)
    if (storageError) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch (error) {
      setStorageError(`Progress could not be saved. Keep this tab open and export it before leaving. ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    updateSaved({ ...saved, settings: { ...saved.settings, [key]: value } })
  }
  const toggleCheck = (id: string) => {
    let checked = saved.checked.includes(id) ? saved.checked.filter(value => value !== id) : [...saved.checked, id]
    if (id.startsWith('setup:') && !checked.includes(id)) {
      checked = checked.filter(candidate => {
        const step = lifecycleSteps.find(item => setupCheckId(item.id) === candidate)
        return !step || missingSetup({ requiresSetup: [step.id] }, checked).length === 0
      })
    }
    updateSaved({ ...saved, checked })
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copied. Review the request in your own project before running it.')
    } catch (error) {
      setStatus(`Clipboard unavailable. Select and copy the visible text manually. ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  function renderPromptBlock(prompt: Prompt) {
    const missing = prompt.target === true ? missingTarget(saved.settings) : []
    const pending = missingSetup(prompt, saved.checked)
    const text = missing.length ? prompt.text : renderPrompt(prompt, saved.settings)
    const selectedAgent = agentSelection(prompt.entry, saved.settings)
    return <div className="prompt-block">
      <div className="prompt-toolbar">
        <span>{prompt.shell ? 'POWERSHELL · PROJECT PREPARATION / INSTALLATION' : prompt.lifecycle ? 'LIFECYCLE · SEND IN THE SELECTED AGENT CHAT' : 'BUSINESS WORK · PASTE INTO THE SELECTED AGENT'}</span>
        <button type="button" disabled={missing.length > 0 || pending.length > 0} onClick={() => copy(text)}>Copy</button>
      </div>
      <h4>{prompt.title}</h4>
      {!prompt.shell && <p className="agent-hint">{selectedAgent.instruction} Paste only the request below.</p>}
      <pre tabIndex={0}><code>{text}</code></pre>
      {pending.length > 0 && <div className="prompt-warning">
        Complete the setup checkpoint{pending.length > 1 ? 's' : ''} first:
        <ul>{pending.map(step => <li key={step.id}><a href={`#${step.lessonId}`}>{step.title}</a></li>)}</ul>
        <span>Mark these only after the actual setup is confirmed in your project.</span>
      </div>}
      {missing.length > 0 && <div className="prompt-warning">
        Copy is locked until Session setup contains: {missing.join(', ')}.
        <button type="button" onClick={() => { setSetupOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Open Session setup</button>
      </div>}
    </div>
  }
  function renderExercise(step: LessonStep, index: number) {
    return <div className="exercise" key={step.title}>
      <div className="step-index">{String(index + 1).padStart(2, '0')}</div>
      <div><h2>{step.title}</h2><p>{step.body}</p>{step.prompt && renderPromptBlock(step.prompt)}</div>
    </div>
  }
  function renderLesson(lesson: Lesson, printOnly = false) {
    return <article key={lesson.id} className={printOnly ? 'lesson print-only' : 'lesson'} aria-label={lesson.title}>
      <div className="eyebrow">{lesson.eyebrow} <span>/</span> {lesson.time}</div>
      <div className="lesson-title"><span className="big-number">{lesson.number}</span><h1>{lesson.title}</h1></div>
      <p className="lead">{lesson.goal}</p>
      <div className="concept"><strong>The idea</strong><p>{lesson.concept}</p></div>
      <section className="inputs"><h2>Have these ready</h2><ul>{lesson.inputs.map(input => <li key={input}>{input}</li>)}</ul></section>
      {lesson.beforeInstall && <section className="before-install" aria-label="Repository and knowledge-docs before installation">
        <div className="section-caption">BEFORE EITHER INSTALLATION METHOD</div>
        {lesson.beforeInstall.map(renderExercise)}
        <div className="repo-layout"><h3>Your local project should look like this</h3>
          <pre aria-label="Local repository layout"><code>{'qubix-workshop-project\\\n  .git\\\n  .gitignore\n  knowledge-docs\\\n    business-case.pdf'}</code></pre>
          <p className="small">business-case.pdf is an example filename. Keep the supplied name if preferred. Do not place the private document in the public website repository.</p>
        </div>
      </section>}
      {lesson.setup && <section className="lifecycle-list" aria-label="Setup before work">
        <div className="eyebrow">SETUP FIRST · WORK REQUEST AFTER CONFIRMATION</div>
        <p className="small">Send each lifecycle message separately in the selected agent’s chat. init and promote are not standalone shell commands. These checkboxes record your confirmation; they do not execute setup or approve actions for you.</p>
        {lesson.setup.map(step => <section className="lifecycle-step" data-setup-id={step.id} key={step.id}>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          {renderPromptBlock(step.request)}
          <h3>Expected result before continuing</h3>
          <ul>{step.expected.map(result => <li key={result}>{result}</li>)}</ul>
          <label className="check-row setup-check">
            <input type="checkbox"
              checked={saved.checked.includes(setupCheckId(step.id))}
              disabled={missingSetup(step.request, saved.checked).length > 0}
              onChange={() => toggleCheck(setupCheckId(step.id))} />
            <span>{step.checkpoint}</span>
          </label>
          <p className="small">Self-reported after checking the real project. Completing setup does not mean the business work has run.</p>
        </section>)}
      </section>}
      {lesson.launch && <section className="phase-launch" aria-label="Phase kickoff">
        <span className="eyebrow">WHAT YOU SAY · THE BUSINESS OUTCOME</span>
        <h2>{lesson.setup ? '2. Send the product work request' : lesson.id === 'implementation' ? '3. Send the implementation work request' : 'A request from the project owner'}</h2>
        <p>{lesson.launchHint}</p>
        {renderPromptBlock(lesson.launch)}
      </section>}
      {lesson.behaviors && <section className="behavior-panel" aria-label="What the squad should handle itself">
        <span className="eyebrow">WHAT TO OBSERVE · NOT PART OF THE REQUEST</span>
        <h2>What the squad should handle itself</h2>
        <ul>{lesson.behaviors.map(behavior => <li key={behavior}>{behavior}</li>)}</ul>
        <p className="small">{observationNote}</p>
      </section>}
      {lesson.continuation && <section className="continue-panel"><h2>Continue the run, not the script</h2><p>{lesson.continuation}</p><a href="#federation">See the federation setup sequence</a></section>}
      {lesson.id === 'prepare' && <div className="install-panel">
        <h2>3. Install after preparing the repository</h2>
        <p>Continue only once your local repository exists and the business case is inside its root-level <code>knowledge-docs</code> folder. If the paired tools are already installed, confirm them instead of reinstalling.</p>
        <div className="segmented" aria-label="Installation method">
          {(['plugin', 'apm'] as const).map(value => <button type="button" key={value} aria-pressed={saved.settings.install === value} onClick={() => updateSetting('install', value)}>{value === 'plugin' ? 'Plug-in · recommended' : 'APM · pinned'}</button>)}
        </div>
        <p>{saved.settings.install === 'plugin'
          ? 'Install both paired entries in the client you will actually use. Confirm the installed version; marketplace installation is not a version pin.'
          : 'Run from the root of your own implementation project after installing APM and authenticating GitHub. This command pins HVE Squad to the communicated workshop baseline.'}</p>
        {saved.settings.install === 'plugin' && saved.settings.experience === 'app'
          ? <div className="app-install"><h3>Install through the App’s Plugins settings</h3><ol><li>Open Plugins settings and find the <code>Peter-N91/hve-squad-plugin</code> marketplace.</li><li>Install both <code>hve-squad</code> and <code>hve-squad-hve-core</code>.</li><li>Return to the agent dropdown and confirm the coordinator agents are available.</li></ol><p className="small">Use the <a href="https://peter-n91.github.io/hve-squad-plugin/install-desktop.html" target="_blank" rel="noreferrer">App installation guide</a> for the host’s current settings labels. A standalone CLI installation may use a different plug-in home.</p></div>
          : renderPromptBlock(installation[saved.settings.install])}
        <details><summary>Power Platform pack dependencies</summary>
          <p>The pack’s external resources are not guaranteed to be installed by HVE Squad. The commands below follow the versioned external-cast catalog. They resolve upstream default revisions: review and freeze their resolved versions before the session. APM can install these supplementary project assets even when Squad itself is installed as a plug-in.</p>
          {renderPromptBlock(packSetup)}
          <p>These authoring specialists do not grant tenant permissions. PAC or connector deployment remains a separately approved action.</p>
        </details>
        <details><summary>App setup and Azure DevOps MCP</summary>
          <p>The App and CLI expose tools differently. Use the App’s agent dropdown and MCP settings; in the CLI select the agent with /agent. Do not paste a VS Code MCP configuration into another host blindly. Confirm availability with the readiness probe. Each client may use its own plug-in home; a terminal installation does not prove the App has the same assets.</p>
          <p>Configure the official <a href={sources[5].url} target="_blank" rel="noreferrer">Azure DevOps MCP</a> for your host. It needs Node and supported interactive authentication. Your organization, project, process, work-item permissions and documentation destination must be confirmed. Never paste credentials into this site, prompts or repository files.</p>
        </details>
      </div>}
      {lesson.id === 'prepare' && <section className="pdf-readiness install-panel" aria-label="PDF readiness">
        <span className="eyebrow">BEFORE THE WORKSHOP · TEST IN YOUR CHOSEN CLIENT</span>
        <h2>{pdfReadiness.title}</h2>
        <p>{pdfReadiness.requirement}</p>
        <h3>Python is conditional, not a universal prerequisite</h3>
        <p>{pdfReadiness.python}</p>
        <details><summary>Optional Python setup for text-based PDFs</summary>
          <p>Use an organization-approved Python environment. If your project uses a virtual environment, select it before running these commands. Have the Copilot client use the exact executable printed below. If Python was newly installed or PATH changed, reopen the client. Do not install additional PDF libraries merely because the agent searched for them.</p>
          {renderPromptBlock(pdfReadiness.setup)}
          <p className="small">This installs and checks the reader only. It does not read the case or verify extraction quality. Run the readiness conversation below afterward. See <a href="https://pypdf.readthedocs.io/en/stable/user/installation.html" target="_blank" rel="noreferrer">supported Python versions and installation guidance</a>.</p>
        </details>
        <h3>Scanned, protected or difficult PDFs</h3>
        <p>{pdfReadiness.fallback}</p>
      </section>}
      <section className="exercise-list" aria-label="Exercises">
        <div className="section-caption">{lesson.launch || lesson.continuation ? 'REVIEW CHECKPOINTS · NOT SEPARATE TASK REQUESTS' : 'PREPARE, OBSERVE AND REFLECT'}</div>
        {lesson.steps.map((step, index) => renderExercise(step, lesson.beforeInstall ? index + 3 : index))}
      </section>
      <div className="checkpoint-grid">
        <section className="evidence-card"><span className="eyebrow">OUTPUTS</span><h2>Evidence to keep</h2><ul>{lesson.evidence.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section className="check-card"><span className="eyebrow">YOUR CHECKPOINT</span><h2>Can you show it?</h2>
          {lesson.checks.map((item, index) => <label className="check-row" key={item}>
            <input type="checkbox" checked={saved.checked.includes(`${lesson.id}-${index}`)} onChange={() => toggleCheck(`${lesson.id}-${index}`)} />
            <span>{item}</span>
          </label>)}
          <p className="small">Self-reported, not automatic proof of completion.</p>
        </section>
      </div>
      <aside className="recovery"><h3>If you get stuck</h3><p>{lesson.recovery}</p></aside>
    </article>
  }
  const nextLesson = active ? lessons[lessons.indexOf(active) + 1] : undefined
  const previousLesson = active ? lessons[lessons.indexOf(active) - 1] : undefined
  const settingsFields: [keyof Settings, string, string][] = [
    ['organization', 'Azure DevOps organization', 'Organization name, not a token'],
    ['project', 'Project', 'Approved workshop project'],
    ['process', 'Project process (optional)', 'Leave empty for the squad to discover'],
    ['participant', 'Participant prefix', 'Your agreed unique prefix'],
    ['area', 'Area path (if assigned)', 'Leave empty to ask before publication'],
    ['iteration', 'Iteration path (if assigned)', 'Leave empty to ask before publication'],
    ['documentTarget', 'Planning-document destination', 'Approved Azure DevOps repo/path or Wiki'],
  ]

  return <div className={focusMode ? 'app focus-mode' : 'app'}>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); heading.current?.focus(); heading.current?.scrollIntoView() }}>Skip to content</a>
    <header className="topbar">
      <a className="brand" href="#overview"><img className="brand-mark" src={`${import.meta.env.BASE_URL}hve-squad-logo.svg`} alt="" width="48" height="48" /><span>HVE SQUAD<span className="brand-sub">WORKSHOP FIELD GUIDE</span></span></a>
      <div className="event-label">Qubix <span>16 September 2026 · CEST</span></div>
      <div className="header-actions">
        <button type="button" aria-expanded={setupOpen} onClick={() => setSetupOpen(!setupOpen)}>Session setup</button>
        <button type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark' : 'Light'}</button>
        <button className="mobile-menu" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Stages</button>
      </div>
    </header>
    {setupOpen && <section className="session-setup" aria-label="Session setup">
      <div className="setup-heading"><div><h2>Your session setup</h2><p>Only in this browser. No credentials, case content or customer data. Values are not sent to a server.</p></div><button type="button" onClick={() => setSetupOpen(false)}>Close setup</button></div>
      <div className="settings-grid">{settingsFields.map(([key, label, placeholder]) => <label key={key}>{label}<input value={saved.settings[key]} maxLength={300} placeholder={placeholder} onChange={event => updateSetting(key, event.target.value)} /></label>)}</div>
      <p className="small">This personalizes prompt text; it does not configure or authenticate Azure DevOps. Copying a prompt is not approval to execute it. The organization/project and destination must be supplied by the facilitator.</p>
    </section>}
    <div className="shell">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label="Workshop navigation">
        <div className="sidebar-heading">YOUR LEARNING JOURNEY</div>
        <nav><a href="#overview" aria-current={page === 'overview' ? 'page' : undefined} className="overview-link"><span>↗</span>Workshop overview</a>
          {lessons.map(lesson => {
            const count = lesson.checks.filter((_, index) => saved.checked.includes(`${lesson.id}-${index}`)).length +
              (lesson.setup ?? []).filter(step => saved.checked.includes(setupCheckId(step.id))).length
            const total = lesson.checks.length + (lesson.setup?.length ?? 0)
            return <a key={lesson.id} href={`#${lesson.id}`} aria-current={page === lesson.id ? 'page' : undefined}>
              <span className="nav-number">{count === total ? '✓' : lesson.number}</span>
              <span>{lesson.title}<small>{lesson.minutes ? `${lesson.minutes} min` : 'Before you join'}</small></span>
            </a>
          })}
          <a href="#resources" aria-current={page === 'resources' ? 'page' : undefined}><span>＋</span>Resources & recovery</a>
        </nav>
        <div className="progress-box"><div><strong>Your progress</strong><span>{progress}%</span></div><progress value={saved.checked.length} max={checkIds.size} aria-label="Self-reported workshop progress" /><p>{saved.checked.length} of {checkIds.size} checkpoints · browser-local</p><button type="button" onClick={() => download('qubix-workshop-progress.json', JSON.stringify(saved, null, 2), 'application/json')}>Export progress</button></div>
        <div className="discussion-note"><span className="eyebrow">PROTECTED TIME</span><strong>12:00–12:30</strong><span>Stop building. Start discussing.</span></div>
      </aside>
      <main id="main" className="main-content" ref={heading} tabIndex={-1}>
        <div className="content-toolbar">
          <div className="segmented" role="tablist" aria-label="Copilot experience">{(['app', 'cli'] as const).map(value => <button
            type="button" role="tab" id={`experience-${value}`} key={value}
            aria-selected={saved.settings.experience === value} aria-controls="experience-panel"
            tabIndex={saved.settings.experience === value ? 0 : -1}
            onClick={() => updateSetting('experience', value)}
            onKeyDown={event => {
              const next = event.key === 'Home' ? 'app' : event.key === 'End' ? 'cli'
                : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? (value === 'app' ? 'cli' : 'app') : undefined
              if (next) {
                event.preventDefault()
                updateSetting('experience', next)
                document.getElementById(`experience-${next}`)?.focus()
              }
            }}>{value === 'cli' ? 'Copilot CLI' : 'Copilot App'}</button>)}</div>
          <div><button type="button" aria-pressed={focusMode} onClick={() => setFocusMode(!focusMode)}>{focusMode ? 'Show navigation' : 'Focus view'}</button><button type="button" onClick={() => window.print()}>Print guide</button></div>
        </div>
        <section className="experience-panel" id="experience-panel" role="tabpanel" aria-labelledby={`experience-${saved.settings.experience}`} tabIndex={0}>
          {page === 'prepare' ? <div>
            <span className="eyebrow">PREPARE THE PROJECT FIRST</span><h2>Repository → knowledge-docs → installation</h2>
            <p>Create your local project and place the business case in knowledge-docs before installing APM assets or the paired plug-ins.</p>
            <p className="small">The tabs choose your Copilot client. Agent selection comes after preparation and installation.</p>
          </div> : <div><span className="eyebrow">SELECT THE AGENT FIRST</span><h2>{selection.name}</h2>
            <p>{selection.instruction}</p>
            <p className="small">Look for <code>{selection.identifier}</code>{saved.settings.install === 'plugin' ? ' if the picker shows namespaced labels.' : ' in the repository’s installed agents.'}</p>
            <p className="small">Then paste the plain-language request in that agent’s chat. Do not select a similarly named skill. Stay in your own implementation project.</p>
          </div>}
          {page !== 'prepare' && saved.settings.experience === 'cli' && <button type="button" onClick={() => copy('/agent')}>Copy /agent</button>}
        </section>
        {storageError && <div className="notice warning" role="alert">{storageError}<button type="button" onClick={() => setResetOpen(true)}>Review reset options</button></div>}
        <div className="status" role="status" aria-live="polite">{status}</div>
        {page === 'overview' ? <>
          <section className="hero">
            <div className="eyebrow">HANDS-ON LAB / WEDNESDAY 16 SEPTEMBER</div>
            <h1>From a business case<br />to a <em>working squad.</em></h1>
            <p className="lead">Give the coordinator a complete goal. Follow the work, challenge decisions and approve the important actions. Your squad orchestrates the specialists.</p>
            <div className="hero-actions"><a className="button primary" href="#prepare">Start with prerequisites <span>→</span></a><a className="button" href="#product">Jump into the lab</a></div>
            <div className="hero-meta"><span><strong>3 hours</strong>guided practice</span><span><strong>30 minutes</strong>discussion</span><span><strong>Your project</strong>your evidence</span></div>
          </section>
          <section className="method-note"><h2>Set up first. Then ask for the work.</h2><p><strong>Planning init → product request → publication → promote → delivery init → implementation request.</strong> Setup and business work are separate messages. Use init and promote in the selected agent’s chat, with context that lets it recommend the profiles.</p><p>The business requests stay outcome-led. Intake, specialist selection and review remain behaviors to observe, not procedures to dictate. Confirm each setup result before advancing; the guide’s checkboxes do not execute or approve anything.</p></section>
          <section className="journey-panel"><div className="section-heading"><h2>One connected workflow</h2><span className="badge">LEARN THE METHOD</span></div>
            <div className="journey"><div><span>01</span><strong>Product</strong><small>MVE · BRD · PRD</small></div><span className="arrow">→</span><div><span>02</span><strong>Azure DevOps</strong><small>Backlog · traceability</small></div><span className="arrow">→</span><div><span>03</span><strong>Federation</strong><small>Product + implementation</small></div><span className="arrow">→</span><div><span>04</span><strong>Implementation</strong><small>Plan · build · review</small></div></div>
          </section>
          <div className="overview-grid">
            <section className="agenda-card"><div className="section-heading"><h2>The morning at a glance</h2><span className="small">All times CEST</span></div>
              {agenda.map(item => <div className={item.lesson === 'discussion' ? 'agenda-row protected' : 'agenda-row'} key={item.time}><span className="agenda-time">{item.time}<small>{item.end}</small></span>{item.lesson ? <a href={`#${item.lesson}`}>{item.title}</a> : <span>{item.title}</span>}<span className="duration">{item.minutes}m</span></div>)}
            </section>
            <section className="outcome-card"><span className="eyebrow">THE REAL FINISH LINE</span><h2>Leave able to<br />do it again.</h2><p>You do not need to finish the whole application. You need to explain your decisions, inspect the output, hand work between squads and continue independently.</p><ul><li>Use a product profile with purpose.</li><li>Review before approving publication.</li><li>Preserve context through federation.</li><li>Distinguish generated, tested and deployed.</li></ul><div className="inset"><strong>MVE ≠ MVP</strong><p>A Minimum Viable Experiment tests an assumption. Unrun experiments have no results.</p></div></section>
          </div>
          <section className="privacy-note"><h3>Keep the case in your project, not in the chat.</h3><p>Place the privately supplied document in <code>knowledge-docs</code> at the root of your own repository, before installation. Requests use that folder as context. This public guide does not distribute the case or execute any copied request.</p></section>
        </> : active ? renderLesson(active) : page === 'resources' ? <article className="resources">
          <div className="eyebrow">KEEP MOVING, WITHOUT GUESSING</div><h1>Resources & recovery</h1><p className="lead">Keep the reference close. Keep the evidence honest.</p>
          <section className="resource-downloads"><h2>Your working templates</h2><p>Blank worksheets, not prebuilt project state or fabricated results. Save filled copies in your private implementation project.</p><a className="button primary" href={`${import.meta.env.BASE_URL}downloads/checkpoint-worksheet.txt`} download>Checkpoint worksheet</a><a className="button" href={`${import.meta.env.BASE_URL}downloads/federation-handoff.txt`} download>Federation handoff checklist</a></section>
          <section><h2>When something goes wrong</h2>{troubleshooting.map(([title, body]) => <details key={title}><summary>{title}</summary><p>{body}</p></details>)}</section>
          <section><h2>Versioned reference material</h2><p>The lesson mechanics are grounded in HVE Squad v{baseline}. This workshop selects the coordinator agent directly: App dropdown or CLI /agent, followed by a plain-language request. Source documentation may also describe other entry points; those are not this workshop’s path.</p><ul className="source-list">{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a></li>)}</ul><p className="small">MVE concepts are paraphrased from Microsoft HVE Core experiment-design guidance (CC BY 4.0); the teaching sequence and requests are workshop adaptations. HVE Squad references and the original logo are MIT licensed. The website uses the official dark green/blue palette with contrast-adjusted light/print variants. <a href={`${import.meta.env.BASE_URL}THIRD-PARTY-NOTICES.txt`}>Logo attribution and license</a>.</p></section>
          <section><h2>Browser data</h2><p>Progress and target settings stay in this browser’s local storage. They are not shared with the facilitator or synchronized across devices. Export contains your target settings: inspect it before sharing.</p><button type="button" onClick={() => download('qubix-workshop-progress.json', JSON.stringify(saved, null, 2), 'application/json')}>Export progress</button><button type="button" className="danger" onClick={() => setResetOpen(true)}>Reset browser data</button></section>
        </article> : <section><h1>Stage not found</h1><p>This link does not match a workshop stage.</p><a href="#overview">Return to the overview</a></section>}
        {active && <nav className="lesson-navigation" aria-label="Previous and next stage"><a href={`#${previousLesson?.id ?? 'overview'}`}>← {previousLesson?.title ?? 'Workshop overview'}</a><a className="button primary" href={`#${nextLesson?.id ?? 'resources'}`}>{nextLesson?.title ?? 'Resources & recovery'} →</a></nav>}
        {lessons.map(lesson => renderLesson(lesson, true))}
        <footer><span>Qubix · HVE Squad hands-on workshop</span><span>16 September 2026 · Guidance baseline v{baseline}</span></footer>
      </main>
    </div>
    <dialog ref={resetDialog} className="reset-dialog" aria-labelledby="reset-title" onCancel={() => setResetOpen(false)} onClose={() => setResetOpen(false)}><h2 id="reset-title">Reset this browser’s workshop data?</h2><p>This removes your saved checkpoints and target settings for this workshop only. It does not affect any repository, squad or Azure DevOps item.</p><button autoFocus type="button" onClick={() => setResetOpen(false)}>Keep my data</button><button type="button" className="danger" onClick={() => {
      try {
        localStorage.removeItem(storageKey)
        setSaved({ schema: 1, checked: [], settings: { ...defaults } })
        setStorageError('')
        setStatus('Workshop browser data reset.')
        setResetOpen(false)
      } catch (error) {
        setStatus(`Reset failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }}>Reset workshop data</button></dialog>
  </div>
}
export default App
