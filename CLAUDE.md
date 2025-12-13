# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Terra Prime API is a NestJS-based REST API for real estate project management ("gestión de proyectos inmobiliarios"). The application uses TypeORM with PostgreSQL, includes Swagger/Scalar API documentation, and integrates with AWS services (S3, SES).

## Common Commands

### Development
- `pnpm install` - Install dependencies
- `pnpm run start:dev` - Start development server with hot reload
- `pnpm run start:debug` - Start with debugging enabled
- `pnpm run build` - Build the project
- `pnpm run start:prod` - Run production build

### Code Quality
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting

### Testing
- `pnpm run test` - Run unit tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:cov` - Run tests with coverage
- `pnpm run test:e2e` - Run end-to-end tests
- `pnpm run test:debug` - Debug tests

## Architecture

### Module Organization

The codebase is organized into four main domain modules:

1. **IAM** (`src/iam/`) - Identity and Access Management
   - `auth/` - Authentication (JWT-based)
   - `users/` - User management with roles and views
   - `approvals/` - Admin token-based approvals

2. **Inventory** (`src/inventory/`) - Real estate inventory management
   - `projects/` - Main projects (has stages, uses UUID)
   - `stages/` - Project stages (has blocks)
   - `bloks/` - Blocks within stages (has lots)
   - `lots/` - Individual lots/units for sale
   - Hierarchy: Project → Stage → Block → Lot

3. **Commercial** (`src/commercial/`) - Sales and lead management
   - `leads/` - Lead tracking with visits and sources
   - `sales/` - Complex sales module with nested submodules:
     - `stakeholders/` - Clients, guarantors, participants, secondary clients
     - `transaction/` - Contract, reservation, withdrawals
     - `terms/` - Financing (with installments), urban development
     - `documents/` - Radication

4. **Finance** (`src/finance/`) - Financial operations
   - `treasury/` - Treasury management
     - `payments/` - Payment processing with details and configuration
   - `collections/` - Collections management

5. **Shared** (`src/shared/`) - Shared services
   - `email/` - Email service (AWS SES integration)
   - `storage/` - File storage (AWS S3 integration)

### Configuration

- **Environment Variables**: Defined and validated in `src/config/envs.ts` using Joi schema
- **Database**: TypeORM with `autoLoadEntities: true` and `synchronize: true` (development mode)
- **API Documentation**: Scalar UI available at `/docs`, configured in `src/config/swagger.config.ts`
- **Global Prefix**: All routes are prefixed with `/api`
- **Validation**: Global ValidationPipe enabled with `whitelist: true` and `forbidNonWhitelisted: true`

### Key Patterns

- **Entities**: Use TypeORM decorators, many extend `Timestamped` base class from `src/common/entities/timestamped.entity.ts`
- **Module Structure**: Standard NestJS pattern - each feature has its own module with controllers, services, and entities
- **TypeScript Config**: Uses `nodenext` module resolution, strict null checks enabled
- **Import Sorting**: Enforced by ESLint - NestJS imports first, then external packages, then relative imports

### ESLint Configuration

The project uses a modern ESLint flat config (`eslint.config.mjs`) with:
- TypeScript type-checking enabled
- Auto-sorting imports (simple-import-sort): NestJS → external packages → internal → relative
- Unused imports detection and removal
- Interface naming convention (no "I" prefix)
- Prettier integration with auto-formatting

### External Integrations

- **AWS S3**: File storage via `@aws-sdk`
- **AWS SES**: Email sending (SMTP credentials required)
- **NATS**: Message broker integration (configured but may not be actively used)
- **Nexus Unilevel API**: External API integration for additional services

### Database Notes

- Primary keys use UUIDs for most entities
- Synchronize mode is enabled (development only - ensure this is disabled in production)
- Relationships use eager loading in some cases (e.g., Project → Stages)
- Custom indexes defined on frequently queried fields (e.g., `isActive`, `name`)

## Path Aliases

The project uses TypeScript path aliases to avoid deep relative imports:

```typescript
// Available aliases:
@common/*    → src/common/*
@config/*    → src/config/*
@commercial/* → src/commercial/*
@finance/*   → src/finance/*
@iam/*       → src/iam/*
@inventory/* → src/inventory/*
@shared/*    → src/shared/*

// Example usage:
import { envs } from '@config/envs';
import { User } from '@iam/users/entities/user.entity';
import { Timestamped } from '@common/entities/timestamped.entity';
```

VS Code is configured to prefer non-relative imports (via `.vscode/settings.json`), so the editor will suggest aliases in auto-completion.

## Development Notes

- The project uses `pnpm` as the package manager
- Server runs on port 5000 by default (configurable via `PORT` env var)
- Request body size limit: 50mb (configured in `main.ts`)
- Master password available via `PASSWORD_MASTER` env variable for admin operations
