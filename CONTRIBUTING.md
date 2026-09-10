# Contributing to Hotel Surya Operations & Management Platform

Thank you for your interest in contributing to the **Hotel Surya** platform!

## Development Guidelines

1. **Code Standards**:
   - Write clean, strongly-typed TypeScript (strict mode enabled).
   - Do not use `any` unless absolutely necessary.
   - All financial and billing calculations must be performed using `calculateStayBill` in `src/server/services/billing.service.ts` to prevent precision errors.
   - Ensure all dates are properly stored in UTC and rendered with Asia/Kathmandu (Nepal Time) localizers.

2. **Branching & Commits**:
   - Create a descriptive feature branch: `git checkout -b feature/your-feature-name`
   - Use conventional commit messages: `feat:`, `fix:`, `docs:`, `test:`.

3. **Running Checks Locally**:
   ```bash
   npm run typecheck    # Verify zero TypeScript issues
   npm test             # Run Vitest test suites
   npm run build        # Validate production Next.js bundle
   ```

4. **Pull Requests**:
   - Ensure all CI tests pass.
   - Add unit or integration tests for new services or database transactions.
