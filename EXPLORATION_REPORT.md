# Admin Collections & Admin Payments Module - Comprehensive Exploration Report

## Executive Summary
This report provides thorough documentation of the admin-collections and admin-payments modules, including all entity structures, relationships, endpoints, DTOs, and business logic.

## 1. Core Entities

### Client Entity (src/admin-sales/clients/entities/client.entity.ts)
- id: number (PK)
- lead: Lead (OneToOne)
- collector: User (ManyToOne) - Assigned collector/cobrador
- sales: Sale[] (OneToMany)
- address: varchar(70)
- isActive: boolean

### Payment Entity (src/admin-payments/payments/entities/payment.entity.ts)
- id: number (PK)
- user: User (ManyToOne)
- paymentConfig: PaymentConfig (ManyToOne)
- amount: decimal(10,2)
- status: PENDING|APPROVED|COMPLETED|REJECTED|CANCELLED
- details: PaymentDetails[] (OneToMany)
- relatedEntityType: string
- relatedEntityId: string (UUID)

### PaymentDetails Entity (src/admin-payments/payments/entities/payment-details.entity.ts)
- id: number (PK)
- payment: Payment (ManyToOne)
- amount: decimal(10,2)
- url: varchar(500) - S3 URL
- transactionDate: timestamp

### FinancingInstallments Entity (src/admin-sales/financing/entities/financing-installments.entity.ts)
- id: string (UUID, PK)
- couteAmount: decimal(10,2)
- coutePending: decimal(10,2)
- coutePaid: decimal(10,2)
- expectedPaymentDate: timestamp
- lateFeeAmount: decimal(10,2)
- status: PENDING|EXPIRED|PAID

### Sale Entity (src/admin-sales/sales/entities/sale.entity.ts)
- id: string (UUID, PK)
- client: Client (ManyToOne)
- financing: Financing (OneToOne)
- lot: Lot (ManyToOne)
- totalAmount: decimal(10,2)
- status: StatusSale

## 2. Collections Controller Endpoints (/collections)
1. POST /assign-clients-to-collector [SCO]
2. GET /collectors/list [SCO]
3. GET /clients/list [SCO]
4. GET /clients/list-by-user [COB]
5. GET /sales/list-by-client/:clientId [COB]
6. GET /clients/sales/:saleId [COB, SCO]
7. GET /list/payments [COB, SCO]
8. GET /list/all/payments [SCO]
9. GET /payments/details/:id [COB, SCO]
10. POST /financing/installments/paid/:financingId [COB, SCO]

## 3. Payments Controller Endpoints (/payments)
1. POST /approve/:id [FAC]
2. POST /reject/:id [FAC]
3. GET /list [FAC]
4. GET /details/:id [FAC]
5. PATCH /complete-payment/:id [FAC]

## 4. Key Relationships
- Client → Collector: ManyToOne (one client to one collector)
- Sale → Client: ManyToOne
- Sale → Financing: OneToOne (optional)
- Financing → FinancingInstallments: OneToMany
- Payment → PaymentDetails: OneToMany
- Payment → User: ManyToOne

## 5. Payment Flow
Sale/UrbanDevelopment → Financing → FinancingInstallments
→ Collector records Payment via paidInstallments endpoint
→ Payment with PaymentDetails (vouchers)
→ FAC approves → FAC completes

## 6. Roles
- COB: Cobrador (Collector) - record payments
- SCO: Supervisor de Cobranza - oversee collections
- FAC: Finance/Accounting - approve/complete

## 7. Key DTOs
- AssignClientsToCollectorDto: clientsId[], collectorId
- PaidInstallmentsDto: amountPaid, payments[]
- CreateDetailPaymentDto: bankName?, transactionReference, transactionDate, amount, fileIndex
- ApprovePaymentDto: codeOperation?, banckName?, dateOperation?, numberTicket?

## 8. Enums
- StatusPayment: PENDING|APPROVED|COMPLETED|REJECTED|CANCELLED
- StatusFinancingInstallments: PENDING|EXPIRED|PAID
- FinancingType: CREDITO|DEBITO
- CurrencyType: USD|PEN

## 9. Important Details
- Amounts stored as decimal(10,2)
- Currency defined at Project level
- Late fees tracked separately
- Files uploaded to AWS S3
- Transactions use QueryRunner for atomicity
- Collection entity exists but empty - logic in services

## 10. File Structure Overview
Explored files:
- admin-collections/collections/*
- admin-payments/payments/*
- admin-payments/payments-config/*
- admin-sales/clients/
- admin-sales/financing/
- admin-sales/sales/
- admin-sales/urban-development/

