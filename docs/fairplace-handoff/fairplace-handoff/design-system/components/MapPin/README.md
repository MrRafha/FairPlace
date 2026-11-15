Pin em gota do mapa, com o popup do vendedor e a toolbar flutuante.

- `fp-pin--feira` (`green`), `--artesanato` (`yellow` com contorno `amber-dark` e ícone `ink`), `--agricultura` (`olive`). Cada pin leva o ícone da categoria dentro: cor nunca é o único sinal.
- `fp-popup`: abre ao clicar no pin. Badge de categoria, nome, distância e endereço, link "Ver perfil". Usa `shadow-card`.
- `fp-maptool`: pílula flutuante no canto superior direito com o nome da cidade ("Corrente, PI") e o botão "Minha localização".

Você fornece a categoria, a posição e um `aria-label` no formato "Categoria: nome do vendedor". Cada pin precisa ter o mesmo vendedor na lista lateral (VendorCard), que é o caminho por teclado; ao abrir o popup, marque o card correspondente com `aria-current="true"`. Se a localização for negada, a toolbar continua visível e a lista troca distância por endereço.
