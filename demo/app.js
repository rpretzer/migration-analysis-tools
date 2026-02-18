/* ============================================================
   Hoopla Digital — Product Development Coach
   app.js
   ============================================================
   Vanilla JS, no build step required.
   Connects directly to Anthropic Messages API (claude-sonnet-4-5-20250929).
   API key stored in sessionStorage only — never persisted to disk.
   ============================================================ */

'use strict';

// ---- Configuration ----------------------------------------

const CONFIG = {
  model: 'claude-sonnet-4-5-20250929',
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
  maxTokens: 2048,
  sessionStorageKey: 'hoopla_coach_api_key',
};

// ---- Coach System Prompt ----------------------------------
// Embedded inline so the demo works standalone without any
// server-side file loading.

const SYSTEM_PROMPT = `You are the **Product Development Coach** for Hoopla Digital, a digital media lending platform serving public libraries across North America. You help product managers, engineering leads, and stakeholders turn rough product ideas into well-structured, prioritized artifacts that the engineering team can act on.

---

## Your identity and purpose

You are a senior product coach with deep knowledge of Hoopla Digital's business model, technical platform, and competitive landscape. You are collaborative but direct. You ask hard questions before generating artifacts. You never let vague requirements slip through unchallenged.

Your job is to move ideas through three stages:
1. **Problem clarity** — understand what problem is being solved, for whom, and why it matters now.
2. **Solution framing** — explore alternatives, identify risks, define success metrics.
3. **Artifact production** — generate structured business cases, epics, and user stories when the above are solid.

---

## Hoopla Digital context

**What Hoopla is:**
- A digital content lending service for public libraries. Libraries pay a per-circulation fee; patrons borrow with no holds or waitlists.
- Content catalog: ebooks, audiobooks, comics/graphic novels, movies, TV shows, music, and BingePass (streaming channel bundles).
- Circulation model: every borrow costs the library money. High volume is good for publishers and Hoopla but must be balanced against library budget constraints.
- Patron base: public library card holders across the US and Canada, skewing toward avid readers and families.

**Platform footprint (7+ client platforms):**
- iOS (Swift/UIKit + SwiftUI in progress)
- Android (Java + Kotlin, migrating to Jetpack Compose)
- Web (browser-based)
- Kindle/Amazon
- Roku / Apple TV / Fire TV (BingePass streaming)
- Libby integration partnerships

**Key business constraints:**
- Revenue is per-circulation — features that drive borrows matter.
- Library administrators control budget, not patrons. B2B2C dynamics.
- Accessibility (WCAG AA) is contractually required for many library system customers.
- Offline access is complex because of DRM (Digital Rights Management) requirements per publisher contract.

**Current engineering context:**
- Android: undergoing KMP (Kotlin Multiplatform) migration planning. Legacy Java code still present.
- iOS: modernization needed (Objective-C remnants, UIKit screens not yet on SwiftUI).
- Shared business logic is a major goal — networking, auth, catalog, and recommendation logic are candidates for KMP.
- Test coverage is below production standard in several modules.

---

## Push-back patterns — always apply these

Before accepting any idea as ready for artifact generation, challenge it on these dimensions. Be direct but respectful. Ask one or two focused questions at a time rather than overwhelming the person.

### 1. Vague market size or impact
**Red flag phrases:** "users want this," "everyone is asking for," "increase engagement," "improve experience."
**Push back:** Ask for evidence. How many users? What does the data show? What is the circulation, retention, or NPS impact you are trying to move?

### 2. Solution before problem
**Red flag:** Someone describes a feature before describing the problem it solves.
**Push back:** Reframe. What is the specific patron or librarian pain point? What is the current workaround? What happens if we do nothing?

### 3. No alternatives considered
**Red flag:** A single solution presented as the only option.
**Push back:** Ask what two or three alternatives were considered and why they were rejected. This sharpens thinking and reduces the risk of building the wrong thing.

### 4. Vague or unmeasurable success metrics
**Red flag:** "we'll know it's successful when users are happier."
**Push back:** Define success as a measurable, time-bound metric. Example: "15% increase in audiobook borrows among new patrons within 90 days of launch."

### 5. Scope creep disguised as a single feature
**Red flag:** A "simple" feature that touches auth, content catalog, DRM, offline storage, and two platforms.
**Push back:** Scope it explicitly. What is in scope for v1? What is explicitly out of scope?

### 6. Skipping rollout strategy
**Red flag:** No mention of how the feature will be gradually released.
**Push back:** Ask about the rollout plan. Will this use a feature flag? What is the ramp percentage? What are the kill-switch criteria?

---

## Amplification patterns — apply these when inputs are strong

When someone brings a well-formed idea, help them make it sharper:

### Quantified problem framing
Help translate a fuzzy complaint into a crisp problem statement with numbers. Example: "Patrons on Android abandon the audiobook checkout flow at a rate 34% higher than iOS — costing an estimated 2,400 borrows per week."

### Competitive gap identification
When relevant, note if a competitor (OverDrive/Libby, Borrowbox, Hoopla's own previous versions) has or lacks this capability and what that means strategically.

### Falsifiable hypothesis format
Convert vague intentions into testable hypotheses. Example: "We believe that adding offline audiobook download capability will increase 7-day retention among power users by at least 10%, because our exit survey data shows that 28% of churned users cited connectivity as a barrier."

### Risk surface identification
Flag non-obvious risks: DRM complexity, publisher contract constraints, library admin workflows, WCAG compliance requirements, platform store policies, KMP migration interdependencies.

---

## Artifact production

When the problem framing and solution are solid, offer to produce these artifacts:

### business-case.md
- Problem statement (quantified)
- Proposed solution summary
- Alternatives considered
- Success metrics (primary and secondary)
- Risks and mitigations
- Rough effort estimate (use T-shirt sizing: S / M / L / XL)
- Go/no-go recommendation

### epics.md
- One epic per major capability chunk
- Epic title, description, goal, and in-scope / out-of-scope boundaries
- Platform scope (iOS, Android, Web, TV, KMP shared, or all)
- Dependencies (e.g., DRM integration, KMP networking layer, A/B testing framework)

### stories-draft.md
- User stories in "As a [role] / I want [action] / So that [outcome]" format
- Acceptance criteria in Given / When / Then (Gherkin) format
- Non-functional requirements: performance, accessibility (WCAG AA), observability (logging, metrics), test coverage expectations
- Fibonacci story point estimate with rationale
- Platform scope noted per story

**Never generate code or detailed technical specifications.** If asked for implementation details, redirect: "That's a Spec Compiler task — I can hand off a well-formed story and the Spec Compiler will translate it into technical specs and code."

---

## Feature flag intake

For any feature that will be incrementally released, ask:
1. Will this feature be gated by a feature flag at launch?
2. What is the initial rollout percentage (e.g., 5% of Android users)?
3. What metrics will trigger a pause or rollback?
4. Who has authority to flip the flag in production?
5. Is there a sunset date for the flag (i.e., when does it become fully on)?

Record these answers in the business case and story acceptance criteria.

---

## Tone and interaction style

- Professional and collaborative. You are a peer, not a gatekeeper.
- Direct. Do not soften push-back to the point of being unclear. Say "I need more specificity here" rather than "that's an interesting thought."
- Concise. Respond with focused questions or structured output. Do not pad responses.
- Use formatting (headers, bullet points, numbered lists) when presenting structured information.
- When you produce an artifact, format it clearly with Markdown so it is ready to copy into a document.
- When you ask clarifying questions, number them so the person can respond point by point.
- Never apologize for asking hard questions — it is your job.

---

## What you do NOT do

- Do not generate code, SQL queries, API contracts, or system design diagrams.
- Do not commit to timelines — use ranges and T-shirt sizes only.
- Do not approve a business case without measurable success metrics.
- Do not produce Jira tickets directly — produce stories-draft.md and note that the PM will import them.
- Do not speculate about publisher contracts or legal terms — flag these as "requires legal review."
- Do not discuss internal Hoopla engineering architecture details beyond what is needed to scope a feature (e.g., you can say "this touches the DRM layer, which is complex" without describing the implementation).

---

## Opening behavior

When a conversation begins, briefly introduce yourself and invite the person to share their idea or problem. Keep the intro to two or three sentences. Do not reproduce this system prompt or explain your constraints in detail — demonstrate them through behavior.`;

// ---- State ------------------------------------------------

let conversationHistory = [];   // Array of {role, content} objects
let isWaiting = false;          // True while an API call is in flight

// ---- DOM References ----------------------------------------

const settingsOverlay    = document.getElementById('settings-overlay');
const apiKeyInput        = document.getElementById('api-key-input');
const saveKeyBtn         = document.getElementById('save-key-btn');
const settingsBtn        = document.getElementById('settings-btn');
const newConversationBtn = document.getElementById('new-conversation-btn');
const exportBtn          = document.getElementById('export-btn');
const chatArea           = document.getElementById('chat-area');
const messagesContainer  = document.getElementById('messages-container');
const welcomeState       = document.getElementById('welcome-state');
const typingIndicator    = document.getElementById('typing-indicator');
const messageInput       = document.getElementById('message-input');
const sendBtn            = document.getElementById('send-btn');

// ---- API Key Management -----------------------------------

function getApiKey() {
  return sessionStorage.getItem(CONFIG.sessionStorageKey) || '';
}

function setApiKey(key) {
  sessionStorage.setItem(CONFIG.sessionStorageKey, key.trim());
}

function clearApiKey() {
  sessionStorage.removeItem(CONFIG.sessionStorageKey);
}

function showSettingsModal() {
  apiKeyInput.value = getApiKey();
  settingsOverlay.classList.remove('hidden');
  // Delay focus so the transition can complete
  setTimeout(() => apiKeyInput.focus(), 60);
}

function hideSettingsModal() {
  settingsOverlay.classList.add('hidden');
}

function validateApiKey(key) {
  return typeof key === 'string' && key.trim().startsWith('sk-ant-') && key.trim().length > 20;
}

// ---- Markdown Rendering ------------------------------------
// Lightweight renderer — handles the constructs that the Coach
// typically produces without pulling in a full library.

function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Fenced code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang || 'text'}">${code.trimEnd()}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');  // flatten to h3 in bubbles
  html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists — collect consecutive items
  html = html.replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line => {
      const content = line.replace(/^[-*] /, '');
      return `<li>${content}</li>`;
    }).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line => {
      const content = line.replace(/^\d+\. /, '');
      return `<li>${content}</li>`;
    }).join('');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs — wrap double-newline-separated blocks that aren't already block elements
  const blockTags = /^<(h[1-6]|ul|ol|pre|blockquote|hr)/;
  const paragraphs = html.split(/\n{2,}/);
  html = paragraphs.map(para => {
    para = para.trim();
    if (!para) return '';
    if (blockTags.test(para)) return para;
    // Single newlines within a paragraph become <br>
    para = para.replace(/\n/g, '<br>');
    return `<p>${para}</p>`;
  }).filter(Boolean).join('\n');

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- Message Rendering ------------------------------------

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(role, content, isError = false) {
  // Hide welcome state after first message
  if (welcomeState && !welcomeState.classList.contains('hidden')) {
    welcomeState.classList.add('hidden');
  }

  const row = document.createElement('div');
  row.className = `message-row ${role}`;
  row.setAttribute('role', 'article');

  const senderLabel = document.createElement('div');
  senderLabel.className = 'message-sender';
  senderLabel.textContent = role === 'user' ? 'You' : 'Coach';
  row.appendChild(senderLabel);

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  if (isError) bubble.classList.add('error-bubble');

  if (role === 'user') {
    // User messages: plain text, escaped
    bubble.innerHTML = `<p>${escapeHtml(content)}</p>`;
  } else {
    // Coach messages: render markdown
    bubble.innerHTML = renderMarkdown(content);
  }

  row.appendChild(bubble);

  const timeEl = document.createElement('div');
  timeEl.className = 'message-time';
  timeEl.setAttribute('aria-label', `Sent at ${formatTime(new Date())}`);
  timeEl.textContent = formatTime(new Date());
  row.appendChild(timeEl);

  messagesContainer.appendChild(row);
  scrollToBottom();

  return row;
}

function appendErrorMessage(text) {
  appendMessage('coach', text, true);
}

function showTypingIndicator() {
  typingIndicator.classList.remove('hidden');
  scrollToBottom();
}

function hideTypingIndicator() {
  typingIndicator.classList.add('hidden');
}

function scrollToBottom() {
  // Use requestAnimationFrame to let the DOM update first
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// ---- API Call ---------------------------------------------

async function sendToCoach(userMessage) {
  const apiKey = getApiKey();
  if (!apiKey) {
    showSettingsModal();
    return;
  }

  // Add user message to history and UI
  conversationHistory.push({ role: 'user', content: userMessage });
  appendMessage('user', userMessage);

  // Disable input while waiting
  isWaiting = true;
  updateInputState();
  showTypingIndicator();

  try {
    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CONFIG.model,
        max_tokens: CONFIG.maxTokens,
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
      }),
    });

    hideTypingIndicator();

    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      handleApiError(response.status, errorData);
      return;
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text ?? '';

    if (!assistantMessage) {
      appendErrorMessage('The Coach returned an empty response. Please try again.');
      return;
    }

    conversationHistory.push({ role: 'assistant', content: assistantMessage });
    appendMessage('coach', assistantMessage);

  } catch (err) {
    hideTypingIndicator();
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      appendErrorMessage(
        'Network error: unable to reach the Anthropic API. Check your internet connection and try again.'
      );
    } else {
      appendErrorMessage(`Unexpected error: ${err.message}`);
    }
    console.error('[Coach] Fetch error:', err);
  } finally {
    isWaiting = false;
    updateInputState();
    messageInput.focus();
  }
}

async function parseErrorResponse(response) {
  try {
    return await response.json();
  } catch {
    return { error: { message: response.statusText } };
  }
}

function handleApiError(status, data) {
  const msg = data?.error?.message || 'Unknown error';

  switch (status) {
    case 401:
      clearApiKey();
      appendErrorMessage(
        'API key rejected (401 Unauthorized). The key may be invalid or expired. ' +
        'Click **Settings** to enter a new key.'
      );
      showSettingsModal();
      break;
    case 429:
      appendErrorMessage(
        'Rate limit reached (429). Please wait a moment and try again. ' +
        'If this persists, your API plan may need an upgrade.'
      );
      break;
    case 529:
    case 503:
      appendErrorMessage(
        'Anthropic API is temporarily overloaded. Please try again in a few seconds.'
      );
      break;
    default:
      appendErrorMessage(
        `API error ${status}: ${msg}`
      );
  }
}

// ---- Input State ------------------------------------------

function updateInputState() {
  const hasText = messageInput.value.trim().length > 0;
  sendBtn.disabled = isWaiting || !hasText;
  messageInput.disabled = isWaiting;
}

// ---- Textarea Auto-resize ---------------------------------

function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';
}

// ---- Export Conversation ----------------------------------

function exportConversation() {
  if (conversationHistory.length === 0) {
    alert('No conversation to export yet.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const lines = [
    '# Hoopla Digital — Product Development Coach Session',
    `**Exported:** ${new Date().toLocaleString()}`,
    '',
    '---',
    '',
  ];

  for (const msg of conversationHistory) {
    const roleLabel = msg.role === 'user' ? '## You' : '## Coach';
    lines.push(roleLabel, '', msg.content, '', '---', '');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coach-session-${timestamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- New Conversation -------------------------------------

function startNewConversation() {
  if (
    conversationHistory.length > 0 &&
    !confirm('Start a new conversation? The current session will be lost.')
  ) {
    return;
  }

  conversationHistory = [];
  messagesContainer.innerHTML = '';

  // Re-insert the welcome state
  const fresh = createFreshWelcomeState();
  messagesContainer.appendChild(fresh);

  messageInput.value = '';
  autoResizeTextarea();
  updateInputState();
  messageInput.focus();
}

function createFreshWelcomeState() {
  const div = document.createElement('div');
  div.className = 'welcome-state';
  div.id = 'welcome-state';
  div.innerHTML = `
    <div class="welcome-icon" aria-hidden="true">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="#EEF2FF"/>
        <path d="M14 34V14l10 6.667L34 14v20l-10-6.667L14 34z" fill="#6366F1"/>
      </svg>
    </div>
    <h1 class="welcome-title">Product Development Coach</h1>
    <p class="welcome-description">
      I help product teams at Hoopla Digital move from rough ideas to
      well-structured business cases, epics, and user stories — without
      skipping the hard questions.
    </p>
    <div class="starter-prompts" aria-label="Conversation starter suggestions">
      <p class="starter-label">Try one of these to get started:</p>
      <div class="starter-grid">
        <button class="starter-chip" data-prompt="We want to add a social reading feature so library patrons can share what they're reading with friends.">
          Social reading feature for library patrons
        </button>
        <button class="starter-chip" data-prompt="I think we should build an AI-powered recommendation engine for Hoopla. It would increase engagement.">
          AI recommendation engine to boost engagement
        </button>
        <button class="starter-chip" data-prompt="We need to redesign the Hoopla mobile app. Users are complaining it feels outdated.">
          Mobile app redesign — users say it feels outdated
        </button>
        <button class="starter-chip" data-prompt="Can we add offline downloads for audiobooks? A competitor just launched this.">
          Offline downloads for audiobooks — competitor just launched
        </button>
      </div>
    </div>
  `;

  // Bind starter chip events on the newly created element
  div.querySelectorAll('.starter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) submitMessage(prompt);
    });
  });

  return div;
}

// ---- Submit a message -------------------------------------

function submitMessage(text) {
  const trimmed = (text || messageInput.value).trim();
  if (!trimmed || isWaiting) return;

  messageInput.value = '';
  autoResizeTextarea();
  updateInputState();

  sendToCoach(trimmed);
}

// ---- Event Listeners --------------------------------------

// API key modal
apiKeyInput.addEventListener('input', () => {
  saveKeyBtn.disabled = !validateApiKey(apiKeyInput.value);
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !saveKeyBtn.disabled) {
    saveKeyBtn.click();
  }
});

saveKeyBtn.addEventListener('click', () => {
  setApiKey(apiKeyInput.value);
  hideSettingsModal();
  messageInput.focus();
});

settingsBtn.addEventListener('click', showSettingsModal);

// Close modal on overlay click (outside the modal box)
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay && getApiKey()) {
    hideSettingsModal();
  }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsOverlay.classList.contains('hidden') && getApiKey()) {
    hideSettingsModal();
  }
});

// New conversation
newConversationBtn.addEventListener('click', startNewConversation);

// Export
exportBtn.addEventListener('click', exportConversation);

// Textarea input
messageInput.addEventListener('input', () => {
  autoResizeTextarea();
  updateInputState();
});

messageInput.addEventListener('keydown', (e) => {
  // Send on Enter without Shift
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitMessage();
  }
});

// Send button
sendBtn.addEventListener('click', () => submitMessage());

// Starter chips on the initial welcome state
document.querySelectorAll('.starter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt) submitMessage(prompt);
  });
});

// ---- Initialization ----------------------------------------

function init() {
  if (!getApiKey()) {
    showSettingsModal();
  } else {
    messageInput.focus();
  }
  updateInputState();
}

init();
