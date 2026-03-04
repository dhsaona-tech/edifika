import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generatePublicToken,
  validatePublicToken,
  getPublicUrl,
} from '@/lib/public-links/tokens'

// Mock environment variable for signing secret
const MOCK_SECRET = 'test-secret-key-for-hmac-signing-operations'

describe('Sistema de Tokens Públicos (HMAC-SHA256)', () => {
  beforeEach(() => {
    vi.stubEnv('LINK_SIGNING_SECRET', MOCK_SECRET)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const unitId = '550e8400-e29b-41d4-a716-446655440000'
  const condominiumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

  describe('generatePublicToken', () => {
    it('genera un token no vacío', () => {
      const token = generatePublicToken(unitId, condominiumId)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
    })

    it('genera token con formato payload.signature', () => {
      const token = generatePublicToken(unitId, condominiumId)
      const parts = token.split('.')
      expect(parts).toHaveLength(2)
      expect(parts[0].length).toBeGreaterThan(0)
      expect(parts[1].length).toBeGreaterThan(0)
    })

    it('genera tokens diferentes para distintos unitIds', () => {
      const token1 = generatePublicToken(unitId, condominiumId)
      const token2 = generatePublicToken('different-unit-id', condominiumId)
      expect(token1).not.toBe(token2)
    })

    it('genera tokens URL-safe (sin +, /, =)', () => {
      const token = generatePublicToken(unitId, condominiumId)
      expect(token).not.toMatch(/[+/=]/)
    })

    it('acepta parámetro de expiración personalizado', () => {
      const token7days = generatePublicToken(unitId, condominiumId, 7)
      const token90days = generatePublicToken(unitId, condominiumId, 90)
      // Tokens deben ser diferentes por la expiración distinta
      expect(token7days).not.toBe(token90days)
    })
  })

  describe('validatePublicToken', () => {
    it('valida correctamente un token recién generado', () => {
      const token = generatePublicToken(unitId, condominiumId)
      const payload = validatePublicToken(token)

      expect(payload).not.toBeNull()
      expect(payload!.unitId).toBe(unitId)
      expect(payload!.condominiumId).toBe(condominiumId)
      expect(payload!.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('rechaza token con firma manipulada', () => {
      const token = generatePublicToken(unitId, condominiumId)
      const [payload] = token.split('.')
      const tamperedToken = `${payload}.FIRMA_FALSA_MANIPULADA`

      const result = validatePublicToken(tamperedToken)
      expect(result).toBeNull()
    })

    it('rechaza token con payload manipulado', () => {
      const token = generatePublicToken(unitId, condominiumId)
      const [, signature] = token.split('.')

      // Encode a different payload
      const fakePayload = Buffer.from('hacked-unit:hacked-condo:9999999999')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      const tamperedToken = `${fakePayload}.${signature}`

      const result = validatePublicToken(tamperedToken)
      expect(result).toBeNull()
    })

    it('rechaza token expirado', () => {
      // Generar token que expire en -1 día (ya expirado)
      const token = generatePublicToken(unitId, condominiumId, -1)
      const result = validatePublicToken(token)
      expect(result).toBeNull()
    })

    it('rechaza token vacío', () => {
      expect(validatePublicToken('')).toBeNull()
    })

    it('rechaza token sin punto separador', () => {
      expect(validatePublicToken('tokensinpunto')).toBeNull()
    })

    it('rechaza token con múltiples puntos', () => {
      expect(validatePublicToken('a.b.c')).toBeNull()
    })

    it('retorna expiresAt como Unix timestamp futuro (30 días default)', () => {
      const token = generatePublicToken(unitId, condominiumId)
      const payload = validatePublicToken(token)

      const now = Math.floor(Date.now() / 1000)
      const thirtyDaysFromNow = now + 30 * 86400

      // El expiresAt debe estar a ~30 días de ahora (tolerancia de 10 segundos)
      expect(Math.abs(payload!.expiresAt - thirtyDaysFromNow)).toBeLessThan(10)
    })
  })

  describe('getPublicUrl', () => {
    it('genera URL completa correcta', () => {
      const token = 'test-token-abc123'
      const url = getPublicUrl('https://app.edifika.com', token)

      expect(url).toBe('https://app.edifika.com/public/estado-cuenta/test-token-abc123')
    })

    it('funciona con URL base sin trailing slash', () => {
      const url = getPublicUrl('http://localhost:3000', 'token')
      expect(url).toBe('http://localhost:3000/public/estado-cuenta/token')
    })
  })

  describe('Integración: generar -> validar ciclo completo', () => {
    it('un token generado puede ser validado exitosamente', () => {
      const token = generatePublicToken(unitId, condominiumId, 7)
      const result = validatePublicToken(token)

      expect(result).not.toBeNull()
      expect(result!.unitId).toBe(unitId)
      expect(result!.condominiumId).toBe(condominiumId)
    })

    it('tokens con distintas secrets no se pueden validar cruzado', () => {
      // Generar con secret 1
      const token = generatePublicToken(unitId, condominiumId)

      // Cambiar secret
      vi.stubEnv('LINK_SIGNING_SECRET', 'completely-different-secret-key')

      // Intentar validar con secret 2
      const result = validatePublicToken(token)
      expect(result).toBeNull()
    })
  })
})
