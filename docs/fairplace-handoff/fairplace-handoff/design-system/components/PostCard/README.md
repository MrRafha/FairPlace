Publicação do feed do vendedor, nas duas pontas: o compositor no painel e o card na seção "Atualizações" do perfil público.

- `fp-post`: cabeçalho com a caixa de ícone (ou avatar) do vendedor, nome e data em `caption`; texto em `body`; imagem opcional com `radius-md`.
- `fp-composer`: campo de texto com label "Nova publicação", botão quieto "Adicionar imagem" e botão primário "Publicar".

Você fornece nome do vendedor, data, texto e imagem (opcional, com texto alternativo). Ordene do mais recente ao mais antigo, uma coluna de até 640px, gap `space-4`. Mostre a data por extenso com o tempo relativo ("14 de novembro · há 2 horas"). No painel, cada publicação da lista ganha um botão de excluir (`fp-btn--danger`) com confirmação. Sem publicações, use o EmptyState "Nenhuma publicação ainda".
