module.exports = [
"[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://bbdcuicuazfmggyglkgo.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZGN1aWN1YXpmbWdneWdsa2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTM3NjgsImV4cCI6MjA3ODcyOTc2OH0.OrM6qEM-ApWYWU9idf72zYqSHDPCFHcICQP74mayBxo"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // Ignorar errores de cookies en Server Components
                }
            }
        }
    });
}
}),
"[project]/src/app/app/[id]/dashboard/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40703593b83a0858d97ba63d2147962889430e4598":"getDashboardMetrics"},"",""] */ __turbopack_context__.s([
    "getDashboardMetrics",
    ()=>getDashboardMetrics
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
async function getDashboardMetrics(condominiumId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Unidades
    const { count: totalUnits } = await supabase.from("units").select("*", {
        count: "exact",
        head: true
    }).eq("condominium_id", condominiumId);
    const { count: activeUnits } = await supabase.from("units").select("*", {
        count: "exact",
        head: true
    }).eq("condominium_id", condominiumId).eq("status", "activa");
    // Unidades con deuda
    const { data: chargesData } = await supabase.from("charges").select("unit_id, balance, status").eq("condominium_id", condominiumId).eq("status", "pendiente").gt("balance", 0);
    const unitsWithDebt = new Set(chargesData?.map((c)=>c.unit_id) || []).size;
    // 2. Residentes
    const { data: membersData } = await supabase.from("memberships").select("profile_id, role").eq("condominium_id", condominiumId).eq("status", "activo");
    // Obtener unidades del condominio primero
    const { data: unitsData } = await supabase.from("units").select("id").eq("condominium_id", condominiumId);
    const unitIds = unitsData?.map((u)=>u.id) || [];
    const { data: contactsData } = await supabase.from("unit_contacts").select("profile_id, relationship_type").in("unit_id", unitIds.length > 0 ? unitIds : [
        "00000000-0000-0000-0000-000000000000"
    ]).is("end_date", null);
    const uniqueResidents = new Set([
        ...membersData?.map((m)=>m.profile_id) || [],
        ...contactsData?.map((c)=>c.profile_id) || []
    ]).size;
    const owners = contactsData?.filter((c)=>c.relationship_type === "OWNER").length || 0;
    const tenants = contactsData?.filter((c)=>c.relationship_type === "TENANT").length || 0;
    // 3. Financiero
    // Cargos pendientes y deuda total
    const { data: pendingChargesData } = await supabase.from("charges").select("balance, total_amount").eq("condominium_id", condominiumId).eq("status", "pendiente");
    const pendingCharges = pendingChargesData?.length || 0;
    const totalDebt = pendingChargesData?.reduce((sum, c)=>sum + Number(c.balance || 0), 0) || 0;
    // Ingresos del mes actual
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: monthlyPayments } = await supabase.from("payments").select("total_amount").eq("condominium_id", condominiumId).gte("payment_date", `${currentMonth}-01`).lt("payment_date", `${currentMonth}-32`).neq("status", "cancelado");
    const monthlyIncome = monthlyPayments?.reduce((sum, p)=>sum + Number(p.total_amount || 0), 0) || 0;
    // Egresos del mes actual
    const { data: monthlyEgresses } = await supabase.from("egresses").select("total_amount").eq("condominium_id", condominiumId).gte("egress_date", `${currentMonth}-01`).lt("egress_date", `${currentMonth}-32`).neq("status", "cancelado");
    const monthlyExpenses = monthlyEgresses?.reduce((sum, e)=>sum + Number(e.total_amount || 0), 0) || 0;
    // Balance de cuentas financieras
    const { data: accounts } = await supabase.from("financial_accounts").select("current_balance").eq("condominium_id", condominiumId).eq("is_active", true);
    const accountBalance = accounts?.reduce((sum, a)=>sum + Number(a.current_balance || 0), 0) || 0;
    // 4. Actividad reciente (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const { count: recentPayments } = await supabase.from("payments").select("*", {
        count: "exact",
        head: true
    }).eq("condominium_id", condominiumId).gte("payment_date", sevenDaysAgoStr).neq("status", "cancelado");
    const { count: recentCharges } = await supabase.from("charges").select("*", {
        count: "exact",
        head: true
    }).eq("condominium_id", condominiumId).gte("posted_date", sevenDaysAgoStr).neq("status", "cancelado");
    const { count: pendingPayables } = await supabase.from("payables").select("*", {
        count: "exact",
        head: true
    }).eq("condominium_id", condominiumId).eq("status", "pendiente");
    return {
        units: {
            total: totalUnits || 0,
            active: activeUnits || 0,
            withDebt: unitsWithDebt
        },
        residents: {
            total: uniqueResidents,
            owners,
            tenants
        },
        financial: {
            pendingCharges,
            totalDebt,
            monthlyIncome,
            monthlyExpenses,
            accountBalance
        },
        recentActivity: {
            recentPayments: recentPayments || 0,
            recentCharges: recentCharges || 0,
            pendingPayables: pendingPayables || 0
        }
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getDashboardMetrics
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getDashboardMetrics, "40703593b83a0858d97ba63d2147962889430e4598", null);
}),
"[project]/.next-internal/server/app/app/[id]/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/app/[id]/dashboard/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/app/[id]/dashboard/actions.ts [app-rsc] (ecmascript)");
;
}),
"[project]/.next-internal/server/app/app/[id]/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/app/[id]/dashboard/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "40703593b83a0858d97ba63d2147962889430e4598",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDashboardMetrics"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$app$2f5b$id$5d2f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/app/[id]/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/app/[id]/dashboard/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/app/[id]/dashboard/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_3051495b._.js.map