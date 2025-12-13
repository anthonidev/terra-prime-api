# JSend Response Examples

Este proyecto utiliza el estándar JSend para todas las respuestas de la API **de forma automática**.

## ⚡ Funcionamiento Automático

**NO necesitas** usar `ResponseUtil` manualmente. El sistema convierte automáticamente todas las respuestas al formato JSend:

- ✅ **Respuestas exitosas**: Automáticamente envueltas en `{ status: 'success', data: ... }`
- ✅ **Errores de validación**: Automáticamente convertidos a `fail`
- ✅ **Excepciones**: Automáticamente convertidas a `fail` (4xx) o `error` (5xx)

## Ejemplos de Uso

### 1. Respuesta Simple (Automático)

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    // Simplemente retorna los datos
    return [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
    ];
  }
}
```

**Respuesta automática:**
```json
{
  "status": "success",
  "data": [
    { "id": 1, "name": "John Doe" },
    { "id": 2, "name": "Jane Smith" }
  ]
}
```

### 2. Paginación (Automático)

Para que la paginación funcione automáticamente, **retorna un objeto con `data` y `meta`**:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { PaginationDto } from '@common/dto/pagination.dto';

@Controller('products')
export class ProductsController {
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    const { page = 1, perPage = 10 } = paginationDto;

    const [items, totalItems] = await this.productsService.findAndCount({
      skip: (page - 1) * perPage,
      take: perPage,
    });

    const totalPages = Math.ceil(totalItems / perPage);

    // Retorna un objeto con data y meta
    return {
      data: items,
      meta: {
        page,
        perPage,
        totalItems,
        totalPages,
      },
    };
  }
}
```

**Respuesta automática:**
```json
{
  "status": "success",
  "data": [
    { "id": 1, "name": "Product 1", "price": 99.99 },
    { "id": 2, "name": "Product 2", "price": 149.99 }
  ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

### 3. Validación de DTOs (Automático)

Los errores de validación se convierten automáticamente a formato `fail`:

```typescript
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { Body, Controller, Post } from '@nestjs/common';

export class CreateUserDto {
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    // Si la validación falla, se retorna automáticamente JSend fail
    return this.usersService.create(createUserDto);
  }
}
```

**Si la validación falla, respuesta automática:**
```json
{
  "status": "fail",
  "data": {
    "name": ["name must be longer than or equal to 3 characters"],
    "email": ["email must be an email"],
    "password": ["password must be longer than or equal to 8 characters"]
  }
}
```

### 4. Excepciones (Automático)

Todas las excepciones se convierten automáticamente:

```typescript
import { BadRequestException, Controller, NotFoundException, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      // Lanza la excepción normalmente
      throw new BadRequestException('Invalid credentials');
    }

    return { token: await this.authService.generateToken(user) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }
}
```

**Respuesta automática para errores 4xx (fail):**
```json
{
  "status": "fail",
  "data": {
    "message": "Invalid credentials"
  }
}
```

**Respuesta automática para errores 5xx (error):**
```json
{
  "status": "error",
  "message": "Internal server error",
  "code": 500
}
```

## 🛠️ ResponseUtil (Uso Opcional)

**Solo usa `ResponseUtil` si necesitas control explícito** sobre la estructura de la respuesta:

```typescript
import { ResponseUtil } from '@common/utils/response.util';

@Controller('special')
export class SpecialController {
  @Get()
  customResponse() {
    // Uso explícito de ResponseUtil (opcional)
    return ResponseUtil.success({ message: 'Custom response' });
  }

  @Get('paginated')
  customPagination() {
    // Uso explícito para paginación (opcional)
    return ResponseUtil.successWithPagination(
      items,
      page,
      perPage,
      totalItems,
    );
  }

  @Post('custom-error')
  customError() {
    // Lanzar error con ResponseUtil (opcional, mejor usar excepciones)
    return ResponseUtil.fail({
      customField: ['Custom error message'],
    });
  }
}
```

## 📋 Resumen

| Escenario | Acción | Resultado JSend |
|-----------|--------|-----------------|
| Retornar datos | `return data` | Automático: `{ status: 'success', data }` |
| Retornar `{ data, meta }` | `return { data, meta }` | Automático: `{ status: 'success', data, meta }` |
| Validación DTO | Decoradores class-validator | Automático: `{ status: 'fail', data: errors }` |
| Lanzar BadRequest (4xx) | `throw new BadRequestException()` | Automático: `{ status: 'fail', ... }` |
| Lanzar Error (5xx) | `throw new InternalServerErrorException()` | Automático: `{ status: 'error', ... }` |

## ✨ Ventajas del Sistema Automático

1. **Sin código repetitivo**: No necesitas envolver cada respuesta manualmente
2. **Consistencia garantizada**: Todas las respuestas siguen el mismo formato
3. **Menos errores**: No puedes olvidar aplicar el formato
4. **Código más limpio**: Los controllers solo retornan los datos

## 🎯 Buenas Prácticas

1. **Para respuestas simples**: Solo retorna los datos directamente
2. **Para paginación**: Retorna `{ data: [...], meta: { ... } }`
3. **Para errores**: Lanza excepciones normalmente (BadRequestException, NotFoundException, etc.)
4. **No uses ResponseUtil** a menos que necesites control explícito muy específico
