import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import uuid
import streamlit as st

from backend.src.query.user_query_runner import UserQueryRunner
from backend.src.query.conversation_manager import ConversationManager


def run_demo():
    st.set_page_config(page_title="Copilot Demo", layout="centered")
    st.title("💬 Copilot Conversation Demo")

    # ---------- Sidebar: settings ----------
    st.sidebar.header("Settings")
    rules_xlsx = st.sidebar.text_input(
        "Rules .xlsx",
        value="backend/src/rules/AUS_JS_Functions_From_Documentation.xlsx"
    )
    system_txt = st.sidebar.text_input(
        "System prompt .txt",
        value="backend/src/prompts/system.prompt.code.refinery.txt"
    )
    user_txt = st.sidebar.text_input(
        "User prompt .txt",
        value="backend/src/prompts/user.prompt.code.refinery.txt"
    )

    if st.sidebar.button("Clear Chat", type="secondary"):
        for k in ["messages", "initialized", "cm", "runner", "session_id"]:
            if k in st.session_state:
                del st.session_state[k]
        st.rerun()

    # ---------- Session state ----------
    if "messages" not in st.session_state:
        st.session_state.messages = []  # [{"role": "user"|"assistant", "content": str}]
    if "initialized" not in st.session_state:
        st.session_state.initialized = False
    if "cm" not in st.session_state:
        st.session_state.cm = None
    if "runner" not in st.session_state:
        st.session_state.runner = None
    if "session_id" not in st.session_state:
        st.session_state.session_id = f"ui-{uuid.uuid4().hex[:8]}"

    # ---------- Render history (always above input box) ----------
    for m in st.session_state.messages:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])

    # ---------- Bottom-fixed input ----------
    prompt = st.chat_input(
        "Type your refinery logic request or follow-up..."
    )

    # If no new user input this run, we’re done (keeps input anchored at bottom)
    if prompt is None:
        return

    # Append the user's message to history and show it immediately
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # ---------- First turn vs subsequent turns ----------
    try:
        if not st.session_state.initialized:
            # First turn: compile rules, build prompts, start conversation
            runner = UserQueryRunner()
            system_prompt, user_prompt = runner.build_prompts(
                rules_xlsx_path=rules_xlsx,
                system_prompt_path=system_txt,
                user_prompt_path=user_txt,
                user_query=prompt,
            )
            cm = ConversationManager(session_id=st.session_state.session_id)

            with st.chat_message("assistant"):
                with st.spinner("Calling Copilot..."):
                    reply = cm.start_with(system_prompt, user_prompt)

            # Persist for later turns
            st.session_state.initialized = True
            st.session_state.cm = cm
            st.session_state.runner = runner
        else:
            # Subsequent turns: continue the same thread
            cm: ConversationManager = st.session_state.cm
            with st.chat_message("assistant"):
                with st.spinner("Calling Copilot..."):
                    reply = cm.continue_with(prompt)

        # Render assistant reply & add to history
        st.session_state.messages.append({"role": "assistant", "content": reply})
        with st.chat_message("assistant"):
            st.markdown(reply)

        # Rerun so the new messages appear above and the input stays at bottom
        st.rerun()

    except Exception as e:
        err = f"**Error:** {type(e).__name__}: {e}"
        st.session_state.messages.append({"role": "assistant", "content": err})
        with st.chat_message("assistant"):
            st.error(err)
        st.rerun()


if __name__ == "__main__":
    run_demo()
