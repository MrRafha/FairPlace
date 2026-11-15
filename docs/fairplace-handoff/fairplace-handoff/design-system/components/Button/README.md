Botão de ação, com altura mínima de 46px e peso 700.

- `fp-btn--primary`: a ação principal do bloco ("Falar no WhatsApp", "Salvar alterações"). Um por bloco.
- `fp-btn--quiet`: ações secundárias ("Como chegar", "Sair", "Cancelar").
- `fp-btn--dark`: CTAs voltados ao vendedor ("Abrir meu painel", "Quero vender aqui").
- `fp-btn--danger`: excluir conta, produto ou publicação. Sempre pede confirmação.
- `fp-btn--fav`: favoritar. Controle com `aria-pressed`; o texto muda junto ("Favoritar" / "Favoritado"), a cor não é o único sinal.
- `fp-btn--pill`: versão compacta de 36px, só dentro da toolbar flutuante do mapa.

Você fornece o texto (verbo na frente) e, se quiser, um ícone de linha de 20px antes dele. Durante o envio, use `disabled` e troque o texto ("Salvando…"). Não coloque dois primários lado a lado.
