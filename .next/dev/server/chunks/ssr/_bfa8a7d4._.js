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
"[project]/src/app/app/[id]/residents/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"60dcd9e5667f1d0f8a85aa0bff39dd4c33bc9ed704":"getResidentProfile","705cfee407e3fb4ef78b12e02023808205584f4774":"createOrLinkResident","70dae7fef89bbf038feb5b3edb077fc6b18c5f5f69":"updateResidentProfile","78b22bff0adf98ce9b819cbe47c66096ea5f5754b3":"getResidents"},"",""] */ __turbopack_context__.s([
    "createOrLinkResident",
    ()=>createOrLinkResident,
    "getResidentProfile",
    ()=>getResidentProfile,
    "getResidents",
    ()=>getResidents,
    "updateResidentProfile",
    ()=>updateResidentProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
// ==========================================
// 1. SCHEMAS (Validación)
// ==========================================
const ResidentSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    first_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, "Nombre requerido"),
    last_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, "Apellido requerido"),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email("Correo requerido"),
    doc_type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("CEDULA"),
    national_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")),
    country: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("Ecuador (+593)"),
    address: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")),
    is_legal_entity: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false),
    lives_in_unit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(true),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")),
    notes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")),
    // Selector de unidad
    selected_unit_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal(""))
});
async function getResidents(condominiumId, query, roleFilter = "all", hasUnitFilter = "all") {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // A. Buscar Miembros
    const membersQuery = supabase.from("memberships").select(`profile:profiles!inner(*)`).eq("condominium_id", condominiumId);
    // B. Buscar Contactos de Unidad
    const contactsQuery = supabase.from("unit_contacts").select(`
      profile_id,
      relationship_type,
      profile:profiles!inner(*),
      unit:units!inner(identifier, type, block_identifier, condominium_id)
    `).eq("unit.condominium_id", condominiumId).is("end_date", null);
    const [membersRes, contactsRes] = await Promise.all([
        membersQuery,
        contactsQuery
    ]);
    const residentsMap = new Map();
    // 1. Procesar Miembros
    (membersRes.data || []).forEach((row)=>{
        const p = row.profile;
        residentsMap.set(p.id, {
            ...p,
            units_owned: [],
            units_rented: [],
            roles: []
        });
    });
    // 2. Procesar Unidades
    (contactsRes.data || []).forEach((c)=>{
        const p = c.profile;
        if (!residentsMap.has(p.id)) {
            residentsMap.set(p.id, {
                ...p,
                units_owned: [],
                units_rented: [],
                roles: []
            });
        }
        const resident = residentsMap.get(p.id);
        const unitName = c.unit.block_identifier ? `${c.unit.block_identifier} ${c.unit.identifier}` : `${c.unit.type.charAt(0).toUpperCase() + c.unit.type.slice(1)} ${c.unit.identifier}`;
        if (c.relationship_type === 'OWNER') {
            if (!resident.units_owned.includes(unitName)) resident.units_owned.push(unitName);
            if (!resident.roles.includes('Propietario')) resident.roles.push('Propietario');
        } else if (c.relationship_type === 'TENANT') {
            if (!resident.units_rented.includes(unitName)) resident.units_rented.push(unitName);
            if (!resident.roles.includes('Inquilino')) resident.roles.push('Inquilino');
        }
    });
    // 3. Filtros
    let results = Array.from(residentsMap.values());
    if (query) {
        const q = query.toLowerCase();
        results = results.filter((r)=>r.full_name && r.full_name.toLowerCase().includes(q) || r.email && r.email.toLowerCase().includes(q) || r.national_id && r.national_id.includes(q));
    }
    // Filtro por rol (propietario / inquilino)
    if (roleFilter === "owner") {
        results = results.filter((r)=>r.roles.includes("Propietario"));
    } else if (roleFilter === "tenant") {
        results = results.filter((r)=>r.roles.includes("Inquilino"));
    }
    // Filtro por unidad asignada
    if (hasUnitFilter === "yes") {
        results = results.filter((r)=>r.units_owned.length + r.units_rented.length > 0);
    } else if (hasUnitFilter === "no") {
        results = results.filter((r)=>r.units_owned.length + r.units_rented.length === 0);
    }
    return results;
}
async function getResidentProfile(condominiumId, profileId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", profileId).single();
    if (!profile) return null;
    const { data: history } = await supabase.from("unit_contacts").select(`*, unit:units!inner(*)`).eq("profile_id", profileId).eq("unit.condominium_id", condominiumId).order("start_date", {
        ascending: false
    });
    return {
        profile,
        history: history || []
    };
}
async function createOrLinkResident(condominiumId, unitIdArg, formData) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    // Sanitización para evitar "invalid null"
    const rawData = {
        first_name: formData.get("first_name")?.toString() || "",
        last_name: formData.get("last_name")?.toString() || "",
        email: formData.get("email")?.toString() || "",
        doc_type: formData.get("doc_type")?.toString() || "CEDULA",
        national_id: formData.get("national_id")?.toString() || "",
        phone: formData.get("phone")?.toString() || "",
        country: formData.get("country")?.toString() || "",
        address: formData.get("address")?.toString() || "",
        role: formData.get("role")?.toString() || "",
        notes: formData.get("notes")?.toString() || "",
        is_legal_entity: formData.get("is_legal_entity") === "on",
        lives_in_unit: formData.get("lives_in_unit") === "on",
        selected_unit_id: formData.get("selected_unit_id")?.toString() || ""
    };
    const validation = ResidentSchema.safeParse(rawData);
    if (!validation.success) return {
        error: validation.error.issues[0].message
    };
    const data = validation.data;
    // Determinar unidad objetivo
    const targetUnitId = unitIdArg || (data.selected_unit_id !== "" ? data.selected_unit_id : null);
    const fullName = `${data.first_name} ${data.last_name}`.trim();
    // Anti-Duplicados (Cédula O Email)
    let dbQuery = supabase.from("profiles").select("id, full_name");
    // CORRECCIÓN TS: Verificamos existencia antes de length
    if (data.national_id && data.national_id.length > 3) {
        dbQuery = dbQuery.or(`national_id.eq.${data.national_id},email.eq.${data.email}`);
    } else {
        dbQuery = dbQuery.eq("email", data.email);
    }
    const { data: existingProfiles } = await dbQuery;
    let profileId = existingProfiles?.[0]?.id;
    // Crear si no existe
    if (!profileId) {
        const newId = crypto.randomUUID();
        // CORRECCIÓN TS: Verificamos existencia antes de trim
        const cleanNationalId = data.national_id && data.national_id.trim() !== "" ? data.national_id : null;
        const { error } = await supabase.from("profiles").insert({
            id: newId,
            first_name: data.first_name,
            last_name: data.last_name,
            full_name: fullName,
            email: data.email,
            national_id: cleanNationalId,
            id_type: data.doc_type,
            phone: data.phone,
            address: data.address,
            country: data.country,
            is_legal_entity: data.is_legal_entity,
            notes: data.notes,
            preferences: {
                notify_news: true,
                notify_statements: true,
                channel: 'email'
            }
        });
        if (error) return {
            error: error.code === '23505' ? "Correo o cédula duplicada." : "Error creando perfil."
        };
        profileId = newId;
    }
    // GARANTIZAR MEMBRESÍA (Para que aparezca en lista)
    await supabase.from("memberships").upsert({
        condominium_id: condominiumId,
        profile_id: profileId,
        role: 'RESIDENT',
        status: 'activo'
    }, {
        onConflict: 'condominium_id, profile_id'
    });
    // Vincular a Unidad
    if (targetUnitId && profileId) {
        const { data: existing } = await supabase.from("unit_contacts").select("id").eq("unit_id", targetUnitId).eq("profile_id", profileId).is("end_date", null).single();
        if (!existing) {
            const { error: linkError } = await supabase.from("unit_contacts").insert({
                unit_id: targetUnitId,
                profile_id: profileId,
                relationship_type: data.role || "TENANT",
                is_primary_contact: false,
                is_current_occupant: data.lives_in_unit,
                receives_debt_emails: true,
                start_date: new Date().toISOString()
            });
            if (linkError) console.error("Link Error", linkError);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/residents`);
    return {
        success: true,
        message: "Guardado correctamente."
    };
}
async function updateResidentProfile(condominiumId, profileId, formData) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const rawData = {
        first_name: formData.get("first_name")?.toString() || "",
        last_name: formData.get("last_name")?.toString() || "",
        email: formData.get("email")?.toString() || "",
        doc_type: formData.get("doc_type")?.toString() || "CEDULA",
        national_id: formData.get("national_id")?.toString() || "",
        phone: formData.get("phone")?.toString() || "",
        address: formData.get("address")?.toString() || "",
        country: formData.get("country")?.toString() || "",
        notes: formData.get("notes")?.toString() || "",
        is_legal_entity: formData.get("is_legal_entity") === "on",
        notify_statements: formData.get("notify_statements") === "on",
        notify_receipts: formData.get("notify_receipts") === "on",
        notify_news: formData.get("notify_news") === "on"
    };
    const UpdateSchema = ResidentSchema.pick({
        first_name: true,
        last_name: true,
        email: true,
        doc_type: true,
        national_id: true,
        phone: true,
        address: true,
        country: true,
        is_legal_entity: true,
        notes: true
    }).extend({
        notify_statements: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
        notify_receipts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
        notify_news: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean()
    });
    const validation = UpdateSchema.safeParse(rawData);
    if (!validation.success) return {
        error: "Datos inválidos: " + validation.error.issues[0].message
    };
    const data = validation.data;
    const fullName = `${data.first_name} ${data.last_name}`.trim();
    // CORRECCIÓN TS: Verificamos existencia
    const cleanNationalId = data.national_id && data.national_id.trim() !== "" ? data.national_id : null;
    const { error } = await supabase.from("profiles").update({
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        email: data.email,
        national_id: cleanNationalId,
        id_type: data.doc_type,
        phone: data.phone,
        address: data.address,
        country: data.country,
        is_legal_entity: data.is_legal_entity,
        notes: data.notes,
        preferences: {
            notify_statements: data.notify_statements,
            notify_receipts: data.notify_receipts,
            notify_news: data.notify_news,
            channel: "email"
        }
    }).eq("id", profileId);
    if (error) {
        if (error.code === '23505') return {
            error: "Correo o cédula duplicada."
        };
        return {
            error: "Error al actualizar."
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/residents`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/app/${condominiumId}/residents/${profileId}`);
    return {
        success: true,
        message: "Perfil actualizado."
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getResidents,
    getResidentProfile,
    createOrLinkResident,
    updateResidentProfile
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getResidents, "78b22bff0adf98ce9b819cbe47c66096ea5f5754b3", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getResidentProfile, "60dcd9e5667f1d0f8a85aa0bff39dd4c33bc9ed704", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createOrLinkResident, "705cfee407e3fb4ef78b12e02023808205584f4774", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateResidentProfile, "70dae7fef89bbf038feb5b3edb077fc6b18c5f5f69", null);
}),
"[project]/.next-internal/server/app/app/[id]/residents/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/app/[id]/residents/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$residents$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/app/[id]/residents/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
}),
"[project]/.next-internal/server/app/app/[id]/residents/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/app/[id]/residents/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "60dcd9e5667f1d0f8a85aa0bff39dd4c33bc9ed704",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$residents$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getResidentProfile"],
    "705cfee407e3fb4ef78b12e02023808205584f4774",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$residents$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createOrLinkResident"],
    "70dae7fef89bbf038feb5b3edb077fc6b18c5f5f69",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$residents$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateResidentProfile"],
    "78b22bff0adf98ce9b819cbe47c66096ea5f5754b3",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$residents$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getResidents"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$app$2f5b$id$5d2f$residents$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$residents$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/app/[id]/residents/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/app/[id]/residents/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$app$2f5b$id$5d2f$residents$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/app/[id]/residents/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_bfa8a7d4._.js.map