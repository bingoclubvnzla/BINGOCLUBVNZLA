// ==============================================================================
// BINGO CLUB VNZLA ONLINE — HOOK OFICIAL DE CATÁLOGOS DE MODALIDADES
// Satisface: Resolución server-authoritative de figuras (ANIMALITOS 75, OBJETOS 75, CHAPITAS 90)
// Caché en memoria para evitar consultas redundantes por cada cartón o celda.
// ==============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ANIMALITOS_CATALOG,
  OBJETOS_CRIOLLOS_CATALOG,
  CHAPITAS_CATALOG,
  type CatalogItem,
  type ChapitasItem
} from '../lib/catalogs';

export type ResolvedCatalogEntry = {
  number: number;
  name: string;
  ttsName: string;
  assetKey: string;
  sourceType?: 'ANIMAL' | 'OBJECT';
};

// Caché en memoria compartido a nivel de módulo
const catalogMemoryCache = new Map<string, Map<number, ResolvedCatalogEntry>>();

export function useModalityCatalog(modalityId: string | undefined | null) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheVersion, setCacheVersion] = useState<number>(0);

  const cleanModality = modalityId?.trim().toUpperCase();

  useEffect(() => {
    if (!cleanModality) return;
    const modalityKey: string = cleanModality;

    // BINGO_75 y BINGO_90 no requieren figuras ilustradas
    if (modalityKey === 'BINGO_75' || modalityKey === 'BINGO_90') {
      return;
    }

    // Si ya está en caché, no consultar de nuevo
    if (catalogMemoryCache.has(modalityKey)) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchCatalog() {
      const map = new Map<number, ResolvedCatalogEntry>();

      try {
        if (cleanModality === 'ANIMALITOS' || cleanModality === 'OBJETOS') {
          if (isSupabaseConfigured) {
            const { data, error: sbError } = await supabase
              .from('modality_catalogs')
              .select('id, modality_id, number_value, name, tts_name, asset_key, is_active')
              .eq('modality_id', cleanModality)
              .eq('is_active', true)
              .order('number_value');

            if (!sbError && data && data.length >= 75) {
              data.forEach((item: any) => {
                map.set(item.number_value, {
                  number: item.number_value,
                  name: item.name,
                  ttsName: item.tts_name,
                  assetKey: item.asset_key,
                });
              });
            } else {
              // Fallback oficial inmutable desde lib/catalogs
              const fallbackSource = cleanModality === 'ANIMALITOS' ? ANIMALITOS_CATALOG : OBJETOS_CRIOLLOS_CATALOG;
              fallbackSource.forEach((item: CatalogItem) => {
                map.set(item.numero, {
                  number: item.numero,
                  name: item.nombre,
                  ttsName: item.tts_name,
                  assetKey: item.asset_key,
                });
              });
            }
          } else {
            // Entorno local / sin credenciales
            const fallbackSource = cleanModality === 'ANIMALITOS' ? ANIMALITOS_CATALOG : OBJETOS_CRIOLLOS_CATALOG;
            fallbackSource.forEach((item: CatalogItem) => {
              map.set(item.numero, {
                number: item.numero,
                name: item.nombre,
                ttsName: item.tts_name,
                assetKey: item.asset_key,
              });
            });
          }
        } else if (cleanModality === 'CHAPITAS') {
          if (isSupabaseConfigured) {
            const { data, error: sbError } = await supabase
              .from('v_chapitas_catalog')
              .select('chapitas_number, source_type, source_catalog_id, source_number, name, tts_name, asset_key, is_active')
              .order('chapitas_number');

            if (!sbError && data && data.length >= 90) {
              data.forEach((item: any) => {
                map.set(item.chapitas_number, {
                  number: item.chapitas_number,
                  name: item.name,
                  ttsName: item.tts_name,
                  assetKey: item.asset_key,
                  sourceType: item.source_type,
                });
              });
            } else {
              CHAPITAS_CATALOG.forEach((item: ChapitasItem) => {
                map.set(item.chapitas_number, {
                  number: item.chapitas_number,
                  name: item.nombre,
                  ttsName: item.tts_name,
                  assetKey: item.asset_key,
                  sourceType: item.source_type,
                });
              });
            }
          } else {
            CHAPITAS_CATALOG.forEach((item: ChapitasItem) => {
              map.set(item.chapitas_number, {
                number: item.chapitas_number,
                name: item.nombre,
                ttsName: item.tts_name,
                assetKey: item.asset_key,
                sourceType: item.source_type,
              });
            });
          }
        }

        catalogMemoryCache.set(modalityKey, map);
        if (isMounted) {
          setLoading(false);
          setCacheVersion((v) => v + 1);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Error al cargar catálogo oficial');
          setLoading(false);
        }
      }
    }

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [cleanModality]);

  const catalogMap = useMemo(() => {
    if (!cleanModality) return new Map<number, ResolvedCatalogEntry>();
    return catalogMemoryCache.get(cleanModality) || new Map<number, ResolvedCatalogEntry>();
  }, [cleanModality, cacheVersion]);

  const resolveItem = useCallback(
    (numberVal: number): ResolvedCatalogEntry | null => {
      if (!cleanModality || cleanModality === 'BINGO_75' || cleanModality === 'BINGO_90') {
        return null;
      }
      const entry = catalogMap.get(numberVal);
      if (entry) return entry;

      // Fallback sincrónico directo a constantes oficiales en caso de carga pendiente
      if (cleanModality === 'ANIMALITOS') {
        const fallback = ANIMALITOS_CATALOG.find((a) => a.numero === numberVal);
        return fallback
          ? { number: fallback.numero, name: fallback.nombre, ttsName: fallback.tts_name, assetKey: fallback.asset_key }
          : null;
      }
      if (cleanModality === 'OBJETOS') {
        const fallback = OBJETOS_CRIOLLOS_CATALOG.find((o) => o.numero === numberVal);
        return fallback
          ? { number: fallback.numero, name: fallback.nombre, ttsName: fallback.tts_name, assetKey: fallback.asset_key }
          : null;
      }
      if (cleanModality === 'CHAPITAS') {
        const fallback = CHAPITAS_CATALOG.find((c) => c.chapitas_number === numberVal);
        return fallback
          ? {
              number: fallback.chapitas_number,
              name: fallback.nombre,
              ttsName: fallback.tts_name,
              assetKey: fallback.asset_key,
              sourceType: fallback.source_type,
            }
          : null;
      }

      return null;
    },
    [cleanModality, catalogMap]
  );

  return {
    catalogMap,
    resolveItem,
    loading,
    error,
    isLoaded: !cleanModality || cleanModality === 'BINGO_75' || cleanModality === 'BINGO_90' || catalogMap.size > 0,
  };
}
