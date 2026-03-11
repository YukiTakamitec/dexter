#!/bin/bash
# Dexter起動スクリプト — 利用可能なLLMプロバイダーを自動検出して起動
set -e

cd "$(dirname "$0")"

# .env読み込み
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep '=' | xargs)
fi

# プロバイダー自動検出
detect_provider() {
  if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "anthropic"
  elif [ -n "$GOOGLE_API_KEY" ]; then
    echo "google"
  elif [ -n "$DEEPSEEK_API_KEY" ]; then
    echo "deepseek"
  elif [ -n "$OPENAI_API_KEY" ]; then
    echo "openai"
  elif [ -n "$XAI_API_KEY" ]; then
    echo "xai"
  elif curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "ollama"
  else
    echo "none"
  fi
}

PROVIDER=$(detect_provider)

if [ "$PROVIDER" = "none" ]; then
  echo "=================================="
  echo "  Dexter — LLMプロバイダー未検出"
  echo "=================================="
  echo ""
  echo "以下のいずれかを .env に設定してください:"
  echo ""
  echo "  1. Google Gemini (無料):"
  echo "     GOOGLE_API_KEY=your-key"
  echo "     → https://aistudio.google.com/apikey"
  echo ""
  echo "  2. DeepSeek (超安価, 登録時無料クレジット):"
  echo "     DEEPSEEK_API_KEY=your-key"
  echo "     → https://platform.deepseek.com/"
  echo ""
  echo "  3. Ollama (完全ローカル, 無料):"
  echo "     curl -fsSL https://ollama.ai/install.sh | sh"
  echo "     ollama pull qwen2.5:7b"
  echo ""
  echo "  4. Anthropic / OpenAI / xAI:"
  echo "     ANTHROPIC_API_KEY / OPENAI_API_KEY / XAI_API_KEY"
  echo ""
  exit 1
fi

echo "Dexter starting with provider: $PROVIDER"

# bun PATH解決
BUN="${HOME}/.bun/bin/bun"
if [ ! -x "$BUN" ]; then
  BUN="$(which bun 2>/dev/null || true)"
fi
if [ -z "$BUN" ] || [ ! -x "$BUN" ]; then
  echo "ERROR: bun not found. Install: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

"$BUN" run src/index.tsx "$@"
