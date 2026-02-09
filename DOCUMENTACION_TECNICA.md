a# 📋 DOCUMENTACIÓN TÉCNICA - EDIFIKA
## Sistema de Administración de Condominios

---

## 🎯 PROPÓSITO Y ALCANCE DEL SISTEMA

**EDIFIKA** es una plataforma web completa para la administración integral de condominios, edificios y conjuntos residenciales. El sistema gestiona todos los aspectos administrativos, financieros y operativos de una propiedad horizontal, desde la gestión de unidades y residentes hasta la contabilidad completa, generación de cargos, control de pagos y egresos.

### Objetivo Principal
Automatizar y digitalizar todos los procesos administrativos de un condominio, eliminando el uso de hojas de cálculo, documentos físicos y procesos manuales propensos a errores.

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico

#### Frontend
- **Framework**: Next.js 16.0.3 (App Router)
- **Lenguaje**: TypeScript 5
- **UI**: React 19.2.0
- **Estilos**: Tailwind CSS 3.4.17
- **Iconos**: Lucide React
- **Validación de Formularios**: Zod 4.1.12

#### Backend
- **Base de Datos**: PostgreSQL (Supabase)
- **ORM/Query Builder**: Supabase Client (PostgREST)
- **Autenticación**: Supabase Auth
- **Storage**: Supabase Storage (para PDFs y archivos)
- **Server Actions**: Next.js Server Actions (marcadas con `"use server"`)

#### Generación de Documentos
- **PDFs**: Puppeteer 24.31.0 (headless browser)
- **Renderizado HTML**: React DOM Server (`renderToStaticMarkup`)
- **Códigos de Barras**: jsbarcode 3.12.1
- **QR Codes**: qrcode 1.5.4

#### Infraestructura
- **Hosting**: Supabase (PostgreSQL + Storage + Auth)
- **Deployment**: Next.js (Vercel o similar)
- **Variables de Entorno**: `.env.local` para configuración

---

## 📊 ESTRUCTURA DE DATOS (MODELO DE DOMINIO)

### Entidades Principales

#### 1. **Condominiums** (Condominios)
- **Propósito**: Entidad raíz del sistema. Cada instancia representa un condominio completo.
- **Campos Clave**:
  - `id` (UUID): Identificador único
  - `name`: Nombre del condominio
  - `fiscal_id` (RUC): Identificación fiscal
  - `address`, `phone`: Información de contacto
  - `logo_url`: URL del logo del condominio
  - `active_budget_master_id`: Presupuesto activo
  - `use_blocks`: Si usa torres/etapas
  - `developer_profile_id`: Perfil del desarrollador (si aplica)

#### 2. **Units** (Unidades)
- **Propósito**: Representa cada unidad habitacional (departamento, casa, local, etc.)
- **Campos Clave**:
  - `id`, `condominium_id`
  - `identifier`: Número/identificador (ej: "101", "A-5")
  - `block_identifier`: Torre/etapa (opcional)
  - `full_identifier`: Identificador completo generado ("Torre A – Departamento 101")
  - `type`: Tipo (departamento, casa, parqueadero, bodega, local, oficina)
  - `aliquot`: Porcentaje de alícuota (0-100)
  - `area`: Área en m²
  - `status`: "activa" | "inactiva"
  - `parent_unit_id`: Para parqueaderos/bodegas asignados a una unidad

#### 3. **Profiles** (Perfiles de Personas)
- **Propósito**: Información de todas las personas (propietarios, inquilinos, proveedores, empleados)
- **Campos Clave**:
  - `id` (UUID)
  - `full_name`, `first_name`, `last_name`
  - `national_id`: Cédula/Pasaporte
  - `email`, `phone`, `address`
  - `contact_preference`: Preferencia de contacto

#### 4. **Unit_Contacts** (Relación Unidad-Persona)
- **Propósito**: Vincula personas con unidades, definiendo su rol y relación temporal
- **Campos Clave**:
  - `unit_id`, `profile_id`
  - `relationship_type`: "OWNER" | "TENANT" | "DEVELOPER"
  - `is_primary_contact`: Si es el pagador principal
  - `is_current_occupant`: Si actualmente ocupa la unidad
  - `receives_debt_emails`: Si recibe notificaciones de deuda
  - `start_date`, `end_date`: Período de la relación
  - `ownership_share`: Porcentaje de propiedad (0-100)

#### 5. **Expense_Items** (Rubros)
- **Propósito**: Categorías de ingresos y gastos (Expensas, Mantenimiento, Agua, etc.)
- **Campos Clave**:
  - `id`, `condominium_id`
  - `name`: Nombre del rubro
  - `category`: Categoría (gasto/ingreso)
  - `is_income`: Si es rubro de ingreso
  - `classification`: "ordinario" | "extraordinario"
  - `is_active`: Si está activo

#### 6. **Charges** (Cargos a Unidades)
- **Propósito**: Representa un cargo generado a una unidad (expensa, multa, etc.)
- **Campos Clave**:
  - `id`, `condominium_id`, `unit_id`
  - `expense_item_id`: Rubro asociado
  - `period`: Período (formato "YYYY-MM")
  - `posted_date`, `due_date`: Fechas de emisión y vencimiento
  - `total_amount`: Monto total del cargo
  - `paid_amount`: Monto pagado
  - `balance`: Saldo pendiente (`total_amount - paid_amount`)
  - `status`: "pendiente" | "pagado" | "cancelado"
  - `charge_type`: "ordinaria" | "extraordinaria" | "otro"
  - `description`: Descripción del cargo
  - `batch_id`: Si fue generado en lote

#### 7. **Payments** (Ingresos/Recibos)
- **Propósito**: Registra pagos recibidos de unidades (pagos de expensas, etc.)
- **Campos Clave**:
  - `id`, `condominium_id`, `unit_id`
  - `financial_account_id`: Cuenta donde se depositó
  - `payment_date`: Fecha del pago
  - `total_amount`: Monto total recibido
  - `allocated_amount`: Monto asignado a cargos
  - `payment_method`: Método (transferencia, efectivo, cheque, etc.)
  - `reference_number`: Número de referencia/cheque
  - `folio_rec`: Número de recibo (secuencial)
  - `status`: "disponible" | "cancelado"
  - `payer_profile_id`: Quién pagó

#### 8. **Payment_Allocations** (Asignación de Pagos a Cargos)
- **Propósito**: Vincula pagos con cargos específicos (aplicación de pago)
- **Campos Clave**:
  - `payment_id`, `charge_id`
  - `amount_allocated`: Monto aplicado a ese cargo

#### 9. **Payable_Orders** (Órdenes de Pago / Cuentas por Pagar)
- **Propósito**: Facturas/órdenes de compra recibidas de proveedores
- **Campos Clave**:
  - `id`, `condominium_id`, `supplier_id`
  - `expense_item_id`: Rubro de gasto
  - `invoice_number`: Número de factura
  - `issue_date`, `due_date`: Fechas
  - `total_amount`: Monto total
  - `paid_amount`: Monto pagado
  - `balance`: Saldo pendiente
  - `status`: "pendiente_pago" | "parcialmente_pagado" | "pagado" | "anulado"
  - `folio_op`: Número de orden de pago (opcional)

#### 10. **Egresses** (Egresos)
- **Propósito**: Pagos realizados a proveedores (egresos de dinero)
- **Campos Clave**:
  - `id`, `condominium_id`, `supplier_id`
  - `financial_account_id`: Cuenta desde donde se pagó
  - `payment_date`: Fecha del pago
  - `total_amount`: Monto pagado
  - `total_allocated_amount`: Monto asignado a OP
  - `payment_method`: Método de pago
  - `reference_number`: Referencia/cheque
  - `folio_eg`: Número de egreso (secuencial)
  - `status`: "disponible" | "cancelado"

#### 11. **Egress_Allocations** (Asignación de Egresos a OP)
- **Propósito**: Vincula egresos con órdenes de pago pagadas
- **Campos Clave**:
  - `egress_id`, `payable_order_id`
  - `amount_allocated`: Monto aplicado a esa OP

#### 12. **Financial_Accounts** (Cuentas Bancarias)
- **Propósito**: Cuentas bancarias y cajas del condominio
- **Campos Clave**:
  - `id`, `condominium_id`
  - `bank_name`, `account_number`
  - `account_type`: "corriente" | "ahorros" | "caja_chica"
  - `initial_balance`: Saldo inicial
  - `current_balance`: Saldo actual (se actualiza con movimientos)
  - `uses_checks`: Si maneja cheques

#### 13. **Checks** (Cheques)
- **Propósito**: Control de cheques emitidos
- **Campos Clave**:
  - `id`, `financial_account_id`
  - `checkbook_id`: Talonario al que pertenece
  - `check_number`: Número del cheque
  - `status`: "disponible" | "usado" | "anulado" | "perdido"
  - `egress_id`: Egreso asociado (si fue usado)
  - `issue_date`: Fecha de emisión

#### 14. **Budgets_Master** (Presupuestos Maestros)
- **Propósito**: Presupuestos anuales del condominio
- **Campos Clave**:
  - `id`, `condominium_id`
  - `name`, `year`
  - `total_annual_amount`: Monto anual total
  - `distribution_method`: "por_aliquota" | "igualitario" | "manual_por_unidad"
  - `budget_type`: "global" | "detallado"
  - `status`: "borrador" | "activo" | "cerrado"

#### 15. **Budgets** (Líneas de Presupuesto)
- **Propósito**: Detalle del presupuesto por rubro y período
- **Campos Clave**:
  - `budget_master_id`, `expense_item_id`
  - `period`: "YYYY-MM"
  - `amount`: Monto para ese período

#### 16. **Folio_Counters** (Contadores de Folios)
- **Propósito**: Mantiene contadores secuenciales para numeración
- **Campos Clave**:
  - `condominium_id`
  - `current_folio_rec`: Último folio de recibo usado
  - `current_folio_eg`: Último folio de egreso usado
  - `current_folio_op`: Último folio de orden de pago usado
  - `initial_folio_rec`, `initial_folio_eg`, `initial_folio_op`: Valores iniciales

---

## 🔄 FLUJOS DE TRABAJO PRINCIPALES

### 1. FLUJO DE CARGOS Y PAGOS (Ciclo de Cobranza)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CONFIGURACIÓN INICIAL                                     │
│    - Crear unidades con alícuotas                            │
│    - Crear rubros (expensas, mantenimiento, etc.)            │
│    - Configurar presupuesto anual                            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. GENERACIÓN DE CARGOS (Charges)                           │
│                                                              │
│    A) Expensas Mensuales (Automático por Presupuesto):     │
│       - Seleccionar rubro (ej: "Expensas Mensuales")       │
│       - Seleccionar período (ej: "2024-01")                │
│       - Sistema calcula monto según presupuesto activo      │
│       - Distribuye entre unidades:                          │
│         • Por alícuota: total × (aliquot_unidad / total_aliquot)
│         • Igualitario: total / número_unidades              │
│       - Crea batch de cargos                                │
│       - Genera un Charge por unidad                          │
│                                                              │
│    B) Cargos Individuales (Manual):                          │
│       - Seleccionar unidad                                   │
│       - Seleccionar rubro                                   │
│       - Ingresar monto, fechas, descripción                 │
│       - Crea un Charge individual                           │
│                                                              │
│    Estado inicial: status="pendiente", balance=total_amount │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. REGISTRO DE PAGOS (Payments)                              │
│                                                              │
│    A) Pago con Aplicación a Cargos:                          │
│       - Seleccionar unidad                                   │
│       - Sistema carga cargos pendientes de esa unidad       │
│       - Usuario selecciona cargos a pagar                    │
│       - Ingresa monto total (puede incluir sobrepago)        │
│       - Sistema reserva folio_rec (función SQL)              │
│       - Crea Payment con status="disponible"                │
│       - Crea Payment_Allocations (vínculo pago-cargo)       │
│       - Actualiza Charge:                                    │
│         • paid_amount += amount_allocated                    │
│         • balance = total_amount - paid_amount               │
│         • status = "pagado" si balance=0, else "pendiente"  │
│       - Actualiza Financial_Account:                         │
│         • current_balance += total_amount                    │
│                                                              │
│    B) Pago Directo (Sin aplicar a cargos):                  │
│       - Similar pero sin allocations                         │
│       - Se registra como ingreso genérico                    │
│                                                              │
│    C) Generación de PDF de Recibo:                          │
│       - Ruta: /api/payments/[paymentId]/receipt             │
│       - Lee logo EDIFIKA desde public/logos/ (Base64)        │
│       - Obtiene datos del condominio                         │
│       - Renderiza React template a HTML                      │
│       - Puppeteer genera PDF                                 │
│       - Guarda PDF en Supabase Storage                       │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ANULACIÓN DE PAGOS (Opcional)                             │
│    - Función SQL: cancel_payment()                           │
│    - Revierte allocations                                    │
│    - Restaura balances de cargos                             │
│    - Resta monto de cuenta financiera                        │
│    - Marca payment como status="cancelado"                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. FLUJO DE CUENTAS POR PAGAR Y EGRESOS

```
┌─────────────────────────────────────────────────────────────┐
│ 1. REGISTRO DE ORDEN DE PAGO (Payable_Order)                │
│    - Ingresar factura de proveedor                           │
│    - Datos: proveedor, rubro, monto, fechas, número factura  │
│    - Estado inicial: status="pendiente_pago"                │
│    - paid_amount=0, balance=total_amount                     │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PAGO DE ORDEN DE PAGO (Egress)                            │
│                                                              │
│    A) Seleccionar OP a pagar:                                │
│       - Filtrar por proveedor                                │
│       - Ver OP pendientes/parcialmente pagadas               │
│       - Seleccionar una o varias OP del mismo proveedor     │
│                                                              │
│    B) Registrar Pago:                                        │
│       - Seleccionar cuenta bancaria                          │
│       - Ingresar método de pago, fecha, referencia          │
│       - Si es cheque: seleccionar número de cheque          │
│       - Sistema reserva folio_eg (función SQL)              │
│       - Crea Egress con status="disponible"                 │
│       - Crea Egress_Allocations (vínculo egreso-OP)         │
│       - Actualiza Payable_Order:                            │
│         • paid_amount += amount_allocated                    │
│         • status = "pagado" | "parcialmente_pagado"         │
│       - Actualiza Financial_Account:                         │
│         • current_balance -= total_amount                    │
│                                                              │
│    C) Generación de PDF de Egreso:                            │
│       - Similar a recibo de pago                             │
│       - Incluye información del proveedor                    │
│       - Lista OP pagadas con ese egreso                     │
└─────────────────────────────────────────────────────────────┘
```

### 3. FLUJO DE PRESUPUESTO Y DISTRIBUCIÓN

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREACIÓN DE PRESUPUESTO                                   │
│    - Definir año y nombre                                    │
│    - Elegir tipo: "global" o "detallado"                     │
│    - Elegir método de distribución:                          │
│      • por_aliquota: Según % de alícuota                     │
│      • igualitario: Todos pagan igual                        │
│      • manual_por_unidad: Montos personalizados             │
│    - Ingresar monto anual total (o por rubro si detallado)   │
│    - Guardar como "borrador"                                │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ACTIVACIÓN DE PRESUPUESTO                                 │
│    - Cambiar status a "activo"                               │
│    - Se asocia al condominio (active_budget_master_id)       │
│    - Sistema calcula monto mensual: total_annual / 12        │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GENERACIÓN DE EXPENSAS MENSUALES                          │
│    - Al generar cargos con rubro "Expensas":                 │
│      • Sistema busca presupuesto activo                      │
│      • Si es detallado: busca monto en budgets[period]       │
│      • Si es global: usa total_annual / 12                    │
│      • Aplica distribución según método                      │
│      • Crea cargos para todas las unidades activas           │
└─────────────────────────────────────────────────────────────┘
```

### 4. FLUJO DE CONCILIACIÓN BANCARIA (Actual - Pendiente de Revisión)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CONFIGURACIÓN DE CONCILIACIÓN                             │
│    - Seleccionar cuenta bancaria                             │
│    - Definir período (fecha inicio - fecha fin)              │
│    - Ingresar saldo real del banco                           │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CARGA DE MOVIMIENTOS                                      │
│    - Sistema carga Payments del período                     │
│    - Sistema carga Egresses del período                      │
│    - Calcula saldo inicial (initial_balance + movimientos anteriores)
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SELECCIÓN DE MOVIMIENTOS                                  │
│    - Usuario marca checkboxes de pagos seleccionados        │
│    - Usuario marca checkboxes de egresos seleccionados      │
│    - Para egresos con cheque:                                │
│      • Checkbox adicional "Cheque cobrado"                   │
│      • Si NO está cobrado: NO se resta del saldo             │
│    - Cálculo en tiempo real:                                  │
│      • Saldo calculado = inicial + ingresos - egresos_cobrados
│      • Diferencia = saldo_banco - saldo_calculado            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GUARDADO Y FINALIZACIÓN                                   │
│    - Guarda Reconciliation con items seleccionados          │
│    - Finaliza conciliación (marca como conciliada)           │
│    - Genera PDF con movimientos ordenados por fecha         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 SISTEMA DE AUTENTICACIÓN Y PERMISOS

### Autenticación
- **Proveedor**: Supabase Auth
- **Método**: Email/Password (extensible a OAuth)
- **Sesiones**: Cookies manejadas por `@supabase/ssr`

### Estructura de Usuarios
- **Profiles**: Tabla de perfiles de usuarios
- **Memberships**: Relación muchos-a-muchos entre usuarios y condominios
  - `role`: "ADMIN" | "RESIDENT" | "EMPLOYEE" (extensible)
  - `status`: "activo" | "inactivo"

### Control de Acceso
- **RLS (Row Level Security)**: Políticas en Supabase
- **Server Actions**: Validación de usuario con `getCurrentUser()`
- **Contexto**: Cada acción valida `condominium_id` del usuario

---

## 📁 ESTRUCTURA DE ARCHIVOS DEL PROYECTO

```
src/
├── app/
│   ├── app/[id]/                    # Rutas dinámicas por condominio
│   │   ├── dashboard/               # Dashboard principal
│   │   ├── units/                   # Gestión de unidades
│   │   ├── residents/               # Directorio de residentes
│   │   ├── charges/                 # Generación de cargos
│   │   ├── payments/                # Registro de ingresos
│   │   ├── payables/                # Cuentas por pagar
│   │   ├── egresses/                # Egresos/pagos a proveedores
│   │   ├── reconciliation/          # Conciliación bancaria
│   │   ├── financial-accounts/      # Cuentas bancarias
│   │   ├── budget/                  # Presupuestos
│   │   ├── expense-items/           # Rubros
│   │   ├── suppliers/              # Proveedores
│   │   └── my-condo/               # Configuración del condominio
│   │
│   ├── api/                         # API Routes
│   │   ├── payments/[paymentId]/receipt/  # PDF de recibo
│   │   └── egresses/[id]/pdf/              # PDF de egreso
│   │
│   └── layout.tsx                   # Layout principal
│
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx              # Menú lateral
│   └── ui/
│       └── DatePicker.tsx           # Componente de fecha
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                # Cliente Supabase (server)
│   │   └── client.ts                # Cliente Supabase (client)
│   │
│   ├── auth/
│   │   └── getUser.ts               # Obtener usuario actual
│   │
│   ├── payments/
│   │   └── sql.ts                   # Funciones SQL (reserve_folio_rec, etc.)
│   │
│   ├── charges/
│   │   └── calculations.ts          # Cálculos de distribución
│   │
│   ├── payables/
│   │   └── schemas.ts               # Schemas Zod para validación
│   │
│   ├── reconciliation/
│   │   ├── schemas.ts               # Schemas de conciliación
│   │   └── sql.sql                  # SQL para tablas de conciliación
│   │
│   └── utils.ts                     # Utilidades (formatCurrency, etc.)
│
└── types/
    ├── index.ts                     # Tipos principales
    ├── payments.ts                   # Tipos de pagos
    ├── financial.ts                  # Tipos financieros
    ├── charges.ts                    # Tipos de cargos
    └── reconciliation.ts            # Tipos de conciliación
```

---

## 🔢 SISTEMA DE NUMERACIÓN (FOLIOS)

### Folios de Recibos (folio_rec)
- **Función SQL**: `reserve_folio_rec(condominium_id)`
- **Proceso**:
  1. Bloquea tabla `folio_counters` (LOCK)
  2. Incrementa `current_folio_rec`
  3. Retorna el nuevo número
- **Uso**: Se llama antes de crear un Payment
- **Formato**: Número entero (ej: 1, 2, 3...), se formatea a "0001", "0002" en UI

### Folios de Egresos (folio_eg)
- **Función SQL**: `reserve_folio_eg(condominium_id)`
- **Proceso**: Similar a folio_rec
- **Uso**: Se llama antes de crear un Egress
- **Formato**: Similar a recibos

### Folios de Órdenes de Pago (folio_op)
- **Contador**: `current_folio_op` en `folio_counters`
- **Uso**: Opcional, para numeración de OP
- **Nota**: No se reserva automáticamente, se asigna manualmente si se requiere

---

## 💰 CÁLCULOS FINANCIEROS

### Distribución de Cargos

#### Por Alícuota
```typescript
monto_unidad = total × (aliquot_unidad / sum_aliquot_todas_unidades)
```

#### Igualitario
```typescript
monto_unidad = total / número_unidades_activas
```

### Balance de Cargos
```typescript
balance = total_amount - paid_amount
status = balance === 0 ? "pagado" : "pendiente"
```

### Balance de Cuentas Financieras
```typescript
// Al crear Payment:
current_balance += payment.total_amount

// Al crear Egress:
current_balance -= egress.total_amount

// Al cancelar Payment:
current_balance -= payment.total_amount

// Al cancelar Egress:
current_balance += egress.total_amount
```

### Saldo Inicial de Período (Para Conciliación)
```typescript
saldo_inicial = initial_balance 
  + sum(payments antes del período)
  - sum(egresses antes del período)
```

---

## 📄 GENERACIÓN DE PDFs

### Proceso Técnico

1. **Ruta API**: `/api/payments/[paymentId]/receipt` o `/api/egresses/[id]/pdf`
2. **Datos**:
   - Obtiene datos del pago/egreso desde Supabase
   - Obtiene datos del condominio (nombre, RUC, dirección, teléfono)
   - Lee logo EDIFIKA desde `public/logos/edifika-logo.png` como Base64
3. **Renderizado**:
   - Usa `renderToStaticMarkup` para convertir React a HTML
   - Template React con estilos inline
4. **Generación**:
   - Puppeteer lanza navegador headless
   - Carga HTML renderizado
   - Genera PDF con formato A4
5. **Almacenamiento**:
   - Guarda PDF en Supabase Storage
   - Retorna URL pública o firmada

### Templates de PDF
- **ReceiptTemplate**: Para recibos de pago
- **EgressPdfTemplate**: Para comprobantes de egreso
- Ambos incluyen:
  - Header con datos del condominio
  - Logo EDIFIKA en footer
  - Información detallada del movimiento
  - Tabla de allocations (cargos pagados u OP pagadas)

---

## 🎨 PATRONES DE DISEÑO Y ARQUITECTURA

### 1. Server Actions Pattern
- **Ubicación**: `src/app/app/[id]/{module}/actions.ts`
- **Marcado**: `"use server"` al inicio del archivo
- **Propósito**: Lógica del servidor ejecutada desde componentes cliente
- **Ventajas**: 
  - No requiere API routes separadas
  - Type-safe end-to-end
  - Revalidación automática de caché

### 2. Schema Validation con Zod
- **Ubicación**: `src/lib/{module}/schemas.ts`
- **Propósito**: Validación de tipos y datos de entrada
- **Uso**: Todas las Server Actions validan input con Zod antes de procesar

### 3. Component Pattern
- **Server Components**: Por defecto en Next.js (páginas)
- **Client Components**: Marcados con `"use client"` (formularios, interacciones)
- **Separación**: Lógica de servidor en `actions.ts`, UI en componentes

### 4. Revalidación de Caché
- **Método**: `revalidatePath()` después de mutaciones
- **Propósito**: Invalidar caché de Next.js para refrescar datos
- **Uso**: Después de crear/actualizar/eliminar registros

### 5. Funciones SQL (PostgreSQL Functions)
- **Ubicación**: Definidas en `src/lib/payments/sql.ts` (como strings)
- **Ejecución**: Se ejecutan en Supabase SQL Editor
- **Propósito**: Operaciones atómicas y transaccionales
- **Ejemplos**:
  - `reserve_folio_rec()`: Reserva folio con LOCK
  - `apply_payment_to_charges()`: Aplica pago a múltiples cargos atómicamente
  - `cancel_payment()`: Anula pago y revierte cambios

---

## 🔍 CARACTERÍSTICAS TÉCNICAS DESTACADAS

### 1. Manejo de Duplicados de Perfiles
- **Problema**: Al crear unidad con dueño rápido, evitar duplicar perfiles
- **Solución**: Buscar por `national_id` o `email` antes de crear
- **Implementación**: En `createUnit()`, `registerNewTenant()`, `registerSale()`

### 2. Gestión de Pagador Principal
- **Lógica**: Solo un `is_primary_contact=true` por unidad
- **Fallback**: Si no hay marcado, mostrar primer dueño (OWNER)
- **Actualización**: Al cambiar pagador, se quita flag a todos y se asigna al nuevo

### 3. Estados de Cargos y Pagos
- **Charges**: `pendiente` → `pagado` (automático cuando balance=0)
- **Payments**: `disponible` → `cancelado` (manual)
- **Payable_Orders**: `pendiente_pago` → `parcialmente_pagado` → `pagado`
- **Egresses**: `disponible` → `cancelado` (manual)

### 4. Cálculo de Saldos en Tiempo Real
- **Balance de Cargos**: `total_amount - paid_amount` (calculado, no almacenado directamente)
- **Balance de Cuentas**: `current_balance` se actualiza con cada movimiento
- **Validación**: No permite pagar más que el saldo disponible

### 5. Sistema de Cheques
- **Talonarios**: `checkbooks` agrupa cheques por rango
- **Estados**: `disponible` → `usado` (al crear egreso) → `anulado`/`perdido`
- **Conciliación**: Cheques "girados pero no cobrados" no se restan del saldo

---

## 🚀 FLUJOS DE USUARIO PRINCIPALES

### Usuario: Administrador de Condominio

#### Configuración Inicial
1. Crear/editar condominio (Mi Condominio)
2. Crear unidades con alícuotas
3. Registrar propietarios/inquilinos
4. Crear rubros (expensas, mantenimiento, etc.)
5. Configurar presupuesto anual
6. Crear cuentas bancarias

#### Operación Mensual
1. **Generar Expensas**:
   - Ir a "Cargos (Cobrar)"
   - Seleccionar rubro "Expensas Mensuales"
   - Seleccionar período (ej: "2024-01")
   - Revisar distribución automática
   - Confirmar y generar batch de cargos

2. **Registrar Pagos**:
   - Ir a "Ingresos (REC)"
   - Seleccionar unidad
   - Ver cargos pendientes
   - Aplicar pago a cargos seleccionados
   - Generar recibo PDF

3. **Pagar Proveedores**:
   - Registrar factura en "Cuentas por Pagar"
   - Ir a "Egresos (EG)"
   - Seleccionar OP a pagar
   - Registrar pago (con cheque si aplica)
   - Generar comprobante PDF

4. **Conciliar Banco**:
   - Ir a "Conciliacion"
   - Seleccionar cuenta y período
   - Ingresar saldo del banco
   - Marcar movimientos que ya aparecen en extracto
   - Verificar diferencia
   - Finalizar conciliación

---

## ⚠️ CONSIDERACIONES TÉCNICAS IMPORTANTES

### 1. Normalización de Datos
- **FormData**: Valores pueden ser `FormDataEntryValue | null`
- **Solución**: Función `normalizeString()` convierte a string seguro
- **Uso**: Antes de validar con Zod

### 2. Mapeo de Campos DB ↔ UI
- **Problema**: Nombres diferentes en DB y formularios
- **Ejemplo**: `ruc` (UI) ↔ `fiscal_id` (DB)
- **Solución**: Mapeo explícito en `getCondominiumInfo()` y `updateCondominiumInfo()`

### 3. Manejo de Imágenes en PDFs
- **Problema**: Rutas relativas no funcionan en Puppeteer
- **Solución**: Leer archivo desde `public/logos/` en servidor, convertir a Base64
- **Implementación**: `fs/promises.readFile()` + `Buffer.toString('base64')`

### 4. Localización
- **Meses**: `toLocaleString("es-ES", { month: "long" })`
- **Fechas**: Formato ISO (YYYY-MM-DD) internamente, formato local en UI
- **Moneda**: Función `formatCurrency()` con formato local

### 5. Validación de Transacciones
- **Atomicidad**: Funciones SQL garantizan transacciones atómicas
- **Validaciones**: 
  - No pagar más que el saldo
  - No aplicar pago a cargo cancelado
  - No pagar OP ya pagada
- **Rollback**: Si falla, toda la operación se revierte

---

## 📊 MÉTRICAS Y REPORTES

### Dashboard Principal
- Unidades activas y con deuda
- Total de residentes (propietarios/inquilinos)
- Deuda pendiente total
- Balance de cuentas
- Ingresos/egresos del mes
- Cargos pendientes

### Cálculos en Tiempo Real
- Saldo por unidad (suma de balances de cargos pendientes)
- Estado de deuda: "al_dia" | "pendiente"
- Monto estimado de expensas (basado en presupuesto activo)

---

## 🔧 CONFIGURACIONES Y PERSONALIZACIONES

### Condominio
- Logo personalizado
- Información fiscal (RUC, dirección, teléfono)
- Tipo de propiedad (urbanización, conjunto, edificio)
- Uso de torres/etapas (blocks)

### Presupuesto
- Método de distribución (alícuota/igualitario/manual)
- Tipo (global/detallado)
- Monto anual o por rubro

### Folios
- Valores iniciales configurables
- Numeración secuencial automática

---

## 🐛 ÁREAS DE MEJORA IDENTIFICADAS

### Conciliación Bancaria (Pendiente de Rehacer)
- **Problema Actual**: Implementación incompleta o con errores
- **Requerimientos**:
  - Selección manual de movimientos
  - Manejo de cheques girados pero no cobrados
  - Cálculo en tiempo real
  - Exportación a PDF ordenada por fecha
  - Fecha de corte para períodos

### Otras Mejoras Potenciales
- Importación de extractos bancarios (CSV/Excel)
- Matching automático de movimientos
- Historial de conciliaciones
- Reportes avanzados
- Notificaciones por email
- Portal de residentes (para ver deudas y pagar)

---

## 📝 NOTAS FINALES

Este sistema está diseñado para ser **robusto, escalable y fácil de mantener**. Utiliza las mejores prácticas de Next.js 16, TypeScript estricto, y una arquitectura clara de separación de responsabilidades.

El código sigue patrones consistentes:
- **Server Actions** para lógica de negocio
- **Schemas Zod** para validación
- **TypeScript** para type safety
- **Componentes React** reutilizables
- **Funciones SQL** para operaciones críticas

La base de datos está normalizada y utiliza relaciones bien definidas, garantizando integridad referencial y consistencia de datos.

---

**Última actualización**: Diciembre 2024
**Versión del sistema**: 0.1.0
