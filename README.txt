PARTE B - CONTROL DE DESPACHOS

Archivos: index.html, styles.css, app.js, config.example.js y supabase.sql.

1. Crear proyecto en Supabase y ejecutar supabase.sql.
2. Copiar config.example.js como config.js y completar URL de Supabase, anon key y URL del webhook de Make.
3. Subir la carpeta a Netlify o abrirla localmente.
4. Crear en Make el webhook y la lógica de consulta, cálculo, rutas y escritura.

La interfaz solo lee inventario/historial con la anon key. No poner nunca la service_role en el frontend. Las escrituras deben quedar en Make.

Respuesta recomendada de Make: {"resultado":"APROBADO","mensaje":"Despacho procesado correctamente","codigo_producto":"INS-0101","cantidad":10,"existencia_antes":48,"existencia_despues":38}.