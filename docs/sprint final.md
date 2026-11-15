# Sprint final — primeira versão funcional do FairPlace

## Objetivo

Entregar a primeira versão funcional do FairPlace, transformando a landing page e os fluxos visuais atuais em um produto navegável, com autenticação, mapa de negócios locais, perfis de vendedores e publicação de produtos.

O foco desta sprint é validar o ciclo principal:

1. Usuário cria uma conta ou entra.
2. Usuário encontra vendedores no mapa.
3. Usuário abre o perfil de um vendedor.
4. Usuário visualiza produtos e publicações.
5. Usuário consegue voltar ao mapa e continuar descobrindo negócios locais.

O escopo inicial permanece limitado a:

- Feira e alimentos.
- Artesanato.
- Agricultura local.

---

## Estado atual

### Já encaminhado

- Landing page baseada na direção visual.
- Identidade visual e logos oficiais integradas.
- Categorias principais definidas.
- Layout responsivo inicial.
- Revelação de conteúdo durante o scroll.
- Preferências de cookies e contraste.
- Páginas de privacidade, termos e cookies.
- Preparação para Google Analytics.
- Página visual de login.
- Alternância entre `Entrar` e `Registrar-se`.
- Seleção de consumidor ou vendedor durante o cadastro.
- Campos adicionais de vendedor:
  - O que vende.
  - Categoria da atividade.
- Marcador visual reservado para CAPTCHA.

### Ainda não funcional

- Providers reais do NextAuth.
- Cadastro persistido no banco.
- Senhas armazenadas com hash.
- CAPTCHA integrado.
- Mapa interativo.
- Busca e filtros conectados a dados reais.
- Perfil persistido do usuário.
- Perfil público do vendedor.
- Feed de publicações.
- Cadastro e gerenciamento de produtos.
- Upload de imagens.

---

# Etapas da sprint

## Etapa 1 — Autenticação e cadastro

### Objetivo

Permitir que uma pessoa crie uma conta, entre novamente sem criar outra conta e encerre a sessão com segurança.

### Necessidades técnicas

- Configurar `CredentialsProvider` no NextAuth.
- Configurar `GoogleProvider`.
- Adicionar `passwordHash` ao modelo `User`.
- Criar uma migração Prisma.
- Usar algoritmo seguro de hash, como Argon2 ou bcrypt.
- Criar endpoint de registro.
- Validar:
  - Nome obrigatório.
  - E-mail válido.
  - E-mail único.
  - Senha com tamanho mínimo.
  - Confirmação de senha.
  - Papel selecionado.
- Nunca retornar ou armazenar a senha em texto puro.
- Diferenciar claramente:
  - Login: autentica conta existente.
  - Registro: cria uma conta nova.
- Redirecionar usuários autenticados para o mapa.
- Proteger rotas privadas no servidor.
- Implementar logout.
- Exibir mensagens para:
  - E-mail já cadastrado.
  - Credenciais inválidas.
  - Provider indisponível.
  - Erro de banco.

### Cadastro de vendedor

Quando o usuário escolher vendedor, o cadastro deverá salvar:

- Nome da pessoa ou negócio.
- Tipo de vendedor.
- Produto principal.
- Categoria.
- Localização inicial, quando disponível.

A seleção de vendedor não deve impedir que a pessoa também use a plataforma como consumidora.

### Critérios de aceite

- Uma conta pode ser criada uma única vez por e-mail.
- A mesma conta consegue entrar novamente.
- Tentar cadastrar um e-mail existente gera erro explícito.
- O login não cria usuários.
- O logout invalida a sessão.
- Senhas não aparecem em logs, respostas ou banco.
- Usuário não autenticado não acessa páginas privadas.

---

## Etapa 2 — Modelagem de dados

### Objetivo

Criar a base persistente para usuários, vendedores, produtos, localizações e publicações.

### Modelos necessários

#### User

- `id`
- `name`
- `email`
- `passwordHash`
- `image`
- `role`
- `createdAt`
- `updatedAt`

#### SellerProfile

- `id`
- `userId`
- `displayName`
- `description`
- `category`
- `phone` ou canal de contato
- `address`
- `latitude`
- `longitude`
- `openingHours`
- `isVerified`
- `createdAt`
- `updatedAt`

#### Listing

- `id`
- `sellerId`
- `title`
- `description`
- `price`
- `imageUrl`
- `category`
- `available`
- `createdAt`
- `updatedAt`

#### SellerPost

- `id`
- `sellerId`
- `text`
- `imageUrl`
- `createdAt`
- `updatedAt`

#### Favorite

- `id`
- `userId`
- `sellerId`
- `createdAt`

### Regras importantes

- Um usuário pode possuir no máximo um perfil de vendedor principal.
- Um vendedor pode possuir vários produtos.
- Um vendedor pode possuir várias publicações.
- Um consumidor não pode criar produto sem perfil de vendedor.
- Um usuário não pode favoritar o mesmo vendedor duas vezes.
- Produtos indisponíveis não devem aparecer como disponíveis no mapa.
- Dados de localização devem ser validados.

### Critérios de aceite

- Migração executa em banco limpo.
- Migração não destrói dados existentes.
- Relações possuem chaves estrangeiras.
- Exclusões respeitam as regras de negócio.
- O Prisma Client é atualizado após a migração.

---

## Etapa 3 — Página do mapa

### Objetivo

Fazer do mapa o ponto principal de descoberta de vendedores locais.

### Funcionalidades

- Exibir mapa interativo.
- Centralizar em uma região inicial configurável.
- Solicitar localização do usuário somente com consentimento.
- Exibir pins de vendedores.
- Diferenciar pins por categoria.
- Abrir resumo ao clicar em um pin.
- Link para o perfil completo do vendedor.
- Buscar por:
  - Nome do vendedor.
  - Produto.
  - Categoria.
  - Região.
- Filtrar por:
  - Feira e alimentos.
  - Artesanato.
  - Agricultura local.
- Ordenar por proximidade.
- Exibir lista alternativa em telas menores.

### Estados obrigatórios

- Carregando mapa.
- Carregando vendedores.
- Nenhum vendedor encontrado.
- Permissão de localização recusada.
- Erro da API de mapas.
- Erro de carregamento dos vendedores.
- Mapa sem conexão.

### Acessibilidade

- Não depender apenas de pins visuais.
- Disponibilizar lista navegável por teclado.
- Usar nomes acessíveis para pins.
- Permitir abrir o vendedor sem mouse.
- Garantir contraste entre pins e mapa.

### Critérios de aceite

- Usuário consegue localizar pelo menos um vendedor de teste.
- Filtros alteram os resultados reais.
- Clicar em um resultado abre o vendedor correto.
- A tela continua utilizável sem conceder localização.
- O mapa não bloqueia a navegação por teclado.

---

## Etapa 4 — Perfil público do vendedor

### Objetivo

Criar uma página confiável para o usuário conhecer um vendedor antes de entrar em contato ou visitar o local.

### Informações

- Foto ou logo.
- Nome da vitrine.
- Descrição.
- Categoria.
- Localização aproximada.
- Região de atendimento.
- Horários.
- Produtos disponíveis.
- Publicações recentes.
- Canal de contato.
- Indicador de verificação.
- Botão de favorito.

### Estrutura recomendada

1. Cabeçalho do vendedor.
2. Descrição curta.
3. Categorias atendidas.
4. Produtos em destaque.
5. Feed de atualizações.
6. Localização e horários.
7. Contato.

### Regras

- Não expor dados privados do usuário.
- Exibir localização aproximada quando o endereço exato não for necessário.
- Não exibir produto indisponível como disponível.
- Tratar vendedor sem imagem com placeholder da marca.
- Informar quando o vendedor ainda não publicou conteúdo.

### Critérios de aceite

- Perfil abre a partir do mapa.
- Dados exibidos vêm do banco.
- Produtos e publicações pertencem ao vendedor correto.
- O perfil funciona em mobile.
- O usuário consegue favoritar e desfavoritar.

---

## Etapa 5 — Feed e produtos do vendedor

### Objetivo

Permitir que o vendedor mostre o que está produzindo, vendendo ou levando para a feira.

### Feed

- Criar publicação textual.
- Adicionar imagem opcional.
- Editar publicação própria.
- Excluir publicação própria.
- Exibir data da publicação.
- Ordenar da mais recente para a mais antiga.

### Produtos

- Criar produto.
- Editar produto.
- Marcar como disponível ou indisponível.
- Informar nome, preço, descrição e categoria.
- Adicionar imagem.
- Excluir produto próprio.

### Controle de acesso

- Apenas o proprietário edita seus produtos.
- Apenas o proprietário exclui suas publicações.
- Consumidores visualizam, mas não alteram.
- Usuários sem perfil vendedor não acessam o painel de vendedor.

### Critérios de aceite

- Vendedor consegue publicar um item.
- O item aparece no perfil público.
- Alterações são refletidas sem dados desatualizados.
- Produto indisponível é tratado corretamente.
- Erros de validação são apresentados no formulário.

---

## Etapa 6 — Perfil do usuário

### Objetivo

Permitir que cada pessoa controle seus dados e preferências.

### Funcionalidades

- Visualizar dados da conta.
- Editar nome e imagem.
- Editar localização.
- Gerenciar favoritos.
- Acessar seus vendedores salvos.
- Alterar senha.
- Excluir conta.
- Sair da sessão.
- Acessar o painel de vendedor quando aplicável.

### Se o usuário for vendedor

- Editar perfil público.
- Alterar descrição.
- Alterar categoria.
- Alterar localização.
- Atualizar horários.
- Gerenciar produtos.
- Gerenciar publicações.

### Critérios de aceite

- Alterações persistem após recarregar a página.
- O usuário só edita os próprios dados.
- A exclusão de conta exige confirmação.
- A saída encerra a sessão.
- O perfil funciona com e sem perfil vendedor.

---

## Etapa 7 — Imagens e arquivos

### Objetivo

Permitir imagens confiáveis para perfis, produtos e publicações.

### Necessidades

- Escolher provedor de armazenamento.
- Validar tipo de arquivo.
- Validar tamanho máximo.
- Redimensionar ou otimizar imagens.
- Gerar `alt` ou descrição acessível.
- Remover arquivos órfãos.
- Impedir upload de formatos perigosos.
- Exibir estado de upload.
- Exibir erro quando o upload falhar.

### Critérios de aceite

- Imagem aparece corretamente no perfil.
- Upload inválido é rejeitado.
- Imagens grandes não quebram o layout.
- O usuário consegue substituir uma imagem.
- Imagens removidas não ficam acumuladas sem necessidade.

---

## Etapa 8 — CAPTCHA, segurança e proteção contra abuso

### Objetivo

Proteger registro, login e ações públicas sem prejudicar acessibilidade.

### Necessidades

- Escolher provedor de CAPTCHA.
- Configurar chaves no ambiente.
- Integrar validação no servidor.
- Não confiar apenas no estado visual do checkbox.
- Aplicar proteção principalmente em:
  - Registro.
  - Login após tentativas repetidas.
  - Publicação de conteúdo.
  - Formulários de contato.
- Criar mensagens de erro compreensíveis.
- Garantir alternativa acessível.

### Critérios de aceite

- Token é validado no servidor.
- Token inválido bloqueia a ação.
- Chaves não são commitadas.
- O fluxo funciona com teclado.
- O usuário entende como corrigir o erro.

---

## Etapa 9 — Analytics, privacidade e observabilidade

### Objetivo

Medir o uso sem violar o consentimento do usuário.

### Analytics

- Carregar Google Analytics somente após consentimento.
- Registrar eventos essenciais:
  - Busca realizada.
  - Filtro aplicado.
  - Vendedor aberto.
  - Produto aberto.
  - Favorito criado.
  - Registro concluído.
- Não enviar senha, e-mail ou dados sensíveis.

### Privacidade

- Revisar textos legais com dados reais do controlador.
- Definir canal de atendimento.
- Definir jurisdição.
- Explicar uso de localização.
- Explicar uso de imagens e publicações.
- Permitir revogar consentimento.

### Observabilidade

- Registrar erros de API.
- Registrar falhas de autenticação sem dados sensíveis.
- Monitorar falhas de mapa e upload.
- Criar mensagens amigáveis para o usuário.

---

## Etapa 10 — Testes e preparação para lançamento

### Testes funcionais

- Registro de consumidor.
- Registro de vendedor.
- Login com credenciais válidas.
- Login com credenciais inválidas.
- Login com Google.
- Logout.
- Acesso sem autenticação.
- Criação de produto.
- Edição de produto.
- Publicação no feed.
- Busca no mapa.
- Filtros por categoria.
- Favoritar vendedor.
- Edição de perfil.

### Testes de acessibilidade

- Navegação completa por teclado.
- Foco visível.
- Leitor de tela nos formulários.
- Labels e mensagens de erro.
- Contraste padrão.
- Alto contraste.
- Redução de movimento.
- Uso em telas pequenas.

### Testes de segurança

- Usuário não acessa dados de outro usuário.
- Usuário não edita produto de outro vendedor.
- Campos são validados no servidor.
- Senhas não aparecem em logs.
- Rotas privadas exigem sessão.
- CAPTCHA não pode ser ignorado alterando o frontend.

### Testes de compatibilidade

- Chrome.
- Edge.
- Firefox.
- Safari.
- Desktop.
- Tablet.
- Mobile.

---

# Dependências entre etapas

1. Autenticação depende da configuração do banco e do modelo `User`.
2. Modelagem de dados deve ser concluída antes do mapa conectado a dados reais.
3. O mapa depende de vendedores e coordenadas persistidos.
4. O perfil público depende de vendedor, produtos e publicações.
5. O painel do vendedor depende de autenticação e autorização.
6. Upload depende da definição do provedor de arquivos.
7. CAPTCHA depende da escolha do provedor e das variáveis de ambiente.
8. Testes finais só devem ocorrer depois que os fluxos principais estiverem conectados.

---

# Prioridade de entrega

## P0 — Obrigatório para a primeira versão

- Autenticação por e-mail e senha.
- Cadastro de consumidor.
- Cadastro de vendedor.
- Persistência de usuários.
- Mapa funcional.
- Vendedores com localização.
- Perfil público do vendedor.
- Produtos básicos.
- Filtros por categoria.
- Proteção de rotas.
- Testes dos fluxos principais.

## P1 — Necessário para uma versão utilizável

- Login com Google.
- Feed do vendedor.
- Favoritos.
- Upload de imagens.
- Perfil completo do usuário.
- CAPTCHA real.
- Tratamento robusto de erros.
- Responsividade refinada.

## P2 — Pode entrar depois do MVP

- Chat entre usuário e vendedor.
- Avaliações.
- Notificações.
- Pedidos e pagamentos.
- Entrega.
- Verificação avançada de vendedores.
- Recomendação personalizada.
- Busca geográfica avançada.
- Painel administrativo completo.

---

# Definição de pronto

A primeira versão será considerada funcional quando:

- Um usuário conseguir criar uma conta.
- O mesmo usuário conseguir entrar novamente sem criar outra conta.
- Um vendedor conseguir aparecer no mapa.
- Um consumidor conseguir encontrar vendedores por categoria.
- O perfil público mostrar informações reais.
- O vendedor conseguir cadastrar pelo menos um produto.
- O produto aparecer no perfil público.
- Rotas privadas estiverem protegidas.
- Erros principais forem tratados sem falhas silenciosas.
- O fluxo principal funcionar em desktop e mobile.
- Os testes críticos passarem.
- O consentimento de cookies continuar respeitado.
- Nenhuma senha, chave privada ou segredo estiver no repositório.

