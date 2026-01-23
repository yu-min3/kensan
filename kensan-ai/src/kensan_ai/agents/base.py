"""Base agent runner using ClaudeSDKClient."""

from typing import AsyncIterator

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
)


class AgentRunner:
    """Base class for running agents with MCP tools."""

    def __init__(
        self,
        system_prompt: str,
        mcp_servers: dict,
        allowed_tools: list[str],
        max_turns: int = 5,
    ):
        self.system_prompt = system_prompt
        self.mcp_servers = mcp_servers
        self.allowed_tools = allowed_tools
        self.max_turns = max_turns

    async def run(self, prompt: str) -> str:
        """Run the agent with the given prompt and return the response."""
        options = ClaudeAgentOptions(
            system_prompt=self.system_prompt,
            mcp_servers=self.mcp_servers,
            allowed_tools=self.allowed_tools,
            max_turns=self.max_turns,
        )

        result_text = []

        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)
            async for message in client.receive_response():
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            result_text.append(block.text)

        return "\n".join(result_text)

    async def stream(self, prompt: str) -> AsyncIterator[str]:
        """Run the agent with streaming response."""
        options = ClaudeAgentOptions(
            system_prompt=self.system_prompt,
            mcp_servers=self.mcp_servers,
            allowed_tools=self.allowed_tools,
            max_turns=self.max_turns,
        )

        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)
            async for message in client.receive_response():
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            yield block.text
