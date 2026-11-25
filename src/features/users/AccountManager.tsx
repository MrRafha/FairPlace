"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { updateProfile, changePassword, deleteAccount } from "@/server/actions/account";
import { toggleFavorite } from "@/server/actions/favorites";
import type { AccountData } from "@/server/queries/account";
import { CategoryIcon, categoryTone } from "@/components/icons/CategoryIcon";
import { LISTING_CATEGORIES, type ListingCategoryValue } from "@/lib/constants";

function categoryLabel(value: ListingCategoryValue): string {
  return LISTING_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function AccountManager({ account }: { account: AccountData }) {
  const [isPending, startTransition] = useTransition();
  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [favorites, setFavorites] = useState(account.favorites);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteSecret, setDeleteSecret] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");

  function handleProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMsg("");
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await updateProfile(new FormData(form));
      setProfileMsg(result.ok ? "Perfil atualizado." : result.error ?? "Erro ao salvar.");
    });
  }

  function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMsg("");
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await changePassword(new FormData(form));
      if (result.ok) {
        form.reset();
        // A troca invalida todas as sessões (inclusive esta): entra de novo.
        setPasswordMsg("Senha alterada. Entre de novo com a nova senha...");
        await signOut({ callbackUrl: "/login" });
      } else {
        const first = result.fieldErrors ? Object.values(result.fieldErrors).flat().find(Boolean) : undefined;
        setPasswordMsg(first ?? result.error ?? "Erro ao alterar senha.");
      }
    });
  }

  function handleRemoveFavorite(sellerId: string) {
    startTransition(async () => {
      const result = await toggleFavorite(sellerId);
      if (result.ok && !result.favorited) {
        setFavorites((current) => current.filter((favorite) => favorite.sellerId !== sellerId));
      }
    });
  }

  function handleDelete() {
    setDeleteMsg("");
    const formData = new FormData();
    formData.set(account.hasPassword ? "currentPassword" : "confirmEmail", deleteSecret);
    startTransition(async () => {
      const result = await deleteAccount(formData);
      if (result.ok) {
        await signOut({ callbackUrl: "/" });
        return;
      }
      setDeleteMsg(result.error ?? "Não foi possível excluir a conta.");
    });
  }

  const firstName = (account.name ?? "").trim().split(" ")[0] || "você";

  return (
    <div className="fp-account">
      <div className="fp-account-head">
        <span className="fp-eyebrow">Minha conta</span>
        <h1 className="fp-h1">Olá, {firstName}</h1>
      </div>

      <section className="fp-card fp-account-block" aria-labelledby="h-dados">
        <h2 className="fp-h2" id="h-dados">Dados da conta</h2>
        <form className="fp-form" onSubmit={handleProfile}>
          <div className="fp-account-avatar-row">
            <span className="fp-account-avatar" role="img" aria-label="Sua foto">{initials(account.name)}</span>
            <div className="fp-field">
              <label className="fp-label" htmlFor="image">URL da foto (opcional)</label>
              <input id="image" name="image" type="url" className="fp-input" defaultValue={account.image ?? ""} placeholder="https://..." />
            </div>
          </div>
          <div className="fp-form-row">
            <div className="fp-field">
              <label className="fp-label" htmlFor="name">Nome</label>
              <input id="name" name="name" type="text" className="fp-input" defaultValue={account.name ?? ""} required />
            </div>
            <div className="fp-field">
              <label className="fp-label" htmlFor="email">E-mail</label>
              <input id="email" type="email" className="fp-input" value={account.email ?? ""} readOnly aria-describedby="email-h" />
              <span id="email-h" className="fp-caption">O e-mail não pode ser alterado.</span>
            </div>
          </div>
          <div className="fp-form-foot">
            <button type="submit" className="fp-btn fp-btn--primary" disabled={isPending}>Salvar alterações</button>
            {profileMsg ? <span className="fp-form-msg" role="status">{profileMsg}</span> : null}
          </div>
        </form>
      </section>

      <section className="fp-card fp-account-block" aria-labelledby="h-senha">
        <h2 className="fp-h2" id="h-senha">Alterar senha</h2>
        <form className="fp-form" onSubmit={handlePassword}>
          <div className="fp-field">
            <label className="fp-label" htmlFor="currentPassword">Senha atual</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="fp-input" required />
          </div>
          <div className="fp-form-row">
            <div className="fp-field">
              <label className="fp-label" htmlFor="newPassword">Nova senha</label>
              <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" className="fp-input" aria-describedby="new-h" required />
              <span id="new-h" className="fp-caption">Use pelo menos 10 caracteres. Depois de trocar, você entra de novo com a nova senha.</span>
            </div>
            <div className="fp-field">
              <label className="fp-label" htmlFor="confirmPassword">Repita a nova senha</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="fp-input" required />
            </div>
          </div>
          <div className="fp-form-foot">
            <button type="submit" className="fp-btn fp-btn--quiet" disabled={isPending}>Atualizar senha</button>
            {passwordMsg ? <span className="fp-form-msg" role="status">{passwordMsg}</span> : null}
          </div>
        </form>
      </section>

      <section className="fp-card fp-account-block" aria-labelledby="h-fav">
        <div className="fp-account-fav-head">
          <h2 className="fp-h2" id="h-fav">Vendedores favoritos</h2>
          <p className="fp-muted">Quem você guardou para visitar de novo.</p>
        </div>
        {favorites.length === 0 ? (
          <div className="fp-empty">
            <span className="fp-iconbox fp-iconbox--lg fp-iconbox--artesanato"><svg viewBox="0 0 24 24" className="fp-ico fp-ico--lg" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z" /></svg></span>
            <h3 className="fp-h3">Nenhum favorito ainda</h3>
            <p>Toque na estrela no perfil de um vendedor para guardar ele aqui.</p>
            <Link href="/mapa" className="fp-btn fp-btn--primary">Explorar o mapa</Link>
          </div>
        ) : (
          <ul className="fp-account-fav-list">
            {favorites.map((favorite) => (
              <li key={favorite.id} className="fp-card fp-account-fav">
                <span className={`fp-iconbox fp-iconbox--${categoryTone(favorite.category)}`}><CategoryIcon value={favorite.category} /></span>
                <Link href={`/vendedor/${favorite.sellerId}`} className="fp-account-fav-link">
                  <span className="fp-account-fav-name">{favorite.displayName}</span>
                  <span className="fp-caption">{categoryLabel(favorite.category)}</span>
                </Link>
                <button type="button" className="fp-btn fp-btn--quiet fp-btn--pill" aria-label={`Remover ${favorite.displayName} dos favoritos`} disabled={isPending} onClick={() => handleRemoveFavorite(favorite.sellerId)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {account.hasSellerProfile ? (
        <section className="fp-account-seller" aria-labelledby="h-painel">
          <div>
            <h2 className="fp-h3" id="h-painel">Você também vende por aqui</h2>
            <p>Cuide da sua vitrine, dos produtos e das publicações no painel.</p>
          </div>
          <Link href="/vendedor/painel" className="fp-btn fp-btn--dark">Abrir meu painel</Link>
        </section>
      ) : null}

      <section className="fp-account-danger" aria-labelledby="h-perigo">
        <h2 className="fp-h3 fp-account-danger-title" id="h-perigo">Zona de perigo</h2>
        <p>Excluir a conta apaga seus dados, seus favoritos e, se você vende, a sua vitrine. Não dá para desfazer.</p>
        <div className="fp-field">
          <label className="fp-label" htmlFor="x-conf">Para confirmar, digite EXCLUIR</label>
          <input id="x-conf" className="fp-input fp-account-danger-input" autoComplete="off" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
        </div>
        <div className="fp-field">
          <label className="fp-label" htmlFor="x-secret">{account.hasPassword ? "Sua senha atual" : "O e-mail da sua conta"}</label>
          <input
            id="x-secret"
            className="fp-input fp-account-danger-input"
            type={account.hasPassword ? "password" : "email"}
            autoComplete={account.hasPassword ? "current-password" : "off"}
            value={deleteSecret}
            onChange={(event) => setDeleteSecret(event.target.value)}
          />
        </div>
        {deleteMsg ? <p className="fp-error" role="alert">{deleteMsg}</p> : null}
        <button type="button" className="fp-btn fp-btn--danger" disabled={isPending || deleteConfirm !== "EXCLUIR" || !deleteSecret} onClick={handleDelete}>
          <svg viewBox="0 0 24 24" className="fp-ico" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
          Excluir minha conta
        </button>
      </section>
    </div>
  );
}
