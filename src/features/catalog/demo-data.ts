import type { DemoCategory, DemoProduct } from "@/features/catalog/types";

export const demoCategories: DemoCategory[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "refrigerators",
    icon: "fridge",
    name: {
      ru: "Холодильники",
      ro: "Frigidere",
    },
    description: {
      ru: "Для свежих продуктов каждый день",
      ro: "Pentru produse proaspete în fiecare zi",
    },
    imageUrl: "/images/categories/refrigerators.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "washing-machines",
    icon: "generic",
    name: {
      ru: "Стиральные машины",
      ro: "Mașini de spălat rufe",
    },
    description: {
      ru: "Надёжная забота о ваших вещах",
      ro: "Îngrijire de încredere pentru hainele tale",
    },
    imageUrl: "/images/categories/washing-machines.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "stoves-and-cooktops",
    icon: "stove",
    name: {
      ru: "Плиты и варочные панели",
      ro: "Plite și aragazuri",
    },
    description: {
      ru: "Удобство и комфорт на вашей кухне",
      ro: "Confort și eficiență în bucătăria ta",
    },
    imageUrl: "/images/categories/stoves-and-cooktops.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    slug: "microwave-ovens",
    icon: "generic",
    name: {
      ru: "Микроволновые печи",
      ro: "Cuptoare cu microunde",
    },
    description: {
      ru: "Быстрый разогрев и приготовление блюд",
      ro: "Încălzire rapidă și preparare ușoară",
    },
    imageUrl: "/images/categories/microwave-ovens.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    slug: "dishwashers",
    icon: "generic",
    name: {
      ru: "Посудомоечные машины",
      ro: "Mașini de spălat vase",
    },
    description: {
      ru: "Идеальная чистота посуды без хлопот",
      ro: "Curățenie impecabilă a vaselor fără efort",
    },
    imageUrl: "/images/categories/dishwashers.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    slug: "ovens",
    icon: "stove",
    name: {
      ru: "Духовые шкафы",
      ro: "Cuptoare încorporabile",
    },
    description: {
      ru: "Для кулинарных шедевров и выпечки",
      ro: "Pentru capodopere culinare și copt",
    },
    imageUrl: "/images/categories/ovens.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    slug: "dryers",
    icon: "generic",
    name: {
      ru: "Сушильные машины",
      ro: "Uscătoare de rufe",
    },
    description: {
      ru: "Быстрая и бережная сушка белья",
      ro: "Uscare rapidă și delicată a hainelor",
    },
    imageUrl: "/images/categories/dryers.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    slug: "coffee-machines",
    icon: "generic",
    name: {
      ru: "Кофемашины",
      ro: "Espresoare de cafea",
    },
    description: {
      ru: "Ароматный кофе каждый день",
      ro: "Cafea aromată în fiecare zi",
    },
    imageUrl: "/images/categories/coffee-machines.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    slug: "vacuums",
    icon: "vacuum",
    name: {
      ru: "Пылесосы",
      ro: "Aspiratoare",
    },
    description: {
      ru: "Чистота без лишних усилий",
      ro: "Curățenie fără efort suplimentar",
    },
    imageUrl: "/images/categories/vacuums.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    slug: "robot-vacuums",
    icon: "vacuum",
    name: {
      ru: "Роботы-пылесосы",
      ro: "Aspiratoare robot",
    },
    description: {
      ru: "Автоматическая уборка для вашего дома",
      ro: "Curățare automată pentru casa ta",
    },
    imageUrl: "/images/categories/robot-vacuums.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    slug: "electric-kettles",
    icon: "generic",
    name: {
      ru: "Электрочайники",
      ro: "Fierbătoare electrice",
    },
    description: {
      ru: "Быстрое кипячение воды",
      ro: "Fierbere rapidă a apei",
    },
    imageUrl: "/images/categories/electric-kettles.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    slug: "blenders",
    icon: "generic",
    name: {
      ru: "Блендеры",
      ro: "Blendere",
    },
    description: {
      ru: "Для смузи, коктейлей и соусов",
      ro: "Pentru smoothie-uri, cocktailuri și sosuri",
    },
    imageUrl: "/images/categories/blenders.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000013",
    slug: "food-processors",
    icon: "generic",
    name: {
      ru: "Кухонные комбайны",
      ro: "Roboți de bucătărie",
    },
    description: {
      ru: "Многофункциональные помощники на кухне",
      ro: "Ajutoare multifuncționale în bucătărie",
    },
    imageUrl: "/images/categories/food-processors.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000014",
    slug: "toasters",
    icon: "generic",
    name: {
      ru: "Тостеры и ростеры",
      ro: "Prăjitoare de pâine și roastere",
    },
    description: {
      ru: "Хрустящие тосты к завтраку",
      ro: "Pâine prăjită crocantă pentru micul dejun",
    },
    imageUrl: "/images/categories/toasters.jpg",
  },
  {
    id: "10000000-0000-4000-8000-000000000015",
    slug: "air-conditioners",
    icon: "generic",
    name: {
      ru: "Кондиционеры",
      ro: "Aparate de aer condiționat",
    },
    description: {
      ru: "Комфортный климат в любое время года",
      ro: "Climat confortabil în orice anotimp",
    },
    imageUrl: "/images/categories/air-conditioners.jpg",
  },
];

export const demoProducts: DemoProduct[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "samsung-rb34t602fsa",
    categoryId: "10000000-0000-4000-8000-000000000001",
    brand: "Samsung",
    model: "RB34T602FSA",
    sku: "TS-REF-0001",
    name: {
      ru: "Samsung RB34T602FSA",
      ro: "Samsung RB34T602FSA",
    },
    shortDescription: {
      ru: "Холодильники Samsung RB34T602FSA. Надёжная техника с официальной гарантией.",
      ro: "Frigidere Samsung RB34T602FSA. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Холодильники Samsung RB34T602FSA. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Frigidere Samsung RB34T602FSA. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 949900,
    oldPriceMinor: 1049900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "340 л",
          ro: "340 l",
        },
      },
      {
        label: {
          ru: "Класс энергопотребления",
          ro: "Clasă energetică",
        },
        value: {
          ru: "A+",
          ro: "A+",
        },
      },
      {
        label: {
          ru: "No Frost",
          ro: "No Frost",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    slug: "lg-ga-b459clwl",
    categoryId: "10000000-0000-4000-8000-000000000001",
    brand: "LG",
    model: "GA-B459CLWL",
    sku: "TS-REF-0002",
    name: {
      ru: "LG GA-B459CLWL",
      ro: "LG GA-B459CLWL",
    },
    shortDescription: {
      ru: "Холодильники LG GA-B459CLWL. Надёжная техника с официальной гарантией.",
      ro: "Frigidere LG GA-B459CLWL. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Холодильники LG GA-B459CLWL. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Frigidere LG GA-B459CLWL. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1099900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "374 л",
          ro: "374 l",
        },
      },
      {
        label: {
          ru: "DoorCooling+",
          ro: "DoorCooling+",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Уровень шума",
          ro: "Nivel zgomot",
        },
        value: {
          ru: "36 дБ",
          ro: "36 dB",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    slug: "bosch-kgn39vl316",
    categoryId: "10000000-0000-4000-8000-000000000001",
    brand: "Bosch",
    model: "KGN39VL316",
    sku: "TS-REF-0003",
    name: {
      ru: "Bosch KGN39VL316",
      ro: "Bosch KGN39VL316",
    },
    shortDescription: {
      ru: "Холодильники Bosch KGN39VL316. Надёжная техника с официальной гарантией.",
      ro: "Frigidere Bosch KGN39VL316. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Холодильники Bosch KGN39VL316. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Frigidere Bosch KGN39VL316. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1249900,
    oldPriceMinor: 1399900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "368 л",
          ro: "368 l",
        },
      },
      {
        label: {
          ru: "VitaFresh",
          ro: "VitaFresh",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Класс энергопотребления",
          ro: "Clasă energetică",
        },
        value: {
          ru: "A++",
          ro: "A++",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    slug: "beko-rcsa300k30sn",
    categoryId: "10000000-0000-4000-8000-000000000001",
    brand: "Beko",
    model: "RCSA300K30SN",
    sku: "TS-REF-0004",
    name: {
      ru: "Beko RCSA300K30SN",
      ro: "Beko RCSA300K30SN",
    },
    shortDescription: {
      ru: "Холодильники Beko RCSA300K30SN. Надёжная техника с официальной гарантией.",
      ro: "Frigidere Beko RCSA300K30SN. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Холодильники Beko RCSA300K30SN. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Frigidere Beko RCSA300K30SN. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 629900,
    oldPriceMinor: 699900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "291 л",
          ro: "291 l",
        },
      },
      {
        label: {
          ru: "Разморозка",
          ro: "Dezghețare",
        },
        value: {
          ru: "Капельная",
          ro: "Picurare",
        },
      },
      {
        label: {
          ru: "Класс энергопотребления",
          ro: "Clasă energetică",
        },
        value: {
          ru: "A+",
          ro: "A+",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    slug: "gorenje-nrk6191ew4",
    categoryId: "10000000-0000-4000-8000-000000000001",
    brand: "Gorenje",
    model: "NRK6191EW4",
    sku: "TS-REF-0005",
    name: {
      ru: "Gorenje NRK6191EW4",
      ro: "Gorenje NRK6191EW4",
    },
    shortDescription: {
      ru: "Холодильники Gorenje NRK6191EW4. Надёжная техника с официальной гарантией.",
      ro: "Frigidere Gorenje NRK6191EW4. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Холодильники Gorenje NRK6191EW4. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Frigidere Gorenje NRK6191EW4. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 789900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "302 л",
          ro: "302 l",
        },
      },
      {
        label: {
          ru: "IonAir",
          ro: "IonAir",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "No Frost Plus",
          ro: "No Frost Plus",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    slug: "indesit-li8s1ew",
    categoryId: "10000000-0000-4000-8000-000000000001",
    brand: "Indesit",
    model: "LI8S1EW",
    sku: "TS-REF-0006",
    name: {
      ru: "Indesit LI8S1EW",
      ro: "Indesit LI8S1EW",
    },
    shortDescription: {
      ru: "Холодильники Indesit LI8S1EW. Надёжная техника с официальной гарантией.",
      ro: "Frigidere Indesit LI8S1EW. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Холодильники Indesit LI8S1EW. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Frigidere Indesit LI8S1EW. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 599900,
    oldPriceMinor: 649900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "339 л",
          ro: "339 l",
        },
      },
      {
        label: {
          ru: "Low Frost",
          ro: "Low Frost",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Класс энергопотребления",
          ro: "Clasă energetică",
        },
        value: {
          ru: "A+",
          ro: "A+",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000007",
    slug: "whirlpool-w7921iox",
    categoryId: "10000000-0000-4000-8000-000000000001",
    brand: "Whirlpool",
    model: "W7921IOX",
    sku: "TS-REF-0007",
    name: {
      ru: "Whirlpool W7921IOX",
      ro: "Whirlpool W7921IOX",
    },
    shortDescription: {
      ru: "Холодильники Whirlpool W7921IOX. Надёжная техника с официальной гарантией.",
      ro: "Frigidere Whirlpool W7921IOX. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Холодильники Whirlpool W7921IOX. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Frigidere Whirlpool W7921IOX. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1119900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "368 л",
          ro: "368 l",
        },
      },
      {
        label: {
          ru: "6th Sense",
          ro: "6th Sense",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Total No Frost",
          ro: "Total No Frost",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000008",
    slug: "lg-f2v5hs0w",
    categoryId: "10000000-0000-4000-8000-000000000002",
    brand: "LG",
    model: "F2V5HS0W",
    sku: "TS-WAS-0008",
    name: {
      ru: "LG F2V5HS0W",
      ro: "LG F2V5HS0W",
    },
    shortDescription: {
      ru: "Стиральные машины LG F2V5HS0W. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat rufe LG F2V5HS0W. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Стиральные машины LG F2V5HS0W. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat rufe LG F2V5HS0W. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 879900,
    oldPriceMinor: 959900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "7 кг",
          ro: "7 kg",
        },
      },
      {
        label: {
          ru: "Отжим",
          ro: "Viteză stoarcere",
        },
        value: {
          ru: "1200 об/мин",
          ro: "1200 rpm",
        },
      },
      {
        label: {
          ru: "AI DD",
          ro: "AI DD",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000009",
    slug: "samsung-ww70t4020ee",
    categoryId: "10000000-0000-4000-8000-000000000002",
    brand: "Samsung",
    model: "WW70T4020EE",
    sku: "TS-WAS-0009",
    name: {
      ru: "Samsung WW70T4020EE",
      ro: "Samsung WW70T4020EE",
    },
    shortDescription: {
      ru: "Стиральные машины Samsung WW70T4020EE. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat rufe Samsung WW70T4020EE. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Стиральные машины Samsung WW70T4020EE. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat rufe Samsung WW70T4020EE. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 749900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "7 кг",
          ro: "7 kg",
        },
      },
      {
        label: {
          ru: "Инверторный мотор",
          ro: "Motor inverter",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Пар",
          ro: "Abur",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000010",
    slug: "bosch-wan28209ua",
    categoryId: "10000000-0000-4000-8000-000000000002",
    brand: "Bosch",
    model: "WAN28209UA",
    sku: "TS-WAS-0010",
    name: {
      ru: "Bosch WAN28209UA",
      ro: "Bosch WAN28209UA",
    },
    shortDescription: {
      ru: "Стиральные машины Bosch WAN28209UA. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat rufe Bosch WAN28209UA. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Стиральные машины Bosch WAN28209UA. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat rufe Bosch WAN28209UA. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1129900,
    oldPriceMinor: 1249900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "8 кг",
          ro: "8 kg",
        },
      },
      {
        label: {
          ru: "EcoSilence Drive",
          ro: "EcoSilence Drive",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Отжим",
          ro: "Viteză stoarcere",
        },
        value: {
          ru: "1400 об/мин",
          ro: "1400 rpm",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000011",
    slug: "beko-wre6511bww",
    categoryId: "10000000-0000-4000-8000-000000000002",
    brand: "Beko",
    model: "WRE6511BWW",
    sku: "TS-WAS-0011",
    name: {
      ru: "Beko WRE6511BWW",
      ro: "Beko WRE6511BWW",
    },
    shortDescription: {
      ru: "Стиральные машины Beko WRE6511BWW. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat rufe Beko WRE6511BWW. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Стиральные машины Beko WRE6511BWW. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat rufe Beko WRE6511BWW. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 519900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "6 кг",
          ro: "6 kg",
        },
      },
      {
        label: {
          ru: "Глубина",
          ro: "Adâncime",
        },
        value: {
          ru: "41.5 см",
          ro: "41.5 cm",
        },
      },
      {
        label: {
          ru: "Класс энергопотребления",
          ro: "Clasă energetică",
        },
        value: {
          ru: "A+++",
          ro: "A+++",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000012",
    slug: "gorenje-wnhei72sas",
    categoryId: "10000000-0000-4000-8000-000000000002",
    brand: "Gorenje",
    model: "WNHEI72SAS",
    sku: "TS-WAS-0012",
    name: {
      ru: "Gorenje WNHEI72SAS",
      ro: "Gorenje WNHEI72SAS",
    },
    shortDescription: {
      ru: "Стиральные машины Gorenje WNHEI72SAS. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat rufe Gorenje WNHEI72SAS. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Стиральные машины Gorenje WNHEI72SAS. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat rufe Gorenje WNHEI72SAS. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 649900,
    oldPriceMinor: 719900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "7 кг",
          ro: "7 kg",
        },
      },
      {
        label: {
          ru: "SteamTech",
          ro: "SteamTech",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Отжим",
          ro: "Viteză stoarcere",
        },
        value: {
          ru: "1200 об/мин",
          ro: "1200 rpm",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000013",
    slug: "indesit-omtwsa61053wk",
    categoryId: "10000000-0000-4000-8000-000000000002",
    brand: "Indesit",
    model: "OMTWSA61053WK",
    sku: "TS-WAS-0013",
    name: {
      ru: "Indesit OMTWSA61053WK",
      ro: "Indesit OMTWSA61053WK",
    },
    shortDescription: {
      ru: "Стиральные машины Indesit OMTWSA61053WK. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat rufe Indesit OMTWSA61053WK. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Стиральные машины Indesit OMTWSA61053WK. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat rufe Indesit OMTWSA61053WK. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 489900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "6 кг",
          ro: "6 kg",
        },
      },
      {
        label: {
          ru: "Быстрая стирка",
          ro: "Spălare rapidă",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Класс энергопотребления",
          ro: "Clasă energetică",
        },
        value: {
          ru: "A+++",
          ro: "A+++",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000014",
    slug: "electrolux-ew6s406bx",
    categoryId: "10000000-0000-4000-8000-000000000002",
    brand: "Electrolux",
    model: "EW6S406BX",
    sku: "TS-WAS-0014",
    name: {
      ru: "Electrolux EW6S406BX",
      ro: "Electrolux EW6S406BX",
    },
    shortDescription: {
      ru: "Стиральные машины Electrolux EW6S406BX. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat rufe Electrolux EW6S406BX. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Стиральные машины Electrolux EW6S406BX. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat rufe Electrolux EW6S406BX. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 919900,
    oldPriceMinor: 999900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "6 кг",
          ro: "6 kg",
        },
      },
      {
        label: {
          ru: "SensiCare",
          ro: "SensiCare",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Отжим",
          ro: "Viteză stoarcere",
        },
        value: {
          ru: "1000 об/мин",
          ro: "1000 rpm",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000015",
    slug: "gorenje-g642cli",
    categoryId: "10000000-0000-4000-8000-000000000003",
    brand: "Gorenje",
    model: "G642CLI",
    sku: "TS-STO-0015",
    name: {
      ru: "Gorenje G642CLI",
      ro: "Gorenje G642CLI",
    },
    shortDescription: {
      ru: "Плиты и варочные панели Gorenje G642CLI. Надёжная техника с официальной гарантией.",
      ro: "Plite și aragazuri Gorenje G642CLI. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Плиты и варочные панели Gorenje G642CLI. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Plite și aragazuri Gorenje G642CLI. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 439900,
    oldPriceMinor: 489900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Газовая",
          ro: "Gaz",
        },
      },
      {
        label: {
          ru: "Конфорки",
          ro: "Arzătoare",
        },
        value: {
          ru: "4",
          ro: "4",
        },
      },
      {
        label: {
          ru: "Материал",
          ro: "Material",
        },
        value: {
          ru: "Эмаль",
          ro: "Email",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000016",
    slug: "bosch-pgp6b5b90r",
    categoryId: "10000000-0000-4000-8000-000000000003",
    brand: "Bosch",
    model: "PGP6B5B90R",
    sku: "TS-STO-0016",
    name: {
      ru: "Bosch PGP6B5B90R",
      ro: "Bosch PGP6B5B90R",
    },
    shortDescription: {
      ru: "Плиты и варочные панели Bosch PGP6B5B90R. Надёжная техника с официальной гарантией.",
      ro: "Plite și aragazuri Bosch PGP6B5B90R. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Плиты и варочные панели Bosch PGP6B5B90R. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Plite și aragazuri Bosch PGP6B5B90R. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 629900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Газовая",
          ro: "Gaz",
        },
      },
      {
        label: {
          ru: "Решётки",
          ro: "Grătare",
        },
        value: {
          ru: "Чугунные",
          ro: "Fontă",
        },
      },
      {
        label: {
          ru: "Газ-контроль",
          ro: "Control gaz",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000017",
    slug: "hansa-bhgi63112",
    categoryId: "10000000-0000-4000-8000-000000000003",
    brand: "Hansa",
    model: "BHGI63112",
    sku: "TS-STO-0017",
    name: {
      ru: "Hansa BHGI63112",
      ro: "Hansa BHGI63112",
    },
    shortDescription: {
      ru: "Плиты и варочные панели Hansa BHGI63112. Надёжная техника с официальной гарантией.",
      ro: "Plite și aragazuri Hansa BHGI63112. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Плиты и варочные панели Hansa BHGI63112. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Plite și aragazuri Hansa BHGI63112. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 389900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Газовая",
          ro: "Gaz",
        },
      },
      {
        label: {
          ru: "WOK конфорка",
          ro: "Arzător WOK",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Ширина",
          ro: "Lățime",
        },
        value: {
          ru: "60 см",
          ro: "60 cm",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000018",
    slug: "electrolux-ehf6240xxk",
    categoryId: "10000000-0000-4000-8000-000000000003",
    brand: "Electrolux",
    model: "EHF6240XXK",
    sku: "TS-STO-0018",
    name: {
      ru: "Electrolux EHF6240XXK",
      ro: "Electrolux EHF6240XXK",
    },
    shortDescription: {
      ru: "Плиты и варочные панели Electrolux EHF6240XXK. Надёжная техника с официальной гарантией.",
      ro: "Plite și aragazuri Electrolux EHF6240XXK. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Плиты и варочные панели Electrolux EHF6240XXK. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Plite și aragazuri Electrolux EHF6240XXK. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 549900,
    oldPriceMinor: 599900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Электрическая",
          ro: "Electrică",
        },
      },
      {
        label: {
          ru: "Поверхность",
          ro: "Suprafață",
        },
        value: {
          ru: "Стеклокерамика",
          ro: "Vitroceramică",
        },
      },
      {
        label: {
          ru: "Сенсорное управление",
          ro: "Control tactil",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000019",
    slug: "beko-himg64223scr",
    categoryId: "10000000-0000-4000-8000-000000000003",
    brand: "Beko",
    model: "HIMG64223SCR",
    sku: "TS-STO-0019",
    name: {
      ru: "Beko HIMG64223SCR",
      ro: "Beko HIMG64223SCR",
    },
    shortDescription: {
      ru: "Плиты и варочные панели Beko HIMG64223SCR. Надёжная техника с официальной гарантией.",
      ro: "Plite și aragazuri Beko HIMG64223SCR. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Плиты и варочные панели Beko HIMG64223SCR. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Plite și aragazuri Beko HIMG64223SCR. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 369900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Газовая",
          ro: "Gaz",
        },
      },
      {
        label: {
          ru: "Электроподжиг",
          ro: "Aprindere electrică",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Конфорки",
          ro: "Arzătoare",
        },
        value: {
          ru: "4",
          ro: "4",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000020",
    slug: "samsung-ctr164nc01",
    categoryId: "10000000-0000-4000-8000-000000000003",
    brand: "Samsung",
    model: "CTR164NC01",
    sku: "TS-STO-0020",
    name: {
      ru: "Samsung CTR164NC01",
      ro: "Samsung CTR164NC01",
    },
    shortDescription: {
      ru: "Плиты и варочные панели Samsung CTR164NC01. Надёжная техника с официальной гарантией.",
      ro: "Plite și aragazuri Samsung CTR164NC01. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Плиты и варочные панели Samsung CTR164NC01. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Plite și aragazuri Samsung CTR164NC01. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 599900,
    oldPriceMinor: 659900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Электрическая",
          ro: "Electrică",
        },
      },
      {
        label: {
          ru: "Зоны нагрева",
          ro: "Zone încălzire",
        },
        value: {
          ru: "Hi-Light 4",
          ro: "Hi-Light 4",
        },
      },
      {
        label: {
          ru: "Блокировка от детей",
          ro: "Blocare copii",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000021",
    slug: "whirlpool-akt6465nb",
    categoryId: "10000000-0000-4000-8000-000000000003",
    brand: "Whirlpool",
    model: "AKT6465NB",
    sku: "TS-STO-0021",
    name: {
      ru: "Whirlpool AKT6465NB",
      ro: "Whirlpool AKT6465NB",
    },
    shortDescription: {
      ru: "Плиты и варочные панели Whirlpool AKT6465NB. Надёжная техника с официальной гарантией.",
      ro: "Plite și aragazuri Whirlpool AKT6465NB. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Плиты и варочные панели Whirlpool AKT6465NB. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Plite și aragazuri Whirlpool AKT6465NB. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 479900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Газ на стекле",
          ro: "Gaz pe sticlă",
        },
      },
      {
        label: {
          ru: "Цвет",
          ro: "Culoare",
        },
        value: {
          ru: "Чёрный",
          ro: "Negru",
        },
      },
      {
        label: {
          ru: "Конфорки",
          ro: "Arzătoare",
        },
        value: {
          ru: "4",
          ro: "4",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000022",
    slug: "samsung-ms23k3513as",
    categoryId: "10000000-0000-4000-8000-000000000004",
    brand: "Samsung",
    model: "MS23K3513AS",
    sku: "TS-MIC-0022",
    name: {
      ru: "Samsung MS23K3513AS",
      ro: "Samsung MS23K3513AS",
    },
    shortDescription: {
      ru: "Микроволновые печи Samsung MS23K3513AS. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare cu microunde Samsung MS23K3513AS. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Микроволновые печи Samsung MS23K3513AS. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare cu microunde Samsung MS23K3513AS. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 239900,
    oldPriceMinor: 269900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "23 л",
          ro: "23 l",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "800 Вт",
          ro: "800 W",
        },
      },
      {
        label: {
          ru: "Покрытие",
          ro: "Acoperire",
        },
        value: {
          ru: "Биокерамика",
          ro: "Bioceramică",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000023",
    slug: "lg-ms2042db",
    categoryId: "10000000-0000-4000-8000-000000000004",
    brand: "LG",
    model: "MS2042DB",
    sku: "TS-MIC-0023",
    name: {
      ru: "LG MS2042DB",
      ro: "LG MS2042DB",
    },
    shortDescription: {
      ru: "Микроволновые печи LG MS2042DB. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare cu microunde LG MS2042DB. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Микроволновые печи LG MS2042DB. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare cu microunde LG MS2042DB. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 219900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "20 л",
          ro: "20 l",
        },
      },
      {
        label: {
          ru: "i-Wave",
          ro: "i-Wave",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "EasyClean",
          ro: "EasyClean",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000024",
    slug: "panasonic-nn-st254m",
    categoryId: "10000000-0000-4000-8000-000000000004",
    brand: "Panasonic",
    model: "NN-ST254M",
    sku: "TS-MIC-0024",
    name: {
      ru: "Panasonic NN-ST254M",
      ro: "Panasonic NN-ST254M",
    },
    shortDescription: {
      ru: "Микроволновые печи Panasonic NN-ST254M. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare cu microunde Panasonic NN-ST254M. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Микроволновые печи Panasonic NN-ST254M. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare cu microunde Panasonic NN-ST254M. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 269900,
    oldPriceMinor: 299900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "20 л",
          ro: "20 l",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "800 Вт",
          ro: "800 W",
        },
      },
      {
        label: {
          ru: "Автоменю",
          ro: "Meniu automat",
        },
        value: {
          ru: "9 программ",
          ro: "9 programe",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000025",
    slug: "gorenje-mo20a3w",
    categoryId: "10000000-0000-4000-8000-000000000004",
    brand: "Gorenje",
    model: "MO20A3W",
    sku: "TS-MIC-0025",
    name: {
      ru: "Gorenje MO20A3W",
      ro: "Gorenje MO20A3W",
    },
    shortDescription: {
      ru: "Микроволновые печи Gorenje MO20A3W. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare cu microunde Gorenje MO20A3W. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Микроволновые печи Gorenje MO20A3W. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare cu microunde Gorenje MO20A3W. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 189900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "20 л",
          ro: "20 l",
        },
      },
      {
        label: {
          ru: "AquaClean",
          ro: "AquaClean",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Управление",
          ro: "Control",
        },
        value: {
          ru: "Электронное",
          ro: "Electronic",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000026",
    slug: "bosch-fel023ms2",
    categoryId: "10000000-0000-4000-8000-000000000004",
    brand: "Bosch",
    model: "FEL023MS2",
    sku: "TS-MIC-0026",
    name: {
      ru: "Bosch FEL023MS2",
      ro: "Bosch FEL023MS2",
    },
    shortDescription: {
      ru: "Микроволновые печи Bosch FEL023MS2. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare cu microunde Bosch FEL023MS2. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Микроволновые печи Bosch FEL023MS2. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare cu microunde Bosch FEL023MS2. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 349900,
    oldPriceMinor: 389900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "20 л",
          ro: "20 l",
        },
      },
      {
        label: {
          ru: "Гриль",
          ro: "Grill",
        },
        value: {
          ru: "1000 Вт",
          ro: "1000 W",
        },
      },
      {
        label: {
          ru: "AutoPilot 8",
          ro: "AutoPilot 8",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000027",
    slug: "beko-moc20100w",
    categoryId: "10000000-0000-4000-8000-000000000004",
    brand: "Beko",
    model: "MOC20100W",
    sku: "TS-MIC-0027",
    name: {
      ru: "Beko MOC20100W",
      ro: "Beko MOC20100W",
    },
    shortDescription: {
      ru: "Микроволновые печи Beko MOC20100W. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare cu microunde Beko MOC20100W. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Микроволновые печи Beko MOC20100W. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare cu microunde Beko MOC20100W. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 149900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "20 л",
          ro: "20 l",
        },
      },
      {
        label: {
          ru: "Управление",
          ro: "Control",
        },
        value: {
          ru: "Механическое",
          ro: "Mecanic",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "700 Вт",
          ro: "700 W",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000028",
    slug: "sharp-r200inw",
    categoryId: "10000000-0000-4000-8000-000000000004",
    brand: "Sharp",
    model: "R200INW",
    sku: "TS-MIC-0028",
    name: {
      ru: "Sharp R200INW",
      ro: "Sharp R200INW",
    },
    shortDescription: {
      ru: "Микроволновые печи Sharp R200INW. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare cu microunde Sharp R200INW. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Микроволновые печи Sharp R200INW. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare cu microunde Sharp R200INW. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 169900,
    oldPriceMinor: 189900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "20 л",
          ro: "20 l",
        },
      },
      {
        label: {
          ru: "Уровни мощности",
          ro: "Trepte de putere",
        },
        value: {
          ru: "5",
          ro: "5",
        },
      },
      {
        label: {
          ru: "Таймер",
          ro: "Temporizator",
        },
        value: {
          ru: "35 мин",
          ro: "35 min",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000029",
    slug: "bosch-smv25ax00e",
    categoryId: "10000000-0000-4000-8000-000000000005",
    brand: "Bosch",
    model: "SMV25AX00E",
    sku: "TS-DIS-0029",
    name: {
      ru: "Bosch SMV25AX00E",
      ro: "Bosch SMV25AX00E",
    },
    shortDescription: {
      ru: "Посудомоечные машины Bosch SMV25AX00E. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat vase Bosch SMV25AX00E. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Посудомоечные машины Bosch SMV25AX00E. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat vase Bosch SMV25AX00E. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 989900,
    oldPriceMinor: 1079900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Вместимость",
          ro: "Capacitate",
        },
        value: {
          ru: "12 комплектов",
          ro: "12 seturi",
        },
      },
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Встраиваемая 60 см",
          ro: "Încorporabilă 60 cm",
        },
      },
      {
        label: {
          ru: "AquaStop",
          ro: "AquaStop",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000030",
    slug: "beko-dis15020",
    categoryId: "10000000-0000-4000-8000-000000000005",
    brand: "Beko",
    model: "DIS15020",
    sku: "TS-DIS-0030",
    name: {
      ru: "Beko DIS15020",
      ro: "Beko DIS15020",
    },
    shortDescription: {
      ru: "Посудомоечные машины Beko DIS15020. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat vase Beko DIS15020. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Посудомоечные машины Beko DIS15020. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat vase Beko DIS15020. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 579900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Вместимость",
          ro: "Capacitate",
        },
        value: {
          ru: "10 комплектов",
          ro: "10 seturi",
        },
      },
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Встраиваемая 45 см",
          ro: "Încorporabilă 45 cm",
        },
      },
      {
        label: {
          ru: "Программы",
          ro: "Programe",
        },
        value: {
          ru: "5",
          ro: "5",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000031",
    slug: "electrolux-eea917100l",
    categoryId: "10000000-0000-4000-8000-000000000005",
    brand: "Electrolux",
    model: "EEA917100L",
    sku: "TS-DIS-0031",
    name: {
      ru: "Electrolux EEA917100L",
      ro: "Electrolux EEA917100L",
    },
    shortDescription: {
      ru: "Посудомоечные машины Electrolux EEA917100L. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat vase Electrolux EEA917100L. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Посудомоечные машины Electrolux EEA917100L. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat vase Electrolux EEA917100L. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 849900,
    oldPriceMinor: 929900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Вместимость",
          ro: "Capacitate",
        },
        value: {
          ru: "13 комплектов",
          ro: "13 seturi",
        },
      },
      {
        label: {
          ru: "AirDry",
          ro: "AirDry",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "QuickSelect",
          ro: "QuickSelect",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000032",
    slug: "gorenje-gv62040",
    categoryId: "10000000-0000-4000-8000-000000000005",
    brand: "Gorenje",
    model: "GV62040",
    sku: "TS-DIS-0032",
    name: {
      ru: "Gorenje GV62040",
      ro: "Gorenje GV62040",
    },
    shortDescription: {
      ru: "Посудомоечные машины Gorenje GV62040. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat vase Gorenje GV62040. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Посудомоечные машины Gorenje GV62040. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat vase Gorenje GV62040. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 719900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Вместимость",
          ro: "Capacitate",
        },
        value: {
          ru: "13 комплектов",
          ro: "13 seturi",
        },
      },
      {
        label: {
          ru: "Самоочистка фильтра",
          ro: "Filtru autocurățare",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Класс",
          ro: "Clasă",
        },
        value: {
          ru: "A++",
          ro: "A++",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000033",
    slug: "whirlpool-wsic3m17",
    categoryId: "10000000-0000-4000-8000-000000000005",
    brand: "Whirlpool",
    model: "WSIC3M17",
    sku: "TS-DIS-0033",
    name: {
      ru: "Whirlpool WSIC3M17",
      ro: "Whirlpool WSIC3M17",
    },
    shortDescription: {
      ru: "Посудомоечные машины Whirlpool WSIC3M17. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat vase Whirlpool WSIC3M17. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Посудомоечные машины Whirlpool WSIC3M17. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat vase Whirlpool WSIC3M17. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 789900,
    oldPriceMinor: 859900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Вместимость",
          ro: "Capacitate",
        },
        value: {
          ru: "10 комплектов",
          ro: "10 seturi",
        },
      },
      {
        label: {
          ru: "6th Sense",
          ro: "6th Sense",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Ширина",
          ro: "Lățime",
        },
        value: {
          ru: "45 см",
          ro: "45 cm",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000034",
    slug: "siemens-sn63ex14ce",
    categoryId: "10000000-0000-4000-8000-000000000005",
    brand: "Siemens",
    model: "SN63EX14CE",
    sku: "TS-DIS-0034",
    name: {
      ru: "Siemens SN63EX14CE",
      ro: "Siemens SN63EX14CE",
    },
    shortDescription: {
      ru: "Посудомоечные машины Siemens SN63EX14CE. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat vase Siemens SN63EX14CE. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Посудомоечные машины Siemens SN63EX14CE. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat vase Siemens SN63EX14CE. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1349900,
    oldPriceMinor: 1499900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Вместимость",
          ro: "Capacitate",
        },
        value: {
          ru: "13 комплектов",
          ro: "13 seturi",
        },
      },
      {
        label: {
          ru: "iQdrive",
          ro: "iQdrive",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Home Connect",
          ro: "Home Connect",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000035",
    slug: "hansa-zim436eh",
    categoryId: "10000000-0000-4000-8000-000000000005",
    brand: "Hansa",
    model: "ZIM436EH",
    sku: "TS-DIS-0035",
    name: {
      ru: "Hansa ZIM436EH",
      ro: "Hansa ZIM436EH",
    },
    shortDescription: {
      ru: "Посудомоечные машины Hansa ZIM436EH. Надёжная техника с официальной гарантией.",
      ro: "Mașini de spălat vase Hansa ZIM436EH. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Посудомоечные машины Hansa ZIM436EH. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Mașini de spălat vase Hansa ZIM436EH. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 529900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Вместимость",
          ro: "Capacitate",
        },
        value: {
          ru: "10 комплектов",
          ro: "10 seturi",
        },
      },
      {
        label: {
          ru: "Половинная загрузка",
          ro: "Încărcare la jumătate",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Ширина",
          ro: "Lățime",
        },
        value: {
          ru: "45 см",
          ro: "45 cm",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000036",
    slug: "bosch-hbf534es0q",
    categoryId: "10000000-0000-4000-8000-000000000006",
    brand: "Bosch",
    model: "HBF534ES0Q",
    sku: "TS-OVE-0036",
    name: {
      ru: "Bosch HBF534ES0Q",
      ro: "Bosch HBF534ES0Q",
    },
    shortDescription: {
      ru: "Духовые шкафы Bosch HBF534ES0Q. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare încorporabile Bosch HBF534ES0Q. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Духовые шкафы Bosch HBF534ES0Q. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare încorporabile Bosch HBF534ES0Q. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 899900,
    oldPriceMinor: 989900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "66 л",
          ro: "66 l",
        },
      },
      {
        label: {
          ru: "3D горячий воздух",
          ro: "Aer cald 3D",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "EcoClean Direct",
          ro: "EcoClean Direct",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000037",
    slug: "gorenje-bo6737e02xk",
    categoryId: "10000000-0000-4000-8000-000000000006",
    brand: "Gorenje",
    model: "BO6737E02XK",
    sku: "TS-OVE-0037",
    name: {
      ru: "Gorenje BO6737E02XK",
      ro: "Gorenje BO6737E02XK",
    },
    shortDescription: {
      ru: "Духовые шкафы Gorenje BO6737E02XK. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare încorporabile Gorenje BO6737E02XK. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Духовые шкафы Gorenje BO6737E02XK. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare încorporabile Gorenje BO6737E02XK. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 649900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "77 л",
          ro: "77 l",
        },
      },
      {
        label: {
          ru: "AirFry",
          ro: "AirFry",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "SteamBake",
          ro: "SteamBake",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000038",
    slug: "electrolux-eof3h40x",
    categoryId: "10000000-0000-4000-8000-000000000006",
    brand: "Electrolux",
    model: "EOF3H40X",
    sku: "TS-OVE-0038",
    name: {
      ru: "Electrolux EOF3H40X",
      ro: "Electrolux EOF3H40X",
    },
    shortDescription: {
      ru: "Духовые шкафы Electrolux EOF3H40X. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare încorporabile Electrolux EOF3H40X. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Духовые шкафы Electrolux EOF3H40X. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare încorporabile Electrolux EOF3H40X. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 729900,
    oldPriceMinor: 799900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "72 л",
          ro: "72 l",
        },
      },
      {
        label: {
          ru: "Конвекция SurroundCook",
          ro: "SurroundCook",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "AquaClean",
          ro: "AquaClean",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000039",
    slug: "samsung-nv68a1140bs",
    categoryId: "10000000-0000-4000-8000-000000000006",
    brand: "Samsung",
    model: "NV68A1140BS",
    sku: "TS-OVE-0039",
    name: {
      ru: "Samsung NV68A1140BS",
      ro: "Samsung NV68A1140BS",
    },
    shortDescription: {
      ru: "Духовые шкафы Samsung NV68A1140BS. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare încorporabile Samsung NV68A1140BS. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Духовые шкафы Samsung NV68A1140BS. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare încorporabile Samsung NV68A1140BS. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 789900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "68 л",
          ro: "68 l",
        },
      },
      {
        label: {
          ru: "Телескопические направляющие",
          ro: "Ghidaje telescopice",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Каталитическая очистка",
          ro: "Curățare catalitică",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000040",
    slug: "beko-bbic12100x",
    categoryId: "10000000-0000-4000-8000-000000000006",
    brand: "Beko",
    model: "BBIC12100X",
    sku: "TS-OVE-0040",
    name: {
      ru: "Beko BBIC12100X",
      ro: "Beko BBIC12100X",
    },
    shortDescription: {
      ru: "Духовые шкафы Beko BBIC12100X. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare încorporabile Beko BBIC12100X. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Духовые шкафы Beko BBIC12100X. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare încorporabile Beko BBIC12100X. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 469900,
    oldPriceMinor: 519900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "74 л",
          ro: "74 l",
        },
      },
      {
        label: {
          ru: "Гриль",
          ro: "Grill",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Класс",
          ro: "Clasă",
        },
        value: {
          ru: "A",
          ro: "A",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000041",
    slug: "hansa-boes684021",
    categoryId: "10000000-0000-4000-8000-000000000006",
    brand: "Hansa",
    model: "BOES684021",
    sku: "TS-OVE-0041",
    name: {
      ru: "Hansa BOES684021",
      ro: "Hansa BOES684021",
    },
    shortDescription: {
      ru: "Духовые шкафы Hansa BOES684021. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare încorporabile Hansa BOES684021. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Духовые шкафы Hansa BOES684021. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare încorporabile Hansa BOES684021. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 519900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "65 л",
          ro: "65 l",
        },
      },
      {
        label: {
          ru: "Режимы нагрева",
          ro: "Moduri încălzire",
        },
        value: {
          ru: "8",
          ro: "8",
        },
      },
      {
        label: {
          ru: "Быстрый предварительный разогрев",
          ro: "Preîncălzire rapidă",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000042",
    slug: "whirlpool-oaskp8811hk",
    categoryId: "10000000-0000-4000-8000-000000000006",
    brand: "Whirlpool",
    model: "OASKP8811HK",
    sku: "TS-OVE-0042",
    name: {
      ru: "Whirlpool OASKP8811HK",
      ro: "Whirlpool OASKP8811HK",
    },
    shortDescription: {
      ru: "Духовые шкафы Whirlpool OASKP8811HK. Надёжная техника с официальной гарантией.",
      ro: "Cuptoare încorporabile Whirlpool OASKP8811HK. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Духовые шкафы Whirlpool OASKP8811HK. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Cuptoare încorporabile Whirlpool OASKP8811HK. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 849900,
    oldPriceMinor: 919900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "73 л",
          ro: "73 l",
        },
      },
      {
        label: {
          ru: "Cook3",
          ro: "Cook3",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Пиролитическая очистка",
          ro: "Curățare pirolitică",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000043",
    slug: "bosch-wqg14200me",
    categoryId: "10000000-0000-4000-8000-000000000007",
    brand: "Bosch",
    model: "WQG14200ME",
    sku: "TS-DRY-0043",
    name: {
      ru: "Bosch WQG14200ME",
      ro: "Bosch WQG14200ME",
    },
    shortDescription: {
      ru: "Сушильные машины Bosch WQG14200ME. Надёжная техника с официальной гарантией.",
      ro: "Uscătoare de rufe Bosch WQG14200ME. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Сушильные машины Bosch WQG14200ME. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Uscătoare de rufe Bosch WQG14200ME. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1499900,
    oldPriceMinor: 1649900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "9 кг",
          ro: "9 kg",
        },
      },
      {
        label: {
          ru: "Тепловой насос",
          ro: "Pompă de căldură",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "AutoDry",
          ro: "AutoDry",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000044",
    slug: "beko-df7412pa",
    categoryId: "10000000-0000-4000-8000-000000000007",
    brand: "Beko",
    model: "DF7412PA",
    sku: "TS-DRY-0044",
    name: {
      ru: "Beko DF7412PA",
      ro: "Beko DF7412PA",
    },
    shortDescription: {
      ru: "Сушильные машины Beko DF7412PA. Надёжная техника с официальной гарантией.",
      ro: "Uscătoare de rufe Beko DF7412PA. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Сушильные машины Beko DF7412PA. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Uscătoare de rufe Beko DF7412PA. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 849900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "7 кг",
          ro: "7 kg",
        },
      },
      {
        label: {
          ru: "Тепловой насос",
          ro: "Pompă de căldură",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "EcoGentle",
          ro: "EcoGentle",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000045",
    slug: "gorenje-dpna82w",
    categoryId: "10000000-0000-4000-8000-000000000007",
    brand: "Gorenje",
    model: "DPNA82W",
    sku: "TS-DRY-0045",
    name: {
      ru: "Gorenje DPNA82W",
      ro: "Gorenje DPNA82W",
    },
    shortDescription: {
      ru: "Сушильные машины Gorenje DPNA82W. Надёжная техника с официальной гарантией.",
      ro: "Uscătoare de rufe Gorenje DPNA82W. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Сушильные машины Gorenje DPNA82W. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Uscătoare de rufe Gorenje DPNA82W. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 999900,
    oldPriceMinor: 1099900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "8 кг",
          ro: "8 kg",
        },
      },
      {
        label: {
          ru: "WaveActive",
          ro: "WaveActive",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "TwinAir",
          ro: "TwinAir",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000046",
    slug: "samsung-dv90ta040ax",
    categoryId: "10000000-0000-4000-8000-000000000007",
    brand: "Samsung",
    model: "DV90TA040AX",
    sku: "TS-DRY-0046",
    name: {
      ru: "Samsung DV90TA040AX",
      ro: "Samsung DV90TA040AX",
    },
    shortDescription: {
      ru: "Сушильные машины Samsung DV90TA040AX. Надёжная техника с официальной гарантией.",
      ro: "Uscătoare de rufe Samsung DV90TA040AX. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Сушильные машины Samsung DV90TA040AX. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Uscătoare de rufe Samsung DV90TA040AX. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1549900,
    oldPriceMinor: 1699900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "9 кг",
          ro: "9 kg",
        },
      },
      {
        label: {
          ru: "OptimalDry",
          ro: "OptimalDry",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "QuickDry 35",
          ro: "QuickDry 35",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000047",
    slug: "lg-dc90v5v9w",
    categoryId: "10000000-0000-4000-8000-000000000007",
    brand: "LG",
    model: "DC90V5V9W",
    sku: "TS-DRY-0047",
    name: {
      ru: "LG DC90V5V9W",
      ro: "LG DC90V5V9W",
    },
    shortDescription: {
      ru: "Сушильные машины LG DC90V5V9W. Надёжная техника с официальной гарантией.",
      ro: "Uscătoare de rufe LG DC90V5V9W. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Сушильные машины LG DC90V5V9W. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Uscătoare de rufe LG DC90V5V9W. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1699900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "9 кг",
          ro: "9 kg",
        },
      },
      {
        label: {
          ru: "DUAL Inverter Heat Pump",
          ro: "DUAL Inverter",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Eco Hybrid",
          ro: "Eco Hybrid",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000048",
    slug: "electrolux-ew8h458b",
    categoryId: "10000000-0000-4000-8000-000000000007",
    brand: "Electrolux",
    model: "EW8H458B",
    sku: "TS-DRY-0048",
    name: {
      ru: "Electrolux EW8H458B",
      ro: "Electrolux EW8H458B",
    },
    shortDescription: {
      ru: "Сушильные машины Electrolux EW8H458B. Надёжная техника с официальной гарантией.",
      ro: "Uscătoare de rufe Electrolux EW8H458B. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Сушильные машины Electrolux EW8H458B. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Uscătoare de rufe Electrolux EW8H458B. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1379900,
    oldPriceMinor: 1499900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "8 кг",
          ro: "8 kg",
        },
      },
      {
        label: {
          ru: "PerfectCare 800",
          ro: "PerfectCare 800",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "SmartSense",
          ro: "SmartSense",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000049",
    slug: "candy-csoec8df",
    categoryId: "10000000-0000-4000-8000-000000000007",
    brand: "Candy",
    model: "CSOEC8DF",
    sku: "TS-DRY-0049",
    name: {
      ru: "Candy CSOEC8DF",
      ro: "Candy CSOEC8DF",
    },
    shortDescription: {
      ru: "Сушильные машины Candy CSOEC8DF. Надёжная техника с официальной гарантией.",
      ro: "Uscătoare de rufe Candy CSOEC8DF. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Сушильные машины Candy CSOEC8DF. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Uscătoare de rufe Candy CSOEC8DF. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 699900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Загрузка",
          ro: "Capacitate",
        },
        value: {
          ru: "8 кг",
          ro: "8 kg",
        },
      },
      {
        label: {
          ru: "Конденсационная",
          ro: "Condensare",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Smart Touch",
          ro: "Smart Touch",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000050",
    slug: "delonghi-magnifica-s-ecam-22-110-b",
    categoryId: "10000000-0000-4000-8000-000000000008",
    brand: "DeLonghi",
    model: "Magnifica S ECAM 22.110.B",
    sku: "TS-COF-0050",
    name: {
      ru: "DeLonghi Magnifica S ECAM 22.110.B",
      ro: "DeLonghi Magnifica S ECAM 22.110.B",
    },
    shortDescription: {
      ru: "Кофемашины DeLonghi Magnifica S ECAM 22.110.B. Надёжная техника с официальной гарантией.",
      ro: "Espresoare de cafea DeLonghi Magnifica S ECAM 22.110.B. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кофемашины DeLonghi Magnifica S ECAM 22.110.B. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Espresoare de cafea DeLonghi Magnifica S ECAM 22.110.B. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 699900,
    oldPriceMinor: 779900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Давление",
          ro: "Presiune",
        },
        value: {
          ru: "15 бар",
          ro: "15 bar",
        },
      },
      {
        label: {
          ru: "Капучинатор",
          ro: "Dispozitiv spumare",
        },
        value: {
          ru: "Ручной",
          ro: "Manual",
        },
      },
      {
        label: {
          ru: "Вместимость зёрен",
          ro: "Capacitate boabe",
        },
        value: {
          ru: "250 г",
          ro: "250 g",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000051",
    slug: "philips-series-2200-ep2220-10",
    categoryId: "10000000-0000-4000-8000-000000000008",
    brand: "Philips",
    model: "Series 2200 EP2220/10",
    sku: "TS-COF-0051",
    name: {
      ru: "Philips Series 2200 EP2220/10",
      ro: "Philips Series 2200 EP2220/10",
    },
    shortDescription: {
      ru: "Кофемашины Philips Series 2200 EP2220/10. Надёжная техника с официальной гарантией.",
      ro: "Espresoare de cafea Philips Series 2200 EP2220/10. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кофемашины Philips Series 2200 EP2220/10. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Espresoare de cafea Philips Series 2200 EP2220/10. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 749900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Давление",
          ro: "Presiune",
        },
        value: {
          ru: "15 бар",
          ro: "15 bar",
        },
      },
      {
        label: {
          ru: "Керамические жернова",
          ro: "Râșniță ceramică",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "AquaClean",
          ro: "AquaClean",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000052",
    slug: "krups-essential-ea810870",
    categoryId: "10000000-0000-4000-8000-000000000008",
    brand: "Krups",
    model: "Essential EA810870",
    sku: "TS-COF-0052",
    name: {
      ru: "Krups Essential EA810870",
      ro: "Krups Essential EA810870",
    },
    shortDescription: {
      ru: "Кофемашины Krups Essential EA810870. Надёжная техника с официальной гарантией.",
      ro: "Espresoare de cafea Krups Essential EA810870. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кофемашины Krups Essential EA810870. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Espresoare de cafea Krups Essential EA810870. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 529900,
    oldPriceMinor: 589900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Давление",
          ro: "Presiune",
        },
        value: {
          ru: "15 бар",
          ro: "15 bar",
        },
      },
      {
        label: {
          ru: "Компактность",
          ro: "Design compact",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Резервуар для воды",
          ro: "Rezervor apă",
        },
        value: {
          ru: "1.7 л",
          ro: "1.7 l",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000053",
    slug: "saeco-lirika-plus",
    categoryId: "10000000-0000-4000-8000-000000000008",
    brand: "Saeco",
    model: "Lirika Plus",
    sku: "TS-COF-0053",
    name: {
      ru: "Saeco Lirika Plus",
      ro: "Saeco Lirika Plus",
    },
    shortDescription: {
      ru: "Кофемашины Saeco Lirika Plus. Надёжная техника с официальной гарантией.",
      ro: "Espresoare de cafea Saeco Lirika Plus. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кофемашины Saeco Lirika Plus. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Espresoare de cafea Saeco Lirika Plus. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 899900,
    oldPriceMinor: 979900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Давление",
          ro: "Presiune",
        },
        value: {
          ru: "15 бар",
          ro: "15 bar",
        },
      },
      {
        label: {
          ru: "Резервуар для воды",
          ro: "Rezervor apă",
        },
        value: {
          ru: "2.5 л",
          ro: "2.5 l",
        },
      },
      {
        label: {
          ru: "Для офиса и дома",
          ro: "Pentru casă și birou",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000054",
    slug: "melitta-solo-e950-103",
    categoryId: "10000000-0000-4000-8000-000000000008",
    brand: "Melitta",
    model: "Solo E950-103",
    sku: "TS-COF-0054",
    name: {
      ru: "Melitta Solo E950-103",
      ro: "Melitta Solo E950-103",
    },
    shortDescription: {
      ru: "Кофемашины Melitta Solo E950-103. Надёжная техника с официальной гарантией.",
      ro: "Espresoare de cafea Melitta Solo E950-103. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кофемашины Melitta Solo E950-103. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Espresoare de cafea Melitta Solo E950-103. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 589900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Ширина",
          ro: "Lățime",
        },
        value: {
          ru: "20 см",
          ro: "20 cm",
        },
      },
      {
        label: {
          ru: "Предварительное смачивание",
          ro: "Pre-umezire",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Давление",
          ro: "Presiune",
        },
        value: {
          ru: "15 бар",
          ro: "15 bar",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000055",
    slug: "nivona-caferomatica-520",
    categoryId: "10000000-0000-4000-8000-000000000008",
    brand: "Nivona",
    model: "CafeRomatica 520",
    sku: "TS-COF-0055",
    name: {
      ru: "Nivona CafeRomatica 520",
      ro: "Nivona CafeRomatica 520",
    },
    shortDescription: {
      ru: "Кофемашины Nivona CafeRomatica 520. Надёжная техника с официальной гарантией.",
      ro: "Espresoare de cafea Nivona CafeRomatica 520. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кофемашины Nivona CafeRomatica 520. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Espresoare de cafea Nivona CafeRomatica 520. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 829900,
    oldPriceMinor: 899900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Давление",
          ro: "Presiune",
        },
        value: {
          ru: "15 бар",
          ro: "15 bar",
        },
      },
      {
        label: {
          ru: "Spumatore",
          ro: "Spumatore",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Цветной TFT дисплей",
          ro: "Afișaj TFT",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000056",
    slug: "gaggia-naviglio-deluxe",
    categoryId: "10000000-0000-4000-8000-000000000008",
    brand: "Gaggia",
    model: "Naviglio Deluxe",
    sku: "TS-COF-0056",
    name: {
      ru: "Gaggia Naviglio Deluxe",
      ro: "Gaggia Naviglio Deluxe",
    },
    shortDescription: {
      ru: "Кофемашины Gaggia Naviglio Deluxe. Надёжная техника с официальной гарантией.",
      ro: "Espresoare de cafea Gaggia Naviglio Deluxe. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кофемашины Gaggia Naviglio Deluxe. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Espresoare de cafea Gaggia Naviglio Deluxe. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 779900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Давление",
          ro: "Presiune",
        },
        value: {
          ru: "15 бар",
          ro: "15 bar",
        },
      },
      {
        label: {
          ru: "Автоматический капучинатор",
          ro: "Cappuccinatore automat",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Производство",
          ro: "Origine",
        },
        value: {
          ru: "Италия",
          ro: "Italia",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000057",
    slug: "philips-fc9332-09",
    categoryId: "10000000-0000-4000-8000-000000000009",
    brand: "Philips",
    model: "FC9332/09",
    sku: "TS-VAC-0057",
    name: {
      ru: "Philips FC9332/09",
      ro: "Philips FC9332/09",
    },
    shortDescription: {
      ru: "Пылесосы Philips FC9332/09. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare Philips FC9332/09. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Пылесосы Philips FC9332/09. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare Philips FC9332/09. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 249900,
    oldPriceMinor: 279900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Безмешковый",
          ro: "Fără sac",
        },
      },
      {
        label: {
          ru: "PowerCyclone 5",
          ro: "PowerCyclone 5",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Фильтр",
          ro: "Filtru",
        },
        value: {
          ru: "Allergy H13",
          ro: "Allergy H13",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000058",
    slug: "samsung-vcc4520s3r",
    categoryId: "10000000-0000-4000-8000-000000000009",
    brand: "Samsung",
    model: "VCC4520S3R",
    sku: "TS-VAC-0058",
    name: {
      ru: "Samsung VCC4520S3R",
      ro: "Samsung VCC4520S3R",
    },
    shortDescription: {
      ru: "Пылесосы Samsung VCC4520S3R. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare Samsung VCC4520S3R. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Пылесосы Samsung VCC4520S3R. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare Samsung VCC4520S3R. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 159900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Циклонный",
          ro: "Ciclonic",
        },
      },
      {
        label: {
          ru: "Мощность всасывания",
          ro: "Putere aspirare",
        },
        value: {
          ru: "350 Вт",
          ro: "350 W",
        },
      },
      {
        label: {
          ru: "Пылесборник",
          ro: "Capacitate",
        },
        value: {
          ru: "1.3 л",
          ro: "1.3 l",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000059",
    slug: "bosch-bgls2ba1",
    categoryId: "10000000-0000-4000-8000-000000000009",
    brand: "Bosch",
    model: "BGLS2BA1",
    sku: "TS-VAC-0059",
    name: {
      ru: "Bosch BGLS2BA1",
      ro: "Bosch BGLS2BA1",
    },
    shortDescription: {
      ru: "Пылесосы Bosch BGLS2BA1. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare Bosch BGLS2BA1. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Пылесосы Bosch BGLS2BA1. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare Bosch BGLS2BA1. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 219900,
    oldPriceMinor: 249900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "С мешком",
          ro: "Cu sac",
        },
      },
      {
        label: {
          ru: "Двигатель",
          ro: "Motor",
        },
        value: {
          ru: "HiSpin",
          ro: "HiSpin",
        },
      },
      {
        label: {
          ru: "Радиус действия",
          ro: "Rază acțiune",
        },
        value: {
          ru: "8 м",
          ro: "8 m",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000060",
    slug: "karcher-vc-3",
    categoryId: "10000000-0000-4000-8000-000000000009",
    brand: "Kärcher",
    model: "VC 3",
    sku: "TS-VAC-0060",
    name: {
      ru: "Kärcher VC 3",
      ro: "Kärcher VC 3",
    },
    shortDescription: {
      ru: "Пылесосы Kärcher VC 3. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare Kärcher VC 3. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Пылесосы Kärcher VC 3. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare Kärcher VC 3. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 289900,
    oldPriceMinor: 319900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Мультициклон",
          ro: "Multiciclon",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Фильтр HEPA",
          ro: "Filtru HEPA",
        },
        value: {
          ru: "HEPA 12",
          ro: "HEPA 12",
        },
      },
      {
        label: {
          ru: "Потребляемая мощность",
          ro: "Consum energie",
        },
        value: {
          ru: "700 Вт",
          ro: "700 W",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000061",
    slug: "rowenta-compact-power-ro3786ea",
    categoryId: "10000000-0000-4000-8000-000000000009",
    brand: "Rowenta",
    model: "Compact Power RO3786EA",
    sku: "TS-VAC-0061",
    name: {
      ru: "Rowenta Compact Power RO3786EA",
      ro: "Rowenta Compact Power RO3786EA",
    },
    shortDescription: {
      ru: "Пылесосы Rowenta Compact Power RO3786EA. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare Rowenta Compact Power RO3786EA. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Пылесосы Rowenta Compact Power RO3786EA. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare Rowenta Compact Power RO3786EA. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 229900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Контейнерный",
          ro: "Recipient",
        },
      },
      {
        label: {
          ru: "Насадка для шерсти",
          ro: "Perie animale",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.5 л",
          ro: "1.5 l",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000062",
    slug: "thomas-twin-xt",
    categoryId: "10000000-0000-4000-8000-000000000009",
    brand: "Thomas",
    model: "Twin XT",
    sku: "TS-VAC-0062",
    name: {
      ru: "Thomas Twin XT",
      ro: "Thomas Twin XT",
    },
    shortDescription: {
      ru: "Пылесосы Thomas Twin XT. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare Thomas Twin XT. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Пылесосы Thomas Twin XT. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare Thomas Twin XT. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 599900,
    oldPriceMinor: 659900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Моющий с аквафильтром",
          ro: "Cu spălare și acvafiltru",
        },
      },
      {
        label: {
          ru: "AQUA-BOX",
          ro: "AQUA-BOX",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Сделано в Германии",
          ro: "Fabricat în Germania",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000063",
    slug: "tefal-compact-power-tw3724ra",
    categoryId: "10000000-0000-4000-8000-000000000009",
    brand: "Tefal",
    model: "Compact Power TW3724RA",
    sku: "TS-VAC-0063",
    name: {
      ru: "Tefal Compact Power TW3724RA",
      ro: "Tefal Compact Power TW3724RA",
    },
    shortDescription: {
      ru: "Пылесосы Tefal Compact Power TW3724RA. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare Tefal Compact Power TW3724RA. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Пылесосы Tefal Compact Power TW3724RA. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare Tefal Compact Power TW3724RA. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 179900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Тип",
          ro: "Tip",
        },
        value: {
          ru: "Циклонный",
          ro: "Ciclonic",
        },
      },
      {
        label: {
          ru: "Эко-мотор",
          ro: "Motor Eco",
        },
        value: {
          ru: "750 Вт",
          ro: "750 W",
        },
      },
      {
        label: {
          ru: "Фильтрация",
          ro: "Filtrare",
        },
        value: {
          ru: "99.98%",
          ro: "99.98%",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000064",
    slug: "xiaomi-robot-vacuum-s10",
    categoryId: "10000000-0000-4000-8000-000000000010",
    brand: "Xiaomi",
    model: "Robot Vacuum S10",
    sku: "TS-ROB-0064",
    name: {
      ru: "Xiaomi Robot Vacuum S10",
      ro: "Xiaomi Robot Vacuum S10",
    },
    shortDescription: {
      ru: "Роботы-пылесосы Xiaomi Robot Vacuum S10. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare robot Xiaomi Robot Vacuum S10. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Роботы-пылесосы Xiaomi Robot Vacuum S10. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare robot Xiaomi Robot Vacuum S10. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 429900,
    oldPriceMinor: 479900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Навигация",
          ro: "Navigație",
        },
        value: {
          ru: "LDS лазер",
          ro: "Laser LDS",
        },
      },
      {
        label: {
          ru: "Влажная уборка",
          ro: "Curățare umedă",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Сила всасывания",
          ro: "Putere aspirare",
        },
        value: {
          ru: "4000 Па",
          ro: "4000 Pa",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000065",
    slug: "roborock-q7-max",
    categoryId: "10000000-0000-4000-8000-000000000010",
    brand: "Roborock",
    model: "Q7 Max",
    sku: "TS-ROB-0065",
    name: {
      ru: "Roborock Q7 Max",
      ro: "Roborock Q7 Max",
    },
    shortDescription: {
      ru: "Роботы-пылесосы Roborock Q7 Max. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare robot Roborock Q7 Max. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Роботы-пылесосы Roborock Q7 Max. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare robot Roborock Q7 Max. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 799900,
    oldPriceMinor: 879900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Сила всасывания",
          ro: "Putere aspirare",
        },
        value: {
          ru: "4200 Па",
          ro: "4200 Pa",
        },
      },
      {
        label: {
          ru: "3D картографирование",
          ro: "Cartografiere 3D",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Аккумулятор",
          ro: "Baterie",
        },
        value: {
          ru: "5200 мАч",
          ro: "5200 mAh",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000066",
    slug: "dreame-d9-max",
    categoryId: "10000000-0000-4000-8000-000000000010",
    brand: "Dreame",
    model: "D9 Max",
    sku: "TS-ROB-0066",
    name: {
      ru: "Dreame D9 Max",
      ro: "Dreame D9 Max",
    },
    shortDescription: {
      ru: "Роботы-пылесосы Dreame D9 Max. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare robot Dreame D9 Max. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Роботы-пылесосы Dreame D9 Max. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare robot Dreame D9 Max. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 519900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Сила всасывания",
          ro: "Putere aspirare",
        },
        value: {
          ru: "4000 Па",
          ro: "4000 Pa",
        },
      },
      {
        label: {
          ru: "LiDAR навигация",
          ro: "Navigație LiDAR",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Время работы",
          ro: "Autonomie",
        },
        value: {
          ru: "150 мин",
          ro: "150 min",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000067",
    slug: "ecovacs-deebot-n8-pro",
    categoryId: "10000000-0000-4000-8000-000000000010",
    brand: "ECOVACS",
    model: "Deebot N8 Pro",
    sku: "TS-ROB-0067",
    name: {
      ru: "ECOVACS Deebot N8 Pro",
      ro: "ECOVACS Deebot N8 Pro",
    },
    shortDescription: {
      ru: "Роботы-пылесосы ECOVACS Deebot N8 Pro. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare robot ECOVACS Deebot N8 Pro. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Роботы-пылесосы ECOVACS Deebot N8 Pro. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare robot ECOVACS Deebot N8 Pro. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 649900,
    oldPriceMinor: 719900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "TrueDetect 3D",
          ro: "TrueDetect 3D",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "OZMO мытьё полов",
          ro: "Spălare OZMO",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Сила всасывания",
          ro: "Putere aspirare",
        },
        value: {
          ru: "2600 Па",
          ro: "2600 Pa",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000068",
    slug: "rowenta-x-plorer-serie-75",
    categoryId: "10000000-0000-4000-8000-000000000010",
    brand: "Rowenta",
    model: "X-Plorer Serie 75",
    sku: "TS-ROB-0068",
    name: {
      ru: "Rowenta X-Plorer Serie 75",
      ro: "Rowenta X-Plorer Serie 75",
    },
    shortDescription: {
      ru: "Роботы-пылесосы Rowenta X-Plorer Serie 75. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare robot Rowenta X-Plorer Serie 75. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Роботы-пылесосы Rowenta X-Plorer Serie 75. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare robot Rowenta X-Plorer Serie 75. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 589900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Лазерная навигация",
          ro: "Navigație laser",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Aqua Force 2в1",
          ro: "Aqua Force 2în1",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Управление со смартфона",
          ro: "Control smartphone",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000069",
    slug: "midea-m7-pro",
    categoryId: "10000000-0000-4000-8000-000000000010",
    brand: "Midea",
    model: "M7 Pro",
    sku: "TS-ROB-0069",
    name: {
      ru: "Midea M7 Pro",
      ro: "Midea M7 Pro",
    },
    shortDescription: {
      ru: "Роботы-пылесосы Midea M7 Pro. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare robot Midea M7 Pro. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Роботы-пылесосы Midea M7 Pro. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare robot Midea M7 Pro. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 449900,
    oldPriceMinor: 499900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Вибрационная швабра",
          ro: "Mop cu vibrații",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Сила всасывания",
          ro: "Putere aspirare",
        },
        value: {
          ru: "4000 Па",
          ro: "4000 Pa",
        },
      },
      {
        label: {
          ru: "LDS лазер",
          ro: "Laser LDS",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000070",
    slug: "roidmi-eve-plus",
    categoryId: "10000000-0000-4000-8000-000000000010",
    brand: "Roidmi",
    model: "EVE Plus",
    sku: "TS-ROB-0070",
    name: {
      ru: "Roidmi EVE Plus",
      ro: "Roidmi EVE Plus",
    },
    shortDescription: {
      ru: "Роботы-пылесосы Roidmi EVE Plus. Надёжная техника с официальной гарантией.",
      ro: "Aspiratoare robot Roidmi EVE Plus. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Роботы-пылесосы Roidmi EVE Plus. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aspiratoare robot Roidmi EVE Plus. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 699900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Станция самоочистки",
          ro: "Stație autogolire",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Сила всасывания",
          ro: "Putere aspirare",
        },
        value: {
          ru: "2700 Па",
          ro: "2700 Pa",
        },
      },
      {
        label: {
          ru: "Ионизация",
          ro: "Dezodorizare",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000071",
    slug: "bosch-twk3a011",
    categoryId: "10000000-0000-4000-8000-000000000011",
    brand: "Bosch",
    model: "TWK3A011",
    sku: "TS-ELE-0071",
    name: {
      ru: "Bosch TWK3A011",
      ro: "Bosch TWK3A011",
    },
    shortDescription: {
      ru: "Электрочайники Bosch TWK3A011. Надёжная техника с официальной гарантией.",
      ro: "Fierbătoare electrice Bosch TWK3A011. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Электрочайники Bosch TWK3A011. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Fierbătoare electrice Bosch TWK3A011. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 69900,
    oldPriceMinor: 79900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.7 л",
          ro: "1.7 l",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "2400 Вт",
          ro: "2400 W",
        },
      },
      {
        label: {
          ru: "Скрытый нагревательный элемент",
          ro: "Element ascuns",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000072",
    slug: "philips-hd9318-00",
    categoryId: "10000000-0000-4000-8000-000000000011",
    brand: "Philips",
    model: "HD9318/00",
    sku: "TS-ELE-0072",
    name: {
      ru: "Philips HD9318/00",
      ro: "Philips HD9318/00",
    },
    shortDescription: {
      ru: "Электрочайники Philips HD9318/00. Надёжная техника с официальной гарантией.",
      ro: "Fierbătoare electrice Philips HD9318/00. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Электрочайники Philips HD9318/00. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Fierbătoare electrice Philips HD9318/00. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 59900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.7 л",
          ro: "1.7 l",
        },
      },
      {
        label: {
          ru: "Индикатор уровня воды",
          ro: "Indicator nivel apă",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Фильтр от накипи",
          ro: "Filtru anticalcar",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000073",
    slug: "tefal-includeo-ki533811",
    categoryId: "10000000-0000-4000-8000-000000000011",
    brand: "Tefal",
    model: "Includeo KI533811",
    sku: "TS-ELE-0073",
    name: {
      ru: "Tefal Includeo KI533811",
      ro: "Tefal Includeo KI533811",
    },
    shortDescription: {
      ru: "Электрочайники Tefal Includeo KI533811. Надёжная техника с официальной гарантией.",
      ro: "Fierbătoare electrice Tefal Includeo KI533811. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Электрочайники Tefal Includeo KI533811. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Fierbătoare electrice Tefal Includeo KI533811. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 74900,
    oldPriceMinor: 84900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.0 л",
          ro: "1.0 l",
        },
      },
      {
        label: {
          ru: "Удобная эргономичная ручка",
          ro: "Mâner ergonomic",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Автоотключение",
          ro: "Oprire automată",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000074",
    slug: "xiaomi-smart-kettle-pro",
    categoryId: "10000000-0000-4000-8000-000000000011",
    brand: "Xiaomi",
    model: "Smart Kettle Pro",
    sku: "TS-ELE-0074",
    name: {
      ru: "Xiaomi Smart Kettle Pro",
      ro: "Xiaomi Smart Kettle Pro",
    },
    shortDescription: {
      ru: "Электрочайники Xiaomi Smart Kettle Pro. Надёжная техника с официальной гарантией.",
      ro: "Fierbătoare electrice Xiaomi Smart Kettle Pro. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Электрочайники Xiaomi Smart Kettle Pro. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Fierbătoare electrice Xiaomi Smart Kettle Pro. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 99900,
    oldPriceMinor: 114900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.5 л",
          ro: "1.5 l",
        },
      },
      {
        label: {
          ru: "OLED дисплей и терморегулятор",
          ro: "Afișaj OLED & temperatură",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Поддержание тепла",
          ro: "Menținere căldură",
        },
        value: {
          ru: "12 ч",
          ro: "12 h",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000075",
    slug: "gorenje-k17feii",
    categoryId: "10000000-0000-4000-8000-000000000011",
    brand: "Gorenje",
    model: "K17FEII",
    sku: "TS-ELE-0075",
    name: {
      ru: "Gorenje K17FEII",
      ro: "Gorenje K17FEII",
    },
    shortDescription: {
      ru: "Электрочайники Gorenje K17FEII. Надёжная техника с официальной гарантией.",
      ro: "Fierbătoare electrice Gorenje K17FEII. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Электрочайники Gorenje K17FEII. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Fierbătoare electrice Gorenje K17FEII. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 64900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.7 л",
          ro: "1.7 l",
        },
      },
      {
        label: {
          ru: "Материал корпуса",
          ro: "Carcasă",
        },
        value: {
          ru: "Нержавеющая сталь",
          ro: "Inox",
        },
      },
      {
        label: {
          ru: "Вращение на 360°",
          ro: "Rotire 360°",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000076",
    slug: "braun-wk3000bk",
    categoryId: "10000000-0000-4000-8000-000000000011",
    brand: "Braun",
    model: "WK3000BK",
    sku: "TS-ELE-0076",
    name: {
      ru: "Braun WK3000BK",
      ro: "Braun WK3000BK",
    },
    shortDescription: {
      ru: "Электрочайники Braun WK3000BK. Надёжная техника с официальной гарантией.",
      ro: "Fierbătoare electrice Braun WK3000BK. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Электрочайники Braun WK3000BK. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Fierbătoare electrice Braun WK3000BK. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 84900,
    oldPriceMinor: 94900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.0 л",
          ro: "1.0 l",
        },
      },
      {
        label: {
          ru: "Быстрое кипячение",
          ro: "Fierbere rapidă 45s",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "2200 Вт",
          ro: "2200 W",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000077",
    slug: "scarlett-sc-ek27g98",
    categoryId: "10000000-0000-4000-8000-000000000011",
    brand: "Scarlett",
    model: "SC-EK27G98",
    sku: "TS-ELE-0077",
    name: {
      ru: "Scarlett SC-EK27G98",
      ro: "Scarlett SC-EK27G98",
    },
    shortDescription: {
      ru: "Электрочайники Scarlett SC-EK27G98. Надёжная техника с официальной гарантией.",
      ro: "Fierbătoare electrice Scarlett SC-EK27G98. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Электрочайники Scarlett SC-EK27G98. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Fierbătoare electrice Scarlett SC-EK27G98. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 39900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Объём",
          ro: "Volum",
        },
        value: {
          ru: "1.7 л",
          ro: "1.7 l",
        },
      },
      {
        label: {
          ru: "Стеклянный корпус с подсветкой",
          ro: "Corp sticlă cu LED",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "2200 Вт",
          ro: "2200 W",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000078",
    slug: "braun-multiquick-3-mq3025",
    categoryId: "10000000-0000-4000-8000-000000000012",
    brand: "Braun",
    model: "MultiQuick 3 MQ3025",
    sku: "TS-BLE-0078",
    name: {
      ru: "Braun MultiQuick 3 MQ3025",
      ro: "Braun MultiQuick 3 MQ3025",
    },
    shortDescription: {
      ru: "Блендеры Braun MultiQuick 3 MQ3025. Надёжная техника с официальной гарантией.",
      ro: "Blendere Braun MultiQuick 3 MQ3025. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Блендеры Braun MultiQuick 3 MQ3025. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Blendere Braun MultiQuick 3 MQ3025. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 89900,
    oldPriceMinor: 99900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "700 Вт",
          ro: "700 W",
        },
      },
      {
        label: {
          ru: "Технология PowerBell Plus",
          ro: "PowerBell Plus",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Измельчитель",
          ro: "Tocător",
        },
        value: {
          ru: "350 мл",
          ro: "350 ml",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000079",
    slug: "bosch-ergomixx-msm66110",
    categoryId: "10000000-0000-4000-8000-000000000012",
    brand: "Bosch",
    model: "ErgoMixx MSM66110",
    sku: "TS-BLE-0079",
    name: {
      ru: "Bosch ErgoMixx MSM66110",
      ro: "Bosch ErgoMixx MSM66110",
    },
    shortDescription: {
      ru: "Блендеры Bosch ErgoMixx MSM66110. Надёжная техника с официальной гарантией.",
      ro: "Blendere Bosch ErgoMixx MSM66110. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Блендеры Bosch ErgoMixx MSM66110. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Blendere Bosch ErgoMixx MSM66110. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 79900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "600 Вт",
          ro: "600 W",
        },
      },
      {
        label: {
          ru: "Ножка из нержавеющей стали",
          ro: "Picior inox",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Турборежим",
          ro: "Regim Turbo",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000080",
    slug: "philips-daily-collection-hr2534",
    categoryId: "10000000-0000-4000-8000-000000000012",
    brand: "Philips",
    model: "Daily Collection HR2534",
    sku: "TS-BLE-0080",
    name: {
      ru: "Philips Daily Collection HR2534",
      ro: "Philips Daily Collection HR2534",
    },
    shortDescription: {
      ru: "Блендеры Philips Daily Collection HR2534. Надёжная техника с официальной гарантией.",
      ro: "Blendere Philips Daily Collection HR2534. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Блендеры Philips Daily Collection HR2534. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Blendere Philips Daily Collection HR2534. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 69900,
    oldPriceMinor: 79900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "650 Вт",
          ro: "650 W",
        },
      },
      {
        label: {
          ru: "ProMix технология",
          ro: "Tehnologie ProMix",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Стакан в комплекте",
          ro: "Pahar inclus",
        },
        value: {
          ru: "0.5 л",
          ro: "0.5 l",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000081",
    slug: "tefal-quickchef-hb656838",
    categoryId: "10000000-0000-4000-8000-000000000012",
    brand: "Tefal",
    model: "Quickchef HB656838",
    sku: "TS-BLE-0081",
    name: {
      ru: "Tefal Quickchef HB656838",
      ro: "Tefal Quickchef HB656838",
    },
    shortDescription: {
      ru: "Блендеры Tefal Quickchef HB656838. Надёжная техника с официальной гарантией.",
      ro: "Blendere Tefal Quickchef HB656838. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Блендеры Tefal Quickchef HB656838. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Blendere Tefal Quickchef HB656838. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 119900,
    oldPriceMinor: 134900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "1000 Вт",
          ro: "1000 W",
        },
      },
      {
        label: {
          ru: "Скорости",
          ro: "Viteze",
        },
        value: {
          ru: "20 скоростей",
          ro: "20 viteze",
        },
      },
      {
        label: {
          ru: "Комплектация 3в1",
          ro: "Set 3în1",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000082",
    slug: "gorenje-hbx601w",
    categoryId: "10000000-0000-4000-8000-000000000012",
    brand: "Gorenje",
    model: "HBX601W",
    sku: "TS-BLE-0082",
    name: {
      ru: "Gorenje HBX601W",
      ro: "Gorenje HBX601W",
    },
    shortDescription: {
      ru: "Блендеры Gorenje HBX601W. Надёжная техника с официальной гарантией.",
      ro: "Blendere Gorenje HBX601W. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Блендеры Gorenje HBX601W. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Blendere Gorenje HBX601W. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 54900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "600 Вт",
          ro: "600 W",
        },
      },
      {
        label: {
          ru: "DC двигатель",
          ro: "Motor DC",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Нож QuadBlade",
          ro: "Lamă QuadBlade",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000083",
    slug: "nutribullet-pro-nb907b",
    categoryId: "10000000-0000-4000-8000-000000000012",
    brand: "Nutribullet",
    model: "Pro NB907B",
    sku: "TS-BLE-0083",
    name: {
      ru: "Nutribullet Pro NB907B",
      ro: "Nutribullet Pro NB907B",
    },
    shortDescription: {
      ru: "Блендеры Nutribullet Pro NB907B. Надёжная техника с официальной гарантией.",
      ro: "Blendere Nutribullet Pro NB907B. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Блендеры Nutribullet Pro NB907B. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Blendere Nutribullet Pro NB907B. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 189900,
    oldPriceMinor: 209900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "900 Вт",
          ro: "900 W",
        },
      },
      {
        label: {
          ru: "Экстракция питательных веществ",
          ro: "Extracție nutrienți",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Чаши в комплекте",
          ro: "Cupe incluse",
        },
        value: {
          ru: "2 шт",
          ro: "2 buc",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000084",
    slug: "scarlett-sc-hb42f80",
    categoryId: "10000000-0000-4000-8000-000000000012",
    brand: "Scarlett",
    model: "SC-HB42F80",
    sku: "TS-BLE-0084",
    name: {
      ru: "Scarlett SC-HB42F80",
      ro: "Scarlett SC-HB42F80",
    },
    shortDescription: {
      ru: "Блендеры Scarlett SC-HB42F80. Надёжная техника с официальной гарантией.",
      ro: "Blendere Scarlett SC-HB42F80. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Блендеры Scarlett SC-HB42F80. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Blendere Scarlett SC-HB42F80. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 44900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "850 Вт",
          ro: "850 W",
        },
      },
      {
        label: {
          ru: "Венчик и измельчитель",
          ro: "Tel și tocător",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Импульсный режим",
          ro: "Regim impuls",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000085",
    slug: "bosch-multitalent-3-mcm3200w",
    categoryId: "10000000-0000-4000-8000-000000000013",
    brand: "Bosch",
    model: "MultiTalent 3 MCM3200W",
    sku: "TS-FOO-0085",
    name: {
      ru: "Bosch MultiTalent 3 MCM3200W",
      ro: "Bosch MultiTalent 3 MCM3200W",
    },
    shortDescription: {
      ru: "Кухонные комбайны Bosch MultiTalent 3 MCM3200W. Надёжная техника с официальной гарантией.",
      ro: "Roboți de bucătărie Bosch MultiTalent 3 MCM3200W. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кухонные комбайны Bosch MultiTalent 3 MCM3200W. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Roboți de bucătărie Bosch MultiTalent 3 MCM3200W. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 199900,
    oldPriceMinor: 224900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "800 Вт",
          ro: "800 W",
        },
      },
      {
        label: {
          ru: "Чаша",
          ro: "Bol",
        },
        value: {
          ru: "2.3 л",
          ro: "2.3 l",
        },
      },
      {
        label: {
          ru: "Функции",
          ro: "Funcții",
        },
        value: {
          ru: "Более 30",
          ro: "Peste 30",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000086",
    slug: "philips-daily-hr7310-00",
    categoryId: "10000000-0000-4000-8000-000000000013",
    brand: "Philips",
    model: "Daily HR7310/00",
    sku: "TS-FOO-0086",
    name: {
      ru: "Philips Daily HR7310/00",
      ro: "Philips Daily HR7310/00",
    },
    shortDescription: {
      ru: "Кухонные комбайны Philips Daily HR7310/00. Надёжная техника с официальной гарантией.",
      ro: "Roboți de bucătărie Philips Daily HR7310/00. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кухонные комбайны Philips Daily HR7310/00. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Roboți de bucătărie Philips Daily HR7310/00. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 174900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "700 Вт",
          ro: "700 W",
        },
      },
      {
        label: {
          ru: "Диск 2в1 для нарезки",
          ro: "Disc 2în1",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Чаша",
          ro: "Bol",
        },
        value: {
          ru: "2.1 л",
          ro: "2.1 l",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000087",
    slug: "kenwood-prospero-khc29",
    categoryId: "10000000-0000-4000-8000-000000000013",
    brand: "Kenwood",
    model: "Prospero+ KHC29",
    sku: "TS-FOO-0087",
    name: {
      ru: "Kenwood Prospero+ KHC29",
      ro: "Kenwood Prospero+ KHC29",
    },
    shortDescription: {
      ru: "Кухонные комбайны Kenwood Prospero+ KHC29. Надёжная техника с официальной гарантией.",
      ro: "Roboți de bucătărie Kenwood Prospero+ KHC29. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кухонные комбайны Kenwood Prospero+ KHC29. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Roboți de bucătărie Kenwood Prospero+ KHC29. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 449900,
    oldPriceMinor: 499900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "1000 Вт",
          ro: "1000 W",
        },
      },
      {
        label: {
          ru: "Планетарное смешивание",
          ro: "Mixare planetară",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Металлическая чаша",
          ro: "Bol inox",
        },
        value: {
          ru: "4.3 л",
          ro: "4.3 l",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000088",
    slug: "tefal-masterchef-gourmet",
    categoryId: "10000000-0000-4000-8000-000000000013",
    brand: "Tefal",
    model: "Masterchef Gourmet",
    sku: "TS-FOO-0088",
    name: {
      ru: "Tefal Masterchef Gourmet",
      ro: "Tefal Masterchef Gourmet",
    },
    shortDescription: {
      ru: "Кухонные комбайны Tefal Masterchef Gourmet. Надёжная техника с официальной гарантией.",
      ro: "Roboți de bucătărie Tefal Masterchef Gourmet. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кухонные комбайны Tefal Masterchef Gourmet. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Roboți de bucătărie Tefal Masterchef Gourmet. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 499900,
    oldPriceMinor: 549900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "1100 Вт",
          ro: "1100 W",
        },
      },
      {
        label: {
          ru: "Венчик Flex Whisk",
          ro: "Flex Whisk",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Мясорубка в комплекте",
          ro: "Mașină tocat inclusă",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000089",
    slug: "gorenje-sbr1000be",
    categoryId: "10000000-0000-4000-8000-000000000013",
    brand: "Gorenje",
    model: "SBR1000BE",
    sku: "TS-FOO-0089",
    name: {
      ru: "Gorenje SBR1000BE",
      ro: "Gorenje SBR1000BE",
    },
    shortDescription: {
      ru: "Кухонные комбайны Gorenje SBR1000BE. Надёжная техника с официальной гарантией.",
      ro: "Roboți de bucătărie Gorenje SBR1000BE. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кухонные комбайны Gorenje SBR1000BE. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Roboți de bucătărie Gorenje SBR1000BE. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 259900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "1000 Вт",
          ro: "1000 W",
        },
      },
      {
        label: {
          ru: "Количество насадок",
          ro: "Accesorii",
        },
        value: {
          ru: "8",
          ro: "8",
        },
      },
      {
        label: {
          ru: "Блендерная чаша",
          ro: "Vas blender",
        },
        value: {
          ru: "1.5 л",
          ro: "1.5 l",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000090",
    slug: "braun-tribute-fx3030",
    categoryId: "10000000-0000-4000-8000-000000000013",
    brand: "Braun",
    model: "Tribute FX3030",
    sku: "TS-FOO-0090",
    name: {
      ru: "Braun Tribute FX3030",
      ro: "Braun Tribute FX3030",
    },
    shortDescription: {
      ru: "Кухонные комбайны Braun Tribute FX3030. Надёжная техника с официальной гарантией.",
      ro: "Roboți de bucătărie Braun Tribute FX3030. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кухонные комбайны Braun Tribute FX3030. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Roboți de bucătărie Braun Tribute FX3030. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 299900,
    oldPriceMinor: 329900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Две чаши Side-by-Side",
          ro: "Două boluri",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "600 Вт",
          ro: "600 W",
        },
      },
      {
        label: {
          ru: "Скорости",
          ro: "Viteze",
        },
        value: {
          ru: "15 + Pulse",
          ro: "15 + Pulse",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000091",
    slug: "moulinex-masterchef-grande",
    categoryId: "10000000-0000-4000-8000-000000000013",
    brand: "Moulinex",
    model: "Masterchef Grande",
    sku: "TS-FOO-0091",
    name: {
      ru: "Moulinex Masterchef Grande",
      ro: "Moulinex Masterchef Grande",
    },
    shortDescription: {
      ru: "Кухонные комбайны Moulinex Masterchef Grande. Надёжная техника с официальной гарантией.",
      ro: "Roboți de bucătărie Moulinex Masterchef Grande. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кухонные комбайны Moulinex Masterchef Grande. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Roboți de bucătărie Moulinex Masterchef Grande. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 749900,
    oldPriceMinor: 829900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "1500 Вт",
          ro: "1500 W",
        },
      },
      {
        label: {
          ru: "Чаша",
          ro: "Bol",
        },
        value: {
          ru: "6.7 л",
          ro: "6.7 l",
        },
      },
      {
        label: {
          ru: "Литой металлический корпус",
          ro: "Corp metalic",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000092",
    slug: "philips-daily-hd2581-00",
    categoryId: "10000000-0000-4000-8000-000000000014",
    brand: "Philips",
    model: "Daily HD2581/00",
    sku: "TS-TOA-0092",
    name: {
      ru: "Philips Daily HD2581/00",
      ro: "Philips Daily HD2581/00",
    },
    shortDescription: {
      ru: "Тостеры и ростеры Philips Daily HD2581/00. Надёжная техника с официальной гарантией.",
      ro: "Prăjitoare de pâine și roastere Philips Daily HD2581/00. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Тостеры и ростеры Philips Daily HD2581/00. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Prăjitoare de pâine și roastere Philips Daily HD2581/00. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 49900,
    oldPriceMinor: 59900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Отделения",
          ro: "Fante",
        },
        value: {
          ru: "2",
          ro: "2",
        },
      },
      {
        label: {
          ru: "Режимы обжарки",
          ro: "Trepte rumenire",
        },
        value: {
          ru: "8",
          ro: "8",
        },
      },
      {
        label: {
          ru: "Подставка для булочек",
          ro: "Grătar chifle",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000093",
    slug: "bosch-tat3a011",
    categoryId: "10000000-0000-4000-8000-000000000014",
    brand: "Bosch",
    model: "TAT3A011",
    sku: "TS-TOA-0093",
    name: {
      ru: "Bosch TAT3A011",
      ro: "Bosch TAT3A011",
    },
    shortDescription: {
      ru: "Тостеры и ростеры Bosch TAT3A011. Надёжная техника с официальной гарантией.",
      ro: "Prăjitoare de pâine și roastere Bosch TAT3A011. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Тостеры и ростеры Bosch TAT3A011. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Prăjitoare de pâine și roastere Bosch TAT3A011. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 64900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "980 Вт",
          ro: "980 W",
        },
      },
      {
        label: {
          ru: "Автоцентрирование тостов",
          ro: "Centrare automată",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "High Lift",
          ro: "High Lift",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000094",
    slug: "tefal-express-tt360130",
    categoryId: "10000000-0000-4000-8000-000000000014",
    brand: "Tefal",
    model: "Express TT360130",
    sku: "TS-TOA-0094",
    name: {
      ru: "Tefal Express TT360130",
      ro: "Tefal Express TT360130",
    },
    shortDescription: {
      ru: "Тостеры и ростеры Tefal Express TT360130. Надёжная техника с официальной гарантией.",
      ro: "Prăjitoare de pâine și roastere Tefal Express TT360130. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Тостеры и ростеры Tefal Express TT360130. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Prăjitoare de pâine și roastere Tefal Express TT360130. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 79900,
    oldPriceMinor: 89900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Корпус из нержавеющей стали",
          ro: "Carcasă inox",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Разморозка и подогрев",
          ro: "Dezghețare & reîncălzire",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "850 Вт",
          ro: "850 W",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000095",
    slug: "braun-purease-ht3010bk",
    categoryId: "10000000-0000-4000-8000-000000000014",
    brand: "Braun",
    model: "PurEase HT3010BK",
    sku: "TS-TOA-0095",
    name: {
      ru: "Braun PurEase HT3010BK",
      ro: "Braun PurEase HT3010BK",
    },
    shortDescription: {
      ru: "Тостеры и ростеры Braun PurEase HT3010BK. Надёжная техника с официальной гарантией.",
      ro: "Prăjitoare de pâine și roastere Braun PurEase HT3010BK. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Тостеры и ростеры Braun PurEase HT3010BK. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Prăjitoare de pâine și roastere Braun PurEase HT3010BK. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 84900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Широкие слоты",
          ro: "Fante late",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Съемный поддон для крошек",
          ro: "Tăviță firimituri",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "1000 Вт",
          ro: "1000 W",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000096",
    slug: "gorenje-t850bk",
    categoryId: "10000000-0000-4000-8000-000000000014",
    brand: "Gorenje",
    model: "T850BK",
    sku: "TS-TOA-0096",
    name: {
      ru: "Gorenje T850BK",
      ro: "Gorenje T850BK",
    },
    shortDescription: {
      ru: "Тостеры и ростеры Gorenje T850BK. Надёжная техника с официальной гарантией.",
      ro: "Prăjitoare de pâine și roastere Gorenje T850BK. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Тостеры и ростеры Gorenje T850BK. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Prăjitoare de pâine și roastere Gorenje T850BK. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 59900,
    oldPriceMinor: 67900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "850 Вт",
          ro: "850 W",
        },
      },
      {
        label: {
          ru: "Подсветка кнопок",
          ro: "Butoane iluminate",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Степени поджаривания",
          ro: "Niveluri prăjire",
        },
        value: {
          ru: "7",
          ro: "7",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000097",
    slug: "russell hobbs-23330-56",
    categoryId: "10000000-0000-4000-8000-000000000014",
    brand: "Russell Hobbs",
    model: "23330-56",
    sku: "TS-TOA-0097",
    name: {
      ru: "Russell Hobbs 23330-56",
      ro: "Russell Hobbs 23330-56",
    },
    shortDescription: {
      ru: "Тостеры и ростеры Russell Hobbs 23330-56. Надёжная техника с официальной гарантией.",
      ro: "Prăjitoare de pâine și roastere Russell Hobbs 23330-56. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Тостеры и ростеры Russell Hobbs 23330-56. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Prăjitoare de pâine și roastere Russell Hobbs 23330-56. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 69900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Технология Lift & Look",
          ro: "Lift & Look",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Быстрое поджаривание",
          ro: "Prăjire rapidă",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "1100 Вт",
          ro: "1100 W",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000098",
    slug: "scarlett-sc-tm11018",
    categoryId: "10000000-0000-4000-8000-000000000014",
    brand: "Scarlett",
    model: "SC-TM11018",
    sku: "TS-TOA-0098",
    name: {
      ru: "Scarlett SC-TM11018",
      ro: "Scarlett SC-TM11018",
    },
    shortDescription: {
      ru: "Тостеры и ростеры Scarlett SC-TM11018. Надёжная техника с официальной гарантией.",
      ro: "Prăjitoare de pâine și roastere Scarlett SC-TM11018. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Тостеры и ростеры Scarlett SC-TM11018. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Prăjitoare de pâine și roastere Scarlett SC-TM11018. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 34900,
    oldPriceMinor: 39900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Отделения",
          ro: "Fante",
        },
        value: {
          ru: "2",
          ro: "2",
        },
      },
      {
        label: {
          ru: "Регулировка степени поджарки",
          ro: "Control rumenire",
        },
        value: {
          ru: "6 режимов",
          ro: "6 trepte",
        },
      },
      {
        label: {
          ru: "Мощность",
          ro: "Putere",
        },
        value: {
          ru: "700 Вт",
          ro: "700 W",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000099",
    slug: "cooper&hunter-ch-s09ftxla",
    categoryId: "10000000-0000-4000-8000-000000000015",
    brand: "Cooper&Hunter",
    model: "CH-S09FTXLA",
    sku: "TS-AIR-0099",
    name: {
      ru: "Cooper&Hunter CH-S09FTXLA",
      ro: "Cooper&Hunter CH-S09FTXLA",
    },
    shortDescription: {
      ru: "Кондиционеры Cooper&Hunter CH-S09FTXLA. Надёжная техника с официальной гарантией.",
      ro: "Aparate de aer condiționat Cooper&Hunter CH-S09FTXLA. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кондиционеры Cooper&Hunter CH-S09FTXLA. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aparate de aer condiționat Cooper&Hunter CH-S09FTXLA. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 949900,
    oldPriceMinor: 1049900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Площадь помещения",
          ro: "Suprafață",
        },
        value: {
          ru: "до 25 м²",
          ro: "până la 25 m²",
        },
      },
      {
        label: {
          ru: "Инверторный компрессор",
          ro: "Compresor inverter",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Обогрев до",
          ro: "Încălzire până la",
        },
        value: {
          ru: "-25°C",
          ro: "-25°C",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000100",
    slug: "gree-bora-gwh09aab",
    categoryId: "10000000-0000-4000-8000-000000000015",
    brand: "Gree",
    model: "Bora GWH09AAB",
    sku: "TS-AIR-0100",
    name: {
      ru: "Gree Bora GWH09AAB",
      ro: "Gree Bora GWH09AAB",
    },
    shortDescription: {
      ru: "Кондиционеры Gree Bora GWH09AAB. Надёжная техника с официальной гарантией.",
      ro: "Aparate de aer condiționat Gree Bora GWH09AAB. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кондиционеры Gree Bora GWH09AAB. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aparate de aer condiționat Gree Bora GWH09AAB. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 829900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Площадь помещения",
          ro: "Suprafață",
        },
        value: {
          ru: "до 25 м²",
          ro: "până la 25 m²",
        },
      },
      {
        label: {
          ru: "Холодопроизводительность",
          ro: "Capacitate răcire",
        },
        value: {
          ru: "9000 BTU",
          ro: "9000 BTU",
        },
      },
      {
        label: {
          ru: "Самоочистка",
          ro: "Autocurățare",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000101",
    slug: "midea-forest-af-09n8d6",
    categoryId: "10000000-0000-4000-8000-000000000015",
    brand: "Midea",
    model: "Forest AF-09N8D6",
    sku: "TS-AIR-0101",
    name: {
      ru: "Midea Forest AF-09N8D6",
      ro: "Midea Forest AF-09N8D6",
    },
    shortDescription: {
      ru: "Кондиционеры Midea Forest AF-09N8D6. Надёжная техника с официальной гарантией.",
      ro: "Aparate de aer condiționat Midea Forest AF-09N8D6. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кондиционеры Midea Forest AF-09N8D6. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aparate de aer condiționat Midea Forest AF-09N8D6. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 789900,
    oldPriceMinor: 859900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Инвертор",
          ro: "Inverter",
        },
        value: {
          ru: "Quattro",
          ro: "Quattro",
        },
      },
      {
        label: {
          ru: "Wi-Fi Ready",
          ro: "Wi-Fi Ready",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Класс энергоэффективности",
          ro: "Clasă eficiență",
        },
        value: {
          ru: "A++",
          ro: "A++",
        },
      },
    ],
    imageTone: "yellow",
  },
  {
    id: "20000000-0000-4000-8000-000000000102",
    slug: "aux-freedom-aux-09fh",
    categoryId: "10000000-0000-4000-8000-000000000015",
    brand: "AUX",
    model: "Freedom AUX-09FH",
    sku: "TS-AIR-0102",
    name: {
      ru: "AUX Freedom AUX-09FH",
      ro: "AUX Freedom AUX-09FH",
    },
    shortDescription: {
      ru: "Кондиционеры AUX Freedom AUX-09FH. Надёжная техника с официальной гарантией.",
      ro: "Aparate de aer condiționat AUX Freedom AUX-09FH. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кондиционеры AUX Freedom AUX-09FH. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aparate de aer condiționat AUX Freedom AUX-09FH. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 649900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Площадь помещения",
          ro: "Suprafață",
        },
        value: {
          ru: "до 25 м²",
          ro: "până la 25 m²",
        },
      },
      {
        label: {
          ru: "Хладагент",
          ro: "Agent frigorific",
        },
        value: {
          ru: "R32",
          ro: "R32",
        },
      },
      {
        label: {
          ru: "Тихий режим",
          ro: "Mod silențios",
        },
        value: {
          ru: "24 дБ",
          ro: "24 dB",
        },
      },
    ],
    imageTone: "coral",
  },
  {
    id: "20000000-0000-4000-8000-000000000103",
    slug: "daikin-sensira-ftxf25d",
    categoryId: "10000000-0000-4000-8000-000000000015",
    brand: "Daikin",
    model: "Sensira FTXF25D",
    sku: "TS-AIR-0103",
    name: {
      ru: "Daikin Sensira FTXF25D",
      ro: "Daikin Sensira FTXF25D",
    },
    shortDescription: {
      ru: "Кондиционеры Daikin Sensira FTXF25D. Надёжная техника с официальной гарантией.",
      ro: "Aparate de aer condiționat Daikin Sensira FTXF25D. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кондиционеры Daikin Sensira FTXF25D. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aparate de aer condiționat Daikin Sensira FTXF25D. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1499900,
    oldPriceMinor: 1629900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Премиум инвертор",
          ro: "Inverter Premium",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Титано-апатитовый фильтр",
          ro: "Filtru apatit titan",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Класс энергопотребления",
          ro: "Clasă energetică",
        },
        value: {
          ru: "A++",
          ro: "A++",
        },
      },
    ],
    imageTone: "blue",
  },
  {
    id: "20000000-0000-4000-8000-000000000104",
    slug: "mitsubishi heavy-srk20zsp-s",
    categoryId: "10000000-0000-4000-8000-000000000015",
    brand: "Mitsubishi Heavy",
    model: "SRK20ZSP-S",
    sku: "TS-AIR-0104",
    name: {
      ru: "Mitsubishi Heavy SRK20ZSP-S",
      ro: "Mitsubishi Heavy SRK20ZSP-S",
    },
    shortDescription: {
      ru: "Кондиционеры Mitsubishi Heavy SRK20ZSP-S. Надёжная техника с официальной гарантией.",
      ro: "Aparate de aer condiționat Mitsubishi Heavy SRK20ZSP-S. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кондиционеры Mitsubishi Heavy SRK20ZSP-S. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aparate de aer condiționat Mitsubishi Heavy SRK20ZSP-S. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 1349900,
    oldPriceMinor: 1479900,
    stockStatus: "in_stock",
    isNew: true,
    specifications: [
      {
        label: {
          ru: "Японское качество",
          ro: "Calitate japoneză",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Уровень шума",
          ro: "Nivel zgomot",
        },
        value: {
          ru: "19 дБ",
          ro: "19 dB",
        },
      },
      {
        label: {
          ru: "Площадь помещения",
          ro: "Suprafață",
        },
        value: {
          ru: "до 20 м²",
          ro: "până la 20 m²",
        },
      },
    ],
    imageTone: "mint",
  },
  {
    id: "20000000-0000-4000-8000-000000000105",
    slug: "tcl-tac-09chsd",
    categoryId: "10000000-0000-4000-8000-000000000015",
    brand: "TCL",
    model: "TAC-09CHSD",
    sku: "TS-AIR-0105",
    name: {
      ru: "TCL TAC-09CHSD",
      ro: "TCL TAC-09CHSD",
    },
    shortDescription: {
      ru: "Кондиционеры TCL TAC-09CHSD. Надёжная техника с официальной гарантией.",
      ro: "Aparate de aer condiționat TCL TAC-09CHSD. Electrocasnice fiabile cu garanție oficială.",
    },
    description: {
      ru: "Кондиционеры TCL TAC-09CHSD. Высокое качество, современный дизайн и гарантия качества от Tehnosklad. Доставка по Комрату и югу Молдовы.",
      ro: "Aparate de aer condiționat TCL TAC-09CHSD. Calitate înaltă, design modern și garanție de la Tehnosklad. Livrare în Comrat și sudul Moldovei.",
    },
    priceMinor: 619900,
    stockStatus: "in_stock",
    isNew: false,
    specifications: [
      {
        label: {
          ru: "Площадь",
          ro: "Suprafață",
        },
        value: {
          ru: "до 25 м²",
          ro: "până la 25 m²",
        },
      },
      {
        label: {
          ru: "Скрытый LED дисплей",
          ro: "Afișaj LED ascuns",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
      {
        label: {
          ru: "Режим I Feel",
          ro: "Regim I Feel",
        },
        value: {
          ru: "Да",
          ro: "Da",
        },
      },
    ],
    imageTone: "yellow",
  },
];
