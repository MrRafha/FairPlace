Campo de formulário com label visível, usado no Painel do vendedor e em Minha conta.

- `fp-field`: agrupa `fp-label`, `fp-input` (input ou textarea) e, opcionalmente, uma ajuda em `fp-caption` ou um erro em `fp-error`.
- Somente leitura (`readonly`): fundo `paper` e texto `muted`, com uma ajuda dizendo por quê.
- Erro: `aria-invalid="true"` no campo, mensagem com ícone ligada por `aria-describedby`. A mensagem diz como corrigir.
- `fp-switch`: interruptor para "Disponível / Indisponível"; o texto ao lado muda junto com o estado.

Você fornece o `id`, o texto da label e a ajuda. Agrupe campos relacionados dentro de um card `surface` com padding `space-6`, um assunto por card, e feche cada card com seu próprio botão primário. Campos em coluna única no mobile; no desktop, no máximo dois por linha.
