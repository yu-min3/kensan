"""Base agent runner using Direct Tools with Anthropic API."""

import json
from dataclasses import dataclass, field
from typing import AsyncIterator, Any

import anthropic

from kensan_ai.config import get_settings
from kensan_ai.tools import get_tools_api_schema, execute_tool, format_tool_result
from kensan_ai.agents.message_history import MessageHistory


@dataclass
class ToolCall:
    """Record of a tool call made during agent execution."""

    id: str
    name: str
    input: dict[str, Any]
    output: Any


@dataclass
class AgentResult:
    """Result of an agent execution."""

    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    tokens_input: int = 0
    tokens_output: int = 0


class AgentRunner:
    """Base class for running agents with Direct Tools."""

    def __init__(
        self,
        system_prompt: str,
        allowed_tools: list[str] | None = None,
        max_turns: int = 10,
        temperature: float = 0.7,
        model: str | None = None,
    ):
        """Initialize the agent runner.

        Args:
            system_prompt: The system prompt for the agent
            allowed_tools: List of tool names to allow. If None, all tools are allowed.
            max_turns: Maximum number of agent turns (tool call cycles)
            temperature: Temperature for the model
            model: Model to use. If None, uses default from settings.
        """
        self.system_prompt = system_prompt
        self.allowed_tools = allowed_tools
        self.max_turns = max_turns
        self.temperature = temperature
        self.model = model or get_settings().anthropic_model

        # Initialize client
        settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    def _get_tools_schema(self) -> list[dict[str, Any]]:
        """Get the tools schema for the API call."""
        return get_tools_api_schema(self.allowed_tools)

    async def run(self, prompt: str, user_id: str | None = None) -> AgentResult:
        """Run the agent with the given prompt and return the response.

        Args:
            prompt: The user's input prompt
            user_id: Optional user ID to inject into tool calls

        Returns:
            AgentResult with text response, tool calls, and token usage
        """
        history = MessageHistory()
        history.add_user_message(prompt)
        tools = self._get_tools_schema()

        all_tool_calls: list[ToolCall] = []
        total_input_tokens = 0
        total_output_tokens = 0
        final_text_parts: list[str] = []

        for turn in range(self.max_turns):
            # Make API call
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=self.system_prompt,
                messages=history.get_messages(),
                tools=tools if tools else anthropic.NOT_GIVEN,
                temperature=self.temperature,
            )

            # Track token usage
            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            # Process response
            assistant_content: list[dict[str, Any]] = []
            tool_use_blocks: list[dict[str, Any]] = []

            for block in response.content:
                if block.type == "text":
                    final_text_parts.append(block.text)
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    tool_use_blocks.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })

            # Add assistant message
            history.add_assistant_message(assistant_content)

            # If no tool calls, we're done
            if not tool_use_blocks:
                break

            # Execute tool calls
            tool_results: list[dict[str, Any]] = []
            for tool_use in tool_use_blocks:
                tool_name = tool_use["name"]
                tool_input = dict(tool_use["input"])

                # Inject user_id if provided and tool accepts it
                if user_id and "user_id" not in tool_input:
                    tool_input["user_id"] = user_id

                try:
                    result = await execute_tool(tool_name, tool_input)
                    result_str = format_tool_result(result)

                    all_tool_calls.append(ToolCall(
                        id=tool_use["id"],
                        name=tool_name,
                        input=tool_input,
                        output=result,
                    ))

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use["id"],
                        "content": result_str,
                    })
                except Exception as e:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use["id"],
                        "content": json.dumps({"error": str(e)}, ensure_ascii=False),
                        "is_error": True,
                    })

            # Add tool results as user message
            history.add_tool_results(tool_results)

            # Check if we should stop (end_turn)
            if response.stop_reason == "end_turn":
                break

        return AgentResult(
            text="\n".join(final_text_parts),
            tool_calls=all_tool_calls,
            tokens_input=total_input_tokens,
            tokens_output=total_output_tokens,
        )

    async def stream(self, prompt: str, user_id: str | None = None) -> AsyncIterator[str]:
        """Run the agent with streaming response.

        This simplified streaming implementation yields text as it arrives,
        but still processes tool calls synchronously between streams.

        Args:
            prompt: The user's input prompt
            user_id: Optional user ID to inject into tool calls

        Yields:
            Text chunks as they arrive from the model
        """
        history = MessageHistory()
        history.add_user_message(prompt)
        tools = self._get_tools_schema()

        for turn in range(self.max_turns):
            # Collect response using streaming
            assistant_content: list[dict[str, Any]] = []
            tool_use_blocks: list[dict[str, Any]] = []
            current_tool_use: dict[str, Any] | None = None
            current_tool_input_json = ""

            async with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                system=self.system_prompt,
                messages=history.get_messages(),
                tools=tools if tools else anthropic.NOT_GIVEN,
                temperature=self.temperature,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        if event.content_block.type == "text":
                            pass  # Will handle in delta
                        elif event.content_block.type == "tool_use":
                            current_tool_use = {
                                "type": "tool_use",
                                "id": event.content_block.id,
                                "name": event.content_block.name,
                                "input": {},
                            }
                            current_tool_input_json = ""
                    elif event.type == "content_block_delta":
                        if event.delta.type == "text_delta":
                            yield event.delta.text
                            # Also track for message history
                            if assistant_content and assistant_content[-1].get("type") == "text":
                                assistant_content[-1]["text"] += event.delta.text
                            else:
                                assistant_content.append({"type": "text", "text": event.delta.text})
                        elif event.delta.type == "input_json_delta":
                            current_tool_input_json += event.delta.partial_json
                    elif event.type == "content_block_stop":
                        if current_tool_use:
                            # Parse accumulated JSON input
                            if current_tool_input_json:
                                try:
                                    current_tool_use["input"] = json.loads(current_tool_input_json)
                                except json.JSONDecodeError:
                                    current_tool_use["input"] = {}
                            tool_use_blocks.append(current_tool_use)
                            assistant_content.append(current_tool_use)
                            current_tool_use = None
                            current_tool_input_json = ""

                # Get final message for stop reason
                final_message = await stream.get_final_message()

            # Add assistant message to history
            history.add_assistant_message(assistant_content)

            # If no tool calls, we're done
            if not tool_use_blocks:
                break

            # Execute tool calls (not streamed)
            tool_results: list[dict[str, Any]] = []
            for tool_use in tool_use_blocks:
                tool_name = tool_use["name"]
                tool_input = dict(tool_use["input"])

                if user_id and "user_id" not in tool_input:
                    tool_input["user_id"] = user_id

                try:
                    result = await execute_tool(tool_name, tool_input)
                    result_str = format_tool_result(result)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use["id"],
                        "content": result_str,
                    })
                except Exception as e:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use["id"],
                        "content": json.dumps({"error": str(e)}, ensure_ascii=False),
                        "is_error": True,
                    })

            history.add_tool_results(tool_results)

            if final_message.stop_reason == "end_turn":
                break
