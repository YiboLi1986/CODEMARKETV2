import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import json
from typing import List, Dict, Optional, Any
from datetime import datetime

from backend.src.query.user_query_runner import UserQueryRunner
from backend.src.llm.copilot_client import CopilotClient


class ConversationManager:
    """
    Lightweight manager for multi-turn conversations with CopilotClient.

    Responsibilities:
      - Keep OpenAI-style `messages` (system/user/assistant) in memory
      - Persist/restore to/from disk (JSON + JSONL)
      - Start a session with (system, user) prompts (first turn)
      - Continue the session with user feedback (subsequent turns)
      - Token-safe trimming by last-N turns (optional rolling summary hook)

    Typical usage:
      cm = ConversationManager(session_id="demo")
      first = cm.start_with(system_prompt, user_prompt)
      next_reply = cm.continue_with("Please cap output to 1000 m3/h")
    """

    def __init__(
        self,
        session_id: str,
        storage_dir: str = "backend/src/outputs/sessions",
        copilot: Optional[CopilotClient] = None,
        max_turns: int = 20,
        enable_rolling_summary: bool = False,
    ) -> None:
        """
        Args:
            session_id: Identifier for the conversation (used for persistence).
            storage_dir: Directory to store session history files.
            copilot: Optional CopilotClient; if None, a default instance will be created.
            max_turns: Keep only the last N turns (user+assistant pairs) plus the system message.
            enable_rolling_summary: If True, you may implement a summary routine to compress history.
        """
        self.session_id = session_id
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)

        self._path_json = os.path.join(storage_dir, f"{session_id}.json")
        self._path_jsonl = os.path.join(storage_dir, f"{session_id}.jsonl")

        self.copilot = copilot or CopilotClient()
        self.messages: List[Dict[str, str]] = []
        self.max_turns = int(max_turns)
        self.enable_rolling_summary = bool(enable_rolling_summary)

        self._load_if_exists()

    # -------------------- Persistence --------------------
    def _load_if_exists(self) -> None:
        """Load existing messages from disk if a session file exists."""
        if os.path.exists(self._path_json):
            with open(self._path_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.messages = data.get("messages", [])
        else:
            self.messages = []

    def _save(self) -> None:
        """Persist current messages to a JSON file."""
        payload = {
            "session_id": self.session_id,
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "messages": self.messages,
        }
        with open(self._path_json, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    def _append_jsonl(self, obj: Dict[str, Any]) -> None:
        """Append a small event record to JSONL (for debugging/auditing)."""
        with open(self._path_jsonl, "a", encoding="utf-8") as f:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    # -------------------- Public APIs --------------------
    def reset(self) -> None:
        """Clear messages and persist a fresh session state."""
        self.messages = []
        self._save()

    def start_with(self, system_prompt: str, user_prompt: str, **overrides: Any) -> str:
        """
        Start a conversation with first two messages (system, user),
        call Copilot, record assistant reply, and persist.

        Returns:
            Assistant reply text.
        """
        self.messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        assistant_text = self._call_and_record(**overrides)
        return assistant_text

    def continue_with(self, user_message: str, **overrides: Any) -> str:
        """
        Continue the conversation with an extra user message, send full history,
        record assistant reply, and persist.

        Returns:
            Assistant reply text.
        """
        self.messages.append({"role": "user", "content": user_message})
        assistant_text = self._call_and_record(**overrides)
        return assistant_text

    def add_user(self, content: str) -> None:
        """Append a user message without sending (advanced/manual control)."""
        self.messages.append({"role": "user", "content": content})
        self._save()

    def add_assistant(self, content: str) -> None:
        """Append an assistant message without sending (advanced/manual control)."""
        self.messages.append({"role": "assistant", "content": content})
        self._save()

    def history(self) -> List[Dict[str, str]]:
        """Return a shallow copy of current messages history."""
        return list(self.messages)

    # -------------------- Internal --------------------
    def _call_and_record(self, **overrides: Any) -> str:
        """
        Call Copilot with current messages, append assistant reply, persist files,
        and return assistant text.
        """
        self._maybe_trim()

        data = self.copilot.chat_raw(self.messages, **overrides)
        try:
            assistant_text = data["choices"][0]["message"]["content"]
        except Exception:
            # Fallback: dump raw json for debugging
            assistant_text = str(data)

        self.messages.append({"role": "assistant", "content": assistant_text})
        self._save()
        self._append_jsonl({
            "ts": datetime.utcnow().isoformat() + "Z",
            "session_id": self.session_id,
            "event": "exchange",
            "messages_len": len(self.messages),
        })
        return assistant_text

    def _maybe_trim(self) -> None:
        """
        Keep only system + last (max_turns) user/assistant pairs to avoid token overflow.
        If enable_rolling_summary is True, you can implement a summary of old turns here.
        """
        if self.enable_rolling_summary:
            # TODO: Optionally call the model to summarize older turns,
            # then replace old messages with a short "assistant" summary message.
            pass

        # Keep: system message + last (max_turns*2) messages (user+assistant pairs)
        if len(self.messages) > (2 * self.max_turns + 1):
            sys_msg = self.messages[0] if self.messages and self.messages[0]["role"] == "system" else None
            tail = self.messages[-(2 * self.max_turns):]
            self.messages = [sys_msg] + tail if sys_msg else tail


if __name__ == "__main__":
    """
    Two demo paths:
      A) Use UserQueryRunner to construct (system, user) with rule blocks for the FIRST turn.
      B) Or directly pass your own system/user strings.

    By default we show path A, since it matches your pipeline.
    """
    # Toggle this if you want to try path B (manual prompts)
    USE_USER_QUERY_RUNNER = True

    if USE_USER_QUERY_RUNNER:
        # A) Build prompts via your UserQueryRunner (first turn with knowledge blocks)
        try:
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
            system_prompt, user_prompt = runner.build_prompts(
                rules_xlsx_path=RULES_XLSX,
                system_prompt_path=SYSTEM_PROMPT_TXT,
                user_prompt_path=USER_PROMPT_TXT,
                user_query=USER_QUERY,
            )

            cm = ConversationManager(session_id="fcu_splitter_demo")
            first = cm.start_with(system_prompt, user_prompt)
            print("\n=== Assistant (first turn) ===\n")
            print(first)

            # A subsequent turn (example feedback)
            feedback = "Please cap 'M-FC1-M-FFC' at 1000 m3/h; log a warning if capped."
            second = cm.continue_with(feedback)
            print("\n=== Assistant (second turn) ===\n")
            print(second)

        except Exception as e:
            print(f"[ERROR] {type(e).__name__}: {e}")

    else:
        # B) Manual prompts (not using UserQueryRunner)
        system_prompt = (
            "You are an expert JavaScript code generator specialized in refinery process simulation logic."
        )
        user_prompt = (
            "Generate code that reads 'Units.FCCU.Parameters.Intake', converts to m3 using "
            "'Units.Constants.Parameters.Barrel to m3 factor', and splits 'Streams.M-FCM-M-FC1.Volume' "
            "between 'Units.FCU Feed Splitter.Parameters.M-FC1-M-FFC' and "
            "'Units.FCU Feed Splitter.Parameters.M-FC1-TFCF'."
        )

        cm = ConversationManager(session_id="manual_demo")
        first = cm.start_with(system_prompt, user_prompt)
        print("\n=== Assistant (first turn) ===\n")
        print(first)

        second = cm.continue_with("Add input validation for missing/invalid parameters.")
        print("\n=== Assistant (second turn) ===\n")
        print(second)
