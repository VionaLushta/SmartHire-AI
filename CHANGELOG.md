# Changelog

All notable changes to SmartHire AI are documented here.

This project follows Semantic Versioning and Keep a Changelog conventions.

## [1.0.0] - 2026-08-18

### Added

- React 19 frontend with routed public, candidate, company, and admin views
- FastAPI backend with auth, jobs, candidate, company, resume, certificate, education, and analytics routes
- PostgreSQL schema with Alembic migrations
- JWT authentication with refresh token rotation
- Repository and service layers for backend maintainability
- Redux Toolkit state management on the frontend
- Resume parsing, skill extraction, recommendation, and ranking workflows
- Candidate, company, job, and analytics dashboards
- Environment templates for backend and frontend configuration
- Root-level README, API reference, architecture guide, and contribution guide

### Changed

- Established a production-oriented repository structure
- Standardized documentation and repository hygiene files

## [Unreleased]

### Planned

- OAuth login providers
- Email notifications
- Additional hiring workflow automation
- More advanced analytics and reporting
- Stronger AI explainability for ranking and matching

## [2.1.0] - 2026-08-25

### Added

- Production deployment manifests for static frontend hosting and backend container deployment
- Release readiness documentation for configuration, monitoring, and portfolio presentation
- Production release report and asset checklist

### Changed

- Refreshed deployment and release documentation for portfolio and internship evaluation use
- Aligned repository documentation with the current production release package
