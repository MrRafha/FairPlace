"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MAP_DEFAULT_CENTER } from "@/lib/constants";

export type Coords = { latitude: number; longitude: number };

const PIN_HTML =
  '<svg viewBox="0 0 36 46" width="36" height="46" aria-hidden="true"><path d="M18 44S4 28.5 4 17a14 14 0 1128 0c0 11.5-14 27-14 27z" style="fill:#2f7d4a;stroke:#ffffff;stroke-width:2"></path><circle cx="18" cy="17" r="5" style="fill:#ffffff"></circle></svg>';

const pinIcon = L.divIcon({ className: "fp-leaflet-pin", html: PIN_HTML, iconSize: [36, 46], iconAnchor: [18, 44] });

// Mini-mapa para marcar um ponto: clique no mapa ou arraste o pino.
// Carregado só no client (via next/dynamic) porque o Leaflet usa `window`.
export function LocationPicker({ value, onChange }: { value: Coords | null; onChange: (coords: Coords) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = value ?? MAP_DEFAULT_CENTER;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      [start.latitude, start.longitude],
      value ? 16 : MAP_DEFAULT_CENTER.zoom,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onChangeRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    mapRef.current = map;

    // O mapa nasce dentro de um <dialog>; recalcula o tamanho depois que ele abre.
    const resize = window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cria o mapa uma única vez
  }, []);

  // Sincroniza o pino com o valor (clique, GPS ou edição de um local existente).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const latlng = L.latLng(value.latitude, value.longitude);
    if (!markerRef.current) {
      const marker = L.marker(latlng, { icon: pinIcon, draggable: true, title: "Local de atendimento" }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current({ latitude: pos.lat, longitude: pos.lng });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(latlng);
    }
    if (!map.getBounds().contains(latlng)) map.setView(latlng, 16);
  }, [value]);

  return <div ref={containerRef} className="fp-locpicker" aria-label="Mapa: clique para marcar o local de atendimento" />;
}
