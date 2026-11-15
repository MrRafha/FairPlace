# Briefing de Design — FairPlace (telas internas do app)

> Use este documento no Claude.ai para gerar referências de design das telas internas do FairPlace. Ele descreve a identidade visual **já existente** (a landing page e a tela de login estão prontas e bonitas) e pede que as telas internas sigam o mesmo sistema, com mais capricho visual do que a versão funcional atual.

---

## 1. Sobre o produto

**FairPlace** é um marketplace de descoberta de pequenos vendedores locais — feira e alimentos, artesanato e agricultura local. O usuário encontra vendedores num **mapa**, abre o **perfil público** do vendedor, vê produtos e publicações, e favorita. Vendedores têm um **painel** para gerenciar vitrine, produtos e publicações. A cidade-foco inicial é **Corrente, Piauí**.

Tom da marca: **acolhedor, local, artesanal, confiável**. "O que é feito perto, chega mais perto." Nada corporativo ou frio — é sobre gente real, produção local, proximidade.

---

## 2. Sistema visual (OBRIGATÓRIO seguir)

Estas são as variáveis CSS reais do projeto. **Todas as telas devem usar exatamente esta paleta e tipografia** para manter consistência com a landing page que já existe.

### Cores
| Token | Hex | Uso |
|---|---|---|
| `--green` | `#2f7d4a` | Cor primária. Botões principais, destaques, links ativos, ícones. |
| `--green-dark` | `#205936` | Hover de botões verdes, estados pressionados. |
| `--green-soft` | `#e7f1e9` | Fundos de destaque suave, chips ativos, ícones em caixa, badges. |
| `--yellow` | `#f2b84b` | Cor de acento (sol/mel/colheita). Detalhes, segunda categoria, pontos de destaque. Usar com parcimônia. |
| `--ink` | `#1f2933` | Texto principal, títulos. |
| `--muted` | `#66736b` | Texto secundário, legendas, placeholders. |
| `--paper` | `#f8f6f0` | Fundo da página (bege quente, NÃO branco puro). |
| `--line` | `#dfe5df` | Bordas, divisórias. |
| Branco `#ffffff` | — | Fundo de cards e superfícies elevadas sobre o `--paper`. |

Há também um modo **alto contraste** (acessibilidade) — o design precisa funcionar com cores mais saturadas sem quebrar.

### Tipografia
- **Poppins** (500–800): títulos, nome da marca, headings, números grandes. Letras com `letter-spacing` negativo apertado (ex.: `-1.5px` a `-3px` em títulos grandes).
- **Inter**: corpo de texto, labels, parágrafos.
- Eyebrows (pequenos rótulos acima de títulos): Inter, 11px, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: ~1.25px`, cor `--green`, muitas vezes com uma bolinha amarela antes.

### Formas e elevação
- **Border-radius generoso**: cards 12–16px, botões 8–10px, chips/pills 99px (totalmente arredondados).
- **Sombras suaves e difusas**, sempre com a cor da tinta em baixa opacidade: ex. `0 8px 22px rgba(31,41,51,0.12)`. Nunca sombras duras ou pretas sólidas.
- **Cards brancos sobre fundo bege** (`--paper`), com borda `1px solid --line`.
- Hover de cards: elevar levemente (`translateY(-2px a -3px)`) + sombra mais forte + borda esverdeada.
- Ícones: estilo **linha (stroke), não preenchido**, `stroke-width` ~1.6–1.8, `stroke-linecap/linejoin: round`. Geralmente dentro de uma caixinha `--green-soft` arredondada.

### Botões (padrões que já existem)
- **Primário**: fundo `--green`, texto branco, sombra verde suave, hover `--green-dark` + leve elevação.
- **Quieto/secundário**: borda `--line`, texto `--ink`, hover borda verde + texto verde.
- **Escuro**: fundo escuro (`--ink`), texto branco (usado em CTAs de vendedor).
- Altura mínima ~44–48px, peso 700, `gap` interno para ícone.

### Categorias (identidade visual fixa)
- **Feira e alimentos** → verde, ícone de barraca/toldo de feira.
- **Artesanato** → amarelo/âmbar, ícone de peça artesanal (ex.: cerâmica, losango/diamante).
- **Agricultura local** → verde oliva, ícone de folha/broto.

---

## 3. Telas a (re)desenhar

Para cada tela abaixo, quero um **mockup visual de alta fidelidade** (desktop e mobile) seguindo o sistema acima. Foque em hierarquia, respiro, microinterações e capricho — a estrutura funcional já existe, falta o acabamento visual.

### 3.1 Página do Mapa (`/mapa`) — PRINCIPAL
Tela de descoberta. É a mais importante.
- **Layout**: barra lateral esquerda (lista de vendedores) + mapa grande à direita. Em mobile, vira lista em cima / mapa embaixo (ou um toggle).
- **Header do app**: logo FairPlace à esquerda, ações à direita (Minha conta, Sair).
- **Barra lateral**:
  - Filtros por categoria no topo (chips arredondados: Todos / Feira / Artesanato / Agricultura).
  - Lista de cards de vendedores (nome, categoria, distância/endereço, badge "Verificado" quando aplicável). Card com hover elevado.
  - Idealmente um campo de busca no topo (hoje não existe, seria ótimo desenhar).
- **Mapa**: pins em formato de gota coloridos por categoria. Ao clicar, popup com nome + link para o perfil. Uma toolbar flutuante no canto (label da cidade "Corrente, PI" + botão "Minha localização").
- **Estados**: carregando, nenhum vendedor encontrado, localização negada.
- **Desejo**: que pareça um app de mapas moderno e acolhedor (referência de qualidade: Airbnb, mas com a alma local/artesanal do FairPlace). Hoje está funcional porém "cru" — quero charme.

### 3.2 Perfil público do vendedor (`/vendedor/[id]`)
Página que convence o usuário a visitar/contatar o vendedor.
- **Cabeçalho do vendedor**: avatar/logo (ou placeholder da marca), nome da vitrine, categoria, badge "Verificado", descrição curta, botão **Favoritar** (estrela).
- **Seções, nesta ordem**: Produtos disponíveis (grid de cards com imagem, nome, preço em R$), Atualizações (feed de publicações com data e imagem opcional), Localização e contato (endereço aproximado, horários, telefone/WhatsApp).
- **Estados vazios elegantes**: "ainda não cadastrou produtos", "nenhuma publicação ainda".
- Tratar vendedor sem foto com placeholder da marca (logo FairPlace).

### 3.3 Painel do vendedor (`/vendedor/painel`)
Área de trabalho do vendedor (autenticada).
- **Edição do perfil de vendedor**: formulário com nome da vitrine, categoria, descrição, horários, endereço, contato, botão "usar minha localização".
- **Gestão de produtos**: formulário de novo produto (nome, preço, categoria, descrição, imagem, disponível sim/não) + lista dos produtos com ação de excluir e marcar disponível/indisponível.
- **Gestão de publicações**: campo para nova publicação (texto + imagem opcional) + lista com ação de excluir.
- Quero que pareça um painel organizado e amigável (não um admin corporativo frio). Agrupar em blocos/cards claros.

### 3.4 Minha conta (`/conta`)
- Blocos: Dados da conta (nome, e-mail somente leitura, foto), Alterar senha, Vendedores favoritos (lista com remover), atalho para o Painel de vendedor (se for vendedor), e uma zona de perigo para Excluir conta (com confirmação).
- Visual limpo, foco em formulários bem espaçados e legíveis.

### 3.5 Feed do vendedor
(É a seção "Atualizações" dentro do perfil público + a criação no painel — desenhar como o vendedor posta e como o consumidor vê. Cards de publicação com data, texto e imagem opcional, ordenados do mais recente ao mais antigo.)

---

## 4. Diretrizes transversais

- **Acessibilidade é requisito**, não enfeite: contraste adequado, foco visível (um anel/outline claro), navegação por teclado, labels em formulários, não depender só de cor para transmitir informação (ex.: no mapa, a lista lateral é a alternativa aos pins).
- **Responsivo**: desktop, tablet e mobile. O fluxo principal precisa funcionar bem no celular.
- **Respeita modo alto contraste e redução de movimento**.
- **Microcópia em português do Brasil**, tom caloroso e direto.
- **Consistência acima de novidade**: tudo deve parecer a mesma família visual da landing page (bege quente, verde, cards arredondados, Poppins nos títulos).

---

## 5. O que pedir ao Claude.ai

> "Com base neste sistema de design (paleta, tipografia e tom descritos acima), gere mockups de alta fidelidade para as telas do FairPlace: mapa, perfil do vendedor, painel do vendedor e minha conta. Mantenha a paleta exata (verde #2f7d4a, amarelo #f2b84b, fundo bege #f8f6f0, tinta #1f2933), títulos em Poppins com letter-spacing apertado, cards brancos arredondados com sombras suaves, ícones em linha, e o tom acolhedor/local da marca. Mostre versões desktop e mobile, e inclua os estados de vazio e carregamento."

Entregue, se possível: paleta aplicada, exemplos de card de vendedor, card de produto, chip de filtro, botão primário/secundário, e o layout completo de cada tela.
