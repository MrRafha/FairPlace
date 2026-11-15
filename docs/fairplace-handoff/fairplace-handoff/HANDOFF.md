# FairPlace — handoff das telas internas

Pacote para implementar as telas internas do FairPlace a partir do código do design, sem depender de prints.
Leia este arquivo primeiro, depois `design-system/README.md`.

## O que tem aqui

| Pasta / arquivo | O que é |
|---|---|
| `design-system/README.md` | Regras de uso da marca: tom, cor, tipografia, forma, foco, layout de cada tela, acessibilidade. |
| `design-system/tokens.json` | Fonte dos tokens (cores em 2 temas, tipografia, espaçamento, raios, sombras), com nota de uso em cada um. |
| `design-system/tokens.css` | Os mesmos tokens como variáveis CSS (`:root` + `[data-theme="contraste"]`). |
| `design-system/components/bundle.css` | CSS de referência dos componentes (classes `fp-*`), com hover, foco e `prefers-reduced-motion`. |
| `design-system/components/<Nome>/` | `preview.html` (exemplo de marcação) e `README.md` (quando usar, o que o consumidor fornece). |
| `telas/*.dc.html` | As telas. HTML com estilos inline: é a especificação visual exata (medidas, cores, textos). |

## Tela → rota

| Rota | Arquivo(s) |
|---|---|
| `/mapa` | `telas/Main.dc.html` (desktop) e `telas/MapaMobile.dc.html` (mobile, com alternador Lista/Mapa e botão flutuante de criar) |
| `/vendedor/[id]` | `telas/Vendedor.dc.html` |
| `/vendedor/painel` | `telas/Painel.dc.html` (abas Produtos, Publicações, Dados da vitrine) |
| criar produto (modal no desktop, tela cheia no mobile) | `telas/NovoProduto.dc.html` |
| criar publicação (idem) | `telas/NovaPublicacao.dc.html` |
| `/conta` | `telas/Conta.dc.html` |
| fallback de carregamento de página | `telas/Carregando.dc.html` |

Os arquivos `*Mobile.dc.html` de Vendedor, Painel, Conta e Carregando só embrulham a tela desktop em 390px: essas telas são fluidas e o mobile é o mesmo layout quebrando por `flex-wrap`. O único mobile com layout próprio é o do mapa.

## Como ler um `.dc.html`

- O conteúdo da tela está dentro de `<x-dc>`. Ignore `support.js` e o `<helmet>` (só carrega Poppins e Inter).
- `{{ nome }}` são valores calculados no `<script>` do fim do arquivo (`renderVals()`); `<sc-if value="{{ x }}">` é um bloco condicional.
- Os estados estão nesses condicionais:
  - `Main.dc.html`: `estado` = Lista, Carregando (cards esqueleto), Nenhum resultado, Localização negada; `menuOpen` = menu do botão Criar.
  - `MapaMobile.dc.html`: `visao` = Lista ou Mapa; `menuOpen` = menu do botão flutuante.
  - `Vendedor.dc.html`: `vitrineVazia` troca produtos e publicações pelos estados vazios.
  - `Painel.dc.html`: `aba` = Produtos, Publicações, Dados da vitrine.
  - `Conta.dc.html`: `semFavoritos` mostra o estado vazio de favoritos.
- Links `href="Outra.dc.html"` indicam a navegação entre telas.

## Regras de implementação

1. Reaproveite as variáveis CSS que o projeto já tem (`--green`, `--green-dark`, `--green-soft`, `--yellow`, `--ink`, `--muted`, `--paper`, `--line`). Os valores são os mesmos.
2. Adicione só os tokens novos: `--yellow-soft`, `--amber-dark`, `--olive`, `--olive-soft`, `--surface`, `--line-strong`, `--on-fill`, `--danger`, `--danger-soft`, `--focus`, os raios, espaçamentos e sombras. Valores em `tokens.css`.
3. Nas telas os hex estão escritos direto porque é um mockup. No código, use sempre a variável correspondente (a nota de uso em `tokens.json` diz qual é qual), senão o modo alto contraste quebra.
4. Hover, foco e redução de movimento não aparecem nos `.dc.html` (estilos inline não têm pseudo-classe). Pegue de `bundle.css`: foco é `outline: 3px solid var(--focus); outline-offset: 2px`; card em hover sobe 2px com `--shadow-card` e borda `--green`.
5. Texto `--green` sobre `--green-soft` não passa em contraste: sobre fundo `-soft` use `--green-dark`.
6. O botão Criar (header no desktop, flutuante no mobile) só aparece para usuário que é vendedor.
7. O mapa das telas é ilustrativo (blocos e ruas desenhados). Mantenha o componente de mapa real do projeto e aplique só os pins, o popup e a toolbar.
8. No painel, "Disponível / Indisponível" está como checkbox; o design system especifica um interruptor (`fp-switch` em `bundle.css`). Use o interruptor.
9. Ícones das telas são SVG de linha desenhados para o mockup. Se o projeto já tem um conjunto de ícones, use o do projeto mantendo o estilo (traço ~1.7, pontas arredondadas).
10. Nomes, produtos, preços e endereços são dados de exemplo. Fotos são placeholders.

## Ordem sugerida

1. Tokens novos + componentes base (Button, FilterChip, Badge, FormField, SearchField, EmptyState).
2. `/mapa` (desktop e mobile).
3. `/vendedor/[id]`.
4. `/vendedor/painel` + criar produto + criar publicação.
5. `/conta`.
6. Fallback de carregamento.
