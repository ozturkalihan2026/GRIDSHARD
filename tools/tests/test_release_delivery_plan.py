"""Regression checks for drift that could make the connected plan misleading."""
from copy import deepcopy
import json
import re
import unittest
from unittest.mock import Mock, patch

from tools import release_delivery_plan as plan


class ReleaseDeliveryPlanTests(unittest.TestCase):
    def setUp(self):
        self.calendar = json.loads(plan.SOURCE.read_text(encoding='utf-8'))
        self.backlog = json.loads(plan.BACKLOG.read_text(encoding='utf-8'))

    def test_scope_drift_is_rejected(self):
        self.calendar['releases'][0]['content'] = 'Different scope'
        with self.assertRaisesRegex(ValueError, 'scope differs'):
            plan.validate(self.calendar, self.backlog)

    def test_same_day_final_acceptance_requires_an_explicit_expedited_decision(self):
        release = self.calendar['releases'][0]
        self.assertEqual(release['tests_start_on'], release['target_release_on'])
        self.assertEqual(release['expedited_patch']['previous_target_release_on'], '2026-11-23')
        plan.validate(self.calendar, self.backlog)
        # Both sources must be changed: removing the exception from just one
        # source is rejected as drift, removing both restores the normal rule.
        release.pop('expedited_patch')
        matching = next(r for r in self.backlog['release_plan'] if r['version'] == '2.4.0')
        matching.pop('expedited_patch')
        with patch('tools.release_calendar.json.loads', return_value=self.backlog):
            with self.assertRaisesRegex(ValueError, 'Invalid development/release sequence'):
                plan.validate(self.calendar, self.backlog)

    def test_required_audio_cannot_be_detached_from_release_gate(self):
        gate = next(t for t in self.backlog['tasks'] if t['id'] == 'RELEASE-01')
        gate['depends_on'] = [t for t in gate['depends_on'] if t not in {'AUDIO-01', 'AUDIO-02'}]
        with self.assertRaisesRegex(ValueError, 'outside release gate'):
            plan.validate(self.calendar, self.backlog)

    def test_unscheduled_audio_is_rejected(self):
        for phase in self.calendar['releases'][0]['work_schedule']:
            phase['tasks'] = [t for t in phase['tasks'] if t != 'AUDIO-02']
        with self.assertRaisesRegex(ValueError, 'Unscheduled work'):
            plan.validate(self.calendar, self.backlog)

    def test_outside_window_is_rejected(self):
        self.calendar['releases'][0]['work_schedule'][0]['starts_on'] = '2026-11-03'
        with self.assertRaisesRegex(ValueError, 'Invalid release phase'):
            plan.validate(self.calendar, self.backlog)

    def test_wrong_brief_or_backlink_is_rejected(self):
        broken = deepcopy(self.calendar)
        broken['releases'][0]['delivery_document'] = 'docs/planning/releases/2.5.0.md'
        with self.assertRaisesRegex(ValueError, 'brief paths differ'):
            plan.validate(broken, self.backlog)
        next(t for t in self.backlog['tasks'] if t['id'] == 'AUDIO-01')['planned_releases'] = []
        with self.assertRaisesRegex(ValueError, 'backlinks differ'):
            plan.validate(self.calendar, self.backlog)

    def test_optional_license_is_not_a_required_gate(self):
        optional = next(p for p in self.calendar['releases'][2]['delivery_packages'] if p['kind'] == 'optional')
        self.assertEqual(optional['tasks'], ['REWARD-05'])
        # Validation requires gate coverage for required packages, while this pilot can remain unshipped.
        plan.validate(self.calendar, self.backlog)
        optional['kind'] = 'required'
        with self.assertRaisesRegex(ValueError, 'outside release gate'):
            plan.validate(self.calendar, self.backlog)

    def test_all_generated_links_resolve_including_checklist_anchors(self):
        outputs = {plan.INDEX: plan.render_index(self.calendar['releases'], self.backlog)}
        outputs.update({plan.ROOT / r['delivery_document']: plan.render_brief(r, self.backlog)
                        for r in self.calendar['releases']})
        for origin, content in outputs.items():
            for href in re.findall(r'\]\(([^)]+)\)', content):
                path, _, anchor = href.partition('#')
                target = (origin.parent / path).resolve()
                self.assertTrue(target.exists(), (origin, href))
                if anchor:
                    self.assertIn(f'id="{anchor}"', target.read_text(encoding='utf-8'))

    def test_local_evidence_presence_cannot_change_generated_briefs(self):
        original = plan.repository_path
        def render(local_exists):
            def resolve(path):
                if path.split('/', 1)[0] in {'artifacts', 'qa_reports', 'deliverables'}:
                    return Mock(exists=lambda: local_exists)
                return original(path)
            with patch.object(plan, 'repository_path', resolve):
                return [plan.render_brief(release, self.backlog) for release in self.calendar['releases']]
        self.assertEqual(render(True), render(False))


if __name__ == '__main__':
    unittest.main()
