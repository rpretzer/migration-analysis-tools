#!/usr/bin/env bash
# Migration Analysis System — Automated Setup (macOS)
# Run: curl -fsSL <repo-raw-url>/scripts/setup.sh | bash
#   or: bash scripts/setup.sh
#
# (c) RSP Management Solutions LLC
# See docs/ONBOARDING.md for the manual step-by-step guide.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!!]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

echo ""
echo "=== Migration Analysis System — Setup ==="
echo "(c) RSP Management Solutions LLC"
echo ""

# ── Check macOS ──
[[ "$(uname)" == "Darwin" ]] || fail "This script requires macOS."

# ── 1. Xcode CLI tools ──
if xcode-select -p &>/dev/null; then
    info "Xcode Command Line Tools already installed"
else
    echo "Installing Xcode Command Line Tools..."
    xcode-select --install 2>/dev/null || true
    echo "  → Accept the dialog and wait for it to finish, then re-run this script."
    exit 0
fi

# ── 2. Homebrew ──
if command -v brew &>/dev/null; then
    info "Homebrew already installed"
else
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add to PATH for Apple Silicon
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    fi
fi

# ── 3. Core packages ──
echo "Installing core packages via Homebrew..."
brew install git python@3.12 node openjdk@17 jadx 2>/dev/null || true

# Add Java to PATH if not already there
if ! java -version &>/dev/null; then
    echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
fi

info "git $(git --version 2>/dev/null | awk '{print $3}')"
info "python3 $(python3 --version 2>/dev/null | awk '{print $2}')"
info "node $(node --version 2>/dev/null)"
info "java $(java -version 2>&1 | head -1 | awk -F'"' '{print $2}')"
info "jadx $(jadx --version 2>/dev/null || echo 'installed')"

# ── 4. Python dependencies ──
echo "Installing Python dependencies..."
pip3 install --user jsonschema requests 2>/dev/null || pip3 install jsonschema requests 2>/dev/null || true
info "Python packages installed"

# ── 5. Claude Code ──
if command -v claude &>/dev/null; then
    info "Claude Code already installed ($(claude --version 2>/dev/null || echo 'installed'))"
else
    echo "Installing Claude Code..."
    npm install -g @anthropic-ai/claude-code
    info "Claude Code installed"
fi

# ── 6. Verify project scripts ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$PROJECT_DIR/scripts/validate_story.py" ]]; then
    echo "Verifying project scripts..."
    python3 -c "import py_compile; py_compile.compile('$PROJECT_DIR/scripts/validate_story.py', doraise=True)" && info "validate_story.py OK"
    python3 -c "import py_compile; py_compile.compile('$PROJECT_DIR/scripts/validate_figma_prompt.py', doraise=True)" && info "validate_figma_prompt.py OK"
    python3 -c "import py_compile; py_compile.compile('$PROJECT_DIR/scripts/md_to_jira_csv.py', doraise=True)" && info "md_to_jira_csv.py OK"
    python3 -c "import py_compile; py_compile.compile('$PROJECT_DIR/scripts/business_case_generator.py', doraise=True)" && info "business_case_generator.py OK"
    python3 -c "import py_compile; py_compile.compile('$PROJECT_DIR/scripts/post_launch_evaluation.py', doraise=True)" && info "post_launch_evaluation.py OK"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Manual steps remaining:"
echo "  1. Install Xcode from the App Store (required for iOS analysis)"
echo "  2. Install Android Studio from https://developer.android.com/studio"
echo "  3. Run 'claude' to authenticate with your Anthropic account"
echo "  4. Configure git: git config --global user.name 'Your Name'"
echo "  5. See docs/ONBOARDING.md for the full guide"
echo ""
