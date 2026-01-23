# Logo de EDIFIKA

## 📋 Instrucciones para subir el logo

### Paso 1: Prepara tu logo
- El logo debe ser **horizontal** (más ancho que alto)
- Formatos soportados: **PNG, JPG, SVG, WEBP**
- Tamaño recomendado: mínimo **200px de ancho**
- El logo debe incluir el icono y el texto "EDIFIKA" con "Administración Inteligente"

### Paso 2: Sube el archivo
1. Coloca tu archivo de logo en esta carpeta: `public/logos/`
2. **Nombra el archivo exactamente como:** `edifika-logo.png`
   - Si tu logo es JPG, nómbralo: `edifika-logo.jpg`
   - Si tu logo es SVG, nómbralo: `edifika-logo.svg`
   - Si tu logo es WEBP, nómbralo: `edifika-logo.webp`

### Paso 3: Verifica
- El archivo debe estar en: `public/logos/edifika-logo.png` (o la extensión que uses)
- Reinicia el servidor de desarrollo si es necesario
- El logo aparecerá automáticamente en todos los PDFs

## 📍 Ubicación del logo en los PDFs

El logo se mostrará en el **pie de página (footer)** de:
- ✅ Comprobantes de Pago (Ingresos/Receipts)
- ✅ Comprobantes de Egreso (Egresses)

El logo aparecerá en la parte **derecha del footer**, junto con la información del condominio a la izquierda.

## ⚠️ Nota importante

Si el logo no aparece:
1. Verifica que el archivo esté en `public/logos/`
2. Verifica que el nombre sea exactamente `edifika-logo.png` (o la extensión correcta)
3. Reinicia el servidor de desarrollo: `npm run dev`
