import Link from "next/link";

export const metadata = { title: "Aviso de Cookies | FairPlace" };

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-back" href="/">← Voltar para o FairPlace</Link>
        <p className="eyebrow">Controle de preferências</p>
        <h1>Aviso de Cookies</h1>
        <p className="legal-lead">Última atualização: 14 de novembro de 2026</p>
        <section><h2>O que são cookies?</h2><p>Cookies são pequenos arquivos ou identificadores armazenados no navegador para lembrar preferências e apoiar o funcionamento de um site.</p></section>
        <section><h2>Cookies necessários</h2><p>O FairPlace pode armazenar a escolha do banner de consentimento no navegador. Esse registro é necessário para respeitar sua preferência e não carrega o Google Analytics sozinho.</p></section>
        <section><h2>Google Analytics</h2><p>O Google Analytics é opcional. Ele só é carregado quando você seleciona “Aceitar analytics” e pode ajudar a entender páginas visitadas, dispositivo e interações agregadas. O identificador de medição deve ser configurado pelo responsável do projeto.</p></section>
        <section><h2>Como alterar sua escolha</h2><p>Você pode reabrir o painel de preferências pelo link “Preferências de cookies” no rodapé. Também pode apagar os dados do site nas configurações do navegador.</p></section>
        <p className="legal-note">Este aviso deve ser revisado junto da Política de Privacidade e validado juridicamente antes do lançamento.</p>
      </div>
    </main>
  );
}
