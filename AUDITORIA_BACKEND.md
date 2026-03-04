# AUDITORÍA BACKEND — EDIFIKA

**Fecha:** 2026-02-28
**Auditor:** Claude Opus 4.6 (Arquitecto de Software Senior)
**Plataforma:** EDIFIKA — Sistema de Gestión de Condominios
**Stack:** Next.js 16.0.3 · React 19 · TypeScript 5.9 · Supabase (PostgreSQL) · Zod 4

---

## 1. MAPA DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  /src/app/app/[id]/  → Páginas protegidas del dashboard      │
│  /src/components/    → UI reutilizable (Sidebar, TopHeader)  │
└──────────────┬───────────────────────┬──────────────────────┘
               │ Server Actions        │ API Routes
               ▼                       ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│  19 archivos          │  │  19 endpoints en /src/app/api/    │
│  actions.ts           │  │  route.ts (REST handlers)         │
│  (Mutations + Reads)  │  │  (PDFs, exports, uploads, auth)  │
└──────────┬───────────┘  └──────────────┬───────────────────┘
           │                             │
           ▼                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    CAPA DE NEGOCIO                            │
│  /src/lib/                                                    │
│  ├── auth/        → getUser, membership (roles)               │
│  ├── audit/       → logAudit (fire-and-forget)                │
│  ├── cartera/     → getCarteraData (estado de cuenta)         │
│  ├── charges/     → calculations (distribuir, redondear)      │
│  ├── email/       → Resend + templates React Email            │
│  ├── payments/    → schemas Zod + SQL/RPC functions           │
│  ├── payables/    → schemas Zod (órdenes de pago)             │
│  ├── public-links/→ tokens HMAC-SHA256                        │
│  ├── reconciliation/ → schemas Zod                            │
│  └── supabase/    → admin, client, server                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                              │
│  Supabase PostgreSQL + RLS                                    │
│  22 archivos de migración SQL                                │
│  RPC Functions: apply_payment, cancel_payment,                │
│                 reserve_folio, save_budget_atomic              │
│  Tablas principales: condominiums, units, charges,            │
│    payments, egresses, payables, financial_accounts,           │
│    petty_cash_vouchers, audit_logs, billing_snapshots          │
└──────────────────────────────────────────────────────────────┘
```

### Módulos del Sistema (17 módulos funcionales)

| Módulo | Archivos | Complejidad | Estado |
|--------|----------|-------------|--------|
| Pagos (payments) | actions.ts (1137 ln), 4 API routes | Alta | Funcional |
| Cuentas por Pagar (payables) | actions.ts (561 ln), 5 API routes | Alta | Funcional |
| Cargos (charges) | actions.ts (787 ln) | Alta | Funcional |
| Conciliación (reconciliation) | actions.ts (1230 ln), 1 API route | Muy Alta | Funcional |
| Cuentas Financieras | actions.ts (693 ln) | Alta | Funcional |
| Caja Chica (petty cash) | petty-cash-actions.ts (1080 ln) | Muy Alta | Funcional |
| Presupuestos (budget) | actions.ts (619 ln) | Alta | Funcional |
| Unidades (units) | actions.ts (758 ln), 2 API routes | Media | Funcional |
| Residentes (residents) | actions.ts (289 ln), 1 API route | Baja | Funcional |
| Proveedores (suppliers) | actions.ts (347 ln), 1 API route | Baja | Funcional |
| Planes Extraordinarios | actions.ts (597 ln) | Media | Funcional |
| Convenios de Pago | actions.ts (483 ln) | Media | Funcional |
| Créditos (credits) | actions.ts (425 ln) | Media | Funcional |
| Documentos | actions.ts (272 ln), 2 API routes | Baja | Funcional |
| Rubros (expense items) | actions.ts (767 ln) | Media | Funcional |
| Configuración de Facturación | actions.ts (153 ln) | Baja | Funcional |
| Dashboard | actions.ts (178 ln) | Baja | Funcional |

---

## 2. MÓDULO DE TICKETS — HALLAZGO CRÍTICO

### Resultado: NO EXISTE

Tras una búsqueda exhaustiva en todo el codebase:
- **No hay carpeta** `tickets/`, `support/`, `issues/`, `tasks/` ni similar
- **No hay tabla** de tickets en las migraciones SQL
- **No hay tipos** TypeScript para tickets en `/src/types/`
- **No hay rutas** API ni server actions relacionadas

**Recomendación:** Si se planea implementar un módulo de tickets para gestión de tareas/mantenimiento, debe diseñarse desde cero. El sistema actual no contiene remanentes de un sistema de quejas ni código adaptable para este propósito.

---

## 3. MÓDULOS BIEN IMPLEMENTADOS (PROS)

### 3.1 Sistema de Tokens Públicos (`/src/lib/public-links/tokens.ts`)
**Calificación: EXCELENTE**

- Firma HMAC-SHA256 con comparación timing-safe
- Formato URL-safe (base64url sin caracteres problemáticos)
- Expiración configurable (default 30 días)
- Validación robusta contra manipulación de payload y firma
- Patrón null-return para errores (nunca expone detalles)

### 3.2 Validaciones Zod (`/src/lib/payments/schemas.ts`, `payables/schemas.ts`)
**Calificación: MUY BUENO**

- Schemas tipados para todas las operaciones financieras
- Coerción numérica (strings → numbers) para formularios
- UUIDs validados con `.uuid()`
- Enums estrictos para estados y métodos de pago

### 3.3 Audit Logging (`/src/lib/audit/logAudit.ts`)
**Calificación: MUY BUENO**

- Fire-and-forget (nunca bloquea operaciones)
- Captura old/new values para comparación
- Tipos de acción exhaustivos (CREATE, UPDATE, DELETE, ANULACION, CONCILIACION, etc.)
- Auto-detección de usuario si no se provee

### 3.4 Motor de Cálculo de Cargos (`/src/lib/charges/calculations.ts`)
**Calificación: BUENO**

- Distribución igualitaria y por alícuota
- Distribución por consumo (servicios medidos)
- Redondeo a 2 decimales con manejo de EPSILON
- Normalización automática de alícuotas

### 3.5 Middleware de Autenticación (`/src/middleware.ts`)
**Calificación: BUENO**

- Protección de rutas `/app/*`
- Validación de UUID para condominio
- Verificación de membresía activa
- Bypass correcto para superadmin

### 3.6 Templates de Email (`/src/lib/email/templates/PaymentReceiptEmail.tsx`)
**Calificación: EXCELENTE**

- Diseño profesional con React Email
- CSS inline responsive
- Soporte para logo personalizado
- Link de descarga de PDF con URL firmada

### 3.7 Sistema de Caja Chica (petty-cash-actions.ts)
**Calificación: BUENO**

- Gestión completa de períodos (apertura/cierre)
- Vales numerados secuencialmente
- Reposición con transferencia entre cuentas
- Reporte de varianza

---

## 4. MÓDULOS FRÁGILES O MAL ESTRUCTURADOS (CONTRAS)

### 4.1 CRÍTICO: API Routes sin Autenticación ni Autorización

**Severidad: CRÍTICA**
**Archivos afectados:** 15 de 19 API routes

La mayoría de los endpoints API no verifican si el usuario está autenticado. Cualquier persona con la URL puede:

- Generar PDFs de cualquier pago (`/api/payments/[id]/receipt`)
- Exportar CSV de residentes con emails y teléfonos (`/api/residents/export`)
- Exportar CSV de proveedores con datos fiscales (`/api/suppliers/export`)
- Registrar pagos sin autenticación (`/api/payments/register`)
- Subir archivos al storage (`/api/payments/[id]/attachment`)

**Endpoints sin autenticación:**

| Endpoint | Riesgo |
|----------|--------|
| `POST /api/payments/register` | Registro de pagos fraudulentos |
| `GET /api/payments/[id]/receipt` | Exfiltración de datos financieros |
| `POST /api/payments/[id]/send-receipt` | Envío masivo de emails |
| `POST /api/payments/[id]/attachment` | Subida de archivos maliciosos |
| `POST /api/payables/register` | Registro de facturas falsas |
| `POST /api/payables/pay` | Pagos no autorizados |
| `GET /api/payables/[id]/draft` | Lectura de borradores |
| `GET /api/payables/[id]/order` | Lectura de órdenes de pago |
| `PUT /api/payables/[id]/update` | Modificación de facturas |
| `GET /api/egresses/[id]/pdf` | Lectura de egresos |
| `GET /api/reconciliation/[id]/pdf` | Lectura de conciliaciones |
| `GET /api/units/[id]/estado-cuenta/pdf` | Estado de cuenta de cualquier unidad |
| `GET /api/units/export` | Exportación masiva de unidades |
| `GET /api/residents/export` | Exportación de datos personales |
| `GET /api/suppliers/export` | Exportación de datos fiscales |

**Solo 2 endpoints tienen autenticación:** `documents/upload` y `documents/view`.

### 4.2 CRÍTICO: Aritmética de Punto Flotante para Montos Financieros

**Severidad: ALTA**
**Archivos afectados:** payments/actions.ts, reconciliation/actions.ts, egresses/actions.ts

Se usa `Math.abs(difference) >= 0.01` y tolerancias de `0.009` para comparar montos financieros. Esto puede causar errores acumulativos en:

- Conciliaciones bancarias
- Aplicación de pagos parciales
- Cálculo de saldos

```typescript
// PROBLEMA ACTUAL (payments/actions.ts)
if (Math.abs(remaining) < 0.01) {
  status = 'pagado'
}

// PROBLEMA: 0.1 + 0.2 === 0.30000000000000004 en JavaScript
```

### 4.3 ALTO: XSS en Generación de PDFs vía Puppeteer

**Severidad: ALTA**
**Archivo:** `/src/app/api/payables/[id]/draft/route.ts`

Datos de usuario se interpolan directamente en templates HTML sin escapar:

```typescript
// VULNERABLE — payables/[id]/draft/route.ts línea 220
<td>${payable.supplier_snapshot_name}</td>
<td>${payable.invoice_number}</td>
<td>${payable.notes}</td>
```

Si un proveedor se llama `<script>alert('xss')</script>`, ese código se ejecuta en Puppeteer.

### 4.4 ALTO: N+1 Queries en Módulos Críticos

**Severidad: ALTA**
**Archivos afectados:** financial-accounts/actions.ts, reconciliation/actions.ts, units/actions.ts

```typescript
// financial-accounts/actions.ts — 6 queries secuenciales para canDeleteFinancialAccount
const { count: paymentCount } = await supabase.from('payments').select(...)
const { count: egressCount } = await supabase.from('egresses').select(...)
const { count: voucherCount } = await supabase.from('petty_cash_vouchers').select(...)
const { count: replenishmentCount } = await supabase.from('petty_cash_replenishments').select(...)
const { count: reconciliationCount } = await supabase.from('reconciliation_items').select(...)
const { count: checkCount } = await supabase.from('checks').select(...)
```

### 4.5 ALTO: Falta de Suite de Tests

**Severidad: ALTA**

Antes de esta auditoría:
- **0 archivos de test** en el proyecto
- **0 frameworks de testing** instalados
- Ninguna cobertura de código

Se crearon 3 archivos de test con 58 pruebas que cubren:
- Validaciones de documentos ecuatorianos (27 tests)
- Motor de cálculo de cargos (14 tests)
- Sistema de tokens HMAC-SHA256 (17 tests)

### 4.6 MEDIO: Inconsistencia en Patrones de Autorización

Las server actions dependen implícitamente de Supabase RLS sin validación explícita:

```typescript
// PATRÓN ACTUAL — confía en RLS
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('condominium_id', condominiumId) // ← sin verificar que el usuario pertenece a este condominio
```

Las actions no validan que el `condominiumId` del parámetro pertenezca al usuario autenticado.

### 4.7 MEDIO: Generación de Checks Uno por Uno

**Archivo:** financial-accounts/actions.ts líneas 338-352

```typescript
// INEFICIENTE — inserta checks individualmente
for (let i = startNum; i <= endNum; i++) {
  await supabase.from('checks').insert({
    checkbook_id: checkbook.id,
    check_number: i,
    status: 'disponible'
  })
}
```

Para una chequera de 500 cheques, se ejecutan 500 INSERTs individuales.

### 4.8 MEDIO: Credenciales en el Repositorio

**Archivo:** `.env.local`

El archivo `.env.local` contiene credenciales reales:
- `SUPABASE_SERVICE_ROLE_KEY` (acceso admin completo a la base de datos)
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Y no existe un `.env.example` para documentar las variables requeridas.

### 4.9 BAJO: Console.log Excesivos en Producción

**Archivo:** reconciliation/actions.ts

Múltiples `console.log` que exponen información sensible:

```typescript
console.log("Reconciliation items to save:", items.length)
console.log("Creating reconciliation with:", { ... })
```

---

## 5. SUGERENCIAS DE REFACTORIZACIÓN

### 5.1 Middleware de Autenticación para API Routes (PRIORIDAD 1)

Crear un wrapper de autenticación reutilizable:

```typescript
// src/lib/api/withAuth.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: any; supabase: any; params: any }
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: { params: Promise<any> }) => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const params = await context.params
    return handler(request, { user, supabase, params })
  }
}

// Con validación de condominio:
export function withCondoAuth(handler: AuthenticatedHandler) {
  return withAuth(async (request, context) => {
    const condominiumId = request.nextUrl.searchParams.get('condominiumId')
      || context.params?.id

    if (!condominiumId) {
      return NextResponse.json(
        { error: 'Condominio no especificado' },
        { status: 400 }
      )
    }

    // Verificar membresía
    const { data: membership } = await context.supabase
      .from('memberships')
      .select('id, role')
      .eq('profile_id', context.user.id)
      .eq('condominium_id', condominiumId)
      .eq('status', 'activo')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Sin acceso a este condominio' },
        { status: 403 }
      )
    }

    return handler(request, { ...context, membership })
  })
}
```

**Uso en un endpoint existente:**

```typescript
// ANTES (vulnerable):
export async function GET(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  // ... sin verificar usuario
}

// DESPUÉS (seguro):
export const GET = withCondoAuth(async (request, { supabase, params }) => {
  const { paymentId } = params
  // ... usuario ya verificado
})
```

### 5.2 Escapar HTML en Templates de PDF (PRIORIDAD 2)

```typescript
// src/lib/utils/escapeHtml.ts
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Uso en payables/[id]/draft/route.ts:
import { escapeHtml } from '@/lib/utils/escapeHtml'

// ANTES:
`<td>${payable.supplier_snapshot_name}</td>`

// DESPUÉS:
`<td>${escapeHtml(payable.supplier_snapshot_name)}</td>`
```

### 5.3 Batch Insert para Checks (PRIORIDAD 3)

```typescript
// ANTES (N inserts individuales):
for (let i = startNum; i <= endNum; i++) {
  await supabase.from('checks').insert({ ... })
}

// DESPUÉS (1 insert batch):
const checks = Array.from(
  { length: endNum - startNum + 1 },
  (_, i) => ({
    checkbook_id: checkbook.id,
    check_number: startNum + i,
    status: 'disponible' as const,
  })
)

const { error } = await supabase.from('checks').insert(checks)
```

### 5.4 RPC para canDeleteFinancialAccount (PRIORIDAD 3)

Reemplazar 6 queries separadas con una sola función RPC:

```sql
-- sql/018_can_delete_account.sql
CREATE OR REPLACE FUNCTION can_delete_financial_account(p_account_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'payment_count', (SELECT count(*) FROM payments WHERE financial_account_id = p_account_id AND status != 'anulado'),
    'egress_count', (SELECT count(*) FROM egresses WHERE financial_account_id = p_account_id AND status != 'anulado'),
    'voucher_count', (SELECT count(*) FROM petty_cash_vouchers WHERE financial_account_id = p_account_id),
    'replenishment_count', (SELECT count(*) FROM petty_cash_replenishments WHERE financial_account_id = p_account_id),
    'reconciliation_count', (SELECT count(*) FROM reconciliation_items WHERE financial_account_id = p_account_id),
    'check_count', (SELECT count(*) FROM checks WHERE checkbook_id IN (SELECT id FROM checkbooks WHERE financial_account_id = p_account_id) AND status = 'usado')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.5 Crear .env.example (PRIORIDAD 2)

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

RESEND_API_KEY=re_your_api_key
FROM_EMAIL=notificaciones@tudominio.com
FROM_NAME=EDIFIKA

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Opcional: Secret dedicado para firmar links públicos
# Si no se configura, se usa SUPABASE_SERVICE_ROLE_KEY
# LINK_SIGNING_SECRET=your-signing-secret
```

### 5.6 Montos Financieros con Integers (centavos) (PRIORIDAD 2)

```typescript
// src/lib/utils/money.ts
/** Convierte dólares a centavos para almacenamiento */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/** Convierte centavos a dólares para display */
export function toDollars(cents: number): number {
  return cents / 100
}

/** Compara montos financieros sin errores de punto flotante */
export function amountsEqual(a: number, b: number): boolean {
  return toCents(a) === toCents(b)
}

/** Verifica si un monto está completamente pagado */
export function isFullyPaid(paid: number, total: number): boolean {
  return toCents(paid) >= toCents(total)
}
```

---

## 6. RESULTADOS DE PRUEBAS

### Suite Creada y Ejecutada: 58/58 PASARON

```
✓ src/__tests__/validations.test.ts    (27 tests)  49ms
✓ src/__tests__/calculations.test.ts   (14 tests)  49ms
✓ src/__tests__/tokens.test.ts         (17 tests)  90ms

Test Files   3 passed (3)
Tests        58 passed (58)
Duration     5.29s
```

**Cobertura de las pruebas:**

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| validations.test.ts | 27 | Cédula, RUC, pasaporte, rangos numéricos, campos requeridos |
| calculations.test.ts | 14 | Distribución igualitaria, por alícuota, por consumo, redondeo, edge cases |
| tokens.test.ts | 17 | Generación HMAC, validación, expiración, manipulación, ciclo completo |

### Tests Pendientes (Recomendados)

Se necesitan pruebas adicionales para:
1. **payments/actions.ts** — Flujo completo de registro y anulación de pagos
2. **reconciliation/actions.ts** — Conciliación bancaria con items de ingreso/egreso
3. **charges/actions.ts** — Generación de cargos masivos por lote
4. **payables/actions.ts** — Ciclo de vida de orden de pago
5. **petty-cash-actions.ts** — Períodos, vales y reposición

---

## 7. RESUMEN EJECUTIVO

### Calificación General: 7/10

| Categoría | Nota | Comentario |
|-----------|------|-----------|
| Estructura de carpetas | 9/10 | Clara separación de concerns |
| Tipado TypeScript | 9/10 | Tipos exhaustivos y bien modelados |
| Validación de inputs | 8/10 | Zod bien utilizado en server actions |
| Seguridad API routes | 2/10 | 15 de 19 endpoints sin autenticación |
| Seguridad server actions | 6/10 | Dependen de RLS sin verificación explícita |
| Performance | 5/10 | N+1 queries, inserts individuales |
| Cobertura de tests | 2/10 | No existían antes de esta auditoría |
| Manejo de errores | 7/10 | Consistente pero con gaps en async |
| Lógica financiera | 6/10 | Funcional pero con riesgos de punto flotante |
| Audit trail | 8/10 | Buena implementación fire-and-forget |

### Top 5 Acciones Inmediatas

1. **Agregar autenticación a TODOS los API routes** — Exposición crítica de datos
2. **Escapar HTML en templates de PDF** — Vulnerabilidad XSS confirmada
3. **Crear .env.example y rotar credenciales** — Keys expuestas en repositorio
4. **Implementar aritmética de centavos** — Prevenir errores financieros acumulativos
5. **Expandir suite de tests** — Cobertura actual insuficiente para un sistema financiero

---

*Reporte generado automáticamente como parte de la auditoría de backend de EDIFIKA.*
