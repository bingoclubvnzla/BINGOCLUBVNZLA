# Política de Seguridad — Bingo Club Venezuela Online

## Principio Fundamental de Seguridad
En **Bingo Club VNZLA Online**, el navegador del cliente **NUNCA** es una autoridad.
El cliente jamás decide ni tiene control sobre:
- Saldo en billetera ni transacciones
- Premios asignados o probabilidades
- Números extraídos en las tómbolas
- Ganadores oficiales ni reclamos de cartones
- Propiedad de cartones ni números asignados
- Roles ni permisos de seguridad (RBAC)

Toda operación crítica es ejecutada de forma **Server-Authoritative** mediante PostgreSQL y Supabase con Row Level Security (RLS) estricto.

---

## Directrices de Seguridad para Desarrolladores
1. **Sin secretos en el Frontend**: La clave `service_role` jamás debe existir en el código de Vite o ser importada en el frontend. Únicamente se utiliza la `anon / publishable key` restringida por RLS.
2. **Sin archivos .env en el repositorio**: El archivo `.gitignore` prohíbe explícitamente subir archivos `.env` o credenciales.
3. **Idempotencia Obligatoria**: Toda mutación en balances, asignación de cartones y sorteos implementará claves de idempotencia (`idempotency_key`) para evitar ejecuciones repetidas.
4. **Auditoría Continua**: Cada acción de operador, supervisor o administrador se registra de forma inmutable en la tabla `audit_logs`.

---

## Reporte de Vulnerabilidades
Si detectas una posible vulnerabilidad de seguridad en esta plataforma:
1. Envía un correo electrónico detallado a: `security@bingoclub.com.ve`
2. No divulgues públicamente la vulnerabilidad hasta que haya sido validada y mitigada.
3. Proporciona pasos de reproducción, impacto potencial y detalles del entorno.
