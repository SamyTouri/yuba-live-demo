/* ============================================================
   Yuba Live — jeu de données de démonstration
   3 campagnes fictives calibrées sur les supports réels Yuba.
   Les dates sont relatives au jour de consultation : la campagne
   est toujours « en cours » quand on ouvre la page.

   Conventions de cohérence (à respecter en cas de retouche) :
   - spark = valeurs JOURNALIÈRES du KPI : [J1 … J-1, today]
     → somme des points passés = base ; dernier point = today.
   - delta (%) = today vs avant-dernier point du spark (J-1).
   - statLabel des équipes ≈ base + 50 % de today (valeur plausible
     en milieu de journée), sommé sur les équipes concernées.
   ============================================================ */

const YUBA_DATA = {

  defaultCampaign: "croixrouge",

  campaigns: {

    /* ---------- A. Croix-Rouge — vélos-taxis don de sang ---------- */
    croixrouge: {
      id: "croixrouge",
      meta: {
        client: "Croix-Rouge de Belgique",
        shortLabel: "Croix-Rouge",
        name: "En selle pour le don de sang",
        totalDays: 5,
        currentDay: 4,
        zones: ["Namur", "Bruxelles"],
        supports: ["3 vélos-taxis Yokler", "2 équipes flyers"],
        story: { kpi: "transported", mult: 3, label: "vies potentiellement aidées", note: "un don peut aider jusqu’à 3 personnes" }
      },
      kpis: [
        { id: "transported",   label: "Personnes transportées",  icon: "taxi", base: 131,  today: 53,   decimals: 0, unit: "",   delta: 8,
          spark: [38, 44, 49, 53] },
        { id: "flyers",        label: "Flyers distribués",        icon: "flyer", base: 4950, today: 1620, decimals: 0, unit: "",  delta: -4,
          spark: [1580, 1680, 1690, 1620] },
        { id: "conversations", label: "Conversations engagées",   icon: "chat", base: 142,  today: 45,   decimals: 0, unit: "",   delta: 12,
          spark: [50, 52, 40, 45] },
        { id: "km",            label: "Kilomètres parcourus",     icon: "road", base: 318,  today: 94,   decimals: 0, unit: "km", delta: -11,
          spark: [100, 112, 106, 94] }
      ],
      primary: { kpiId: "transported", label: "personnes transportées / jour" },
      activity: { kpiIds: ["flyers", "conversations", "transported"], tooltipLabel: "actions enregistrées" },
      dailyPast: [38, 44, 49],
      hourly: [4, 6, 7, 8, 5, 4, 6, 8, 9, 8, 6, 3],
      repartition: {
        labels: ["Vélo-taxi Yokler", "Flyers"],
        values: [55, 45]
      },
      teams: [
        { id: "cr1", name: "Vélo-taxi 1", members: "Théo & Lina",   support: "Vélo-taxi Yokler", lat: 50.4674, lng: 4.8718, statLabel: "63 personnes transportées" },
        { id: "cr2", name: "Vélo-taxi 2", members: "Maxence",       support: "Vélo-taxi Yokler", lat: 50.4690, lng: 4.8622, statLabel: "51 personnes transportées" },
        { id: "cr3", name: "Vélo-taxi 3", members: "Aïcha & Roméo", support: "Vélo-taxi Yokler", lat: 50.8274, lng: 4.3722, statLabel: "44 personnes transportées" },
        { id: "cr4", name: "Équipe flyers Namur", members: "Camille & Noa", support: "Distribution flyers", lat: 50.4642, lng: 4.8675, statLabel: "3 060 flyers distribués" },
        { id: "cr5", name: "Équipe flyers Bruxelles", members: "Jules & Emma", support: "Distribution flyers", lat: 50.8455, lng: 4.3571, statLabel: "2 700 flyers distribués" }
      ],
      feedPool: [
        { agent: "Théo",    teamId: "cr1", type: "voice", duration: "0:23", chips: { transported: 2, km: 3.8 }, place: "Namur centre", quote: "Deux donneurs déposés au centre, super ambiance là-bas." },
        { agent: "Camille", teamId: "cr4", type: "voice", duration: "0:31", chips: { flyers: 140, conversations: 9 }, place: "Piétonnier Namur", quote: "Beaucoup de questions sur les conditions pour donner." },
        { agent: "Aïcha",   teamId: "cr3", type: "voice", duration: "0:26", chips: { transported: 3, km: 5.1 }, place: "Flagey" },
        { agent: "Jules",   teamId: "cr5", type: "voice", duration: "0:19", chips: { flyers: 110, conversations: 6 }, place: "Gare Centrale" },
        { agent: "Maxence", teamId: "cr2", type: "voice", duration: "0:22", chips: { transported: 2, km: 4.4 }, place: "Gare de Namur" },
        { agent: "Emma",    teamId: "cr5", type: "photo", photoLabel: "Distribution devant la Gare Centrale" },
        { agent: "Noa",     teamId: "cr4", type: "voice", duration: "0:28", chips: { flyers: 165, conversations: 14 }, place: "Piétonnier Namur", quote: "Un monsieur veut organiser une collecte dans son entreprise." },
        { agent: "Roméo",   teamId: "cr3", type: "voice", duration: "0:15", chips: { transported: 1, km: 2.6 }, place: "Flagey" },
        { agent: "Lina",    teamId: "cr1", type: "voice", duration: "0:17", chips: { transported: 1, km: 2.1 }, place: "Namur centre" },
        { agent: "Lina",    teamId: "cr1", type: "photo", photoLabel: "Vélo-taxi Yokler place d’Armes" },
        { agent: "Théo",    teamId: "cr1", type: "voice", duration: "0:20", chips: { transported: 2, km: 3.2 }, place: "Namur centre" },
        { agent: "Camille", teamId: "cr4", type: "voice", duration: "0:24", chips: { flyers: 130, conversations: 11 }, place: "Namur centre" }
      ]
    },

    /* ---------- B. Visit Wallonia — screenbikes & LED ---------- */
    visitwallonia: {
      id: "visitwallonia",
      meta: {
        client: "Visit Wallonia",
        shortLabel: "Visit Wallonia",
        name: "La Wallonie s’affiche",
        totalDays: 10,
        currentDay: 7,
        zones: ["Namur", "Liège", "Mons"],
        supports: ["3 screenbikes", "1 remorque LED"],
        story: null
      },
      kpis: [
        { id: "visualContacts", label: "Contacts visuels estimés", icon: "eye",    base: 261000, today: 45000, decimals: 0, unit: "", delta: 8,
          spark: [40200, 42600, 44800, 46100, 45600, 41700, 45000] },
        { id: "screenHours",    label: "Heures d’affichage écran", icon: "screen", base: 110,    today: 21,    decimals: 1, unit: "h", delta: 5,
          spark: [16.5, 18, 19, 17, 19.5, 20, 21] },
        { id: "km",             label: "Kilomètres parcourus",     icon: "road",   base: 524,    today: 88,    decimals: 0, unit: "km", delta: -3,
          spark: [86, 89, 84, 88, 86, 91, 88] },
        { id: "qrScans",        label: "Scans du QR code",         icon: "qr",     base: 241,    today: 43,    decimals: 0, unit: "", delta: 11,
          spark: [35, 38, 42, 46, 41, 39, 43] }
      ],
      primary: { kpiId: "screenHours", label: "heures d’affichage / jour" },
      activity: { kpiIds: ["visualContacts"], tooltipLabel: "contacts visuels estimés" },
      dailyPast: [16.5, 18, 19, 17, 19.5, 20],
      hourly: [2, 4, 6, 7, 6, 5, 6, 8, 9, 9, 7, 4],
      repartition: {
        labels: ["Screenbike", "Remorque LED"],
        values: [68, 32]
      },
      teams: [
        { id: "vw1", name: "Screenbike Namur",  members: "Louis",         support: "Screenbike LED 55\"", lat: 50.4674, lng: 4.8718, statLabel: "31,2 h d’affichage" },
        { id: "vw2", name: "Screenbike Liège",  members: "Manon & Ilyes", support: "Screenbike LED 55\"", lat: 50.6244, lng: 5.5715, statLabel: "30,4 h d’affichage" },
        { id: "vw3", name: "Screenbike Mons",   members: "Zoé",           support: "Screenbike LED 55\"", lat: 50.4542, lng: 3.9523, statLabel: "28,7 h d’affichage" },
        { id: "vw4", name: "Remorque LED Liège", members: "Mehdi",        support: "Remorque LED",        lat: 50.6248, lng: 5.5668, statLabel: "30,2 h d’affichage" }
      ],
      feedPool: [
        { agent: "Louis", teamId: "vw1", type: "voice", duration: "0:21", chips: { screenHours: 1.5, km: 9.8 }, place: "Namur centre" },
        { agent: "Manon", teamId: "vw2", type: "voice", duration: "0:18", chips: { qrScans: 7 }, place: "Médiacité" },
        { agent: "Zoé",   teamId: "vw3", type: "voice", duration: "0:25", chips: { screenHours: 1.2, km: 7.4 }, place: "Grand-Place de Mons", quote: "Gros flux à midi, énormément de regards sur l’écran." },
        { agent: "Mehdi", teamId: "vw4", type: "voice", duration: "0:23", chips: { screenHours: 2, km: 3.1 }, place: "Guillemins" },
        { agent: "Ilyes", teamId: "vw2", type: "photo", photoLabel: "Screenbike devant la Médiacité" },
        { agent: "Louis", teamId: "vw1", type: "voice", duration: "0:19", chips: { qrScans: 4 }, place: "Namur centre" },
        { agent: "Zoé",   teamId: "vw3", type: "voice", duration: "0:17", chips: { qrScans: 6 }, place: "Grand-Place de Mons" },
        { agent: "Manon", teamId: "vw2", type: "voice", duration: "0:27", chips: { screenHours: 1.4, km: 8.9 }, place: "Médiacité", quote: "Batterie changée, on repart pour la boucle de l’après-midi." },
        { agent: "Mehdi", teamId: "vw4", type: "photo", photoLabel: "Remorque LED aux Guillemins" },
        { agent: "Louis", teamId: "vw1", type: "voice", duration: "0:24", chips: { screenHours: 1.6, km: 10.2 }, place: "Citadelle de Namur" }
      ]
    },

    /* ---------- C. Quick — ouverture Mons ---------- */
    quick: {
      id: "quick",
      meta: {
        client: "Quick Belgique",
        shortLabel: "Quick",
        name: "Ouverture Quick Mons Grand-Place",
        totalDays: 3,
        currentDay: 2,
        zones: ["Mons"],
        supports: ["8 jobistes", "Screenbags", "Chalk-tags"],
        story: null
      },
      kpis: [
        { id: "coupons",        label: "Bons de réduction distribués", icon: "flyer", base: 2490, today: 2935, decimals: 0, unit: "", delta: 18,
          spark: [2490, 2935] },
        { id: "conversations",  label: "Conversations engagées",       icon: "chat",  base: 143,  today: 173,  decimals: 0, unit: "", delta: 21,
          spark: [143, 173] },
        { id: "chalkTags",      label: "Chalk-tags posés",             icon: "spray", base: 8,    today: 10,   decimals: 0, unit: "", delta: 25,
          spark: [8, 10] },
        { id: "scannedCoupons", label: "Bons scannés en caisse",       icon: "scan",  base: 169,  today: 221,  decimals: 0, unit: "", delta: 31,
          spark: [169, 221] }
      ],
      primary: { kpiId: "coupons", label: "bons distribués / jour" },
      activity: { kpiIds: ["coupons", "conversations", "chalkTags", "scannedCoupons"], tooltipLabel: "actions enregistrées" },
      dailyPast: [2490],
      hourly: [3, 5, 8, 9, 7, 8, 9, 10, 9, 7, 5, 3],
      repartition: {
        labels: ["Flyers", "Screenbag", "Chalk-tag"],
        values: [52, 26, 22]
      },
      teams: [
        { id: "qk1", name: "Binôme Grand-Place", members: "Chloé & Adam",   support: "Flyers + screenbag", lat: 50.4542, lng: 3.9523, statLabel: "1 246 bons distribués" },
        { id: "qk2", name: "Binôme Gare",        members: "Inès & Nathan",  support: "Flyers",             lat: 50.4555, lng: 3.9398, statLabel: "1 041 bons distribués" },
        { id: "qk3", name: "Binôme Grands Prés", members: "Lucas & Yasmine", support: "Flyers + chalk-tag", lat: 50.4553, lng: 3.9330, statLabel: "1 112 bons distribués" },
        { id: "qk4", name: "Binôme rue de Nimy", members: "Elif & Tom",     support: "Flyers + screenbag", lat: 50.4570, lng: 3.9536, statLabel: "559 bons distribués" }
      ],
      feedPool: [
        { agent: "Chloé",   teamId: "qk1", type: "voice", duration: "0:22", chips: { coupons: 84, conversations: 15 }, place: "Grand-Place", quote: "Les bons -50 % partent tout seuls." },
        { agent: "Nathan",  teamId: "qk2", type: "voice", duration: "0:18", chips: { coupons: 67, conversations: 9 }, place: "Gare de Mons" },
        { agent: "Lucas",   teamId: "qk3", type: "voice", duration: "0:26", chips: { coupons: 92, conversations: 17 }, place: "Les Grands Prés" },
        { agent: "Yasmine", teamId: "qk3", type: "voice", duration: "0:15", chips: { chalkTags: 3 }, place: "Les Grands Prés" },
        { agent: "Elif",    teamId: "qk4", type: "voice", duration: "0:21", chips: { coupons: 58, conversations: 12 }, place: "Rue de Nimy" },
        { agent: "Tom",     teamId: "qk4", type: "photo", photoLabel: "Chalk-tag devant l’arrêt de bus" },
        { agent: "Inès",    teamId: "qk2", type: "voice", duration: "0:19", chips: { coupons: 73, conversations: 8 }, place: "Gare de Mons" },
        { agent: "Adam",    teamId: "qk1", type: "voice", duration: "0:24", chips: { coupons: 88, conversations: 19 }, place: "Grand-Place", quote: "Deuxième jour et toujours la file devant le restaurant !" },
        { agent: "Lucas",   teamId: "qk3", type: "photo", photoLabel: "Screenbag en action aux Grands Prés" },
        { agent: "Chloé",   teamId: "qk1", type: "voice", duration: "0:17", chips: { coupons: 41, chalkTags: 2 }, place: "Grand-Place" }
      ]
    }
  },

  /* formats des chips extraites par l'IA, par identifiant de KPI */
  chipFormats: {
    transported:    v => `${v} personne${v > 1 ? "s" : ""} transportée${v > 1 ? "s" : ""}`,
    flyers:         v => `${v} flyers`,
    coupons:        v => `${v} bon${v > 1 ? "s" : ""}`,
    conversations:  v => `${v} conversation${v > 1 ? "s" : ""}`,
    km:             v => `${String(v).replace(".", ",")} km`,
    screenHours:    v => `${String(v).replace(".", ",")} h d’affichage`,
    qrScans:        v => `${v} scans QR`,
    chalkTags:      v => `${v} chalk-tag${v > 1 ? "s" : ""}`,
    scannedCoupons: v => `${v} bons scannés`,
    visualContacts: v => `${v} contacts`
  }
};

window.YUBA_DATA = YUBA_DATA;
