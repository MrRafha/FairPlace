Card de vendedor na lista lateral do mapa e em "Vendedores favoritos" na conta.

O card inteiro é um link para o perfil público. Mostra a caixa de ícone da categoria, o nome da vitrine, a linha "Categoria · distância", o endereço aproximado e, quando houver, o badge Verificado. No hover sobe 2px, ganha `shadow-card` e borda `green`. O vendedor selecionado no mapa recebe `aria-current="true"` (borda `green` dupla).

Você fornece nome, categoria, distância (ou só o endereço, se a localização foi negada) e se é verificado. Enquanto a lista carrega, mostre três cards esqueleto com `fp-skel`. Em Favoritos, coloque um botão quieto "Remover" fora do link, à direita. Lista com gap `space-3`; nunca mais de duas linhas de legenda por card.
