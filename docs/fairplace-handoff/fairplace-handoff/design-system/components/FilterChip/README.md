Chip arredondado para filtrar a lista e os pins do mapa por categoria.

Use uma fileira no topo da barra lateral, logo abaixo da busca: "Todos", "Feira", "Artesanato", "Agricultura". Apenas um fica ativo por vez; o ativo recebe `aria-pressed="true"`, fundo `green-soft`, borda `green` e texto `green-dark`.

Você fornece o rótulo curto (uma palavra) e o ícone da categoria. Agrupe os chips em um elemento com `role="group"` e `aria-label`. No mobile a fileira rola na horizontal em vez de quebrar linha. Não use chip para ações (isso é Button) nem para mostrar status (isso é Badge).
