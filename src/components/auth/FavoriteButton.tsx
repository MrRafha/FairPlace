"use client";

import { useState, useTransition } from "react";

import { toggleFavorite } from "@/server/actions/favorites";
import { trackEvent } from "@/lib/analytics";

export function FavoriteButton({ sellerId, initialFavorited }: { sellerId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClick() {
    setError("");
    startTransition(async () => {
      const result = await toggleFavorite(sellerId);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível favoritar.");
        return;
      }
      setFavorited(Boolean(result.favorited));
      if (result.favorited) {
        trackEvent("favorite_created", { sellerId });
      }
    });
  }

  return (
    <div className="favorite-control">
      <button
        type="button"
        className={`favorite-button ${favorited ? "is-favorited" : ""}`}
        aria-pressed={favorited}
        onClick={handleClick}
        disabled={isPending}
      >
        {favorited ? "★ Favoritado" : "☆ Favoritar"}
      </button>
      {error ? <small className="favorite-error" role="alert">{error}</small> : null}
    </div>
  );
}
