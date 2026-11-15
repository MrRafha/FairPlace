"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createPost } from "@/server/actions/posts";

export function NewPostDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      const result = await createPost(new FormData(form));
      if (!result.ok) {
        const first = result.fieldErrors ? Object.values(result.fieldErrors).flat().find(Boolean) : undefined;
        setError(first ?? result.error ?? "Não foi possível publicar.");
        return;
      }
      form.reset();
      onClose();
    });
  }

  return (
    <dialog ref={ref} className="fp-dialog" onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="npub-title">
      <form className="fp-dialog-body" onSubmit={handleSubmit}>
        <div className="fp-dialog-head">
          <div>
            <h1 className="fp-h2" id="npub-title">Nova publicação</h1>
            <span className="fp-caption">Conte uma novidade da banca para quem acompanha você.</span>
          </div>
          <button type="button" className="fp-dialog-close" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="fp-field">
          <label className="fp-label" htmlFor="npub-text">O que você quer compartilhar?</label>
          <textarea id="npub-text" name="text" className="fp-input" rows={4} required placeholder="Ex.: Amanhã estou na feira a partir das 6h com produtos fresquinhos." />
        </div>

        <div className="fp-field">
          <label className="fp-label" htmlFor="npub-img">URL da imagem (opcional)</label>
          <input id="npub-img" name="imageUrl" type="url" className="fp-input" placeholder="https://..." />
        </div>

        {error ? <p className="fp-error" role="alert">{error}</p> : null}

        <div className="fp-dialog-foot">
          <button type="button" className="fp-btn fp-btn--quiet" onClick={onClose}>Cancelar</button>
          <button type="submit" className="fp-btn fp-btn--primary" disabled={isPending}>{isPending ? "Publicando..." : "Publicar"}</button>
        </div>
      </form>
    </dialog>
  );
}
