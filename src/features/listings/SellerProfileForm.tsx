"use client";

import { useState, useTransition } from "react";

import { updateSellerProfile } from "@/server/actions/sellerProfile";
import { LISTING_CATEGORIES } from "@/lib/constants";

export type SellerProfileFormData = {
  displayName: string;
  description: string | null;
  category: string;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function SellerProfileForm({ profile }: { profile: SellerProfileFormData }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    profile.latitude !== null && profile.longitude !== null
      ? { latitude: profile.latitude, longitude: profile.longitude }
      : null,
  );
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "denied">("idle");

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationStatus("idle");
      },
      () => setLocationStatus("denied"),
      { timeout: 10000 },
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await updateSellerProfile(new FormData(form));
      if (result.ok) {
        setMessage("Perfil de vendedor atualizado.");
      } else {
        const first = result.fieldErrors ? Object.values(result.fieldErrors).flat().find(Boolean) : undefined;
        setMessage(first ?? result.error ?? "Erro ao salvar.");
      }
    });
  }

  return (
    <form className="fp-form" onSubmit={handleSubmit}>
      <div className="fp-form-row">
        <div className="fp-field">
          <label className="fp-label" htmlFor="displayName">Nome da vitrine</label>
          <input id="displayName" name="displayName" type="text" className="fp-input" defaultValue={profile.displayName} required />
        </div>
        <div className="fp-field">
          <label className="fp-label" htmlFor="profileCategory">Categoria</label>
          <select id="profileCategory" name="category" className="fp-input" defaultValue={profile.category} required>
            {LISTING_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="fp-field">
        <label className="fp-label" htmlFor="profileDescription">Descrição</label>
        <textarea id="profileDescription" name="description" className="fp-input" rows={3} defaultValue={profile.description ?? ""} />
      </div>

      <div className="fp-form-row">
        <div className="fp-field">
          <label className="fp-label" htmlFor="openingHours">Horários de atendimento</label>
          <input id="openingHours" name="openingHours" type="text" className="fp-input" defaultValue={profile.openingHours ?? ""} placeholder="Ex.: Quarta e sábado, 6h às 12h" />
        </div>
        <div className="fp-field">
          <label className="fp-label" htmlFor="phone">Contato (telefone / WhatsApp)</label>
          <input id="phone" name="phone" type="text" className="fp-input" defaultValue={profile.phone ?? ""} placeholder="(00) 00000-0000" />
        </div>
      </div>

      <div className="fp-field">
        <label className="fp-label" htmlFor="profileAddress">Endereço / região</label>
        <input id="profileAddress" name="address" type="text" className="fp-input" defaultValue={profile.address ?? ""} placeholder="Bairro, feira ou ponto de referência" />
      </div>

      <input type="hidden" name="latitude" value={coords?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={coords?.longitude ?? ""} />
      <div className="fp-form-loc">
        <button type="button" className="fp-btn fp-btn--quiet" onClick={requestLocation} disabled={locationStatus === "loading"}>
          {locationStatus === "loading" ? "Localizando..." : coords ? "Atualizar minha localização" : "Usar minha localização"}
        </button>
        {coords ? <span className="fp-caption">Localização definida — você aparecerá no mapa.</span> : null}
        {locationStatus === "denied" ? <span className="fp-caption">Não foi possível obter a localização.</span> : null}
      </div>

      <div className="fp-form-foot">
        <button type="submit" className="fp-btn fp-btn--primary" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar alterações"}
        </button>
        {message ? <span className="fp-form-msg" role="status">{message}</span> : null}
      </div>
    </form>
  );
}
