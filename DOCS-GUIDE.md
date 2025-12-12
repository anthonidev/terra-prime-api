# Guía de uso de la Documentación API

## 🚀 Acceso a la documentación

La documentación interactiva de la API está disponible en:

- **Scalar Docs**: http://localhost:3000/docs

## 🔐 Autenticación con Bearer Token

### Paso 1: Hacer Login

1. Navega a la sección **"Autenticación"** en la documentación
2. Busca el endpoint `POST /api/auth/login`
3. Haz clic en "Try it" o "Probar"
4. Ingresa las credenciales:
   ```json
   {
     "document": "12345678",
     "password": "tu-contraseña"
   }
   ```
5. Haz clic en "Send" o "Enviar"

### Paso 2: Copiar el Access Token

La respuesta incluirá algo como:

```json
{
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**⚠️ Importante**: Copia el valor de `accessToken` (sin las comillas)

### Paso 3: Autorizar en Scalar

1. Busca el botón **"Authorize"** o **"🔐 Autenticar"** en la parte superior de la documentación
2. Haz clic en él
3. Pega el token que copiaste (SIN agregar "Bearer " al inicio)
4. Haz clic en "Authorize" o "Autorizar"
5. Cierra el modal

### Paso 4: ¡Listo!

Ahora todos los endpoints protegidos incluirán automáticamente el token de autenticación. Los endpoints que requieren autenticación están marcados con un ícono de candado 🔒.

## 📝 Endpoints Públicos (No requieren autenticación)

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/password-reset/request` - Solicitar restablecimiento de contraseña
- `POST /api/auth/password-reset/verify/:token` - Verificar token de restablecimiento
- `POST /api/auth/password-reset/reset/:token` - Restablecer contraseña

## 🔒 Endpoints Protegidos (Requieren autenticación)

Todos los demás endpoints requieren que estés autenticado. Verás un icono de candado 🔒 junto a ellos.

### Renovar Token

Si tu `accessToken` expira (después de 24 horas), puedes renovarlo:

1. Usa el endpoint `POST /api/auth/refresh`
2. Envía tu `refreshToken`:
   ```json
   {
     "refreshToken": "tu-refresh-token-aqui"
   }
   ```
3. Obtendrás un nuevo `accessToken` y `refreshToken`
4. Actualiza la autorización con el nuevo token

## 💡 Consejos

- Los tokens de acceso duran **24 horas**
- Los tokens de renovación duran **7 días**
- Siempre cierra sesión de forma segura en producción
- No compartas tus tokens
- Si ves un error 401 "Unauthorized", tu token probablemente expiró

## 🏷️ Organización de Endpoints

La documentación está organizada por módulos:

- **Autenticación**: Login, registro, refresh token
- **Cambio de contraseña**: Cambiar contraseña estando autenticado
- **Restablecimiento de contraseña**: Recuperar contraseña olvidada
- **Users**: Gestión de usuarios
- **Roles**: Gestión de roles y permisos
- **Views**: Gestión de menú/vistas
- **Profile**: Gestión del perfil del usuario autenticado

## 🎨 Características de Scalar

- **Tema Purple**: Interfaz moderna y atractiva
- **Try it**: Prueba todos los endpoints directamente desde el navegador
- **Autocompletado**: Sugerencias mientras escribes
- **Ejemplos**: Cada endpoint muestra ejemplos de request y response
- **Búsqueda**: Busca endpoints rápidamente con Ctrl+K o Cmd+K

## ⚙️ Configuración Técnica

La configuración de seguridad está definida en `src/main.ts`:

```typescript
.addBearerAuth(
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    name: 'JWT',
    description: 'Ingresa el token JWT',
    in: 'header',
  },
  'JWT-auth',
)
```

Todos los endpoints protegidos usan `@ApiBearerAuth('JWT-auth')` en sus decoradores.
