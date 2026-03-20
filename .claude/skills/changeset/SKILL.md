---
name: changeset
description: Create a changeset entry to document a version bump and changelog for the current changes
disable-model-invocation: true
argument-hint: "[patch|minor|major] [description]"
---

Create a changeset entry for the current branch's changes.

## Instructions

1. Run `git diff main...HEAD --stat` and `git log main..HEAD --oneline` to understand what changed on this branch.
2. If no argument was provided, analyze the changes to determine:
   - **Bump type**: `patch` for fixes, `minor` for new features, `major` for breaking changes
   - **Summary**: A concise description of the change for the changelog
3. If `$ARGUMENTS` was provided, parse it as `[bump] [description]` (e.g., `minor Add changeset-based release workflow`).
4. Create a new markdown file in `.changeset/` with a random lowercase-kebab-case name (e.g., `.changeset/cool-birds-fly.md`) using this exact format:

```
---
"@alchemy/mcp-server": <bump>
---

<description>
```

Where `<bump>` is `patch`, `minor`, or `major` and `<description>` is the changelog entry.

5. Show the user the created changeset file and ask if they'd like to adjust anything.
