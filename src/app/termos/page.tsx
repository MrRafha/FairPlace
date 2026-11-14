import Link from "next/link";

export const metadata = { title: "Termos de Serviço | FairPlace" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-back" href="/">← Voltar para o FairPlace</Link>
        <p className="eyebrow">Regras de uso</p>
        <h1>Termos de Serviço</h1>
        <p className="legal-lead">Última atualização: 14 de novembro de 2026</p>
        <section><h2>1. Sobre o FairPlace</h2><p>O FairPlace é uma vitrine digital para descobrir vendedores de feira, artesanato e agricultura local. No MVP, a plataforma não intermedeia pagamentos, entregas, frete, comissões ou logística.</p></section>
        <section><h2>2. Uso da plataforma</h2><p>Você deve fornecer informações verdadeiras, respeitar outros usuários e usar o serviço somente para finalidades lícitas. Não é permitido publicar conteúdo fraudulento, discriminatório, ilegal, ofensivo ou que viole direitos de terceiros.</p></section>
        <section><h2>3. Responsabilidade dos vendedores</h2><p>Vendedores são responsáveis por seus produtos, preços, disponibilidade, informações, fotos, licenças e negociações. O FairPlace não garante a qualidade, disponibilidade, segurança ou conclusão de uma negociação iniciada fora da plataforma.</p></section>
        <section><h2>4. Conteúdo e moderação</h2><p>Ao publicar conteúdo, você declara ter autorização para utilizá-lo e concede ao FairPlace uma licença limitada para exibi-lo dentro do serviço. Podemos ocultar ou remover conteúdo que viole estes termos ou a legislação aplicável.</p></section>
        <section><h2>5. Contato externo</h2><p>Links para WhatsApp, mapas e outros serviços levam a plataformas de terceiros. O uso delas segue seus próprios termos e políticas de privacidade.</p></section>
        <section><h2>6. Disponibilidade</h2><p>Buscamos manter o serviço disponível, mas podemos realizar manutenção, alterar funcionalidades ou suspender acessos por segurança, abuso ou exigência legal.</p></section>
        <section><h2>7. Encerramento</h2><p>Contas podem ser suspensas ou encerradas quando houver violação destes termos, risco à comunidade ou obrigação legal. O usuário pode solicitar o encerramento da conta pelo canal de atendimento definido pelo FairPlace.</p></section>
        <section><h2>8. Contato e foro</h2><p>O canal oficial de contato e a jurisdição aplicável devem ser preenchidos pelo responsável pelo serviço antes da publicação definitiva.</p></section>
        <p className="legal-note">Este texto é uma base de produto e deve ser revisado por profissional jurídico responsável antes do lançamento.</p>
      </div>
    </main>
  );
}
