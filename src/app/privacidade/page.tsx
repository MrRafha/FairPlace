"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-back" href="/">← Voltar para o FairPlace</Link>
        <p className="eyebrow">Transparência</p>
        <h1>Política de Privacidade</h1>
        <p className="legal-lead">Última atualização: 14 de novembro de 2026</p>

        <section><h2>1. Quem somos</h2><p>O FairPlace é uma plataforma de descoberta de feiras, artesanato e agricultura local. Esta política explica como tratamos dados pessoais quando você navega, cria uma conta ou entra em contato com vendedores.</p><p><strong>Controlador:</strong> FairPlace — dados de identificação e contato do responsável devem ser preenchidos antes da publicação.</p></section>
        <section><h2>2. Dados que podemos tratar</h2><ul><li>Dados de conta, como nome, e-mail e informações de autenticação.</li><li>Informações de vendedor, como nome comercial, categoria, região aproximada, produtos, fotos e WhatsApp.</li><li>Dados enviados voluntariamente em mensagens, avaliações ou solicitações de suporte.</li><li>Dados técnicos mínimos necessários para segurança, funcionamento e prevenção de abuso.</li></ul></section>
        <section><h2>3. Finalidades e bases legais</h2><p>Usamos esses dados para fornecer o mapa e as vitrines, permitir o contato direto com vendedores, manter a segurança, responder solicitações e cumprir obrigações legais. A base legal aplicável pode ser a execução do serviço, o cumprimento de obrigação legal, o legítimo interesse ou o consentimento, conforme o caso.</p></section>
        <section><h2>4. Localização e privacidade</h2><p>O FairPlace prioriza região ou bairro e não deve expor coordenadas residenciais exatas por padrão. O usuário deve evitar publicar dados pessoais desnecessários em descrições, fotos ou mensagens.</p></section>
        <section><h2>5. Compartilhamento</h2><p>Não vendemos dados pessoais. Podemos compartilhar o mínimo necessário com provedores que hospedam a aplicação, autenticação, banco de dados, análise autorizada e segurança. O contato iniciado com um vendedor pode abrir serviços externos, como o WhatsApp, sujeitos às políticas desses serviços.</p></section>
        <section><h2>6. Cookies e analytics</h2><p>Cookies necessários permitem lembrar preferências essenciais. O Google Analytics só é carregado depois do aceite específico no banner. Você pode alterar sua escolha em <button type="button" className="legal-inline-button" onClick={openCookiePreferences}>Preferências de cookies</button>.</p></section>
        <section><h2>7. Direitos do titular</h2><p>Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, eliminação quando aplicável, informação sobre compartilhamentos e revogação do consentimento. O canal de atendimento do controlador deve ser informado antes da publicação.</p></section>
        <section><h2>8. Retenção e segurança</h2><p>Guardamos dados somente pelo tempo necessário às finalidades informadas ou às obrigações legais. Adotamos controles técnicos e organizacionais compatíveis com o porte e os riscos do serviço, mas nenhum sistema conectado à internet é completamente livre de riscos.</p></section>
        <section><h2>9. Alterações</h2><p>Podemos atualizar esta política para refletir mudanças no produto ou na legislação. A data de atualização será alterada no topo desta página.</p></section>
        <p className="legal-note">Este texto é uma base de produto e deve ser revisado por profissional jurídico responsável antes do lançamento.</p>
      </div>
    </main>
  );
}

function openCookiePreferences() {
  window.dispatchEvent(new Event("fairplace:open-cookie-preferences"));
}
