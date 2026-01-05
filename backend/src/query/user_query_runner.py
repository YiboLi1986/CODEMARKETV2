import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from typing import Dict, Optional, Tuple, Any
from backend.src.data_io.file_reader import FileReader
from backend.src.rule_compiler.rules_compiler import RulesCompiler
from backend.src.llm.copilot_client import CopilotClient


class UserQueryRunner:
    """
    Orchestrates a full pipeline:
      1) Compile three knowledge blocks from the rules workbook (.xlsx).
      2) Read system & user prompt templates from disk.
      3) Inject knowledge blocks into both templates.
      4) Render the user prompt with {USER_QUERY} (and optional placeholders).
      5) Call CopilotClient and return the assistant's text.
    """

    _DEFAULT_TOKENS_MAP = {
        # Primary tokens
        "<<CORE_GUIDE>>": "core_guide",
        "<<TYPE_DEFINITIONS>>": "type_definitions",
        "<<VARIABLE_PATH_MAPPING>>": "variable_mapping",
        # Aliases (keep flexibility with earlier templates)
        "<<TOPICAL_RULES>>": "type_definitions",
        "<<EXAMPLES_PLAYBOOK>>": "variable_mapping",
    }

    def __init__(
        self,
        copilot: Optional[CopilotClient] = None,
        sheet_names: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Args:
            copilot: Optional CopilotClient instance; if None, a default will be created.
            sheet_names: Optional mapping to override sheet names.
        """
        self.copilot = copilot or CopilotClient()
        self.sheet_names = sheet_names or {
            "documentation": "Documentation",
            "definitions": "TypeDefinitions.d.ts",
            "mapping": "AUS mapping v14.6",
        }

    def build_prompts(
        self,
        rules_xlsx_path: str,
        system_prompt_path: str,
        user_prompt_path: str,
        user_query: str,
        extra_placeholders: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, str]:
        """
        Build fully rendered system & user prompts ready for model invocation.
        """
        # 1) Compile three text blocks from the rules workbook
        compiler = RulesCompiler(rules_xlsx_path)
        blocks = {
            "core_guide": compiler.build_core_guide_text(self.sheet_names["documentation"]),
            "type_definitions": compiler.build_type_definitions_text(self.sheet_names["definitions"]),
            "variable_mapping": compiler.build_mapping_text(self.sheet_names["mapping"]),
        }

        # 2) Read raw templates
        system_tpl = FileReader.read_text(system_prompt_path)
        user_tpl = FileReader.read_text(user_prompt_path)

        # 3) Inject blocks into templates
        system_filled = self._inject_blocks(system_tpl, blocks)
        user_with_blocks = self._inject_blocks(user_tpl, blocks)

        # 4) Render user prompt with a safe replacement (avoid str.format pitfalls)
        #    We ONLY replace the {USER_QUERY} token to prevent accidental .format()
        #    expansion of braces that appear inside injected knowledge blocks.
        if "{USER_QUERY}" not in user_with_blocks:
            pass

        user_rendered = user_with_blocks.replace("{USER_QUERY}", user_query)
        return system_filled, user_rendered

    def run(
        self,
        rules_xlsx_path: str,
        system_prompt_path: str,
        user_prompt_path: str,
        user_query: str,
        extra_placeholders: Optional[Dict[str, Any]] = None,
        **chat_overrides: Any,
    ) -> str:
        """
        Execute the full pipeline and return the assistant's final text.
        """
        system_prompt, user_prompt = self.build_prompts(
            rules_xlsx_path=rules_xlsx_path,
            system_prompt_path=system_prompt_path,
            user_prompt_path=user_prompt_path,
            user_query=user_query,
            extra_placeholders=extra_placeholders,
        )
        return self.copilot.chat_text(system_prompt, user_prompt, extra_messages=None, **chat_overrides)

    def _inject_blocks(self, template: str, blocks: Dict[str, str]) -> str:
        """
        Replace supported placeholders in the template with compiled text blocks.
        """
        out = template
        for token, key in self._DEFAULT_TOKENS_MAP.items():
            if token in out:
                out = out.replace(token, blocks.get(key, ""))
        return out


if __name__ == "__main__":
    RULES_XLSX = "backend/src/rules/AUS_JS_Functions_From_Documentation.xlsx"
    SYSTEM_PROMPT_TXT = "backend/src/prompts/system.prompt.code.refinery.txt"
    USER_PROMPT_TXT = "backend/src/prompts/user.prompt.code.refinery.txt"

    USER_QUERY = (
        "User query:\n"
        "This process controls the 'FCU Feed Splitter' based on the user's parameter 'Intake' from the parameter unit 'FCCU'.\n\n"
        "Details:\n"
        "- The user parameter 'Intake' is provided in barrels, while the Splitter operates in cubic meters (m3).\n"
        "- The logic should read the input stream 'M-FCM-M-FC1' connected to the splitter.\n"
        "- Convert the intake value from barrels to m3 using the conversion factor parameter 'Barrel to m3 factor' from the unit 'Constants'.\n\n"
        "Process specification:\n"
        "1. **Inputs**\n"
        "   - Stream: 'M-FCM-M-FC1', UOM: 'Volume'\n"
        "   - Unit: 'FCCU', Parameter: 'Intake'\n"
        "   - Unit: 'Constants', Parameter: 'Barrel to m3 factor'\n\n"
        "2. **Logic**\n"
        "   - Check if the parameter value 'Intake' exists (handle missing/null).\n"
        "   - Convert the parameter value from barrels to m3 using the conversion factor.\n"
        "   - Compare the converted intake value with the available feed from the stream.\n"
        "   - Calculate the portion of feed going to FCCU and the remaining to the storage tank.\n\n"
        "3. **Outputs**\n"
        "   - Splitter: 'FCU Feed Splitter', Parameter: 'M-FC1-M-FFC' (feed to FCCU)\n"
        "   - Splitter: 'FCU Feed Splitter', Parameter: 'M-FC1-TFCF' (feed to storage tank)\n\n"
        "Expected behavior:\n"
        "The logic dynamically balances feed distribution between FCCU and the storage tank "
        "based on available stream volume and the user's input parameter."
    )

    runner = UserQueryRunner()
    try:
        result = runner.run(
            rules_xlsx_path=RULES_XLSX,
            system_prompt_path=SYSTEM_PROMPT_TXT,
            user_prompt_path=USER_PROMPT_TXT,
            user_query=USER_QUERY,
            # Optional chat overrides:
            # temperature=0.1,
            # max_tokens=3000,
        )
        print("\n========== MODEL OUTPUT ==========\n")
        print(result)
    except Exception as e:
        print(f"\n[ERROR] {type(e).__name__}: {e}\n")
