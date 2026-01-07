# Guía de Testing - Módulo de Facturación

## 📋 Requisitos Previos

1. Tener cuenta en Nubefact (crear en https://www.nubefact.com)
2. Obtener credenciales de prueba:
   - `NUBEFACT_BASE_URL`: URL de API de Nubefact
   - `NUBEFACT_TOKEN`: Token de autenticación
3. Configurar variables en `.env`

## 🔑 Códigos Importantes de Nubefact

### Tipos de Documento (documentType)
- `1`: Factura
- `2`: Boleta de Venta
- `3`: Nota de Crédito
- `4`: Nota de Débito

### Tipos de Documento del Cliente (clientDocumentType)
- `0`: DNI (Persona Natural)
- `1`: RUC (Empresa)
- `2`: Carnet de Extranjería
- `3`: Pasaporte
- `4`: Cédula Diplomática
- `5`: Sin Documento

### Moneda (currency)
- `1`: PEN (Soles)
- `2`: USD (Dólares)

### Unidad de Medida (unitOfMeasure)
- `MTR`: Metro Cuadrado (para lotes)
- `ZZ`: Servicio/Unidad (para urbanización, cuotas)
- `NIU`: Unidad

### Tipo de IGV (igvType) - Los más comunes
- `1`: Gravado - Operación Onerosa (18% IGV)
- `11`: Exonerado - Operación Onerosa (0% IGV)
- `13`: Inafecto - Operación Onerosa (0% IGV)
- `21`: Exportación (0% IGV)

### Códigos de Motivo de Nota de Crédito (noteReasonCode)
- `01`: Anulación de la operación
- `02`: Anulación por error en el RUC
- `03`: Corrección por error en la descripción
- `04`: Descuento global
- `05`: Descuento por ítem
- `06`: Devolución total
- `07`: Devolución por ítem
- `08`: Bonificación
- `09`: Disminución en el valor
- `10`: Otros conceptos

### Formatos de PDF (pdfFormat)
- `A4`: Formato A4 estándar
- `A5`: Formato A5 (media carta)
- `ticket`: Formato ticket

## 🧪 Casos de Prueba

### 1. Factura para Empresa - Venta de Lote

**Endpoint**: `POST /invoices`

**Descripción**: Factura con RUC para empresa que compra lote de terreno

**Payload**:
```json
{
  "documentType": 1,
  "series": "F001",
  "number": 1,
  "clientDocumentType": 1,
  "clientDocumentNumber": "20123456789",
  "clientName": "CONSTRUCTORA LOS ANDES SAC",
  "clientAddress": "Av. Industrial 456, Arequipa",
  "clientEmail": "facturacion@constructoralosandes.com",
  "currency": 1,
  "items": [
    {
      "unitOfMeasure": "MTR",
      "code": "LOTE-A-01",
      "description": "Lote A-01 - Proyecto Los Jardines - Área: 120.00 m²",
      "quantity": 120,
      "unitValue": 250,
      "igvType": 1
    },
    {
      "unitOfMeasure": "ZZ",
      "code": "URB-A-01",
      "description": "Habilitación Urbana - Lote A-01",
      "quantity": 1,
      "unitValue": 8000,
      "igvType": 1
    }
  ],
  "observations": "Venta de lote A-01 - Pago inicial del 30%"
}
```

**Cálculos esperados**:
- Lote: 120 m² × S/ 250 = S/ 30,000
- IGV Lote: S/ 30,000 × 18% = S/ 5,400
- Urbanización: S/ 8,000
- IGV Urbanización: S/ 8,000 × 18% = S/ 1,440
- **Total Gravado**: S/ 38,000
- **Total IGV**: S/ 6,840
- **Total**: S/ 44,840

---

### 2. Boleta para Persona Natural

**Endpoint**: `POST /invoices`

**Descripción**: Boleta con DNI para persona natural

**Payload**:
```json
{
  "documentType": 2,
  "series": "B001",
  "number": 1,
  "clientDocumentType": 0,
  "clientDocumentNumber": "43256789",
  "clientName": "JUAN CARLOS RODRIGUEZ MARTINEZ",
  "clientAddress": "Calle Los Pinos 123, Arequipa",
  "clientEmail": "jrodriguez@email.com",
  "currency": 1,
  "items": [
    {
      "unitOfMeasure": "MTR",
      "code": "LOTE-B-15",
      "description": "Lote B-15 - Proyecto Villa Sol - Área: 150.00 m²",
      "quantity": 150,
      "unitValue": 300,
      "igvType": 1
    },
    {
      "unitOfMeasure": "ZZ",
      "code": "URB-B-15",
      "description": "Habilitación Urbana - Lote B-15",
      "quantity": 1,
      "unitValue": 10000,
      "igvType": 1
    }
  ],
  "observations": "Venta lote B-15 - Cuota inicial"
}
```

**Cálculos esperados**:
- Lote: 150 m² × S/ 300 = S/ 45,000
- IGV Lote: S/ 45,000 × 18% = S/ 8,100
- Urbanización: S/ 10,000
- IGV Urbanización: S/ 10,000 × 18% = S/ 1,800
- **Total**: S/ 64,900

---

### 3. Factura por Cuota Mensual

**Endpoint**: `POST /invoices`

**Descripción**: Factura para pago de cuota de financiamiento

**Payload**:
```json
{
  "documentType": 1,
  "series": "F001",
  "number": 2,
  "clientDocumentType": 1,
  "clientDocumentNumber": "20987654321",
  "clientName": "INVERSIONES INMOBILIARIAS DEL SUR EIRL",
  "clientAddress": "Av. Ejercito 789, Arequipa",
  "clientEmail": "contabilidad@inversionesdelsur.com",
  "currency": 1,
  "items": [
    {
      "unitOfMeasure": "ZZ",
      "code": "CUOTA-01",
      "description": "Cuota N° 1 de 24 - Financiamiento Lote C-10",
      "quantity": 1,
      "unitValue": 2500,
      "igvType": 1
    }
  ],
  "sendAutomaticallyToClient": true,
  "observations": "Pago cuota 1/24 - Vencimiento: 15/02/2024"
}
```

**Cálculos esperados**:
- Cuota: S/ 2,500
- IGV: S/ 2,500 × 18% = S/ 450
- **Total**: S/ 2,950

---

### 4. Factura en Dólares

**Endpoint**: `POST /invoices`

**Descripción**: Factura con tipo de cambio para lote premium

**Payload**:
```json
{
  "documentType": 1,
  "series": "F001",
  "number": 3,
  "clientDocumentType": 1,
  "clientDocumentNumber": "20111222333",
  "clientName": "DESARROLLOS URBANOS SAC",
  "clientAddress": "Calle Comercio 321, Arequipa",
  "clientEmail": "ventas@desarrollosurbanos.com",
  "currency": 2,
  "exchangeRate": 3.75,
  "items": [
    {
      "unitOfMeasure": "MTR",
      "code": "LOTE-PREMIUM-01",
      "description": "Lote Premium D-01 - Área: 200.00 m²",
      "quantity": 200,
      "unitValue": 120,
      "igvType": 1
    },
    {
      "unitOfMeasure": "ZZ",
      "code": "URB-PREMIUM-01",
      "description": "Habilitación Urbana Premium",
      "quantity": 1,
      "unitValue": 15000,
      "igvType": 1
    }
  ],
  "observations": "Venta lote premium - Pago contado"
}
```

**Cálculos esperados**:
- Lote: 200 m² × $120 = $24,000
- IGV Lote: $24,000 × 18% = $4,320
- Urbanización: $15,000
- IGV Urbanización: $15,000 × 18% = $2,700
- **Total en USD**: $46,020
- **Total en PEN** (al TC 3.75): S/ 172,575

---

### 5. Nota de Crédito

**Endpoint**: `POST /invoices`

**Descripción**: Nota de crédito por descuento

**Payload**:
```json
{
  "documentType": 3,
  "series": "FC01",
  "number": 1,
  "clientDocumentType": 1,
  "clientDocumentNumber": "20123456789",
  "clientName": "CONSTRUCTORA LOS ANDES SAC",
  "clientAddress": "Av. Industrial 456, Arequipa",
  "clientEmail": "facturacion@constructoralosandes.com",
  "currency": 1,
  "relatedInvoiceId": 1,
  "noteReasonCode": "04",
  "noteReasonDescription": "Descuento por pronto pago",
  "items": [
    {
      "unitOfMeasure": "ZZ",
      "code": "DESC-001",
      "description": "Descuento por pronto pago - Lote A-01",
      "quantity": 1,
      "unitValue": 2000,
      "igvType": 1
    }
  ],
  "observations": "Descuento aplicado por pago adelantado"
}
```

**Nota**: Para crear nota de crédito, primero debe existir la factura relacionada (relatedInvoiceId)

---

### 6. Boleta con Descuento

**Endpoint**: `POST /invoices`

**Descripción**: Boleta con descuento aplicado en el ítem

**Payload**:
```json
{
  "documentType": 2,
  "series": "B001",
  "number": 2,
  "clientDocumentType": 0,
  "clientDocumentNumber": "72345678",
  "clientName": "MARIA ELENA GUTIERREZ FLORES",
  "clientAddress": "Urb. San Antonio Mz. A Lt. 5, Arequipa",
  "clientEmail": "mgutierrez@email.com",
  "currency": 1,
  "items": [
    {
      "unitOfMeasure": "MTR",
      "code": "LOTE-E-08",
      "description": "Lote E-08 - Área: 100.00 m²",
      "quantity": 100,
      "unitValue": 350,
      "discount": 10,
      "igvType": 1
    },
    {
      "unitOfMeasure": "ZZ",
      "code": "URB-E-08",
      "description": "Habilitación Urbana - Lote E-08",
      "quantity": 1,
      "unitValue": 7000,
      "igvType": 1
    }
  ],
  "observations": "Promoción especial - Descuento del 10%"
}
```

**Cálculos esperados**:
- Lote antes de descuento: 100 m² × S/ 350 = S/ 35,000
- Descuento 10%: S/ 3,500
- Lote después de descuento: S/ 31,500
- IGV Lote: S/ 31,500 × 18% = S/ 5,670
- Urbanización: S/ 7,000
- IGV Urbanización: S/ 7,000 × 18% = S/ 1,260
- **Total**: S/ 45,430

---

## 🚀 Flujo de Prueba Completo

### Paso 1: Crear Factura (Borrador)
```bash
POST http://localhost:3000/invoices
Content-Type: application/json
Authorization: Bearer {tu_token_jwt}

{
  "documentType": 1,
  "series": "F001",
  "number": 1,
  ...
}
```

**Respuesta esperada**:
```json
{
  "id": 1,
  "status": "BORRADOR",
  "fullNumber": "F001-1",
  "total": 44840,
  ...
}
```

### Paso 2: Enviar a SUNAT
```bash
POST http://localhost:3000/invoices/1/send-to-sunat
Authorization: Bearer {tu_token_jwt}
```

**Respuesta esperada**:
```json
{
  "id": 1,
  "status": "ACEPTADO",
  "sunatAccepted": "1",
  "pdfUrl": "https://...",
  "xmlUrl": "https://...",
  "cdrUrl": "https://...",
  ...
}
```

### Paso 3: Listar Facturas
```bash
GET http://localhost:3000/invoices
Authorization: Bearer {tu_token_jwt}
```

### Paso 4: Ver Detalle
```bash
GET http://localhost:3000/invoices/1
Authorization: Bearer {tu_token_jwt}
```

---

## ⚠️ Errores Comunes

### Error: "El tipo de documento del cliente no es válido"
- Verificar que `clientDocumentType` sea un número del 0-5
- Para RUC usar `1`, para DNI usar `0`

### Error: "La serie es requerida"
- Facturas: Serie debe comenzar con `F` (ej: F001)
- Boletas: Serie debe comenzar con `B` (ej: B001)
- Notas de Crédito: Serie debe comenzar con `FC` (ej: FC01)
- Notas de Débito: Serie debe comenzar con `FD` (ej: FD01)

### Error: "El tipo de IGV no es válido"
- Verificar que `igvType` esté entre los valores permitidos
- Usar `1` para operaciones gravadas con IGV (más común)

### Error de SUNAT: "RUC no existe"
- En ambiente de pruebas, usar RUCs de prueba proporcionados por Nubefact
- RUC debe tener 11 dígitos para tipo documento `1`

### Error de SUNAT: "DNI no válido"
- DNI debe tener 8 dígitos para tipo documento `0`

---

## 📊 Validaciones del Sistema

El sistema valida automáticamente:
- ✅ Tipos de documento válidos
- ✅ Formato de documentos de identidad
- ✅ Cálculo automático de IGV
- ✅ Cálculo de totales
- ✅ Descuentos aplicados correctamente
- ✅ Unicidad del número de comprobante

---

## 🔍 Debugging

Para ver los datos que se envían a Nubefact, revisar los logs del servidor al hacer `POST /invoices/:id/send-to-sunat`

Los datos se mapean así:
- `clientName` → `cliente_denominacion`
- `clientDocumentNumber` → `cliente_numero_de_documento`
- `documentType` → `tipo_de_comprobante`
- `items[].unitValue` → `items[].valor_unitario`
- etc.

---

## 📝 Notas Importantes

1. **Series**: Cada tipo de documento debe tener su propia serie
2. **Numeración**: El número debe ser correlativo por serie
3. **IGV**: El sistema calcula automáticamente el IGV según el tipo
4. **Totales**: Todos los totales se calculan automáticamente
5. **Estado**: Los documentos se crean en estado BORRADOR y cambian a ENVIADO/ACEPTADO/RECHAZADO al enviar a SUNAT
