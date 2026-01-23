"""Context module for situation-aware AI interactions."""

from kensan_ai.context.detector import detect_situation, Situation
from kensan_ai.context.resolver import ContextResolver, AIContext
from kensan_ai.context.variable_replacer import VariableReplacer
from kensan_ai.context.ab_selector import ABSelector, ExperimentContext

__all__ = [
    "detect_situation",
    "Situation",
    "ContextResolver",
    "AIContext",
    "VariableReplacer",
    "ABSelector",
    "ExperimentContext",
]
