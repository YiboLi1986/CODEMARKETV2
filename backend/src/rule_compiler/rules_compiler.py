import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from typing import Dict, List
import pandas as pd

from backend.src.data_io.file_reader import FileReader


class RulesCompiler:
    """
    Compile multiple rule-related sheets (Documentation / TypeDefinitions / AUS mapping)
    from a .xlsx file into structured text blocks usable for LLM prompts.
    """

    def __init__(self, xlsx_path: str) -> None:
        """
        Args:
            xlsx_path: Path to the Excel workbook containing the three sheets.
        """
        if not os.path.exists(xlsx_path):
            raise FileNotFoundError(f"Rules workbook not found: {xlsx_path}")
        self.xlsx_path = xlsx_path

    # -------------------------------------------------------------------------
    # Sheet processors
    # -------------------------------------------------------------------------
    def build_core_guide_text(self, sheet_name: str = "Documentation") -> str:
        """
        Build a markdown summary from the 'Documentation' sheet by:
          - locating the header row that contains "Functions" & "Description"
          - using rows with only the first column filled as section headings
          - rendering items with Desc/Params/Returns sublines

        Returns:
            A formatted markdown text summarizing Simulator, UnitCache, and GlobalCache functions.
        """
        df: pd.DataFrame = FileReader.read_xlsx(
            self.xlsx_path, sheet_name=sheet_name, header=None, dtype=str
        ).fillna("")
        # Convert to list-of-lists (strings)
        rows: List[List[str]] = [[self._clean_cell(x) for x in df.iloc[i].tolist()] for i in range(len(df))]

        # 1) Find the real header row that contains both "Functions" and "Description"
        header_idx = -1
        for i, r in enumerate(rows):
            joined = " | ".join(r).lower()
            if "functions" in joined and "description" in joined:
                header_idx = i
                break

        if header_idx == -1:
            # Fallback: flatten everything (keeps content rather than failing)
            flat = "\n".join(["  ".join([c for c in r if c]) for r in rows if any(r)])
            return f"# CORE_GUIDE\n\n{flat}".strip()

        header = rows[header_idx]

        def col_idx(name: str) -> int:
            for j, v in enumerate(header):
                if name in (v or "").lower():
                    return j
            return -1

        fn_i = col_idx("functions")
        desc_i = col_idx("description")
        par_i = col_idx("parameters")
        ret_i = col_idx("returns")

        out: List[str] = []
        out.append("# CORE_GUIDE")
        out.append("This block summarizes allowed runtime APIs and usage notes. Use only what appears here.")

        current_section = "General"

        # 2) Parse subsequent rows
        for r in rows[header_idx + 1:]:
            if not any(r):  # blank row
                continue

            # Section line: only first cell has content (others are empty) OR first cell contains "class of" and "functions"
            first = r[0]
            if (first and all(c == "" for c in r[1:])) or (
                "class of" in first.lower() and "functions" in first.lower()
            ):
                # Trim noise like "Simulator class of functionsProvides access ..." -> keep up to "functions"
                sec = first
                if "functions" in first.lower():
                    pos = first.lower().find("functions")
                    if pos != -1:
                        sec = first[:pos + len("functions")]
                current_section = " ".join(sec.split()).strip().title()
                out.append(f"\n## {current_section}")
                continue

            item_fn = self._get(r, fn_i)
            item_desc = self._get(r, desc_i)
            item_par = self._get(r, par_i)
            item_ret = self._get(r, ret_i)

            # Skip accidental duplicate header rows
            if item_fn.lower() == "functions" and item_desc.lower() == "description":
                continue
            if not (item_fn or item_desc or item_par or item_ret):
                continue

            out.append(f"- **{item_fn}**")
            if item_desc:
                out.append(f"  - _Desc:_ {item_desc}")
            if item_par:
                out.append(f"  - _Params:_ {self._normalize_space(item_par)}")
            if item_ret:
                out.append(f"  - _Returns:_ {item_ret}")

        out.append(
            "\n### House Rules\n"
            "- Use `DataRequest` for repeated variable reads.\n"
            "- Use `UnitCache` for per-unit intermediates; `GlobalCache` for shared values.\n"
            "- Validate inputs; handle missing/null values safely.\n"
            "- Write results via `Simulator.setData({ \"<Path>\": value })`.\n"
            "- No external libraries, filesystem, or network calls."
        )
        return "\n".join(out)

    # -------------------------------------------------------------------------
    def build_type_definitions_text(self, sheet_name: str = "TypeDefinitions.d.ts") -> str:
        """
        Extract TypeScript type definitions from the given sheet and join them as a single code block.

        Returns:
            A string containing formatted TypeScript declarations (```ts fenced).
        """
        df: pd.DataFrame = FileReader.read_xlsx(
            self.xlsx_path, sheet_name=sheet_name, header=None, dtype=str
        ).fillna("")
        lines: List[str] = []
        for _, row in df.iterrows():
            cell = self._clean_cell(row.iloc[0] if df.shape[1] > 0 else "")
            if cell:
                lines.append(cell.replace("\r", ""))
        ts = "\n".join(lines).strip()
        return f"```ts\n{ts}\n```"

    # -------------------------------------------------------------------------
    def build_mapping_text(self, sheet_name: str = "AUS mapping v14.6") -> str:
        """
        Build a formatted mapping text from the AUS mapping sheet, grouped by top-level prefix
        (e.g., Tanks.*, Streams.*, Units.*, Mixers.*, FeedUnits.*, Model.*, Other).

        Returns:
            A structured markdown text grouping variable paths.
        """
        df: pd.DataFrame = FileReader.read_xlsx(
            self.xlsx_path, sheet_name=sheet_name, header=None, dtype=str
        ).fillna("")

        raw: List[str] = []
        for _, row in df.iterrows():
            cell = self._clean_cell(row.iloc[0] if df.shape[1] > 0 else "")
            if not cell:
                continue
            s = cell.strip().strip('"')
            if s:
                raw.append(s)

        # Group by the top-level prefix (before first dot)
        groups: Dict[str, List[str]] = {}
        for p in raw:
            top = p.split(".")[0] if "." in p else "Other"
            groups.setdefault(top, []).append(p)

        # Preferred display order
        order = ["Tanks", "Streams", "Units", "Mixers", "FeedUnits", "Model", "Other"]
        keys = sorted(groups.keys(), key=lambda k: (order.index(k) if k in order else len(order), k))

        out: List[str] = []
        out.append("# VARIABLE_PATH_MAPPING")
        out.append("Use these path patterns; replace placeholders (e.g., <UnitName>, <StreamName>) with actual names.")
        for k in keys:
            out.append(f"\n## {k}")
            for v in sorted(set(groups[k])):
                out.append(f"- `{v}`")
        return "\n".join(out)

    # -------------------------------------------------------------------------
    def compile_all(self) -> Dict[str, str]:
        """
        Compile all sheets into a dictionary of text blocks.
        """
        return {
            "core_guide": self.build_core_guide_text(),
            "type_definitions": self.build_type_definitions_text(),
            "variable_mapping": self.build_mapping_text(),
        }

    # ------------------------------ helpers ------------------------------
    @staticmethod
    def _clean_cell(v) -> str:
        if pd.isna(v):
            return ""
        # Remove BOMs and normalize whitespace
        return str(v).replace("\ufeff", "").strip()

    @staticmethod
    def _get(row: List[str], idx: int) -> str:
        if idx < 0 or idx >= len(row):
            return ""
        return (row[idx] or "").strip()

    @staticmethod
    def _normalize_space(s: str) -> str:
        return " ".join((s or "").replace("\r", "").split())


if __name__ == "__main__":
    sample_path = "backend/src/rules/AUS_JS_Functions_From_Documentation.xlsx"

    compiler = RulesCompiler(sample_path)
    blocks = compiler.compile_all()

    # Preview to console (trimmed)
    print("\n========== CORE_GUIDE (preview) ==========\n")
    print(blocks["core_guide"][:1200])

    print("\n========== TYPE_DEFINITIONS (preview) ==========\n")
    print(blocks["type_definitions"][:800])

    print("\n========== VARIABLE_MAPPING (preview) ==========\n")
    print(blocks["variable_mapping"][:800])