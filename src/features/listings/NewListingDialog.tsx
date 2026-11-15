"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createListing } from "@/server/actions/listings";
import { LISTING_CATEGORIES } from "@/lib/constants";

export function NewListingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await createListing(new FormData(form));
      if (!result.ok) {
        const first = result.fieldErrors ? Object.values(result.fieldErrors).flat().find(Boolean) : undefined;
        setError(first ?? result.error ?? "Não foi possível adicionar o produto.");
        return;
      }
      form.reset();
      onClose();
    });
  }

  return (
    <dialog ref={ref} className="fp-dialog" onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="np-title">
      <form className="fp-dialog-body" onSubmit={handleSubmit}>
        <div className="fp-dialog-head">
          <div>
            <h1 className="fp-h2" id="np-title">Novo produto</h1>
            <span className="fp-caption">Leva menos de um minuto e já aparece na sua vitrine.</span>
          </div>
          <button type="button" className="fp-dialog-close" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="fp-field">
          <label className="fp-label" htmlFor="np-title-input">Nome do produto</label>
          <input id="np-title-input" name="title" className="fp-input" required placeholder="Ex.: Queijo coalho" />
        </div>

        <div className="fp-dialog-row">
          <div className="fp-field">
            <label className="fp-label" htmlFor="np-price">Preço (R$)</label>
            <input id="np-price" name="price" type="number" step="0.01" min="0" className="fp-input" required placeholder="0,00" />
          </div>
          <div className="fp-field">
            <label className="fp-label" htmlFor="np-cat">Categoria</label>
            <select id="np-cat" name="category" className="fp-input" required defaultValue="">
              <option value="" disabled>Selecione</option>
              {LISTING_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="fp-field">
          <label className="fp-label" htmlFor="np-desc">Descrição (opcional)</label>
          <input id="np-desc" name="description" className="fp-input" placeholder="Unidade, peso ou um detalhe que ajuda a escolher" />
        </div>

        <div className="fp-field">
          <label className="fp-label" htmlFor="np-img">URL da imagem (opcional)</label>
          <input id="np-img" name="imageUrl" type="url" className="fp-input" placeholder="https://..." />
        </div>

        <label className="fp-switch">
          <input name="available" type="checkbox" defaultChecked />
          Disponível hoje
        </label>

        {error ? <p className="fp-error" role="alert">{error}</p> : null}

        <div className="fp-dialog-foot">
          <button type="button" className="fp-btn fp-btn--quiet" onClick={onClose}>Cancelar</button>
          <button type="submit" className="fp-btn fp-btn--primary" disabled={isPending}>{isPending ? "Salvando..." : "Adicionar produto"}</button>
        </div>
      </form>
    </dialog>
  );
}
