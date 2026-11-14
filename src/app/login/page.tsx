"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3Z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.2-2.5c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.2H3v2.6A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.2 13.8a6 6 0 0 1 0-3.6V7.6H3a10 10 0 0 0 0 8.8l3.2-2.6Z" /><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8C17 3.1 14.7 2 12 2a10 10 0 0 0-9 5.6l3.2 2.6c.8-2.4 3.1-4.1 5.8-4.1Z" /></svg>;
}

function MarketPattern() {
  return (
    <svg className="login-market-pattern" viewBox="0 0 520 620" aria-hidden="true">
      <defs>
        <pattern id="market-icons" width="130" height="130" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
            <path d="M25 42h35l-4 22H31Z M35 72h26 M39 78a4 4 0 1 0 8 0m12 0a4 4 0 1 0 8 0" />
            <path d="M98 27c-16 8-21 25-8 39 15-3 23-15 8-39Z M90 67c4-13 9-24 17-34" />
            <path d="M25 104h39l-5 18H30Zm4 0-5-13h12l5 13m0 0 5-13h12l-5 13" />
            <path d="M103 101c-8-16-22-11-22-11s2 21 22 21 22-21 22-21-14-5-22 11Z M103 101v20" />
          </g>
        </pattern>
      </defs>
      <rect width="520" height="620" fill="url(#market-icons)" />
    </svg>
  );
}

export default function LoginPage() {
  const [formMode, setFormMode] = useState<"login" | "register">("login");
  const [registrationRole, setRegistrationRole] = useState<"buyer" | "seller">("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (formMode === "register") {
      setError("O cadastro ainda não está disponível. O formulário de registro está preparado para a próxima etapa.");
      return;
    }

    setIsLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    setIsLoading(false);
    if (result?.error) {
      setError("Não foi possível entrar. Verifique os dados ou a configuração de autenticação.");
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("O login com Google ainda não está configurado neste ambiente.");
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Sobre o FairPlace">
        <MarketPattern />
        <Link className="login-brand" href="/" aria-label="Voltar para o início">
          <Image src="/FP.svg" alt="" width={54} height={54} />
          <span><b>Fair</b><em>Place</em></span>
        </Link>
        <div className="login-brand-copy">
          <p className="eyebrow">Feira, artesanato e agricultura local</p>
          <h1>O que é feito perto, chega mais perto.</h1>
          <p>Entre para descobrir vendedores da sua região ou cuidar da sua própria vitrine local.</p>
        </div>
        <div className="login-brand-mark" aria-hidden="true"><Image src="/logo-favicon.svg" alt="" width={280} height={140} /></div>
      </section>

      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <Link className="login-back" href="/">← Voltar para o início</Link>
          <p className="eyebrow">Bem-vindo de volta</p>
          <h2 id="login-title">{formMode === "login" ? "Entre no FairPlace" : "Crie sua conta no FairPlace"}</h2>
          <p className="login-subtitle">{formMode === "login" ? "Acesse sua conta para continuar." : "Cadastre-se para descobrir e apoiar negócios locais."}</p>

          <div className="user-type-choice" role="group" aria-label="Tipo de formulário">
            <button type="button" className={formMode === "login" ? "selected" : ""} aria-pressed={formMode === "login"} onClick={() => { setFormMode("login"); setError(""); }}>Entrar</button>
            <button type="button" className={formMode === "register" ? "selected" : ""} aria-pressed={formMode === "register"} onClick={() => { setFormMode("register"); setError(""); }}>Registrar-se</button>
          </div>
          {formMode === "register" ? (
            <div className="registration-role" role="group" aria-label="Escolha como você usará o FairPlace">
              <p>Como você quer usar o FairPlace?</p>
              <div className="user-type-choice">
                <button type="button" className={registrationRole === "buyer" ? "selected" : ""} aria-pressed={registrationRole === "buyer"} onClick={() => setRegistrationRole("buyer")}>Sou consumidor</button>
                <button type="button" className={registrationRole === "seller" ? "selected" : ""} aria-pressed={registrationRole === "seller"} onClick={() => setRegistrationRole("seller")}>Sou vendedor</button>
              </div>
            </div>
          ) : null}
          <form onSubmit={handleSubmit}>
            {formMode === "register" ? (
              <>
                <label htmlFor="name">Nome</label>
                <input id="name" name="name" type="text" autoComplete="name" placeholder="Como podemos chamar você?" value={name} onChange={(event) => setName(event.target.value)} required />
              </>
            ) : null}
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete={formMode === "login" ? "current-password" : "new-password"} placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {formMode === "register" ? (
              <>
                <label htmlFor="password-confirmation">Confirme sua senha</label>
                <input id="password-confirmation" name="password-confirmation" type="password" autoComplete="new-password" placeholder="Digite sua senha novamente" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
              </>
            ) : null}
            {formMode === "register" && registrationRole === "seller" ? (
              <fieldset className="seller-details">
                <legend>Conte um pouco sobre sua produção</legend>
                <label htmlFor="product">O que você vende?</label>
                <input id="product" name="product" type="text" placeholder="Ex.: pães artesanais, cerâmica..." value={product} onChange={(event) => setProduct(event.target.value)} required />
                <label htmlFor="category">Em qual categoria se encaixa?</label>
                <select id="category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  <option value="" disabled>Selecione uma categoria</option>
                  <option value="feira">Feira e alimentos</option>
                  <option value="artesanato">Artesanato</option>
                  <option value="agricultura">Agricultura local</option>
                </select>
              </fieldset>
            ) : null}
            <div className="captcha-placeholder" role="group" aria-label="Área reservada para CAPTCHA">
              <span className="captcha-checkbox" aria-hidden="true" />
              <span><strong>Verificação de segurança</strong><small>CAPTCHA será integrado nesta etapa.</small></span>
            </div>
            <button className="button button-primary login-submit" type="submit" disabled={isLoading}>{isLoading ? "Aguarde..." : formMode === "login" ? "Entrar" : "Registrar-se"}</button>
          </form>

          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <div className="login-divider"><span>ou continue com</span></div>
          <button type="button" className="google-button" onClick={handleGoogleSignIn} disabled={isLoading}><GoogleIcon /> Continuar com Google</button>
          <p className="login-terms">Ao continuar, você concorda com os <Link href="/termos">Termos de Serviço</Link> e a <Link href="/privacidade">Política de Privacidade</Link>.</p>
          <p className="login-signup">{formMode === "login" ? "Ainda não tem uma conta? Use Registrar-se para começar." : "Já tem uma conta? Use Entrar para acessar."}</p>
        </div>
      </section>
    </main>
  );
}
