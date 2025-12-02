# ESTRUCTURA JSON PARA IMPORTACIÓN MASIVA DE VENTAS

**Fecha:** 2025-11-26
**Propósito:** Definir la estructura del JSON resultado de transformar el Excel de ventas

---

## 📋 ESTRATEGIA DE IMPORTACIÓN

### Flujo de Proceso

```
Excel → Script de Transformación → JSON → API de Importación Masiva → Base de Datos
```

### Orden de Creación/Búsqueda

Para cada venta en el JSON:

1. **Project** → Buscar por nombre, crear si no existe
2. **Stage** → Buscar por nombre dentro del proyecto, crear si no existe
3. **Block** → Buscar por nombre dentro de la etapa, crear si no existe
4. **Lot** → Buscar por nombre dentro del bloque, crear o actualizar
5. **Lead (Principal)** → Buscar por documento, crear si no existe
6. **Client (Principal)** → Buscar por leadId, crear si no existe
7. **SecondaryClient** → Buscar por documento, crear si no existe (opcional)
8. **Sale** → Crear siempre (nueva venta)
9. **Financing** → Crear siempre (con la venta)
10. **FinancingInstallments** → Crear todas las cuotas
11. **Payments** → Crear todos los pagos por cuota

---

## 🎯 ESTRUCTURA DEL JSON

### Nivel Raíz

```typescript
{
  "vendorId": "5f3e7c0a-2b8f-4a32-9e5e-3c409ad21bfa", // Usuario vendedor fijo
  "sales": SaleImportDto[] // Array de ventas a importar
}
```

---

## 📦 ESTRUCTURA DE CADA VENTA (SaleImportDto)

```typescript
interface SaleImportDto {
  // ===== IDENTIFICADOR DE VENTA =====
  excelCode: string; // Código del Excel (AP-001, AP-002, etc.)

  // ===== JERARQUÍA DE PROYECTO =====
  project: {
    name: string;           // "Proyecto Apolo"
    currency: "USD" | "PEN"; // Moneda del proyecto
  };

  stage: {
    name: string;           // "I ETAPA"
  };

  block: {
    name: string;           // "M"
  };

  lot: {
    name: string;                   // "7"
    area: number;                   // 120.50
    lotPrice: number;               // 38900.00
    urbanizationPrice: number;      // 0.00
    status: "Vendido";              // Siempre "Vendido"
    currency: "USD" | "PEN";        // Puede ser diferente al proyecto
  };

  // ===== CLIENTE PRINCIPAL =====
  client: {
    lead: {
      firstName: string;                  // "NATALIA ANDREA"
      lastName: string;                   // "CHAVARRIA VELASQUEZ"
      document: string;                   // "001171717"
      documentType: "DNI" | "CE" | "RUC"; // "CE"
      email?: string;                     // null (no está en Excel)
      phone?: string;                     // null (no está en Excel)
      age?: number;                       // null
      interestProjects?: string[];        // [projectId] (proyecto actual)
    };
    address?: string; // null (no está en Excel)
  };

  // ===== CLIENTE SECUNDARIO (OPCIONAL) =====
  secondaryClient?: {
    firstName: string;                  // "JUAN CARLOS"
    lastName: string;                   // "PEREZ GOMEZ"
    document: string;                   // "12345678"
    documentType: "DNI" | "CE" | "RUC"; // "DNI"
    email?: string;                     // null
    phone?: string;                     // null
    address?: string;                   // null
  };

  // ===== VENTA =====
  sale: {
    saleType: "FINANCING";              // Siempre FINANCING (hay cuotas)
    contractDate: string;               // "2023-07-15" (ISO format)
    totalAmount: number;                // 32000.00
    totalAmountUrbanDevelopment: number; // 0.00 (no hay HU en Excel)
    applyLateFee: boolean;              // true si alguna cuota tiene mora > 0
    metadata?: Record<string, any>;     // Datos adicionales del Excel
    notes?: string;                     // Observaciones si las hay
  };

  // ===== FINANCIAMIENTO =====
  financing: {
    financingType: "INTERNAL";          // Asumir interno
    initialAmount: number;              // Suma de todas las cuotas 0
    interestRate?: number;              // null (no está en Excel)
    quantityCoutes: number;             // 24 (número de cuotas)
    installments: FinancingInstallmentDto[]; // Array de cuotas
  };

  // ===== PAGOS POR CUOTA =====
  payments: PaymentByCuoteDto[]; // Pagos agrupados por cuota
}
```

---

## 💵 ESTRUCTURA DE CUOTA (FinancingInstallmentDto)

```typescript
interface FinancingInstallmentDto {
  couteNumber: number;              // 0, 1, 2, ..., 24
  couteAmount: number;              // 1084.00
  expectedPaymentDate: string;      // "2023-08-15" (ISO format)
  lateFeeAmount: number;            // 0.00 (mora calculada)
  observation?: string;             // Texto del Excel (campo DETALLE) - SOLO para cuota 0

  // Calculados automáticamente al crear pagos:
  // coutePaid: suma de todos los pagos
  // coutePending: couteAmount - coutePaid
  // status: PAID | PARTIALLY_PAID | OVERDUE | PENDING
}
```

---

## 💳 ESTRUCTURA DE PAGOS POR CUOTA (PaymentByCuoteDto)

```typescript
interface PaymentByCuoteDto {
  couteNumber: number;  // A qué cuota pertenecen estos pagos

  paymentConfigId: number; // ID según tipo:
                           // - 4: FINANCING_INSTALLMENTS_PAYMENT (cuotas normales)
                           // - 3: FINANCING_PAYMENT (cuota 0 - inicial)
                           // - 1: SALE_PAYMENT (pago al contado - si aplica)

  paymentDetails: PaymentDetailDto[]; // Array de abonos
}
```

---

## 📝 ESTRUCTURA DE DETALLE DE PAGO (PaymentDetailDto)

```typescript
interface PaymentDetailDto {
  // === DATOS DEL PAGO ===
  bankName?: string;                // null (no está en Excel)
  transactionReference: string;     // "1730" (número de operación)
  transactionDate: string;          // "2023-07-20" (ISO format)
  amount: number;                   // 3000.00

  // === VOUCHER (OBLIGATORIO) ===
  // Usar voucher genérico de migración para todos los pagos
  url: string;                      // URL del voucher en Firebase
  urlKey: string;                   // Clave del archivo (path en Firebase)

  // === METADATA (OPCIONAL) ===
  // Guardar información de la boleta si existe
  metadata?: {
    ticketType?: string;            // "BV" (Boleta de Venta)
    ticketNumber?: string;          // "BT01-15242"
    ticketDate?: string;            // "2023-07-20"
    ticketDetail?: string;          // Detalle de la boleta
  };
}
```

**⚠️ IMPORTANTE: VOUCHER DE MIGRACIÓN**

Para la importación masiva, **TODOS los pagos deben tener un voucher**.

Usar el voucher genérico de migración:
```typescript
{
  url: "https://firebasestorage.googleapis.com/v0/b/test-project-3657a.appspot.com/o/huertas%2Fvoucher-migracion.png?alt=media&token=3fa1f499-cb83-41cb-92e4-441ebe529824",
  urlKey: "huertas/voucher-migracion.png"
}
```

---

## 🔍 REGLAS DE NEGOCIO IMPORTANTES

### 1. Cuota 0 (Clasificación por campo DETALLE/observation)

- **Puede haber múltiples filas con cuota 0 en el Excel**
- **Cada cuota 0 debe incluir el campo `observation`** con el texto del campo DETALLE del Excel
- **Clasificación automática basada en el texto:**
  - Si `observation` contiene **"SEPARACION"** o **"SEPARACIÓN"** → Es un pago de **RESERVA**
    - Se suma a `Sale.reservationAmount`
    - Se crea Payment con `relatedEntityType = 'reservation'` y `relatedEntityId = sale.id`
  - Si `observation` contiene **"CANCELACION"**, **"CANCELACIÓN"** o **"CUOTA INICIAL"** → Es un pago de **INICIAL**
    - Se suma a `Financing.initialAmount`
    - Se crea Payment con `relatedEntityType = 'financing'` y `relatedEntityId = financing.id`
  - Si no tiene `observation` o no coincide → Se asume como **INICIAL** por defecto

**Ejemplo:**
```json
"installments": [
  {
    "couteNumber": 0,
    "couteAmount": 2000.00,
    "expectedPaymentDate": "2023-07-15",
    "lateFeeAmount": 0,
    "observation": "SEPARACION POR LOTE M7"  // → RESERVA
  },
  {
    "couteNumber": 0,
    "couteAmount": 1000.00,
    "expectedPaymentDate": "2023-07-20",
    "lateFeeAmount": 0,
    "observation": "SEPARACION ADICIONAL"  // → RESERVA
  },
  {
    "couteNumber": 0,
    "couteAmount": 3000.00,
    "expectedPaymentDate": "2023-07-25",
    "lateFeeAmount": 0,
    "observation": "CANCELACION CUOTA INICIAL"  // → INICIAL
  }
]
```

**Resultado:**
- `Sale.reservationAmount = 3000` (2000 + 1000)
- `Financing.initialAmount = 3000`

### 2. Montos y Símbolos

- **Limpiar símbolos:** `"$8,660.00"` → `8660.00`
- **Detectar moneda:**
  - `$` → USD
  - `S/` → PEN
- **Si no hay símbolo:** Usar moneda del proyecto

### 3. Separación de Nombres

```javascript
// Ejemplo: "NATALIA ANDREA CHAVARRIA VELASQUEZ"
// firstName: "NATALIA ANDREA"
// lastName: "CHAVARRIA VELASQUEZ"

function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) {
    return {
      firstName: parts[0] || '',
      lastName: parts[1] || ''
    };
  }
  const firstName = parts.slice(0, 2).join(' ');
  const lastName = parts.slice(2).join(' ');
  return { firstName, lastName };
}
```

### 4. Fechas Excel

```javascript
// Convertir serial de Excel a Date
function excelSerialToDate(serial) {
  const excelEpoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const milliseconds = days * 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + milliseconds);
}
```

### 5. Estado de Venta

- **Calcular al final de procesar todos los pagos:**
  - Si todas las cuotas están 100% pagadas → Estado final de venta
  - Si hay cuotas pendientes → Venta en proceso de pago

### 6. PaymentConfig según Tipo de Cuota

| Tipo de Pago | ID | Nombre | Cuándo Usar |
|--------------|----|----|-------------|
| Pago de Cuota | 4 | FINANCING_INSTALLMENTS_PAYMENT | Cuotas 1, 2, 3... N |
| Pago Inicial | 3 | FINANCING_PAYMENT | Cuota 0 |
| Pago al Contado | 1 | SALE_PAYMENT | Venta sin financiamiento (no aplica aquí) |

---

## 📊 EJEMPLO SIMPLIFICADO DE JSON

```json
{
  "vendorId": "5f3e7c0a-2b8f-4a32-9e5e-3c409ad21bfa",
  "sales": [
    {
      "excelCode": "AP-001",
      "project": {
        "name": "Proyecto Apolo",
        "currency": "USD"
      },
      "stage": {
        "name": "I ETAPA"
      },
      "block": {
        "name": "M"
      },
      "lot": {
        "name": "7",
        "area": 120.50,
        "lotPrice": 38900.00,
        "urbanizationPrice": 0.00,
        "status": "Vendido",
        "currency": "USD"
      },
      "client": {
        "lead": {
          "firstName": "NATALIA ANDREA",
          "lastName": "CHAVARRIA VELASQUEZ",
          "document": "001171717",
          "documentType": "CE",
          "interestProjects": []
        }
      },
      "sale": {
        "saleType": "FINANCING",
        "contractDate": "2023-07-15",
        "totalAmount": 32000.00,
        "totalAmountUrbanDevelopment": 0.00,
        "applyLateFee": false
      },
      "financing": {
        "financingType": "INTERNAL",
        "initialAmount": 6000.00,
        "quantityCoutes": 24,
        "installments": [
          {
            "couteNumber": 0,
            "couteAmount": 3000.00,
            "expectedPaymentDate": "2023-07-10",
            "lateFeeAmount": 0.00,
            "observation": "SEPARACION LOTE M7"
          },
          {
            "couteNumber": 0,
            "couteAmount": 3000.00,
            "expectedPaymentDate": "2023-07-15",
            "lateFeeAmount": 0.00,
            "observation": "CANCELACION CUOTA INICIAL"
          },
          {
            "couteNumber": 1,
            "couteAmount": 1084.00,
            "expectedPaymentDate": "2023-08-15",
            "lateFeeAmount": 0.00
          }
          // ... más cuotas
        ]
      },
      "payments": [
        {
          "couteNumber": 0,
          "paymentConfigId": 3,
          "paymentDetails": [
            {
              "transactionReference": "1730",
              "transactionDate": "2023-07-20",
              "amount": 3000.00,
              "url": "https://firebasestorage.googleapis.com/v0/b/test-project-3657a.appspot.com/o/huertas%2Fvoucher-migracion.png?alt=media&token=3fa1f499-cb83-41cb-92e4-441ebe529824",
              "urlKey": "huertas/voucher-migracion.png",
              "metadata": {
                "ticketType": "BV",
                "ticketNumber": "BT01-15242",
                "ticketDate": "2023-07-20"
              }
            },
            {
              "transactionReference": "1731",
              "transactionDate": "2023-07-22",
              "amount": 3000.00,
              "url": "https://firebasestorage.googleapis.com/v0/b/test-project-3657a.appspot.com/o/huertas%2Fvoucher-migracion.png?alt=media&token=3fa1f499-cb83-41cb-92e4-441ebe529824",
              "urlKey": "huertas/voucher-migracion.png"
            }
          ]
        },
        {
          "couteNumber": 1,
          "paymentConfigId": 4,
          "paymentDetails": [
            {
              "transactionReference": "1750",
              "transactionDate": "2023-08-15",
              "amount": 1084.00,
              "url": "https://firebasestorage.googleapis.com/v0/b/test-project-3657a.appspot.com/o/huertas%2Fvoucher-migracion.png?alt=media&token=3fa1f499-cb83-41cb-92e4-441ebe529824",
              "urlKey": "huertas/voucher-migracion.png"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🚀 SIGUIENTE PASO

Una vez generado el JSON, crear un endpoint en el backend:

```typescript
POST /sales/bulk-import
Body: { JSON con la estructura definida }
```

Este endpoint debe:
1. Validar el JSON
2. Procesar cada venta en orden
3. Crear/buscar proyectos, etapas, bloques, lotes
4. Crear/buscar leads y clientes
5. Crear ventas con financiamiento y cuotas
6. Crear pagos y detalles de pago **con URLs de vouchers** (no archivos físicos)
7. Actualizar estados de cuotas y ventas
8. Retornar resumen de importación

---

## ⚠️ DIFERENCIA CON API ACTUAL

**API Actual (`POST /sales/payments/sale/:id`):**
- Recibe archivos físicos (multipart/form-data)
- Sube archivos a AWS S3
- Usa `fileIndex` para mapear archivos con detalles de pago

**API de Importación Masiva (`POST /sales/bulk-import`):**
- Recibe JSON con URLs de vouchers predefinidas
- **NO sube archivos** (usa URL de Firebase directamente)
- Guarda `url` y `urlKey` directamente en PaymentDetails
- Todos los pagos usan el mismo voucher genérico de migración

**Razón:** Los datos históricos del Excel no tienen vouchers físicos. Usamos un voucher genérico para marcar que son pagos migrados del sistema anterior.

---

## ✅ VALIDACIONES NECESARIAS

- Documento único por lead
- Documento único por secondary client
- Un lote solo puede tener una venta activa
- Los pagos deben sumar correctamente con las cuotas
- Las fechas deben ser válidas
- Los montos deben ser positivos
- El vendor debe existir en la BD

---

**FIN DEL DOCUMENTO**
