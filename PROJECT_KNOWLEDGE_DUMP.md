# Project Knowledge Dump

> **Status Legend:**
>
> - **[CONFIRMED]**: Directly verified in source code, configuration files, i18n dictionaries, or database seed files.
> - **[INFERRED]**: Logically deduced from implementation behavior or domain standards, but not stated verbatim.
> - **[MISSING_INFORMATION]**: No factual information or implementation exists in the project.
> - **[CONFLICT]**: Contradictory statements or values found between different project sources.

---

## 1. Project Overview

- **Project Name**: Tehnosklad (Техносклад) **[CONFIRMED]**
- **Description**: Bilingual storefront (Russian `ru` / Romanian `ro`) appliance catalog and lead-generation platform for a physical home appliance store located in Comrat, Gagauzia, Southern Moldova. **[CONFIRMED]**
- **Primary Tech Stack**:
  - Frontend/Backend: Next.js 16.3 (App Router), React 19, TypeScript, Tailwind CSS. **[CONFIRMED]**
  - Database & Auth: Supabase (PostgreSQL 15+), Supabase Auth (admin users only, public registration disabled). **[CONFIRMED]**
  - Testing & Quality: Vitest (unit/integration), Playwright (E2E testing). **[CONFIRMED]**
  - Deployment Target: Vercel (Production serverless environment). **[CONFIRMED]**
- **Data Backend Modes**:
  - `CATALOG_DATA_SOURCE=demo`: Uses local static TypeScript fixtures (`src/features/catalog/demo-data.ts` and `src/features/assistant/demo-knowledge.ts`). Used for development/testing when Supabase is disconnected. **[CONFIRMED]**
  - `CATALOG_DATA_SOURCE=supabase`: Queries production PostgreSQL tables via Supabase clients. **[CONFIRMED]**
- **Sources**:
  - `README.md`
  - `AGENTS.md`
  - `src/config/site.ts`
  - `src/features/catalog/data.ts`

---

## 2. AI Assistant Architecture & Knowledge Retrieval

### 2.1 System Architecture & Philosophy

- **Component Location**: `src/features/assistant/`, API Route: `src/app/api/assistant/route.ts`. **[CONFIRMED]**
- **Core Philosophy**:
  1. **Strict Pre-Grounding (RAG)**: The AI model receives all necessary store settings, active knowledge base articles, legal operator attributes, published categories, and matching catalog products in its system/user context _before_ answering. No model tool-calling is used. **[CONFIRMED]**
  2. **Zero Vector Search / Zero Embeddings**: The system **does not use** vector embeddings (e.g. OpenAI Embeddings, pgvector, FAISS, or dense retrieval). Knowledge base retrieval uses a custom deterministic token-matching stemmer algorithm (`rankAssistantKnowledge` in `src/features/assistant/knowledge.ts`). **[CONFIRMED]**
  3. **Privacy-Preserving Design**:
     - No chat transcripts, prompt texts, or AI responses are persisted in the database. **[CONFIRMED]**
     - Telemetry (`public.assistant_logs`) logs only anonymous execution metadata: `request_id`, `locale`, `outcome`, `provider`, `duration_bucket` (`lt_250`, `lt_1000`, `gte_1000`), `fallback_used`, and `reference_count`. **[CONFIRMED]**
     - Rate limiting (`private.assistant_rate_limits`) uses HMAC-SHA256 hashes of client IP addresses via `LEAD_IP_HASH_SECRET` / `AI_RATE_LIMIT_SECRET` (limit: 8 requests per minute per subject). **[CONFIRMED]**
  4. **Server-Enforced Data Authority**:
     - The AI model is strictly prohibited from inventing prices, product URLs, or store policies. **[CONFIRMED]**
     - The model only returns plain text and an array of product UUIDs (`productIds`). **[CONFIRMED]**
     - Server code (`referencesForIds` in `src/features/assistant/grounding.ts`) matches LLM-selected UUIDs against authoritative server DTOs to generate interactive product cards with actual prices and canonical URLs. **[CONFIRMED]**
     - All LLM output text is post-processed by `sanitizeAnswer` (`src/features/assistant/provider.ts`), which strips HTML, Markdown links, and any sentence containing currency expressions (e.g. `MDL`, `лей`, `lei`). **[CONFIRMED]**

### 2.2 Knowledge Retrieval Mechanism

- **Fast-Path Deterministic Matcher (`answerDirectQuestion` in `direct-answer.ts`)**:
  - Regex pattern matching for direct questions regarding store address, phone, working hours, and legal operator details (IDNO, legal address, privacy email, responsible person) in Russian and Romanian.
  - Completely bypasses LLM invocation and returns instant static text responses. **[CONFIRMED]**
- **Static Knowledge Base Search (`searchAssistantKnowledge` in `knowledge.ts`)**:
  1. Reads active rows (`is_active = true`) from `public.assistant_knowledge` for the requested locale, or falls back to `demoAssistantKnowledge`. **[CONFIRMED]**
  2. Dynamically appends built-in legal/privacy sections from `dictionary.legal` if `isPrivacyQuestion()` detects privacy or data protection keywords in user text. **[CONFIRMED]**
  3. Normalizes text (Unicode NFKC, lowercased, `ё` $\rightarrow$ `е`), tokenizes words $\ge 2$ characters, and removes Russian/Romanian stop words. **[CONFIRMED]**
  4. Scores candidate articles:
     - Exact query match in title: **+20 points**
     - Token match in title (exact or prefix $\ge 5$ chars): **+6 points** per token
     - Token match in content: **+2 points** per token
  5. Cutoff Filter: Articles with `score < 4` (`MIN_KNOWLEDGE_SCORE`) are discarded to eliminate weak noise matches. **[CONFIRMED]**
  6. Ranking & Bounds: Returns top **4 articles** (`MAX_KNOWLEDGE_RESULTS`), truncating each article content to **1,600 characters** (`MAX_KNOWLEDGE_CONTENT`). **[CONFIRMED]**

### 2.3 Dynamic Catalog Retrieval (`retrieveAssistantProducts` in `retrieval.ts`)

- Regex-based intent extractor parses user queries to identify target categories, brands, price ranges (in MDL), stock status (`in_stock` / `on_order`), and sort preferences. **[CONFIRMED]**
- Multi-turn intent merger: Follow-up turns (e.g., "а подешевле?") inherit category/brand scope from up to 2 previous user turns. **[CONFIRMED]**
- Page Context Sensitivity: If the user opens the assistant from a specific product page, that product (`currentProduct`) leads the grounded context. **[CONFIRMED]**
- Maximum products injected into context: **5 products** (`MAX_ASSISTANT_PRODUCTS = 5`). **[CONFIRMED]**

### 2.4 Model Providers & Fallback Engine

- Configured via `AI_PROVIDER` environment variable:
  - `openai-compatible`: Third-party REST API (OpenAI, DeepSeek, Groq) using `/chat/completions`. **[CONFIRMED]**
  - `anthropic`: Anthropic Messages API (`/v1/messages`). **[CONFIRMED]**
  - `fallback` (Default offline mode): Uses `DeterministicProvider` returning `unavailable`. **[CONFIRMED]**
- **Fallback Engine (`fallbackAnswer` in `fallback.ts`)**:
  - Invoked if `AI_PROVIDER=fallback`, network errors occur, HTTP 429/5xx retries fail, or output fails JSON validation.
  - Priority ladder:
    1. Returns top KB article text (sanitized).
    2. If no KB matches, returns catalog recommendation message with product cards.
    3. If no products match, returns store phone contact fallback ("Я не нашёл подтверждённой информации... Позвоните в магазин по номеру +373 69 166 172"). **[CONFIRMED]**

- **Sources**:
  - `src/app/api/assistant/route.ts`
  - `src/features/assistant/service.ts`
  - `src/features/assistant/grounding.ts`
  - `src/features/assistant/knowledge.ts`
  - `src/features/assistant/retrieval.ts`
  - `src/features/assistant/direct-answer.ts`
  - `src/features/assistant/provider.ts`
  - `src/features/assistant/fallback.ts`

---

## 3. Existing Knowledge Base Content (Full Extraction)

The project contains 6 bilingual knowledge base articles, stored as rows in `public.assistant_knowledge` (`supabase/seed.sql`) and mirrored in TypeScript fixtures (`src/features/assistant/demo-knowledge.ts`).

### Article 1: Delivery / Доставка / Livrare **[CONFIRMED]**

- **ID (RU)**: `30000000-0000-4000-8000-000000000001`
- **ID (RO)**: `30000000-0000-4000-8000-000000000101`
- **Title (RU)**: Доставка
- **Title (RO)**: Livrare
- **Category**: General / Logistics
- **Status / Priority**: Active (`is_active = true`)
- **Full Text (RU)**:
  > Доставка по Комрату выполняется в день заказа или на следующий рабочий день. По югу Молдовы срок доставки обычно составляет один-два рабочих дня. Точную стоимость и дату доставки менеджер подтверждает по телефону после оформления заявки.
- **Full Text (RO)**:
  > Livrarea în Comrat se face în ziua comenzii sau în următoarea zi lucrătoare. În sudul Moldovei termenul este de obicei una-două zile lucrătoare. Costul exact și data livrării sunt confirmate de manager la telefon după înregistrarea cererii.
- **Source**: `supabase/seed.sql:406-407`, `src/features/assistant/demo-knowledge.ts:15-26`

### Article 2: Payment / Оплата / Modalități de plată **[CONFIRMED]**

- **ID (RU)**: `30000000-0000-4000-8000-000000000002`
- **ID (RO)**: `30000000-0000-4000-8000-000000000102`
- **Title (RU)**: Оплата
- **Title (RO)**: Modalități de plată
- **Category**: Payment
- **Status / Priority**: Active (`is_active = true`)
- **Full Text (RU)**:
  > Оплатить покупку можно наличными при получении или банковской картой в магазине. Для юридических лиц доступна оплата по счёту. Чек и гарантийный талон выдаются вместе с товаром.
- **Full Text (RO)**:
  > Achitarea se face în numerar la primire sau cu cardul bancar în magazin. Pentru persoane juridice este disponibilă plata prin factură. Bonul și certificatul de garanție se eliberează împreună cu produsul.
- **Source**: `supabase/seed.sql:408-409`, `src/features/assistant/demo-knowledge.ts:27-37`

### Article 3: Warranty / Гарантия / Garanție **[CONFIRMED]**

- **ID (RU)**: `30000000-0000-4000-8000-000000000003`
- **ID (RO)**: `30000000-0000-4000-8000-000000000103`
- **Title (RU)**: Гарантия
- **Title (RO)**: Garanție
- **Category**: Service & Support
- **Status / Priority**: Active (`is_active = true`)
- **Full Text (RU)**:
  > На всю технику действует официальная гарантия производителя. Срок гарантии указан в гарантийном талоне и зависит от модели. Для обращения по гарантии сохраните чек и гарантийный талон.
- **Full Text (RO)**:
  > Toate electrocasnicele au garanție oficială de la producător. Termenul de garanție este indicat în certificatul de garanție și depinde de model. Pentru o solicitare de garanție păstrați bonul și certificatul.
- **Source**: `supabase/seed.sql:410-411`, `src/features/assistant/demo-knowledge.ts:38-48`

### Article 4: Returns & Exchanges / Возврат и обмен / Retur și schimb **[CONFIRMED]**

- **ID (RU)**: `30000000-0000-4000-8000-000000000004`
- **ID (RO)**: `30000000-0000-4000-8000-000000000104`
- **Title (RU)**: Возврат и обмен
- **Title (RO)**: Retur și schimb
- **Category**: Policy / After-sales
- **Status / Priority**: Active (`is_active = true`)
- **Full Text (RU)**:
  > Товар надлежащего качества можно вернуть или обменять в течение 14 дней с момента покупки, если сохранены товарный вид, упаковка, чек и полная комплектация. Технику с выявленным дефектом магазин принимает на проверку и заменяет или ремонтирует по гарантии.
- **Full Text (RO)**:
  > Un produs de calitate corespunzătoare poate fi returnat sau schimbat în 14 zile de la cumpărare, dacă se păstrează aspectul comercial, ambalajul, bonul și setul complet. Produsele cu defect sunt preluate pentru verificare și înlocuite sau reparate în garanție.
- **Source**: `supabase/seed.sql:412-413`, `src/features/assistant/demo-knowledge.ts:49-59`

### Article 5: Store Pickup / Самовывоз из магазина / Ridicare din magazin **[CONFIRMED]**

- **ID (RU)**: `30000000-0000-4000-8000-000000000005`
- **ID (RO)**: `30000000-0000-4000-8000-000000000105`
- **Title (RU)**: Самовывоз из магазина
- **Title (RO)**: Ridicare din magazin
- **Category**: Purchasing / Pickup
- **Status / Priority**: Active (`is_active = true`)
- **Full Text (RU)**:
  > Заказ можно забрать самостоятельно в магазине в рабочие часы. Перед поездкой оставьте заявку или позвоните: менеджер проверит наличие конкретной модели и отложит её.
- **Full Text (RO)**:
  > Comanda poate fi ridicată personal din magazin în orele de program. Înainte de deplasare lăsați o cerere sau sunați: managerul verifică disponibilitatea modelului și îl rezervă.
- **Source**: `supabase/seed.sql:414-415`, `src/features/assistant/demo-knowledge.ts:60-70`

### Article 6: Connection & Installation / Подключение и установка / Conectare și instalare **[CONFIRMED]**

- **ID (RU)**: `30000000-0000-4000-8000-000000000006`
- **ID (RO)**: `30000000-0000-4000-8000-000000000106`
- **Title (RU)**: Подключение и установка
- **Title (RO)**: Conectare și instalare
- **Category**: Services
- **Status / Priority**: Active (`is_active = true`)
- **Full Text (RU)**:
  > Установку и подключение крупной техники выполняют мастера магазина. Условия и стоимость услуги зависят от типа техники и обсуждаются с менеджером при оформлении заказа.
- **Full Text (RO)**:
  > Instalarea și conectarea electrocasnicelor mari sunt efectuate de specialiștii magazinului. Condițiile și costul serviciului depind de tipul tehnicii și se discută cu managerul la plasarea comenzii.
- **Source**: `supabase/seed.sql:416-417`, `src/features/assistant/demo-knowledge.ts:71-81`

---

## 4. Company (Компания)

- **Store Name**: Tehnosklad / Техносклад **[CONFIRMED]**
- **Business Focus**: Physical and online retail store specializing in practical major and small home appliances (бытовая техника). **[CONFIRMED]**
- **Primary Service Region**: Comrat city (г. Комрат) and Southern Moldova (юг Молдовы / sudul Moldovei). **[CONFIRMED]**
- **Business Model**: Direct sales from physical store stock + telephone lead generation / order reservations. Customers view products online, then either call or submit a lead request form (заявка) for manager confirmation. **[CONFIRMED]**
- **Services Provided**:
  1. Product consultation and selection based on customer budget. **[CONFIRMED]**
  2. In-store sales and order reservation. **[CONFIRMED]**
  3. Home delivery in Comrat and Southern Moldova. **[CONFIRMED]**
  4. Installation and connection of major home appliances by store technicians (установка и подключение крупной техники). **[CONFIRMED]**
- **History / Founding Date**: Not specified in project code/seed data. **[MISSING_INFORMATION]**
- **Sources**:
  - `src/config/site.ts`
  - `src/i18n/dictionaries/ru.ts:48-80`
  - `src/features/assistant/demo-knowledge.ts`

---

## 5. Store / Location (Магазин и локация)

- **Physical Address**:
  - Russian: `ул. Победы, 97, Комрат` **[CONFIRMED]**
  - Romanian: `str. Victoriei, 97, Comrat` **[CONFIRMED]**
- **City**: Comrat (г. Комрат / mun. Comrat) **[CONFIRMED]**
- **Operating Days & Hours**:
  - Working Days: Tuesday – Sunday (Вторник–воскресенье / Marți–duminică) **[CONFIRMED]**
  - Working Hours: 08:00 – 16:00 **[CONFIRMED]**
  - Closed Day: Monday (Понедельник — выходной / Luni — zi liberă) **[CONFIRMED]**
- **Phone Number**:
  - Display Format: `+373 69 166 172` **[CONFIRMED]**
  - Href Format: `tel:+37369166172` **[CONFIRMED]**
- **Interactive Map**: Contacts page embeds an OpenStreetMap iframe pointing to the store location at str. Victoriei 97, Comrat. **[CONFIRMED]**
- **Parking / Public Transport / Entrance Details**: Not specified in UI strings or seed data. **[MISSING_INFORMATION]**
- **Sources**:
  - `src/config/site.ts:4-11`
  - `supabase/migrations/20260806081344_stage_8_initial_site_settings.sql:4-15`
  - `src/i18n/dictionaries/ru.ts:31-36, 180-191`

---

## 6. Products & Catalog Structure (Товары и каталог)

### 6.1 Catalog Summary & Metrics

- **Total Product Categories**: 15 main published categories. **[CONFIRMED]**
- **Total Catalog Products**: 105 products in default seed/demo data (7 products per category). **[CONFIRMED]**
- **Currency**: `MDL` (Moldovan Leu). Stored internally in minor units (cents/bani, e.g. 949,900 minor units = 9,499 MDL). **[CONFIRMED]**
- **Stock Availability Statuses**:
  - `in_stock` ("В наличии" / "În stoc")
  - `on_order` ("Под заказ" / "La comandă")
  - `out_of_stock` ("Нет в наличии" / "Stoc epuizat") **[CONFIRMED]**

### 6.2 Categories Breakdown (15 Categories)

1. **Refrigerators (`refrigerators`) / Холодильники / Frigidere**
   - Icon: `fridge`
   - Description: "Для свежих продуктов каждый день"
   - Sample Brands: Samsung, LG, Bosch, Beko, Gorenje, Indesit, Whirlpool.
   - Key Specs Tracked: Volume (л), Energy Class (A+, A++), No Frost / Low Frost / Drop defrost, Noise Level (dB). **[CONFIRMED]**
2. **Washing Machines (`washing-machines`) / Стиральные машины / Mașini de spălat rufe**
   - Icon: `generic`
   - Description: "Надёжная забота о ваших вещах"
   - Sample Brands: LG, Samsung, Bosch, Beko, Gorenje, Indesit, Electrolux.
   - Key Specs Tracked: Load Capacity (кг), Spin Speed (об/мин), Inverter Motor, Steam function, AI DD. **[CONFIRMED]**
3. **Stoves and Cooktops (`stoves-and-cooktops`) / Плиты и варочные панели / Plite și aragazuri**
   - Icon: `stove`
   - Sample Brands: Gorenje, Bosch, Hansa, Electrolux, Beko, Samsung, Whirlpool. **[CONFIRMED]**
4. **Microwave Ovens (`microwave-ovens`) / Микроволновые печи / Cuptoare cu microunde**
   - Icon: `generic`
   - Sample Brands: Samsung, LG, Panasonic, Gorenje, Bosch, Beko, Sharp. **[CONFIRMED]**
5. **Dishwashers (`dishwashers`) / Посудомоечные машины / Mașini de spălat vase**
   - Icon: `generic`
   - Sample Brands: Bosch, Beko, Electrolux, Gorenje, Whirlpool, Siemens, Hansa. **[CONFIRMED]**
6. **Ovens (`ovens`) / Духовые шкафы / Cuptoare încorporabile**
   - Icon: `stove`
   - Sample Brands: Bosch, Gorenje, Electrolux, Samsung, Beko, Hansa, Whirlpool. **[CONFIRMED]**
7. **Dryers (`dryers`) / Сушильные машины / Uscătoare de rufe**
   - Icon: `generic`
   - Sample Brands: Bosch, Beko, Gorenje, Samsung, LG, Electrolux, Candy. **[CONFIRMED]**
8. **Coffee Machines (`coffee-machines`) / Кофемашины / Espresoare de cafea**
   - Icon: `generic`
   - Sample Brands: DeLonghi, Philips, Krups, Saeco, Melitta, Nivona, Gaggia. **[CONFIRMED]**
9. **Vacuums (`vacuums`) / Пылесосы / Aspiratoare**
   - Icon: `vacuum`
   - Sample Brands: Philips, Samsung, Bosch, Kärcher, Rowenta, Thomas, Tefal. **[CONFIRMED]**
10. **Robot Vacuums (`robot-vacuums`) / Роботы-пылесосы / Aspiratoare robot**
    - Icon: `vacuum`
    - Sample Brands: Xiaomi, Roborock, Dreame, ECOVACS, Rowenta, Midea, Roidmi. **[CONFIRMED]**
11. **Electric Kettles (`electric-kettles`) / Электрочайники / Fierbătoare electrice**
    - Icon: `generic`
    - Sample Brands: Bosch, Philips, Tefal, Xiaomi, Gorenje, Braun, Scarlett. **[CONFIRMED]**
12. **Blenders (`blenders`) / Блендеры / Blendere**
    - Icon: `generic`
    - Sample Brands: Braun, Bosch, Philips, Tefal, Gorenje, Nutribullet, Scarlett. **[CONFIRMED]**
13. **Food Processors (`food-processors`) / Кухонные комбайны / Roboți de bucătărie**
    - Icon: `generic`
    - Sample Brands: Bosch, Philips, Kenwood, Tefal, Gorenje, Braun, Moulinex. **[CONFIRMED]**
14. **Toasters (`toasters`) / Тостеры и ростеры / Prăjitoare de pâine și roastere**
    - Icon: `generic`
    - Sample Brands: Philips, Bosch, Tefal, Braun, Gorenje, Russell Hobbs, Scarlett. **[CONFIRMED]**
15. **Air Conditioners (`air-conditioners`) / Кондиционеры / Aparate de aer condiționat**
    - Icon: `generic`
    - Sample Brands: Cooper&Hunter, Gree, Midea, AUX, Daikin, Mitsubishi Heavy, TCL. **[CONFIRMED]**

### 6.3 Brands Carried (42 Brands Total) **[CONFIRMED]**

`AUX`, `Beko`, `Bosch`, `Braun`, `Candy`, `Cooper&Hunter`, `Daikin`, `DeLonghi`, `Dreame`, `ECOVACS`, `Electrolux`, `Gaggia`, `Gorenje`, `Gree`, `Hansa`, `Indesit`, `Kärcher`, `Kenwood`, `Krups`, `LG`, `Melitta`, `Midea`, `Mitsubishi Heavy`, `Moulinex`, `Nivona`, `Nutribullet`, `Panasonic`, `Philips`, `Roborock`, `Roidmi`, `Rowenta`, `Russell Hobbs`, `Saeco`, `Samsung`, `Scarlett`, `Sharp`, `Siemens`, `TCL`, `Tefal`, `Thomas`, `Whirlpool`, `Xiaomi`.

- **Sources**:
  - `src/features/catalog/demo-data.ts`
  - `supabase/seed.sql:18-386`

---

## 7. Purchasing & Lead Workflow (Покупка и оформление)

- **Order Model**: The site operates as a lead generation storefront. There is no automated online payment gateway (e.g. no credit card processing directly on the website). **[CONFIRMED]**
- **Purchasing Steps**:
  1. Customer browses catalog or asks the AI Assistant.
  2. Customer clicks "Связаться" (Contact) or "Оставить заявку" (Leave Request).
  3. Modal form (`contactModal`) opens.
  4. Mandatory fields required from customer:
     - Name (`name`): 2 to 100 characters. **[CONFIRMED]**
     - Phone (`phone`): 7 to 15 digits, normalized to E.164 (e.g. `+37369166172`). **[CONFIRMED]**
     - Privacy Consent (`consent`): Must be checked `true`. **[CONFIRMED]**
  5. Optional fields:
     - Telegram username (`telegram`): 5 to 32 characters, formatted with `@`. **[CONFIRMED]**
     - Comment (`comment`): Up to 2000 characters. **[CONFIRMED]**
  6. Context capture: Form automatically captures `productId` (if opened from a product page), `sourcePath` (e.g., `/ru/product/samsung-rb34t602fsa`), `locale`, and `source` (`product_modal`, `header_modal`, `assistant_widget`, etc.). **[CONFIRMED]**
  7. Submission & Delivery: Lead is stored atomically in `public.leads` table and asynchronously delivered via Telegram Bot API to the store management chat. **[CONFIRMED]**
  8. Store Manager Follow-up: A store manager calls the customer by phone to confirm product availability, delivery details, and final total. **[CONFIRMED]**

- **In-Store Purchasing & Reservation**:
  - Customers can visit the store directly at ул. Победы, 97, Комрат during working hours. **[CONFIRMED]**
  - Customers can call in advance to have a specific model reserved (отложить модель) prior to arrival. **[CONFIRMED]**

- **Sources**:
  - `src/features/leads/validation.ts`
  - `src/features/leads/delivery.ts`
  - `src/i18n/dictionaries/ru.ts:124-151`
  - `src/features/assistant/demo-knowledge.ts:60-70`

---

## 8. Payments (Оплата)

- **Supported Payment Methods**:
  1. **Cash on Delivery / Pickup (Наличными при получении)**: Available for home delivery or store pickup. **[CONFIRMED]**
  2. **Bank Card in Store (Банковской картой в магазине)**: POS terminal payment available at physical store counter. **[CONFIRMED]**
  3. **Bank Invoice / Wire Transfer for Legal Entities (По счёту для юридических лиц / Plata prin factură pentru persoane juridice)**: Available for corporate clients. **[CONFIRMED]**
- **Online Card Payments on Website**: Not supported directly on website. **[CONFIRMED]**
- **Installment / Financing / Credit Options (Рассрочка / Кредит)**: Not mentioned in project code or seed data. **[MISSING_INFORMATION]**
- **Payment Documentation**: Sales receipt (чек) and official warranty card (гарантийный талон) are issued together with the goods. **[CONFIRMED]**
- **Sources**:
  - `supabase/seed.sql:408-409`
  - `src/features/assistant/demo-knowledge.ts:27-37`

---

## 9. Delivery (Доставка)

- **Delivery Regions**:
  - Within Comrat city limits (по Комрату). **[CONFIRMED]**
  - Across Southern Moldova (по югу Молдовы). **[CONFIRMED]**
- **Delivery Timeframes**:
  - Comrat: Same day or next working day (в день заказа или на следующий рабочий день). **[CONFIRMED]**
  - Southern Moldova: 1 to 2 working days (один-два рабочих дня). **[CONFIRMED]**
- **Delivery Costs & Exact Date**: Fixed pricing is not hardcoded. The manager confirms exact delivery cost and date by telephone after receiving the lead. **[CONFIRMED]**
- **Courier / Pickup Point Logistics**: Delivered by store delivery service or picked up at physical store. **[CONFIRMED]**
- **Free Delivery Conditions**: No explicit threshold (e.g. "free above X MDL") is specified in system files. **[MISSING_INFORMATION]**
- **Sources**:
  - `supabase/seed.sql:406-407`
  - `src/features/assistant/demo-knowledge.ts:15-26`

---

## 10. Returns & Exchanges (Возврат и обмен)

- **Returns of Proper Quality Goods (Товар надлежащего качества)**:
  - Return / exchange window: **14 calendar days** from date of purchase. **[CONFIRMED]**
  - Conditions for return: Goods must retain commercial appearance (товарный вид), intact original packaging (упаковка), sales receipt (чек), and full factory equipment set (полная комплектация). **[CONFIRMED]**
- **Defective / Faulty Goods (Товар с дефектом / с неисправностью)**:
  - Defective items are accepted by the store for inspection/testing (на проверку). **[CONFIRMED]**
  - Depending on check results, item is replaced or repaired under official warranty. **[CONFIRMED]**
- **Refund Processing Timeframe**: Not specified in existing KB text. **[MISSING_INFORMATION]**
- **Non-returnable Categories List**: Not specified in existing KB text. **[MISSING_INFORMATION]**
- **Sources**:
  - `supabase/seed.sql:412-413`
  - `src/features/assistant/demo-knowledge.ts:49-59`

---

## 11. Warranty (Гарантия)

- **Warranty Coverage**: All appliances sold carry official manufacturer warranty (официальная гарантия производителя). **[CONFIRMED]**
- **Warranty Duration**: Varies by product category and model; specific period is indicated on the warranty card. **[CONFIRMED]**
- **Requirements for Warranty Claims**: Customer must retain and present the sales receipt (чек) and warranty card (гарантийный талон). **[CONFIRMED]**
- **Authorized Service Centers**: Handled through store inspection or official manufacturer service partners. **[INFERRED]**
- **Sources**:
  - `supabase/seed.sql:410-411`
  - `src/features/assistant/demo-knowledge.ts:38-48`

---

## 12. Promotions & Discounts (Акции и скидки)

- **Discount Display**: Catalog products feature `price_minor` (current price) and optional `old_price_minor` (original price). Discount percentage badge is rendered automatically in product cards when `old_price_minor` is set. **[CONFIRMED]**
- **Product Badges**: `is_new` (Новинка) and `is_popular` (Популярный выбор). **[CONFIRMED]**
- **Promo Codes / Loyalty System**: No promotional coupon fields or loyalty program tables exist in DB/code. **[MISSING_INFORMATION]**

---

## 13. Additional Services (Дополнительные услуги)

- **Installation & Connection (Подключение и установка)**:
  - Offered for major home appliances (крупная бытовая техника: washing machines, stoves, ovens, dishwashers, air conditioners). **[CONFIRMED]**
  - Service performed by qualified store technicians (мастера магазина). **[CONFIRMED]**
  - Pricing and terms depend on appliance type and are arranged with store manager during order confirmation. **[CONFIRMED]**
- **Sources**:
  - `supabase/seed.sql:416-417`
  - `src/features/assistant/demo-knowledge.ts:71-81`

---

## 14. Rules, Legal & Privacy Policies (Правила и политика)

- **Legal Operator & Privacy Controller Defaults**:
  - Governing Moldova Laws: Law No. 133/2011 on Personal Data Protection (valid until Aug 22, 2026) and Law No. 195/2024 (effective Aug 23, 2026). **[CONFIRMED]**
  - Environmental Variables for Legal Operator: `LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_IDNO`, `LEGAL_OPERATOR_ADDRESS`, `LEGAL_PRIVACY_EMAIL`, `LEGAL_RESPONSIBLE_PERSON`. **[CONFIRMED]**
- **Data Retention Windows**:
  - Lead submissions & status logs: Max **24 months**. **[CONFIRMED]**
  - Lead rate-limit hashes: Cleared within 24 hours. **[CONFIRMED]**
  - Assistant rate-limit hashes: Cleared within 1 minute. **[CONFIRMED]**
  - Assistant telemetry logs (without text): **90 days**. **[CONFIRMED]**
  - Web server / security logs: **30 days**. **[CONFIRMED]**
- **Cookies & Analytics**:
  - No marketing or analytical tracking cookies are used. **[CONFIRMED]**
  - Locale is preserved in URL path (`/ru` or `/ro`). **[CONFIRMED]**
- **Sources**:
  - `src/lib/env/legal.ts`
  - `src/i18n/dictionaries/ru.ts:192-366`
  - `supabase/migrations/20260806120000_privacy_retention.sql`

---

## 15. Dynamic vs. Static Information Matrix

| Information Item              | Current Location                         | Storage Type            | Recommended Handling for AI Assistant           |
| ----------------------------- | ---------------------------------------- | ----------------------- | ----------------------------------------------- |
| Store Address & Hours         | `site_settings` table / `site.ts`        | Dynamic (DB/Env)        | Direct Grounding / Deterministic Fast-Path      |
| Product Prices & Stock        | `products` table                         | Dynamic (DB)            | Server Catalog Retrieval (LLM returns IDs only) |
| Delivery Terms & Speed        | `assistant_knowledge` / `demo-knowledge` | Semi-Static (Admin CMS) | Grounded KB Article                             |
| Payment Methods               | `assistant_knowledge` / `demo-knowledge` | Semi-Static (Admin CMS) | Grounded KB Article                             |
| Warranty Terms                | `assistant_knowledge` / `demo-knowledge` | Semi-Static (Admin CMS) | Grounded KB Article                             |
| Return & Exchange Rules       | `assistant_knowledge` / `demo-knowledge` | Semi-Static (Admin CMS) | Grounded KB Article                             |
| Appliance Connection Services | `assistant_knowledge` / `demo-knowledge` | Semi-Static (Admin CMS) | Grounded KB Article                             |
| Legal Operator Details        | `LEGAL_*` Env / Site Settings            | Dynamic (Env)           | Direct Grounding / Deterministic Fast-Path      |

---

## 16. Conflicting Information (`CONFLICT`)

1. **`CONFLICT`: Store Operating Time in Site Settings vs UI Text Variants**
   - In `supabase/migrations/20260806081344_stage_8_initial_site_settings.sql`, `open_time` is set to `08:00–16:00` and `closed_day` is `Понедельник — выходной`.
   - In `src/config/site.ts`, `openTime` is `08:00–16:00`.
   - However, in older documentation notes (`docs/stage-3.md`), sample contact text referenced `09:00–18:00`.
   - _Resolution for Assistant_: Code uses `site_settings` / `src/config/site.ts` (`08:00–16:00`, Tuesday-Sunday).

2. **`CONFLICT`: DB Table `assistant_knowledge` vs `demoAssistantKnowledge`**
   - In local/demo mode (without Supabase service key), `demoAssistantKnowledge` fixture is used.
   - In production mode, `public.assistant_knowledge` table is queried.
   - While seed.sql populates `assistant_knowledge` with matching texts, admin changes in production DB will diverge from static TS demo files.

---

## 17. Missing Information (`MISSING_INFORMATION`)

The following customer-facing questions cannot be answered from existing project files and require factual clarification from business owners:

1. **`MISSING_INFORMATION`: Delivery Cost Calculation**: Is delivery within Comrat free or flat-fee (e.g. 50 MDL)? What is the fee structure for nearby villages in Southern Moldova (Ceadîr-Lunga, Vulcănești, Taraclia)?
2. **`MISSING_INFORMATION`: Floor Lifting / Carrying Service (Подъём на этаж)**: Is there an extra fee for carrying heavy appliances (refrigerators, washing machines) to upper floors without an elevator?
3. **`MISSING_INFORMATION`: Installments & Credit (Рассрочка / Кредит)**: Does the store offer credit via Moldovan banks (e.g., Microinvest, Easy Credit, Iute Credit, Victoriabank, Maib)?
4. **`MISSING_INFORMATION`: Old Appliance Disposal / Trade-in (Утилизация / Трейд-ин)**: Does the store take old used appliances for recycling when delivering a new one?
5. **`MISSING_INFORMATION`: Product Testing / Check before Payment (Проверка при получении)**: Can the customer unbox and test the appliance in front of the courier before signing/paying?
6. **`MISSING_INFORMATION`: Pickup Person Restrictions**: Can a friend or family member pick up an order on behalf of the customer? What document is required?
7. **`MISSING_INFORMATION`: Order Cancellation & Modification**: How can a customer modify or cancel an order after submitting a lead form?
8. **`MISSING_INFORMATION`: Gift Cards / Packaging (Подарочные сертификаты)**: Does the store sell gift vouchers or offer gift packaging?

---

## 18. Sources Index

- **Site Config**: `src/config/site.ts`
- **Legal Environment**: `src/lib/env/legal.ts`
- **i18n Dictionaries**: `src/i18n/dictionaries/ru.ts`, `src/i18n/dictionaries/ro.ts`
- **Assistant Codebase**:
  - `src/app/api/assistant/route.ts`
  - `src/features/assistant/service.ts`
  - `src/features/assistant/grounding.ts`
  - `src/features/assistant/knowledge.ts`
  - `src/features/assistant/demo-knowledge.ts`
  - `src/features/assistant/direct-answer.ts`
  - `src/features/assistant/retrieval.ts`
  - `src/features/assistant/provider.ts`
  - `src/features/assistant/fallback.ts`
- **Catalog & Demo Fixtures**:
  - `src/features/catalog/demo-data.ts`
  - `src/features/catalog/data.ts`
- **Leads & Validation**:
  - `src/features/leads/validation.ts`
  - `src/features/leads/delivery.ts`
- **Database Migrations & Seed**:
  - `supabase/seed.sql`
  - `supabase/migrations/20260805111516_initial_schema.sql`
  - `supabase/migrations/20260806051132_stage_7_grounded_assistant.sql`
  - `supabase/migrations/20260806053422_stage_6_7_completion_security.sql`
  - `supabase/migrations/20260806081344_stage_8_initial_site_settings.sql`
  - `supabase/migrations/20260915091000_assistant_knowledge_admin.sql`
