import { describe, it, expect } from 'vitest'
import {
  validateCedula,
  validateRUC,
  validatePasaporte,
  validateDocument,
  validateNumberRange,
  validateRequired,
} from '@/lib/validations'

describe('Validaciones de Documentos Ecuatorianos', () => {
  describe('validateCedula', () => {
    it('acepta cédula válida de 10 dígitos', () => {
      const result = validateCedula('1712345678')
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('rechaza cédula vacía', () => {
      const result = validateCedula('')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('obligatoria')
    })

    it('rechaza cédula con letras', () => {
      const result = validateCedula('17abc45678')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('solo debe contener números')
    })

    it('rechaza cédula con menos de 10 dígitos', () => {
      const result = validateCedula('123456789')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('10 dígitos')
    })

    it('rechaza cédula con más de 10 dígitos', () => {
      const result = validateCedula('12345678901')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('10 dígitos')
    })

    it('rechaza cédula null/undefined', () => {
      const result = validateCedula(null as unknown as string)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateRUC', () => {
    it('acepta RUC válido de 13 dígitos', () => {
      const result = validateRUC('1712345678001')
      expect(result.isValid).toBe(true)
    })

    it('rechaza RUC vacío', () => {
      const result = validateRUC('')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('obligatorio')
    })

    it('rechaza RUC con letras', () => {
      const result = validateRUC('171234567800A')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('solo debe contener números')
    })

    it('rechaza RUC con longitud incorrecta', () => {
      const result = validateRUC('1712345678')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('13 dígitos')
    })
  })

  describe('validatePasaporte', () => {
    it('acepta pasaporte válido (6+ caracteres)', () => {
      const result = validatePasaporte('AB1234')
      expect(result.isValid).toBe(true)
    })

    it('rechaza pasaporte vacío', () => {
      const result = validatePasaporte('')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('obligatorio')
    })

    it('rechaza pasaporte corto (menos de 6 caracteres)', () => {
      const result = validatePasaporte('AB12')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('al menos 6')
    })
  })

  describe('validateDocument (dispatcher)', () => {
    it('despacha correctamente a validateCedula', () => {
      const result = validateDocument('1712345678', 'CEDULA')
      expect(result.isValid).toBe(true)
    })

    it('despacha correctamente a validateRUC', () => {
      const result = validateDocument('1712345678001', 'RUC')
      expect(result.isValid).toBe(true)
    })

    it('despacha correctamente a validatePasaporte', () => {
      const result = validateDocument('AB1234', 'PASAPORTE')
      expect(result.isValid).toBe(true)
    })

    it('rechaza tipo de documento desconocido', () => {
      const result = validateDocument('123', 'DNI' as any)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('no válido')
    })
  })

  describe('validateNumberRange', () => {
    it('acepta número dentro del rango', () => {
      const result = validateNumberRange(50, 0, 100, 'Porcentaje')
      expect(result.isValid).toBe(true)
    })

    it('acepta string numérica dentro del rango', () => {
      const result = validateNumberRange('75.5', 0, 100, 'Porcentaje')
      expect(result.isValid).toBe(true)
    })

    it('rechaza número menor al mínimo', () => {
      const result = validateNumberRange(-1, 0, 100, 'Porcentaje')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('mayor o igual a 0')
    })

    it('rechaza número mayor al máximo', () => {
      const result = validateNumberRange(101, 0, 100, 'Porcentaje')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('menor o igual a 100')
    })

    it('rechaza valor no numérico', () => {
      const result = validateNumberRange('abc', 0, 100, 'Porcentaje')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('número válido')
    })
  })

  describe('validateRequired', () => {
    it('acepta valor no vacío', () => {
      const result = validateRequired('texto', 'Campo')
      expect(result.isValid).toBe(true)
    })

    it('rechaza string vacía', () => {
      const result = validateRequired('', 'Nombre')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Nombre')
    })

    it('rechaza null', () => {
      const result = validateRequired(null, 'Nombre')
      expect(result.isValid).toBe(false)
    })

    it('rechaza undefined', () => {
      const result = validateRequired(undefined, 'Nombre')
      expect(result.isValid).toBe(false)
    })

    it('rechaza string con solo espacios', () => {
      const result = validateRequired('   ', 'Nombre')
      expect(result.isValid).toBe(false)
    })
  })
})
