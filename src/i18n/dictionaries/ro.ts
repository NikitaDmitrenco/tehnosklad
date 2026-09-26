import type { Dictionary } from "@/i18n/types";

export const ro: Dictionary = {
  localeName: "Română",
  skipToContent: "Sari la conținut",
  navigationLabel: "Navigare principală",
  navigation: {
    home: "Acasă",
    catalog: "Catalog",
    contacts: "Contacte",
    catalogMenu: "Catalog",
    search: "Căutare",
  },
  actions: {
    call: "Sună",
    openCatalog: "Deschide catalogul",
    contact: "Contactează-ne",
    view: "Vezi",
    copy: "Copiază",
    copied: "Copiat",
    close: "Închide",
    reset: "Resetează",
    apply: "Arată produsele",
    menu: "Meniu",
    filters: "Filtre",
    back: "Înapoi",
    previous: "Înapoi",
    next: "Înainte",
  },
  common: {
    city: "mun. Comrat",
    address: "Adresă",
    phone: "Telefon",
    hours: "Program",
    openDays: "Marți–duminică",
    closed: "Luni — zi liberă",
    inStock: "În stoc",
    onOrder: "La comandă",
    outOfStock: "Nu este în stoc",
    demoNotice: "Date demonstrative pentru dezvoltare",
    mapPlaceholder: "Harta va fi adăugată înainte de lansare",
    breadcrumbsHome: "Acasă",
    noResults: "Nu s-a găsit nimic",
    results: "produse găsite",
    loading: "Se încarcă",
    error: "A apărut o eroare",
  },
  home: {
    eyebrow: "Magazin de electrocasnice în Comrat",
    title: "Electrocasnice care fac viața de acasă mai ușoară",
    description:
      "Alegeți electrocasnice practice și aflați detalii de la echipa magazinului prin telefon.",
    contactNote:
      "Sunați sau veniți în magazin — alegem tehnica potrivită pentru dumneavoastră.",
    categoriesTitle: "Alegeți categoria",
    categoriesDescription:
      "Trei categorii principale pentru casa dumneavoastră.",
    popularTitle: "Alegeri populare",
    popularDescription: "O selecție de produse populare din catalog.",
    benefitsTitle: "Simplu și practic",
    benefits: {
      location: {
        title: "Magazin în Comrat",
        text: "Ridicați electrocasnicele chiar în ziua achiziției — str. Victoriei, 97.",
      },
      choice: {
        title: "Alegem pe bugetul dumneavoastră",
        text: "Vă sfătuim la telefon și vă ajutăm să alegeți varianta potrivită pentru nevoile și bugetul dumneavoastră.",
      },
      prices: {
        title: "Prețuri corecte",
        text: "Prețul e vizibil direct în card — fără surprize la cumpărare.",
      },
      contact: {
        title: "Mereu la dispoziție",
        text: "Răspundem rapid, în programul magazinului.",
      },
    },
    contactTitle: "Contactele magazinului",
    contactDescription:
      "Sunați-ne sau vizitați magazinul la un moment potrivit.",
  },
  catalog: {
    title: "Catalog de electrocasnice",
    description:
      "Alegeți tehnica potrivită după categorie, marcă, preț și disponibilitate.",
    searchLabel: "Căutare în catalog",
    searchPlaceholder: "Nume sau marcă",
    category: "Categorie",
    allCategories: "Toate categoriile",
    brand: "Marcă",
    allBrands: "Toate mărcile",
    availability: "Disponibilitate",
    allAvailability: "Oricare",
    price: "Preț, MDL",
    priceFrom: "De la",
    priceTo: "Până la",
    sort: "Sortare",
    sortPopular: "Populare",
    sortNew: "Noutăți",
    sortPriceAsc: "Preț crescător",
    sortPriceDesc: "Preț descrescător",
    sortName: "După nume",
    mobileFilters: "Filtrele catalogului",
    emptyTitle: "Nu s-a găsit nimic",
    emptyText: "Încercați să schimbați căutarea sau să resetați filtrele.",
    pagination: "Paginile catalogului",
    page: "Pagina",
  },
  product: {
    category: "Categorie",
    brand: "Marcă",
    model: "Model",
    sku: "Cod articol",
    characteristics: "Caracteristici",
    description: "Descriere",
    similar: "Produse similare",
    discount: "Reducere",
    galleryLabel: "Galeria produsului",
    previousImage: "Imaginea anterioară",
    nextImage: "Imaginea următoare",
    contactTitle: "Aveți nevoie de ajutor?",
    contactText:
      "Sunați sau lăsați o cerere — un angajat al magazinului vă va contacta.",
  },
  contactModal: {
    title: "Contactează-ne",
    now: "Contactează-ne acum",
    request: "Lasă o cerere",
    phoneTitle: "Sună-ne",
    hoursTitle: "Program de lucru",
    formTitle: "Date pentru contact",
    name: "Numele dumneavoastră",
    phone: "Telefon",
    telegram: "Nume utilizator Telegram (opțional)",
    comment: "Comentariu (opțional)",
    consent:
      "Confirm că am luat cunoștință de informațiile privind prelucrarea datelor pentru a răspunde cererii:",
    submit: "Trimite cererea",
    sending: "Se trimite…",
    successTitle: "Cererea a fost trimisă cu succes",
    success: "Un angajat al magazinului vă va contacta.",
    genericError:
      "Cererea nu a putut fi salvată. Verificați conexiunea și încercați din nou.",
    rateLimited:
      "Au fost trimise prea multe cereri. Încercați din nou puțin mai târziu.",
    nameError: "Introduceți un nume între 2 și 100 de caractere",
    telegramError:
      "Introduceți un username Telegram între 5 și 32 de caractere",
    commentError: "Comentariul nu poate depăși 2000 de caractere",
    required: "Completați acest câmp",
    phoneError: "Introduceți un număr de telefon valid",
    consentError:
      "Confirmați că ați citit informațiile privind prelucrarea datelor",
  },
  assistant: {
    open: "Asistent pentru catalog",
    title: "Asistentul Tehnosklad",
    close: "Închide asistentul",
    placeholder: "De exemplu: am nevoie de frigider",
    send: "Întreabă",
    loading: "Căutăm în catalog…",
    retry: "Reîncearcă",
    cancel: "Anulează",
    clear: "Șterge",
    catalog: "Deschide catalogul",
    disclaimer:
      "Răspunsul este generat automat. Verificați disponibilitatea și condițiile la magazin.",
    unavailable:
      "Asistentul nu este disponibil acum. Deschideți catalogul sau sunați magazinul.",
    rateLimited: "Prea multe întrebări la rând. Încercați puțin mai târziu.",
    rateLimitedSeconds:
      "Prea multe întrebări la rând. Reîncercați peste {seconds} s.",
    fallback: "Sunt afișate rezultate din căutarea în catalog.",
    product: "Deschide produsul",
    welcome: "Bună! Vă ajut să găsiți tehnică din catalogul actual.",
    quickQuestions: [
      "Ce frigidere sunt în stoc?",
      "Ajută-mă să aleg un aspirator",
      "Unde se află magazinul?",
    ],
    leaveRequest: "Lasă o cerere",
  },
  contacts: {
    title: "Contacte",
    description: "Vizitați magazinul sau contactați-ne prin telefon.",
    mapTitle: "Cum ne găsiți",
    mapDescription: "Hartă interactivă OpenStreetMap cu locația magazinului.",
    mapMarkerLabel: "Tehnosklad — str. Victoriei 97, Comrat.",
    mapAccessibleLabel:
      "Harta locației magazinului Tehnosklad, strada Victoriei 97, Comrat",
    mapLink: "Deschide în hartă",
    mapLinkAccessibleLabel:
      "Deschide locația magazinului Tehnosklad în OpenStreetMap într-o filă nouă",
  },
  legal: {
    versionLabel: "Versiunea",
    effectiveDateLabel: "în vigoare din",
    effectiveDate: "6 august 2026",
    operatorIncompleteTitle:
      "Datele obligatorii ale operatorului nu sunt configurate",
    operatorIncompleteText:
      "Lansarea în production a formularului de cereri nu este permisă până la completarea denumirii juridice, IDNO, adresei juridice și a emailului pentru solicitările privind datele în setările de implementare. Datele cunoscute ale magazinului sunt prezentate mai jos fără a substitui datele juridice.",
    operatorTitle: "Operatorul și datele de contact",
    tradeNameLabel: "Denumirea comercială",
    operatorNameLabel: "Denumirea juridică",
    idnoLabel: "IDNO",
    legalAddressLabel: "Adresa juridică",
    privacyEmailLabel: "Email pentru solicitări privind datele",
    responsibleLabel: "Persoana responsabilă",
    storeContactLabel: "Contactele magazinului",
    privacyIntro:
      "Această politică explică ce date prelucrează site-ul Tehnosklad, de ce sunt necesare, cui pot fi transmise și cum vă puteți exercita drepturile.",
    privacySections: [
      {
        title: "1. Legislația aplicabilă și perioada de tranziție",
        paragraphs: [
          "Până la 22 august 2026 inclusiv, prelucrarea este reglementată de Legea Republicii Moldova nr. 133/2011 privind protecția datelor cu caracter personal. Legea nr. 195/2024 intră în vigoare la 23 august 2026 și înlocuiește Legea nr. 133/2011. Prezenta versiune ține cont de ambele regimuri și de principiile legalității, transparenței, reducerii la minimum a datelor, limitării stocării și securității.",
          "Dacă o cerință obligatorie a legii în vigoare diferă de această politică, se aplică legea. Politica nu limitează drepturile persoanei vizate.",
        ],
      },
      {
        title: "2. Ce date prelucrăm și de unde provin",
        paragraphs: [
          "Datele principale provin direct de la vizitator prin formularul de cerere sau asistentul AI. Datele administrative sunt create de proprietar la configurarea accesului și a catalogului.",
        ],
        items: [
          "Cererea: nume, telefon, username Telegram și comentariu opționale, produsul selectat, URL-ul și locul formularului, limba interfeței, data și ora, versiunea și identificatorul notificării afișate.",
          "Protecția împotriva abuzurilor: hash-uri HMAC ale adresei IP și telefonului, UUID-ul cererii, contoare și ferestre pentru limitarea frecvenței. Adresa IP integrală nu se păstrează în baza de cereri, dar Vercel și furnizorii de rețea o pot prelucra în jurnale tehnice.",
          "Asistentul AI: întrebarea și cel mult ultimele șase mesaje sunt transmise serverului și, numai dacă este configurat un furnizor AI extern, furnizorului respectiv. Textul conversației nu este stocat în Supabase; se păstrează UUID-ul cererii, limba, rezultatul, categoria furnizorului, intervalul duratei, indicatorul fallback și numărul de referințe la produse.",
          "Administratorii: emailul și datele tehnice ale sesiunii Supabase Auth, rolul și statutul profilului; imaginile încărcate pentru produse/categorii, numele fișierelor, MIME, dimensiunea, căile și textele alternative RU/RO.",
          "Harta: la încărcarea iframe-ului OpenStreetMap, furnizorul primește datele tehnice obișnuite ale solicitării HTTP, inclusiv IP, User-Agent, ora și un referrer limitat.",
        ],
      },
      {
        title: "3. Scopuri și temeiuri juridice",
        paragraphs: [
          "Numele și telefonul sunt folosite pentru a răspunde solicitării, a clarifica produsul și a lua măsuri la cererea utilizatorului înaintea unei posibile achiziții: art. 5 alin. (5) lit. a) din Legea nr. 133/2011, iar din 23 august 2026 — temeiul contractual/precontractual din art. 6 al Legii nr. 195/2024. Bifa confirmă luarea la cunoștință a informării, dar nu înlocuiește acest temei cu consimțământul.",
        ],
        items: [
          "Username-ul Telegram și comentariul opționale sunt prelucrate pentru modalitatea și conținutul răspunsului alese de utilizator, în baza aceluiași temei.",
          "Idempotency, anti-spam, rate limiting, jurnalele de livrare și securitate sunt necesare pentru protejarea site-ului, a solicitanților și pentru demonstrabilitatea prelucrării — interes legitim cu respectarea echilibrului drepturilor; după caz, și obligație legală ori apărarea pretențiilor.",
          "Datele administratorilor sunt necesare pentru administrarea accesului și securitate — executarea relațiilor contractuale, interese legitime și obligațiile aplicabile operatorului.",
          "Proiectul nu include newslettere de marketing sau profilare publicitară separată. Datele cererilor nu trebuie folosite pentru publicitate fără un temei distinct și adecvat.",
        ],
      },
      {
        title: "4. Date obligatorii și opționale",
        paragraphs: [
          "Pentru răspuns sunt necesare numele, telefonul și confirmarea informării. Fără acestea cererea nu se trimite. Username-ul Telegram și comentariul sunt opționale. Produsul selectat se salvează numai când cererea pornește din contextul unui produs. Nu introduceți în comentariu sau chat date speciale, acte, date de plată ori informații inutile despre alte persoane.",
        ],
      },
      {
        title: "5. Destinatari, furnizori și transferuri transfrontaliere",
        paragraphs: [
          "În cadrul magazinului au acces numai administratorii autorizați, în măsura necesară pentru răspuns și gestionarea cererii. În funcție de configurație sunt utilizați următorii furnizori:",
        ],
        items: [
          "Supabase — baza de date, Auth și Storage; Vercel — hosting, rețea și jurnale tehnice; Telegram — livrarea conținutului cererii în chatul configurat al magazinului.",
          "Furnizorul AI compatibil OpenAI configurat de proprietar — numai întrebarea utilizatorului și contextul limitat al catalogului publicat; în modul fallback nu are loc transmiterea către AI extern.",
          "OpenStreetMap — harta interactivă de pe pagina de contacte. În versiunea curentă nu sunt conectate servicii de analiză.",
          "Furnizorii pot prelucra date în afara Moldovei. Înainte de transfer, operatorul trebuie să verifice contractele, statele și subîmputerniciții reali și să aplice un mecanism permis: decizie de adecvare, clauze standard aprobate/alte garanții adecvate sau o derogare aplicabilă. Fără această verificare, integrarea production respectivă trebuie dezactivată.",
        ],
      },
      {
        title: "6. Perioade de păstrare",
        paragraphs: [
          "Perioada se limitează la necesitatea scopului indicat; păstrarea mai lungă este permisă numai pentru o obligație legală concretă sau pentru constatarea, exercitarea ori apărarea unui drept.",
        ],
        items: [
          "Cererile, istoricul statuturilor, instantaneul produsului și jurnalele Telegram delivery/attempt — cel mult 24 de luni de la crearea cererii, apoi ștergere sau anonimizare ireversibilă.",
          "Înregistrările lead rate-limit — până la sfârșitul ferestrei (15 minute sau 1 oră) și curățarea tehnică, cel mult 24 de ore. Înregistrarea assistant rate-limit — aproximativ un minut și până la următoarea curățare.",
          "Jurnalele tehnice AI fără textul conversației — 90 de zile. Jurnalele runtime/security Vercel și ale aplicației — țintă de cel mult 30 de zile, dacă un incident confirmat nu necesită o perioadă mai lungă.",
          "Conturile administratorilor — cât timp accesul este activ; după dezactivare, identificatorul și auditul necesar al accesului — până la 12 luni, dacă legea sau investigarea unui incident nu impune altfel.",
          "Imaginile și metadatele catalogului — cât timp materialul este publicat sau necesar pentru istoricul catalogului; datele personale nu trebuie încărcate în Storage-ul public.",
        ],
      },
      {
        title: "7. Drepturi și modalitatea de adresare",
        paragraphs: [
          "Puteți solicita informare și acces, sursa și destinatarii, rectificare, ștergere în cazurile aplicabile, restricționare, opoziție, portabilitate după intrarea în vigoare a noii legi și retragerea consimțământului pentru operațiunile distincte bazate efectiv pe consimțământ. Retragerea nu afectează legalitatea prelucrării anterioare și nici prelucrarea bazată pe alt temei legal.",
          "Solicitarea se trimite la emailul operatorului indicat mai sus sau în scris la adresa juridică, cu suficiente date pentru identificarea cererii. Operatorul poate cere o dovadă proporțională a identității. Până la 23 august 2026 răspunsul se oferă fără întârziere nejustificată conform Legii nr. 133/2011; din acea dată — de regulă în termen de o lună, cu prelungirea permisă de lege și informarea motivelor. O plângere poate fi depusă la Centrul Național pentru Protecția Datelor cu Caracter Personal sau în instanță.",
        ],
      },
      {
        title: "8. Cookie, localStorage și harta externă",
        paragraphs: [
          "Vitrina publică nu setează cookie analitice sau publicitare. Limba este păstrată în URL (/ru sau /ro), nu în localStorage. Supabase Auth folosește cookie de sesiune necesare numai în zona administrativă. Widgetul AI păstrează istoricul doar în memoria paginii curente.",
          "Harta OpenStreetMap se încarcă lazy numai pe pagina de contacte. La încărcare, browserul se conectează la openstreetmap.org. Dacă nu doriți această conexiune, puteți evita aducerea hărții în zona vizibilă și folosi adresa/telefonul în text; linkul extern de rezervă se deschide numai prin acțiunea utilizatorului.",
        ],
      },
      {
        title: "9. Securitate și decizii automatizate",
        paragraphs: [
          "Sunt aplicate validare pe server, limite de dimensiune, verificări same-origin, honeypot, rate limiting, HMAC în locul IP-ului integral pentru limitări, idempotency, separarea rolurilor, RLS Supabase, secrete exclusiv pe server, jurnalizarea livrării fără body-ul răspunsului Telegram și verificarea fișierelor înainte de încărcare. Securitatea absolută nu poate fi garantată.",
          "Asistentul AI oferă răspunsuri informative despre catalog și nu ia decizii cu efect juridic sau similar semnificativ. Răspunsul trebuie confirmat la magazin.",
        ],
      },
      {
        title: "10. Minori și actualizarea politicii",
        paragraphs: [
          "Site-ul nu este destinat special colectării autonome a datelor copiilor. Minorii trebuie să se adreseze împreună cu un părinte sau reprezentant legal și să nu transmită date inutile. Datele copiilor obținute fără temei vor fi șterse dacă legea nu impune păstrarea.",
          "Modificările semnificative ale scopurilor, destinatarilor sau termenelor sunt publicate într-o versiune nouă, cu dată nouă. Versiunea informării afișate la cerere se păstrează ca identificator stabil; textul integral nu este duplicat în fiecare înregistrare.",
        ],
      },
    ],
    personalIntro:
      "Mai jos este descris procesul concret de prelucrare la trimiterea unei cereri și regulile care separă prelucrarea necesară a solicitării de scopurile opționale.",
    personalSections: [
      {
        title: "1. Ce se întâmplă la trimiterea cererii",
        paragraphs: [
          "Browserul transmite serverului numele, telefonul, username-ul Telegram și comentariul opționale, limba, sursa formularului, calea paginii și identificatorul produsului selectat. Serverul validează din nou câmpurile, normalizează telefonul și verifică origin-ul, dimensiunea body-ului, honeypot-ul și UUID-ul de idempotency.",
          "Supabase salvează atomic cererea, ora, limba, sursa, instantaneul produsului publicat și versiunea stabilă a informării. Pentru limitarea abuzurilor sunt stocate numai hash-uri HMAC ale adresei clientului și telefonului; IP-ul original nu este scris în tabelul cererilor.",
        ],
      },
      {
        title: "2. Confirmarea informării nu este consimțământ de marketing",
        paragraphs: [
          "Bifa este goală în mod implicit. Ea confirmă că utilizatorul a citit notificarea scurtă și această pagină. Prelucrarea necesară pentru răspuns se întemeiază pe măsurile efectuate la cererea utilizatorului înaintea unei posibile achiziții, nu pe un consimțământ impus. Nu există un consimțământ separat de marketing, deoarece site-ul nu efectuează newslettere de marketing.",
          "Fără nume și telefon magazinul nu poate răspunde; fără confirmarea informării formularul nu se trimite tehnic. Username-ul Telegram și comentariul sunt opționale.",
        ],
      },
      {
        title: "3. Livrare și acces",
        paragraphs: [
          "După salvare, serverul poate transmite conținutul cererii prin Telegram Bot API către chatul închis al magazinului. Rezultatul livrării este înregistrat separat; erorile incerte nu sunt retrimise automat. Administratorul autorizat vede cererea și istoricul statuturilor prin panoul administrativ protejat.",
          "Supabase, Vercel și Telegram sunt furnizori externi. Regiunile production, contractele și garanțiile transfrontaliere trebuie verificate de proprietar înainte de activarea formularului.",
        ],
      },
      {
        title: "4. Minimizare, termene și ștergere",
        paragraphs: [
          "Formularul nu solicită domiciliul, acte, date de plată sau data nașterii. Cererea și jurnalele asociate se păstrează cel mult 24 de luni. Înregistrările anti-spam de scurtă durată sunt curățate după ferestrele de limitare. Curățarea regulată trebuie executată cel puțin zilnic; excepția este permisă numai pentru o obligație legală concretă sau apărarea unui drept.",
        ],
      },
      {
        title: "5. Asistentul AI — flux separat",
        paragraphs: [
          "Chatul AI nu primește cererile și nu citește tabelul leads. Întrebarea este transmisă unui furnizor AI extern numai prin configurare explicită pe server; altfel funcționează fallback-ul local al catalogului. Întrebările și istoricul nu se păstrează în bază, dar utilizatorul nu trebuie să introducă date personale sau confidențiale. Jurnalul tehnic fără text se păstrează până la 90 de zile.",
        ],
      },
      {
        title: "6. Exercitarea drepturilor",
        paragraphs: [
          "Indicați numele, telefonul, data aproximativă și sursa cererii, pentru ca operatorul să găsească înregistrarea fără a colecta acte inutile. Solicitați acces, rectificare, ștergere sau restricționare prin emailul/adresa juridică a operatorului. Dacă problema nu este rezolvată, vă puteți adresa CNPDCP sau instanței. Contactele și termenele de răspuns sunt prevăzute în politica de confidențialitate.",
        ],
      },
    ],
    sourcesTitle: "Surse oficiale",
    sources: [
      {
        label: "Legea Republicii Moldova nr. 133/2011 (baza oficială legis.md)",
        url: "https://www.legis.md/cautare/downloadpdf/106573",
      },
      {
        label: "Legea nr. 195/2024 și data intrării în vigoare — CNPDCP",
        url: "https://datepersonale.md/legea-nr-195-2024-privind-protectia-datelor-cu-caracter-personal-principalele-prevederi-si-noutati-legislative/",
      },
      {
        label: "Drepturile persoanei vizate — CNPDCP",
        url: "https://datepersonale.md/data-subjects/right-of-the-data-subjects/",
      },
      {
        label: "Recomandări pentru operatori — CNPDCP",
        url: "https://datepersonale.md/data-controllers/ncpdp-guidelines/",
      },
    ],
    legalReviewNotice:
      "Această versiune verificată tehnic trebuie revizuită final de un jurist practician din Republica Moldova după completarea datelor operatorului și verificarea contractelor, regiunilor de stocare și subîmputerniciților reali ai furnizorilor.",
  },
  footer: {
    description: "O alegere practică de electrocasnice pentru casă în Comrat.",
    catalog: "Catalog",
    contacts: "Contacte",
    schedule: "Program",
    legal: "Informații",
    privacy: "Politica de confidențialitate",
    personalData: "Prelucrarea datelor cu caracter personal",
    rights: "Toate drepturile rezervate.",
    developedBy: "Dezvoltat de compania",
    osmiLinkLabel: "Site-ul companiei OSMI, se deschide într-o filă nouă",
  },
  notFound: {
    title: "Pagina nu a fost găsită",
    text: "Este posibil ca linkul să fie vechi sau pagina să nu existe.",
    back: "La pagina principală",
  },
  languageSwitcherLabel: "Selectarea limbii",
};
