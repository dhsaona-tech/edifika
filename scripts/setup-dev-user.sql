-- Script para crear usuario de desarrollo temporal
-- Ejecuta esto en tu Supabase SQL Editor para evitar errores de foreign key

-- 1. Insertar perfil de desarrollo si no existe
INSERT INTO profiles (
  id,
  full_name,
  first_name,
  last_name,
  email,
  is_legal_entity,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Usuario Desarrollo',
  'Usuario',
  'Desarrollo',
  'dev@edifika.local',
  false,
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Verificar que se creó correctamente
SELECT * FROM profiles WHERE id = '00000000-0000-0000-0000-000000000000';

-- NOTA: Este usuario es SOLO para desarrollo local.
-- En producción, DEBES usar autenticación real.
