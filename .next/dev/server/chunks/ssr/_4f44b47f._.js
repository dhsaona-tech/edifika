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
"[project]/src/lib/auth/getUser.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCurrentUser",
    ()=>getCurrentUser,
    "getCurrentUserOrNull",
    ()=>getCurrentUserOrNull
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
;
;
async function getCurrentUser() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/login');
    }
    return user;
}
async function getCurrentUserOrNull() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
}),
"[project]/src/app/app/[id]/units/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4067d058eadd2a4745229a829d19844d0be730e2c7":"getUnitContacts","4084f129cfda616f44841ea9e7f8959e87efadc8d9":"getCondoTotalAliquot","40bbb54dda8360791036b04051ddaff3024a9162b3":"getActiveUnitsCount","40ca17a93efc0c54e30b74735144139e7970b04fc5":"getCondominiumConfig","40ef42fe8820195590853fcf9e21357dd7ba09eb08":"getUnitById","40fd80248f7647c4a4a25882a97fff8fa86ab0dcd7":"getActiveBudgetInfo","40fe4806f6a72e0bd9a0a529f2c32d3c764356a718":"getAvailableAccessories","60323be4f230cc10e9d6cb3816c23a0b5ccacd7864":"createUnit","604a782c72c317fc73e53b8f5ddec9f1335ece2d7d":"getUnitChargesSummary","604e9cf73780b23f0f34bbccd5b680f88c97c2c24a":"updateCondoBlocksConfig","60bf0311f88cf6f74d4866f7883ce8d3887308d094":"getSubUnits","700b78395d88edfb51fd4ae9358da1a632a309f20b":"updateUnit","703066cfd13fc52286dc94d8910bc31723e6b0887c":"registerNewTenant","7038800fa4a7f445eb1dfbb033f65c21b2ac231bee":"registerSale","70466cd2115ebb710548ed14d8d8cff709d62e0019":"unassignAccessory","70940e679d6750dedaab59f7f11c650f48cdb1b557":"endContactRelationship","70a410b7fc7cc3db136a33e5c35ff40e80bd7d828a":"assignAccessory","70a989c73585d53a4b3c2d8d61a7bbd2cf10d670ca":"setPrimaryPayer","70e78d8a857ce613534f467f5f3858e1d42cd10b78":"getUnits","78d26995077a77b9495cdbc2f69623527e27a1feb1":"toggleDebtEmail","78fc422f38442258e22c235cf1b016900659f461b5":"toggleOccupancy"},"",""] */ __turbopack_context__.s([
    "assignAccessory",
    ()=>assignAccessory,
    "createUnit",
    ()=>createUnit,
    "endContactRelationship",
    ()=>endContactRelationship,
    "getActiveBudgetInfo",
    ()=>getActiveBudgetInfo,
    "getActiveUnitsCount",
    ()=>getActiveUnitsCount,
    "getAvailableAccessories",
    ()=>getAvailableAccessories,
    "getCondoTotalAliquot",
    ()=>getCondoTotalAliquot,
    "getCondominiumConfig",
    ()=>getCondominiumConfig,
    "getSubUnits",
    ()=>getSubUnits,
    "getUnitById",
    ()=>getUnitById,
    "getUnitChargesSummary",
    ()=>getUnitChargesSummary,
    "getUnitContacts",
    ()=>getUnitContacts,
    "getUnits",
    ()=>getUnits,
    "registerNewTenant",
    ()=>registerNewTenant,
    "registerSale",
    ()=>registerSale,
    "setPrimaryPayer",
    ()=>setPrimaryPayer,
    "toggleDebtEmail",
    ()=>toggleDebtEmail,
    "toggleOccupancy",
    ()=>toggleOccupancy,
    "unassignAccessory",
    ()=>unassignAccessory,
    "updateCondoBlocksConfig",
    ()=>updateCondoBlocksConfig,
    "updateUnit",
    ()=>updateUnit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$getUser$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/getUser.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
async function getUnits(condominiumId, query, typeFilter) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    let dbQuery = supabase.from("view_unit_summary").select("*").eq("condominium_id", condominiumId).order("identifier", {
        ascending: true
    });
    if (query) {
        dbQuery = dbQuery.or(`full_identifier.ilike.%${query}%,primary_owner_name.ilike.%${query}%`);
    }
    if (typeFilter && typeFilter !== 'todos') {
        dbQuery = dbQuery.eq("type", typeFilter);
    }
    const { data, error } = await dbQuery;
    if (error) return [];
    const units = data || [];
    // Enriquecer con resumen de deuda (cargos pendientes por unidad)
    const unitIds = units.map((u)=>u.id);
    if (unitIds.length === 0) return units;
    const [charges, contacts] = await Promise.all([
        supabase.from("charges").select("unit_id, balance, status").eq("condominium_id", condominiumId).in("unit_id", unitIds).neq("status", "cancelado"),
        supabase.from("unit_contacts").select(`
        unit_id,
        relationship_type,
        is_primary_contact,
        profile:profiles!inner(id, full_name, first_name, last_name)
      `).in("unit_id", unitIds).is("end_date", null)
    ]);
    const debtMap = new Map();
    (charges.data || []).forEach((c)=>{
        const prev = debtMap.get(c.unit_id) || {
            pending: 0,
            total: 0
        };
        const balance = Number(c.balance || 0);
        prev.total += balance;
        if (c.status === "pendiente") prev.pending += balance;
        debtMap.set(c.unit_id, prev);
    });
    // Mapear contactos por unidad
    const contactsMap = new Map();
    (contacts.data || []).forEach((c)=>{
        const unitId = c.unit_id;
        const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
        if (!contactsMap.has(unitId)) {
            contactsMap.set(unitId, []);
        }
        contactsMap.get(unitId).push({
            id: profile?.id || "",
            full_name: profile?.full_name || "Sin nombre",
            relationship_type: c.relationship_type,
            is_primary_contact: c.is_primary_contact || false
        });
    });
    return units.map((u)=>{
        const debt = debtMap.get(u.id) || {
            pending: 0,
            total: 0
        };
        const unitContacts = contactsMap.get(u.id) || [];
        // Separar dueños e inquilinos
        const owners = unitContacts.filter((c)=>c.relationship_type === "OWNER");
        const tenants = unitContacts.filter((c)=>c.relationship_type === "TENANT");
        return {
            ...u,
            pending_balance: debt.pending,
            total_balance: debt.total,
            debt_status: debt.pending > 0 ? "pendiente" : "al_dia",
            contacts: unitContacts,
            owners_count: owners.length,
            tenants_count: tenants.length,
            owners,
            tenants
        };
    });
}
async function getCondoTotalAliquot(condominiumId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("view_condo_aliquot_total").select("total_aliquot").eq("condominium_id", condominiumId).single();
    if (error || !data) return 0;
    return Number(data.total_aliquot) || 0;
}
async function getCondominiumConfig(id) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data } = await supabase.from("condominiums").select("use_blocks, developer_profile_id").eq("id", id).single();
    return data;
}
async function getUnitById(unitId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Datos básicos de la unidad
    const { data: unitData, error } = await supabase.from("units").select(`*, condominium:condominiums!inner(id, name)`).eq("id", unitId).single();
    if (error || !unitData) return null;
    // 2. Contactos (Para calcular responsables)
    const { data: contacts } = await supabase.from("unit_contacts").select(`
      id, 
      is_primary_contact, 
      is_current_occupant, 
      relationship_type, 
      profile:profiles!inner(full_name)
    `).eq("unit_id", unitId).is("end_date", null);
    // FIX DE TIPOS
    const safeContacts = contacts || [];
    const getName = (c)=>{
        if (!c || !c.profile) return null;
        return Array.isArray(c.profile) ? c.profile[0]?.full_name : c.profile.full_name;
    };
    // Lógica visual: Si no hay nadie marcado, mostrar al primer dueño
    const primaryPayer = safeContacts.find((c)=>c.is_primary_contact);
    const fallbackOwner = safeContacts.find((c)=>c.relationship_type === 'OWNER');
    const primaryName = getName(primaryPayer) || getName(fallbackOwner) || "Sin Asignar";
    const occupantsList = safeContacts.filter((c)=>c.is_current_occupant).map((c)=>getName(c)).filter((n)=>n).join(", ");
    return {
        ...unitData,
        primary_owner_name: primaryName,
        current_occupant_name: occupantsList || null,
        payer_contact_id: primaryPayer?.id || null
    };
}
async function getSubUnits(condominiumId, parentUnitId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("units").select("*").eq("condominium_id", condominiumId).eq("parent_unit_id", parentUnitId).eq("status", "activa");
    if (error) return [];
    return data;
}
async function getAvailableAccessories(condominiumId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("units").select("*").eq("condominium_id", condominiumId).is("parent_unit_id", null).in("type", [
        "parqueadero",
        "bodega",
        "suite_adicional"
    ]).eq("status", "activa").order("identifier", {
        ascending: true
    });
    if (error) return [];
    return data;
}
async function getUnitContacts(unitId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("unit_contacts").select(`
      *,
      profile:profiles (
        full_name,
        national_id,
        avatar_url,
        email,
        phone
      )
    `).eq("unit_id", unitId).order("is_current_occupant", {
        ascending: false
    }).order("start_date", {
        ascending: false
    });
    if (error) return [];
    return data;
}
async function setPrimaryPayer(condominiumId, unitId, contactId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Quitamos el rol de principal a TODOS
    await supabase.from("unit_contacts").update({
        is_primary_contact: false
    }).eq("unit_id", unitId);
    // 2. Asignamos el principal al elegido
    const { error } = await supabase.from("unit_contacts").update({
        is_primary_contact: true,
        receives_debt_emails: true
    }).eq("id", contactId);
    if (error) return {
        error: "Error al asignar pagador."
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${unitId}`);
    return {
        success: true
    };
}
async function toggleDebtEmail(condominiumId, unitId, contactId, receivesEmails) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from("unit_contacts").update({
        receives_debt_emails: receivesEmails
    }).eq("id", contactId);
    if (error) return {
        error: "Error al actualizar preferencias."
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${unitId}`);
    return {
        success: true
    };
}
async function toggleOccupancy(condominiumId, unitId, contactId, isOccupant) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from("unit_contacts").update({
        is_current_occupant: isOccupant
    }).eq("id", contactId);
    if (error) return {
        error: "Error al actualizar ocupación."
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${unitId}`);
    return {
        success: true
    };
}
async function updateCondoBlocksConfig(condominiumId, useBlocks) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from("condominiums").update({
        use_blocks: useBlocks
    }).eq("id", condominiumId);
    if (error) throw new Error("Error al guardar configuración.");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/new`);
}
// --- CREAR UNIDAD ---
const CreateUnitSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    identifier: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, "Identificador obligatorio"),
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, "Tipo obligatorio"),
    aliquot: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(0).max(100),
    area: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().optional(),
    block_identifier: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional(),
    initial_owner_type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "DEVELOPER",
        "OWNER"
    ]),
    is_quick_owner: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].preprocess((val)=>val === 'true', __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean()),
    owner_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].any(),
    owner_lastname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].any(),
    owner_national_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].any(),
    owner_email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].any(),
    owner_doc_type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    initial_balance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number()
});
async function createUnit(condominiumId, formData) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // Usa getCurrentUser que tiene caché para evitar rate limit
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$getUser$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCurrentUser"])();
    if (!user) return {
        error: "Debes iniciar sesión."
    };
    const rawData = {
        identifier: formData.get("identifier"),
        type: formData.get("type"),
        aliquot: formData.get("aliquot"),
        area: formData.get("area"),
        block_identifier: formData.get("block_identifier"),
        initial_owner_type: formData.get("initial_owner_type"),
        is_quick_owner: formData.get("is_quick_owner"),
        owner_name: formData.get("owner_name"),
        owner_lastname: formData.get("owner_lastname"),
        owner_national_id: formData.get("owner_national_id"),
        owner_email: formData.get("owner_email"),
        owner_doc_type: formData.get("owner_doc_type"),
        initial_balance: formData.get("initial_balance")
    };
    const result = CreateUnitSchema.safeParse(rawData);
    if (!result.success) return {
        error: "Error validación."
    };
    const data = result.data;
    let final_profile_id = user.id;
    let final_relationship_type = data.initial_owner_type;
    // BUSCAR O CREAR PERFIL (Para evitar duplicados al crear unidad con dueño rápido)
    if (data.is_quick_owner && data.initial_owner_type === 'OWNER' && data.owner_name) {
        const { data: existing } = await supabase.from("profiles").select("id").or(`national_id.eq.${data.owner_national_id},email.eq.${data.owner_email}`).maybeSingle();
        if (existing) {
            final_profile_id = existing.id;
        } else {
            const newProfileId = crypto.randomUUID();
            await supabase.from("profiles").insert({
                id: newProfileId,
                full_name: `${data.owner_name} ${data.owner_lastname}`,
                first_name: data.owner_name,
                last_name: data.owner_lastname,
                national_id: data.owner_national_id,
                id_type: data.owner_doc_type || null,
                email: data.owner_email || null,
                contact_preference: 'Correo'
            });
            final_profile_id = newProfileId;
        }
        // Asegurar membresía
        await supabase.from("memberships").upsert({
            condominium_id: condominiumId,
            profile_id: final_profile_id,
            role: 'RESIDENT',
            status: 'activo'
        }, {
            onConflict: 'condominium_id, profile_id'
        });
    }
    const blockPrefix = data.block_identifier ? `${data.block_identifier} – ` : '';
    const fullIdentifier = `${blockPrefix}${data.type} ${data.identifier}`;
    const { data: unitData, error: unitError } = await supabase.from("units").insert({
        condominium_id: condominiumId,
        identifier: data.identifier,
        block_identifier: data.block_identifier || null,
        full_identifier: fullIdentifier,
        type: data.type,
        aliquot: data.aliquot,
        area: data.area || 0,
        status: "activa"
    }).select().single();
    if (unitError || !unitData) return {
        error: "Error creando unidad."
    };
    await supabase.from("unit_contacts").insert({
        unit_id: unitData.id,
        profile_id: final_profile_id,
        relationship_type: final_relationship_type,
        is_primary_contact: true,
        is_current_occupant: final_relationship_type === 'OWNER' && data.is_quick_owner,
        receives_debt_emails: true,
        start_date: new Date().toISOString(),
        ownership_share: 100.00
    });
    // CREAR CARGO INICIAL SI EL VALOR PENDIENTE ES DIFERENTE DE 0
    const initialBalance = Number(data.initial_balance || 0);
    if (initialBalance !== 0) {
        // Buscar o crear un rubro especial para "Saldo Inicial"
        const { data: saldoInicialRubro } = await supabase.from("expense_items").select("id").eq("condominium_id", condominiumId).eq("name", "Saldo Inicial").maybeSingle();
        let expenseItemId = null;
        if (saldoInicialRubro) {
            expenseItemId = saldoInicialRubro.id;
        } else {
            // Crear rubro "Saldo Inicial" si no existe
            const { data: newRubro, error: rubroError } = await supabase.from("expense_items").insert({
                condominium_id: condominiumId,
                name: "Saldo Inicial",
                description: "Saldo pendiente al momento de crear la unidad",
                category: "otros",
                is_income: false
            }).select().single();
            if (rubroError || !newRubro) {
                console.error("Error creando rubro Saldo Inicial", rubroError);
            // Continuar sin crear el cargo si falla
            } else {
                expenseItemId = newRubro.id;
            }
        }
        if (expenseItemId) {
            const today = new Date().toISOString().split("T")[0];
            const description = initialBalance > 0 ? `Deuda inicial al crear la unidad (${today})` : `Saldo a favor inicial al crear la unidad (${today})`;
            await supabase.from("charges").insert({
                condominium_id: condominiumId,
                unit_id: unitData.id,
                expense_item_id: expenseItemId,
                utility_bill_id: null,
                period: null,
                posted_date: today,
                due_date: today,
                total_amount: Math.abs(initialBalance),
                paid_amount: 0,
                balance: Math.abs(initialBalance),
                status: "pendiente",
                charge_type: initialBalance > 0 ? "ordinaria" : "otro",
                description: description,
                batch_id: null
            });
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/app/${condominiumId}/units/${unitData.id}`);
}
async function updateUnit(unitId, condominiumId, formData) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const rawData = {
        identifier: formData.get("identifier"),
        type: formData.get("type"),
        block_identifier: formData.get("block_identifier"),
        area: formData.get("area"),
        aliquot: formData.get("aliquot")
    };
    const data = rawData;
    const blockPrefix = data.block_identifier ? `${data.block_identifier} – ` : '';
    const fullIdentifier = `${blockPrefix}${data.type} ${data.identifier}`;
    const { error } = await supabase.from("units").update({
        identifier: data.identifier,
        type: data.type,
        block_identifier: data.block_identifier || null,
        full_identifier: fullIdentifier,
        area: data.area || 0,
        aliquot: data.aliquot
    }).eq("id", unitId).eq("condominium_id", condominiumId);
    if (error) {
        console.error("Error actualizando unidad", error);
        return {
            error: "No se pudo actualizar la unidad"
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${unitId}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units`);
    return {
        success: true
    };
}
async function registerNewTenant(condominiumId, unitId, formData) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const first_name = formData.get("first_name");
    const last_name = formData.get("last_name");
    const national_id = formData.get("national_id");
    const email = formData.get("email");
    const start_date = formData.get("start_date");
    const receives_emails = formData.get("receives_emails") === 'on';
    let profileId = "";
    // 1. BUSCAR SI EXISTE
    const { data: existing } = await supabase.from("profiles").select("id").or(`national_id.eq.${national_id},email.eq.${email}`).maybeSingle();
    if (existing) {
        profileId = existing.id;
    } else {
        // 2. CREAR SI NO EXISTE
        const newId = crypto.randomUUID();
        const { error } = await supabase.from("profiles").insert({
            id: newId,
            full_name: `${first_name} ${last_name}`,
            first_name,
            last_name,
            national_id,
            email,
            contact_preference: 'Correo'
        });
        if (error) return {
            error: "Error creando perfil (posible duplicado)."
        };
        profileId = newId;
    }
    // 3. ASEGURAR MEMBRESÍA
    await supabase.from("memberships").upsert({
        condominium_id: condominiumId,
        profile_id: profileId,
        role: 'RESIDENT',
        status: 'activo'
    }, {
        onConflict: 'condominium_id, profile_id'
    });
    // 4. QUITAR TITULARIDAD A TODOS
    await supabase.from("unit_contacts").update({
        is_primary_contact: false
    }).eq("unit_id", unitId);
    // 5. VINCULAR AL NUEVO (COMO TITULAR)
    await supabase.from("unit_contacts").insert({
        unit_id: unitId,
        profile_id: profileId,
        relationship_type: 'TENANT',
        is_primary_contact: true,
        is_current_occupant: true,
        start_date: start_date,
        receives_debt_emails: receives_emails,
        ownership_share: 0
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${unitId}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/app/${condominiumId}/units/${unitId}`);
}
async function unassignAccessory(condominiumId, parentUnitId, accessoryUnitId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    await supabase.from("units").update({
        parent_unit_id: null
    }).eq("id", accessoryUnitId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${parentUnitId}`);
}
async function assignAccessory(condominiumId, parentUnitId, accessoryUnitId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    await supabase.from("units").update({
        parent_unit_id: parentUnitId
    }).eq("id", accessoryUnitId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${parentUnitId}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/app/${condominiumId}/units/${parentUnitId}`);
}
async function registerSale(condominiumId, unitId, formData) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const first_name = formData.get("first_name");
    const last_name = formData.get("last_name");
    const national_id = formData.get("national_id");
    const email = formData.get("email");
    const phone = formData.get("phone");
    const start_date = formData.get("start_date");
    const is_occupant = formData.get("is_occupant") === 'on';
    const notes = formData.get("notes");
    let profileId = "";
    // 1. BUSCAR SI EXISTE
    const { data: existing } = await supabase.from("profiles").select("id").or(`national_id.eq.${national_id},email.eq.${email}`).maybeSingle();
    if (existing) {
        profileId = existing.id;
    } else {
        // 2. CREAR SI NO EXISTE
        const newId = crypto.randomUUID();
        const { error } = await supabase.from("profiles").insert({
            id: newId,
            full_name: `${first_name} ${last_name}`,
            first_name,
            last_name,
            national_id,
            email,
            phone,
            notes,
            contact_preference: 'Correo'
        });
        if (error) return {
            error: "Error creando perfil."
        };
        profileId = newId;
    }
    // 3. ASEGURAR MEMBRESÍA
    await supabase.from("memberships").upsert({
        condominium_id: condominiumId,
        profile_id: profileId,
        role: 'RESIDENT',
        status: 'activo'
    }, {
        onConflict: 'condominium_id, profile_id'
    });
    // 4. CERRAR DUEÑO ANTERIOR
    await supabase.from("unit_contacts").update({
        end_date: start_date,
        is_current_occupant: false,
        is_primary_contact: false
    }).eq("unit_id", unitId).eq("relationship_type", "OWNER").is("end_date", null);
    // 5. LIMPIAR TITULARIDAD DE CUALQUIER OTRO (Inquilinos, etc)
    await supabase.from("unit_contacts").update({
        is_primary_contact: false
    }).eq("unit_id", unitId);
    // 6. ASIGNAR NUEVO DUEÑO (TITULAR)
    await supabase.from("unit_contacts").insert({
        unit_id: unitId,
        profile_id: profileId,
        relationship_type: 'OWNER',
        is_primary_contact: true,
        is_current_occupant: is_occupant,
        start_date: start_date,
        receives_debt_emails: true,
        ownership_share: 100.00
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${unitId}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/app/${condominiumId}/units/${unitId}`);
}
async function endContactRelationship(condominiumId, unitId, contactId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // Verificar si el que se va es el titular
    const { data: contactLeaving } = await supabase.from("unit_contacts").select("is_primary_contact").eq("id", contactId).single();
    const wasPrimary = contactLeaving?.is_primary_contact;
    // Marcar salida
    await supabase.from("unit_contacts").update({
        end_date: new Date().toISOString(),
        is_current_occupant: false,
        is_primary_contact: false
    }).eq("id", contactId);
    // Si se fue el titular, buscar un dueño activo para pasarle la posta
    if (wasPrimary) {
        const { data: owner } = await supabase.from("unit_contacts").select("id").eq("unit_id", unitId).eq("relationship_type", "OWNER").is("end_date", null).neq("id", contactId) // Que no sea el mismo que se acaba de ir
        .limit(1).maybeSingle();
        if (owner) {
            await supabase.from("unit_contacts").update({
                is_primary_contact: true
            }).eq("id", owner.id);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/units/${unitId}`);
}
async function getActiveBudgetInfo(condominiumId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // Obtener el presupuesto activo del condominio
    const { data: condo, error: condoError } = await supabase.from("condominiums").select("active_budget_master_id").eq("id", condominiumId).single();
    if (condoError || !condo?.active_budget_master_id) return null;
    const budgetId = condo.active_budget_master_id;
    const { data: budget, error } = await supabase.from("budgets_master").select("id, total_annual_amount, distribution_method, budget_type").eq("id", budgetId).single();
    if (error || !budget) return null;
    return {
        id: budget.id,
        total_annual_amount: Number(budget.total_annual_amount || 0),
        distribution_method: budget.distribution_method || "por_aliquota",
        budget_type: budget.budget_type
    };
}
async function getActiveUnitsCount(condominiumId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { count, error } = await supabase.from("units").select("*", {
        count: "exact",
        head: true
    }).eq("condominium_id", condominiumId).eq("status", "activa");
    if (error) return 0;
    return count || 0;
}
async function getUnitChargesSummary(condominiumId, unitId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("charges").select("total_amount, balance, status").eq("condominium_id", condominiumId).eq("unit_id", unitId).neq("status", "cancelado"); // ocultamos los anulados para el resumen
    if (error || !data) {
        return {
            totalGenerado: 0,
            saldoPendiente: 0,
            totalCargos: 0
        };
    }
    const totalGenerado = data.reduce((sum, c)=>sum + Number(c.total_amount || 0), 0);
    const saldoPendiente = data.filter((c)=>c.status === "pendiente").reduce((sum, c)=>sum + Number(c.balance || 0), 0);
    return {
        totalGenerado,
        saldoPendiente,
        totalCargos: data.length
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getUnits,
    getCondoTotalAliquot,
    getCondominiumConfig,
    getUnitById,
    getSubUnits,
    getAvailableAccessories,
    getUnitContacts,
    setPrimaryPayer,
    toggleDebtEmail,
    toggleOccupancy,
    updateCondoBlocksConfig,
    createUnit,
    updateUnit,
    registerNewTenant,
    unassignAccessory,
    assignAccessory,
    registerSale,
    endContactRelationship,
    getActiveBudgetInfo,
    getActiveUnitsCount,
    getUnitChargesSummary
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getUnits, "70e78d8a857ce613534f467f5f3858e1d42cd10b78", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getCondoTotalAliquot, "4084f129cfda616f44841ea9e7f8959e87efadc8d9", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getCondominiumConfig, "40ca17a93efc0c54e30b74735144139e7970b04fc5", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getUnitById, "40ef42fe8820195590853fcf9e21357dd7ba09eb08", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getSubUnits, "60bf0311f88cf6f74d4866f7883ce8d3887308d094", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getAvailableAccessories, "40fe4806f6a72e0bd9a0a529f2c32d3c764356a718", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getUnitContacts, "4067d058eadd2a4745229a829d19844d0be730e2c7", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(setPrimaryPayer, "70a989c73585d53a4b3c2d8d61a7bbd2cf10d670ca", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(toggleDebtEmail, "78d26995077a77b9495cdbc2f69623527e27a1feb1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(toggleOccupancy, "78fc422f38442258e22c235cf1b016900659f461b5", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateCondoBlocksConfig, "604e9cf73780b23f0f34bbccd5b680f88c97c2c24a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createUnit, "60323be4f230cc10e9d6cb3816c23a0b5ccacd7864", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateUnit, "700b78395d88edfb51fd4ae9358da1a632a309f20b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(registerNewTenant, "703066cfd13fc52286dc94d8910bc31723e6b0887c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(unassignAccessory, "70466cd2115ebb710548ed14d8d8cff709d62e0019", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(assignAccessory, "70a410b7fc7cc3db136a33e5c35ff40e80bd7d828a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(registerSale, "7038800fa4a7f445eb1dfbb033f65c21b2ac231bee", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(endContactRelationship, "70940e679d6750dedaab59f7f11c650f48cdb1b557", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getActiveBudgetInfo, "40fd80248f7647c4a4a25882a97fff8fa86ab0dcd7", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getActiveUnitsCount, "40bbb54dda8360791036b04051ddaff3024a9162b3", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getUnitChargesSummary, "604a782c72c317fc73e53b8f5ddec9f1335ece2d7d", null);
}),
"[project]/.next-internal/server/app/app/[id]/units/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/app/[id]/units/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/app/[id]/units/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
}),
"[project]/.next-internal/server/app/app/[id]/units/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/app/[id]/units/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "4067d058eadd2a4745229a829d19844d0be730e2c7",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUnitContacts"],
    "4084f129cfda616f44841ea9e7f8959e87efadc8d9",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCondoTotalAliquot"],
    "40bbb54dda8360791036b04051ddaff3024a9162b3",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getActiveUnitsCount"],
    "40ca17a93efc0c54e30b74735144139e7970b04fc5",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCondominiumConfig"],
    "40ef42fe8820195590853fcf9e21357dd7ba09eb08",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUnitById"],
    "40fd80248f7647c4a4a25882a97fff8fa86ab0dcd7",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getActiveBudgetInfo"],
    "40fe4806f6a72e0bd9a0a529f2c32d3c764356a718",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAvailableAccessories"],
    "60323be4f230cc10e9d6cb3816c23a0b5ccacd7864",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createUnit"],
    "604a782c72c317fc73e53b8f5ddec9f1335ece2d7d",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUnitChargesSummary"],
    "604e9cf73780b23f0f34bbccd5b680f88c97c2c24a",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateCondoBlocksConfig"],
    "60bf0311f88cf6f74d4866f7883ce8d3887308d094",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSubUnits"],
    "700b78395d88edfb51fd4ae9358da1a632a309f20b",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateUnit"],
    "703066cfd13fc52286dc94d8910bc31723e6b0887c",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerNewTenant"],
    "7038800fa4a7f445eb1dfbb033f65c21b2ac231bee",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerSale"],
    "70466cd2115ebb710548ed14d8d8cff709d62e0019",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unassignAccessory"],
    "70940e679d6750dedaab59f7f11c650f48cdb1b557",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["endContactRelationship"],
    "70a410b7fc7cc3db136a33e5c35ff40e80bd7d828a",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["assignAccessory"],
    "70a989c73585d53a4b3c2d8d61a7bbd2cf10d670ca",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setPrimaryPayer"],
    "70e78d8a857ce613534f467f5f3858e1d42cd10b78",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUnits"],
    "78d26995077a77b9495cdbc2f69623527e27a1feb1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toggleDebtEmail"],
    "78fc422f38442258e22c235cf1b016900659f461b5",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toggleOccupancy"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$app$2f5b$id$5d2f$units$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/app/[id]/units/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/app/[id]/units/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$units$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/app/[id]/units/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_4f44b47f._.js.map