# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-production-health.spec.ts >> 01 - Production Health & Headers >> Serves 200 OK and loads application root with CSP and titles
- Location: e2e/01-production-health.spec.ts:4:3

# Error details

```
Error: expect(received).toBeDefined()

Received: undefined
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button "BCV BINGO CLUB VNZLA" [ref=e7] [cursor=pointer]:
        - generic [ref=e8]: BCV
        - generic [ref=e9]: BINGO CLUB VNZLA
      - navigation [ref=e10]:
        - button "Inicio" [ref=e11] [cursor=pointer]
        - button "Sala en Vivo" [ref=e12] [cursor=pointer]
        - link "Modalidades" [ref=e15] [cursor=pointer]:
          - /url: "#modalidades"
        - link "Cómo jugar" [ref=e16] [cursor=pointer]:
          - /url: "#como-jugar"
        - link "Ayuda" [ref=e17] [cursor=pointer]:
          - /url: "#ayuda"
      - generic [ref=e19]:
        - button "INICIAR SESIÓN" [ref=e20] [cursor=pointer]
        - button "REGISTRARME" [ref=e21] [cursor=pointer]
  - main [ref=e22]:
    - generic [ref=e23]:
      - generic [ref=e25]:
        - img "Bingo Club Venezuela Lounge" [ref=e27]
        - generic [ref=e30]:
          - generic [ref=e31]:
            - generic [ref=e32]: Lobby Oficial · Tradición y Tecnología Criolla
            - heading "BINGO CLUB VNZLA" [level=1] [ref=e37]
            - paragraph [ref=e38]: Bingo venezolano en vivo
            - paragraph [ref=e39]:
              - text: Bienvenido al lobby de
              - strong [ref=e40]: BINGO CLUB VNZLA
              - text: . La plataforma digital oficial de sorteos en tiempo real con cinco modalidades tradicionales, locutor de tómbola y validación criptográfica instantánea.
            - generic [ref=e41]:
              - button "ENTRAR AL JUEGO" [ref=e42] [cursor=pointer]
              - link "VER MODALIDADES" [ref=e46] [cursor=pointer]:
                - /url: "#modalidades"
              - button "¿No tienes cuenta? Regístrate gratis" [ref=e50] [cursor=pointer]
            - generic [ref=e54]:
              - generic [ref=e55]: Sorteos en Directo
              - generic [aria-hidden] [ref=e63]: ·
              - generic [ref=e64]: 5 Modalidades Oficiales
              - generic [aria-hidden] [ref=e68]: ·
              - generic [ref=e69]: Validación Server-Side
              - generic [aria-hidden] [ref=e74]: ·
              - generic [ref=e75]: Identidad Privada BCV
          - generic [ref=e81]:
            - generic [ref=e82]:
              - generic [ref=e83]: Tómbola Oficial
              - generic [ref=e86]: En Directo
            - generic [ref=e87]:
              - generic [ref=e88]:
                - generic [ref=e89]: "75"
                - generic [ref=e90]: Bingo 75
              - generic [ref=e91]:
                - generic [ref=e92]: B4
                - generic [ref=e93]: Cantada
              - generic [ref=e94]:
                - generic [ref=e95]: "90"
                - generic [ref=e96]: Bingo 90
            - generic [ref=e97]:
              - paragraph [ref=e98]: Locución oficial en tiempo real con reglas venezolanas
              - paragraph [ref=e99]: Animalitos, Objetos Criollos, Chapitas y Bingo Clásico
            - button "SINTONIZAR SALA EN VIVO" [ref=e100] [cursor=pointer]
      - generic [ref=e109]:
        - generic [ref=e110]:
          - generic [ref=e111]:
            - heading "Salas y Sorteos Oficiales" [level=2] [ref=e115]
            - paragraph [ref=e116]: Estado Actual de Sorteos en la Plataforma
          - button "Acceder a la Sala Principal" [ref=e117] [cursor=pointer]
        - generic [ref=e123]:
          - heading "No hay sorteos activos en este momento" [level=3] [ref=e128]
          - paragraph [ref=e129]: Los sorteos oficiales se transmiten de forma programada. Puedes explorar las 5 modalidades o ingresar a la sala para conocer el sistema de extracción.
          - button "Conocer la Sala en Vivo" [ref=e130] [cursor=pointer]
      - generic [ref=e132]:
        - generic [ref=e133]:
          - generic [ref=e134]:
            - heading "Catálogo Oficial" [level=2] [ref=e135]
            - heading "Modalidades de Bingo Tradicional" [level=3] [ref=e136]
            - paragraph [ref=e137]: Cinco modalidades venezolanas diseñadas con reglas claras y balanceadas para garantizar transparencia y emoción.
          - button "Ver sala en vivo" [ref=e138] [cursor=pointer]
        - generic [ref=e144]:
          - generic [ref=e145] [cursor=pointer]:
            - generic [ref=e147]:
              - generic [ref=e152]:
                - generic [ref=e153]: 5x5
                - text: ·
                - generic [ref=e154]: 75 balotas
              - generic [ref=e155]:
                - heading "Bingo 75 Clásico" [level=3] [ref=e156]
                - paragraph [ref=e157]: 5x5 Centro Libre · 75 Balotas
                - paragraph [ref=e158]: Modalidad tradicional con cartón de 5x5, números del 1 al 75 y centro libre.
            - generic [ref=e159]:
              - generic [ref=e160]:
                - generic [ref=e161]: Línea 25% · Cartón Lleno 75%
                - generic [ref=e162]: Centro Libre
              - generic [ref=e163]:
                - button "JUGAR SALA" [ref=e164]
                - button "Detalles" [ref=e168]
          - generic [ref=e169] [cursor=pointer]:
            - generic [ref=e171]:
              - generic [ref=e177]:
                - generic [ref=e178]: 3x9
                - text: ·
                - generic [ref=e179]: 90 balotas
              - generic [ref=e180]:
                - heading "Bingo 90 Bolas" [level=3] [ref=e181]
                - paragraph [ref=e182]: 3x9 · 15 Números · 90 Balotas
                - paragraph [ref=e183]: Modalidad oficial de 90 números con cartón de 3 filas y 9 columnas con 15 números por cartón.
            - generic [ref=e184]:
              - generic [ref=e185]:
                - generic [ref=e186]: Sin Línea · Quiniela / Cartón Lleno
                - generic [ref=e187]: Sin libre
              - generic [ref=e188]:
                - button "JUGAR SALA" [ref=e189]
                - button "Detalles" [ref=e193]
          - generic [ref=e194] [cursor=pointer]:
            - generic [ref=e196]:
              - generic [ref=e202]:
                - generic [ref=e203]: 5x5
                - text: ·
                - generic [ref=e204]: 75 balotas
              - generic [ref=e205]:
                - heading "Bingo de los Animalitos" [level=3] [ref=e206]
                - paragraph [ref=e207]: 5x5 Centro Libre · 75 Animalitos
                - paragraph [ref=e208]: La tradición oficial de 75 animalitos de la suerte en cuadrícula 5x5 con centro libre.
            - generic [ref=e209]:
              - generic [ref=e210]:
                - generic [ref=e211]: Catálogo Oficial de los 75 Animalitos
                - generic [ref=e212]: Centro Libre
              - generic [ref=e213]:
                - button "JUGAR SALA" [ref=e214]
                - button "Detalles" [ref=e218]
          - generic [ref=e219] [cursor=pointer]:
            - generic [ref=e221]:
              - generic [ref=e228]:
                - generic [ref=e229]: 5x5
                - text: ·
                - generic [ref=e230]: 75 balotas
              - generic [ref=e231]:
                - heading "Bingo Objetos Criollos" [level=3] [ref=e232]
                - paragraph [ref=e233]: 5x5 Centro Libre · 75 Iconos Criollos
                - paragraph [ref=e234]: 75 iconos y símbolos representativos de la venezolanidad en cuadrícula 5x5 con centro libre.
            - generic [ref=e235]:
              - generic [ref=e236]:
                - generic [ref=e237]: Símbolos Tradicionales de Venezolanidad
                - generic [ref=e238]: Centro Libre
              - generic [ref=e239]:
                - button "JUGAR SALA" [ref=e240]
                - button "Detalles" [ref=e244]
          - generic [ref=e245] [cursor=pointer]:
            - generic [ref=e247]:
              - generic [ref=e253]:
                - generic [ref=e254]: 3x9
                - text: ·
                - generic [ref=e255]: 90 balotas
              - generic [ref=e256]:
                - heading "Bingo Chapitas Tradicional" [level=3] [ref=e257]
                - paragraph [ref=e258]: 3x9 · 90 Posiciones (45+45)
                - paragraph [ref=e259]: Modalidad oficial de 90 números conformada por 45 animalitos y 45 objetos tradicionales venezolanos.
            - generic [ref=e260]:
              - generic [ref=e261]:
                - generic [ref=e262]: 45 Animalitos + 45 Objetos Oficiales
                - generic [ref=e263]: Sin libre
              - generic [ref=e264]:
                - button "JUGAR SALA" [ref=e265]
                - button "Detalles" [ref=e269]
      - generic [ref=e271]:
        - generic [ref=e272]:
          - heading "Paso a Paso" [level=2] [ref=e273]
          - heading "Cómo Participar en Bingo Club" [level=3] [ref=e274]
          - paragraph [ref=e275]: Participar en nuestras salas es rápido, seguro y entretenido. Sigue estos tres pasos para comenzar.
        - generic [ref=e276]:
          - generic [ref=e277]:
            - generic [ref=e278]: "1"
            - heading "Elige tu Modalidad" [level=4] [ref=e279]
            - paragraph [ref=e280]: "Selecciona tu juego favorito: Bingo 75, Bingo 90, Animalitos, Objetos Criollos o Chapitas. Consulta el horario de la próxima partida e ingresa a la sala activa."
          - generic [ref=e281]:
            - generic [ref=e282]: "2"
            - heading "Obtén tus Cartones" [level=4] [ref=e283]
            - paragraph [ref=e284]: Cada cartón cuenta con numeración oficial y serie exclusiva vinculada a tu cuenta. Podrás consultar todos tus cartones directamente en tu panel antes de que inicie la partida.
          - generic [ref=e285]:
            - generic [ref=e286]: "3"
            - heading "Canta Bingo en Vivo" [level=4] [ref=e287]
            - paragraph [ref=e288]: Sigue la extracción en tiempo real con locución del cantador y marcador automático. Si completas línea o bingo, el sistema verifica y anuncia al ganador al instante.
      - generic [ref=e290]:
        - generic [ref=e291]:
          - heading "Seguridad y Transparencia" [level=2] [ref=e292]
          - heading "Protección para Todos los Jugadores" [level=3] [ref=e293]
          - paragraph [ref=e294]: Sorteos verificables, cuentas protegidas y operaciones controladas por el servidor para tu tranquilidad.
        - generic [ref=e295]:
          - generic [ref=e296]:
            - heading "Sorteos Verificables" [level=4] [ref=e301]
            - paragraph [ref=e302]: Cada extracción es oficial y sincronizada para todos los jugadores en la sala al mismo tiempo.
          - generic [ref=e303]:
            - heading "Cuentas Protegidas" [level=4] [ref=e308]
            - paragraph [ref=e309]: Tus credenciales y sesiones están protegidas con los más altos estándares de autenticación.
          - generic [ref=e310]:
            - heading "Identidad Privada" [level=4] [ref=e315]
            - paragraph [ref=e316]: Tu usuario cuenta con un identificador público seguro (BCV-XXXXXX) para mantener confidencial tu correo y datos.
          - generic [ref=e317]:
            - heading "Juego Responsable" [level=4] [ref=e321]
            - paragraph [ref=e322]: Plataforma concebida para entretenimiento de mayores de 18 años con prácticas de juego ético y transparente.
      - generic [ref=e326]:
        - generic [ref=e327]: Compromiso de Comunidad
        - heading "Juego Responsable y Recreativo" [level=3] [ref=e332]
        - paragraph [ref=e333]: En Bingo Club Venezuela promovemos el entretenimiento recreativo entre amigos y familiares. El juego es exclusivo para mayores de 18 años. Juega con moderación y disfruta la tradición del bingo venezolano.
        - generic [ref=e334]:
          - generic [ref=e335]: +18 Años Solamente
          - generic [aria-hidden] [ref=e336]: ·
          - generic [ref=e337]: Entretenimiento Familiar
          - generic [aria-hidden] [ref=e338]: ·
          - generic [ref=e339]: Ambiente Seguro
      - generic [ref=e341]:
        - generic [ref=e342]:
          - heading "Centro de Ayuda" [level=2] [ref=e343]
          - heading "Preguntas Frecuentes" [level=3] [ref=e344]
        - generic [ref=e345]:
          - button "¿Cómo participo en una partida de Bingo Club Venezuela?" [ref=e347] [cursor=pointer]
          - button "¿Cuáles modalidades de bingo están disponibles?" [ref=e352] [cursor=pointer]
          - button "¿Cómo se verifica si un cartón es ganador?" [ref=e357] [cursor=pointer]
          - button "¿En qué dispositivos puedo jugar?" [ref=e362] [cursor=pointer]
          - button "¿Cómo se protege mi privacidad y mi cuenta?" [ref=e367] [cursor=pointer]
      - generic [ref=e372]:
        - generic [ref=e373]:
          - generic [ref=e374]:
            - generic [ref=e375]: BCV
            - generic [ref=e376]:
              - text: BINGO CLUB VNZLA
              - generic [ref=e377]: Bingo venezolano en vivo
          - navigation [ref=e378]:
            - button "Inicio" [ref=e379] [cursor=pointer]
            - link "Modalidades" [ref=e380] [cursor=pointer]:
              - /url: "#modalidades"
            - link "Cómo jugar" [ref=e381] [cursor=pointer]:
              - /url: "#como-jugar"
            - link "Seguridad" [ref=e382] [cursor=pointer]:
              - /url: "#seguridad"
            - link "Ayuda" [ref=e383] [cursor=pointer]:
              - /url: "#ayuda"
        - generic [ref=e384]:
          - generic [ref=e385]: © 2026 BINGO CLUB VNZLA. Todos los derechos reservados. Plataforma oficial de bingo digital.
          - generic [ref=e386]:
            - generic [ref=e387]: Términos y Condiciones
            - generic [aria-hidden] [ref=e388]: ·
            - generic [ref=e389]: Política de Privacidad
            - generic [aria-hidden] [ref=e390]: ·
            - generic [ref=e391]: Juego Responsable +18
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('01 - Production Health & Headers', () => {
  4  |   test('Serves 200 OK and loads application root with CSP and titles', async ({ page }) => {
  5  |     const response = await page.goto('/');
  6  |     expect(response?.status()).toBe(200);
  7  | 
  8  |     // Title verification
  9  |     await expect(page).toHaveTitle(/Bingo Club Venezuela/i);
  10 | 
  11 |     // Header validations
  12 |     const headers = response?.headers();
> 13 |     expect(headers?.['content-security-policy']).toBeDefined();
     |                                                  ^ Error: expect(received).toBeDefined()
  14 |     expect(headers?.['content-security-policy']).toContain('challenges.cloudflare.com');
  15 |     expect(headers?.['content-security-policy']).toContain('supabase.co');
  16 | 
  17 |     // Root mounted
  18 |     const root = page.locator('#root');
  19 |     await expect(root).toBeAttached();
  20 |   });
  21 | });
  22 | 
```