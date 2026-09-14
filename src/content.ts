export type SetupId = 'planning-team' | 'promote' | 'delivery-team'

export type Prompt = {
  title: string
  text: string
  entry?: 'squad' | 'squad-federation'
  target?: boolean
  shell?: boolean
  lifecycle?: 'init' | 'promote'
  requiresSetup?: SetupId[]
}

export type LifecycleStep = {
  id: SetupId
  title: string
  description: string
  request: Prompt
  expected: string[]
  checkpoint: string
}

export type LessonStep = { title: string; body: string; prompt?: Prompt }

export type Lesson = {
  id: string
  number: string
  title: string
  eyebrow: string
  time: string
  minutes: number
  goal: string
  inputs: string[]
  concept: string
  launch?: Prompt
  launchHint?: string
  continuation?: string
  behaviors?: string[]
  setup?: LifecycleStep[]
  beforeInstall?: LessonStep[]
  steps: LessonStep[]
  evidence: string[]
  checks: string[]
  recovery: string
}

export const baseline = '0.16.2'
export const observationNote = 'These are expected behaviors to observe, not instructions to paste. Record what actually happens. If a check or role proposal is missing, capture the gap rather than quietly adding it to the request. Required consent still applies.'
export const sources = [
  { name: 'HVE Squad v0.16.2: usage and gates', url: 'https://github.com/Peter-N91/hve-squad/blob/v0.16.2/docs/usage.html' },
  { name: 'Profiles and technology packs', url: 'https://github.com/Peter-N91/hve-squad/blob/v0.16.2/squad-src/.github/skills/squad/references/profiles-and-packs.md' },
  { name: 'Federation and promotion contract', url: 'https://github.com/Peter-N91/hve-squad/blob/v0.16.2/squad-src/.github/skills/squad/references/federation.md' },
  { name: 'Controlled backlog execution', url: 'https://github.com/Peter-N91/hve-squad/blob/v0.16.2/squad-src/.github/agents/squad/squad-backlog-executor.agent.md' },
  { name: 'Microsoft HVE Core: Minimum Viable Experiment', url: 'https://github.com/microsoft/hve-core/blob/7cc6dc42caf7f842e1f7aa9f3d41cb4581538f33/.github/skills/project-planning/experiment-design/SKILL.md' },
  { name: 'Official Azure DevOps MCP setup', url: 'https://github.com/microsoft/azure-devops-mcp' },
  { name: 'GitHub Copilot CLI installation', url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/install-copilot-cli' },
  { name: 'APM quickstart', url: 'https://microsoft.github.io/apm/quickstart/' },
  { name: 'HVE Squad plug-in: CLI and agent namespace', url: 'https://peter-n91.github.io/hve-squad-plugin/install-cli.html' },
  { name: 'HVE Squad plug-in: App installation', url: 'https://peter-n91.github.io/hve-squad-plugin/install-desktop.html' },
  { name: 'HVE Squad branding and logo', url: 'https://github.com/Peter-N91/hve-squad/tree/main/docs/assets' },
]

export const agenda = [
  { time: '09:00', end: '09:10', title: 'Orient & connect', lesson: 'start', minutes: 10 },
  { time: '09:10', end: '10:05', title: 'Shape the product', lesson: 'product', minutes: 55 },
  { time: '10:05', end: '10:25', title: 'Publish to Azure DevOps', lesson: 'ado', minutes: 20 },
  { time: '10:25', end: '10:35', title: 'Break', lesson: '', minutes: 10 },
  { time: '10:35', end: '10:55', title: 'Form the federation', lesson: 'federation', minutes: 20 },
  { time: '10:55', end: '11:45', title: 'Implement & review', lesson: 'implementation', minutes: 50 },
  { time: '11:45', end: '12:00', title: 'Continue independently', lesson: 'resume', minutes: 15 },
  { time: '12:00', end: '12:30', title: 'Discuss & reflect', lesson: 'discussion', minutes: 30 },
]

export const installation: Record<'plugin' | 'apm', Prompt> = {
  plugin: {
    title: 'Recommended plug-in installation', shell: true,
    text: 'copilot plugin marketplace add Peter-N91/hve-squad-plugin\ncopilot plugin install hve-squad@hve-squad-plugin\ncopilot plugin install hve-squad-hve-core@hve-squad-plugin',
  },
  apm: {
    title: 'Repository-scoped, pinned APM installation', shell: true,
    text: 'apm install "Peter-N91/hve-squad#v0.16.2" --target copilot',
  },
}
export const repositorySetup: Prompt = {
  title: 'Create a fresh local workshop project', shell: true,
  text: [
    '& {',
    '  $ErrorActionPreference = "Stop"',
    '  Get-Command git -ErrorAction Stop | Out-Null',
    '  $repo = Join-Path (Get-Location) "qubix-workshop-project"',
    '  if (Test-Path -LiteralPath $repo) {',
    '    throw "This folder already exists. Inspect it or choose a different parent folder; do not overwrite it."',
    '  }',
    '  New-Item -ItemType Directory -Path $repo | Out-Null',
    '  Set-Location -LiteralPath $repo',
    '  git init -b main',
    '  if ($LASTEXITCODE -ne 0) { throw "Git initialization failed. Stop and resolve the error." }',
    '  New-Item -ItemType Directory -Path ".\\knowledge-docs" | Out-Null',
    '  Set-Content -LiteralPath ".\\.gitignore" -Value "knowledge-docs/" -Encoding utf8',
    '  Write-Output "Copy the business case into knowledge-docs before installing HVE Squad."',
    '}',
  ].join('\n'),
}
export const packSetup: Prompt = {
  title: 'Supplemental Power Platform resources (APM)', shell: true,
  text: 'apm install github/awesome-copilot/agents/power-platform-expert.agent.md --target copilot\napm install github/awesome-copilot/skills/power-platform-architect --target copilot\napm install github/awesome-copilot/agents/power-platform-mcp-integration-expert.agent.md --target copilot\napm install github/awesome-copilot/skills/power-platform-mcp-connector-suite --target copilot\napm install github/awesome-copilot/skills/mcp-copilot-studio-server-generator --target copilot',
}

export const lessons: Lesson[] = [
  {
    id: 'prepare', number: '00', title: 'Get ready', eyebrow: 'Before the workshop', time: 'Complete before Wednesday', minutes: 0,
    goal: 'Arrive ready to learn the workflow, not spend the session installing tools.',
    inputs: ['Git and PowerShell 7+ available locally', 'A GitHub account with enabled Copilot access', 'The business case supplied privately by the facilitator'],
    concept: 'Create your own local repository and put the business case in its root-level knowledge-docs folder before either APM or plug-in installation. This website is only the guide, not your implementation repository.',
    beforeInstall: [
      {
        title: '1. Create your local repository',
        body: 'Choose a parent folder for your local projects, open PowerShell there and run the example below. It creates a fresh qubix-workshop-project repository and knowledge-docs folder, then leaves you at the repository root. It stops if the folder already exists. If you already created your workshop repository, use that root and create knowledge-docs there instead; do not reinitialize an unrelated repository.',
        prompt: repositorySetup,
      },
      {
        title: '2. Put the business case in knowledge-docs',
        body: 'Copy the document supplied by the facilitator into knowledge-docs at the root of your new repository. Keep its original filename if you prefer. The requests refer to that folder and the business case inside it, not a chat attachment. Confirm the file is present before installing. The example excludes knowledge-docs from Git to prevent accidental publication; this does not prevent an explicit local read where your client permits it. If the document cannot be read, request a permitted accessible copy in the same folder.',
      },
    ],
    steps: [
      { title: 'Confirm the installation in this project', body: 'After repository and knowledge-docs preparation, use the installation panel above. For APM, authenticate GitHub and run the installation from this repository root. For the plug-in path, install both paired entries in your selected client, then open this same project. Avoid conflicting standalone HVE Core versions. If already installed, confirm the paired versions rather than reinstalling unnecessarily.' },
      { title: 'Prepare Azure DevOps access', body: 'Obtain the approved organization, project, participant scope and documentation destination. Configure the official Azure DevOps MCP server in your chosen host and authenticate through its supported sign-in flow. Confirm access before the workshop. The project process can be discovered by the squad; participants do not need to prescribe its work-item mapping.' },
      { title: 'Prepare the implementation environment', body: 'Make facilitator-approved tools and possible Power Platform specialist resources available beforehand. This installs capabilities, not a predetermined roster. Let the squad recommend the expertise it needs from the case. Prepare the appropriate toolchain and an isolated development environment; availability is not permission to modify a tenant.' },
      { title: 'Run the readiness conversation', body: 'Select Squad Coordinator through the App dropdown or CLI /agent, then ask the question below. Installation details belong in preparation, not in a business request that dictates how the squad must operate.', prompt: {
        title: 'What you ask: am I ready to begin?', entry: 'squad',
        text: 'Can you read knowledge-docs at the root of this repository and the business case document inside it, and tell me whether I can get started?',
      } },
    ],
    evidence: ['A local Git repository with the case in root-level knowledge-docs', 'An actual version record and coordinator selection in that project', 'A working Azure DevOps connection and permitted development target'],
    checks: ['My local repository contains the readable business case in knowledge-docs.', 'I have one consistent HVE Squad/HVE Core installation.', 'I have verified Azure DevOps access and my participant scope.', 'My implementation tools and the required Power Platform resources are available.'],
    recovery: 'Tell the facilitator what is blocked beforehand. Local product planning can continue without Azure DevOps, but live publication must remain marked incomplete. Watching a shared environment is a fallback, not proof that your own is ready.',
  },
  {
    id: 'start', number: '01', title: 'Orient & connect', eyebrow: 'Start with the outcome', time: '09:00–09:10 CEST', minutes: 10,
    goal: 'Learn to express the outcome and recognize the method the squad applies itself.',
    inputs: ['Completed readiness checks', 'The business case in knowledge-docs at your project root'],
    concept: 'You are the project owner, not the author of the squad’s operating procedure. Ask for useful outcomes, answer real questions and inspect the evidence. Finishing the application is not the exit criterion.',
    steps: [
      { title: 'Follow the complete chain', body: 'Initialize the planning team → send the product request → review and publish → promote the existing team → initialize delivery inside the federation → send the implementation request. Setup and work are separate conversations, not one combined kickoff.' },
      { title: 'Separate lifecycle from business work', body: 'Select the agent through the host UI. Use init and promote as lifecycle instructions inside that agent chat, not shell or skill commands. Describe the work so the agent recommends a profile. Once setup is confirmed, send the ordinary business request without naming internal roles or gates.' },
      { title: 'Keep an honest evidence trail', body: 'Record what the squad did without prompting, what needed a business answer and what was missing. Do not add a missing internal instruction and then describe the resulting behavior as automatic. Browser progress is self-reported and visible only to you.' },
    ],
    evidence: ['A clear project boundary', 'A personal record of observed behavior and decisions'],
    checks: ['I know which repository I am working in.', 'I understand that approvals and reviews are part of the exercise.'],
    recovery: 'If the session opens in the guide repository or an unrelated folder, switch to your own project before proceeding. Missing behavior is a finding to investigate, not something to conceal.',
  },
  {
    id: 'product', number: '02', title: 'Shape the product', eyebrow: 'From business intent to a plan', time: '09:10–10:05 CEST', minutes: 55,
    goal: 'Turn the supplied case into reviewed product artifacts and a usable backlog.',
    inputs: ['The business case document inside root-level knowledge-docs', 'Business answers from you, not invented by the agent'],
    concept: 'First initialize a team for planning, then ask it to produce the artifacts. The setup context should lead to the product profile without naming that profile in the message. Initialization must finish before the separate business request.',
    setup: [{
      id: 'planning-team',
      title: '1. Initialize the planning team',
      description: 'In your fresh participant project, select Squad Coordinator. Send init with the planning context below. Review the recommendation, naming and approval choices, then confirm setup. If a suitable team already exists, inspect and reuse it rather than rebuilding it.',
      request: {
        title: 'Initialize from the purpose of the work', entry: 'squad', lifecycle: 'init',
        text: 'Use knowledge-docs at the root of this repository and the business case document inside it as context. We need to understand the business need, define business and product requirements, test key assumptions and prioritize a backlog before development. Set up a team for this planning work. Stop once the team is ready; I will send the work request next.',
      },
      expected: [
        'The agent recommends the product profile from the planning context, without a profile name in the request. If it recommends something else, clarify the purpose and record that divergence.',
        'You confirm the proposal and the planning team state is created in this project.',
        'Setup ends without generating the BRD, PRD, experiment plan or backlog. Those belong to the next request.',
      ],
      checkpoint: 'I confirmed the planning team and initialization is complete.',
    }],
    launchHint: '2. After the planning team is initialized, send this separate work request. Let requirements intake, specialist routing and review happen under the squad’s own procedure.',
    launch: {
      title: 'What you ask: prepare the project', entry: 'squad', requiresSetup: ['planning-team'],
      text: 'Use knowledge-docs at the root of this repository and the business case document inside it. Turn it into business requirements, product requirements and a prioritized backlog with clear acceptance criteria and a proposed first-release scope. Include a small experiment to test the most important uncertainty before we commit to the solution. For now, I want a plan we can review, not an implementation.',
    },
    behaviors: [
      'The supplied case triggers intake assessment and questions about missing or contradictory requirements without you requesting the gate.',
      'The initialized planning team identifies any additional roles the actual work needs. Required additions are proposed for consent, not silently installed.',
      'It coordinates planning and independent review itself rather than requiring you to name each specialist.',
      'It distinguishes facts, assumptions and unrun experiments, and presents the resulting artifacts for your judgment.',
    ],
    steps: [
      { title: 'Intake after setup', body: 'The team now exists. Notice whether the business request triggers assessment of the supplied case without you asking for intake. Respond to questions and required confirmations; do not quietly add a missing internal procedure to make the demonstration pass.' },
      { title: 'BRD: business intent', body: 'Inspect business outcomes, stakeholders, scope, constraints and success measures. Ask which statements came from the case and which need a decision. You challenge the content; the squad decides who should revise it.' },
      { title: 'MVE: the uncertainty worth testing', body: 'Challenge the uncertainty, hypothesis, minimum experiment, measure and decision threshold. MVE means Minimum Viable Experiment, not MVP. A designed experiment has no result until someone runs it and collects evidence.' },
      { title: 'PRD: testable product behavior', body: 'Inspect behavior, acceptance criteria and non-functional requirements. Keep decided facts separate from pending evidence. Challenge vague criteria rather than prescribing the internal review process.' },
      { title: 'Backlog: agree the first release', body: 'Review priorities, dependencies and acceptance criteria, then agree a coherent first-release slice of the backlog. Keep the remaining scope visible. The release may contain several dependent items; it is not automatically the first item in a list. Record which items belong to it and the release acceptance boundary.' },
    ],
    evidence: ['Reviewed BRD and PRD at the paths the squad reports', 'Experiment design with honest execution status', 'Prioritized backlog with an agreed first-release scope', 'Observed intake findings, proposals and human decisions'],
    checks: ['I can distinguish BRD, PRD, MVE and backlog.', 'I challenged at least one assumption or acceptance criterion.', 'My artifacts have a readiness verdict and visible unresolved gaps.', 'I can locate a finalized plan for the approved publication batch.'],
    recovery: 'Narrow prose polishing before cutting review. If a plan is not ready, inspect the publication protocol without writing incomplete content to the tracker. Record absent automatic behavior before discussing a corrective intervention.',
  },
  {
    id: 'ado', number: '03', title: 'Publish with control', eyebrow: 'Azure DevOps', time: '10:05–10:25 CEST', minutes: 20,
    goal: 'Make the reviewed plan available to the team in Azure DevOps.',
    inputs: ['Reviewed planning artifacts and an agreed first batch', 'Approved organization, project, participant scope and document location', 'Authenticated access with the necessary permissions'],
    concept: 'The business request says where the team wants to work. It does not tell the squad to add an executor, check duplicates or invoke an approval gate. Those are behaviors to observe, and the necessary consent remains separate.',
    launchHint: 'Send the publication request once, without naming the internal executor or its procedure. Observe whether it identifies what is missing and requests approval before the actual changes.',
    launch: {
      title: 'What you ask: make the plan available to the team', entry: 'squad', target: true, requiresSetup: ['planning-team'],
      text: "We're happy with this plan and want the team to work from it in Azure DevOps. Please put the backlog in our project, store the requirements and experiment plan in the agreed documentation location, and link the documents to the relevant work items.",
    },
    behaviors: [
      'The squad recognizes a live tracker operation and proposes the missing execution role itself, if needed.',
      'It checks the destination, project process, access, planned content and possible duplicates without a user-specified tool sequence.',
      'It presents the exact changes and waits for explicit approval. Consent to add a role is separate from consent to publish.',
      'It returns actual identifiers and records partial failures without inventing success or replaying completed operations.',
    ],
    steps: [
      { title: 'Observe the capability and preview proposals', body: 'Let the squad identify the required execution capability. Inspect any proposed role addition before agreeing. Then review the destination, content, operation count, hierarchy and duplicate findings. Do not confuse the first consent with publication approval.' },
      { title: 'Approve and inspect the actual result', body: 'Approve only the specific batch you have reviewed. Changed content or destination requires a new decision. Inspect real identifiers and hierarchy links. On partial failure, preserve completed work and the recorded remaining operations.' },
      { title: 'Review document publication', body: 'The request also covers the requirements and experiment plan. Inspect their document destinations and link changes at the separate approval point. The original case is not automatically cleared for redistribution.' },
    ],
    evidence: ['Actual item identifiers and links', 'The approval record and honest partial state', 'Document locations and traceability, or an explicit blocker'],
    checks: ['I reviewed the actual batch and destination before authorizing it.', 'I can open my created items and inspect their hierarchy.', 'My planning documents are linked, or I have recorded that this step is blocked.'],
    recovery: 'If capability or access is missing, retain the local plan and exact error. Do not bypass the executor with a token/REST call, use another person’s credentials or erase partial results to start again. Take the 10:25 break.',
  },
  {
    id: 'federation', number: '04', title: 'Form the federation', eyebrow: 'Product → implementation', time: '10:35–10:55 CEST', minutes: 20,
    goal: 'Promote the existing planning team, then initialize a separate delivery team before asking it to build.',
    inputs: ['Existing product work and the reviewed plan', 'Case-appropriate tools and available specialist resources', 'Real backlog identifiers, or an explicitly local plan if publication is blocked'],
    concept: 'There are two distinct setup operations here: promote preserves the existing planning squad inside a federation; init then adds a new delivery squad to that federation. Neither setup message starts implementation.',
    setup: [
      {
        id: 'promote',
        title: '1. Promote the existing planning team',
        description: 'Switch to Squad Federation Coordinator. Start from the existing single planning squad and its completed product work. Send promote first, review the relocation proposal and confirm it. If a federation already exists, inspect it instead of promoting again.',
        request: {
          title: 'Promote, preserving the existing work', entry: 'squad-federation', lifecycle: 'promote', requiresSetup: ['planning-team'],
          text: 'We want to keep this planning team and everything it has produced, while making room for a separate team to build the solution. Prepare that transition and show me what will change. Stop after the existing team has been preserved in the new structure; do not add a delivery team or start implementation yet.',
        },
        expected: [
          'A federation is created by adopting the existing planning squad, not by recreating its work.',
          'The reported state and artifact moves preserve requirements, decisions, history and evidence. Record the actual adopted team name and new paths.',
          'knowledge-docs remains at the repository root as shared source context for the planning and delivery teams.',
          'Promotion completes before a delivery team is added. The existing planning team remains the only workstream at this checkpoint.',
        ],
        checkpoint: 'Promotion is complete and the existing planning work is preserved.',
      },
      {
        id: 'delivery-team',
        title: '2. Initialize delivery inside the federation',
        description: 'Stay with Squad Federation Coordinator after promotion succeeds. Send init with the delivery context. Because the federation now exists, init expands it with a new team rather than recreating the whole structure.',
        request: {
          title: 'Initialize a new team from the implementation need', entry: 'squad-federation', lifecycle: 'init', requiresSetup: ['promote'],
          text: 'Use knowledge-docs at the root of this repository, the business case document inside it and our agreed backlog as context. Add a separate team to work out the technical design, build and test the solution. Keep the planning team’s decisions and responsibilities separate. Set up this delivery team without starting implementation; I will send that request next.',
        },
        expected: [
          'An implementation-oriented profile and relevant technology expertise are proposed from the business case, without you naming the profile or pack.',
          'You confirm the new team, and it is registered alongside the preserved planning team with distinct responsibilities.',
          'The delivery team is initialized but has not started implementation. Record its actual name before moving to the next stage.',
        ],
        checkpoint: 'The new delivery team is initialized inside the federation.',
      },
    ],
    behaviors: [
      'Promotion and federation expansion are treated as separate, confirmed operations.',
      'It infers the relevant technical expertise from the case and proposes required role or capability additions, with consent where needed.',
      'It explains ownership, the delivery plan and structural changes before asking for confirmation.',
      'It stops after each setup operation instead of treating setup as permission to start building.',
    ],
    steps: [
      { title: 'Preserve the existing product work', body: 'Review the proposed structure and any relocation inventory before confirming. Check that requirements, decisions and evidence remain available. Record the actual names and paths reported, rather than imposing a template.' },
      { title: 'Understand the proposed expertise and ownership', body: 'Does the proposal fit the case and give product and implementation distinct responsibilities? Observe which specialists the squad identifies itself. An installed capability is not proof that a role actually participated.' },
      { title: 'Finish setup before delivery', body: 'Confirm that promotion finished first and that the new delivery team was then added to the existing federation. No implementation request has been sent yet. Continue to the implementation stage to issue that separate request.' },
    ],
    evidence: ['Separate promotion and delivery-init confirmations', 'Actual workstream names, responsibilities and state locations', 'Preserved product artifacts and an initialized delivery team'],
    checks: ['My original product state and deliverables are preserved.', 'I can distinguish the two squads and their responsibilities.', 'I can explain why the proposed expertise fits the case.', 'I know which initialized team will receive the implementation request.'],
    recovery: 'Stop on a collision or incomplete relocation and inspect what was reported. Do not delete state or recreate product work to hide a problem. If specialist capability is absent, report that limitation rather than claiming its review occurred.',
  },
  {
    id: 'implementation', number: '05', title: 'Implement & review', eyebrow: 'From the agreed plan to evidence', time: '10:55–11:45 CEST', minutes: 50,
    goal: 'Work through an agreed first-release slice of the backlog and inspect evidence against its acceptance criteria.',
    inputs: ['The new delivery team initialized in the federation', 'The agreed backlog and first-release scope', 'The business case in root-level knowledge-docs', 'Known local toolchain and permitted development environment'],
    concept: 'Setup is complete; now ask the delivery team to fulfill the agreed first release, not merely one isolated item. The release is a bounded part of the backlog. It may remain unfinished in the workshop: learning the workflow and recording the remaining work still define success.',
    launchHint: '3. After promotion and delivery initialization, send this separate implementation request. Check that the squad uses the agreed release backlog, includes dependencies and does not silently expand to the whole application.',
    launch: {
      title: 'What you ask: deliver the first release from the backlog', entry: 'squad-federation', requiresSetup: ['delivery-team'],
      text: 'Use our agreed backlog and knowledge-docs at the root of this repository, including the business case document inside it, to implement the first release. Work through the items in that release and meet their acceptance criteria. If the release scope is not defined yet, propose a small, coherent set of prioritized items for us to agree before building. Show what is complete, what has been tested and what remains.',
    },
    behaviors: [
      'The squad identifies the agreed first-release items and their dependencies, then coordinates implementation and review under its actual working mode.',
      'It raises business ambiguity and impactful changes for human decisions without being told the names of its gates.',
      'It distinguishes generated work, observed tests, deployment and remaining gaps.',
    ],
    steps: [
      { title: 'Confirm the release boundary', body: 'Inspect the selected backlog items, their dependencies and release acceptance criteria. If no release is defined, agree the proposed slice before building. Use published item identifiers where available, or the reviewed local backlog if publication was blocked. Do not silently substitute a single item for the agreed release.' },
      { title: 'Work through the release backlog', body: 'Inspect changes item by item while keeping the release goal visible. Resolve dependencies in a sensible order. Tenant, schema/data and deployment operations still need separate consent. Keep production and real customer data out of the exercise.' },
      { title: 'Review release progress honestly', body: 'Look for evidence against each included item’s acceptance criteria. Distinguish completed, tested, untested and blocked work. Finishing a component does not mean the release is finished. If time runs out, record the remaining release items and the next action.' },
    ],
    evidence: ['Agreed first-release items, dependencies and acceptance boundary', 'Actual changes and item-level test/review evidence', 'Remaining and blocked release items with the next action'],
    checks: ['I approved and can explain the implementation scope.', 'I inspected real output rather than accepting the summary alone.', 'I know which acceptance criteria are satisfied, untested or blocked.'],
    recovery: 'At 11:45 stop extending the build and record release progress. Completing the first release is an aim, not a requirement for finishing the workshop. Preserve incomplete items and evidence; do not declare the release complete just because one item works. Keep the final 30 minutes for discussion.',
  },
  {
    id: 'resume', number: '06', title: 'Continue independently', eyebrow: 'Your next session', time: '11:45–12:00 CEST', minutes: 15,
    goal: 'Resume and ask for the next useful action without knowing the state-file layout.',
    inputs: ['The same project and its existing history', 'Your record of decisions, evidence and unfinished work'],
    concept: 'You should be able to pick up the project without telling the squad where its registry, decisions or member state are stored. Watch whether it recognizes and uses the existing work.',
    behaviors: ['The squad recognizes the project, retrieves relevant history and proposes a next action without being given internal paths.'],
    steps: [
      { title: '1. Resume from a fresh conversation (5 min)', body: 'Open a fresh conversation in the same project and select the federation agent through the App dropdown or CLI /agent. Ask the ordinary project question below.', prompt: {
        title: 'What you ask: where did we get to?', entry: 'squad-federation',
        text: "Let's pick up where we left off on the first release. Using our backlog and the business case in knowledge-docs, what have we completed, what is still open, and what should we work on next?",
      } },
      { title: '2. Make your own request (5 min)', body: 'Ask a real next business or delivery question in your own words. Notice how the squad routes it, then explain why that ownership makes sense.' },
      { title: '3. Save your evidence (5 min)', body: 'Record actual artifacts, identifiers, decisions, gaps and next action privately. Browser progress is self-reported, not project evidence. Stop building at noon.' },
    ],
    evidence: ['A resumed conversation that recognizes existing work', 'A self-authored request and observed ownership choice', 'A next action with concrete blockers'],
    checks: ['I can resume without reinitializing.', 'I can route a new request to the right squad myself.', 'I have recorded the next action and remaining gaps.'],
    recovery: 'Check the actual project root if previous work is missing. Report an access or state problem rather than creating a new federation over the old one.',
  },
  {
    id: 'discussion', number: '07', title: 'Discuss & reflect', eyebrow: 'Protected discussion', time: '12:00–12:30 CEST', minutes: 30,
    goal: 'Assess independent behavior, human judgment and reuse in real delivery.',
    inputs: ['Your artifacts and experience, including failures', 'One example of a human decision that improved the result'],
    concept: 'The final half-hour is for discussion, not implementation overflow. Separate what the squad did unprompted from what only happened after intervention. An incomplete application can still be a successful learning outcome.',
    steps: [
      { title: 'Compare evidence (10 min)', body: 'Which checks, team proposals and reviews happened without being requested? Which were missing? Show a useful artifact and a concrete correction, rather than judging by confident summaries.' },
      { title: 'Assess transferability (10 min)', body: 'What should the delivery practice standardize in preparation, inputs and evidence? Where must a consultant or engineer remain accountable? Keep observed behavior separate from expectations.' },
      { title: 'Choose the next independent use (10 min)', body: 'Name a realistic workflow, owner, constraints and success measure. Separate tooling/access friction from the quality of the method.' },
    ],
    evidence: ['One concrete learning and one limitation', 'A realistic next use recorded privately'],
    checks: ['I can explain a decision I improved through human review.', 'I can describe where I would reuse this workflow and what I would change.'],
    recovery: 'Bring the blocker into the discussion. Useful feedback includes absent automatic behavior and the conditions under which it occurred.',
  },
]

export const lifecycleSteps = lessons.flatMap(lesson =>
  (lesson.setup ?? []).map(step => ({ ...step, lessonId: lesson.id })),
)

export const troubleshooting = [
  ['I see skills or prompts instead of the agent', 'Use the App agent dropdown or CLI /agent. Select Squad Coordinator for product/publication and Squad Federation Coordinator for federation/delivery. Plug-in labels may be namespaced. Do not select a similarly named skill.'],
  ['The agent is missing from the picker', 'Check the project and both paired plug-ins in the current client, or APM deployment to the repository. App and standalone CLI can use different plug-in homes. A request cannot select an unavailable agent.'],
  ['Which messages are separate?', 'Planning init and the product work request are separate. Later, promote, delivery init inside the federation, and the implementation work request are three separate messages. Within a work phase, do not send a new task for every internal role.'],
  ['Where do I type init or promote?', 'Send the lifecycle instruction with its context in the selected agent’s chat. These are not standalone terminal commands or slash-skill invocations. Use the App dropdown or CLI /agent only to select the entry agent.'],
  ['My team is already initialized', 'Inspect and confirm the existing setup instead of recreating it. Mark the guide checkpoint only after confirming the actual state. The browser checkboxes do not initialize anything or grant approval to an agent.'],
  ['An expected check or role proposal did not happen', 'Record the missing behavior before the facilitator investigates. Do not quietly add its internal procedure to the request and present the result as automatic. Expected behavior is an observation target, not a demonstrated outcome.'],
  ['No squad state is detected', 'Normal in a fresh project. After prior work, check the current project root before creating anything. Let the squad propose initialization when it is actually needed.'],
  ['The business case cannot be found', 'Confirm that you opened the participant repository, not the website repository. The document must be inside knowledge-docs at that root, not only in a previous chat. Give the permitted local document path explicitly if the client skips ignored folders. If the format or rights block reading, request an accessible copy; do not invent its content.'],
  ['APM reports No harness detected', 'Use --target copilot for the pinned installation in the participant project. Authenticate GitHub to avoid anonymous rate limits. Do not run maintainer sync scripts.'],
  ['Power Platform specialists are unavailable', 'Resources must be installed and permitted before a role can use them. Installing resources does not automatically seed a roster. Let the squad identify the need, then decide on any proposed addition.'],
  ['Azure DevOps reads work, publication fails', 'Inspect permissions and tracker-write capability separately. Keep blocked status if the required execution role, handoff or skill is unavailable; do not improvise a REST/PAT substitute.'],
  ['Some items were created before a failure', 'Keep the real IDs and execution ledger. Resolve the failed operation and resume the remaining work after any required re-approval. Do not erase or replay the whole batch.'],
  ['Artifact links break after restructuring', 'Use the reported relocation inventory and actual workstream names to find new paths. Do not assume a specific member name. docs/ and outputs/ stay at the repository root.'],
  ['The model produces a different result', 'Compare against business facts and acceptance criteria, not the facilitator’s exact wording. Challenge the content and preserve the decision.'],
  ['There is no first release in the backlog yet', 'Agree a small coherent set of prioritized items and dependencies before implementation. Do not select arbitrary items or silently treat the whole backlog as the first release. If time expires, preserve the unfinished release rather than claim completion.'],
  ['Time is running out', 'Capture evidence, blockers and the next action. Do not fabricate completion or rush broad deployment changes. The noon discussion boundary is fixed.'],
]
