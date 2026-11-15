FairPlace é uma vitrine de descoberta de pequenos vendedores locais (feira e alimentos, artesanato, agricultura local) baseada em mapa, começando por Corrente, Piauí. Não há checkout: toda tela leva ao contato direto (WhatsApp) ou à visita. O tom é acolhedor, local, artesanal e confiável — gente real, nada corporativo.

## Fundamentos de conteúdo

- Escreva em português do Brasil, caloroso e direto. Fale com "você"; o vendedor fala "minha vitrine", "meus produtos".
- Frases curtas, verbo na frente nos botões: "Falar no WhatsApp", "Como chegar", "Favoritar", "Usar minha localização", "Salvar alterações".
- Títulos em caixa normal (só a primeira letra maiúscula). Caixa alta apenas no estilo `eyebrow`.
- Preços sempre como `R$ 12,00`, com unidade em `caption` quando houver ("o quilo", "a unidade").
- Estados vazios convidam, não culpam: "Esta vitrine ainda não cadastrou produtos. Volte em breve ou fale direto com o vendedor."
- Erros dizem o que aconteceu e o que fazer: "Não conseguimos acessar sua localização. Você ainda pode explorar o mapa de Corrente."
- Sem emoji na interface. A assinatura da marca é "O que é feito perto, chega mais perto."

## Fundamentos visuais

### Cor

- A página é `paper`; cards, campos e popups são `surface` com borda `1px solid` em `line`. Nunca use branco puro como fundo de página.
- `green` é a cor de ação: botão primário, links, eyebrows. Passe para `green-dark` no hover e sempre que o texto estiver sobre `green-soft`.
- `yellow` é acento, com parcimônia: bolinha do eyebrow, pin de Artesanato, estrela de favorito. Nunca texto, nunca o único sinal de um estado.
- Texto principal em `ink`, secundário em `muted` (apenas sobre `surface` e `paper`).
- Categorias têm identidade fixa, sempre cor + ícone + nome:
  - Feira e alimentos → `green` / `green-soft`, ícone de barraca com toldo.
  - Artesanato → `yellow` / `yellow-soft`, texto em `amber-dark`, ícone de losango.
  - Agricultura local → `olive` / `olive-soft`, ícone de broto.
- `danger` e `danger-soft` só na zona de perigo, em excluir e em erros.
- O tema Alto contraste troca os mesmos tokens por valores com 7:1 no texto e bordas visíveis. Não escreva hex direto em tela nenhuma: use sempre os tokens, senão o tema quebra.

### Tipografia

- Títulos, nome da marca, preços e números grandes em Poppins (`display`, `h1`, `h2`, `h3`, `price`), com letter-spacing negativo.
- Todo o resto em Inter (`body`, `label`, `caption`, `eyebrow`).
- `eyebrow` fica acima de títulos de seção, em `green`, com uma bolinha `yellow` de 6px antes.
- Não há logo no sistema: escreva "FairPlace" em Poppins 800, `ink`, até o arquivo oficial da marca ser adicionado em Assets.

### Forma, borda e elevação

- Raios: `radius-sm` em botões e campos, `radius-md` em caixas de ícone e imagens, `radius-lg` em cards e blocos, `radius-full` em chips, badges, busca e toolbar do mapa.
- Cards em repouso não têm sombra, só a borda `line`. No hover: `translateY(-2px)`, `shadow-card` (ou `shadow-hover` nos cards grandes) e borda `green`.
- Sombras sempre difusas e na cor da tinta. Nunca sombra preta ou dura.
- Campos de formulário usam borda `line-strong`; `line` sozinha não delimita um controle.

### Estados e movimento

- Foco: `outline: 3px solid` em `focus`, `outline-offset: 2px`, em todo elemento interativo. Nunca remova.
- Alvos de toque com no mínimo 44px de altura.
- Transições de 150ms em cor, sombra e transform. Com `prefers-reduced-motion`, sem transform e sem animação de carregamento.
- Selecionado e ativo sempre trazem um segundo sinal além da cor (borda mais forte, ícone de check, `aria-pressed`).

### Espaçamento e layout

- Use a escala `space-1` a `space-12`. Blocos de painel e conta têm padding `space-6`; seções se separam por `space-8`.
- Header do app: "FairPlace" à esquerda, "Minha conta" e "Sair" à direita, fundo `surface`, borda inferior `line`.
- Mapa (`/mapa`): barra lateral de 380px à esquerda (SearchField, FilterChip, lista de VendorCard) e mapa ocupando o resto. No mobile, um alternador Lista / Mapa. A lista é a alternativa acessível aos pins: tudo que está no mapa está na lista.
- Perfil do vendedor: cabeçalho (avatar, `h1`, Badge de categoria e Verificado, descrição, botão Favoritar), depois Produtos disponíveis (grid de ProductCard), Atualizações (PostCard, do mais recente ao mais antigo), Localização e contato.
- Painel do vendedor e Minha conta: coluna única de até 760px, um card `surface` por assunto, cada um com `h2` e um botão primário próprio. A zona de perigo é o último bloco, em `danger-soft`.

## Iconografia

- Ícones de linha, nunca preenchidos: `stroke-width` 1.7, pontas e junções arredondadas, grade de 24px, cor herdada do texto.
- Em destaque, o ícone vai dentro de uma caixa de 40px com `radius-md` e fundo `-soft` da categoria.
- Os ícones usados nas prévias dos componentes foram desenhados para este sistema seguindo essa regra; substitua pelos SVGs do projeto quando forem adicionados em Assets.
- No lugar de foto de vendedor ou produto ausente, use um bloco `green-soft` com o ícone da categoria em `green-dark`.

## Acessibilidade

- Texto com contraste mínimo de 4.5:1; siga a nota de uso de cada token de cor para saber sobre quais fundos ele funciona.
- `green` e `olive` têm luminosidade próxima, e `yellow` não chega a 3:1 sobre `paper`: categoria nunca é comunicada só por cor.
- Todo campo tem `label` visível; erro aparece em texto, com ícone, ligado ao campo.
- Toda ação do mapa (abrir perfil, filtrar, localizar) existe também fora dele, navegável por teclado.
