# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Manager
This project uses `pnpm` as the package manager.

### Core Commands
- `pnpm run start:dev` - Start development server with hot reload
- `pnpm run build` - Build the application
- `pnpm run start:prod` - Start production server
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run test` - Run unit tests
- `pnpm run test:e2e` - Run end-to-end tests
- `pnpm run test:cov` - Run tests with coverage

### Database Commands
- `docker-compose up -d` - Start PostgreSQL, NATS, and MongoDB services
- Database connection details in `src/config/envs.ts`

## Architecture Overview

### Framework & Stack
- **NestJS** - Node.js framework with TypeScript
- **TypeORM** - Database ORM with PostgreSQL
- **JWT Authentication** - with refresh tokens
- **AWS S3** - File storage service
- **AWS SES** - Email service
- **NATS** - Message broker for microservices
- **MongoDB** - For chatbot functionality

### Project Structure

#### Core Modules
- `auth/` - Authentication, password reset, role-based access
- `user/` - User management and roles
- `project/` - Project, stage, block, and lot management
- `lead/` - Lead management, sources, and visitor tracking
- `dashboard/` - Analytics and reporting dashboard

#### Business Modules
- `admin-sales/` - Sales management, clients, financing, reservations
- `admin-payments/` - Payment processing and configurations
- `admin-collections/` - Collection management
- `reports/` - Report generation and analytics
- `chatbot/` - AI chatbot functionality

#### Supporting Modules
- `email/` - Email service integration
- `files/` - AWS S3 file management
- `seed/` - Database seeding
- `external-api/` - External API integrations
- `systems/` - System configuration

### Key Patterns

#### Authentication
Uses JWT strategy with role-based guards:
- `@Public()` decorator for public endpoints
- `@Roles()` decorator for role restrictions
- `@GetUser()` decorator to access current user

#### Database
- TypeORM with automatic entity loading
- Entities use `@CreateDateColumn()` and `@UpdateDateColumn()` for timestamps
- PostgreSQL as primary database

#### Validation
Global ValidationPipe with class-validator DTOs for request validation.

#### Configuration
Environment variables validated with Joi schema in `src/config/envs.ts`.

## Development Notes

### Environment Setup
Copy `.env.example` to `.env` and configure required variables including:
- Database connection
- JWT secrets
- AWS credentials
- NATS server URL
- Frontend URL

### Database
The application uses TypeORM with `synchronize: true` for development. Entities are automatically loaded from all modules.

### File Uploads
Files are stored in AWS S3 with presigned URL generation for secure access.

### Testing
- Unit tests with Jest
- E2E tests in `test/` directory
- Coverage reports available with `test:cov` command
