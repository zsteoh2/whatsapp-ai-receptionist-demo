"""Validate AI project context with Python's standard library only."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Optional
from urllib.parse import unquote


REQUIRED_DOCUMENTS = (
    "AI_CONTEXT.md",
    "AI_SESSION_START.md",
    "AI_SESSION_END.md",
    "docs/vision.md",
    "docs/requirements.md",
    "docs/business_rules.md",
    "docs/glossary.md",
    "docs/architecture/overview.md",
    "docs/project_memory/CURRENT.md",
)
METADATA_KEYS = {
    "document",
    "status",
    "last-reviewed",
    "source-of-truth",
    "owners",
}
DOCUMENT_STATES = {"draft", "active", "deprecated", "archived", "unknown"}
TASK_STAGES = {
    "discovery",
    "planning",
    "approved",
    "implementation",
    "verification",
    "documentation",
    "completed",
    "blocked",
}
ADR_STATES = {"Proposed", "Accepted", "Rejected", "Deprecated", "Superseded"}
MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")


def load_json(path: Path, errors: list[str]) -> Optional[dict]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        errors.append(f"invalid JSON: {path}: {exc}")
        return None
    if not isinstance(value, dict):
        errors.append(f"JSON root must be an object: {path}")
        return None
    return value


def frontmatter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    result: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return result
        match = re.match(r"^([a-zA-Z][a-zA-Z0-9-]*):\s*(.*)$", line)
        if match:
            result[match.group(1)] = match.group(2).strip()
    return {}


def validate_required_docs(root: Path, errors: list[str], reviews: list[str], stale_days: int) -> None:
    today = date.today()
    for relative in REQUIRED_DOCUMENTS:
        path = root / relative
        if not path.is_file():
            errors.append(f"missing required document: {relative}")
            continue
        metadata = frontmatter(path)
        missing = sorted(METADATA_KEYS - metadata.keys())
        if missing:
            errors.append(f"missing metadata in {relative}: {', '.join(missing)}")
            continue
        if metadata["status"] not in DOCUMENT_STATES:
            errors.append(f"invalid document status in {relative}: {metadata['status']}")
        reviewed = metadata["last-reviewed"]
        if reviewed == "unknown":
            reviews.append(f"review recommended: {relative} has no review date")
            continue
        try:
            reviewed_date = datetime.strptime(reviewed, "%Y-%m-%d").date()
        except ValueError:
            errors.append(f"invalid last-reviewed date in {relative}: {reviewed}")
            continue
        if (today - reviewed_date).days > stale_days:
            reviews.append(f"review recommended: {relative} was last reviewed {reviewed}")


def validate_links(root: Path, errors: list[str]) -> None:
    ignored_parts = {".git", "node_modules", "vendor"}
    for path in root.rglob("*.md"):
        if ignored_parts.intersection(path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"unreadable Markdown: {path.relative_to(root)}: {exc}")
            continue
        for raw_target in MARKDOWN_LINK.findall(text):
            target = raw_target.strip().split()[0].strip("<>")
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            relative_target = unquote(target.split("#", 1)[0])
            if relative_target and not (path.parent / relative_target).resolve().exists():
                errors.append(
                    f"broken link: {path.relative_to(root)} -> {relative_target}"
                )


def table_ids(path: Path, prefix: str) -> list[str]:
    if not path.is_file():
        return []
    pattern = re.compile(rf"^\|\s*({re.escape(prefix)}-[A-Z0-9-]+)\s*\|", re.MULTILINE)
    return pattern.findall(path.read_text(encoding="utf-8"))


def report_duplicates(label: str, values: list[str], errors: list[str]) -> None:
    for value, count in Counter(values).items():
        if count > 1:
            errors.append(f"duplicate {label}: {value}")


def validate_ids_and_adrs(root: Path, errors: list[str]) -> None:
    report_duplicates(
        "requirement ID", table_ids(root / "docs/requirements.md", "REQ"), errors
    )
    report_duplicates(
        "business-rule ID", table_ids(root / "docs/business_rules.md", "BR"), errors
    )
    adr_files = [
        path
        for path in (root / "docs/adr").glob("ADR-*.md")
        if "template" not in path.name.lower()
    ]
    ids = []
    for path in adr_files:
        match = re.match(r"^(ADR-[0-9]{3,})", path.name)
        if not match:
            errors.append(f"invalid ADR filename: {path.relative_to(root)}")
            continue
        ids.append(match.group(1))
        text = path.read_text(encoding="utf-8")
        status = re.search(r"^## Status\s*$\s*^([^#\s].*)$", text, re.MULTILINE)
        if not status or status.group(1).strip() not in ADR_STATES:
            value = status.group(1).strip() if status else "missing"
            errors.append(f"invalid ADR status in {path.relative_to(root)}: {value}")
    report_duplicates("ADR ID", ids, errors)


def validate_task_object(path: Path, task: dict, errors: list[str]) -> None:
    required = {
        "id",
        "title",
        "status",
        "priority",
        "created",
        "updated",
        "affectedModules",
        "relatedRequirements",
        "relatedBusinessRules",
        "relatedADRs",
    }
    missing = sorted(required - task.keys())
    if missing:
        errors.append(f"missing task fields in {path}: {', '.join(missing)}")
    if task.get("status") not in TASK_STAGES:
        errors.append(f"invalid task status in {path}: {task.get('status')}")
    if task.get("id") != path.parent.name:
        errors.append(f"task ID does not match directory: {path}")
    for field in ("affectedModules", "relatedRequirements", "relatedBusinessRules", "relatedADRs"):
        if field in task and not isinstance(task[field], list):
            errors.append(f"task field must be an array in {path}: {field}")


def validate_tasks(root: Path, errors: list[str]) -> None:
    ai_root = root / ".ai"
    active_root = ai_root / "tasks/active"
    task_by_id: dict[str, dict] = {}
    for bucket in ("active", "completed", "archived"):
        for path in (ai_root / "tasks" / bucket).glob("*/task.json"):
            task = load_json(path, errors)
            if task is None:
                continue
            validate_task_object(path.relative_to(root), task, errors)
            task_id = task.get("id")
            if isinstance(task_id, str):
                if task_id in task_by_id:
                    errors.append(f"duplicate task ID: {task_id}")
                task_by_id[task_id] = task
            if bucket == "active" and task.get("status") == "completed":
                errors.append(f"completed task remains active: {path.parent.name}")

    state_path = ai_root / "runtime/active-task.json"
    if not state_path.is_file():
        errors.append("missing active task state: .ai/runtime/active-task.json")
        return
    state = load_json(state_path, errors)
    if state is None:
        return
    required = {"taskId", "stage", "lastUpdated", "currentGoal", "nextAction", "blocked"}
    missing = sorted(required - state.keys())
    if missing:
        errors.append(f"missing active-task fields: {', '.join(missing)}")
    task_id = state.get("taskId")
    stage = state.get("stage")
    if task_id is None:
        if any(state.get(key) is not None for key in ("stage", "lastUpdated", "currentGoal", "nextAction")):
            errors.append("empty active task must clear stage, timestamps, goal, and next action")
        if state.get("blocked") is not False:
            errors.append("empty active task cannot be blocked")
        return
    if not isinstance(task_id, str):
        errors.append("active taskId must be a string or null")
        return
    task_dir = active_root / task_id
    if not task_dir.is_dir():
        errors.append(f"active task points to missing directory: {task_id}")
        return
    if stage not in TASK_STAGES:
        errors.append(f"invalid active task stage: {stage}")
    task = task_by_id.get(task_id)
    if task and task.get("status") != stage:
        errors.append(f"active stage differs from task status: {stage} != {task.get('status')}")
    if (stage == "blocked") != bool(state.get("blocked")):
        errors.append("active blocked flag must match blocked stage")


def git_commit(root: Path) -> Optional[str]:
    result = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else None


def validate_graph(root: Path, errors: list[str], reviews: list[str]) -> None:
    path = root / "graph/metadata.json"
    if not path.is_file():
        errors.append("missing graph metadata: graph/metadata.json")
        return
    metadata = load_json(path, errors)
    if metadata is None:
        return
    required = {"generatedAt", "sourceCommit", "generatorVersion", "scope"}
    missing = sorted(required - metadata.keys())
    if missing:
        errors.append(f"missing graph metadata fields: {', '.join(missing)}")
    current = git_commit(root)
    source = metadata.get("sourceCommit")
    if current and not source:
        reviews.append("review recommended: graph has not recorded a source commit")
    elif current and source != current:
        reviews.append(f"review recommended: graph may be outdated ({source} != {current})")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_root", nargs="?", type=Path, default=Path.cwd())
    parser.add_argument("--stale-days", type=int, default=180)
    args = parser.parse_args()
    root = args.project_root.resolve()
    errors: list[str] = []
    reviews: list[str] = []

    validate_required_docs(root, errors, reviews, args.stale_days)
    validate_links(root, errors)
    validate_ids_and_adrs(root, errors)
    validate_tasks(root, errors)
    validate_graph(root, errors, reviews)

    for item in errors:
        print(f"ERROR: {item}")
    for item in reviews:
        print(f"REVIEW: {item}")
    print(f"Summary: {len(errors)} error(s), {len(reviews)} review recommendation(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
