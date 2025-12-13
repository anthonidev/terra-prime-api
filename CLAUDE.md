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

## API Response Format (JSend)

The project follows the **JSend specification** for all API responses **automatically**. Controllers simply return data, and the system handles formatting through global interceptors and filters.

### ⚡ How It Works (Automatic)

**No manual wrapping required** - The system automatically converts all responses:

| Controller Returns | System Outputs |
|-------------------|----------------|
| `return data` | `{ status: 'success', data }` |
| `return { data, meta }` | `{ status: 'success', data, meta }` (pagination) |
| `throw BadRequestException()` | `{ status: 'fail', data: {...} }` |
| `throw InternalServerErrorException()` | `{ status: 'error', message, code }` |
| DTO validation fails | `{ status: 'fail', data: { field: [errors] } }` |

### 📋 Response Types & Structure

#### 1. Success Response
**When:** Request completed successfully
**Structure:**
```json
{
  "status": "success",
  "data": { /* any data */ }
}
```

**Controller code:**
```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return this.usersService.findOne(id);  // Just return the data
}
```

#### 2. Success with Pagination
**When:** Returning paginated results
**Structure:**
```json
{
  "status": "success",
  "data": [ /* array of items */ ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

**Controller code:**
```typescript
@Get()
async findAll(@Query() { page = 1, perPage = 10 }: PaginationDto) {
  const [items, total] = await this.repo.findAndCount({
    skip: (page - 1) * perPage,
    take: perPage,
  });

  // Return this exact format for automatic pagination detection
  return {
    data: items,
    meta: {
      page,
      perPage,
      totalItems: total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}
```

#### 3. Fail Response (Client Errors - 4xx)
**When:** Validation errors, bad input, business logic failures
**Structure:**
```json
{
  "status": "fail",
  "data": {
    "field1": "error message",
    "field2": ["error message 1", "error message 2"]
  }
}
```

**Controller code:**
```typescript
// Example 1: Automatic validation errors from DTOs
@Post()
create(@Body() createUserDto: CreateUserDto) {
  // If DTO validation fails, automatically returns fail format
  return this.usersService.create(createUserDto);
}

// Example 2: Manual business logic validation
@Post('login')
async login(@Body() loginDto: LoginDto) {
  const user = await this.authService.validateUser(loginDto.email, loginDto.password);

  if (!user) {
    throw new BadRequestException('Invalid credentials');  // Auto-converted to fail
  }

  return { token: await this.authService.generateToken(user) };
}
```

#### 4. Error Response (Server Errors - 5xx)
**When:** Unexpected server errors, database failures, external service failures
**Structure:**
```json
{
  "status": "error",
  "message": "Error description",
  "code": 500
}
```

**Controller code:**
```typescript
@Get('reports')
async generateReport() {
  try {
    return await this.reportsService.generate();
  } catch (error) {
    throw new InternalServerErrorException('Failed to generate report');
  }
}
```

### 🎯 Best Practices

**DO:**
- ✅ Return data directly from controllers
- ✅ Return `{ data, meta }` for pagination
- ✅ Throw appropriate HTTP exceptions (BadRequestException, NotFoundException, etc.)
- ✅ Use PaginationDto for consistent pagination params
- ✅ Trust the automatic conversion system

**DON'T:**
- ❌ Manually wrap responses in JSend format (system does it automatically)
- ❌ Use ResponseUtil unless you have a very specific edge case
- ❌ Return custom response structures (use standard format)
- ❌ Mix different response formats across endpoints

### 🔧 Components

**Applied in `main.ts` in this order:**

1. **LoggingInterceptor** (line 20): Logs all requests/responses
2. **JSendResponseInterceptor** (line 23): Wraps successful responses
3. **JSendExceptionFilter** (line 26): Converts exceptions to JSend format

**Available utilities:**

- **PaginationDto** (`@common/dto/pagination.dto.ts`): Query params for pagination
- **ResponseUtil** (`@common/utils/response.util.ts`): Optional manual control (rarely needed)
- **JSend Interfaces** (`@common/interfaces/jsend-response.interface.ts`): TypeScript types

### 📚 Common Scenarios

**Scenario 1: Simple GET endpoint**
```typescript
@Get()
findAll() {
  return this.service.findAll();  // Returns: { status: 'success', data: [...] }
}
```

**Scenario 2: Paginated GET endpoint**
```typescript
@Get()
findAll(@Query() pagination: PaginationDto) {
  const [items, total] = await this.repo.findAndCount({...});
  return {
    data: items,
    meta: {
      page: pagination.page,
      perPage: pagination.perPage,
      totalItems: total,
      totalPages: Math.ceil(total / pagination.perPage)
    }
  };
}
```

**Scenario 3: POST with validation**
```typescript
@Post()
create(@Body() dto: CreateDto) {
  return this.service.create(dto);  // Validation errors auto-converted
}
```

**Scenario 4: Resource not found**
```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  const item = await this.service.findOne(id);
  if (!item) {
    throw new NotFoundException(`Item ${id} not found`);  // Auto: { status: 'fail', ... }
  }
  return item;  // Auto: { status: 'success', data: item }
}
```

**Scenario 5: Multiple validation errors**
```typescript
// DTO with multiple validations
export class CreateUserDto {
  @IsEmail()
  email: string;  // "email must be an email"

  @MinLength(8)
  password: string;  // "password must be longer than or equal to 8 characters"
}

// Auto-converted to:
// {
//   "status": "fail",
//   "data": {
//     "email": ["email must be an email"],
//     "password": ["password must be longer than or equal to 8 characters"]
//   }
// }
```

### 📖 Additional Documentation

For comprehensive examples and detailed use cases, see:
- `src/common/JSEND_EXAMPLES.md` - Detailed examples and edge cases
- `src/common/interfaces/jsend-response.interface.ts` - TypeScript interfaces
- `src/common/interceptors/jsend-response.interceptor.ts` - Implementation details

## HTTP Logging

The application automatically logs all HTTP requests and responses via `LoggingInterceptor`.

### What Gets Logged

**Request Logging:**
- HTTP method and URL
- Client IP and User-Agent
- Query parameters
- Request body (with sensitive fields redacted)

**Response Logging:**
- Status code
- Response time (in milliseconds)
- Response body (in debug mode)

**Error Logging:**
- Error status code
- Error message
- Stack trace (in debug mode)

### Sensitive Data Protection

The following fields are automatically redacted from logs:
- `password`, `passwordConfirm`
- `token`, `accessToken`, `refreshToken`
- `apiKey`, `secret`, `authorization`

These fields will appear as `***REDACTED***` in logs.

### Log Levels

- **LOG**: Request/response basic info (method, URL, status, timing)
- **DEBUG**: Detailed info (query params, bodies, full responses)
- **ERROR**: Error details and stack traces

### Example Log Output

```
[HTTP] 📥 REQUEST GET /api/users?page=1 - IP: ::1 - UA: Mozilla/5.0...
[HTTP] Query Params: {"page":"1"}
[HTTP] 📤 RESPONSE GET /api/users?page=1 - Status: 200 - 45ms
[HTTP] Response: {"status":"success","data":[...],"meta":{...}}
```

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
