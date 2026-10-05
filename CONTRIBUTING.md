# Guía de Contribución — Bingo Club VNZLA Online

Agradecemos el interés en colaborar con la plataforma oficial de Bingo Club Venezuela Online. Para mantener los más altos estándares de calidad, seguridad y cumplimiento, por favor siga estas directrices:

## Flujo de Trabajo
1. Cree un branch con nombre descriptivo: `feature/nombre-modulo` o `fix/descripcion-error`.
2. Escriba código TypeScript estricto. No utilice `any` ni `// @ts-ignore`.
3. Verifique que no se incluyan credenciales privadas ni datos simulados presentados como reales.
4. Asegúrese de que todas las pruebas pasen:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
5. Todas las migraciones de base de datos deben almacenarse en `supabase/migrations/` con timestamp secuencial y políticas RLS obligatorias.

## Principios de Diseño
- Respete la constitución de diseño sin componentes genéricos de baja calidad ("zero-pill discipline", visuales de alta fidelidad, contrastes WCAG AA).
- La interfaz no debe contener funciones "TODO" ni botones muertos. Cuando una función pertenezca a una fase futura, debe indicarse con claridad el estado oficial de la plataforma ("Disponible en Fase 2").
