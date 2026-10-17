"""Real, isolated saved-team creation and employee-registry round trips."""

from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from opc.core.config import OPCConfig
from opc.core.employee_registry import is_placeholder_employee, load_employee_registry
from opc.core.org_config import (
    apply_org_config_payload_to_config,
    load_org_config_payload,
    read_org_index,
    validate_runnable_org_config,
)
from opc.layer2_organization.org_engine import OrgEngine
from opc.layer2_organization.talent_market import TalentMarket
from opc.plugins.office_ui.services.context import ModeState, OfficeServiceContext
from opc.plugins.office_ui.services.models import ServiceError
from opc.plugins.office_ui.services.org import OrgService


@pytest.fixture
def context(tmp_path: Path) -> OfficeServiceContext:
    opc_home = tmp_path / ".opc"
    config = OPCConfig()
    engine = SimpleNamespace(
        config=config,
        opc_home=opc_home,
        org_engine=OrgEngine(config, opc_home=opc_home),
        talent_market=TalentMarket(opc_home, config),
    )
    ctx = OfficeServiceContext(
        engine=engine,
        agent_store=None,
        chat_store=None,
        event_adapter=None,
        mode_state=ModeState(exec_mode="company", company_profile="corporate"),
    )
    active_names: list[str] = []

    async def set_active(name: str) -> None:
        active_names.append(name)

    ctx.set_active_saved_org_name = set_active
    ctx.activated_names = active_names
    talent_dir = opc_home / "prompts" / "talent"
    talent_dir.mkdir(parents=True)
    for template_id, name in [("local-lead", "Local Lead"), ("local-builder", "Local Builder")]:
        (talent_dir / f"{template_id}.md").write_text(
            f"---\nid: {template_id}\nname: {name}\n"
            "description: Source description, unchanged.\ncategory: engineering\n"
            "tags: [implementation, reproducibility]\n---\n"
            f"# {name}\nUse the original {template_id} protocol; preserve evidence.\n",
            encoding="utf-8",
        )
    return ctx


def _disk_snapshot(root: Path) -> dict[str, bytes | None]:
    return {
        str(path.relative_to(root)): path.read_bytes() if path.is_file() else None
        for path in sorted(root.rglob("*"))
    }


def _create(context: OfficeServiceContext, members: list[dict], *, name: str = "Preset Team"):
    return asyncio.run(OrgService(context).saved_create(organization_name=name, members=members))


def _read_created(context: OfficeServiceContext, organization_id: str):
    payload, path = load_org_config_payload(context.opc_home / "config", organization_id)
    restored = apply_org_config_payload_to_config(OPCConfig(), payload, source_path=path)
    validate_runnable_org_config(restored, organization_id=organization_id)
    return payload, restored, OrgEngine(restored, opc_home=context.opc_home)


def test_manual_creation_keeps_existing_placeholder_and_inline_prompt_behavior(context):
    result = _create(context, [
        {"name": "Lead", "prompt": "Lead using the manual protocol."},
        {"name": "Builder", "prompt": "Use manual implementation guidance.", "reports_to_index": 0},
    ])

    assert result.payload["roles_count"] == result.payload["employees_count"] == 2
    assert all(is_placeholder_employee(employee) for employee in context.engine.config.org.employees)
    assert load_employee_registry(context.opc_home, "preset_team") == []
    assert not (context.opc_home / "company_state").exists()
    payload, restored, runtime = _read_created(context, "preset_team")
    assert payload["employees"] == []
    assert restored.org.roles[1].reports_to == "lead"
    assert runtime.get_role_prompt_context("lead") == "Lead using the manual protocol."
    assert runtime.get_role_prompt_context("builder") == "Use manual implementation guidance."


@pytest.mark.parametrize("template_ids", [
    ("local-lead", "local-builder"),
    ("fullstack-engineer", "devops-engineer"),
])
def test_local_and_builtin_templates_staff_and_survive_registry_roundtrip(context, template_ids):
    original_catalog = {
        item.id: item.model_dump()
        for item in context.engine.talent_market.list_available_templates()
    }
    prompt_files = _disk_snapshot(context.opc_home / "prompts")
    result = _create(context, [
        {"name": "技术负责人", "template_id": template_ids[0], "prompt": "Keep role-specific goals."},
        {"name": "开发工程师", "template_id": template_ids[1], "reports_to_index": 0},
    ])

    assert result.payload["employees_count"] == 2
    assert context.engine.config is context.engine.org_engine.config
    assert context.engine.config is context.engine.talent_market.config
    assert context.activated_names == [result.payload["organization_id"]]
    assert read_org_index(context.opc_home / "config") == result.payload["organization_id"]
    payload, restored, runtime = _read_created(context, result.payload["organization_id"])
    assert payload["employees"] == []
    assert payload["talent_templates"] == []
    assert restored.org.roles[0].prompt_refs == ["Keep role-specific goals."]
    assert restored.org.roles[1].reports_to == restored.org.roles[0].id
    assert restored.org.final_decider_role_id == restored.org.roles[0].id
    registry = load_employee_registry(context.opc_home, result.payload["organization_id"])
    assert {employee.template_id for employee in registry} == set(template_ids)
    assert len(registry) == len(restored.org.employees) == 2
    for role, template_id, employee_name in zip(restored.org.roles, template_ids, ["技术负责人", "开发工程师"]):
        employee = runtime.list_employees(role.id)[0]
        original = original_catalog[template_id]
        assert employee.employee_id == template_id
        assert employee.template_id == template_id
        assert employee.name == employee_name
        assert employee.description == original["description"]
        assert employee.category == original["category"]
        assert employee.tags == original["tags"]
        assert employee.preferred_external_agent == original["preferred_external_agent"]
        assert employee.prompt_refs == ([original["prompt_ref"]] if original["prompt_ref"] else [])
        assert not is_placeholder_employee(employee)
        assignment = runtime.resolve_employee_for_work_item(role.id)
        assert assignment["employee_id"] == template_id
        if template_id.startswith("local-"):
            assert f"Use the original {template_id} protocol" in assignment["prompt_context"]
        else:
            # Builtin catalog has no prompt_ref: creation must not invent one.
            assert assignment["prompt_context"] == ""
    assert _disk_snapshot(context.opc_home / "prompts") == prompt_files
    assert {
        item.id: item.model_dump()
        for item in context.engine.talent_market.list_available_templates()
    } == original_catalog


def test_mixed_template_and_manual_members_keep_manual_placeholder(context):
    result = _create(context, [
        {"name": "Lead", "template_id": "local-lead"},
        {"name": "Manual Analyst", "responsibility": "Review manual findings."},
    ])

    assert result.payload["employees_count"] == 2
    assert len(context.engine.config.org.employees) == 2
    real = next(employee for employee in context.engine.config.org.employees if not is_placeholder_employee(employee))
    placeholder = next(employee for employee in context.engine.config.org.employees if is_placeholder_employee(employee))
    assert real.template_id == "local-lead"
    assert is_placeholder_employee(placeholder)
    assert placeholder.role_id == "manual_analyst"
    _, restored, runtime = _read_created(context, "preset_team")
    assert len(restored.org.employees) == 1
    assert runtime.list_employees("lead")[0].template_id == "local-lead"
    assert runtime.resolve_employee_for_work_item("manual_analyst")["metadata"]["is_default_employee"]


def test_repeated_template_uses_existing_multi_role_employee_rules(context):
    result = _create(context, [
        {"name": "Lead", "template_id": "local-lead"},
        {"name": "Reviewer", "template_id": "local-lead"},
    ])

    assert result.payload["roles_count"] == 2
    assert result.payload["employees_count"] == len(context.engine.config.org.employees) == 1
    _, restored, runtime = _read_created(context, "preset_team")
    assert len(load_employee_registry(context.opc_home, "preset_team")) == len(restored.org.employees) == 1
    employee = restored.org.employees[0]
    assert employee.name == "Lead"
    assert employee.metadata["staffed_role_ids"] == ["lead", "reviewer"]
    for role_id in ["lead", "reviewer"]:
        assignment = runtime.resolve_employee_for_work_item(role_id)
        assert assignment["employee_id"] == "local-lead"
        assert assignment["role_id"] == role_id
        assert "Use the original local-lead protocol" in assignment["prompt_context"]


@pytest.mark.parametrize("missing_index", [0, 1])
def test_unknown_template_fails_without_current_config_or_disk_changes(context, missing_index):
    _create(context, [
        {"name": "Existing Lead", "template_id": "local-lead"},
        {"name": "Existing Builder", "template_id": "local-builder"},
    ], name="Existing Team")
    original = context.engine.config
    original_payload = original.model_dump()
    original_disk = _disk_snapshot(context.opc_home)
    original_roles = [agent.role_id for agent in context.engine.org_engine.list_agents()]
    members = [
        {"name": "New Lead", "template_id": "local-lead"},
        {"name": "New Builder", "template_id": "local-builder"},
    ]
    members[missing_index]["template_id"] = "missing-template"

    with pytest.raises(ServiceError) as error:
        _create(context, members)

    assert error.value.code == "template_not_found"
    assert error.value.to_payload()["template_id"] == "missing-template"
    assert error.value.to_payload()["index"] == missing_index
    assert context.engine.config is original
    assert context.engine.org_engine.config is original
    assert context.engine.talent_market.config is original
    assert original.model_dump() == original_payload
    assert [agent.role_id for agent in context.engine.org_engine.list_agents()] == original_roles
    assert _disk_snapshot(context.opc_home) == original_disk
    assert context.activated_names == ["existing_team"]


@pytest.mark.parametrize("reports_to_index", [1, 2, -1, "invalid"])
def test_invalid_hierarchy_fails_before_registry_or_org_writes(context, reports_to_index):
    original = context.engine.config
    original_payload = original.model_dump()
    original_disk = _disk_snapshot(context.opc_home)

    with pytest.raises(ServiceError) as error:
        _create(context, [
            {"name": "Lead", "template_id": "local-lead"},
            {"name": "Builder", "template_id": "local-builder", "reports_to_index": reports_to_index},
        ])

    assert error.value.code == "invalid_org_member_hierarchy"
    assert context.engine.config is original
    assert original.model_dump() == original_payload
    assert _disk_snapshot(context.opc_home) == original_disk
    assert context.activated_names == []


def test_new_team_id_preserves_existing_saved_org_and_registry(context):
    first = _create(context, [
        {"name": "Lead", "template_id": "local-lead"},
        {"name": "Builder", "template_id": "local-builder"},
    ])
    first_path = Path(first.payload["path"])
    first_yaml = first_path.read_bytes()
    first_registry = _disk_snapshot(context.opc_home / "company_state" / "preset_team")
    second = _create(context, [
        {"name": "Lead", "template_id": "local-lead"},
        {"name": "Engineer", "template_id": "fullstack-engineer"},
    ])

    assert second.payload["organization_id"] == "preset_team_2"
    assert first_path.read_bytes() == first_yaml
    assert _disk_snapshot(context.opc_home / "company_state" / "preset_team") == first_registry
    _, first_restored, _ = _read_created(context, "preset_team")
    _, second_restored, _ = _read_created(context, "preset_team_2")
    assert {employee.template_id for employee in first_restored.org.employees} == {"local-lead", "local-builder"}
    assert {employee.template_id for employee in second_restored.org.employees} == {"local-lead", "fullstack-engineer"}
    assert read_org_index(context.opc_home / "config") == "preset_team_2"
