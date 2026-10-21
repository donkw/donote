# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `donkw/donote`. Run `gh` inside this clone; use `--repo donkw/donote` when running elsewhere.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels,comments`; add label or state filters as needed.
- Comment: `gh issue comment <number> --body-file <file>`.
- Edit body: `gh issue edit <number> --body-file <file>`.
- Apply or remove labels: `gh issue edit <number> --add-label "..." --remove-label "..."`.
- Close: `gh issue close <number>`; add the resolution comment first.
- For multiline bodies, write the exact text to a UTF-8 temporary file and pass it with `--body-file`.

When a skill says "publish to the issue tracker", create a GitHub issue. When it says "fetch the relevant ticket", read the referenced issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding operations

Used by `/wayfinder`. The map is one issue with child issues as tickets.

- Map: an issue labelled `wayfinder:map`, with Notes / Decisions-so-far / Fog in its body.
- Child: an issue labelled `wayfinder:<type>` (`research`, `prototype`, `grilling`, or `task`). Link it using `gh api --method POST repos/donkw/donote/issues/<map>/sub_issues -F sub_issue_id=<child-db-id>`. If sub-issues are unavailable, use a task list in the map and `Part of #<map>` in each child.
- Database IDs: obtain with `gh api repos/donkw/donote/issues/<number> --jq .id`; these differ from issue numbers.
- Blocking: use native dependencies via `gh api --method POST repos/donkw/donote/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. If unavailable, use `Blocked by: #<number>, #<number>` near the top of the child body.
- Frontier: inspect open children in map order; select the first with no assignee and no open blockers. For native dependencies, check `issue_dependencies_summary.blocked_by`; for body links, check each blocker.
- Claim: `gh issue edit <number> --add-assignee @me` before working.
- Resolve: comment with the answer, close the child, then append a brief summary and link to Decisions-so-far in the map.
