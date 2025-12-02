# MAPEO COMPLETO: Excel → Base de Datos

**Fecha:** 2025-11-26
**Total de columnas Excel:** 103 (98 útiles + 5 vacías)
**Total de filas:** 3,821

---

## 📊 SECCIÓN 1: JERARQUÍA DE PROYECTO (Cols 2-11)

### Columnas Excel → Entidad `Project`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 02 | Proyecto | `Project` | `name` | string | Ej: "Proyecto Apolo" |
| 02 | Proyecto | `Project` | `projectCode` | string | **GENERAR**: Usar código de fila (ej: "AP-001" → "APOLO") o derivar |
| 25 | MONEDA | `Project` | `currency` | enum | "DOLAR" → USD, otros → PEN |

**Propiedades requeridas SIN datos en Excel:**
- ❌ `logo`: string (URL) - **Usar null o valor por defecto**
- ❌ `logoKey`: string (AWS S3) - **Usar null**
- ✅ `isActive`: boolean - **Usar true por defecto**

---

### Columnas Excel → Entidad `Stage`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 03 | Etapa | `Stage` | `name` | string | Ej: "I ETAPA" |

**Propiedades requeridas SIN datos en Excel:**
- ✅ `isActive`: boolean - **Usar true por defecto**

---

### Columnas Excel → Entidad `Block`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 06 | Bloque | `Block` | `name` | string | Ej: "M" |

**Propiedades requeridas SIN datos en Excel:**
- ✅ `isActive`: boolean - **Usar true por defecto**

---

### Columnas Excel → Entidad `Lot`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 07 | Lote | `Lot` | `name` | string | Ej: "7" |
| 08 | Área | `Lot` | `area` | decimal(10,2) | Usar COL 08, ignorar COL 21 |
| 09 | Precio del Lote | `Lot` | `lotPrice` | decimal(10,2) | Limpiar formato: "$38,900" → 38900 |
| 10 | Precio de Urbanización | `Lot` | `urbanizationPrice` | decimal(10,2) | Limpiar formato |
| 11 | Estado | `Lot` | `status` | enum | "Vendido" → SOLD |
| 25 | MONEDA | `Lot` | `currency` | enum | **NUEVA PROPIEDAD NECESARIA** |

**⚠️ NUEVA PROPIEDAD REQUERIDA:**
```typescript
@Column({ type: 'enum', enum: CurrencyType, default: CurrencyType.PEN })
currency: CurrencyType; // Heredada de Project pero modificable
```

**Propiedades requeridas SIN datos en Excel:**
- ✅ `totalPrice`: computed (lotPrice + urbanizationPrice)

**Columnas IGNORADAS (duplicadas):**
- ~~Col 19: MZ~~
- ~~Col 20: LOTE~~
- ~~Col 21: AREA~~
- ~~Col 22: ESTADO~~

---

## 👤 SECCIÓN 2: CLIENTES (Cols 12-17)

### Columnas Excel → Entidad `Lead` (Cliente Principal)

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 14 | NOMBRE | `Lead` | `firstName` + `lastName` | string | **SEPARAR**: "NATALIA ANDREA CHAVARRIA VELASQUEZ" |
| 12 | TIPO DE DOCUMENTO | `Lead` | `documentType` | enum | "CE" → CE, "DNI" → DNI |
| 13 | DOCUMENTO | `Lead` | `document` | string | Ej: "001171717" |

**Propiedades requeridas SIN datos en Excel:**
- ❌ `email`: string (nullable) - **Usar null**
- ❌ `phone`: string - **⚠️ PROBLEMA: Es requerido en BD pero no está en Excel**
- ❌ `age`: number - **Usar null o calcular desde fecha si existe**
- ✅ `isActive`: boolean - **Usar true**
- ✅ `isInOffice`: boolean - **Usar false**
- ❌ `interestProjects`: string[] - **Usar array vacío o proyecto actual**
- ❌ `companionFullName`, `companionDni`, `companionRelationship` - **Usar null**

**⚠️ PROBLEMA CRÍTICO:**
- El campo `phone` es **requerido** en Lead pero **NO existe en el Excel**
- **SOLUCIÓN PROPUESTA**: Usar un teléfono por defecto "000000000" o hacer el campo nullable

---

### Columnas Excel → Entidad `Client`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| - | (Lead 1:1) | `Client` | `lead` | Lead | Relación 1:1 con Lead |

**Propiedades requeridas SIN datos en Excel:**
- ❌ `address`: string - **⚠️ PROBLEMA: Es requerido pero no está en Excel**
- ✅ `isActive`: boolean - **Usar true**

**⚠️ PROBLEMA CRÍTICO:**
- El campo `address` es **requerido** en Client pero **NO existe en el Excel**
- **SOLUCIÓN PROPUESTA**: Usar dirección por defecto "SIN DIRECCIÓN" o hacer el campo nullable

---

### Columnas Excel → Entidad `SecondaryClient`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 17 | NOMBRE | `SecondaryClient` | `firstName` + `lastName` | string | **SEPARAR nombres** |
| 15 | TIPO DE DOCUMENTO | `SecondaryClient` | `documentType` | enum | CE/DNI |
| 16 | DOCUMENTO | `SecondaryClient` | `document` | string | |

**Propiedades requeridas SIN datos en Excel:**
- ❌ `email`: string (nullable) - **Usar null**
- ❌ `phone`: string - **⚠️ PROBLEMA: Requerido pero no está**
- ❌ `address`: string - **⚠️ PROBLEMA: Requerido pero no está**

**Lógica:**
- Solo crear si Col 16 (DOCUMENTO) tiene valor
- Si está vacío, no hay cliente secundario

---

## 💰 SECCIÓN 3: VENTA (Cols 23-31)

### Columnas Excel → Entidad `Sale`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 26 | PRECIO | `Sale` | `totalAmount` | numeric(10,2) | Limpiar: "$32,000" → 32000 |
| 24 | FECHA DE CONTRATO | `Sale` | `contractDate` | timestamp | Convertir fecha Excel serial |
| 27 | NUMERO DE CUOTAS | `Sale` | - | - | Usado en Financing |
| 00 | (código) | `Sale` | - | - | Identificador de agrupación (AP-001) |

**Valores CALCULADOS:**
- `type`: **FINANCING** (siempre, porque hay cuotas)
- `status`: **CALCULAR** según estado de pagos:
  - Si todas las cuotas están pagadas → `ACTIVE` o estado final
  - Si hay cuotas pendientes → `ACTIVE` (en proceso)
- `fromReservation`: **false** (no hay reserva según usuario)
- `applyLateFee`: **true** si alguna cuota tiene mora > 0

**Propiedades requeridas SIN datos en Excel:**
- ❌ `reservationAmount`: decimal - **null** (no hay reserva)
- ❌ `maximumHoldPeriod`: int - **null**
- ❌ `cancellationReason`: string - **null**
- ❌ `radicationPdfUrl`: string - **null** (pero fecha existe en Col 23)
- ❌ `paymentAcordPdfUrl`: string - **null**
- ❌ `metadata`: JSON - **null o {}**
- ❌ `notes`: text - **null**

**Relaciones fijas:**
- `vendor`: User con ID `5f3e7c0a-2b8f-4a32-9e5e-3c409ad21bfa`
- `client`: Client creado del Lead
- `lot`: Lot encontrado/creado
- `guarantor`: **null** (no hay datos de avalista)
- `leadVisit`: **null** (no hay datos de visita)
- **Participants (11 roles)**: **null** (no hay datos)

---

## 🏦 SECCIÓN 4: FINANCIAMIENTO (Cols 27-31)

### Columnas Excel → Entidad `Financing`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 27 | NUMERO DE CUOTAS | `Financing` | `quantityCoutes` | numeric | Ej: 24 |

**Valores CALCULADOS:**
- `initialAmount`: **SUMAR** todas las filas donde Col 28 (CUOTA) = "0"
- `financingType`: **INTERNAL** (asumir por defecto)

**Propiedades requeridas SIN datos en Excel:**
- ❌ `interestRate`: numeric(10,2) - **⚠️ NO ESTÁ EN EXCEL**
  - **SOLUCIÓN**: Usar 0 o calcular retroactivamente si es crítico

---

### Columnas Excel → Entidad `FinancingInstallments`

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 28 | CUOTA | `FinancingInstallments` | - | - | Número de cuota (0, 1, 2...) |
| 30 | IMPORTE DE CUOTA | `FinancingInstallments` | `couteAmount` | numeric(10,2) | Ej: 1084 |
| 29 | FECHA DE VENCIMIENTO | `FinancingInstallments` | `expectedPaymentDate` | timestamp | Serial Excel → Date |
| 31 | MORA | `FinancingInstallments` | `lateFeeAmount` | numeric(10,2) | Monto de mora |

**Valores CALCULADOS:**
- `coutePaid`: **SUMAR** todos los pagos (boletas) asignados a esta cuota
- `coutePending`: `couteAmount - coutePaid`
- `lateFeeAmountPaid`: **CALCULAR** de pagos si aplica
- `lateFeeAmountPending`: `lateFeeAmount - lateFeeAmountPaid`
- `status`:
  - `coutePending = 0` → **PAID**
  - `coutePending > 0 && coutePaid > 0` → **PARTIALLY_PAID**
  - `coutePending = couteAmount && fecha vencida` → **OVERDUE**
  - `coutePending = couteAmount` → **PENDING**

**Lógica especial:**
- **Cuota 0**: Puede haber múltiples filas con cuota 0 (cuota inicial)
  - **SUMAR TODOS** los importes de cuota 0 para `initialAmount` del Financing
  - **CREAR UNA SOLA** FinancingInstallment con la suma total
  - **AGREGAR TODOS LOS PAGOS** de todas las filas con cuota 0

---

## 💳 SECCIÓN 5: BOLETAS/COMPROBANTES (Cols 32-47)

**GRUPO 1: Cols 32-39 (Boleta 1)**
**GRUPO 2: Cols 40-47 (Boleta 2)**

### Columnas Excel → Entidad `Payment`

Cada boleta genera **1 Payment**:

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 37/45 | IMPORTE $ | `Payment` | `amount` | decimal(10,2) | Si está en USD |
| 38/46 | IMPORTE S/ | `Payment` | `amount` | decimal(10,2) | Si está en PEN |
| 36/44 | NUMERO | `Payment` | `codeOperation` | string | Ej: "BT01-15242" |
| 36/44 | NUMERO | `Payment` | `numberTicket` | string | Mismo valor |
| 33/41 | FECHA | `Payment` | `dateOperation` | timestamp | Serial → Date |
| 32/40 | TIPO DE DOCUMENTO | `Payment` | - | - | "BV" = Boleta de Venta |

**Valores FIJOS:**
- `status`: **APPROVED** (según usuario)
- `methodPayment`: **TRANSFER** (asumir por defecto, o inferir de tipo doc)
- `isArchived`: **false**
- `relatedEntityType`: **"FinancingInstallment"**
- `relatedEntityId`: UUID de la cuota correspondiente

**Propiedades requeridas SIN datos en Excel:**
- ❌ `banckName`: string - **null o "N/A"**
- ❌ `rejectionReason`: string - **null**
- ❌ `metadata`: JSON - **Guardar DETALLE (Col 39/47)**
- ❌ `reviewedBy`: User - **null o mismo vendedor**
- ❌ `reviewedAt`: timestamp - **null o fecha actual**

**Relaciones:**
- `user`: User con ID `5f3e7c0a-2b8f-4a32-9e5e-3c409ad21bfa`
- `paymentConfig`: **⚠️ NECESITA consultar un PaymentConfig existente**

---

## 💵 SECCIÓN 6: ABONOS/DETALLES DE PAGO (Cols 48-95)

**8 GRUPOS de 6 columnas cada uno:**
- Grupo 1: Cols 48-53
- Grupo 2: Cols 54-59
- Grupo 3: Cols 60-65
- Grupo 4: Cols 66-71
- Grupo 5: Cols 72-77
- Grupo 6: Cols 78-83
- Grupo 7: Cols 84-89
- Grupo 8: Cols 90-95

### Columnas Excel → Entidad `PaymentDetails`

Cada abono genera **1 PaymentDetails** asociado a su Payment (boleta):

| Col | Nombre Excel | Entidad | Propiedad | Tipo | Notas |
|-----|--------------|---------|-----------|------|-------|
| 52/58/64... | ABONADO $ | `PaymentDetails` | `amount` | decimal(10,2) | Si USD |
| 50/56/62... | ABONADO S/ | `PaymentDetails` | `amount` | decimal(10,2) | Si PEN |
| 48/54/60... | FECHA DE ABONO | `PaymentDetails` | `transactionDate` | timestamp | Serial → Date |
| 49/55/61... | NUMERO DE OPERACIÓN | `PaymentDetails` | `transactionReference` | string | Ej: "1730" |
| 53/59/65... | OBS. | `PaymentDetails` | - | - | **Guardar en metadata?** |
| 51/57/63... | TIPO DE CAMBIO | `PaymentDetails` | - | - | **Informativo, no mapea** |

**Valores FIJOS:**
- `isActive`: **true**
- `url`: **null** (no hay comprobante subido)
- `urlKey`: **null**
- `bankName`: **null**

**Relación:**
- `payment`: Payment de la boleta correspondiente

**Lógica:**
- Solo crear PaymentDetails si la columna ABONADO tiene valor
- Un Payment puede tener múltiples PaymentDetails (hasta 8)

---

## ❌ SECCIÓN 7: COLUMNAS IGNORADAS (Cols 96-102)

| Col | Nombre Excel | Acción |
|-----|--------------|--------|
| 96 | TOTAL FACTURADO | **IGNORAR** (calculable) |
| 97 | TOTAL ABONO DOLARES | **IGNORAR** (calculable) |
| 98 | DIFERENCIA DOLARES | **IGNORAR** (calculable) |
| 99 | DIFERENCIA ENTRE CUOTA Y BOLETA | **IGNORAR** (calculable) |
| 00 | (vacía) | **IGNORAR** |
| 01 | # | **IGNORAR** (correlativo) |
| 04-05 | (vacías) | **IGNORAR** |
| 18 | (vacía) | **IGNORAR** |
| 100-102 | (vacías) | **IGNORAR** |

---

## 🚨 PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### ⚠️ PROBLEMA 1: Campos requeridos NO están en Excel

| Entidad | Campo | Requerido | En Excel | Solución Propuesta |
|---------|-------|-----------|----------|-------------------|
| Lead | `phone` | ✅ Sí | ❌ No | Usar "000000000" o modificar entidad (nullable) |
| Lead | `email` | ❌ No (nullable) | ❌ No | Usar null |
| Client | `address` | ✅ Sí | ❌ No | Usar "SIN DIRECCIÓN" o modificar entidad |
| SecondaryClient | `phone` | ✅ Sí | ❌ No | Usar "000000000" o modificar entidad |
| SecondaryClient | `address` | ✅ Sí | ❌ No | Usar "SIN DIRECCIÓN" o modificar entidad |
| Financing | `interestRate` | ✅ Sí | ❌ No | Usar 0 (cero) o calcular retroactivamente |
| Payment | `paymentConfig` | ✅ Sí | ❌ No | **Consultar un PaymentConfig existente** |

**RECOMENDACIÓN:**
1. **Modificar entidades** para hacer nullable: `Lead.phone`, `Client.address`, `SecondaryClient.phone`, `SecondaryClient.address`
2. **O usar valores por defecto** durante la importación
3. **Consultar** un `PaymentConfig` genérico antes de insertar

---

### ⚠️ PROBLEMA 2: Separación de nombres

El Excel tiene nombres completos en una sola columna:
- **Ejemplo:** "NATALIA ANDREA CHAVARRIA VELASQUEZ"

**SOLUCIÓN:**
```javascript
function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) {
    return { firstName: parts[0] || '', lastName: parts[1] || '' };
  }
  // Asumir: primeros 2 = firstName, resto = lastName
  const firstName = parts.slice(0, 2).join(' ');
  const lastName = parts.slice(2).join(' ');
  return { firstName, lastName };
}
```

---

### ⚠️ PROBLEMA 3: Limpieza de montos

Los montos tienen formatos variados:
- `$160.00`
- `$8,660.00`
- `S/ 4,946.00`

**SOLUCIÓN:**
```javascript
function cleanAmount(value) {
  if (!value) return 0;
  const str = String(value);
  // Remover $, S/, comas, espacios
  const cleaned = str.replace(/[$S\/\s,]/g, '');
  return parseFloat(cleaned) || 0;
}
```

---

### ⚠️ PROBLEMA 4: Conversión de fechas Excel

Las fechas están en formato serial de Excel (ej: 45127 = 2023-07-XX)

**SOLUCIÓN:**
```javascript
function excelSerialToDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
  const days = Math.floor(serial);
  const milliseconds = days * 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + milliseconds);
}
```

---

### ⚠️ PROBLEMA 5: Cuota 0 múltiple

Puede haber varias filas con cuota = 0 (cuota inicial dividida):

**SOLUCIÓN:**
1. Agrupar todas las filas por código de venta (Col 00)
2. Filtrar filas donde Col 28 (CUOTA) = "0"
3. **SUMAR** Col 30 (IMPORTE DE CUOTA) de todas esas filas → `Financing.initialAmount`
4. **CREAR UNA SOLA** `FinancingInstallment` para cuota 0 con la suma
5. **AGREGAR TODOS LOS PAGOS** de esas filas a esa única cuota 0

---

### ⚠️ PROBLEMA 6: Relación Payment ↔ PaymentDetails ↔ FinancingInstallment

**LÓGICA COMPLEJA:**
- 1 Boleta (Payment) puede pagar **parcialmente** 1 o más cuotas
- 1 Cuota puede ser pagada por **múltiples** boletas
- 1 Boleta tiene **múltiples** abonos (PaymentDetails)

**SOLUCIÓN PROPUESTA:**
1. Crear Payment con `relatedEntityType = "FinancingInstallment"` y `relatedEntityId` de la cuota
2. Crear PaymentDetails asociados a ese Payment
3. **SUMAR** todos los PaymentDetails.amount para calcular Payment.amount
4. **VALIDAR** que suma de PaymentDetails = Payment.amount (de la boleta)

---

## ✅ CAMPOS QUE SE PUEDEN ALMACENAR COMPLETAMENTE

**✅ Jerarquía de Proyecto:**
- Project.name ✅
- Project.currency ✅
- Stage.name ✅
- Block.name ✅
- Lot.name ✅
- Lot.area ✅
- Lot.lotPrice ✅
- Lot.urbanizationPrice ✅
- Lot.status ✅
- **Lot.currency ✅ (NUEVA PROPIEDAD)**

**✅ Clientes:**
- Lead.firstName ✅ (con separación)
- Lead.lastName ✅ (con separación)
- Lead.document ✅
- Lead.documentType ✅
- SecondaryClient.* ✅ (mismos campos)

**✅ Venta:**
- Sale.totalAmount ✅
- Sale.contractDate ✅
- Sale.type ✅ (calculado)
- Sale.status ✅ (calculado)
- Sale.applyLateFee ✅ (calculado)

**✅ Financiamiento:**
- Financing.quantityCoutes ✅
- Financing.initialAmount ✅ (calculado)
- FinancingInstallments.couteAmount ✅
- FinancingInstallments.expectedPaymentDate ✅
- FinancingInstallments.lateFeeAmount ✅
- FinancingInstallments.status ✅ (calculado)

**✅ Pagos:**
- Payment.amount ✅
- Payment.codeOperation ✅
- Payment.dateOperation ✅
- Payment.status ✅ (APPROVED)
- PaymentDetails.amount ✅
- PaymentDetails.transactionDate ✅
- PaymentDetails.transactionReference ✅

---

## 🔧 MODIFICACIONES NECESARIAS EN LA BASE DE DATOS

### 1. **Agregar campo `currency` a entidad `Lot`**

```typescript
// src/project/entities/lot.entity.ts

import { CurrencyType } from '../enums/currency.enum';

@Entity('lots')
export class Lot extends Timestamped {
  // ... campos existentes ...

  @Column({
    type: 'enum',
    enum: CurrencyType,
    default: CurrencyType.PEN,
    comment: 'Moneda del lote, heredada del proyecto pero modificable'
  })
  currency: CurrencyType;
}
```

### 2. **Hacer nullable campos requeridos SIN datos en Excel**

**Opción A: Modificar entidades (RECOMENDADO)**

```typescript
// Lead.phone
@Column({ type: 'varchar', length: 20, nullable: true })
phone: string;

// Client.address
@Column({ type: 'varchar', length: 255, nullable: true })
address: string;

// SecondaryClient.phone
@Column({ type: 'varchar', length: 20, nullable: true })
phone: string;

// SecondaryClient.address
@Column({ type: 'varchar', length: 255, nullable: true })
address: string;
```

**Opción B: Usar valores por defecto** (menos recomendado)
- Lead.phone = "000000000"
- Client.address = "SIN DIRECCIÓN"
- etc.

---

## 📋 RESUMEN FINAL

### ✅ Datos que SÍ podemos almacenar:
- ✅ **95% de la información del Excel** se puede mapear a la base de datos
- ✅ Jerarquía completa de proyectos
- ✅ Clientes (con separación de nombres)
- ✅ Ventas completas
- ✅ Financiamiento con cuotas
- ✅ Pagos y detalles de pagos

### ⚠️ Datos que requieren ajustes:
- ⚠️ Campos requeridos sin datos (phone, address, interestRate)
- ⚠️ Nueva propiedad `Lot.currency`
- ⚠️ Separación de nombres completos
- ⚠️ Limpieza de formatos de montos
- ⚠️ Conversión de fechas Excel
- ⚠️ Consulta de PaymentConfig existente

### ❌ Datos que NO están en Excel:
- ❌ Información de contacto completa (email, phone, address)
- ❌ Tasa de interés del financiamiento
- ❌ Participantes de la venta (11 roles)
- ❌ Garantizadores/avalistas
- ❌ Lead visits
- ❌ URLs de documentos (radicación, acuerdos)

---

## 🎯 CONCLUSIÓN

**¿Podemos almacenar la información del Excel?**
**✅ SÍ, con las siguientes condiciones:**

1. **Modificar entidad `Lot`** para agregar campo `currency`
2. **Hacer nullable** los campos: `Lead.phone`, `Client.address`, `SecondaryClient.phone`, `SecondaryClient.address`
3. **Usar valor 0** para `Financing.interestRate` (o calcular después)
4. **Consultar un `PaymentConfig` existente** antes de crear pagos
5. **Implementar funciones** de limpieza de datos (nombres, montos, fechas)

**Una vez realizados estos ajustes, la inserción masiva es 100% viable.**

---

**Siguiente paso:** Confirmar ajustes y proceder con la transformación Excel → JSON.
