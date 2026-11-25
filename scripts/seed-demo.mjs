// Povoa o banco com vendedores de DEMONSTRAÇÃO em Corrente-PI (para apresentar o mapa).
//
//   npm run db:seed-demo           -> grava no SQLite de dev (prisma/sqlite/dev.db)
//   npm run db:seed-demo -- --neon -> grava no Neon (DATABASE_URL)
//   npm run db:seed-demo -- --clean            -> só remove os dados de demo (SQLite)
//   npm run db:seed-demo -- --neon --clean     -> só remove os dados de demo (Neon)
//
// Todos os usuários de demo usam e-mail @demo.fairplace.local — é por ele que o
// script identifica e remove os dados antigos (rodar de novo não duplica nada).
// Senha de todos: demo1234
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const useNeon = process.argv.includes("--neon");
const cleanOnly = process.argv.includes("--clean");
const DEMO_DOMAIN = "@demo.fairplace.local";
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

async function createClient() {
  if (useNeon) {
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient();
  }
  const clientPath = pathToFileURL(join(root, "src", "generated", "sqlite-client", "index.js")).href;
  const { PrismaClient } = await import(clientPath);
  const dbFile = join(root, "prisma", "sqlite", "dev.db").split("\\").join("/");
  return new PrismaClient({ datasourceUrl: `file:${dbFile}` });
}

// Coordenadas espalhadas pelos bairros de Corrente-PI (centro ≈ -10.4433, -45.1628).
const SELLERS = [
  {
    name: "Dona Maria Hortaliças",
    category: "FARM",
    description: "Verduras e legumes colhidos no dia, sem agrotóxico. Plantio familiar no Buritizinho.",
    phone: "(89) 99911-0001",
    address: "Mercado Municipal, Centro",
    openingHours: "Seg a Sáb, 6h às 12h",
    lat: -10.4428, lng: -45.1619,
    verified: true,
    locations: [
      { label: "Mercado Municipal", address: "Centro", lat: -10.4428, lng: -45.1619, days: [1, 2, 3, 4, 5] },
      { label: "Feira do Sábado", address: "Praça da Matriz", lat: -10.4442, lng: -45.1640, days: [6] },
    ],
    listings: [
      { title: "Alface crespa (maço)", price: 3, description: "Fresquinha, colhida de manhã." },
      { title: "Cheiro-verde (maço)", price: 2 },
      { title: "Tomate (kg)", price: 7.5 },
      { title: "Couve (maço)", price: 3.5 },
    ],
    posts: ["Chegou couve nova hoje! Corre que acaba cedo 🥬", "Sábado estou na Praça da Matriz a partir das 6h."],
  },
  {
    name: "Seu João do Queijo",
    category: "MARKET",
    description: "Queijo coalho, manteiga da terra e requeijão feitos na fazenda.",
    phone: "(89) 99911-0002",
    address: "Feira Livre, Centro",
    openingHours: "Todos os dias, 6h às 13h",
    lat: -10.4451, lng: -45.1607,
    verified: true,
    locations: [{ label: "Feira Livre", address: "Rua da Feira, Centro", lat: -10.4451, lng: -45.1607, days: ALL_DAYS }],
    listings: [
      { title: "Queijo coalho (kg)", price: 38 },
      { title: "Manteiga da terra (500 ml)", price: 25 },
      { title: "Requeijão de corte (kg)", price: 42 },
    ],
    posts: ["Queijo coalho curado chegando na quarta!"],
  },
  {
    name: "Artesanato Mãos do Cerrado",
    category: "CRAFT",
    description: "Peças em capim dourado, cerâmica e bordados feitos por artesãs de Corrente.",
    phone: "(89) 99911-0003",
    address: "Rua Nova, Nova Corrente",
    openingHours: "Ter a Sáb, 8h às 17h",
    lat: -10.4372, lng: -45.1690,
    verified: false,
    locations: [],
    listings: [
      { title: "Bolsa de capim dourado", price: 120 },
      { title: "Porta-copos bordado (kit 6)", price: 35 },
      { title: "Vaso de cerâmica pintado", price: 60 },
    ],
    posts: ["Peças novas de capim dourado prontas para o Natal ✨"],
  },
  {
    name: "Frutas do Vale",
    category: "FARM",
    description: "Frutas da estação direto do produtor: manga, caju, acerola e pequi na safra.",
    phone: "(89) 99911-0004",
    address: "Bairro Primavera",
    openingHours: "Seg, Qua e Sex, 7h às 12h",
    lat: -10.4385, lng: -45.1585,
    verified: false,
    locations: [
      { label: "Ponto da Primavera", address: "Esquina da Av. Primavera", lat: -10.4385, lng: -45.1585, days: [1, 3, 5] },
      { label: "Feira do Centro", address: "Praça da Matriz", lat: -10.4440, lng: -45.1634, days: [0, 2, 4, 6] },
    ],
    listings: [
      { title: "Manga espada (kg)", price: 5 },
      { title: "Acerola (polpa 1 kg)", price: 12 },
      { title: "Pequi (dúzia)", price: 10 },
    ],
    posts: ["Safra do pequi começou! 🌳"],
  },
  {
    name: "Padaria Caseira da Lúcia",
    category: "MARKET",
    description: "Bolos, biscoitos de goma, pão de queijo e cuscuz feitos em casa.",
    phone: "(89) 99911-0005",
    address: "Rua do Sincerino",
    openingHours: "Todos os dias, 5h30 às 10h",
    lat: -10.4351, lng: -45.1560,
    verified: true,
    locations: [],
    listings: [
      { title: "Biscoito de goma (pacote)", price: 8 },
      { title: "Bolo de puba", price: 20 },
      { title: "Pão de queijo (dúzia)", price: 15 },
    ],
    posts: ["Hoje tem bolo de puba quentinho!", "Aceitamos encomendas para festas."],
  },
  {
    name: "Mel Puro do Sertão",
    category: "FARM",
    description: "Mel de abelha nativa e derivados, produção própria.",
    phone: "(89) 99911-0006",
    address: "Bairro Olaria",
    openingHours: "Qui a Dom, 7h às 12h",
    lat: -10.4407, lng: -45.1712,
    verified: false,
    locations: [
      { label: "Banca da Olaria", address: "Rua Principal da Olaria", lat: -10.4407, lng: -45.1712, days: [4, 5] },
      { label: "Feira do Fim de Semana", address: "Praça da Matriz", lat: -10.4445, lng: -45.1628, days: [6, 0] },
      { label: "Entrega no Centro", address: "Em frente ao Banco do Brasil", lat: -10.4436, lng: -45.1612, days: [1, 2, 3] },
    ],
    listings: [
      { title: "Mel (500 g)", price: 30 },
      { title: "Própolis (frasco 30 ml)", price: 25 },
    ],
    posts: ["Mel de aroeira disponível, quantidade limitada 🍯"],
  },
  {
    name: "Ateliê Fios e Linhas",
    category: "CRAFT",
    description: "Crochê, tapetes e roupinhas de bebê sob encomenda.",
    phone: "(89) 99911-0007",
    address: "Bairro Vermelhão",
    openingHours: "Seg a Sex, 9h às 18h",
    lat: -10.4498, lng: -45.1695,
    verified: false,
    locations: [],
    listings: [
      { title: "Tapete de crochê redondo", price: 85 },
      { title: "Sapatinho de bebê", price: 30 },
    ],
    posts: [],
  },
  {
    name: "Ovos e Galinha Caipira do Zé",
    category: "FARM",
    description: "Ovos caipiras e galinha caipira abatida na hora, criação solta.",
    phone: "(89) 99911-0008",
    address: "Beira Rio",
    openingHours: "Todos os dias, 6h às 11h",
    lat: -10.4465, lng: -45.1660,
    verified: true,
    locations: [],
    listings: [
      { title: "Ovos caipira (dúzia)", price: 14 },
      { title: "Galinha caipira (unidade)", price: 45 },
    ],
    posts: ["Ovos fresquinhos todos os dias na Beira Rio 🥚"],
  },
  {
    name: "Tapiocaria da Praça",
    category: "MARKET",
    description: "Tapiocas, sucos naturais e café da manhã regional.",
    phone: "(89) 99911-0009",
    address: "Praça da Matriz",
    openingHours: "Ter a Dom, 6h às 11h e 17h às 21h",
    lat: -10.4447, lng: -45.1636,
    verified: false,
    locations: [{ label: "Praça da Matriz", address: "Lado da igreja", lat: -10.4447, lng: -45.1636, days: [0, 2, 3, 4, 5, 6] }],
    listings: [
      { title: "Tapioca de queijo coalho", price: 10 },
      { title: "Suco de cajá (copo)", price: 6 },
    ],
    posts: ["Hoje à noite tem tapioca de carne de sol!"],
  },
  {
    name: "Cerâmica Barro Bom",
    category: "CRAFT",
    description: "Potes, filtros e panelas de barro feitos à mão.",
    phone: "(89) 99911-0010",
    address: "Bairro Limoeiro",
    openingHours: "Seg a Sáb, 8h às 16h",
    lat: -10.4520, lng: -45.1580,
    verified: false,
    locations: [],
    listings: [
      { title: "Panela de barro média", price: 55 },
      { title: "Filtro de barro", price: 110 },
    ],
    posts: [],
  },
];

function slug(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

async function main() {
  const prisma = await createClient();
  try {
    // Remove a demo anterior (cascade apaga perfil, locais, produtos e posts).
    const removed = await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } });
    console.log(`[seed-demo] ${removed.count} usuário(s) de demo anteriores removidos.`);
    if (cleanOnly) return;

    const password = await bcrypt.hash("demo1234", 12);

    for (const seller of SELLERS) {
      const user = await prisma.user.create({
        data: {
          name: seller.name,
          email: `${slug(seller.name)}${DEMO_DOMAIN}`,
          password,
          role: "SELLER",
          sellerProfile: {
            create: {
              displayName: seller.name,
              description: seller.description,
              category: seller.category,
              phone: seller.phone,
              address: seller.address,
              openingHours: seller.openingHours,
              latitude: seller.lat,
              longitude: seller.lng,
              isVerified: seller.verified,
              locations: {
                create: seller.locations.map((location) => ({
                  label: location.label,
                  address: location.address,
                  latitude: location.lat,
                  longitude: location.lng,
                  weekdays: location.days,
                })),
              },
              listings: {
                create: seller.listings.map((listing) => ({
                  title: listing.title,
                  description: listing.description ?? null,
                  price: listing.price,
                  category: seller.category,
                  available: true,
                })),
              },
              posts: { create: seller.posts.map((text) => ({ text })) },
            },
          },
        },
      });
      console.log(`[seed-demo] + ${seller.name} (${user.email})`);
    }

    console.log(`[seed-demo] ${SELLERS.length} vendedores criados no ${useNeon ? "Neon" : "SQLite"}. Senha: demo1234`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
