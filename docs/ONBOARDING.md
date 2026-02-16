# Onboarding Guide — Migration Analysis System

Welcome. This document gets you from a fresh Mac to running your first analysis. Follow every step in order. If something fails, stop and ask — do not skip ahead.

---

## 1. What you are doing here

You are joining a team that analyzes legacy mobile apps and produces migration plans. The output is a set of structured documents (architecture audits, user stories, roadmaps, Jira backlogs, Figma prototypes) that engineering teams use to modernize the app.

The system is powered by Claude Code (Anthropic's CLI tool for Claude). You will use it to read codebases, reason about architecture, and generate deliverables. You do not need to be an AI expert — you need to be able to read mobile code and follow a structured process.

**Your first client is Midwest Tape** (Holland, Ohio). Their product is **Hoopla Digital**, a digital media lending platform for public libraries. See `docs/operations/CLIENT_CONTEXT.md` for details.

---

## Quick Start (automated setup)

If you want to skip the manual steps in sections 3–4, run the automated setup script after cloning the repo:

```bash
bash scripts/setup.sh
```

This installs Homebrew, Python, Node, Java, JADX, Claude Code, and Python dependencies in one pass. It will tell you which manual steps remain (Xcode, Android Studio, git config, Claude auth). See below for the full manual instructions.

---

## 2. Hardware and accounts you need

Before you start installing anything, confirm you have:

- [ ] A Mac (Apple Silicon or Intel, macOS 14 Sonoma or later). Required for Xcode.
- [ ] At least 50 GB free disk space (Xcode alone is ~12 GB; Android Studio is ~8 GB; project files vary).
- [ ] An Anthropic account with Claude Code Pro access ($100/month seat). Your manager should have provisioned this — if not, ask before proceeding.
- [ ] GitHub access to the analysis repository (ask your manager for the repo URL and an invite).
- [ ] Jira access to the client's project (ask your manager — you may not need this on day 1).
- [ ] Optional: Figma account if you will be running Figma Make prompts.

---

## 3. Install system dependencies

Open Terminal (Cmd+Space, type "Terminal", Enter). Run each block in order.

### 3.1 Xcode Command Line Tools

```bash
xcode-select --install
```

A dialog will appear. Click "Install." Wait for it to finish (~5 minutes on fast internet).

### 3.2 Homebrew (package manager)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the prompts. When it finishes, it will tell you to run two commands to add Homebrew to your PATH. Run those commands.

Verify it works:
```bash
brew --version
```

### 3.3 Core tools via Homebrew

```bash
brew install git python@3.12 node openjdk@17 jadx
```

What these are:
- **git**: Version control. You already know this.
- **python@3.12**: Runs the validation and automation scripts in `scripts/`.
- **node**: Required by Claude Code and MCP servers.
- **openjdk@17**: Required by Android Studio and JADX.
- **jadx**: Decompiles Android APKs when source code is not available.

After install, add Java to your PATH:
```bash
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:
```bash
java -version    # Should show openjdk 17.x
python3 --version  # Should show 3.12.x
node --version     # Should show 20.x or later
jadx --version     # Should show 1.x
```

### 3.4 Python dependencies for project scripts

```bash
pip3 install --user jsonschema requests
```

These are used by the validation and Jira sync scripts in `scripts/`.

---

## 4. Install development tools

### 4.1 Xcode (for iOS analysis)

Open the App Store. Search "Xcode." Install it. This takes 20–40 minutes.

After install, open Xcode once and accept the license agreement:
```bash
sudo xcodebuild -license accept
```

You need Xcode to:
- Open `.xcodeproj` / `.xcworkspace` files for iOS app analysis.
- Read Swift/Objective-C source and project structure.
- Run iOS simulators if you need to verify accessibility.

### 4.2 Android Studio (for Android analysis)

Download from https://developer.android.com/studio. Open the `.dmg`, drag to Applications.

Launch Android Studio. It will prompt you to install SDK components. Accept the defaults (this installs SDK 34 and build tools).

You need Android Studio to:
- Open Gradle projects for Android app analysis.
- Read Kotlin/Java source and resource files.
- Run Android emulators for accessibility and UI verification.

### 4.3 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:
```bash
claude --version
```

First run — authenticate:
```bash
claude
```

It will open a browser window to sign in with your Anthropic account. Complete the sign-in. Once authenticated, you are in the Claude Code REPL. Type `/exit` to leave for now.

### 4.4 Git configuration

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"
```

---

## 5. Clone the project and verify setup

```bash
cd ~/Projects  # or wherever you keep repos
git clone <REPO_URL> codebase-migration-analysis
cd codebase-migration-analysis
```

Verify the project structure:
```bash
ls -la
# You should see: CLAUDE.md, analysis/, docs/, stories/, figma_prompts/, scripts/
```

Run the validation scripts to confirm Python is set up:
```bash
python3 scripts/validate_story.py stories/A-1_KMP_Extract_Bean_Models.md
# Should print "PASS" or list specific issues

python3 scripts/validate_figma_prompt.py --check-schema
# Should print schema validation OK
```

### 5.5 Client review bundle (for sharing)

To share the analysis with client collaborators for async review:

```bash
node scripts/build-bundle.js
```

This creates a `bundle/` folder. Zip it or upload to cloud storage. Clients open `index.html` in a browser — no server or install required. See `docs/BUNDLE_FOR_CLIENT.md` for details.

### 5.6 Analyst Dashboard (optional)

The dashboard lets you review progress, track objectives, and read generated documents in the browser. Use it alongside Claude Code during analysis. For client sharing, use the static bundle (5.5) instead.

```bash
bash scripts/start-dashboard.sh
# Or: cd dashboard && npm install && npm start
```

Open http://localhost:3456 in your browser. To use a different port:

```bash
DASHBOARD_PORT=4000 npm start
```

See `dashboard/README.md` for details.

---

## 6. Configure Claude Code for this project

Start Claude Code in the project directory:
```bash
cd ~/Projects/codebase-migration-analysis
claude
```

Claude Code will automatically read the `CLAUDE.md` file in this directory. This file contains all the instructions for the analysis system — model selection rules, artifact formats, quality gates, and more.

### 6.1 Recommended settings

Create or edit `.claude/settings.json` in the project root:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Write(analysis/*)",
      "Write(docs/*)",
      "Write(stories/*)",
      "Write(figma_prompts/*)",
      "Write(scripts/*)",
      "Bash(python3 scripts/*)",
      "Bash(git *)",
      "Bash(jadx *)"
    ]
  }
}
```

This allows Claude Code to read/write analysis files and run scripts without prompting you for every action.

### 6.2 Optional: MCP servers

If you have Jira API access, configure the Jira MCP server. See `docs/operations/TOOLING_AND_AUTOMATION.md §1.1` for the full config.

If the client's source code is on GitHub, configure the GitHub MCP server. See `docs/operations/TOOLING_AND_AUTOMATION.md §1.2`.

These are optional on day 1. You can add them later.

---

## 7. Your first analysis — what to do

Read these documents in this order:

1. **`CLAUDE.md`** — The operating manual. Read §0–§4 carefully. Skim the rest for now; you'll reference specific sections as you work.
2. **`docs/operations/SYSTEM_ARCHITECTURE.md`** — The artifact registry and execution flow. This is your checklist.
3. **`docs/operations/COST_AND_MODEL_STRATEGY.md`** — When to use Opus vs Sonnet vs Haiku. Follow this to avoid burning budget.
4. **`docs/TRAINING_PROCESS.md`** — The step-by-step analysis workflow. This is your day-by-day guide.

Then follow the 5-day process in `docs/TRAINING_PROCESS.md`:

| Day | What you do | What you produce |
|-----|------------|-----------------|
| 1 | Read the codebase. Map structure. Flag security issues. | `analysis/PROJECT_STRUCTURE.md`, first `ANALYSIS_LOG.md` entry |
| 2 | Classify every module. Read architecture patterns. | `analysis/MODULE_CLASSIFICATIONS.md`, start `ARCHITECTURE_AUDIT.md` |
| 3 | WCAG audit of all screens. | `analysis/WCAG_AUDIT.md` |
| 4 | Write roadmap and critical path analysis. | `docs/ROADMAP.md`, `docs/CRITICAL_PATH_ANALYSIS.md` |
| 5 | Write stories, estimates, Jira import. | `stories/*.md`, `docs/JIRA_IMPORT.md`, `docs/JIRA_IMPORT.csv` |

### Using Claude Code during analysis

Start Claude Code in the project directory:
```bash
claude
```

For structure mapping (day 1), tell it:
> "Map the project structure of the Android app in decompiled/jadx/ per CLAUDE.md §4. Write the output to analysis/PROJECT_STRUCTURE.md."

For module classification (day 2):
> "Classify all modules in analysis/PROJECT_STRUCTURE.md per CLAUDE.md §5. Write to analysis/MODULE_CLASSIFICATIONS.md."

For parallel work (if using Teams):
> "Create a team for this analysis and spawn agents for module classification, architecture audit, and WCAG audit to run in parallel."

Claude Code reads the CLAUDE.md automatically and knows the templates, formats, and quality standards.

---

## 8. Running the validation scripts

After producing artifacts, validate them:

```bash
# Validate a single story
python3 scripts/validate_story.py stories/A-1_KMP_Extract_Bean_Models.md

# Validate all stories at once
python3 scripts/validate_story.py stories/

# Validate a Figma prompt JSON
python3 scripts/validate_figma_prompt.py figma_prompts/home.json

# Validate all Figma prompts
python3 scripts/validate_figma_prompt.py figma_prompts/

# Generate Jira CSV from the markdown import doc
python3 scripts/md_to_jira_csv.py docs/JIRA_IMPORT.md --output docs/JIRA_IMPORT.csv

# Batch-generate Figma prompts from stories
python3 scripts/generate_figma_prompts.py stories/ figma_prompts/

# Compare two versions of PROJECT_STRUCTURE.md
python3 scripts/diff_structure.py analysis/PROJECT_STRUCTURE.md analysis/PROJECT_STRUCTURE.v2.md

# Log costs after a session
python3 scripts/cost_tracker.py --phase "Phase 2" --model opus --tokens 50000 --duration 45
```

---

## 9. Decompiling an APK (when source code is not available)

```bash
# Verify the file is actually an APK
file path/to/app.apk
# Should say "Java archive data (JAR)" or "Zip archive data"

# Decompile with JADX
jadx --output-dir decompiled/jadx path/to/app.apk

# The decompiled source is now in decompiled/jadx/sources/
# Resources (layouts, manifest) are in decompiled/jadx/resources/
```

**Important**: Decompiled code has limitations. You cannot see tests, build configuration, CI setup, or git history. Flag this in your ANALYSIS_LOG. See `docs/operations/BEST_PRACTICES.md §1`.

---

## 10. Key files reference

| File | What it is | When you read it |
|------|-----------|-----------------|
| `CLAUDE.md` | Operating manual — all instructions | Before starting any work |
| `docs/operations/SYSTEM_ARCHITECTURE.md` | Artifact checklist and quality gates | When checking completeness |
| `docs/operations/COST_AND_MODEL_STRATEGY.md` | Model selection rules | Before every Claude Code session |
| `docs/operations/TOOLING_AND_AUTOMATION.md` | MCP servers, hooks, scripts | When setting up integrations |
| `docs/operations/CLAUDE_TEAMS_STRATEGY.md` | Multi-agent orchestration | When running parallel analysis |
| `docs/operations/BEST_PRACTICES.md` | Common mistakes to avoid | After day 1 |
| `docs/operations/CLIENT_CONTEXT.md` | Midwest Tape / Hoopla specifics | Before starting Hoopla analysis |
| `docs/USER_STORY_TEMPLATE.md` | Story format template | When writing stories (day 5) |
| `docs/TRAINING_PROCESS.md` | Day-by-day analysis process | Every day |

---

## 11. Getting help

- **Claude Code help**: Type `/help` inside a Claude Code session.
- **This system's process**: Read `docs/TRAINING_PROCESS.md`.
- **Tool issues**: See `docs/operations/TOOLING_AND_AUTOMATION.md`.
- **Claude Code bugs**: Report at https://github.com/anthropics/claude-code/issues.
- **Analysis questions**: Ask your team lead. If the question is about a classification decision or architectural judgment, document the question and answer in `analysis/ANALYSIS_LOG.md`.

---

## 12. Checklist — confirm you are ready

Before starting your first analysis, confirm all of these:

- [ ] Xcode installed and license accepted
- [ ] Android Studio installed with SDK
- [ ] Claude Code installed and authenticated
- [ ] Python 3.12 installed with jsonschema and requests
- [ ] JADX installed
- [ ] Git configured with your name and email
- [ ] Project repo cloned
- [ ] Validation scripts run successfully
- [ ] You have read CLAUDE.md §0–§4
- [ ] You have read docs/TRAINING_PROCESS.md
- [ ] You have read docs/operations/COST_AND_MODEL_STRATEGY.md
- [ ] Optional: Dashboard running (`cd dashboard && npm install && npm start`) for progress review
