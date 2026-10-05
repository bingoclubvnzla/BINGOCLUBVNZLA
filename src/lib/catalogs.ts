// ==============================================================================
// BINGO CLUB VNZLA ONLINE — CATÁLOGOS OFICIALES DE MODALIDADES (FASE 2.3)
// Definición oficial y definitiva:
// - BINGO_75: 75 números (1-75), matrices 5x5, centro libre, B-I-N-G-O.
// - BINGO_90: 90 números (1-90), matrices 3x9, 15 números por cartón.
// - ANIMALITOS: exactamente 75 números (1-75), 75 animales registrados.
// - OBJETOS: exactamente 75 números (1-75), 75 objetos registrados.
// - CHAPITAS: exactamente 90 números (1-90), 45 animales + 45 objetos oficiales.
// Cada elemento posee: id, nombre, numero, tts_name, asset_key, activo.
// ==============================================================================

export interface CatalogItem {
  id: string;
  nombre: string;
  numero: number;
  tts_name: string;
  tts_article?: string;
  tts_phrase?: string;
  asset_key: string;
  activo: boolean;
}

export interface ChapitasItem {
  chapitas_number: number; // 1 a 90
  source_type: 'ANIMAL' | 'OBJECT';
  source_catalog_id: string; // 'ani-1'..'ani-45' o 'obj-1'..'obj-45'
  source_number: number;
  nombre: string;
  tts_name: string;
  tts_article: string;
  tts_phrase: string;
  asset_key: string;
  activo: boolean;
}

// ==============================================================================
// 1. CATÁLOGO OFICIAL: ANIMALITOS (EXACTAMENTE 75 ANIMALES REGISTRADOS, RANGO 1-75)
// ==============================================================================
export const ANIMALITOS_CATALOG: CatalogItem[] = [
  { id: 'ani-1', nombre: 'Delfín', numero: 1, tts_name: 'Delfín', tts_article: 'El', tts_phrase: 'El Delfín', asset_key: 'delfin', activo: true },
  { id: 'ani-2', nombre: 'Carnero', numero: 2, tts_name: 'Carnero', tts_article: 'El', tts_phrase: 'El Carnero', asset_key: 'carnero', activo: true },
  { id: 'ani-3', nombre: 'Toro', numero: 3, tts_name: 'Toro', tts_article: 'El', tts_phrase: 'El Toro', asset_key: 'toro', activo: true },
  { id: 'ani-4', nombre: 'Ciempiés', numero: 4, tts_name: 'Ciempiés', tts_article: 'El', tts_phrase: 'El Ciempiés', asset_key: 'ciempies', activo: true },
  { id: 'ani-5', nombre: 'Alacrán', numero: 5, tts_name: 'Alacrán', tts_article: 'El', tts_phrase: 'El Alacrán', asset_key: 'alacran', activo: true },
  { id: 'ani-6', nombre: 'León', numero: 6, tts_name: 'León', tts_article: 'El', tts_phrase: 'El León', asset_key: 'leon', activo: true },
  { id: 'ani-7', nombre: 'Rana', numero: 7, tts_name: 'Rana', tts_article: 'La', tts_phrase: 'La Rana', asset_key: 'rana', activo: true },
  { id: 'ani-8', nombre: 'Perico', numero: 8, tts_name: 'Perico', tts_article: 'El', tts_phrase: 'El Perico', asset_key: 'perico', activo: true },
  { id: 'ani-9', nombre: 'Ratón', numero: 9, tts_name: 'Ratón', tts_article: 'El', tts_phrase: 'El Ratón', asset_key: 'raton', activo: true },
  { id: 'ani-10', nombre: 'Águila', numero: 10, tts_name: 'Águila', tts_article: 'El', tts_phrase: 'El Águila', asset_key: 'aguila', activo: true },
  { id: 'ani-11', nombre: 'Tigre', numero: 11, tts_name: 'Tigre', tts_article: 'El', tts_phrase: 'El Tigre', asset_key: 'tigre', activo: true },
  { id: 'ani-12', nombre: 'Gato', numero: 12, tts_name: 'Gato', tts_article: 'El', tts_phrase: 'El Gato', asset_key: 'gato', activo: true },
  { id: 'ani-13', nombre: 'Caballo', numero: 13, tts_name: 'Caballo', tts_article: 'El', tts_phrase: 'El Caballo', asset_key: 'caballo', activo: true },
  { id: 'ani-14', nombre: 'Mono', numero: 14, tts_name: 'Mono', tts_article: 'El', tts_phrase: 'El Mono', asset_key: 'mono', activo: true },
  { id: 'ani-15', nombre: 'Paloma', numero: 15, tts_name: 'Paloma', tts_article: 'La', tts_phrase: 'La Paloma', asset_key: 'paloma', activo: true },
  { id: 'ani-16', nombre: 'Zorro', numero: 16, tts_name: 'Zorro', tts_article: 'El', tts_phrase: 'El Zorro', asset_key: 'zorro', activo: true },
  { id: 'ani-17', nombre: 'Oso', numero: 17, tts_name: 'Oso', tts_article: 'El', tts_phrase: 'El Oso', asset_key: 'oso', activo: true },
  { id: 'ani-18', nombre: 'Pavo', numero: 18, tts_name: 'Pavo', tts_article: 'El', tts_phrase: 'El Pavo', asset_key: 'pavo', activo: true },
  { id: 'ani-19', nombre: 'Burro', numero: 19, tts_name: 'Burro', tts_article: 'El', tts_phrase: 'El Burro', asset_key: 'burro', activo: true },
  { id: 'ani-20', nombre: 'Chivo', numero: 20, tts_name: 'Chivo', tts_article: 'El', tts_phrase: 'El Chivo', asset_key: 'chivo', activo: true },
  { id: 'ani-21', nombre: 'Cochino', numero: 21, tts_name: 'Cochino', tts_article: 'El', tts_phrase: 'El Cochino', asset_key: 'cochino', activo: true },
  { id: 'ani-22', nombre: 'Gallo', numero: 22, tts_name: 'Gallo', tts_article: 'El', tts_phrase: 'El Gallo', asset_key: 'gallo', activo: true },
  { id: 'ani-23', nombre: 'Camello', numero: 23, tts_name: 'Camello', tts_article: 'El', tts_phrase: 'El Camello', asset_key: 'camello', activo: true },
  { id: 'ani-24', nombre: 'Cebra', numero: 24, tts_name: 'Cebra', tts_article: 'La', tts_phrase: 'La Cebra', asset_key: 'cebra', activo: true },
  { id: 'ani-25', nombre: 'Iguana', numero: 25, tts_name: 'Iguana', tts_article: 'La', tts_phrase: 'La Iguana', asset_key: 'iguana', activo: true },
  { id: 'ani-26', nombre: 'Gallina', numero: 26, tts_name: 'Gallina', tts_article: 'La', tts_phrase: 'La Gallina', asset_key: 'gallina', activo: true },
  { id: 'ani-27', nombre: 'Vaca', numero: 27, tts_name: 'Vaca', tts_article: 'La', tts_phrase: 'La Vaca', asset_key: 'vaca', activo: true },
  { id: 'ani-28', nombre: 'Perro', numero: 28, tts_name: 'Perro', tts_article: 'El', tts_phrase: 'El Perro', asset_key: 'perro', activo: true },
  { id: 'ani-29', nombre: 'Zamuro', numero: 29, tts_name: 'Zamuro', tts_article: 'El', tts_phrase: 'El Zamuro', asset_key: 'zamuro', activo: true },
  { id: 'ani-30', nombre: 'Elefante', numero: 30, tts_name: 'Elefante', tts_article: 'El', tts_phrase: 'El Elefante', asset_key: 'elefante', activo: true },
  { id: 'ani-31', nombre: 'Caimán', numero: 31, tts_name: 'Caimán', tts_article: 'El', tts_phrase: 'El Caimán', asset_key: 'caiman', activo: true },
  { id: 'ani-32', nombre: 'Lapa', numero: 32, tts_name: 'Lapa', tts_article: 'La', tts_phrase: 'La Lapa', asset_key: 'lapa', activo: true },
  { id: 'ani-33', nombre: 'Ardilla', numero: 33, tts_name: 'Ardilla', tts_article: 'La', tts_phrase: 'La Ardilla', asset_key: 'ardilla', activo: true },
  { id: 'ani-34', nombre: 'Pescado', numero: 34, tts_name: 'Pescado', tts_article: 'El', tts_phrase: 'El Pescado', asset_key: 'pescado', activo: true },
  { id: 'ani-35', nombre: 'Venado', numero: 35, tts_name: 'Venado', tts_article: 'El', tts_phrase: 'El Venado', asset_key: 'venado', activo: true },
  { id: 'ani-36', nombre: 'Jirafa', numero: 36, tts_name: 'Jirafa', tts_article: 'La', tts_phrase: 'La Jirafa', asset_key: 'jirafa', activo: true },
  { id: 'ani-37', nombre: 'Culebra', numero: 37, tts_name: 'Culebra', tts_article: 'La', tts_phrase: 'La Culebra', asset_key: 'culebra', activo: true },
  { id: 'ani-38', nombre: 'Ballena', numero: 38, tts_name: 'Ballena', tts_article: 'La', tts_phrase: 'La Ballena', asset_key: 'ballena', activo: true },
  { id: 'ani-39', nombre: 'Chigüire', numero: 39, tts_name: 'Chigüire', tts_article: 'El', tts_phrase: 'El Chigüire', asset_key: 'chiguire', activo: true },
  { id: 'ani-40', nombre: 'Cunaguaro', numero: 40, tts_name: 'Cunaguaro', tts_article: 'El', tts_phrase: 'El Cunaguaro', asset_key: 'cunaguaro', activo: true },
  { id: 'ani-41', nombre: 'Guacamaya', numero: 41, tts_name: 'Guacamaya', tts_article: 'La', tts_phrase: 'La Guacamaya', asset_key: 'guacamaya', activo: true },
  { id: 'ani-42', nombre: 'Turpial', numero: 42, tts_name: 'Turpial', tts_article: 'El', tts_phrase: 'El Turpial', asset_key: 'turpial', activo: true },
  { id: 'ani-43', nombre: 'Oso Frontino', numero: 43, tts_name: 'Oso Frontino', tts_article: 'El', tts_phrase: 'El Oso Frontino', asset_key: 'oso_frontino', activo: true },
  { id: 'ani-44', nombre: 'Morrocoy', numero: 44, tts_name: 'Morrocoy', tts_article: 'El', tts_phrase: 'El Morrocoy', asset_key: 'morrocoy', activo: true },
  { id: 'ani-45', nombre: 'Cachicamo', numero: 45, tts_name: 'Cachicamo', tts_article: 'El', tts_phrase: 'El Cachicamo', asset_key: 'cachicamo', activo: true },
  { id: 'ani-46', nombre: 'Puma', numero: 46, tts_name: 'Puma', tts_article: 'El', tts_phrase: 'El Puma', asset_key: 'puma', activo: true },
  { id: 'ani-47', nombre: 'Guacharaca', numero: 47, tts_name: 'Guacharaca', tts_article: 'La', tts_phrase: 'La Guacharaca', asset_key: 'guacharaca', activo: true },
  { id: 'ani-48', nombre: 'Garza Blanca', numero: 48, tts_name: 'Garza Blanca', tts_article: 'La', tts_phrase: 'La Garza Blanca', asset_key: 'garza_blanca', activo: true },
  { id: 'ani-49', nombre: 'Colibrí', numero: 49, tts_name: 'Colibrí', tts_article: 'El', tts_phrase: 'El Colibrí', asset_key: 'colibri', activo: true },
  { id: 'ani-50', nombre: 'Puercoespín', numero: 50, tts_name: 'Puercoespín', tts_article: 'El', tts_phrase: 'El Puercoespín', asset_key: 'puercoespin', activo: true },
  { id: 'ani-51', nombre: 'Tonina', numero: 51, tts_name: 'Tonina', tts_article: 'La', tts_phrase: 'La Tonina', asset_key: 'tonina', activo: true },
  { id: 'ani-52', nombre: 'Babo', numero: 52, tts_name: 'Babo', tts_article: 'El', tts_phrase: 'El Babo', asset_key: 'babo', activo: true },
  { id: 'ani-53', nombre: 'Chupacabras', numero: 53, tts_name: 'Chupacabras', tts_article: 'El', tts_phrase: 'El Chupacabras', asset_key: 'chupacabras', activo: true },
  { id: 'ani-54', nombre: 'Rabipelado', numero: 54, tts_name: 'Rabipelado', tts_article: 'El', tts_phrase: 'El Rabipelado', asset_key: 'rabipelado', activo: true },
  { id: 'ani-55', nombre: 'Perezoso', numero: 55, tts_name: 'Perezoso', tts_article: 'El', tts_phrase: 'El Perezoso', asset_key: 'perezoso', activo: true },
  { id: 'ani-56', nombre: 'Tucán', numero: 56, tts_name: 'Tucán', tts_article: 'El', tts_phrase: 'El Tucán', asset_key: 'tucan', activo: true },
  { id: 'ani-57', nombre: 'Picaflor', numero: 57, tts_name: 'Picaflor', tts_article: 'El', tts_phrase: 'El Picaflor', asset_key: 'picaflor', activo: true },
  { id: 'ani-58', nombre: 'Araguato', numero: 58, tts_name: 'Araguato', tts_article: 'El', tts_phrase: 'El Araguato', asset_key: 'araguato', activo: true },
  { id: 'ani-59', nombre: 'Manatí', numero: 59, tts_name: 'Manatí', tts_article: 'El', tts_phrase: 'El Manatí', asset_key: 'manati', activo: true },
  { id: 'ani-60', nombre: 'Pavón', numero: 60, tts_name: 'Pavón', tts_article: 'El', tts_phrase: 'El Pavón', asset_key: 'pavon', activo: true },
  { id: 'ani-61', nombre: 'Bagre', numero: 61, tts_name: 'Bagre', tts_article: 'El', tts_phrase: 'El Bagre', asset_key: 'bagre', activo: true },
  { id: 'ani-62', nombre: 'Pavita', numero: 62, tts_name: 'Pavita', tts_article: 'La', tts_phrase: 'La Pavita', asset_key: 'pavita', activo: true },
  { id: 'ani-63', nombre: 'Picure', numero: 63, tts_name: 'Picure', tts_article: 'El', tts_phrase: 'El Picure', asset_key: 'picure', activo: true },
  { id: 'ani-64', nombre: 'Guabina', numero: 64, tts_name: 'Guabina', tts_article: 'La', tts_phrase: 'La Guabina', asset_key: 'guabina', activo: true },
  { id: 'ani-65', nombre: 'Gavilán', numero: 65, tts_name: 'Gavilán', tts_article: 'El', tts_phrase: 'El Gavilán', asset_key: 'gavilan', activo: true },
  { id: 'ani-66', nombre: 'Koala', numero: 66, tts_name: 'Koala', tts_article: 'El', tts_phrase: 'El Koala', asset_key: 'koala', activo: true },
  { id: 'ani-67', nombre: 'Canguro', numero: 67, tts_name: 'Canguro', tts_article: 'El', tts_phrase: 'El Canguro', asset_key: 'canguro', activo: true },
  { id: 'ani-68', nombre: 'Lobo', numero: 68, tts_name: 'Lobo', tts_article: 'El', tts_phrase: 'El Lobo', asset_key: 'lobo', activo: true },
  { id: 'ani-69', nombre: 'Rinoceronte', numero: 69, tts_name: 'Rinoceronte', tts_article: 'El', tts_phrase: 'El Rinoceronte', asset_key: 'rinoceronte', activo: true },
  { id: 'ani-70', nombre: 'Hipopótamo', numero: 70, tts_name: 'Hipopótamo', tts_article: 'El', tts_phrase: 'El Hipopótamo', asset_key: 'hipopotamo', activo: true },
  { id: 'ani-71', nombre: 'Foca', numero: 71, tts_name: 'Foca', tts_article: 'La', tts_phrase: 'La Foca', asset_key: 'foca', activo: true },
  { id: 'ani-72', nombre: 'Pingüino', numero: 72, tts_name: 'Pingüino', tts_article: 'El', tts_phrase: 'El Pingüino', asset_key: 'pinguino', activo: true },
  { id: 'ani-73', nombre: 'Cernícalo', numero: 73, tts_name: 'Cernícalo', tts_article: 'El', tts_phrase: 'El Cernícalo', asset_key: 'cernicalo', activo: true },
  { id: 'ani-74', nombre: 'Flamenco', numero: 74, tts_name: 'Flamenco', tts_article: 'El', tts_phrase: 'El Flamenco', asset_key: 'flamenco', activo: true },
  { id: 'ani-75', nombre: 'Jaguar', numero: 75, tts_name: 'Jaguar', tts_article: 'El', tts_phrase: 'El Jaguar', asset_key: 'jaguar', activo: true },
];

// ==============================================================================
// 2. CATÁLOGO OFICIAL: OBJETOS CRIOLLOS (EXACTAMENTE 75 OBJETOS REGISTRADOS, RANGO 1-75)
// ==============================================================================
export const OBJETOS_CRIOLLOS_CATALOG: CatalogItem[] = [
  { id: 'obj-1', nombre: 'Cuatro', numero: 1, tts_name: 'Cuatro Venezolano', tts_article: 'El', tts_phrase: 'El Cuatro', asset_key: 'cuatro', activo: true },
  { id: 'obj-2', nombre: 'Maracas', numero: 2, tts_name: 'Maracas', tts_article: 'Las', tts_phrase: 'Las Maracas', asset_key: 'maracas', activo: true },
  { id: 'obj-3', nombre: 'Arpa', numero: 3, tts_name: 'Arpa Llanera', tts_article: 'El', tts_phrase: 'El Arpa', asset_key: 'arpa', activo: true },
  { id: 'obj-4', nombre: 'Arepa', numero: 4, tts_name: 'Arepa', tts_article: 'La', tts_phrase: 'La Arepa', asset_key: 'arepa', activo: true },
  { id: 'obj-5', nombre: 'Empanada', numero: 5, tts_name: 'Empanada', tts_article: 'La', tts_phrase: 'La Empanada', asset_key: 'empanada', activo: true },
  { id: 'obj-6', nombre: 'Cachapa', numero: 6, tts_name: 'Cachapa con Queso de Mano', tts_article: 'La', tts_phrase: 'La Cachapa', asset_key: 'cachapa', activo: true },
  { id: 'obj-7', nombre: 'Hallaca', numero: 7, tts_name: 'Hallaca Navideña', tts_article: 'La', tts_phrase: 'La Hallaca', asset_key: 'hallaca', activo: true },
  { id: 'obj-8', nombre: 'Papelón con Limón', numero: 8, tts_name: 'Papelón con Limón', tts_article: 'El', tts_phrase: 'El Papelón con Limón', asset_key: 'papelon_con_limon', activo: true },
  { id: 'obj-9', nombre: 'Chinchorro', numero: 9, tts_name: 'Chinchorro Llanero', tts_article: 'El', tts_phrase: 'El Chinchorro', asset_key: 'chinchorro', activo: true },
  { id: 'obj-10', nombre: 'Sombrero de Cogollo', numero: 10, tts_name: 'Sombrero de Cogollo', tts_article: 'El', tts_phrase: 'El Sombrero de Cogollo', asset_key: 'sombrero_de_cogollo', activo: true },
  { id: 'obj-11', nombre: 'Alpargatas', numero: 11, tts_name: 'Alpargatas Criollas', tts_article: 'Las', tts_phrase: 'Las Alpargatas', asset_key: 'alpargatas', activo: true },
  { id: 'obj-12', nombre: 'Tinaja', numero: 12, tts_name: 'Tinaja de Barro', tts_article: 'La', tts_phrase: 'La Tinaja', asset_key: 'tinaja', activo: true },
  { id: 'obj-13', nombre: 'Pilón', numero: 13, tts_name: 'Pilón de Maíz', tts_article: 'El', tts_phrase: 'El Pilón', asset_key: 'pilon', activo: true },
  { id: 'obj-14', nombre: 'Budare', numero: 14, tts_name: 'Budare', tts_article: 'El', tts_phrase: 'El Budare', asset_key: 'budare', activo: true },
  { id: 'obj-15', nombre: 'Totuma', numero: 15, tts_name: 'Totuma', tts_article: 'La', tts_phrase: 'La Totuma', asset_key: 'totuma', activo: true },
  { id: 'obj-16', nombre: 'Ávila', numero: 16, tts_name: 'Cerro El Ávila', tts_article: 'El', tts_phrase: 'El Ávila', asset_key: 'avila', activo: true },
  { id: 'obj-17', nombre: 'Salto Ángel', numero: 17, tts_name: 'Salto Ángel Kerepakupai Vená', tts_article: 'El', tts_phrase: 'El Salto Ángel', asset_key: 'salto_angel', activo: true },
  { id: 'obj-18', nombre: 'Médanos de Coro', numero: 18, tts_name: 'Médanos de Coro', tts_article: 'Los', tts_phrase: 'Los Médanos de Coro', asset_key: 'medanos_de_coro', activo: true },
  { id: 'obj-19', nombre: 'Puente sobre el Lago', numero: 19, tts_name: 'Puente sobre el Lago de Maracaibo', tts_article: 'El', tts_phrase: 'El Puente sobre el Lago', asset_key: 'puente_sobre_el_lago', activo: true },
  { id: 'obj-20', nombre: 'Guacamaya', numero: 20, tts_name: 'Guacamaya Bandera', tts_article: 'La', tts_phrase: 'La Guacamaya', asset_key: 'guacamaya', activo: true },
  { id: 'obj-21', nombre: 'Turpial', numero: 21, tts_name: 'Turpial Nacional', tts_article: 'El', tts_phrase: 'El Turpial', asset_key: 'turpial', activo: true },
  { id: 'obj-22', nombre: 'Orquídea', numero: 22, tts_name: 'Orquídea Flor de Mayo', tts_article: 'La', tts_phrase: 'La Orquídea', asset_key: 'orquidea', activo: true },
  { id: 'obj-23', nombre: 'Araguaney', numero: 23, tts_name: 'Árbol Araguaney', tts_article: 'El', tts_phrase: 'El Araguaney', asset_key: 'araguaney', activo: true },
  { id: 'obj-24', nombre: 'Tepuy Roraima', numero: 24, tts_name: 'Tepuy Monte Roraima', tts_article: 'El', tts_phrase: 'El Tepuy Roraima', asset_key: 'tepuy', activo: true },
  { id: 'obj-25', nombre: 'Relámpago del Catatumbo', numero: 25, tts_name: 'Relámpago del Catatumbo', tts_article: 'El', tts_phrase: 'El Relámpago del Catatumbo', asset_key: 'relampago_del_catatumbo', activo: true },
  { id: 'obj-26', nombre: 'Taladro Petrolero', numero: 26, tts_name: 'Taladro Petrolero Balancín', tts_article: 'El', tts_phrase: 'El Taladro Petrolero', asset_key: 'petroleo', activo: true },
  { id: 'obj-27', nombre: 'Cacao de Chuao', numero: 27, tts_name: 'Cacao de Chuao', tts_article: 'El', tts_phrase: 'El Cacao de Chuao', asset_key: 'cacao_de_chuao', activo: true },
  { id: 'obj-28', nombre: 'Café de Mérida', numero: 28, tts_name: 'Café de Mérida', tts_article: 'El', tts_phrase: 'El Café de Mérida', asset_key: 'cafe_de_merida', activo: true },
  { id: 'obj-29', nombre: 'Cocuy de Lara', numero: 29, tts_name: 'Cocuy de Lara', tts_article: 'El', tts_phrase: 'El Cocuy de Lara', asset_key: 'cocuy_de_lara', activo: true },
  { id: 'obj-30', nombre: 'Ron Venezolano', numero: 30, tts_name: 'Ron Añejo Venezolano', tts_article: 'El', tts_phrase: 'El Ron Venezolano', asset_key: 'ron_venezolano', activo: true },
  { id: 'obj-31', nombre: 'Papagayo', numero: 31, tts_name: 'Papagayo', tts_article: 'El', tts_phrase: 'El Papagayo', asset_key: 'papagayo', activo: true },
  { id: 'obj-32', nombre: 'Trompo', numero: 32, tts_name: 'Trompo de Madera', tts_article: 'El', tts_phrase: 'El Trompo', asset_key: 'trompo', activo: true },
  { id: 'obj-33', nombre: 'Metras', numero: 33, tts_name: 'Metras de Vidrio', tts_article: 'Las', tts_phrase: 'Las Metras', asset_key: 'metras', activo: true },
  { id: 'obj-34', nombre: 'Perinola', numero: 34, tts_name: 'Perinola Criolla', tts_article: 'La', tts_phrase: 'La Perinola', asset_key: 'perinola', activo: true },
  { id: 'obj-35', nombre: 'Gurrufío', numero: 35, tts_name: 'Gurrufío Tradicional', tts_article: 'El', tts_phrase: 'El Gurrufío', asset_key: 'gurrufio', activo: true },
  { id: 'obj-36', nombre: 'Yoyo', numero: 36, tts_name: 'Yoyo de Madera', tts_article: 'El', tts_phrase: 'El Yoyo', asset_key: 'yoyo', activo: true },
  { id: 'obj-37', nombre: 'Camión de Estacas', numero: 37, tts_name: 'Camión de Estacas Llanero', tts_article: 'El', tts_phrase: 'El Camión de Estacas', asset_key: 'camion_de_estacas', activo: true },
  { id: 'obj-38', nombre: 'Autobús Encava', numero: 38, tts_name: 'Autobús Encava', tts_article: 'El', tts_phrase: 'El Autobús Encava', asset_key: 'autobus_encava', activo: true },
  { id: 'obj-39', nombre: 'Carrito por Puesto', numero: 39, tts_name: 'Carrito por Puesto', tts_article: 'El', tts_phrase: 'El Carrito por Puesto', asset_key: 'carrito_por_puesto', activo: true },
  { id: 'obj-40', nombre: 'Metro de Caracas', numero: 40, tts_name: 'Metro de Caracas', tts_article: 'El', tts_phrase: 'El Metro de Caracas', asset_key: 'metro_de_caracas', activo: true },
  { id: 'obj-41', nombre: 'Plaza Bolívar', numero: 41, tts_name: 'Plaza Bolívar', tts_article: 'La', tts_phrase: 'La Plaza Bolívar', asset_key: 'plaza_bolivar', activo: true },
  { id: 'obj-42', nombre: 'Panteón Nacional', numero: 42, tts_name: 'Panteón Nacional', tts_article: 'El', tts_phrase: 'El Panteón Nacional', asset_key: 'panteon_nacional', activo: true },
  { id: 'obj-43', nombre: 'Campanario Colonial', numero: 43, tts_name: 'Campanario Colonial', tts_article: 'El', tts_phrase: 'El Campanario Colonial', asset_key: 'campanario', activo: true },
  { id: 'obj-44', nombre: 'Cruz de Mayo', numero: 44, tts_name: 'Cruz de Mayo Vestida', tts_article: 'La', tts_phrase: 'La Cruz de Mayo', asset_key: 'cruz_de_mayo', activo: true },
  { id: 'obj-45', nombre: 'Diablos Danzantes', numero: 45, tts_name: 'Máscara de Diablos Danzantes de Yare', tts_article: 'Los', tts_phrase: 'Los Diablos Danzantes', asset_key: 'diablos_danzantes', activo: true },
  { id: 'obj-46', nombre: 'Tambores de San Juan', numero: 46, tts_name: 'Tambor Mina de Barlovento', tts_article: 'Los', tts_phrase: 'Los Tambores de San Juan', asset_key: 'tambores_de_san_juan', activo: true },
  { id: 'obj-47', nombre: 'Parranda Navideña', numero: 47, tts_name: 'Parranda Navideña', tts_article: 'La', tts_phrase: 'La Parranda Navideña', asset_key: 'parranda_navidena', activo: true },
  { id: 'obj-48', nombre: 'Furro de Gaita', numero: 48, tts_name: 'Furro de Gaita Zuliana', tts_article: 'El', tts_phrase: 'El Furro de Gaita', asset_key: 'gaita_zuliana', activo: true },
  { id: 'obj-49', nombre: 'Charrasca', numero: 49, tts_name: 'Charrasca de Metal', tts_article: 'La', tts_phrase: 'La Charrasca', asset_key: 'charrasca', activo: true },
  { id: 'obj-50', nombre: 'Liquiliqui', numero: 50, tts_name: 'Traje Liquiliqui', tts_article: 'El', tts_phrase: 'El Liquiliqui', asset_key: 'liquiliqui', activo: true },
  { id: 'obj-51', nombre: 'Machete Criollo', numero: 51, tts_name: 'Machete con Vaina', tts_article: 'El', tts_phrase: 'El Machete Criollo', asset_key: 'machete', activo: true },
  { id: 'obj-52', nombre: 'Silla de Montar', numero: 52, tts_name: 'Silla de Montar Llanera', tts_article: 'La', tts_phrase: 'La Silla de Montar', asset_key: 'silla_montar', activo: true },
  { id: 'obj-53', nombre: 'Taza de Peltre', numero: 53, tts_name: 'Taza de Peltre Azul', tts_article: 'La', tts_phrase: 'La Taza de Peltre', asset_key: 'taza_peltre', activo: true },
  { id: 'obj-54', nombre: 'Cuchara de Palo', numero: 54, tts_name: 'Cuchara de Palo', tts_article: 'La', tts_phrase: 'La Cuchara de Palo', asset_key: 'cuchara_palo', activo: true },
  { id: 'obj-55', nombre: 'Rallador de Queso', numero: 55, tts_name: 'Rallador de Queso Blanco', tts_article: 'El', tts_phrase: 'El Rallador de Queso', asset_key: 'rallador_queso', activo: true },
  { id: 'obj-56', nombre: 'Queso de Mano', numero: 56, tts_name: 'Queso de Mano Guariqueño', tts_article: 'El', tts_phrase: 'El Queso de Mano', asset_key: 'queso_mano', activo: true },
  { id: 'obj-57', nombre: 'Pabellón Criollo', numero: 57, tts_name: 'Plato de Pabellón Criollo', tts_article: 'El', tts_phrase: 'El Pabellón Criollo', asset_key: 'pabellon_criollo', activo: true },
  { id: 'obj-58', nombre: 'Asado Negro', numero: 58, tts_name: 'Asado Negro Caraqueño', tts_article: 'El', tts_phrase: 'El Asado Negro', asset_key: 'asado_negro', activo: true },
  { id: 'obj-59', nombre: 'Majarete', numero: 59, tts_name: 'Majarete con Canela', tts_article: 'El', tts_phrase: 'El Majarete', asset_key: 'majarete', activo: true },
  { id: 'obj-60', nombre: 'Dulce de Lechosa', numero: 60, tts_name: 'Dulce de Lechosa Navideño', tts_article: 'El', tts_phrase: 'El Dulce de Lechosa', asset_key: 'dulce_lechosa', activo: true },
  { id: 'obj-61', nombre: 'Tequeños', numero: 61, tts_name: 'Tequeños de Queso', tts_article: 'Los', tts_phrase: 'Los Tequeños', asset_key: 'tequenos', activo: true },
  { id: 'obj-62', nombre: 'Golfeado', numero: 62, tts_name: 'Golfeado con Queso de Mano', tts_article: 'El', tts_phrase: 'El Golfeado', asset_key: 'golfeado', activo: true },
  { id: 'obj-63', nombre: 'Pan de Jamón', numero: 63, tts_name: 'Pan de Jamón Navideño', tts_article: 'El', tts_phrase: 'El Pan de Jamón', asset_key: 'pan_de_jamon', activo: true },
  { id: 'obj-64', nombre: 'Chicha Criolla', numero: 64, tts_name: 'Chicha Criolla con Canela', tts_article: 'La', tts_phrase: 'La Chicha Criolla', asset_key: 'chicha_criolla', activo: true },
  { id: 'obj-65', nombre: 'Torta Negra', numero: 65, tts_name: 'Torta Negra de Navidad', tts_article: 'La', tts_phrase: 'La Torta Negra', asset_key: 'torta_negra', activo: true },
  { id: 'obj-66', nombre: 'Casabe', numero: 66, tts_name: 'Torta de Casabe Horneado', tts_article: 'El', tts_phrase: 'El Casabe', asset_key: 'casabe', activo: true },
  { id: 'obj-67', nombre: 'Piragua Fluvial', numero: 67, tts_name: 'Piragua Fluvial del Orinoco', tts_article: 'La', tts_phrase: 'La Piragua Fluvial', asset_key: 'piragua', activo: true },
  { id: 'obj-68', nombre: 'Faro de Cabo San Román', numero: 68, tts_name: 'Faro de Cabo San Román', tts_article: 'El', tts_phrase: 'El Faro de Cabo San Román', asset_key: 'faro_san_roman', activo: true },
  { id: 'obj-69', nombre: 'Teleférico Mukumbarí', numero: 69, tts_name: 'Teleférico Mukumbarí de Mérida', tts_article: 'El', tts_phrase: 'El Teleférico Mukumbarí', asset_key: 'teleferico_merida', activo: true },
  { id: 'obj-70', nombre: 'Castillo de San Antonio', numero: 70, tts_name: 'Castillo de San Antonio de la Eminencia', tts_article: 'El', tts_phrase: 'El Castillo de San Antonio', asset_key: 'castillo_cumana', activo: true },
  { id: 'obj-71', nombre: 'Monumento a la Virgen de la Paz', numero: 71, tts_name: 'Monumento a la Virgen de la Paz', tts_article: 'El', tts_phrase: 'El Monumento a la Virgen de la Paz', asset_key: 'monumento_paz', activo: true },
  { id: 'obj-72', nombre: 'Perla de Margarita', numero: 72, tts_name: 'Perla de la Isla de Margarita', tts_article: 'La', tts_phrase: 'La Perla de Margarita', asset_key: 'isla_margarita', activo: true },
  { id: 'obj-73', nombre: 'Cayo de Los Roques', numero: 73, tts_name: 'Cayo de Los Roques', tts_article: 'El', tts_phrase: 'El Cayo de Los Roques', asset_key: 'los_roques', activo: true },
  { id: 'obj-74', nombre: 'Cueva del Guácharo', numero: 74, tts_name: 'Cueva del Guácharo', tts_article: 'La', tts_phrase: 'La Cueva del Guácharo', asset_key: 'cueva_guacharo', activo: true },
  { id: 'obj-75', nombre: 'Bandera Tricolor', numero: 75, tts_name: 'Bandera Tricolor Nacional con Ocho Estrellas', tts_article: 'La', tts_phrase: 'La Bandera Tricolor', asset_key: 'bandera_venezuela', activo: true },
];

// ==============================================================================
// 3. CATÁLOGO OFICIAL DEFINITIVO: CHAPITAS (EXACTAMENTE 90 ELEMENTOS, RANGO 1-90)
// Estructura oficial: 45 referencias a ANIMALITOS + 45 referencias a OBJETOS
// Regla: No crear duplicados; reutilizar los IDs de catálogo oficiales y trazables.
// Chapitas 1 a 45 -> ANIMALITOS (ani-1 a ani-45)
// Chapitas 46 a 90 -> OBJETOS (obj-1 a obj-45)
// ==============================================================================
export const CHAPITAS_CATALOG: ChapitasItem[] = [
  // 45 REFERENCIAS OFICIALES A ANIMALITOS (1 a 45)
  ...ANIMALITOS_CATALOG.slice(0, 45).map((ani, idx): ChapitasItem => {
    const chapNum = idx + 1;
    return {
      chapitas_number: chapNum,
      source_type: 'ANIMAL',
      source_catalog_id: ani.id,
      source_number: ani.numero,
      nombre: ani.nombre,
      tts_name: ani.tts_name,
      tts_article: ani.tts_article || 'El',
      tts_phrase: ani.tts_phrase || `${ani.tts_article || 'El'} ${ani.nombre}`,
      asset_key: ani.asset_key,
      activo: true,
    };
  }),
  // 45 REFERENCIAS OFICIALES A OBJETOS (46 a 90)
  ...OBJETOS_CRIOLLOS_CATALOG.slice(0, 45).map((obj, idx): ChapitasItem => {
    const chapNum = idx + 46;
    return {
      chapitas_number: chapNum,
      source_type: 'OBJECT',
      source_catalog_id: obj.id,
      source_number: obj.numero,
      nombre: obj.nombre,
      tts_name: obj.tts_name,
      tts_article: obj.tts_article || 'El',
      tts_phrase: obj.tts_phrase || `${obj.tts_article || 'El'} ${obj.nombre}`,
      asset_key: obj.asset_key,
      activo: true,
    };
  }),
];

// ==============================================================================
// 4. CATÁLOGO OFICIAL: BINGO 75 (75 BALOTAS B-I-N-G-O)
// ==============================================================================
export function getBingo75Letter(num: number): 'B' | 'I' | 'N' | 'G' | 'O' | '' {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  return '';
}

export const BINGO_75_CATALOG: CatalogItem[] = Array.from({ length: 75 }, (_, idx) => {
  const num = idx + 1;
  const letter = getBingo75Letter(num);
  return {
    id: `b75-${num}`,
    nombre: `${letter}-${num}`,
    numero: num,
    tts_name: `${letter}, ${num}`,
    tts_article: 'La balota',
    tts_phrase: `${letter} ${num}`,
    asset_key: `bingo75_${letter.toLowerCase()}_${num}`,
    activo: true,
  };
});

// ==============================================================================
// 5. CATÁLOGO OFICIAL: BINGO 90 (90 NÚMEROS)
// ==============================================================================
export const BINGO_90_CATALOG: CatalogItem[] = Array.from({ length: 90 }, (_, idx) => {
  const num = idx + 1;
  return {
    id: `b90-${num}`,
    nombre: `Número ${num}`,
    numero: num,
    tts_name: `Número ${num}`,
    tts_article: 'El',
    tts_phrase: `Número ${num}`,
    asset_key: `bingo90_${num}`,
    activo: true,
  };
});

// ==============================================================================
// 6. RESOLUTOR MAESTRO DE METADATOS POR BALOTA Y MODALIDAD
// Respeta estrictamente:
// NÚMERO + FIGURA + IMAGEN
// TTS: Nombre de la figura / locución natural con artículo oficial
// ==============================================================================
export function getBallMetadata(modalityId: string, ballNumber: number): {
  displayLabel: string;
  letter?: string;
  subtext?: string;
  assetKey?: string;
  ttsName: string;
  item?: CatalogItem | ChapitasItem;
  sourceType?: 'ANIMAL' | 'OBJECT';
  sourceCatalogId?: string;
} {
  switch (modalityId) {
    case 'BINGO_75': {
      const letter = getBingo75Letter(ballNumber);
      return {
        displayLabel: `${letter}-${ballNumber}`,
        letter,
        subtext: `Columna ${letter}`,
        assetKey: `bingo75_${letter.toLowerCase()}_${ballNumber}`,
        ttsName: `${letter}, ${ballNumber}`,
        item: BINGO_75_CATALOG[ballNumber - 1],
      };
    }
    case 'BINGO_90': {
      return {
        displayLabel: `${ballNumber}`,
        subtext: `Balota ${ballNumber} de 90`,
        assetKey: `bingo90_${ballNumber}`,
        ttsName: `Número ${ballNumber}`,
        item: BINGO_90_CATALOG[ballNumber - 1],
      };
    }
    case 'ANIMALITOS': {
      // 75 animales exactos en rango 1-75
      const item = ANIMALITOS_CATALOG.find((a) => a.numero === ballNumber) || ANIMALITOS_CATALOG[(ballNumber - 1) % ANIMALITOS_CATALOG.length];
      return {
        displayLabel: `#${item.numero} ${item.nombre}`,
        subtext: item.nombre,
        assetKey: item.asset_key,
        ttsName: item.tts_phrase || `${item.numero}, ${item.tts_name}`,
        item,
      };
    }
    case 'OBJETOS': {
      // 75 objetos criollos exactos en rango 1-75
      const item = OBJETOS_CRIOLLOS_CATALOG.find((o) => o.numero === ballNumber) || OBJETOS_CRIOLLOS_CATALOG[(ballNumber - 1) % OBJETOS_CRIOLLOS_CATALOG.length];
      return {
        displayLabel: `#${item.numero} ${item.nombre}`,
        subtext: item.nombre,
        assetKey: item.asset_key,
        ttsName: item.tts_phrase || `${item.numero}, ${item.tts_name}`,
        item,
      };
    }
    case 'CHAPITAS': {
      // 90 chapitas en rango 1-90 (45 animales + 45 objetos)
      const item = CHAPITAS_CATALOG.find((c) => c.chapitas_number === ballNumber) || CHAPITAS_CATALOG[(ballNumber - 1) % CHAPITAS_CATALOG.length];
      return {
        displayLabel: `#${item.chapitas_number} ${item.nombre}`,
        subtext: `${item.source_type === 'ANIMAL' ? 'Animalito' : 'Objeto Criollo'}: ${item.nombre}`,
        assetKey: item.asset_key,
        ttsName: item.tts_phrase, // Locución natural: "El Delfín", "La Arepa", "Las Maracas"
        item,
        sourceType: item.source_type,
        sourceCatalogId: item.source_catalog_id,
      };
    }
    default:
      return {
        displayLabel: `${ballNumber}`,
        ttsName: `Número ${ballNumber}`,
      };
  }
}

// ==============================================================================
// 7. LOCUTOR / TEXT-TO-SPEECH (TTS) EN TIEMPO REAL
// Flujo: Draw Engine -> Ball Number -> Modality -> Catalog -> Name -> TTS
// ==============================================================================
export function getBallTTSAnnouncement(modalityId: string, ballNumber: number): string {
  const meta = getBallMetadata(modalityId, ballNumber);
  return meta.ttsName;
}

export function speakBallTTS(modalityId: string, ballNumber: number, enabled: boolean = true): void {
  if (!enabled) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    const text = getBallTTSAnnouncement(modalityId, ballNumber);
    window.speechSynthesis.cancel(); // Evita acumulación de locuciones encoladas
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-VE'; // Dialecto venezolano oficial
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    // Falla de audio no bloqueante
  }
}
