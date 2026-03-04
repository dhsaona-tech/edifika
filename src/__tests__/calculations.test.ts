import { describe, it, expect } from 'vitest'
import { distribuir, distribuirConsumo } from '@/lib/charges/calculations'

describe('Motor de Cálculo de Cargos', () => {
  const unidades = [
    { unit_id: 'u1', unit_name: 'Depto 101', aliquot: 25, contact_name: 'Juan' },
    { unit_id: 'u2', unit_name: 'Depto 102', aliquot: 25, contact_name: 'María' },
    { unit_id: 'u3', unit_name: 'Depto 201', aliquot: 30, contact_name: 'Carlos' },
    { unit_id: 'u4', unit_name: 'Depto 202', aliquot: 20, contact_name: 'Ana' },
  ]

  describe('distribuir - método igualitario', () => {
    it('distribuye montos iguales entre todas las unidades', () => {
      const result = distribuir(unidades, 1000, 'igualitario')

      expect(result).toHaveLength(4)
      result.forEach(item => {
        expect(item.final_amount).toBe(250)
        expect(item.suggested_amount).toBe(250)
        expect(item.include).toBe(true)
      })
    })

    it('maneja correctamente montos no divisibles exactamente', () => {
      const result = distribuir(unidades, 100, 'igualitario')

      expect(result).toHaveLength(4)
      result.forEach(item => {
        expect(item.final_amount).toBe(25)
      })
    })

    it('maneja montos con decimales (redondeo a 2 decimales)', () => {
      const result = distribuir(
        [
          { unit_id: 'u1', unit_name: 'A', aliquot: 50 },
          { unit_id: 'u2', unit_name: 'B', aliquot: 50 },
          { unit_id: 'u3', unit_name: 'C', aliquot: 50 },
        ],
        100,
        'igualitario'
      )

      expect(result).toHaveLength(3)
      // 100 / 3 = 33.333... -> redondeado a 33.33
      result.forEach(item => {
        expect(item.final_amount).toBe(33.33)
      })
    })

    it('retorna array vacío para lista vacía de unidades', () => {
      const result = distribuir([], 1000, 'igualitario')
      expect(result).toHaveLength(0)
    })

    it('maneja monto total de cero', () => {
      const result = distribuir(unidades, 0, 'igualitario')
      result.forEach(item => {
        expect(item.final_amount).toBe(0)
      })
    })
  })

  describe('distribuir - método por alícuota', () => {
    it('distribuye proporcionalmente según alícuota', () => {
      const result = distribuir(unidades, 1000, 'por_aliquota')

      expect(result).toHaveLength(4)
      // Total alícuotas = 25+25+30+20 = 100
      expect(result[0].final_amount).toBe(250)  // 25% de 1000
      expect(result[1].final_amount).toBe(250)  // 25% de 1000
      expect(result[2].final_amount).toBe(300)  // 30% de 1000
      expect(result[3].final_amount).toBe(200)  // 20% de 1000
    })

    it('maneja unidades sin alícuota (null/undefined)', () => {
      const sinAliquota = [
        { unit_id: 'u1', unit_name: 'A', aliquot: null },
        { unit_id: 'u2', unit_name: 'B', aliquot: 100 },
      ]
      const result = distribuir(sinAliquota, 1000, 'por_aliquota')

      expect(result[0].final_amount).toBe(0)     // null aliquot = 0
      expect(result[1].final_amount).toBe(1000)   // 100% del total
    })

    it('normaliza alícuotas que no suman 100', () => {
      // Alícuotas: 10 + 20 = 30 (no suman 100)
      const units = [
        { unit_id: 'u1', unit_name: 'A', aliquot: 10 },
        { unit_id: 'u2', unit_name: 'B', aliquot: 20 },
      ]
      const result = distribuir(units, 300, 'por_aliquota')

      // 10/30 * 300 = 100, 20/30 * 300 = 200
      expect(result[0].final_amount).toBe(100)
      expect(result[1].final_amount).toBe(200)
    })

    it('la suma de montos distribuidos se aproxima al total', () => {
      const result = distribuir(unidades, 999.99, 'por_aliquota')
      const totalDistribuido = result.reduce((sum, r) => sum + r.final_amount, 0)

      // Permitir error de redondeo de hasta 1 centavo por unidad
      expect(Math.abs(totalDistribuido - 999.99)).toBeLessThan(0.05)
    })

    it('preserva metadata de unidad en el resultado', () => {
      const result = distribuir(unidades, 1000, 'por_aliquota')

      expect(result[0].unit_id).toBe('u1')
      expect(result[0].unit_name).toBe('Depto 101')
      expect(result[0].contact_name).toBe('Juan')
      expect(result[0].aliquot).toBe(25)
    })
  })

  describe('distribuirConsumo', () => {
    it('calcula cargos basados en consumo y tarifa', () => {
      const consumos = [
        { unit_id: 'u1', unit_name: 'Depto 101', consumo: 15, contact_name: 'Juan' },
        { unit_id: 'u2', unit_name: 'Depto 102', consumo: 20, contact_name: 'María' },
        { unit_id: 'u3', unit_name: 'Depto 201', consumo: 0, contact_name: 'Carlos' },
      ]
      const tarifa = 0.50 // $0.50 por unidad de consumo

      const result = distribuirConsumo(consumos, tarifa)

      expect(result).toHaveLength(3)
      expect(result[0].final_amount).toBe(7.50)   // 15 * 0.50
      expect(result[1].final_amount).toBe(10.00)   // 20 * 0.50
      expect(result[2].final_amount).toBe(0)        // 0 * 0.50
    })

    it('preserva campo consumption en el resultado', () => {
      const consumos = [
        { unit_id: 'u1', unit_name: 'A', consumo: 42.5 },
      ]
      const result = distribuirConsumo(consumos, 1)

      expect(result[0].consumption).toBe(42.5)
    })

    it('redondea correctamente a 2 decimales', () => {
      const consumos = [
        { unit_id: 'u1', unit_name: 'A', consumo: 7 },
      ]
      // 7 * 0.33 = 2.31
      const result = distribuirConsumo(consumos, 0.33)

      expect(result[0].final_amount).toBe(2.31)
    })

    it('maneja tarifa cero', () => {
      const consumos = [
        { unit_id: 'u1', unit_name: 'A', consumo: 100 },
      ]
      const result = distribuirConsumo(consumos, 0)
      expect(result[0].final_amount).toBe(0)
    })
  })
})
