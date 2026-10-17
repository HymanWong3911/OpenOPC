"""Contracts for blocked search recovery and secretary consumption of actual results."""
from __future__ import annotations

import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx

from opc.layer2_organization.secretary import SecretaryService
from opc.layer4_tools.web_search import web_search
from opc.layer5_memory.preference import PreferenceManager
from opc.layer5_memory.secretary_policy import SecretaryPolicyManager
from opc.layer5_memory.skill_library import SkillLibrary

LITE = '''<a class="result-link" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fdocs.python.org%2F">Python <b>Docs</b></a>
<td class="result-snippet">Read <b>official</b> documentation.</td>'''
HTML = LITE.replace('result-link', 'result__a').replace('result-snippet', 'result__snippet')
CHALLENGE = '<form id="challenge-form"><div class="anomaly-modal">Verify</div></form>'


class SearchRecoveryTests(unittest.IsolatedAsyncioTestCase):
    async def run_search(self, replies, **kwargs):
        self.paths = []
        def respond(request):
            self.paths.append(str(request.url))
            status, body = replies[len(self.paths) - 1]
            return httpx.Response(status, text=body)
        client = httpx.AsyncClient(transport=httpx.MockTransport(respond), follow_redirects=True)
        with patch('opc.layer4_tools.web_search.httpx.AsyncClient', return_value=client):
            return await web_search('Python & 文档', **kwargs)

    async def test_lite_titles_snippets_and_direct_urls(self):
        result = await self.run_search([(200, LITE)])
        self.assertTrue(result['success'])
        self.assertEqual(result['provider'], 'duckduckgo_lite')
        self.assertEqual(result['results'], [{'title':'Python Docs', 'url':'https://docs.python.org/',
                                             'snippet':'Read official documentation.'}])
        self.assertIn('lite.duckduckgo.com/lite/', self.paths[0])

    async def test_challenge_falls_back_to_html(self):
        result = await self.run_search([(202, CHALLENGE), (200, HTML)])
        self.assertTrue(result['success'])
        self.assertEqual(result['provider'], 'duckduckgo_html')
        self.assertEqual(len(self.paths), 2)

    async def test_both_blocked_are_errors_not_empty_results(self):
        result = await self.run_search([(200, CHALLENGE), (202, CHALLENGE)])
        self.assertFalse(result['success'])
        self.assertEqual(result['error_code'], 'search_unavailable')
        self.assertNotIn('results', result)
        self.assertEqual([r['reason'] for r in result['attempts']], ['challenge', 'challenge'])

    async def test_unrecognized_200_is_not_search_success(self):
        result = await self.run_search([(200, '<html>Login</html>'), (200, '<html>Consent</html>')])
        self.assertFalse(result['success'])
        self.assertTrue(all(r['reason'] == 'unrecognized_response' for r in result['attempts']))

    async def test_real_no_results_is_valid(self):
        result = await self.run_search([(200, '<div class="no-results">No results found for xyz</div>')])
        self.assertTrue(result['success'])
        self.assertEqual(result['results'], [])

    async def test_http_failure_falls_back(self):
        result = await self.run_search([(429, 'Too many requests'), (200, HTML)])
        self.assertTrue(result['success'])

    async def test_limit_and_empty_query(self):
        result = await self.run_search([(200, LITE * 3)], max_results=2)
        self.assertEqual(len(result['results']), 2)
        with patch('opc.layer4_tools.web_search.httpx.AsyncClient') as client:
            self.assertFalse((await web_search(' '))['success'])
            self.assertFalse((await web_search('Python', max_results='invalid'))['success'])
            client.assert_not_called()

    async def test_cancellation_propagates(self):
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.get.side_effect = asyncio.CancelledError
        with patch('opc.layer4_tools.web_search.httpx.AsyncClient', return_value=client):
            with self.assertRaises(asyncio.CancelledError):
                await web_search('Python')


class SecretarySearchTests(unittest.IsolatedAsyncioTestCase):
    def service(self, replies):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.llm = SimpleNamespace(simple_chat=AsyncMock(side_effect=[json.dumps(r) for r in replies]))
        self.memory = SimpleNamespace(
            ensure_session=AsyncMock(), record_user_turn=AsyncMock(), record_assistant_turn=AsyncMock(),
            build_project_knowledge_context=AsyncMock(return_value=''),
            build_session_prompt_context=AsyncMock(return_value=''),
        )
        return SecretaryService(self.llm, SimpleNamespace(get_events=AsyncMock(return_value=[])),
            self.memory, PreferenceManager(root), SkillLibrary(root), SecretaryPolicyManager(root))

    async def test_search_result_is_consumed_and_recorded(self):
        service = self.service([
            {'response':'正在查询', 'web_requests':[{'query':'Python 文档'}], 'actions':[]},
            {'response':'[官方文档](https://docs.python.org/)', 'web_requests':[], 'actions':[]},
        ])
        evidence = {'success':True, 'results':[{'title':'Python Docs', 'url':'https://docs.python.org/'}]}
        with patch('opc.layer2_organization.secretary.web_search', AsyncMock(return_value=evidence)) as search:
            result = await service.handle_message('联网查 Python 文档', project_id='p')
        search.assert_awaited_once_with('Python 文档', max_results=5)
        prompt = json.loads(self.llm.simple_chat.call_args_list[1].kwargs['prompt'])
        self.assertEqual(prompt['web_results'][0]['result'], evidence)
        self.assertIn('https://docs.python.org/', result['response'])
        self.assertEqual(result['web_results'], self.memory.record_assistant_turn.call_args.kwargs['metadata']['web_results'])

    async def test_regular_chat_needs_no_search(self):
        service = self.service([{'response':'你好', 'actions':[]}])
        with patch('opc.layer2_organization.secretary.web_search', AsyncMock()) as search:
            result = await service.handle_message('你好')
        search.assert_not_called()
        self.assertEqual(result['response'], '你好')
        self.assertEqual(result['web_results'], [])

    async def test_loop_is_bounded_and_failures_are_visible_to_model(self):
        request = {'response':'查询', 'web_requests':[{'query':str(i)} for i in range(10)], 'actions':[]}
        service = self.service([request, request, {'response':'搜索暂不可用', 'web_requests':[], 'actions':[]}])
        failure = {'success':False, 'error':'blocked'}
        with patch('opc.layer2_organization.secretary.web_search', AsyncMock(return_value=failure)) as search:
            result = await service.handle_message('搜索一下')
        self.assertEqual(search.await_count, 4)
        final_context = json.loads(self.llm.simple_chat.call_args_list[2].kwargs['prompt'])
        self.assertEqual(final_context['web_requests_remaining'], 0)
        self.assertEqual(len(final_context['web_results']), 4)
        self.assertTrue(all(r['result'] == failure for r in result['web_results']))


class CompanyCoordinationSearchTests(unittest.TestCase):
    def test_every_coordination_turn_retains_search_without_other_execution_tools(self):
        from opc.core.company_tools import MULTI_TEAM_COORDINATION_TURN_MODES
        from opc.core.models import AgentInfo, Task
        from opc.layer3_agent.native_agent import NativeAgent
        from opc.layer4_tools.registry import ToolRegistry
        from opc.layer4_tools.web_search import create_web_tools
        from opc.layer4_tools.shell import create_shell_tools
        agent = NativeAgent.__new__(NativeAgent)
        agent.role = AgentInfo(role_id='manager', name='Manager', responsibility='Research and coordinate.', tools=[])
        agent.tool_registry = ToolRegistry()
        for tool in [*create_web_tools(), *create_shell_tools()]:
            agent.tool_registry.register(tool)
        for turn_mode in MULTI_TEAM_COORDINATION_TURN_MODES:
            for inherited in [False, True]:
                with self.subTest(turn=turn_mode, inherited=inherited):
                    task = Task(metadata={'execution_mode':'company_mode'})
                    if inherited:
                        task.metadata['_fork_allowed_tools'] = ['web_search', 'web_fetch', 'shell_exec']
                    with patch('opc.layer3_agent.native_agent.resolve_company_turn_mode', return_value=turn_mode), \
                         patch('opc.layer3_agent.native_agent.company_collaboration_enabled_for_task', return_value=True), \
                         patch('opc.layer3_agent.native_agent.resolve_task_collaboration_tools', return_value=(None, set())):
                        allowed = agent._resolve_allowed_tools(task)
                    self.assertIn('web_search', allowed)
                    self.assertIn('web_fetch', allowed)
                    self.assertNotIn('shell_exec', allowed)

    def test_explicit_role_and_inherited_allowlists_are_not_expanded(self):
        from opc.core.company_tools import MULTI_TEAM_COORDINATION_TURN_MODES
        from opc.core.models import AgentInfo, Task
        from opc.layer3_agent.native_agent import NativeAgent
        agent = NativeAgent.__new__(NativeAgent)
        agent.role = AgentInfo(role_id='manager', name='Manager', responsibility='Research and coordinate.', tools=['file_read'])
        for inherited in [False, True]:
            task = Task(metadata={'_fork_allowed_tools':['file_read']} if inherited else {})
            with patch('opc.layer3_agent.native_agent.resolve_company_turn_mode', return_value=next(iter(MULTI_TEAM_COORDINATION_TURN_MODES))), \
                 patch('opc.layer3_agent.native_agent.company_collaboration_enabled_for_task', return_value=True), \
                 patch('opc.layer3_agent.native_agent.resolve_task_collaboration_tools', return_value=(None, set())):
                allowed = agent._resolve_allowed_tools(task)
            self.assertEqual(allowed, ['file_read'])
