"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";

import { createLocation, updateLocation } from "@/server/actions/locations";
import { WEEKDAYS } from "@/lib/weekdays";
import type { Coords } from "@/features/listings/LocationPicker";

const LocationPicker = dynamic(() => import("@/features/listings/LocationPicker").then((mod) => mod.LocationPicker), {
  ssr: false,
  loading: () => <div className="fp-locpicker fp-locpicker--loading" role="status">Carregando o mapa...</div>,
});

export type DashboardLocation = {
  id: string;
  label: string;
  address: string | null;
  latitude: number;
  longitude: number;
  weekdays: number[];
};

export function LocationDialog({
  open,
  location,
  onClose,
}: {
  open: boolean;
  /** Local sendo editado; null = novo local. */
  location: DashboardLocation | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="fp-dialog fp-dialog--wide"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      aria-labelledby="nloc-title"
    >
      {/* Monta o formulário só aberto; a key reinicia o estado ao trocar de local. */}
      {open ? <LocationForm key={location?.id ?? "new"} location={location} onClose={onClose} /> : null}
    </dialog>
  );
}

function LocationForm({ location, onClose }: { location: DashboardLocation | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [coords, setCoords] = useState<Coords | null>(
    location ? { latitude: location.latitude, longitude: location.longitude } : null,
  );
  const [days, setDays] = useState<number[]>(location?.weekdays ?? []);
  const [gps, setGps] = useState<"idle" | "loading" | "denied">("idle");

  function toggleDay(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  function requestGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps("denied");
      return;
    }
    setGps("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGps("idle");
      },
      () => setGps("denied"),
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!coords) {
      setError("Marque o local no mapa ou use sua localização.");
      return;
    }
    if (days.length === 0) {
      setError("Escolha pelo menos um dia da semana.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = location ? await updateLocation(location.id, formData) : await createLocation(formData);
      if (!result.ok) {
        const first = result.fieldErrors ? Object.values(result.fieldErrors).flat().find(Boolean) : undefined;
        setError(first ?? result.error ?? "Não foi possível salvar o local.");
        return;
      }
      onClose();
    });
  }

  return (
    <form className="fp-dialog-body" onSubmit={handleSubmit}>
      <div className="fp-dialog-head">
        <div>
          <h1 className="fp-h2" id="nloc-title">{location ? "Editar local" : "Novo local de atendimento"}</h1>
          <span className="fp-caption">Onde e em quais dias você atende. No mapa, você aparece no local do dia.</span>
        </div>
        <button type="button" className="fp-dialog-close" aria-label="Fechar" onClick={onClose}>
          <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="fp-dialog-row">
        <div className="fp-field">
          <label className="fp-label" htmlFor="nloc-label">Nome do local</label>
          <input id="nloc-label" name="label" className="fp-input" required maxLength={80} defaultValue={location?.label ?? ""} placeholder="Ex.: Feira do Centro" />
        </div>
        <div className="fp-field">
          <label className="fp-label" htmlFor="nloc-address">Endereço ou referência (opcional)</label>
          <input id="nloc-address" name="address" className="fp-input" maxLength={200} defaultValue={location?.address ?? ""} placeholder="Ex.: Praça da Matriz" />
        </div>
      </div>

      <fieldset className="fp-weekdays">
        <legend className="fp-label">Dias de atendimento</legend>
        <div className="fp-weekdays-list">
          {WEEKDAYS.map((day) => {
            const checked = days.includes(day.value);
            return (
              <label key={day.value} className={checked ? "fp-chip fp-weekday fp-weekday--on" : "fp-chip fp-weekday"}>
                <input
                  type="checkbox"
                  name="weekdays"
                  value={day.value}
                  checked={checked}
                  onChange={() => toggleDay(day.value)}
                  className="fp-sr-only"
                />
                <span aria-hidden="true">{day.short}</span>
                <span className="fp-sr-only">{day.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="fp-field">
        <span className="fp-label">Ponto no mapa</span>
        <LocationPicker value={coords} onChange={setCoords} />
        <div className="fp-locpicker-foot">
          <button type="button" className="fp-btn fp-btn--quiet" onClick={requestGps} disabled={gps === "loading"}>
            <svg viewBox="0 0 24 24" className="fp-ico fp-ico--sm" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
            {gps === "loading" ? "Localizando..." : "Usar minha localização"}
          </button>
          <span className="fp-caption" role="status">
            {gps === "denied"
              ? "Não foi possível obter sua localização — clique no mapa."
              : coords
                ? "Ponto marcado. Arraste o pino para ajustar."
                : "Clique no mapa para marcar o ponto."}
          </span>
        </div>
      </div>

      <input type="hidden" name="latitude" value={coords?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={coords?.longitude ?? ""} />

      {error ? <p className="fp-error" role="alert">{error}</p> : null}

      <div className="fp-dialog-foot">
        <button type="button" className="fp-btn fp-btn--quiet" onClick={onClose}>Cancelar</button>
        <button type="submit" className="fp-btn fp-btn--primary" disabled={isPending}>
          {isPending ? "Salvando..." : location ? "Salvar local" : "Adicionar local"}
        </button>
      </div>
    </form>
  );
}
