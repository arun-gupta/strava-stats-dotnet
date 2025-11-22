# Contributing to Strava Activity Analyzer

Thank you for your interest in contributing! This document provides guidelines and setup instructions for contributors.

## Development Setup

Follow the setup instructions in the main [README.md](README.md) to get the project running locally.

## Git Hooks Setup

This repository uses Git hooks to maintain consistent commit authorship attribution.

### Setup (one time per clone):

```bash
git config core.hooksPath .githooks
chmod +x .githooks/prepare-commit-msg
```

After setup, your commits will automatically include:
```
Co-authored-by: Junie <junie@jetbrains.com>
```

**Note:** The hook skips merge commits and won't duplicate the trailer if it already exists.

## Commit Guidelines

- Use clear, descriptive commit messages
- Follow conventional commit format when possible (e.g., `feat:`, `fix:`, `docs:`)
- Include the co-author trailer (automatically added by the Git hook)

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request with a clear description of your changes

## Questions?

If you have questions or need help, please open an issue on GitHub.
