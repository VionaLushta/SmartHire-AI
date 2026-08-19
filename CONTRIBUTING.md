# Contributing to SmartHire AI

Thanks for taking the time to improve SmartHire AI.

This project is meant to feel like a maintained commercial product, so changes should be focused, well documented, and easy to review.

## Development Workflow

1. Create a branch from the latest mainline code.
2. Make the smallest change that solves the problem.
3. Keep documentation aligned with any behavior or configuration change.
4. Run the relevant backend and frontend checks before opening a pull request.
5. Open a PR with a clear summary and verification notes.

## Branch Naming

Use one of these prefixes:

- `feature/short-description`
- `fix/short-description`
- `docs/short-description`
- `refactor/short-description`
- `test/short-description`
- `chore/short-description`

Examples:

- `feature/job-filtering`
- `fix/auth-refresh`
- `docs/api-reference`

## Commit Conventions

Use concise conventional-style commit messages:

```text
type(scope): short description
```

Examples:

- `docs(readme): refresh setup instructions`
- `fix(auth): handle expired sessions`
- `chore(gitignore): ignore local build artifacts`

Recommended types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `perf`

## Coding Standards

### Backend

- Follow PEP 8 and keep functions typed where practical.
- Keep route handlers thin.
- Put business rules in services.
- Put database access in repositories.
- Prefer explicit, readable queries over clever one-liners.

### Frontend

- Keep components focused on a single responsibility.
- Use feature slices for shared state.
- Keep API access in the service layer.
- Reuse existing layout and UI primitives before introducing new ones.
- Favor clear names and small components over deeply nested conditionals.

## Pull Request Checklist

- Documentation updated where needed
- No secrets committed
- Relevant tests or checks run
- UI changes verified in the browser
- Changes scoped to the requested ticket

## Testing Commands

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

## Reporting Issues

When opening an issue, include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Relevant logs or screenshots
- Your environment details

## License

By contributing to SmartHire AI, you agree that your contribution will be distributed under the MIT License.
