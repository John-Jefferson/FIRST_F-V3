#!/usr/bin/env python3
"""Offline integrity check of QA task planning, NOT an ERP functionality test."""
import json,pathlib,re,sys
base=pathlib.Path(__file__).resolve().parent.parent
rows=json.loads((base/'docs/task_definitions.json').read_text())
assert len(rows)==24,'Expected exactly 24 tester tasks'
for sprint in range(1,5):
 ids=[row['id'] for row in rows if row['sprint']==sprint]
 assert ids==[f'S{sprint}-TST-{i:02d}' for i in range(1,7)],(sprint,ids)
assert all(row['role']=='Tester' and row['assignee']=='Vince' for row in rows)
qa='\n'.join(p.read_text() for p in (base/'tests').glob('*.spec.cjs'))
for part in ('S1-TST','S2-TST','S3-TST','S4-TST'):
 assert part in qa, f'Missing suite mention: {part}'
print('PASS - 24 task definitions checked, 6 per sprint, assigned to Vince.')
print('PASS - read-only test suite includes identifiers for all 4 sprints.')
print('NOTE - This does not mean the ERP tasks passed. Live verification required.')
