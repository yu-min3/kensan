# Kensan AI

AI agents for Kensan learning management app using Claude Agent SDK.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Usage

### Run Weekly Review Agent

```python
import anyio
from kensan_ai import run_weekly_review

async def main():
    result = await run_weekly_review()
    print(result)

anyio.run(main)
```

### Create Custom Agent

```python
from kensan_ai.agents import AgentRunner
from kensan_ai.mcp_server import kensan_server

agent = AgentRunner(
    system_prompt="Your custom system prompt",
    mcp_servers={"kensan": kensan_server},
    allowed_tools=["mcp__kensan__get_goals_and_milestones"],
)
result = await agent.run("Your prompt")
```

## Project Structure

```
src/kensan_ai/
├── __init__.py         # Package exports
├── main.py             # Entry point and agent factory
├── mcp_server.py       # MCP server configuration
├── agents/
│   ├── __init__.py     # Agent exports
│   ├── base.py         # AgentRunner base class
│   └── weekly_review.py # Weekly review agent config
└── tools/
    ├── __init__.py     # Tool exports
    ├── data.py         # Mock data (TODO: replace with DB)
    └── goals.py        # Goal-related tools
```

## Adding New Tools

1. Create a new file in `tools/` (e.g., `time_entries.py`)
2. Define your tool using `@tool` decorator:

```python
from claude_agent_sdk import tool

@tool(
    name="get_time_entries",
    description="時間エントリーを取得します",
    input_schema={"type": "object", "properties": {...}},
)
async def get_time_entries(args: dict) -> dict:
    # Implementation
    return {"content": [{"type": "text", "text": "..."}]}
```

3. Add to `ALL_TOOLS` in `tools/__init__.py`

## Adding New Agents

1. Create a new file in `agents/` (e.g., `morning_planner.py`)
2. Define `SYSTEM_PROMPT` and `ALLOWED_TOOLS`
3. Export from `agents/__init__.py`
4. Add factory function in `main.py`

## Available Tools

- `get_goals_and_milestones`: 目標とマイルストーンの一覧を取得

## Available Agents

- **Weekly Review**: 週次の学習振り返りレポートを生成
