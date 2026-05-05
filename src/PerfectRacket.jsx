import { useState, useEffect, useLayoutEffect, useRef } from "react";

// --- SCORING ENGINE -----------------------------------------------------------

const SETTINGS = {
  RA_ArmFriendly_Cutoff: 62,
  RA_HardGate_Cutoff: 66,
  HardGate_Severity: 6,
  HardGate_Penalty: 25,
  RiskWeight: 0.35,
  BlankRA_Default: 62,
  BlankSW_Default: 315,
  StringPoly_PainThreshold: 3,
  StringPoly_Penalty: 10,
  HighTension_PainThreshold: 3,
  HighTension_Penalty: 8,
  PlayFreq_InjuryMult: {
    "< 1x/wk": 0.80,
    "1-2x/wk": 1.00,
    "3-4x/wk": 1.15,
    "5+x/wk": 1.30,
  },
};

const PAIN_NUMERIC = {
  "No issues": 0,
  "Mild discomfort after playing": 3,
  "Pain during play but manageable": 6,
  "Severe pain that limits play": 9,
};

const RACQUET_DB = [
  // -- WILSON --
  { brand:"Wilson",     model:"RF 01 Pro",            headSize:98,  weight:320, balance:7,  swingWeight:325, mains:16, crosses:19, beamWidth:23, ra:65, length:27.0, price:349, armFriendly:false },
  { brand:"Wilson",     model:"RF 01",                headSize:98,  weight:300, balance:5,  swingWeight:315, mains:16, crosses:19, beamWidth:23, ra:64, length:27.0, price:329, armFriendly:false },
  { brand:"Wilson",     model:"RF 01 Future",          headSize:98,  weight:265, balance:4,  swingWeight:292, mains:16, crosses:19, beamWidth:22, ra:62, length:27.0, price:309, armFriendly:true  },
  { brand:"Wilson",     model:"Clash 100 v3",          headSize:100, weight:295, balance:6,  swingWeight:316, mains:16, crosses:19, beamWidth:24, ra:55, length:27.0, price:299, armFriendly:true  },
  { brand:"Wilson",     model:"Clash 100L v3",         headSize:100, weight:280, balance:6,  swingWeight:301, mains:16, crosses:19, beamWidth:25, ra:54, length:27.0, price:289, armFriendly:true  },
  { brand:"Wilson",     model:"Clash 100 Pro v3",      headSize:100, weight:303, balance:10, swingWeight:327, mains:16, crosses:20, beamWidth:25, ra:57, length:27.0, price:259, armFriendly:true  },
  { brand:"Wilson",     model:"Blade 98 16x19 v9",     headSize:98,  weight:305, balance:5,  swingWeight:323, mains:16, crosses:19, beamWidth:21, ra:62, length:27.0, price:269, armFriendly:true  },
  { brand:"Wilson",     model:"Blade 100 v9",          headSize:100, weight:300, balance:5,  swingWeight:318, mains:16, crosses:19, beamWidth:23, ra:62, length:27.0, price:269, armFriendly:true  },
  { brand:"Wilson",     model:"Blade 98 18x20 v9",     headSize:98,  weight:305, balance:4,  swingWeight:330, mains:18, crosses:20, beamWidth:21, ra:60, length:27.0, price:269, armFriendly:true  },
  { brand:"Wilson",     model:"Pro Staff 97 v14",      headSize:97,  weight:315, balance:3,  swingWeight:325, mains:16, crosses:19, beamWidth:21, ra:66, length:27.0, price:289, armFriendly:false },
  { brand:"Wilson",     model:"Ultra 100 v4",          headSize:100, weight:300, balance:6,  swingWeight:318, mains:16, crosses:19, beamWidth:26, ra:68, length:27.0, price:249, armFriendly:false },
  // -- HEAD --
  { brand:"HEAD",       model:"Speed Pro 2026",        headSize:100, weight:310, balance:3,  swingWeight:330, mains:18, crosses:20, beamWidth:23, ra:61, length:27.0, price:269, armFriendly:true  },
  { brand:"HEAD",       model:"Speed Tour 97 2026",    headSize:97,  weight:305, balance:4,  swingWeight:325, mains:16, crosses:19, beamWidth:23, ra:61, length:27.0, price:269, armFriendly:true  },
  { brand:"HEAD",       model:"Speed MP 2026",         headSize:100, weight:300, balance:4,  swingWeight:326, mains:16, crosses:19, beamWidth:23, ra:60, length:27.0, price:259, armFriendly:true  },
  { brand:"HEAD",       model:"Speed MP L 2026",       headSize:100, weight:280, balance:6,  swingWeight:298, mains:16, crosses:19, beamWidth:23, ra:60, length:27.0, price:249, armFriendly:true  },
  { brand:"HEAD",       model:"Speed MP UL 2026",       headSize:100, weight:265, balance:1,  swingWeight:293, mains:16, crosses:19, beamWidth:23, ra:63, length:27.0, price:249, armFriendly:false },
  { brand:"HEAD",       model:"Gravity MP 2025",       headSize:100, weight:295, balance:5,  swingWeight:318, mains:16, crosses:20, beamWidth:22, ra:58, length:27.0, price:289, armFriendly:true  },
  { brand:"HEAD",       model:"Gravity Tour 2025",     headSize:98,  weight:310, balance:4,  swingWeight:328, mains:16, crosses:20, beamWidth:22, ra:59, length:27.0, price:299, armFriendly:true  },
  { brand:"HEAD",       model:"Gravity Pro 2025",       headSize:100, weight:315, balance:7,  swingWeight:329, mains:18, crosses:20, beamWidth:20, ra:59, length:27.0, price:269, armFriendly:true  },
  { brand:"HEAD",       model:"Boom MP 2026",          headSize:100, weight:300, balance:5,  swingWeight:308, mains:16, crosses:19, beamWidth:25, ra:63, length:27.0, price:259, armFriendly:true  }, // editorial: plays softer than RA 63 suggests,
  { brand:"HEAD",       model:"Radical MP 2025",       headSize:98,  weight:305, balance:4,  swingWeight:323, mains:16, crosses:19, beamWidth:22, ra:66, length:27.0, price:289, armFriendly:false },
  { brand:"HEAD",       model:"Extreme MP 2025",       headSize:100, weight:300, balance:4,  swingWeight:323, mains:16, crosses:19, beamWidth:26, ra:66, length:27.0, price:289, armFriendly:false },
  // -- BABOLAT --
  { brand:"Babolat",    model:"Pure Aero 2026",        headSize:100, weight:300, balance:4,  swingWeight:320, mains:16, crosses:19, beamWidth:26, ra:68, length:27.0, price:299, armFriendly:false },
  { brand:"Babolat",    model:"Pure Aero 98 2026",     headSize:98,  weight:305, balance:3,  swingWeight:318, mains:16, crosses:20, beamWidth:23, ra:68, length:27.0, price:309, armFriendly:false },
  { brand:"Babolat",    model:"Pure Drive 2025",       headSize:100, weight:300, balance:3,  swingWeight:323, mains:16, crosses:19, beamWidth:26, ra:71, length:27.0, price:299, armFriendly:false },
  { brand:"Babolat",    model:"Pure Strike 100",       headSize:100, weight:300, balance:5,  swingWeight:318, mains:16, crosses:19, beamWidth:21, ra:64, length:27.0, price:289, armFriendly:false },
  { brand:"Babolat",    model:"Pure Strike Team",      headSize:100, weight:285, balance:5,  swingWeight:302, mains:16, crosses:19, beamWidth:21, ra:62, length:27.0, price:269, armFriendly:true  },
  { brand:"Babolat",    model:"Pure Strike 100 16x20 Carbon Grey", headSize:100, weight:305, balance:7,  swingWeight:320, mains:16, crosses:20, beamWidth:22, ra:60, length:27.0, price:289, armFriendly:true  },
  // -- YONEX --
  { brand:"Yonex",      model:"EZONE 100 2025",        headSize:100, weight:300, balance:4,  swingWeight:315, mains:16, crosses:19, beamWidth:25, ra:68, length:27.0, price:305, armFriendly:false },
  { brand:"Yonex",      model:"EZONE 98 2025",         headSize:98,  weight:305, balance:4,  swingWeight:320, mains:16, crosses:19, beamWidth:24, ra:63, length:27.0, price:305, armFriendly:true  }, // editorial: plays softer than RA 63 suggests,
  { brand:"Yonex",      model:"VCORE 98 8th Gen 2026", headSize:98,  weight:305, balance:4,  swingWeight:321, mains:16, crosses:19, beamWidth:23, ra:65, length:27.0, price:305, armFriendly:false },
  { brand:"Yonex",      model:"VCORE 100 2026",        headSize:100, weight:300, balance:4,  swingWeight:318, mains:16, crosses:19, beamWidth:24, ra:65, length:27.0, price:305, armFriendly:false },
  { brand:"Yonex",      model:"PERCEPT 100",           headSize:100, weight:305, balance:5,  swingWeight:318, mains:16, crosses:19, beamWidth:23, ra:60, length:27.0, price:305, armFriendly:true  },
  { brand:"Yonex",      model:"PERCEPT 97",            headSize:97,  weight:310, balance:4,  swingWeight:328, mains:16, crosses:19, beamWidth:22, ra:60, length:27.0, price:305, armFriendly:true  },
  // -- DUNLOP --
  { brand:"Dunlop",     model:"CX 200 16x19",          headSize:98,  weight:305, balance:4,  swingWeight:320, mains:16, crosses:19, beamWidth:21, ra:62, length:27.0, price:250, armFriendly:true  },
  { brand:"Dunlop",     model:"SX 300 2025",           headSize:100, weight:300, balance:4,  swingWeight:318, mains:16, crosses:19, beamWidth:25, ra:65, length:27.0, price:250, armFriendly:false },
  { brand:"Dunlop",     model:"SX 300 Lite 2025",       headSize:100, weight:270, balance:4,  swingWeight:295, mains:16, crosses:19, beamWidth:25, ra:68, length:27.0, price:250, armFriendly:false },
  // -- TECNIFIBRE --
  { brand:"Tecnifibre", model:"TFight 305",            headSize:98,  weight:305, balance:4,  swingWeight:325, mains:16, crosses:19, beamWidth:22, ra:65, length:27.0, price:279, armFriendly:false },
  { brand:"Tecnifibre", model:"TFight 315",            headSize:98,  weight:315, balance:3,  swingWeight:335, mains:16, crosses:19, beamWidth:22, ra:67, length:27.0, price:259, armFriendly:false },
  // -- SOLINCO --
  { brand:"Solinco",    model:"Blackout V2 300",       headSize:100, weight:300, balance:4,  swingWeight:318, mains:16, crosses:19, beamWidth:26, ra:66, length:27.0, price:240, armFriendly:false },
  // -- PROKENNEX --
  { brand:"ProKennex",  model:"Ki Q+5",                headSize:100, weight:290, balance:5,  swingWeight:308, mains:16, crosses:19, beamWidth:24, ra:55, length:27.0, price:249, armFriendly:true  },
  { brand:"ProKennex",  model:"Black Ace 300",          headSize:100, weight:300, balance:4,  swingWeight:324, mains:16, crosses:19, beamWidth:21, ra:55, length:27.0, price:249, armFriendly:true  },
];

const STRING_DB = [
  // -- POLYESTER --
  { name:"Luxilon ALU Power 125",          type:"Polyester",     comfort:4, control:9, spin:8,  power:5,  durability:9, price:13, tags:["Control","Durability","Tour standard"],    why:"The most widely used poly on tour for 20+ years. Exceptional control and bite at full swing. Best for string breakers with good technique." },
  { name:"Babolat RPM Blast 125",          type:"Polyester",     comfort:4, control:8, spin:9,  power:5,  durability:8, price:12, tags:["Spin","Snapback","Control"],               why:"The spin benchmark. Its rounded profile snaps back aggressively through contact, generating heavy topspin with good technique." },
  { name:"Luxilon ALU Power Rough 125",  type:"Polyester",     comfort:4, control:8, spin:9,  power:5,  durability:9, price:14, tags:["Spin","Texture","Durability"],              why:"The textured version of the tour standard. The rough surface grips and releases the ball more aggressively than smooth ALU Power, generating extra spin with the same excellent durability." },
  { name:"Solinco Tour Bite 16",           type:"Polyester",     comfort:4, control:8, spin:9,  power:5,  durability:9, price:11, tags:["Bite","Spin","Durability"],                 why:"A sharper-edged poly that bites the ball aggressively. More spin than RPM Blast with excellent durability." },
  { name:"Solinco Hyper-G 17",             type:"Polyester",     comfort:4, control:8, spin:10, power:5,  durability:8, price:11, tags:["Max spin","Control","Shaped"],              why:"One of the highest spin polys available. The square profile bites hard and holds the stringbed well for heavy topspin." },
  { name:"Yonex Poly Tour Pro 125",        type:"Polyester",     comfort:5, control:8, spin:8,  power:6,  durability:8, price:11, tags:["Softer poly","Control","Feel"],             why:"A softer-feeling poly that does not sacrifice control. Popular with players who want poly performance with a slightly friendlier arm feel." },
  { name:"Head Hawk 16",                   type:"Polyester",     comfort:4, control:9, spin:8,  power:5,  durability:8, price:11, tags:["Control","Precision","Durability"],         why:"Extremely control-oriented poly. Less spin than RPM but delivers exceptional precision and excellent durability." },
  { name:"Tecnifibre Black Code 16",       type:"Polyester",     comfort:5, control:8, spin:9,  power:6,  durability:8, price:11, tags:["Spin","Soft poly","Control"],              why:"A well-rounded poly with a softer feel than most. Good spin access and control with less arm abuse than stiffer options." },
  { name:"Wilson Revolve 16",              type:"Polyester",     comfort:5, control:7, spin:8,  power:6,  durability:7, price:10, tags:["Entry poly","Comfortable","Power"],         why:"A softer, more playable poly. Not as snappy as Tour Bite but significantly more comfortable -- a good entry-level poly option." },
  { name:"Kirschbaum Pro Line II 17",      type:"Polyester",     comfort:4, control:9, spin:7,  power:5,  durability:9, price:10, tags:["Control","Durability","Value"],             why:"An underrated control poly used on tour for years. Exceptional durability and precision at a great price point." },
  { name:"Tecnifibre Razor Code 16",     type:"Polyester",     comfort:5, control:9, spin:8,  power:5,  durability:8, price:12, tags:["Control","Precision","Soft poly"],           why:"Medvedev's string of choice. A co-poly with exceptional control and a softer feel than most. Great for players who want poly precision without the harshest arm feedback." },
  { name:"Babolat RPM Team 125",          type:"Polyester",     comfort:5, control:7, spin:8,  power:6,  durability:7, price:11, tags:["Softer RPM","Spin","Arm-conscious"],          why:"The softer sibling of RPM Blast. Same spin-friendly profile with a more comfortable feel -- a good bridge between multifilament and full poly." },
  { name:"Head Lynx Tour 17",             type:"Polyester",     comfort:5, control:8, spin:8,  power:6,  durability:8, price:11, tags:["Soft poly","Control","Feel"],                  why:"One of the most popular softer polys in pro shops. Plays more comfortably than most co-polys while maintaining good control and reasonable spin." },
  { name:"Volkl Cyclone 16",              type:"Polyester",     comfort:4, control:8, spin:10, power:5,  durability:8, price:11, tags:["Max spin","Textured","Aggressive"],             why:"A highly textured poly that generates extraordinary spin. The pentagonal profile bites into the ball aggressively -- one of the highest spin polys available." },
  // -- MULTIFILAMENT --
  { name:"Tecnifibre NRG2 17",             type:"Multifilament", comfort:8, control:6, spin:4,  power:8,  durability:4, price:13, tags:["Arm-friendly","Soft feel","Tension stability"], why:"The benchmark arm-protection multifilament. Dampens vibration exceptionally well and holds tension far better than most multis." },
  { name:"Tecnifibre X-One Biphase 16",    type:"Multifilament", comfort:8, control:7, spin:5,  power:8,  durability:5, price:14, tags:["Control","Feel","Arm-friendly"],            why:"One of the most versatile multifilaments available. Gives you control and feel without the arm stress of polyester." },
  { name:"Wilson NXT 16",                  type:"Multifilament", comfort:8, control:6, spin:4,  power:8,  durability:4, price:14, tags:["Premium multi","Power","Gut-like feel"],    why:"A premium multifilament with a lively, powerful response. Feels close to natural gut and is significantly more arm-friendly than any poly." },
  { name:"Head Velocity MLT 16",           type:"Multifilament", comfort:7, control:6, spin:4,  power:8,  durability:4, price:12, tags:["Power","Comfort","Value"],                  why:"An underrated multifilament that plays plush but gives surprising depth. Good arm comfort without sacrificing pace." },
  { name:"Yonex Rexis 125",               type:"Multifilament", comfort:8, control:6, spin:5,  power:8,  durability:4, price:12, tags:["Arm-friendly","Spin","Directional control"], why:"A soft, flexible multifilament with above-average spin access for the type. Great for arm-conscious players who want good directional control." },
  { name:"Wilson Clash Duo 16",            type:"Multifilament", comfort:8, control:6, spin:4,  power:8,  durability:4, price:13, tags:["Arm-friendly","Power","Flexible"],           why:"Engineered to pair with flexible frames. The soft fibres flex on contact rather than transmitting shock to the arm." },
  { name:"Babolat Xcel 16",              type:"Multifilament", comfort:8, control:6, spin:4,  power:9,  durability:4, price:13, tags:["Power","Arm-friendly","Lively"],             why:"One of the most popular multifilaments in pro shops. Known for its lively, powerful response and excellent arm comfort. A great step up from synthetic gut." },
  // -- SYNTHETIC GUT --
  { name:"Prince Synthetic Gut 16",        type:"Synthetic Gut", comfort:6, control:5, spin:4,  power:7,  durability:6, price:7,  tags:["All-round","Value","Arm-friendly"],          why:"The most popular string type among recreational players. Does everything reasonably well and is far more arm-friendly than polyester." },
  { name:"Wilson Synthetic Gut Power 16",  type:"Synthetic Gut", comfort:6, control:5, spin:4,  power:7,  durability:6, price:7,  tags:["Power","Durability","Value"],               why:"A reliable all-rounder with a slight power bias. Holds tension well and is far gentler on the arm than polyester." },
  { name:"Babolat Synthetic Gut 16",       type:"Synthetic Gut", comfort:6, control:5, spin:4,  power:7,  durability:6, price:7,  tags:["Comfort","Durable","Consistent"],           why:"Soft-playing synthetic gut that leans toward comfort. Much easier on the budget than multifilament." },
  { name:"Gamma Synthetic Gut 16",         type:"Synthetic Gut", comfort:6, control:5, spin:5,  power:6,  durability:6, price:7,  tags:["All-round","Crisp feel","Value"],            why:"Slightly firmer than most synthetic guts, giving a crisper response. A good step up if you want more feedback without going to poly." },
  // -- NATURAL GUT --
  { name:"Babolat Natural Gut 16",         type:"Natural Gut",   comfort:10,control:7, spin:5,  power:10, durability:3, price:42, tags:["Most arm-friendly","Premium power","Elite feel"], why:"Natural gut absorbs more impact energy than any synthetic. If arm health is critical and budget allows, nothing else comes close." },
  { name:"Wilson Natural Gut 16",          type:"Natural Gut",   comfort:10,control:7, spin:5,  power:10, durability:3, price:42, tags:["Premium","Arm-friendly","Responsive"],       why:"Premium natural gut with exceptional feel and arm-friendliness. One of the most responsive strings ever made." },
  { name:"Klip Legend Natural Gut 16",     type:"Natural Gut",   comfort:10,control:7, spin:5,  power:10, durability:3, price:32, tags:["Premium","Arm-friendly","Value gut"],         why:"High-quality natural gut at a lower price point than premium brands. If budget is a concern but you want full gut, start here." },

];

/* =============================================================
   AFFILIATE URL INFRASTRUCTURE
   -----------------------------------------------------------
   Maps each racquet model and string name to its Tennis Express
   product slug. The buildShopUrl() helper wraps the slug in the
   Shopify-standard /discount/<code>?redirect=... pattern, which
   sets the discount cookie AND deep-links to the product page in
   one click. Products not in the maps fall back to a search URL
   (still with the discount cookie applied).

   To update a slug or add a new product, edit only this file.
   The product database (RACQUET_DB / STRING_DB) is unchanged.

   AFFILIATE CODE: change AFFILIATE_CODE if Tucker's discount code
   ever changes. All 70 product URLs update automatically.
   ============================================================= */

const AFFILIATE_CODE = "tucktraining";
const TE_BASE        = "https://www.tennisexpress.com";

const RACQUET_AFFILIATE_URLS = {
  // Wilson
  "RF 01 Pro":                    "wilson-rf-01-pro-tennis-racquet-110605",
  "RF 01":                        "wilson-rf-01-tennis-racquet-110606",
  "RF 01 Future":                 "wilson-rf-01-future-tennis-racquet-110607",
  "Clash 100 v3":                 "clash-100-v3-tennis-racquet?variant=49630090199355",
  "Clash 100L v3":                "clash-100l-v3-tennis-racquet",
  "Clash 100 Pro v3":             "clash-100-pro-v3-tennis-racquet",
  "Blade 98 16x19 v9":            "wilson-blade-98-16x19-v90-tennis-racquet-108333?variant=49252088742203",
  "Blade 100 v9":                 "wilson-blade-100-v90-tennis-racquet-108336?variant=49252087529787",
  "Blade 98 18x20 v9":            "wilson-blade-98-18x20-v90-tennis-racquet-108334?variant=49252089069883",
  "Pro Staff 97 v14":             "wilson-pro-staff-97-v140-tennis-racquet-103535?variant=49252099391803",
  "Ultra 100 v4":                 "ultra-100-v5-tennis-racquet", // AUDIT: links to v5; database says v4
  // HEAD
  "Speed Pro 2026":               "speed-pro-2026-tennis-racquet?variant=50778264633659",
  "Speed Tour 97 2026":           "speed-tour-2026-tennis-racquet?variant=50778266566971",
  "Speed MP 2026":                "speed-mp-2026-tennis-racquet",
  "Speed MP L 2026":              "speed-mp-l-2026-tennis-racquet",
  "Speed MP UL 2026":             "speed-mp-ul-2026-tennis-racquet",
  "Gravity MP 2025":              "gravity-mp-2025-tennis-racquet",
  "Gravity Tour 2025":            "gravity-tour-2025-tennis-racquet?variant=49630099702075",
  "Gravity Pro 2025":             "gravity-pro-2025-tennis-racquet",
  "Boom MP 2026":                 "boom-mp-2006-tennis-racquet", // AUDIT: TE typo says 2006, link works
  "Radical MP 2025":              "radical-mp-2025-tennis-racquet",
  "Extreme MP 2025":              "head-extreme-mp-2024-tennis-racquet-111203", // AUDIT: TE only carries 2024
  // Babolat
  "Pure Aero 2026":               "pure-aero-2026-tennis-racquet",
  "Pure Aero 98 2026":            "pure-aero-98-2026-tennis-racquet",
  "Pure Drive 2025":              "pure-drive-gen11-tennis-racquet-blue-1?variant=49630300471611",
  "Pure Strike 100":              "pure-strike-100-16-19-tennis-racquet-carbon-grey?variant=49783552966971",
  "Pure Strike Team":             "pure-strike-team-tennis-racquet-carbon-grey",
  "Pure Strike 100 16x20 Carbon Grey": "pure-strike-100-16-20-tennis-racquet-carbon-grey?variant=49784043045179",
  // Yonex
  "EZONE 100 2025":               "ezone-100-tennis-racquet-blast-blue?variant=49630090854715",
  "EZONE 98 2025":                "ezone-98-tennis-racquet-blast-blue",
  "VCORE 98 8th Gen 2026":        "vcore-98-tennis-racquet-ruby-red",
  "VCORE 100 2026":               "vcore-100-tennis-racquet-ruby-red?variant=50810432291131",
  // PERCEPT 100 — search fallback (not currently stocked at TE)
  "PERCEPT 97":                   "percept-97-tennis-racquet-midnight-navy?variant=50271763759419",
  // Dunlop
  "CX 200 16x19":                 "cx200-limited-edition-16x19-tennis-racquet",
  "SX 300 2025":                  "sx-tennis-racquet",
  "SX 300 Lite 2025":             "sx-300-lite-tennis-racquet",
  // Tecnifibre
  "TFight 305":                   "t-fight-305s-performance-tennis-racquet",
  "TFight 315":                   "t-fight-315s-performance-tennis-racquet",
  // Solinco
  "Blackout V2 300":              "blackout-v2-300g-tennis-racquet?variant=50589652943163",
  // ProKennex
  "Ki Q+5":                       "ki-q-5x-pro-tennis-racquet?variant=50403074179387",
  // Black Ace 300 — search fallback (not currently stocked at TE)
};

const STRING_AFFILIATE_URLS = {
  // Polyester
  "Luxilon ALU Power 125":        "alu-power-125-seed-string",
  "Babolat RPM Blast 125":        "rpm-blast-125-touch-vs-130-150-year-anniversary-tennis-string", // AUDIT: anniversary edition
  "Luxilon ALU Power Rough 125":  "luxilon-big-banger-alu-power-125-rough-17g-string-4577",
  // Solinco Tour Bite 16 — search fallback (only Diamond Rough/Soft/reel available)
  "Solinco Hyper-G 17":           "solinco-hyper-g-round-tennis-string-109223?variant=49252049944891",
  // Yonex Poly Tour Pro 125 — search fallback (not in stock)
  "Head Hawk 16":                 "head-hawk-16g-tennis-string-white-35714?variant=49386878599483",
  "Tecnifibre Black Code 16":     "tecnifibre-black-code-16g-strings-11857",
  "Wilson Revolve 16":            "wilson-revolve-tennis-string-41953?variant=49387716641083",
  "Kirschbaum Pro Line II 17":    "pro-line-ii-1-30-black-tennis-string-17984",
  "Tecnifibre Razor Code 16":     "tecnifibre-razor-code-white-tennis-string-77873?variant=49387651563835",
  "Babolat RPM Team 125":         "rpm-team-tennis-string-black",
  "Head Lynx Tour 17":            "head-lynx-tour-tennis-string-82579?variant=49386880926011",
  "Volkl Cyclone 16":             "volkl-cyclone-16g-tennis-string-graphite-109134",
  // Multifilament
  "Tecnifibre NRG2 17":           "tecnifibre-nrg2-tennis-string-72763?variant=49387649368379",
  "Tecnifibre X-One Biphase 16":  "tecnifibre-x-one-biphase-tennis-string-natural-72747?variant=49387653726523",
  "Wilson NXT 16":                "wilson-nxt-tennis-string-38687?variant=49387715428667",
  "Head Velocity MLT 16":         "head-velocity-mlt-tennis-string-45456?variant=49386893115707",
  "Yonex Rexis 125":              "yonex-rexis-comfort-tennis-string-91647", // AUDIT: links to Rexis Comfort variant
  // Wilson Clash Duo 16 — search fallback (not stocked at TE)
  "Babolat Xcel 16":              "xcel-tennis-string?variant=49630501634363",
  // Synthetic Gut
  // Prince Synthetic Gut 16 — search fallback (not stocked)
  "Wilson Synthetic Gut Power 16":"wilson-synthetic-gut-power-tennis-string-38706?variant=49387720802619",
  "Babolat Synthetic Gut 16":     "babolat-syn-gut-tennis-string-82888?variant=49386672554299",
  "Gamma Synthetic Gut 16":       "gamma-synthetic-gut-tennis-string-white-73467",
  // Natural Gut
  // Babolat Natural Gut 16 — search fallback (not stocked)
  "Wilson Natural Gut 16":        "wilson-natural-gut-tennis-string-53981?variant=49387713986875",
  // Klip Legend Natural Gut 16 — search fallback (not stocked)
};

/* Wraps a Tennis Express product slug in the Shopify discount-redirect
   URL pattern. The result simultaneously sets Tucker's discount cookie
   AND deep-links to the product page. Pass slug=null to get a discount-
   only URL (lands on TE homepage with cookie set).

   The redirect value is URL-encoded so slugs containing ?variant=... or
   other query strings survive intact through Shopify's redirect handler. */
function buildShopUrl(slug) {
  const base = `${TE_BASE}/discount/${AFFILIATE_CODE}`;
  if (!slug) return base;
  return `${base}?redirect=${encodeURIComponent("/products/" + slug)}`;
}

/* Wraps a Tennis Express SEARCH URL in the same discount-redirect pattern.
   Used for products not in the affiliate URL maps — user lands on a
   search results page with discount cookie applied at any eventual
   checkout. */
function buildSearchShopUrl(query) {
  const search = `/search?q=${encodeURIComponent(query)}`;
  return `${TE_BASE}/discount/${AFFILIATE_CODE}?redirect=${encodeURIComponent(search)}`;
}

/* Returns the appropriate Tennis Express URL for a given racquet object.
   Looks up the model in RACQUET_AFFILIATE_URLS; falls back to search if
   not present. */
function getRacquetShopUrl(r) {
  const slug = RACQUET_AFFILIATE_URLS[r.model];
  if (slug) return buildShopUrl(slug);
  return buildSearchShopUrl(`${r.brand} ${r.model}`);
}

/* Returns the appropriate Tennis Express URL for a given string object. */
function getStringShopUrl(s) {
  const slug = STRING_AFFILIATE_URLS[s.name];
  if (slug) return buildShopUrl(slug);
  return buildSearchShopUrl(s.name);
}

/* Returns true if a racquet has a direct product URL on Tennis Express
   (i.e., is currently stocked and deep-linkable). Used by the recommendation
   selection logic to skip products users couldn't shop directly. */
function isRacquetInStock(r) {
  return r && r.model && Object.prototype.hasOwnProperty.call(RACQUET_AFFILIATE_URLS, r.model);
}

/* Same as isRacquetInStock but for strings. */
function isStringInStock(s) {
  return s && s.name && Object.prototype.hasOwnProperty.call(STRING_AFFILIATE_URLS, s.name);
}

function norm(val, min, max) {
  if (max === min) return 50;
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
}
function normInv(val, min, max) { return 100 - norm(val, min, max); }
function clamp(v, lo=0, hi=100) { return Math.min(hi, Math.max(lo, v)); }

// Shared comfort scoring helper. Used by both arm-health mode (with the
// user's computed injuryFactor) and performance mode (with a neutral 0.5
// baseline so the displayed comfort reflects the frame's structural arm-
// friendliness, not the user's risk). The caller decides whether to use
// the returned value for scoring or for display only — performance mode's
// weights set comfort: 0 so the value is informational there.
function computeFrameComfort(r, armRisk) {
  const ra = r.ra ?? SETTINGS.BlankRA_Default;
  const raComfortContrib = normInv(ra, 50, 75) * (0.15 + 0.85 * armRisk);
  const balanceVal = Math.min(8, Math.max(3, r.balance > 0 ? r.balance : 5));
  return clamp(
    raComfortContrib * 0.50 +
    normInv(r.weight, 240, 340) * 0.30 +
    norm(balanceVal, 3, 8) * 0.20
  );
}

function computeSubscores(r, d, painNumeric, injuryFactor) {
  const ra = r.ra ?? SETTINGS.BlankRA_Default;
  const sw = r.swingWeight ?? SETTINGS.BlankSW_Default;
  const density = r.mains * r.crosses;
  const ntrp = parseFloat(d.ntrp) || 3.5;
  const perfFirst = d.comfortVsPerf === "Performance first";

  let powerScore = norm(r.headSize, 95, 115) * 0.40 +
    norm(r.beamWidth, 18, 30) * 0.35 +
    norm(sw, 280, 360) * 0.25;
  if (ntrp <= 3.0) powerScore *= 1.10;
  if (ntrp >= 4.0) powerScore *= 0.92;

  // (power frame bonus removed — caused regressions)

  let controlScore = normInv(density, 280, 380) * 0.35 +
    normInv(r.headSize, 95, 115) * 0.30 +
    normInv(r.beamWidth, 18, 30) * 0.20 +
    normInv(ra, 50, 75) * 0.15;
  if (ntrp >= 4.5) controlScore *= 1.20;
  else if (ntrp >= 4.0) controlScore *= 1.12;
  else if (ntrp <= 3.0) controlScore *= 0.88;

  // 18x20 pattern bonus for advanced players who specifically want control
  // The dense pattern earns a meaningful reward for 4.0+ performance-first profiles
  if (r.mains === 18 && r.crosses === 20 && ntrp >= 4.0 && perfFirst) {
    controlScore = Math.min(100, controlScore * 1.10);
  }

  // Small head bonus: 97-98sq in frames earn extra control credit for advanced players
  // Only applies to genuine control frames (dense pattern + RA <= 65) to avoid boosting
  // power-oriented 98sq in frames like RF 01 Pro
  const densePattern = density > 304;
  if (r.headSize <= 98 && ntrp >= 4.0 && perfFirst && densePattern && (r.ra ?? 65) <= 65) {
    controlScore = Math.min(100, controlScore * 1.06);
  }

  const comfortScore = computeFrameComfort(r, injuryFactor ?? 0);

  let spinScore = normInv(density, 280, 380) * 0.60 + norm(r.headSize, 95, 115) * 0.40;
  if (d.playStyle === "Baseliner" && ntrp >= 4.0) spinScore *= 1.15;
  if (d.swingSpeed === "Fast & Aggressive" && perfFirst) spinScore *= 1.10;

  const swingMult = d.swingSpeed === "Fast & Aggressive" ? 0.85 :
                    d.swingSpeed === "Slow & Controlled" ? 1.20 : 1.0;
  const advancedBaselineMult = (d.playStyle === "Baseliner" && ntrp >= 4.0) ? 1.15 : 1.0;
  const maneuverabilityScore = normInv(r.weight, 240, 340) * 0.50 * swingMult * advancedBaselineMult +
    normInv(sw, 280, 360) * 0.50;

  const frameRiskScore = clamp(
    norm(ra, 50, 75) * 0.60 +
    normInv(r.weight, 240, 340) * 0.20 +
    norm(r.beamWidth, 18, 30) * 0.20
  );

  return {
    powerScore: clamp(powerScore), controlScore: clamp(controlScore),
    comfortScore: clamp(comfortScore), spinScore: clamp(spinScore),
    maneuverabilityScore: clamp(maneuverabilityScore), frameRiskScore,
  };
}

function computeWeights(d, injuryFactor) {
  const injF = injuryFactor ?? 0;
  const playStyleWeights = {
    "Baseliner":      { power:0.28, control:0.18, comfort:0.12, spin:0.28, maneuverability:0.10 },
    "All-Court":      { power:0.20, control:0.20, comfort:0.12, spin:0.20, maneuverability:0.22 },
    "Doubles-First":  { power:0.14, control:0.26, comfort:0.12, spin:0.10, maneuverability:0.32 },
    "Serve & Volley": { power:0.14, control:0.30, comfort:0.12, spin:0.10, maneuverability:0.28 },
  };
  let w = { ...(playStyleWeights[d.playStyle] || playStyleWeights["All-Court"]) };

  const rawComfortBase = w.comfort;
  w.comfort = 0.03 + (rawComfortBase - 0.03) * injF;

  const priorityMult = {
    "Comfort first":     { power:0.65, control:0.75, comfort:2.00, spin:0.65, maneuverability:0.85 },
    "Balanced":          { power:1.00, control:1.00, comfort:1.00, spin:1.00, maneuverability:1.00 },
    "Performance first": { power:1.35, control:1.10, comfort:0.10, spin:1.35, maneuverability:1.00 },
  };
  const pm = priorityMult[d.comfortVsPerf] || priorityMult["Balanced"];
  Object.keys(w).forEach(k => { w[k] *= pm[k]; });

  let total = Object.values(w).reduce((a, b) => a + b, 0);
  Object.keys(w).forEach(k => { w[k] /= total; });

  const ageBoost = (d.ageRange === "56-65" || d.ageRange === "66+") ? 0.08 * injF :
                    d.ageRange === "46-55" ? 0.04 * injF : 0;
  if (ageBoost > 0) {
    w.comfort += ageBoost;
    total = Object.values(w).reduce((a, b) => a + b, 0);
    Object.keys(w).forEach(k => { w[k] /= total; });
  }

  return w;
}

function computeInjuryFactor(d, painNumeric) {
  const base = painNumeric / 10;
  const pastAdder =
    (d.pastInjuryElbow    === "Yes" ? 0.10 : 0) +
    (d.pastInjuryShoulder === "Yes" ? 0.10 : 0) +
    (d.pastInjuryWrist    === "Yes" ? 0.10 : 0);
  const rehabMap = { "Resting It":0.10, "Physical Therapy":0.05, "Load Management":0.05, "Strength Training":0.00, "Nothing":0.00, "":0.00 };
  const rehabAdder = rehabMap[d.rehabStatus] ?? 0;
  const strType = d.stringType || "Not Sure";
  const strAdder =
    (strType === "Polyester" && painNumeric > SETTINGS.StringPoly_PainThreshold ? SETTINGS.StringPoly_Penalty / 100 : 0) +
    (strType === "Natural Gut" || strType === "Multifilament" ? -0.05 : 0);
  const tension = d.tensionRange || "Medium";
  const tensionAdder =
    (tension === "High" && painNumeric > SETTINGS.HighTension_PainThreshold ? SETTINGS.HighTension_Penalty / 100 : 0) +
    (tension === "Low" ? -0.05 : 0);
  const raw = base + pastAdder + rehabAdder + strAdder + tensionAdder;
  const playFreq = d.playFrequency || "1-2x/wk";
  const freqMult = SETTINGS.PlayFreq_InjuryMult[playFreq] ?? 1.0;
  return Math.min(1.0, Math.max(0, raw * freqMult));
}

function topStrengths(sub) {
  const scores = [
    ["Power",           sub.powerScore],
    ["Control",         sub.controlScore],
    ["Comfort",         sub.comfortScore],
    ["Spin",            sub.spinScore],
    ["Maneuverability", sub.maneuverabilityScore],
  ];
  return scores.sort((a, b) => b[1] - a[1]).slice(0, 2).map(s => s[0]).join(" & ");
}

function calcTension(d, painNumeric) {
  let base = 52;
  if (painNumeric >= 6) base -= 6;
  else if (painNumeric >= 3) base -= 3;
  if (d.stringType === "Polyester") base -= 2;
  if (d.stringType === "Natural Gut") base += 2;
  const ntrp = parseFloat(d.ntrp) || 3.5;
  if (ntrp >= 4.0) base += 2;
  else if (ntrp <= 3.0) base -= 2;
  if (d.swingSpeed === "Fast & Aggressive") base += 2;
  else if (d.swingSpeed === "Slow & Controlled") base -= 2;
  base = Math.min(58, Math.max(42, base));
  return { low: base - 2, high: base + 2, recommended: base };
}

function budgetFlag(price, budget) {
  if (!budget || budget === "No preference") return "";
  const ranges = { "Under $260":[0,259], "$260-$290":[260,290], "$290+":[290,9999] };
  const [, hi] = ranges[budget] || [0, 9999];
  return price <= hi ? "in-budget" : "over-budget";
}


function selectStrings(d, injuryFactor, painNumeric) {
  const ntrp = parseFloat(d.ntrp) || 3.5;
  const perfFirst    = d.comfortVsPerf === "Performance first";
  const comfortFirst = d.comfortVsPerf === "Comfort first";
  const fastSwing    = d.swingSpeed === "Fast & Aggressive";
  const baseliner    = d.playStyle === "Baseliner";

  // Build scoring weights from player profile
  let w = { comfort:0.20, control:0.20, spin:0.20, power:0.20, durability:0.20 };

  // Injury factor scales comfort weight up (capped to avoid gut dominating for minor issues)
  w.comfort += Math.min(injuryFactor * 0.25, 0.20);

  // NTRP: higher level wants more control, less free power
  if (ntrp >= 4.0) { w.control += 0.08; w.power -= 0.05; }
  if (ntrp >= 4.5) { w.control += 0.05; }
  if (ntrp <= 3.0) { w.power += 0.08; w.control -= 0.05; }

  // Play style
  if (baseliner) { w.spin += 0.08; w.power -= 0.04; }

  // Priority preference
  if (perfFirst)    { w.control += 0.08; w.spin += 0.06; w.comfort -= 0.08; }
  if (comfortFirst) { w.comfort += 0.08; w.control -= 0.04; }

  // Fast swing = string breaking risk -> durability matters more
  if (fastSwing) { w.durability += 0.06; w.power -= 0.03; }

  // Clamp all weights positive and normalize
  Object.keys(w).forEach(k => { w[k] = Math.max(0.02, w[k]); });
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  Object.keys(w).forEach(k => { w[k] /= total; });

  const scored = STRING_DB.map(s => {
    // Base performance score
    const perf = (
      s.comfort    * w.comfort    +
      s.control    * w.control    +
      s.spin       * w.spin       +
      s.power      * w.power      +
      s.durability * w.durability
    ) * 10;

    // Poly penalty scales with injury factor
    const polyPenalty = (s.type === "Polyester" && injuryFactor > 0.25)
      ? Math.min(25, (injuryFactor - 0.25) * 45) : 0;

    // Hard gate: poly at severe pain
    const polyHardGate = (s.type === "Polyester" && painNumeric >= 6) ? 50 : 0;

    // Premium fit penalty: gut is overkill for lower-level players
    const isPremium = s.type === "Natural Gut";
    const levelPenalty = (isPremium && ntrp < 3.5 && !perfFirst && injuryFactor < 0.5) ? 8 : 0;

    // Budget gate: natural gut ($32-42) is inappropriate for budget-sensitive users
    const userBudget = d.budget || "";
    const isBudgetSensitive = userBudget === "Under $260";
    const budgetPenalty = (isPremium && isBudgetSensitive) ? 20 : 0;

    const premiumFitPenalty = levelPenalty + budgetPenalty;

    const finalScore = Math.max(0, perf - polyPenalty - polyHardGate - premiumFitPenalty);
    return { ...s, finalScore };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);

  // Diversity cap: no single type fills more than 2 of the 3 slots.
  // Ensures users always see genuine variety rather than 3x the same type.
  // Also: skip strings that aren't currently stocked at Tennis Express,
  // so every recommendation is directly shoppable. (Out-of-stock strings
  // stay in scoring but never reach the user's results.)
  const picked = [];
  const typeCounts = {};
  for (const s of scored) {
    if (!isStringInStock(s)) continue;
    const typeCount = typeCounts[s.type] || 0;
    if (typeCount < 2) {
      picked.push(s);
      typeCounts[s.type] = typeCount + 1;
    }
    if (picked.length === 3) break;
  }

  // Defensive fallback: if the in-stock + diversity-cap combination yields
  // fewer than 3 strings (effectively impossible with 22 stocked across 4
  // types), do a second pass without the stock filter to guarantee 3 picks.
  if (picked.length < 3) {
    const seen = new Set(picked.map(p => p.name));
    const typeCounts2 = { ...typeCounts };
    for (const s of scored) {
      if (seen.has(s.name)) continue;
      const typeCount = typeCounts2[s.type] || 0;
      if (typeCount < 2) {
        picked.push(s);
        typeCounts2[s.type] = typeCount + 1;
        seen.add(s.name);
      }
      if (picked.length === 3) break;
    }
  }

  return picked.map((s, i) => ({ ...s, top: i === 0 }));
}



function whyText(r, d, injuryFactor, painNumeric) {
  const ntrp        = parseFloat(d.ntrp) || 3.5;
  const perfFirst   = d.comfortVsPerf === "Performance first";
  const comfortFirst = d.comfortVsPerf === "Comfort first";
  const baseliner   = d.playStyle === "Baseliner";
  const doubles     = d.playStyle === "Doubles-First";
  const snv         = d.playStyle === "Serve & Volley";
  const fastSwing   = d.swingSpeed === "Fast & Aggressive";
  const slowSwing   = d.swingSpeed === "Slow & Controlled";
  const hasArm      = injuryFactor > 0.2;
  const severeArm   = painNumeric >= 6;
  const olderPlayer = d.ageRange === "56-65" || d.ageRange === "66+";
  const painSpot    = d.painLocations && d.painLocations.length ? d.painLocations[0].toLowerCase() : "arm";
  const ra          = r.ra ?? SETTINGS.BlankRA_Default;
  const beam        = r.beamWidth ?? 23;
  const density     = r.mains * r.crosses;
  const openPattern = density <= 304;

  // ── Spec-specific sentence fragments ────────────────────────────────────

  const raLine = () => {
    if (ra <= 56) return severeArm
      ? `At RA ${ra}, this is one of the most flexible frames available -- built specifically to reduce shock at your ${painSpot}.`
      : `At RA ${ra} it sits at the very low end of the stiffness scale, absorbing significantly more impact than average frames.`;
    if (ra <= 61) return `Its RA ${ra} stiffness rating is well below the arm-stress threshold -- flexier than most tour frames and noticeably gentler at contact.`;
    if (ra <= 65) return `At RA ${ra} it offers a controlled flex that balances feedback and comfort -- neither punishing nor mushy.`;
    if (ra <= 68) return `At RA ${ra} this is a stiffer frame that rewards clean contact with direct power transfer and precise feedback.`;
    return `At RA ${ra} this is one of the stiffer options in the database -- it demands clean technique but delivers exceptional response on well-struck balls.`;
  };

  const beamLine = () => {
    if (beam <= 21) return `The ${beam}mm beam keeps the feel muted and precise at contact -- more like a players frame than a power stick.`;
    if (beam <= 23) return snv || doubles
      ? `The ${beam}mm beam gives crisp, direct feedback at net where touch matters most.`
      : `The ${beam}mm beam gives a balanced feel -- enough depth from the baseline without sacrificing touch at net.`;
    if (beam <= 25) return baseliner
      ? `The ${beam}mm beam generates easy depth from the baseline without needing a full swing.`
      : `The ${beam}mm beam adds comfortable power to your shots without requiring extra effort.`;
    return `The wide ${beam}mm beam generates significant power -- ideal if you want depth without heavy swings.`;
  };

  const weightLine = () => {
    if (r.weight >= 315) return ntrp >= 4.0
      ? `At ${r.weight}g it has the mass to stay planted and stable under pace -- you will feel it on big groundstrokes.`
      : `At ${r.weight}g it is on the heavier side -- best suited to players with a full, controlled swing.`;
    if (r.weight >= 305) return `At ${r.weight}g it provides excellent plow-through on groundstrokes while remaining maneuverable enough for net play.`;
    if (r.weight >= 295) return baseliner
      ? `Its ${r.weight}g weight is ideal for baseline play -- heavy enough to stay stable on big hits, light enough to recover quickly.`
      : `Its ${r.weight}g weight is a versatile all-court spec -- stable enough for aggressive baseline play, light enough to volley.`;
    if (r.weight >= 280) return (olderPlayer || hasArm)
      ? `At ${r.weight}g it stays manageable through long sessions, reducing cumulative arm load over time.`
      : `At ${r.weight}g it is easy to accelerate for players who prefer a quicker swing rather than a heavy one.`;
    return `At ${r.weight}g it is one of the lighter options -- suited to players who need easy swing speed or are managing arm issues.`;
  };

  const patternLine = () => {
    if (density <= 288) return `The open ${r.mains}x${r.crosses} pattern maximises spin potential -- strings bite the ball aggressively on every shot.`;
    if (density <= 304) return baseliner && fastSwing
      ? `The ${r.mains}x${r.crosses} pattern gives your fast swing easy access to heavy topspin.`
      : baseliner
      ? `The open ${r.mains}x${r.crosses} pattern helps you load up topspin from the back of the court.`
      : `The ${r.mains}x${r.crosses} pattern offers a good balance of spin access and control.`;
    if (density <= 320) return perfFirst
      ? `The ${r.mains}x${r.crosses} pattern rewards aggressive ball-striking with pinpoint control.`
      : `The ${r.mains}x${r.crosses} pattern favours control and consistency over raw spin.`;
    return doubles || snv
      ? `The dense ${r.mains}x${r.crosses} pattern delivers the control and precision net play demands.`
      : `The ${r.mains}x${r.crosses} pattern delivers exceptional control on full swings.`;
  };

  // ── Assemble 2 sentences based on what matters most for this player ─────

  const parts = [];

  // Sentence 1: arm health (if relevant) or the spec that drove the score most
  if (severeArm && r.armFriendly) {
    parts.push(raLine());
  } else if (hasArm) {
    parts.push(raLine());
  } else if (perfFirst && ntrp >= 4.0) {
    // High-level perf players care about RA + beam combo
    parts.push(beamLine());
  } else if (comfortFirst || olderPlayer) {
    parts.push(weightLine());
  } else {
    parts.push(raLine());
  }

  // Sentence 2: pattern (spin-oriented) or beam (power-oriented) or weight
  if (baseliner || fastSwing) {
    parts.push(patternLine());
  } else if (snv || doubles) {
    parts.push(beamLine());
  } else if (perfFirst) {
    parts.push(beamLine());
  } else if (hasArm || comfortFirst) {
    parts.push(weightLine());
  } else {
    parts.push(patternLine());
  }

  // If sentence 1 and 2 are identical within this card (same spec triggered both),
  // swap sentence 2 for weight so the card reads as two distinct observations
  if (parts[0] === parts[1]) {
    parts[1] = weightLine();
  }

  // Current racket comparison (if provided)
  if (d.currentRacket && d.currentRacket.trim()) {
    const current = d.currentRacket.trim();
    if (severeArm || hasArm) {
      parts.push(`A meaningful arm-health upgrade from your ${current}.`);
    } else if (perfFirst) {
      parts.push(`A step up from your ${current} in control and consistency.`);
    } else {
      parts.push(`A strong alternative to your ${current} based on your profile.`);
    }
  }

  return parts.slice(0, 2).join(" ");
}

// === PERFORMANCE MODE SCORING HELPERS =======================================
// These functions implement the v4 performance-mode algorithm. They run
// independently of the arm-health scoring path. generateRecommendations
// branches at the top based on d.mode and dispatches to the right scoring path.
//
// Key differences from arm-health mode:
//  - Comfort weight = 0 (computed but never used in weighting)
//  - Power scoring NOT damped at high NTRP
//  - Control scoring ignores stiffness (RA)
//  - Spin scoring amplified for fast-swing baseliners (1.30x at 4.0+)
//  - Maneuverability dampened harder for fast swingers (0.70x)
//  - Pain has zero influence anywhere
//  - NTRP-tier rewards heavy/dense at 4.5+, penalizes <295g; rewards light at 3.0
//  - Category specialists get +6 bonus when matching priority focus
//  - Anti-comfort penalty: armFriendly frames get -4 when priority is Power or Spin
//  - Control elite bonus: +3 for 305g+ AND +2 for 18x20 when control priority

const POWER_SPECIALISTS = [
  "Pure Drive 2025", "Ultra 100 v4", "EZONE 100 2025",
  "VCORE 100 2026", "SX 300 2025"
];
const SPIN_SPECIALISTS = [
  "Pure Aero 2026", "Pure Aero 98 2026", "VCORE 100 2026",
  "VCORE 98 8th Gen 2026", "SX 300 2025", "Extreme MP 2025"
];
const CONTROL_SPECIALISTS = [
  "Blade 98 16x19 v9", "Blade 98 18x20 v9", "Pro Staff 97 v14",
  "Pure Strike 100 16x20 Carbon Grey", "EZONE 98 2025", "VCORE 98 8th Gen 2026",
  "Speed Pro 2026", "Gravity Pro 2025", "Radical MP 2025",
  "TFight 305", "TFight 315"
];

function performanceSubscores(r, d) {
  const ra = r.ra ?? SETTINGS.BlankRA_Default;
  const sw = r.swingWeight, density = r.mains * r.crosses;
  const ntrp = parseFloat(d.ntrp) || 3.5;
  const fastSwing = d.swingSpeed === "Fast & Aggressive";
  const slowSwing = d.swingSpeed === "Slow & Controlled";

  let powerScore = norm(r.headSize, 95, 115) * 0.30
                 + norm(r.beamWidth, 18, 30) * 0.40
                 + norm(sw, 280, 360) * 0.15
                 + norm(ra, 50, 75) * 0.15;

  let controlScore = normInv(density, 280, 380) * 0.45
                   + normInv(r.headSize, 95, 115) * 0.35
                   + normInv(r.beamWidth, 18, 30) * 0.20;
  if (ntrp >= 4.5) controlScore *= 1.25;
  else if (ntrp >= 4.0) controlScore *= 1.15;
  else if (ntrp <= 3.0) controlScore *= 0.85;
  if (r.mains === 18 && r.crosses === 20) controlScore = Math.min(100, controlScore * 1.18);

  let spinScore = normInv(density, 280, 380) * 0.55 + norm(r.headSize, 95, 115) * 0.45;
  if (d.playStyle === "Baseliner" && ntrp >= 4.0) spinScore *= 1.30;
  if (fastSwing) spinScore *= 1.15;

  const swingMult = fastSwing ? 0.70 : slowSwing ? 1.25 : 1.0;
  const maneuverabilityScore = normInv(r.weight, 240, 340) * 0.50 * swingMult
                             + normInv(sw, 280, 360) * 0.50;

  return {
    powerScore: clamp(powerScore),
    controlScore: clamp(controlScore),
    comfortScore: computeFrameComfort(r, 0.5),
    spinScore: clamp(spinScore),
    maneuverabilityScore: clamp(maneuverabilityScore),
    frameRiskScore: 0,
  };
}

function performanceWeights(d) {
  const psw = {
    "Baseliner":      { power: 0.32, control: 0.20, comfort: 0, spin: 0.32, maneuverability: 0.16 },
    "All-Court":      { power: 0.24, control: 0.22, comfort: 0, spin: 0.22, maneuverability: 0.32 },
    "Doubles-First":  { power: 0.16, control: 0.28, comfort: 0, spin: 0.14, maneuverability: 0.42 },
    "Serve & Volley": { power: 0.16, control: 0.34, comfort: 0, spin: 0.14, maneuverability: 0.36 },
  };
  let w = { ...(psw[d.playStyle] || psw["All-Court"]) };

  const priorityMult = {
    "Power":           { power: 1.85, control: 0.75, comfort: 1, spin: 1.05, maneuverability: 0.85 },
    "Control":         { power: 0.75, control: 1.65, comfort: 1, spin: 0.90, maneuverability: 1.00 },
    "Spin":            { power: 1.00, control: 0.90, comfort: 1, spin: 1.85, maneuverability: 0.90 },
    "Maneuverability": { power: 0.85, control: 1.00, comfort: 1, spin: 0.90, maneuverability: 1.65 },
    "Balanced":        { power: 1.00, control: 1.00, comfort: 1, spin: 1.00, maneuverability: 1.00 },
  };
  const pm = priorityMult[d.priorityFocus] || priorityMult["Balanced"];
  Object.keys(w).forEach(k => { w[k] *= pm[k]; });

  let total = Object.values(w).reduce((a, b) => a + b, 0);
  Object.keys(w).forEach(k => { w[k] /= total; });
  return w;
}

function ntrpTierAdjustment(r, ntrp) {
  let adj = 0;
  const density = r.mains * r.crosses;
  const ra = r.ra ?? SETTINGS.BlankRA_Default;
  if (ntrp >= 4.5) {
    if (r.weight >= 305 && density >= 320) adj += 5;
    if (r.weight >= 305) adj += 2;
    if (ra <= 65) adj += 2;
    if (r.weight < 295) adj -= 6;
    if (r.weight < 285) adj -= 3;
  } else if (ntrp >= 4.0) {
    if (r.weight >= 295 && r.weight <= 315) adj += 3;
    if (r.weight < 285) adj -= 4;
  } else if (ntrp >= 3.5) {
    // 3.5: developing competitive player. Mild middle-weight reward,
    // light penalties for extremes. Without this branch, 3.5 players
    // received zero tier adjustment, leaving the specialist bonus
    // unchecked.
    if (r.weight >= 290 && r.weight <= 310) adj += 2;
    if (r.weight < 280) adj -= 2;
    if (r.weight >= 320) adj -= 2;
  } else if (ntrp <= 3.0) {
    if (r.weight <= 295) adj += 4;
    if (r.beamWidth >= 24) adj += 2;
    if (r.headSize >= 100) adj += 2;
    if (r.weight >= 310) adj -= 5;
    if (density >= 360) adj -= 3;
    // Stiffness penalty: developing players cannot safely absorb the
    // shock of off-center hits on very stiff frames. Stacks for the
    // stiffest frames in the database.
    if (ra >= 68) adj -= 3;
    if (ra >= 71) adj -= 2;
  }
  return adj;
}

function categorySpecialistBonus(r, priorityFocus, ntrp) {
  let isSpecialist = false;
  if (priorityFocus === "Power"   && POWER_SPECIALISTS.includes(r.model))   isSpecialist = true;
  if (priorityFocus === "Spin"    && SPIN_SPECIALISTS.includes(r.model))    isSpecialist = true;
  if (priorityFocus === "Control" && CONTROL_SPECIALISTS.includes(r.model)) isSpecialist = true;
  if (!isSpecialist) return 0;
  // Scale by NTRP. Specialists are category-defining frames meant for elite
  // play. At 4.0+ they earn the full reward. At 3.5 they are aspirational
  // but appropriate, so half. At 3.0 they should rarely surface, so minimal.
  // At 2.5 they are categorically wrong for a developing player, so zero.
  if (ntrp >= 4.0) return 6;
  if (ntrp >= 3.5) return 3;
  if (ntrp >= 3.0) return 1;
  return 0;
}

function antiComfortPenalty(r, priorityFocus) {
  if (!r.armFriendly) return 0;
  if (priorityFocus === "Power" || priorityFocus === "Spin") return -4;
  return 0;
}

function controlEliteBonus(r, priorityFocus) {
  if (priorityFocus !== "Control") return 0;
  let bonus = 0;
  if (r.weight >= 305) bonus += 3;
  if (r.mains * r.crosses >= 360) bonus += 2;
  return bonus;
}

// Performance-mode string selection: style-only logic, no pain considerations,
// no current-string considerations. Uses NTRP, swing speed, play style, and
// priority focus to score strings. No premium-fit penalties.
function selectStringsPerformance(d) {
  const ntrp = parseFloat(d.ntrp) || 3.5;
  const fastSwing = d.swingSpeed === "Fast & Aggressive";
  const slowSwing = d.swingSpeed === "Slow & Controlled";
  const baseliner = d.playStyle === "Baseliner";

  return STRING_DB.map(s => {
    let score = 50;

    // Polyester: rewarded for advanced players with fast swings (control/spin)
    if (s.type === "Polyester") {
      if (ntrp >= 4.5) score += 18;
      else if (ntrp >= 4.0) score += 12;
      else if (ntrp <= 3.0) score -= 5;
      if (fastSwing) score += 8;
      if (slowSwing) score -= 6;
      if (baseliner) score += 4;
      if (d.priorityFocus === "Spin" && s.tags && s.tags.includes("Spin")) score += 12;
      if (d.priorityFocus === "Control" && s.tags && s.tags.includes("Control")) score += 8;
      if (d.priorityFocus === "Power") score -= 4;
    }

    // Multifilament: solid mid-range, rewarded for slower swings and lower NTRP
    if (s.type === "Multifilament") {
      if (slowSwing) score += 8;
      if (ntrp <= 3.5) score += 6;
      if (ntrp >= 4.5) score -= 4;
      if (d.priorityFocus === "Power") score += 6;
    }

    // Synthetic gut: budget-friendly tweener
    if (s.type === "Synthetic Gut") {
      if (ntrp <= 3.0) score += 8;
      if (ntrp >= 4.5) score -= 8;
    }

    // Natural gut: premium feel + power, but expensive
    if (s.type === "Natural Gut") {
      if (ntrp >= 4.5) score += 6;
      if (d.priorityFocus === "Power") score += 8;
      if (slowSwing) score += 4;
      // Performance mode doesn't penalize this for budget-conscious users
    }

    return { ...s, finalScore: Math.max(0, score) };
  }).sort((a, b) => b.finalScore - a.finalScore);
}

// Performance-mode tension: NTRP and swing speed only. No pain-driven reductions.
function tensionRangePerformance(d) {
  let base = 52;
  const ntrp = parseFloat(d.ntrp) || 3.5;
  if (ntrp >= 4.5) base += 2;
  else if (ntrp <= 3.0) base -= 2;
  if (d.swingSpeed === "Fast & Aggressive") base += 2;
  else if (d.swingSpeed === "Slow & Controlled") base -= 2;
  // Priority focus: control players string slightly tighter, power players slightly looser
  if (d.priorityFocus === "Control") base += 1;
  if (d.priorityFocus === "Power") base -= 1;
  base = Math.min(58, Math.max(46, base));
  return { low: base - 2, high: base + 2, recommended: base };
}

// === END PERFORMANCE MODE SCORING ============================================

function generateRecommendations(d) {
  // PERFORMANCE MODE BRANCH — uses the v4 algorithm with no arm-health considerations
  if (d.mode === "performance") {
    return generateRecommendationsPerformance(d);
  }

  // ARM HEALTH MODE — existing logic, unchanged
  const painNumeric = PAIN_NUMERIC[d.painSeverity] ?? 0;
  const injuryFactor = computeInjuryFactor(d, painNumeric);
  const weights = computeWeights(d, injuryFactor);

  const scored = RACQUET_DB.map(r => {
    const sub = computeSubscores(r, d, painNumeric, injuryFactor);
    const performanceScore =
      sub.powerScore * weights.power +
      sub.controlScore * weights.control +
      sub.comfortScore * weights.comfort +
      sub.spinScore * weights.spin +
      sub.maneuverabilityScore * weights.maneuverability;

    // Style fit bonus: amplifies the leading dimension to widen score spread
    const density = r.mains * r.crosses;
    const ntrpNum2 = parseFloat(d.ntrp) || 3.5;
    const perfFirst2 = d.comfortVsPerf === "Performance first";
    const hasArm2 = injuryFactor > 0.2;
    const baseBonus =
      (d.playStyle === "Baseliner" && density <= 304) ? sub.spinScore * 0.04 :
      (d.playStyle === "Serve & Volley" && density >= 304) ? sub.controlScore * 0.05 :
      (d.playStyle === "Doubles-First" && sub.maneuverabilityScore > 60) ? sub.maneuverabilityScore * 0.04 :
      (ntrpNum2 >= 4.0 && sub.controlScore > 65) ? sub.controlScore * 0.03 : 0;
    // Power frame bonus: wide-beam frames (25mm+) earn extra credit on power-weighted
    // profiles at lower NTRP — brings Pure Drive, SX 300, VCORE 100 into contention
    const powerBeam = (r.beamWidth ?? 23) >= 25;
    const powerFrameBonus = (!hasArm2 && powerBeam && ntrpNum2 <= 3.5 && !perfFirst2)
      ? sub.powerScore * 0.02 : 0;
    // Extra amplifier for high-NTRP performance-first players — widen spread
    const advancedBonus = (ntrpNum2 >= 4.0 && perfFirst2)
      ? (sub.spinScore - 60) * 0.06 + (sub.controlScore - 60) * 0.04
      : 0;
    // Classic power-frame bonus: rewards true power-frame designs (RA >= 66)
    // for healthy 4.0+ performance-first players. Without this, scoring
    // structurally favors lower-RA frames even when arm-health weighting is
    // near zero, leaving popular frames (Pure Drive, EZONE 100, Pure Aero,
    // SX 300) crowded out for the exact users who would benefit from them.
    // Trigger conditions narrow it to the segment that needs it: arm-conscious
    // users (injuryFactor >= 0.15) are completely unaffected.
    const classicPowerFrame = (r.ra ?? SETTINGS.BlankRA_Default) >= 66;
    const armFree = injuryFactor < 0.15;
    const classicPowerBonus = (ntrpNum2 >= 4.0 && perfFirst2 && armFree && classicPowerFrame)
      ? sub.powerScore * 0.04 : 0;
    const styleFitBonus = baseBonus + powerFrameBonus + Math.max(0, advancedBonus) + classicPowerBonus;
    const userRiskPenalty = injuryFactor * sub.frameRiskScore * SETTINGS.RiskWeight;
    const painLocs = d.painLocations || [];
    const elbowInvolved = painLocs.includes("Elbow") || painLocs.includes("Multiple");
    const hardGatePenalty =
      (painNumeric >= SETTINGS.HardGate_Severity && elbowInvolved &&
       (r.ra ?? SETTINGS.BlankRA_Default) > SETTINGS.RA_HardGate_Cutoff)
        ? SETTINGS.HardGate_Penalty : 0;
    // Arm-specialist penalty: frames built primarily for arm protection (RA <= 58,
    // armFriendly flagged) get penalized for healthy players who don't need them.
    // Scales inversely with injuryFactor - fully applied at 0, gone at 0.5+.
    // Max 5pts: enough to push Clash/Ki Q+5 out of top 3 for healthy perf-first
    // players while keeping them competitive for everyone else.
    const raCurrent = r.ra ?? SETTINGS.BlankRA_Default;
    const isArmSpecialist = r.armFriendly && raCurrent <= 58;
    const armSpecialistPenalty = isArmSpecialist ? 5.0 * Math.max(0, 1 - injuryFactor * 2) : 0;

    // Weight appropriateness penalty:
    // - 4.0+: frames under 300g get hard -30 penalty
    // - 3.0-3.9: frames under 275g get -20 penalty (RF 01 Future at 265g is too light)
    // - Injury factor reduces penalty for injured players who genuinely benefit from lighter frames
    const ntrpNum = parseFloat(d.ntrp) || 3.5;
    const frameWeight = r.weight ?? 300;
    const injF2 = injuryFactor ?? 0;
    const weightTooLightAdvanced = (ntrpNum >= 4.0 && frameWeight < 300);
    const weightTooLightIntermediate = (ntrpNum >= 3.0 && ntrpNum < 4.0 && frameWeight < 275 && injF2 < 0.4);
    const weightPenalty = weightTooLightAdvanced ? 30 : weightTooLightIntermediate ? 20 : 0;

    const finalScore = Math.max(0, performanceScore + styleFitBonus - userRiskPenalty - hardGatePenalty - armSpecialistPenalty - weightPenalty);
    const strengths = topStrengths(sub);
    const budget = budgetFlag(r.price, d.budget);
    return {
      brand: r.brand, model: r.model, finalScore, performanceScore,
      userRiskPenalty, hardGatePenalty, budgetFlag: budget,
      topStrengths: strengths, armFriendly: r.armFriendly, price: r.price,
      whyText: whyText(r, d, injuryFactor, painNumeric),
      specs: {
        "HEAD SIZE": `${r.headSize} sq in`,
        "WEIGHT": `${r.weight}g`,
        "BALANCE": `${r.balance} pts HL`,
        "STIFFNESS": `RA ${r.ra ?? SETTINGS.BlankRA_Default}`,
        "PATTERN": `${r.mains}x${r.crosses}`,
        "PRICE": `$${r.price}`,
      },
      scores: {
        power: Math.round(sub.powerScore), control: Math.round(sub.controlScore),
        comfort: Math.round(sub.comfortScore), spin: Math.round(sub.spinScore),
        maneuverability: Math.round(sub.maneuverabilityScore),
      },
      weights,
    };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 0.01) return b.finalScore - a.finalScore;
    if (Math.abs(b.scores.control - a.scores.control) > 0.01) return b.scores.control - a.scores.control;
    return a.model.localeCompare(b.model);
  });

  // In-stock filter: walk the ranked list, take the first 3 racquets that
  // have direct product URLs at Tennis Express. Out-of-stock products
  // (PERCEPT 100, Black Ace 300, plus any future stock changes) stay in
  // scoring but are skipped for display so every shown recommendation
  // is shoppable. Defensive fallback: if fewer than 3 in-stock rackets
  // exist (effectively impossible with current 40-of-42 stocked), fall
  // through to the unfiltered list to guarantee the UI still gets 3.
  const inStock = scored.filter(isRacquetInStock);
  const racquetSource = inStock.length >= 3 ? inStock : scored;
  const topRacquets = racquetSource.slice(0, 3).map((r, i) => ({ ...r, top: i === 0, rank: i + 1 }));

  // Post-process: ensure each card has unique whyText
  // When frames are genuinely spec-identical (same beam, pattern, RA tier),
  // fall back to weight then swing weight to differentiate
  const seenTexts = new Set();
  topRacquets.forEach(rc => {
    if (seenTexts.has(rc.whyText)) {
      // Find the raw frame from RACQUET_DB to access all specs
      const raw = RACQUET_DB.find(f => f.brand === rc.brand && f.model === rc.model);
      if (raw) {
        const ntrpN = parseFloat(d.ntrp) || 3.5;
        const older = d.ageRange === "56-65" || d.ageRange === "66+";
        const injF  = injuryFactor ?? 0;
        // Build alternate sentences from weight and swing weight
        const altWeight = raw.weight >= 310
          ? `At ${raw.weight}g it carries more mass than the other picks, adding stability under pace.`
          : raw.weight >= 295
          ? `Its ${raw.weight}g weight sits in the middle of the pack -- predictable and easy to adjust to.`
          : `At ${raw.weight}g it is the lightest of the three options, making it the easiest to swing quickly.`;
        const altSW = raw.swingWeight >= 325
          ? `A swing weight of ${raw.swingWeight} gives it a planted, heavy feel at the baseline.`
          : raw.swingWeight >= 310
          ? `At ${raw.swingWeight} swing weight it has a slightly heavier feel through contact than most alternatives.`
          : `Its ${raw.swingWeight} swing weight makes it one of the more maneuverable options in the top three.`;
        // Pick whichever alt sentence doesn't duplicate
        const alt1 = rc.whyText.split(". ")[0] + ". " + altWeight;
        const alt2 = rc.whyText.split(". ")[0] + ". " + altSW;
        rc.whyText = seenTexts.has(alt1) ? alt2 : alt1;
      }
    }
    seenTexts.add(rc.whyText);
  });
  const strings = selectStrings(d, injuryFactor, painNumeric).slice(0, 3).map((s, i) => ({ ...s, top: i === 0 }));
  const tension = calcTension(d, painNumeric);
  const topRacquet = topRacquets[0];
  const topString = strings[0];
  const gripNote = (d.gripSize && d.gripSize !== "🤷" && d.gripSize !== "Not Sure")
    ? ` in grip size ${d.gripSize}` : "";
  const stringerScript = `I would like to string my ${topRacquet.model}${gripNote} with ${topString.name} at ${tension.low}-${tension.high} lbs, starting at ${tension.recommended} lbs.`;

  const setupParts = [];
  if (d.currentRacket && d.currentRacket.trim()) {
    setupParts.push(`Based on your current ${d.currentRacket.trim()} and your profile, here is what we recommend instead.`);
  }
  if (painNumeric >= 6) {
    setupParts.push(`Your pain level drove this recommendation -- we prioritised frames below RA ${SETTINGS.RA_HardGate_Cutoff} and arm-friendly strings.`);
  } else if (painNumeric >= 3) {
    setupParts.push(`With mild discomfort flagged, arm health weighted ${Math.round(injuryFactor * 100)}% of this recommendation.`);
  } else if (d.pastInjuryElbow === "Yes" || d.pastInjuryShoulder === "Yes" || d.pastInjuryWrist === "Yes") {
    setupParts.push(`Your injury history shifted recommendations toward lower-RA frames and arm-friendly strings as a preventive measure.`);
  }
  setupParts.push(`At ${d.ntrp || "your"} NTRP, playing ${d.playFrequency || "regularly"} as a ${d.playStyle || "all-court"} player, your top match scored ${Math.round(topRacquet.finalScore)}/100.`);
  const setupText = setupParts.join(" ");

  const allOverBudget = d.budget && d.budget !== "No preference" &&
    topRacquets.every(r => r.budgetFlag === "over-budget");

  return { racquets: topRacquets, allRacquets: scored, strings, tension,
           stringerScript, injuryFactor, painNumeric, setupText, weights, allOverBudget };
}

// === PERFORMANCE MODE PIPELINE ==============================================
// Mirrors the structure of the arm-health pipeline but uses the v4 scoring
// helpers. No pain processing, no injury factor, no risk penalties. The
// returned object shape matches arm-health mode exactly so the results page
// renders identically; injuryFactor is hardcoded to 0 and painNumeric to 0.

function generateRecommendationsPerformance(d) {
  const weights = performanceWeights(d);
  const ntrpNum = parseFloat(d.ntrp) || 3.5;

  const scored = RACQUET_DB.map(r => {
    const sub = performanceSubscores(r, d);
    const baseScore =
      sub.powerScore * weights.power +
      sub.controlScore * weights.control +
      sub.spinScore * weights.spin +
      sub.maneuverabilityScore * weights.maneuverability;

    const tierAdj = ntrpTierAdjustment(r, ntrpNum);
    const specialistBonus = categorySpecialistBonus(r, d.priorityFocus, ntrpNum);
    const armPenalty = antiComfortPenalty(r, d.priorityFocus);
    const ctrlEliteBonus = controlEliteBonus(r, d.priorityFocus);

    const finalScore = Math.max(0, baseScore + tierAdj + specialistBonus + armPenalty + ctrlEliteBonus);
    const strengths = topStrengths(sub);
    const budget = budgetFlag(r.price, d.budget);

    return {
      brand: r.brand, model: r.model, finalScore, performanceScore: baseScore,
      userRiskPenalty: 0, hardGatePenalty: 0, budgetFlag: budget,
      topStrengths: strengths, armFriendly: r.armFriendly, price: r.price,
      whyText: whyText(r, d, 0, 0),
      specs: {
        "HEAD SIZE": `${r.headSize} sq in`,
        "WEIGHT": `${r.weight}g`,
        "BALANCE": `${r.balance} pts HL`,
        "STIFFNESS": `RA ${r.ra ?? SETTINGS.BlankRA_Default}`,
        "PATTERN": `${r.mains}x${r.crosses}`,
        "PRICE": `$${r.price}`,
      },
      scores: {
        power: Math.round(sub.powerScore), control: Math.round(sub.controlScore),
        comfort: Math.round(sub.comfortScore), spin: Math.round(sub.spinScore),
        maneuverability: Math.round(sub.maneuverabilityScore),
      },
      weights,
    };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 0.01) return b.finalScore - a.finalScore;
    if (Math.abs(b.scores.control - a.scores.control) > 0.01) return b.scores.control - a.scores.control;
    return a.model.localeCompare(b.model);
  });

  // In-stock filter (same logic as arm-health mode)
  const inStock = scored.filter(isRacquetInStock);
  const racquetSource = inStock.length >= 3 ? inStock : scored;
  const topRacquets = racquetSource.slice(0, 3).map((r, i) => ({ ...r, top: i === 0, rank: i + 1 }));

  // Dedupe whyText
  const seenTexts = new Set();
  topRacquets.forEach(rc => {
    if (seenTexts.has(rc.whyText)) {
      const raw = RACQUET_DB.find(f => f.brand === rc.brand && f.model === rc.model);
      if (raw) {
        const altWeight = raw.weight >= 310
          ? `At ${raw.weight}g it carries more mass than the other picks, adding stability under pace.`
          : raw.weight >= 295
          ? `Its ${raw.weight}g weight sits in the middle of the pack — predictable and easy to adjust to.`
          : `At ${raw.weight}g it is the lightest of the three options, making it the easiest to swing quickly.`;
        const altSW = raw.swingWeight >= 325
          ? `A swing weight of ${raw.swingWeight} gives it a planted, heavy feel at the baseline.`
          : raw.swingWeight >= 310
          ? `At ${raw.swingWeight} swing weight it has a slightly heavier feel through contact than most alternatives.`
          : `Its ${raw.swingWeight} swing weight makes it one of the more maneuverable options in the top three.`;
        const alt1 = rc.whyText.split(". ")[0] + ". " + altWeight;
        const alt2 = rc.whyText.split(". ")[0] + ". " + altSW;
        rc.whyText = seenTexts.has(alt1) ? alt2 : alt1;
      }
    }
    seenTexts.add(rc.whyText);
  });

  const strings = selectStringsPerformance(d).slice(0, 3).map((s, i) => ({ ...s, top: i === 0 }));
  const tension = tensionRangePerformance(d);

  const topRacquet = topRacquets[0];
  const topString = strings[0];
  const gripNote = (d.gripSize && d.gripSize !== "🤷" && d.gripSize !== "Not Sure")
    ? ` in grip size ${d.gripSize}` : "";
  const stringerScript = `I would like to string my ${topRacquet.model}${gripNote} with ${topString.name} at ${tension.low}-${tension.high} lbs, starting at ${tension.recommended} lbs.`;

  // Performance-mode setupText: no pain language, focuses on style/level fit
  const setupParts = [];
  if (d.currentRacket && d.currentRacket.trim()) {
    setupParts.push(`Based on your current ${d.currentRacket.trim()} and your stated priorities, here is the recommended setup.`);
  }
  const priorityNote = d.priorityFocus && d.priorityFocus !== "Balanced"
    ? ` Your ${d.priorityFocus.toLowerCase()} priority drove this ranking.` : "";
  setupParts.push(`At ${d.ntrp || "your"} NTRP, playing ${d.playFrequency || "regularly"} as a ${d.playStyle || "all-court"} player, your top match scored ${Math.round(topRacquet.finalScore)}/100.${priorityNote}`);
  const setupText = setupParts.join(" ");

  const allOverBudget = d.budget && d.budget !== "No preference" &&
    topRacquets.every(r => r.budgetFlag === "over-budget");

  return { racquets: topRacquets, allRacquets: scored, strings, tension,
           stringerScript, injuryFactor: 0, painNumeric: 0, setupText, weights, allOverBudget };
}

// --- CONSTANTS ----------------------------------------------------------------

const REQUIRED = {
  1: ["name", "email", "ageRange", "ntrp"],
  2: ["playStyle", "playFrequency", "swingSpeed", "priorityFocus"],
  3: ["painSeverity", "comfortVsPerf", "stringType"],
  4: [],
};
// Fields in Step 3 only validated when arm-health mode (performance mode skips step 3)
const STEP3_ARMHEALTH_ONLY = ["painSeverity", "comfortVsPerf", "stringType"];

const PHASES_ARMHEALTH = [
  "Reading your profile",
  "Scoring 42 frames",
  "Weighing arm health",
  "Matching strings",
  "Building your setup",
];

const PHASES_PERFORMANCE = [
  "Reading your profile",
  "Scoring 42 frames",
  "Applying your priority focus",
  "Matching strings",
  "Building your setup",
];

// Backwards-compat: legacy PHASES reference defaults to arm-health phases
const PHASES = PHASES_ARMHEALTH;

const FACTS = [
  "String tension affects arm stress more than frame stiffness in most cases.",
  "A 10g weight difference is noticeable to most players after an hour of play.",
  "RA (stiffness) above 66 significantly increases vibration transmission to the arm.",
  "Natural gut absorbs shock 30% better than the best synthetic alternatives.",
  "Head-light balance reduces arm stress by shifting weight away from impact.",
];

// --- CSS ----------------------------------------------------------------------

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

/* -- DESIGN TOKENS ------------------------------------------------- */
:root {
  --navy: #0D1B2A; --navy-mid: #162436; --navy-light: #1E3450;
  --clay: #C8522A; --clay-bright: #E06030; --clay-pale: #FDF0EB;
  --cream: #FAF7F2; --cream-dark: #F2EDE6; --white: #FFFFFF;
  --ink: #0D1B2A; --mid: #3D5068; --light: #6B8099; --border: #E0D8D0;
  --red: #E85454; --gold: #C49A3C;
  --sel-bg: #FDF0EB; --sel-border: #C8522A;
  --sh-sm: 0 2px 12px rgba(13,27,42,0.07);
  --sh-md: 0 6px 24px rgba(13,27,42,0.13);
  --safe-t: env(safe-area-inset-top, 0px);
  --safe-b: env(safe-area-inset-bottom, 0px);

  /* Type scale */
  --text-micro: 9px;
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   17px;
  --text-lg:   22px;
  --text-xl:   28px;
  --text-2xl:  44px;
  --text-3xl:  52px;

  /* Spacing scale (8px base) */
  --sp-1:  4px;
  --sp-2:  8px;
  --sp-3:  12px;
  --sp-4:  16px;
  --sp-5:  20px;
  --sp-6:  24px;
  --sp-7:  28px;
  --sp-8:  32px;
}

/* -- RESET --------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
input, select, textarea { font-size: 16px !important; }

/* -- APP SHELL ----------------------------------------------------- */
.pr-app { font-family: 'Outfit', sans-serif; background: var(--cream); min-height: 100vh; max-width: 480px; margin: 0 auto; position: relative; overflow-x: hidden; }
.f-col-panel { display: none; }

/* -- ARM HEALTH STRIP (mobile step 3, sits above f-foot) -- */
.arm-strip { position: fixed; bottom: calc(96px + var(--safe-b)); left: 50%; transform: translateX(-50%); width: calc(100% - var(--sp-5) * 2); max-width: calc(480px - var(--sp-5) * 2); background: var(--navy); border: 1px solid rgba(200,82,42,0.3); border-radius: 12px; padding: var(--sp-3) var(--sp-4) var(--sp-2); z-index: 39; box-shadow: 0 4px 24px rgba(13,27,42,0.3); }
.arm-strip-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--sp-2); }
.arm-strip-lbl { font-family: 'Outfit', sans-serif; font-size: var(--text-md); font-weight: 700; letter-spacing: 0.01em; color: var(--white); }
.arm-strip-pct { font-family: 'Bebas Neue', sans-serif; font-size: 34px; line-height: 1; transition: color 0.4s ease; animation: pctPulse 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes pctPulse { from { transform: scale(0.92); opacity: 0.6; } to { transform: scale(1); opacity: 1; } }
.arm-strip-track { height: 6px; background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden; margin-bottom: var(--sp-2); }
.arm-strip-fill { height: 100%; border-radius: 6px; transition: width 0.55s cubic-bezier(0.4,0,0.2,1); }
.arm-strip-msg { font-size: var(--text-xs); color: var(--white); opacity: 0.45; line-height: 1.4; }

@media (min-width: 900px) {
  /* Desktop strategy: keep the polished mobile experience for form and
     results, just centered on the screen with a subtle background wash.
     Landing page is unaffected — it has its own .landing-page styling
     that overrides this and uses the full viewport width. */
  body { background: var(--cream-dark); }
  .pr-app { background: var(--cream); box-shadow: 0 0 0 1px rgba(13,27,42,0.04), 0 8px 40px rgba(13,27,42,0.06); }
  .arm-strip { display: none; }
  .f-col-panel { display: none; }
}

/* -- ANIMATIONS ---------------------------------------------------- */
.screen { animation: screenIn 0.35s cubic-bezier(0.34,1.2,0.64,1) both; }
@keyframes screenIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
.slide-left  { animation: slideL 0.28s cubic-bezier(0.4,0,0.2,1) both; }
.slide-right { animation: slideR 0.28s cubic-bezier(0.4,0,0.2,1) both; }
@keyframes slideL { from { opacity:0; transform:translateX(32px); } to { opacity:1; transform:translateX(0); } }
@keyframes slideR { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
@keyframes shake  { 10%,90%{transform:translateX(-2px);} 20%,80%{transform:translateX(4px);} 30%,50%,70%{transform:translateX(-5px);} 40%,60%{transform:translateX(5px);} }
.shake { animation: shake 0.38s cubic-bezier(0.36,0.07,0.19,0.97) both; }

/* -- FORM SHELL ---------------------------------------------------- */
.ferr { font-size: var(--text-xs); color: var(--red); font-weight: 600; margin-top: var(--sp-2); display: flex; align-items: center; gap: var(--sp-1); }
.inp-err { border-color: var(--red) !important; }
.f-shell { min-height: 100vh; background: var(--cream); display: flex; flex-direction: column; }
.f-hdr { background: var(--navy); padding: calc(var(--sp-4) + var(--safe-t)) var(--sp-5) 0; position: sticky; top: 0; z-index: 50; }
.f-hdr-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-3); }
.step-lbl { font-family: 'DM Mono', monospace; font-size: var(--text-xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--clay); }
.step-pct { font-size: var(--text-xs); font-weight: 600; color: rgba(255,255,255,0.4); }
.tab-nav { display: flex; }
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--sp-1); padding: var(--sp-2) var(--sp-1) var(--sp-3); cursor: pointer; border-bottom: 2px solid transparent; transition: border-color 0.2s; }
.tab.active { border-bottom-color: var(--clay); }
.tab.done   { border-bottom-color: rgba(200,82,42,0.35); }
.tab-e { font-size: var(--sp-4); }
.tab-t { font-size: var(--text-micro); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.35); white-space: nowrap; }
.tab.active .tab-t { color: var(--clay); }
.tab.done   .tab-t { color: rgba(200,82,42,0.6); }
.f-body { flex: 1; padding: var(--sp-6) var(--sp-5) 140px; overflow-y: auto; -webkit-overflow-scrolling: touch; }

/* -- FORM TYPOGRAPHY ----------------------------------------------- */
.step-title { font-family: 'Bebas Neue', sans-serif; font-size: var(--text-2xl); letter-spacing: 0.02em; color: var(--ink); line-height: 1; margin-bottom: var(--sp-2); padding-bottom: var(--sp-2); border-bottom: 2px solid var(--clay); display: inline-block; }
.step-sub   { font-size: var(--text-sm); font-weight: 300; color: var(--mid); margin-bottom: var(--sp-8); line-height: 1.6; }
.scard { background: var(--white); border-radius: 16px; padding: var(--sp-5); margin-bottom: var(--sp-4); box-shadow: 0 4px 20px rgba(13,27,42,0.10); border: 1px solid var(--cream-dark); }
.shd   { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-5); padding-bottom: var(--sp-3); border-bottom: 1px solid var(--border); }
.shd-e { font-size: var(--text-lg); }
.shd-t { font-size: var(--text-md); font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
.field { margin-bottom: var(--sp-5); }
.field:last-child { margin-bottom: 0; }
.flbl  { font-size: var(--text-base); font-weight: 700; color: var(--ink); margin-bottom: var(--sp-2); display: flex; align-items: center; gap: var(--sp-2); }
.fopt  { font-size: var(--text-xs); font-weight: 400; color: var(--mid); }
.req   { color: var(--red); }
.fhint { font-size: var(--text-xs); color: var(--light); margin-bottom: var(--sp-2); line-height: 1.5; }

/* -- FORM INPUTS --------------------------------------------------- */
.ti { width: 100%; background: var(--cream); border: 1.5px solid var(--border); border-radius: 10px; padding: var(--sp-3) var(--sp-4); font-family: 'Outfit', sans-serif; font-size: var(--text-base); color: var(--ink); outline: none; transition: border-color 0.2s, background 0.2s; -webkit-appearance: none; }
.ti:focus { border-color: var(--clay); background: var(--white); }
.ti::placeholder { color: var(--light); }
textarea.ti { resize: none; min-height: 96px; line-height: 1.6; }
select.ti { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238A9BB0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; cursor: pointer; }

/* -- OPTION COMPONENTS --------------------------------------------- */
.go { background: var(--white); border: 1.5px solid var(--border); border-radius: 12px; padding: var(--sp-4) var(--sp-2); display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); cursor: pointer; text-align: center; position: relative; transition: all 0.15s; -webkit-tap-highlight-color: transparent; box-shadow: 0 1px 4px rgba(13,27,42,0.05); }
.go:hover { border-color: rgba(200,82,42,0.4); }
.go:active { transform: scale(0.96); }
.go.sel { background: var(--sel-bg); border-color: var(--sel-border); transform: scale(1.03); box-shadow: 0 0 0 3px rgba(200,82,42,0.18); }
.go-e { font-size: var(--sp-6); }
.go-l { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
.go.sel .go-l { color: var(--clay-bright); }

.lo { background: var(--white); border: 1.5px solid var(--border); border-radius: 12px; padding: var(--sp-4) var(--sp-4); display: flex; align-items: center; gap: var(--sp-3); cursor: pointer; margin-bottom: var(--sp-3); position: relative; transition: all 0.15s; -webkit-tap-highlight-color: transparent; box-shadow: 0 1px 4px rgba(13,27,42,0.05); }
.lo:last-child { margin-bottom: 0; }
.lo:hover { border-color: rgba(200,82,42,0.4); }
.lo.sel { background: var(--sel-bg); border-color: var(--sel-border); box-shadow: 0 0 0 3px rgba(200,82,42,0.14); }
.lo-e { font-size: 24px; flex-shrink: 0; }
.lo-stripe { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
.lo-stripe.c-clay { background: var(--clay); }
.lo-stripe.c-gold { background: var(--gold); }
.lo-stripe.c-blue { background: var(--navy-light); }
.lo-c { flex: 1; }
.lo-t { font-size: var(--text-base); font-weight: 700; color: var(--ink); margin-bottom: 2px; }
.lo.sel .lo-t { color: var(--clay-bright); }
.lo-d { font-size: var(--text-xs); color: var(--mid); line-height: 1.4; }

.co { background: var(--white); border: 1.5px solid var(--border); border-radius: 16px; padding: var(--sp-5) var(--sp-4); display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); cursor: pointer; margin-bottom: var(--sp-3); text-align: center; position: relative; transition: all 0.15s; -webkit-tap-highlight-color: transparent; box-shadow: 0 1px 4px rgba(13,27,42,0.05); }
.co.sel { background: var(--sel-bg); border-color: var(--sel-border); box-shadow: 0 0 0 3px rgba(200,82,42,0.14); }
.cdot { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--text-lg); }
.co-t { font-size: var(--text-md); font-weight: 700; color: var(--ink); }
.co.sel .co-t { color: var(--clay-bright); }
.co-d { font-size: var(--text-sm); color: var(--mid); }

.chk { position: absolute; top: var(--sp-2); right: var(--sp-2); width: 18px; height: 18px; background: var(--clay); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--navy); font-weight: 900; animation: chkPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes chkPop { from { opacity:0; transform:scale(0.3); } to { opacity:1; transform:scale(1); } }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
.callout { border-radius: 12px; padding: var(--sp-3) var(--sp-4); margin-top: var(--sp-3); display: flex; align-items: flex-start; gap: var(--sp-2); }
.callout.amber { background: rgba(240,184,64,0.08); border: 1px solid rgba(240,184,64,0.25); }
.callout.blue  { background: rgba(200,82,42,0.05); border: 1px solid rgba(200,82,42,0.15); }
.c-ico { font-size: var(--sp-5); flex-shrink: 0; margin-top: 1px; }
.c-txt { font-size: var(--text-sm); line-height: 1.5; }
.callout.amber .c-txt { color: #8A6010; }
.callout.blue  .c-txt { color: var(--navy-light); }

/* -- GOAL CHIPS ---------------------------------------------------- */
.gchips { display: flex; flex-direction: column; gap: var(--sp-2); }
.gchip { background: var(--cream); border: 1.5px solid var(--border); border-radius: 10px; padding: var(--sp-3) var(--sp-4); display: flex; align-items: center; gap: var(--sp-2); cursor: pointer; font-size: var(--text-sm); color: var(--mid); font-weight: 500; transition: all 0.15s; -webkit-tap-highlight-color: transparent; }
.gchip:hover { border-color: var(--clay); color: var(--ink); background: var(--sel-bg); }
.gchip.sel { background: var(--sel-bg); border-color: var(--sel-border); color: var(--clay-bright); box-shadow: 0 0 0 3px rgba(200,82,42,0.14); }
.gchip.sel .gchip-check { display: flex; }
.gchip-check { display: none; width: 18px; height: 18px; background: var(--clay); border-radius: 50%; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 900; flex-shrink: 0; }
.gchip-stripe { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
.gchip-stripe.c-clay { background: var(--clay); }
.gchip-stripe.c-gold { background: var(--gold); }
.gchip-stripe.c-blue { background: var(--navy-light); }

/* -- FOOTER NAV ---------------------------------------------------- */
.f-foot { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: linear-gradient(to top, var(--cream) 72%, transparent); padding: var(--sp-4) var(--sp-5) calc(var(--sp-5) + var(--safe-b)); display: flex; gap: var(--sp-3); z-index: 40; }
.btn-back { background: var(--white); border: 1.5px solid var(--border); border-radius: 12px; padding: var(--sp-4) var(--sp-5); font-family: 'Outfit', sans-serif; font-size: var(--text-sm); font-weight: 600; color: var(--mid); cursor: pointer; transition: all 0.18s; display: flex; align-items: center; gap: var(--sp-2); -webkit-tap-highlight-color: transparent; }
.btn-back:hover { border-color: var(--clay); color: var(--ink); }
.btn-next { flex: 1; background: var(--clay); border: none; border-radius: 12px; padding: var(--sp-4) var(--sp-5); font-family: 'Outfit', sans-serif; font-size: var(--text-base); font-weight: 700; color: var(--white); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: var(--sp-2); box-shadow: 0 4px 16px rgba(200,82,42,0.3); transition: all 0.18s; -webkit-tap-highlight-color: transparent; }
.btn-next:hover { background: var(--clay-bright); transform: translateY(-1px); }
.btn-next:active { transform: translateY(0); }

/* -- LOADING SCREEN ------------------------------------------------ */
.loading { min-height: 100vh; background: var(--navy); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--sp-8) var(--sp-6); text-align: center; position: relative; overflow: hidden; }

/* Ambient background glow behind radar */
.l-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -60%); width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle, rgba(200,82,42,0.18) 0%, rgba(200,82,42,0.04) 55%, transparent 75%); pointer-events: none; }

/* Greeting line */
.l-greeting { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.22em; text-transform: uppercase; color: rgba(200,82,42,0.7); margin-bottom: var(--sp-6); }

/* Radar - enlarged and more prominent */
.radar { position: relative; width: 180px; height: 180px; margin-bottom: var(--sp-7); flex-shrink: 0; }
.rring { position: absolute; border-radius: 50%; top: 50%; left: 50%; }
.rring:nth-child(1) { width: 44px;  height: 44px;  border: 1.5px solid rgba(200,82,42,0.9); animation: rpulse 2.4s ease-out infinite; animation-delay: 0s; }
.rring:nth-child(2) { width: 88px;  height: 88px;  border: 1.5px solid rgba(200,82,42,0.6); animation: rpulse 2.4s ease-out infinite; animation-delay: 0.5s; }
.rring:nth-child(3) { width: 132px; height: 132px; border: 1.5px solid rgba(200,82,42,0.35); animation: rpulse 2.4s ease-out infinite; animation-delay: 1.0s; }
.rring:nth-child(4) { width: 176px; height: 176px; border: 1px solid rgba(200,82,42,0.15); animation: rpulse 2.4s ease-out infinite; animation-delay: 1.5s; }
@keyframes rpulse { 0% { opacity: 1; transform: translate(-50%,-50%) scale(0.82); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1); } }

/* Center dot - pulsing */
.rdot { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 16px; height: 16px; background: var(--clay); border-radius: 50%; box-shadow: 0 0 0 4px rgba(200,82,42,0.2), 0 0 16px rgba(200,82,42,0.5); animation: dotPulse 2.4s ease-in-out infinite; }
@keyframes dotPulse { 0%,100% { box-shadow: 0 0 0 4px rgba(200,82,42,0.2), 0 0 16px rgba(200,82,42,0.4); } 50% { box-shadow: 0 0 0 8px rgba(200,82,42,0.1), 0 0 28px rgba(200,82,42,0.6); } }

/* Phase cycling text */
.l-phase-wrap { height: 40px; display: flex; align-items: center; justify-content: center; margin-bottom: var(--sp-2); overflow: hidden; }
.l-phase { font-family: 'Bebas Neue', sans-serif; font-size: var(--text-xl); letter-spacing: 0.08em; color: var(--white); line-height: 1; transition: opacity 0.25s ease, transform 0.25s ease; }
.l-phase.fade { opacity: 0; transform: translateY(6px); }

/* Step indicator dots */
.l-steps { display: flex; gap: var(--sp-2); align-items: center; justify-content: center; margin-bottom: var(--sp-6); }
.l-step-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: all 0.3s ease; }
.l-step-dot.active { background: var(--clay); transform: scale(1.3); box-shadow: 0 0 6px rgba(200,82,42,0.6); }
.l-step-dot.done   { background: rgba(200,82,42,0.4); }

/* Progress bar */
.l-prog-track { width: 100%; max-width: 240px; height: 2px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-bottom: var(--sp-7); }
.l-prog-fill  { height: 100%; border-radius: 2px; transition: width 0.4s cubic-bezier(0.4,0,0.2,1); background: linear-gradient(to right, var(--clay), var(--clay-bright)); }

/* Divider */
.l-divider { width: 40px; height: 1px; background: rgba(255,255,255,0.08); margin-bottom: var(--sp-6); }

/* Fact card */
.l-fact { max-width: 300px; transition: opacity 0.35s ease; }
.l-fact.fade { opacity: 0; }
.l-fact-lbl { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.18em; text-transform: uppercase; color: rgba(200,82,42,0.6); margin-bottom: var(--sp-2); }
.l-fact-txt { font-size: var(--text-sm); font-style: italic; color: rgba(255,255,255,0.35); line-height: 1.7; font-weight: 300; }

/* -- RESULTS SCREEN ------------------------------------------------ */
.results { min-height: 100vh; background: var(--cream); }
.r-hdr { background: var(--navy); padding: calc(var(--sp-5) + var(--safe-t)) var(--sp-5) var(--sp-7); text-align: center; }
.r-check { width: 52px; height: 52px; background: var(--clay); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--sp-4); font-size: var(--sp-6); animation: chkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both 0.1s; }
.r-title { font-family: 'Bebas Neue', sans-serif; font-size: var(--text-xl); letter-spacing: 0.04em; color: var(--white); margin-bottom: var(--sp-2); }
.r-sub   { font-size: var(--text-sm); color: rgba(255,255,255,0.45); font-weight: 300; }
.r-body  { padding: var(--sp-5); }

.setup-sum { background: var(--navy); border-radius: 16px; padding: var(--sp-5); margin-bottom: var(--sp-5); }
.setup-lbl { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.18em; text-transform: uppercase; color: var(--clay); margin-bottom: var(--sp-2); }
.setup-txt { font-size: var(--text-sm); color: rgba(255,255,255,0.65); line-height: 1.7; font-weight: 300; }

.t-card { background: var(--white); border-radius: 16px; padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-4); box-shadow: var(--sh-sm); display: flex; align-items: center; gap: var(--sp-4); border-left: 3px solid var(--gold); }
.t-lbl  { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.15em; text-transform: uppercase; color: var(--light); margin-bottom: var(--sp-1); }
.t-val  { font-family: 'Bebas Neue', sans-serif; font-size: var(--text-xl); letter-spacing: 0.03em; color: var(--gold); line-height: 1; margin-bottom: 2px; }
.t-hint { font-size: var(--text-xs); color: var(--mid); line-height: 1.5; }

.r-sec-hdr { display: flex; align-items: center; gap: var(--sp-2); margin: var(--sp-6) 0 var(--sp-3); }
.r-sec-e   { font-size: var(--text-lg); }
.r-sec-t   { font-family: 'Bebas Neue', sans-serif; font-size: var(--text-lg); letter-spacing: 0.04em; color: var(--ink); }

.sec-divider { display: flex; align-items: center; gap: var(--sp-4); margin: var(--sp-8) 0 var(--sp-6); }

/* -- ARM HEALTH METER (Step 3) -- */
.arm-meter-card { background: linear-gradient(135deg, rgba(200,82,42,0.08) 0%, rgba(200,82,42,0.03) 100%); border: 1px solid rgba(200,82,42,0.2); border-radius: 16px; padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-5); }
.arm-meter-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-3); margin-bottom: var(--sp-3); }
.arm-meter-label { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.16em; text-transform: uppercase; color: var(--clay); margin-bottom: var(--sp-1); }
.arm-meter-msg { font-size: var(--text-xs); color: var(--mid); line-height: 1.5; max-width: 260px; }
.arm-meter-pct { font-family: 'Bebas Neue', sans-serif; font-size: 44px; line-height: 1; flex-shrink: 0; transition: color 0.4s ease; }
.arm-meter-track { height: 6px; background: rgba(200,82,42,0.12); border-radius: 6px; overflow: hidden; margin-bottom: var(--sp-2); }
.arm-meter-fill { height: 100%; border-radius: 6px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1), background 0.4s ease; }
.arm-meter-legend { display: flex; justify-content: space-between; font-family: 'DM Mono', monospace; font-size: var(--text-micro); color: rgba(200,82,42,0.4); }

/* -- ARM HEALTH IMPACT CARD (Results) -- */
.arm-impact-card { background: linear-gradient(135deg, rgba(200,82,42,0.1) 0%, rgba(200,82,42,0.04) 100%); border: 1px solid rgba(200,82,42,0.25); border-radius: 16px; padding: var(--sp-4) var(--sp-5); margin-bottom: var(--sp-4); }
.arm-impact-top { display: flex; align-items: flex-start; gap: var(--sp-3); margin-bottom: var(--sp-3); }
.arm-impact-shield { font-size: 28px; flex-shrink: 0; }
.arm-impact-title { font-size: var(--text-sm); font-weight: 700; color: var(--clay-bright); margin-bottom: var(--sp-1); }
.arm-impact-sub { font-size: var(--text-xs); color: var(--mid); line-height: 1.5; }
.arm-impact-bar-track { height: 4px; background: rgba(200,82,42,0.12); border-radius: 4px; overflow: hidden; }
.arm-impact-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(to right, var(--clay), var(--clay-bright)); }

.sec-divider-line { flex: 1; height: 1px; background: var(--border); }
.sec-divider-label { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.18em; text-transform: uppercase; color: var(--light); white-space: nowrap; }

.rcard     { background: var(--white); border-radius: 16px; padding: var(--sp-4); margin-bottom: var(--sp-3); box-shadow: var(--sh-sm); border: 1.5px solid var(--border); opacity: 0.92; }
.rcard.top { border-color: var(--clay); border-width: 2px; background: linear-gradient(160deg,#FEF6F2 0%,var(--white) 55%); box-shadow: 0 8px 32px rgba(200,82,42,0.14); opacity: 1; padding: var(--sp-5); }
.rc-hdr    { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--sp-3); gap: var(--sp-2); }
.rc-name   { font-size: var(--text-md); font-weight: 700; color: var(--ink); line-height: 1.25; }
.rcard.top .rc-name { font-size: 20px; }
.rec-badge { background: var(--clay); color: var(--white); font-size: var(--text-micro); font-weight: 700; padding: 3px var(--sp-2); border-radius: 100px; letter-spacing: 0.05em; display: inline-block; margin-bottom: var(--sp-2); }
.rcard:not(.top) .rec-badge { background: var(--navy-light); color: rgba(255,255,255,0.7); }
.rc-rank        { font-size: var(--text-xl); font-family: 'Bebas Neue', sans-serif; color: var(--border); }
.rcard.top .rc-rank { color: rgba(200,82,42,0.25); font-size: 36px; }
.rc-score-big   { font-family: 'Bebas Neue', sans-serif; font-size: var(--text-3xl); letter-spacing: 0.02em; color: var(--clay); line-height: 1; }
.rc-score-big span { font-size: var(--text-base); color: var(--light); font-family: 'Outfit', sans-serif; font-weight: 400; letter-spacing: 0; margin-left: 2px; }

.specs     { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.spec-lbl  { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.12em; text-transform: uppercase; color: var(--light); margin-bottom: 2px; }
.spec-val  { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }

.r-tags    { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.r-tag     { background: var(--clay-pale); color: var(--clay-bright); font-size: var(--text-xs); font-weight: 600; padding: 3px var(--sp-2); border-radius: 100px; letter-spacing: 0.03em; }
.rcard:not(.top) .r-tag { background: rgba(13,27,42,0.05); color: var(--mid); }

.r-why     { background: var(--cream-dark); border-radius: 10px; padding: var(--sp-3); margin-bottom: var(--sp-3); }
.r-why-l   { font-size: var(--text-xs); font-weight: 700; color: var(--clay-bright); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: var(--sp-1); }
.r-why-t   { font-size: var(--text-sm); color: var(--mid); line-height: 1.6; }
.rcard:not(.top) .r-why { background: rgba(13,27,42,0.03); }

.shop-btn  { width: 100%; background: var(--clay); border: 2px solid var(--clay); border-radius: 12px; padding: var(--sp-3) var(--sp-5); font-family: 'Outfit', sans-serif; font-size: var(--text-sm); font-weight: 700; color: var(--white); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: var(--sp-2); transition: all 0.18s; -webkit-tap-highlight-color: transparent; }
.shop-btn:hover  { background: var(--clay-bright); border-color: var(--clay-bright); transform: translateY(-1px); }
.shop-btn.secondary { background: transparent; color: var(--clay); }
.shop-btn.secondary:hover { background: var(--clay-pale); border-color: var(--clay); transform: translateY(-1px); }

.str-block  { background: var(--navy); border-radius: 16px; padding: var(--sp-5); margin-bottom: var(--sp-5); }
.str-lbl    { font-family: 'DM Mono', monospace; font-size: var(--text-micro); letter-spacing: 0.18em; text-transform: uppercase; color: var(--clay); margin-bottom: var(--sp-2); }
.str-script { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: var(--sp-4); font-size: var(--text-sm); color: rgba(255,255,255,0.65); line-height: 1.7; font-style: italic; }

.restart-btn { width: 100%; background: var(--white); border: 1.5px solid var(--border); border-radius: 12px; padding: var(--sp-4) var(--sp-5); font-family: 'Outfit', sans-serif; font-size: var(--text-sm); font-weight: 600; color: var(--mid); cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: var(--sp-2); margin-bottom: calc(var(--sp-8) + var(--safe-b)); -webkit-tap-highlight-color: transparent; }
.restart-btn:hover { border-color: var(--clay); color: var(--ink); }

/* ===== MODE SELECT SCREEN — navy tile editorial luxe ===== */
.ms-wrap { min-height: 100vh; background: var(--cream-dark); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: max(80px, calc(60px + var(--safe-t))) 32px calc(80px + var(--safe-b)); position: relative; }
.ms-back { position: absolute; top: max(24px, calc(24px + var(--safe-t))); left: 32px; background: transparent; border: none; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mid); cursor: pointer; padding: 8px 12px; border-radius: 6px; transition: color 0.15s; -webkit-tap-highlight-color: transparent; }
.ms-back:hover { color: var(--clay); }

.ms-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--clay); font-weight: 700; margin-bottom: 22px; text-align: center; }
.ms-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(40px, 6vw, 60px); font-weight: 500; color: var(--navy); line-height: 1.05; letter-spacing: -0.025em; margin-bottom: 16px; text-align: center; max-width: 720px; }
.ms-title em { font-style: italic; color: var(--clay); font-weight: 400; }
.ms-sub { font-size: 15px; color: var(--mid); line-height: 1.7; text-align: center; max-width: 460px; margin-bottom: 24px; font-weight: 300; }

/* Magazine-style divider */
.ms-divider { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 48px; width: 100%; max-width: 200px; }
.ms-divider::before, .ms-divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }
.ms-divider-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--clay); flex-shrink: 0; }

/* Tile grid */
.ms-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; width: 100%; max-width: 920px; }
@media (max-width: 760px) { .ms-tiles { grid-template-columns: 1fr; gap: 18px; max-width: 480px; } }

/* Navy tile — solid brand-blue surface with cream content */
.ms-tile { background: var(--navy); border: 1px solid var(--navy-light); border-radius: 14px; padding: 36px 32px 30px; cursor: pointer; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; text-align: left; font-family: inherit; -webkit-tap-highlight-color: transparent; box-shadow: 0 4px 16px rgba(13,27,42,0.10); display: flex; flex-direction: column; min-height: 320px; }
@media (max-width: 760px) { .ms-tile { padding: 32px 26px 26px; min-height: 280px; } }

/* Gold thread on hover — sweeps across top edge */
.ms-tile::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gold); transform: scaleX(0); transform-origin: left; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.ms-tile:hover::before { transform: scaleX(1); }
.ms-tile:hover { border-color: var(--clay); transform: translateY(-3px); box-shadow: 0 16px 40px rgba(13,27,42,0.20); }

/* Chapter numeral — large italic terracotta against navy */
.ms-tile-numeral { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 400; font-size: 52px; color: var(--clay); line-height: 1; letter-spacing: -0.02em; margin-bottom: 10px; opacity: 0.95; transition: opacity 0.3s; }
.ms-tile:hover .ms-tile-numeral { opacity: 1; }

.ms-tile-eyebrow { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(250,247,242,0.55); font-weight: 600; margin-bottom: 8px; }
.ms-tile-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 500; color: var(--cream); line-height: 1.1; margin-bottom: 14px; letter-spacing: -0.02em; }
@media (max-width: 760px) { .ms-tile-title { font-size: 28px; } }

/* Thin rule between title and bullets */
.ms-tile-rule { width: 32px; height: 1px; background: var(--clay); margin-bottom: 18px; transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.ms-tile:hover .ms-tile-rule { width: 56px; }

/* Bullets — tighter, refined */
.ms-tile-bullets { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.ms-tile-bullet { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: rgba(250,247,242,0.78); line-height: 1.55; font-weight: 300; }
.ms-tile-bullet-mark { color: var(--gold); font-weight: 700; flex-shrink: 0; line-height: 1.55; font-size: 14px; }

/* CTA — refined monospace */
.ms-tile-cta { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--clay); font-weight: 700; transition: gap 0.2s, letter-spacing 0.2s; display: inline-flex; align-items: center; gap: 8px; margin-top: 24px; }
.ms-tile:hover .ms-tile-cta { gap: 14px; letter-spacing: 0.28em; color: var(--clay-bright); }
.ms-tile-cta-arrow { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.ms-tile:hover .ms-tile-cta-arrow { transform: translateX(4px); }
`;


const landingCss = `
  .landing-page { background: var(--cream); font-family: 'Outfit', sans-serif; max-width: 100%; overflow-x: hidden; }
  .landing-page::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 900; opacity: 0.4; }
  .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; background: rgba(13,27,42,0.93); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
  .lp-logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--white); letter-spacing: 0.02em; }
  .lp-logo span { color: var(--clay-bright); font-style: italic; }
  .lp-footer-logo { font-size: 20px; display: block; margin-bottom: 12px; }
  .lp-nav-links { display: flex; align-items: center; gap: 32px; list-style: none; }
  .lp-nav-links a { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); text-decoration: none; transition: color 0.2s; }
  .lp-nav-links a:hover { color: var(--white); }
  .lp-nav-cta { background: var(--clay); color: var(--white); border: none; border-radius: 6px; padding: 10px 20px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .lp-nav-cta:hover { background: var(--clay-bright); }
  @media (max-width: 600px) { .lp-nav-links { display: none; } .lp-nav { padding: 16px 20px; } }
  .lp-hero { min-height: 100vh; background: var(--navy); position: relative; display: flex; align-items: center; overflow: hidden; padding: max(120px, calc(80px + var(--safe-t))) 48px 100px; }
  @media (max-width: 600px) { .lp-hero { padding: max(100px, calc(70px + var(--safe-t))) 24px 80px; } }
  .lp-court { position: absolute; inset: 0; opacity: 0.06; pointer-events: none; }
  .lp-court svg { width: 100%; height: 100%; }
  .lp-hero-inner { position: relative; z-index: 2; width: 100%; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 420px; gap: 64px; align-items: center; }
  @media (max-width: 900px) { .lp-hero-inner { grid-template-columns: 1fr; gap: 48px; } }
  .lp-hero-content { max-width: 580px; }

  /* Phone mockup frame */
  .lp-mockup-phone { position: relative; z-index: 2; animation: lp-phoneIn 0.7s 0.3s cubic-bezier(0.34,1.2,0.64,1) both; }
  @keyframes lp-phoneIn { from { opacity: 0; transform: translateY(32px) rotate(1deg); } to { opacity: 1; transform: translateY(0) rotate(0deg); } }
  @media (max-width: 900px) { .lp-mockup-phone { display: none; } }
  .lp-phone-frame { background: #1A2535; border-radius: 40px; padding: 14px; box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04); position: relative; }
  .lp-phone-notch { width: 80px; height: 8px; background: #0D1B2A; border-radius: 100px; margin: 0 auto 10px; }
  .lp-phone-screen { background: var(--cream); border-radius: 28px; overflow: hidden; }
  .lp-phone-status { background: var(--navy); padding: 10px 18px 14px; display: flex; justify-content: space-between; align-items: center; }
  .lp-phone-status-title { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 0.04em; color: var(--white); }
  .lp-phone-status-sub { font-size: 9px; color: rgba(255,255,255,0.4); }
  .lp-phone-check { width: 28px; height: 28px; background: var(--clay); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; }
  .lp-phone-body { padding: 14px; background: var(--cream); }

  /* Mockup racquet card */
  .lp-mc { background: var(--white); border-radius: 14px; padding: 14px; margin-bottom: 10px; border: 2px solid var(--clay); box-shadow: 0 6px 20px rgba(200,82,42,0.14); }
  .lp-mc-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
  .lp-mc-badge { background: var(--clay); color: var(--white); font-size: 8px; font-weight: 700; padding: 3px 8px; border-radius: 100px; letter-spacing: 0.05em; display: inline-block; margin-bottom: 4px; }
  .lp-mc-name { font-size: 13px; font-weight: 700; color: var(--ink); line-height: 1.2; }
  .lp-mc-rank { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--clay); line-height: 1; }
  .lp-mc-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
  .lp-mc-spec-lbl { font-family: 'DM Mono', monospace; font-size: 7px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--light); margin-bottom: 1px; }
  .lp-mc-spec-val { font-size: 10px; font-weight: 700; color: var(--ink); }
  .lp-mc-bars { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px 8px; margin-bottom: 10px; }
  .lp-mc-bar-lbl { font-size: 7px; color: var(--light); font-family: 'DM Mono', monospace; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; display: flex; justify-content: space-between; }
  .lp-mc-bar-track { height: 2px; background: var(--border); border-radius: 2px; }
  .lp-mc-bar-fill { height: 100%; border-radius: 2px; background: var(--gold); }
  .lp-mc-why { background: var(--cream-dark); border-radius: 7px; padding: 8px 10px; margin-bottom: 10px; }
  .lp-mc-why-lbl { font-size: 7px; font-weight: 700; color: var(--clay-bright); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
  .lp-mc-why-txt { font-size: 9px; color: var(--mid); line-height: 1.5; }
  .lp-mc-btn { width: 100%; background: var(--clay); border: none; border-radius: 8px; padding: 9px; font-size: 10px; font-weight: 700; color: var(--white); text-align: center; font-family: 'Outfit', sans-serif; }

  /* Secondary mini-cards */
  .lp-mc-secondary { background: var(--white); border-radius: 12px; padding: 11px 12px; margin-bottom: 8px; border: 1.5px solid var(--border); opacity: 0.85; display: flex; align-items: center; justify-content: space-between; }
  .lp-mc-secondary-name { font-size: 10px; font-weight: 700; color: var(--ink); }
  .lp-mc-secondary-badge { background: rgba(30,52,80,0.12); color: var(--navy-light); font-size: 7px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
  .lp-mc-secondary-bars { display: flex; gap: 3px; align-items: flex-end; margin-top: 4px; }
  .lp-mc-secondary-bar { width: 14px; border-radius: 1px; background: var(--navy-light); opacity: 0.6; }

  /* String card in mockup */
  .lp-mc-string { background: var(--white); border-radius: 12px; padding: 11px 12px; margin-bottom: 6px; border: 2px solid var(--clay); }
  .lp-mc-string-name { font-size: 10px; font-weight: 700; color: var(--ink); margin-bottom: 2px; }
  .lp-mc-string-type { font-size: 8px; color: var(--light); font-family: 'DM Mono', monospace; letter-spacing: 0.08em; }

  /* Tension pill */
  .lp-mc-tension { background: var(--navy); border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .lp-mc-tension-lbl { font-size: 8px; color: rgba(255,255,255,0.45); font-family: 'DM Mono', monospace; letter-spacing: 0.12em; text-transform: uppercase; }
  .lp-mc-tension-val { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: var(--gold); line-height: 1; }
  .lp-eyebrow { display: inline-flex; align-items: center; gap: 10px; background: rgba(200,82,42,0.15); border: 1px solid rgba(200,82,42,0.3); border-radius: 100px; padding: 6px 16px 6px 8px; margin-bottom: 28px; animation: lp-fadeUp 0.6s ease both; }
  .lp-edot { width: 8px; height: 8px; background: var(--clay-bright); border-radius: 50%; }
  .lp-eyebrow span { font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--clay-bright); }
  @keyframes lp-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .lp-h1 { font-family: 'Cormorant Garamond', serif; font-size: clamp(48px, 8vw, 84px); font-weight: 700; line-height: 1.0; color: var(--white); margin-bottom: 24px; animation: lp-fadeUp 0.6s 0.1s ease both; }
  .lp-h1 em { font-style: italic; color: var(--clay-bright); }
  .lp-hero-sub { font-size: 20px; font-weight: 300; color: rgba(255,255,255,0.65); line-height: 1.65; max-width: 520px; margin-bottom: 36px; animation: lp-fadeUp 0.6s 0.2s ease both; }
  .lp-btn-primary { display: inline-flex; align-items: center; background: var(--clay); color: var(--white); border: none; border-radius: 8px; padding: 16px 28px; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.15s; letter-spacing: 0.02em; margin-bottom: 16px; animation: lp-fadeUp 0.6s 0.3s ease both; }
  .lp-btn-primary:hover { background: var(--clay-bright); transform: translateY(-2px); }
  .lp-proof-strip { position: absolute; bottom: 36px; left: 48px; right: 48px; display: flex; align-items: center; gap: 28px; flex-wrap: wrap; z-index: 2; }
  @media (max-width: 600px) { .lp-proof-strip { left: 24px; right: 24px; bottom: 24px; gap: 16px; } }
  .lp-proof-item { display: flex; align-items: center; gap: 10px; }
  .lp-avatars { display: flex; }
  .lp-avatar { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--navy); margin-right: -7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--white); }
  .lp-avatar-1 { background: #4A7A8A; } .lp-avatar-2 { background: #7A4A8A; } .lp-avatar-3 { background: #8A6A3A; } .lp-avatar-4 { background: var(--clay); }
  .lp-proof-txt { font-size: 14px; color: rgba(255,255,255,0.5); }
  .lp-proof-txt strong { color: rgba(255,255,255,0.75); }
  .lp-proof-div { width: 1px; height: 22px; background: rgba(255,255,255,0.1); flex-shrink: 0; }
  .lp-proof-stat strong { display: block; font-size: 18px; font-weight: 700; color: var(--white); font-family: 'Cormorant Garamond', serif; }
  .lp-proof-stat span { font-size: 11px; color: rgba(255,255,255,0.4); }
  .lp-section-label { font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--clay); margin-bottom: 14px; }
  .lp-label-gold { color: #E0B84A; }
  .lp-section-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(34px, 5vw, 56px); font-weight: 700; line-height: 1.1; color: var(--ink); margin-bottom: 18px; }
  .lp-section-title em { font-style: italic; color: var(--clay); }
  .lp-title-white { color: var(--white); }
  .lp-title-white em { color: var(--clay-bright); }
  .lp-problem { background: var(--cream); padding: 100px 48px 24px; }
  @media (max-width: 600px) { .lp-problem { padding: 72px 24px 20px; } }
  .lp-problem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; max-width: 1100px; margin: 0 auto; align-items: start; }
  @media (max-width: 800px) { .lp-problem-grid { grid-template-columns: 1fr; gap: 40px; } }
  .lp-problem-text p { font-size: 16px; font-weight: 300; color: var(--mid); line-height: 1.8; margin-bottom: 14px; }
  .lp-pain-cards { display: flex; flex-direction: column; gap: 14px; }
  .lp-pain-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; display: flex; align-items: flex-start; gap: 14px; box-shadow: 0 2px 12px rgba(13,27,42,0.06); transition: transform 0.2s, box-shadow 0.2s; }
  .lp-pain-card:hover { transform: translateX(4px); box-shadow: 0 4px 20px rgba(13,27,42,0.1); }
  .lp-pain-stripe { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
  .lp-pain-red { background: var(--clay); } .lp-pain-amber { background: var(--gold); } .lp-pain-blue { background: var(--navy-light); }
  .lp-pain-card h4 { font-size: 16px; font-weight: 600; color: var(--ink); margin-bottom: 6px; line-height: 1.3; }
  .lp-pain-card p { font-size: 15px; color: var(--mid); line-height: 1.6; margin: 0; }
  .lp-cta-strip { display: flex; justify-content: center; padding: 0 48px 40px; }
  .lp-cta-strip.on-navy { background: var(--navy); padding-top: 40px; }
  .lp-cta-strip.on-navy-mid { background: var(--navy-mid); }
  .lp-cta-strip.on-cream { background: var(--cream); padding-top: 0; padding-bottom: 40px; }
  .lp-cta-strip .lp-btn-primary { min-width: 280px; justify-content: center; animation: none; }
  @media (max-width: 600px) { .lp-cta-strip { padding: 0 24px 44px; } .lp-cta-strip .lp-btn-primary { width: 100%; min-width: unset; } }
  .lp-guide { background: var(--navy); padding: 100px 48px; position: relative; overflow: hidden; }
  @media (max-width: 600px) { .lp-guide { padding: 72px 24px; } }
  .lp-guide::before { content: ''; position: absolute; top: -200px; right: -200px; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(200,82,42,0.12) 0%, transparent 70%); pointer-events: none; }
  .lp-guide-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: start; position: relative; z-index: 1; }
  @media (max-width: 800px) { .lp-guide-inner { grid-template-columns: 1fr; gap: 48px; } }
  .lp-guide-body { font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.62); line-height: 1.7; margin-bottom: 28px; }
  .lp-credentials { display: flex; flex-direction: column; gap: 14px; }
  .lp-credential { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; }
  .lp-cred-bullet { width: 8px; height: 8px; border-radius: 50%; background: var(--clay); flex-shrink: 0; align-self: center; }
  .lp-credential h4 { font-size: 16px; font-weight: 600; color: var(--white); margin-bottom: 4px; line-height: 1.3; }
  .lp-credential p { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.5; margin: 0; }
  .lp-score-mockup { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; }
  .lp-mockup-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .lp-mockup-ttl { font-size: 13px; color: rgba(255,255,255,0.5); font-family: 'DM Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
  .lp-score-badge { background: var(--clay); color: var(--white); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .lp-racket-row { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.06); }
  .lp-racket-top { background: rgba(200,82,42,0.12); border-color: rgba(200,82,42,0.25); }
  .lp-racket-rank { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; color: rgba(255,255,255,0.2); width: 28px; flex-shrink: 0; }
  .lp-rank-top { color: var(--clay-bright); }
  .lp-racket-info h4 { font-size: 13px; font-weight: 600; color: var(--white); margin-bottom: 2px; }
  .lp-racket-info p { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; }
  .lp-racket-score { margin-left: auto; font-family: 'DM Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.45); }
  .lp-score-top { color: var(--clay-bright); }
  .lp-tension-row { background: rgba(196,154,60,0.1); border: 1px solid rgba(196,154,60,0.2); border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
  .lp-tension-row span { font-size: 13px; color: rgba(255,255,255,0.5); }
  .lp-tension-row strong { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #E0B84A; }
  .lp-tension-row strong span { font-size: 14px; opacity: 0.6; }
  .lp-plan { background: var(--cream); padding: 100px 48px; }
  @media (max-width: 600px) { .lp-plan { padding: 72px 24px; } }
  .lp-plan-inner { max-width: 1100px; margin: 0 auto; }
  .lp-plan-hdr { text-align: center; max-width: 580px; margin: 0 auto 60px; }
  .lp-plan-hdr p { font-size: 16px; color: var(--mid); font-weight: 300; line-height: 1.7; margin-top: 16px; }
  .lp-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; background: var(--border); border-radius: 16px; overflow: hidden; }
  @media (max-width: 900px) { .lp-steps { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .lp-steps { grid-template-columns: 1fr; } }
  .lp-step { background: var(--white); padding: 44px 32px; position: relative; transition: background 0.2s; }
  .lp-step:hover { background: #F0EBE3; }
  .lp-step-num { font-family: 'Cormorant Garamond', serif; font-size: 68px; font-weight: 700; color: var(--clay); opacity: 0.12; line-height: 1; margin-bottom: 18px; }
  .lp-step h3 { font-size: 20px; font-weight: 600; color: var(--ink); margin-bottom: 10px; line-height: 1.3; }
  .lp-step p { font-size: 16px; color: var(--mid); line-height: 1.65; margin: 0; }
  .lp-step-arrow { position: absolute; right: -18px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; background: var(--clay); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; z-index: 2; box-shadow: 0 0 0 4px var(--cream); }
  @media (max-width: 900px) { .lp-step-arrow { display: none; } }
  .lp-social-proof { background: var(--navy-mid); padding: 88px 48px; }
  @media (max-width: 600px) { .lp-social-proof { padding: 64px 24px; } }
  .lp-sp-inner { max-width: 1100px; margin: 0 auto; }
  .lp-sp-hdr { text-align: center; margin-bottom: 52px; }
  .lp-testimonials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  @media (max-width: 900px) { .lp-testimonials { grid-template-columns: 1fr; } }
  .lp-testimonial { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 28px 24px; transition: transform 0.2s, border-color 0.2s; }
  .lp-testimonial:hover { transform: translateY(-4px); border-color: rgba(200,82,42,0.3); }
  .lp-testi-stars { color: var(--gold); font-size: 13px; letter-spacing: 2px; margin-bottom: 14px; }
  .lp-testi-quote { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-style: italic; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 20px; }
  .lp-testi-author { display: flex; align-items: center; gap: 12px; }
  .lp-testi-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--white); flex-shrink: 0; }
  .lp-testi-name { font-size: 13px; font-weight: 600; color: var(--white); }
  .lp-testi-detail { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 2px; }
  .lp-benefits { background: #F0EBE3; padding: 100px 48px; }
  @media (max-width: 600px) { .lp-benefits { padding: 72px 24px; } }
  .lp-benefits-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
  @media (max-width: 800px) { .lp-benefits-inner { grid-template-columns: 1fr; gap: 48px; } }
  .lp-benefits-intro { font-size: 16px; color: var(--mid); line-height: 1.7; margin-bottom: 32px; font-weight: 300; }
  .lp-benefit-list { display: flex; flex-direction: column; gap: 14px; }
  .lp-benefit-item { display: flex; align-items: flex-start; gap: 12px; }
  .lp-benefit-check { width: 22px; height: 22px; background: rgba(200,82,42,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .lp-benefit-check::after { content: 'v'; font-size: 11px; color: var(--clay); font-weight: 700; }
  .lp-benefit-item p { font-size: 14px; color: var(--mid); line-height: 1.6; margin: 0; }
  .lp-benefit-item p strong { color: var(--ink); }
  .lp-output-mockup { background: var(--white); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 80px rgba(13,27,42,0.12); }
  .lp-mockup-dots { background: var(--navy); padding: 14px 18px; display: flex; gap: 7px; }
  .lp-dot { width: 10px; height: 10px; border-radius: 50%; }
  .lp-dot-red { background: #FF5F57; } .lp-dot-yellow { background: #FEBC2E; } .lp-dot-green { background: #28C840; }
  .lp-mockup-body { padding: 24px; }
  .lp-result-tension { background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); border-radius: 12px; padding: 18px 22px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; }
  .lp-tension-label { font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .lp-tension-val { font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 700; color: var(--white); }
  .lp-tension-val span { font-size: 15px; opacity: 0.5; }
  .lp-tension-hint { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 3px; }
  .lp-tension-badge { background: var(--clay); color: var(--white); font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; flex-shrink: 0; }
  .lp-mockup-sub-label { font-size: 10px; color: var(--light); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-family: 'DM Mono', monospace; }
  .lp-result-racket { background: var(--cream); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); font-size: 18px; }
  .lp-result-racket-top { background: rgba(200,82,42,0.06); border-color: rgba(200,82,42,0.2); }
  .lp-result-racket h4 { font-size: 12px; font-weight: 600; color: var(--ink); margin: 0 0 2px; }
  .lp-result-racket p { font-size: 10px; color: var(--light); margin: 0; }
  .lp-result-star { margin-left: auto; font-size: 13px; }
  .lp-result-why { background: var(--clay-pale); border-radius: 10px; padding: 14px 16px; margin-top: 14px; border-left: 3px solid var(--clay); }
  .lp-result-why-label { font-size: var(--text-micro); text-transform: uppercase; letter-spacing: 0.12em; color: var(--clay); font-weight: 600; margin-bottom: 5px; }
  .lp-result-why p { font-size: 11px; color: var(--mid); line-height: 1.6; margin: 0; }
  .lp-cta { background: var(--clay); padding: 88px 48px; position: relative; overflow: hidden; text-align: center; }
  @media (max-width: 600px) { .lp-cta { padding: 64px 24px; } }
  .lp-cta::before { content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 800px; height: 400px; background: rgba(255,255,255,0.06); border-radius: 50%; pointer-events: none; }
  .lp-cta-inner { position: relative; z-index: 1; max-width: 580px; margin: 0 auto; }
  .lp-cta-h2 { font-family: 'Cormorant Garamond', serif; font-size: clamp(36px, 6vw, 60px); font-weight: 700; color: var(--white); line-height: 1.1; margin: 10px 0 18px; }
  .lp-cta-h2 em { font-style: italic; opacity: 0.75; }
  .lp-cta-sub { font-size: 16px; color: rgba(255,255,255,0.7); font-weight: 300; line-height: 1.7; margin-bottom: 36px; }
  .lp-btn-white { display: inline-block; background: var(--white); color: var(--clay); border: none; border-radius: 8px; padding: 16px 28px; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; margin-bottom: 16px; }
  .lp-btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
  .lp-faq { background: var(--cream); padding: 88px 48px; }
  @media (max-width: 600px) { .lp-faq { padding: 64px 24px; } }
  .lp-faq-inner { max-width: 700px; margin: 0 auto; }
  .lp-faq-hdr { text-align: center; margin-bottom: 48px; }
  .lp-faq-item { border-bottom: 1px solid var(--border); }
  .lp-faq-q { width: 100%; background: none; border: none; text-align: left; padding: 22px 0; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: color 0.2s; }
  .lp-faq-q:hover { color: var(--clay); }
  .lp-faq-icon { width: 26px; height: 26px; border: 1px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; color: var(--clay); transition: transform 0.2s; }
  .lp-faq-open .lp-faq-icon { transform: rotate(45deg); }
  .lp-faq-a { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.2s; font-size: 14px; color: var(--mid); line-height: 1.8; font-weight: 300; }
  .lp-faq-open .lp-faq-a { max-height: 280px; padding-bottom: 22px; }
  .lp-footer { background: var(--navy); padding: 56px 48px calc(36px + var(--safe-b)); }
  @media (max-width: 600px) { .lp-footer { padding: 48px 24px calc(28px + var(--safe-b)); } }
  .lp-footer-inner { max-width: 1100px; margin: 0 auto; }
  .lp-footer-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 28px; margin-bottom: 40px; }
  .lp-footer-tagline { font-size: 13px; color: rgba(255,255,255,0.35); max-width: 240px; line-height: 1.6; margin: 0; }
  .lp-footer-col h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.35); margin-bottom: 14px; font-family: 'DM Mono', monospace; }
  .lp-footer-col a { display: block; font-size: 13px; color: rgba(255,255,255,0.55); text-decoration: none; margin-bottom: 8px; transition: color 0.2s; }
  .lp-footer-col a:hover { color: var(--white); }
  .lp-footer-bottom { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .lp-footer-bottom p { font-size: 11px; color: rgba(255,255,255,0.25); font-family: 'DM Mono', monospace; margin: 0; }
`;

// --- FAQ COMPONENT ------------------------------------------------------------

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{borderBottom:"1px solid var(--border)",paddingBottom:16,marginBottom:16}}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{width:"100%",background:"none",border:"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:16,textAlign:"left"}}>
        <span style={{fontSize:15,fontWeight:600,color:"var(--ink)",lineHeight:1.4}}>{q}</span>
        <span style={{color:"var(--clay)",fontSize:20,flexShrink:0,fontWeight:300}}>{open ? "-" : "+"}</span>
      </button>
      {open && <p style={{fontSize:13,color:"var(--mid)",lineHeight:1.7,marginTop:10}}>{a}</p>}
    </div>
  );
}

// --- MAIN COMPONENT -----------------------------------------------------------

export default function PerfectRacket() {
  const [screen, setScreen] = useState("landing");
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState("left");
  const [errors, setErrors] = useState({});
  const [shaking, setShaking] = useState(false);
  const [prog, setProg] = useState(0);
  const [phase, setPhase] = useState(0);
  const [phaseFade, setPhaseFade] = useState(false);
  const [factIdx, setFactIdx] = useState(0);
  const [factFade, setFactFade] = useState(false);
  const [recs, setRecs] = useState(null);

  const bodyRef = useRef(null);

  const [d, setD] = useState({
    mode:"",
    name:"", email:"", ageRange:"", ntrp:"", budget:"",
    currentRacket:"", gripSize:"",
    playStyle:"", playFrequency:"", swingSpeed:"",
    whatMatters:"", comfortVsPerf:"", priorityFocus:"",
    painLocations:[], painSeverity:"",
    pastInjuryElbow:"No", pastInjuryShoulder:"No", pastInjuryWrist:"No",
    pastInjuries:[],
    rehabStatus:"", stringType:"", tensionRange:"",
    goals:[],
  });

  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [step, screen]);

  // Fact rotation during loading - cycles every 700ms with a fade transition
  useEffect(() => {
    if (screen !== "loading") return;
    const interval = setInterval(() => {
      setFactFade(true);
      setTimeout(() => {
        setFactIdx(i => (i + 1) % FACTS.length);
        setFactFade(false);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, [screen]);

  // Phase text animation during loading - fades between phase labels
  useEffect(() => {
    if (screen !== "loading") return;
    const interval = setInterval(() => {
      setPhaseFade(true);
      setTimeout(() => setPhaseFade(false), 250);
    }, 560);
    return () => clearInterval(interval);
  }, [screen]);

  // Slow smooth scroll to a target element within bodyRef


  const upd = (k, v) => {
    setD(p => {
      const next = { ...p, [k]: v };
      if (k === "comfortVsPerf") {
        next.whatMatters =
          v === "Comfort first"     ? "Comfort"  :
          v === "Performance first" ? "Power"    : "Control";
      }
      return next;
    });
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const togglePastInjury = (loc) => {
    setD(p => {
      let next;
      if (loc === "None") {
        next = ["None"];
      } else {
        const withoutNone = (p.pastInjuries || []).filter(x => x !== "None");
        next = withoutNone.includes(loc)
          ? withoutNone.filter(x => x !== loc)
          : [...withoutNone, loc];
      }
      return {
        ...p,
        pastInjuries: next,
        pastInjuryElbow:    next.includes("Elbow")    ? "Yes" : "No",
        pastInjuryShoulder: next.includes("Shoulder") ? "Yes" : "No",
        pastInjuryWrist:    next.includes("Wrist")    ? "Yes" : "No",
      };
    });
  };

  const togglePain = (v) => {
    setD(p => {
      if (v === "No Pain") return { ...p, painLocations: ["No Pain"] };
      const base = p.painLocations.filter(x => x !== "No Pain");
      return { ...p, painLocations: base.includes(v) ? base.filter(x => x !== v) : [...base, v] };
    });
  };

  const validate = (s) => {
    const errs = {};
    const isPerf = d.mode === "performance";
    // Performance mode skips step 3 entirely; if validate is somehow called for step 3 in perf, pass through
    if (isPerf && s === 3) {
      setErrors({});
      return true;
    }
    (REQUIRED[s] || []).forEach(k => {
      if (!d[k] || (typeof d[k] === "string" && !d[k].trim())) errs[k] = "Required";
    });
    if (s === 1 && d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errs.email = "Enter a valid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const go = (scr) => { setScreen(scr); };

  const next = () => {
    if (!validate(step)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      return;
    }
    // Plausible funnel tracking
    const stepNames = { 1: "About You", 2: "Your Game", 3: "Arm Health", 4: "Final Details" };
    if (typeof window.plausible === "function") {
      window.plausible("Step Completed", { props: { step: stepNames[step], mode: d.mode || "armhealth" } });
    }
    const isPerf = d.mode === "performance";
    if (step < 4) {
      setDir("left");
      // Performance mode: jump from step 2 directly to step 4, skipping arm health
      if (isPerf && step === 2) setStep(4);
      else setStep(s => s + 1);
    } else {
      startLoad();
    }
  };

  const prev = () => {
    if (step > 1) {
      setDir("right");
      const isPerf = d.mode === "performance";
      // Performance mode: stepping back from step 4 goes to step 2, not step 3
      if (isPerf && step === 4) setStep(2);
      else setStep(s => s - 1);
    } else {
      go("modeselect");
    }
  };

  const startLoad = () => {
    go("loading");
    setProg(0); setPhase(0);
    // Snapshot d at call time so stale closures inside the interval
    // can never pick up a partially-modified form state
    const snapshot = { ...d };
    const start = Date.now();
    const dur = 2800;
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / dur) * 100);
      setProg(p);
      const ph = Math.min(PHASES.length - 1, Math.floor((elapsed / dur) * PHASES.length));
      setPhase(ph);
      if (elapsed >= dur) {
        clearInterval(tick);
        try {
          const result = generateRecommendations(snapshot);
          setRecs(result);
          go("results");

          // Netlify Forms — full capture of every form answer + top 3 recs + tension data
          // 25 fields total. Existing field names preserved for backwards compatibility.
          // Multi-selects joined with "; " so CSV exports survive cleanly.
          try {
            const r1 = result.racquets?.[0];
            const r2 = result.racquets?.[1];
            const r3 = result.racquets?.[2];
            const s1 = result.strings?.[0];
            const s2 = result.strings?.[1];
            const s3 = result.strings?.[2];
            const fmtRacket = (r) => r ? `${r.brand} ${r.model}` : "";
            const fmtList = (a) => Array.isArray(a) ? a.join("; ") : "";
            const formData = new FormData();
            formData.append("form-name", "perfect-racket-submission");
            // Mode (which path the user chose)
            formData.append("mode", snapshot.mode || "armhealth");
            // Identity
            formData.append("name", snapshot.name || "");
            formData.append("email", snapshot.email || "");
            // Profile
            formData.append("age-range", snapshot.ageRange || "");
            formData.append("ntrp", snapshot.ntrp || "");
            formData.append("grip-size", snapshot.gripSize || "");
            formData.append("current-racket", snapshot.currentRacket || "");
            formData.append("budget", snapshot.budget || "");
            // Game
            formData.append("play-style", snapshot.playStyle || "");
            formData.append("play-frequency", snapshot.playFrequency || "");
            formData.append("swing-speed", snapshot.swingSpeed || "");
            formData.append("priority-focus", snapshot.priorityFocus || "");
            formData.append("comfort-vs-perf", snapshot.comfortVsPerf || "");
            formData.append("goals", fmtList(snapshot.goals));
            // Health
            formData.append("pain-locations", fmtList(snapshot.painLocations));
            formData.append("pain-severity", snapshot.painSeverity || "");
            formData.append("past-injury-elbow", snapshot.pastInjuryElbow || "No");
            formData.append("past-injury-shoulder", snapshot.pastInjuryShoulder || "No");
            formData.append("past-injury-wrist", snapshot.pastInjuryWrist || "No");
            formData.append("rehab-status", snapshot.rehabStatus || "");
            // Current setup
            formData.append("string-type", snapshot.stringType || "");
            formData.append("tension-range", snapshot.tensionRange || "");
            // Recommendations
            formData.append("top-racket", fmtRacket(r1));
            formData.append("racket-2", fmtRacket(r2));
            formData.append("racket-3", fmtRacket(r3));
            formData.append("top-string", s1 ? s1.name : "");
            formData.append("string-2", s2 ? s2.name : "");
            formData.append("string-3", s3 ? s3.name : "");
            formData.append("tension", result.tension ? `${result.tension.low}-${result.tension.high} lbs` : "");
            formData.append("tension-recommended", result.tension ? String(result.tension.recommended) : "");
            formData.append("injury-factor", result.injuryFactor != null ? result.injuryFactor.toFixed(3) : "");
            fetch("/", { method: "POST", body: formData });
          } catch (e) { /* silent fail — never block results */ }

          // Plausible — completion event
          if (typeof window.plausible === "function") {
            window.plausible("Form Completed", { props: { ntrp: snapshot.ntrp, painSeverity: snapshot.painSeverity } });
          }
        } catch (err) {
          console.error("generateRecommendations failed:", err);
          setRecs({ error: true });
          go("results");
        }
      }
    }, 80);
  };

  const reset = () => {
    setD({ mode:"",
           name:"", email:"", ageRange:"", ntrp:"", budget:"",
           currentRacket:"", gripSize:"",
           playStyle:"", playFrequency:"", swingSpeed:"",
           whatMatters:"", comfortVsPerf:"", priorityFocus:"",
           painLocations:[], painSeverity:"",
           pastInjuryElbow:"No", pastInjuryShoulder:"No", pastInjuryWrist:"No",
           pastInjuries:[], rehabStatus:"", stringType:"", tensionRange:"", goals:[] });
    setStep(1); setErrors({}); setRecs(null); go("landing");
  };

  const Err = ({ k }) => errors[k] ? <div className="ferr">! {errors[k]}</div> : null;

  // -- LANDING ----------------------------------------------------------------
  if (screen === "landing") {
    return (
      <>
        <style>{css + landingCss}</style>
        <div className="landing-page screen">

          {/* NAV */}
          <nav className="lp-nav">
            <span className="lp-logo">Perfect<span>Racket</span></span>
            <ul className="lp-nav-links">
              <li><a href="#lp-how">How it works</a></li>
              <li><a href="#lp-results">What you get</a></li>
              <li><a href="#lp-faq">FAQ</a></li>
              <li><button className="lp-nav-cta" onClick={()=>go("modeselect")}>Get My Setup</button></li>
            </ul>
          </nav>

          {/* HERO */}
          <section className="lp-hero">
            {/* Court line background */}
            <div className="lp-court" aria-hidden="true">
              <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none">
                <rect x="100" y="100" width="1000" height="600" stroke="white" strokeWidth="2"/>
                <line x1="100" y1="400" x2="1100" y2="400" stroke="white" strokeWidth="2"/>
                <line x1="600" y1="100" x2="600" y2="800" stroke="white" strokeWidth="2"/>
                <rect x="200" y="200" width="800" height="400" stroke="white" strokeWidth="1.5"/>
                <line x1="200" y1="400" x2="1000" y2="400" stroke="white" strokeWidth="1.5"/>
                <circle cx="600" cy="400" r="60" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>

            <div className="lp-hero-inner">
              {/* Left: headline and CTA */}
              <div className="lp-hero-content">
                <div className="lp-eyebrow">
                  <div className="lp-edot"/>
                  <span>Free personalized equipment analysis</span>
                </div>
                <h1 className="lp-h1">Stop guessing.<br/>Find your <em>perfect</em><br/>racket setup.</h1>
                <p className="lp-hero-sub">Answer a few questions about how you play and what matters most. Get back your top 3 rackets, strings, and an exact tension range. Whether you are protecting your arm, chasing your game, or both.</p>
                <button className="lp-btn-primary" onClick={()=>{ if(typeof window.plausible==="function") window.plausible("CTA Clicked",{props:{location:"hero"}}); go("modeselect"); }}>Get My Free Setup -></button>
                <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",marginTop:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{background:"rgba(200,82,42,0.15)",border:"1px solid rgba(200,82,42,0.35)",borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"baseline",gap:4}}>
                      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:700,color:"var(--clay-bright)",lineHeight:1}}>40%</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(200,82,42,0.7)"}}>arm health weight</span>
                    </div>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontStyle:"italic",maxWidth:140,lineHeight:1.4}}>On the arm-health path. Heaviest weighting in the category.</span>
                  </div>
                  <div className="lp-proof-div"/>
                  <div className="lp-proof-stat"><strong>42</strong><span>frames scored</span></div>
                  <div className="lp-proof-div"/>
                  <div className="lp-proof-stat"><strong>~3 min</strong><span>to your results</span></div>
                </div>
              </div>

              {/* Right: phone mockup of results screen */}
              <div className="lp-mockup-phone">
                <div className="lp-phone-frame">
                  <div className="lp-phone-notch"/>
                  <div className="lp-phone-screen">

                    {/* Status bar */}
                    <div className="lp-phone-status">
                      <div>
                        <div className="lp-phone-status-title">Your Setup</div>
                        <div className="lp-phone-status-sub">Personalized to how you play</div>
                      </div>
                      <div className="lp-phone-check">✓</div>
                    </div>

                    <div className="lp-phone-body">

                      {/* Top racquet card */}
                      <div className="lp-mc">
                        <div className="lp-mc-hdr">
                          <div>
                            <div className="lp-mc-badge">Best Match</div>
                            <div className="lp-mc-name">HEAD Speed MP 2026</div>
                          </div>
                          <div className="lp-mc-rank">#1</div>
                        </div>
                        <div className="lp-mc-specs">
                          {[["Head Size","100 sq in"],["Weight","300g"],["Stiffness","RA 60"],["Pattern","16x19"]].map(([l,v]) => (
                            <div key={l}>
                              <div className="lp-mc-spec-lbl">{l}</div>
                              <div className="lp-mc-spec-val">{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="lp-mc-bars">
                          {[["Power",34],["Control",78],["Comfort",82],["Spin",64],["Maneuver",70]].map(([lbl,val]) => (
                            <div key={lbl}>
                              <div className="lp-mc-bar-lbl"><span>{lbl}</span><span>{val}</span></div>
                              <div className="lp-mc-bar-track">
                                <div className="lp-mc-bar-fill" style={{width:`${val}%`}}/>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="lp-mc-why">
                          <div className="lp-mc-why-lbl">Why this racket</div>
                          <div className="lp-mc-why-txt">Its RA 60 stiffness sits below the arm-stress threshold -- a safer choice given your elbow history and moderate swing speed.</div>
                        </div>
                        <div className="lp-mc-btn">Shop on Tennis Express</div>
                      </div>

                      {/* Secondary cards */}
                      {[["Wilson Clash 100 v3","#2"],["Yonex PERCEPT 100","#3"]].map(([name,rank]) => (
                        <div key={name} className="lp-mc-secondary">
                          <div>
                            <div className="lp-mc-secondary-name">{name}</div>
                            <div className="lp-mc-secondary-bars">
                              {[40,62,74,58,66].map((w,i) => (
                                <div key={i} className="lp-mc-secondary-bar" style={{height:`${Math.round(w*0.16)}px`}}/>
                              ))}
                            </div>
                          </div>
                          <div className="lp-mc-secondary-badge">{rank} Pick</div>
                        </div>
                      ))}

                      {/* Divider */}
                      <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0 8px"}}>
                        <div style={{flex:1,height:1,background:"var(--border)"}}/>
                        <div style={{fontSize:7,fontFamily:"'DM Mono',monospace",letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--light)"}}>Your String Setup</div>
                        <div style={{flex:1,height:1,background:"var(--border)"}}/>
                      </div>

                      {/* String card */}
                      <div className="lp-mc-string">
                        <div className="lp-mc-badge">Top Pick</div>
                        <div className="lp-mc-string-name">Tecnifibre NRG2 17</div>
                        <div className="lp-mc-string-type">Multifilament</div>
                      </div>

                      {/* Tension */}
                      <div className="lp-mc-tension">
                        <div>
                          <div className="lp-mc-tension-lbl">Recommended Tension</div>
                        </div>
                        <div className="lp-mc-tension-val">47-51 lbs</div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Proof strip repositioned inside hero-inner on mobile */}
            <div className="lp-proof-strip" style={{display:"none"}}/>
          </section>

          {/* THE PROBLEM */}
          <section className="lp-problem">
            <div className="lp-problem-grid">
              <div className="lp-problem-text">
                <div className="lp-section-label">The problem</div>
                <h2 className="lp-section-title">Wrong racket.<br/><em>Real pain.</em></h2>
                <p>Most players pick their racket from YouTube reviews, a pro shop recommendation, or what their hitting partner uses. None of those sources know your game.</p>
                <p>A racket that is too stiff, too heavy, or strung too tight can turn a minor ache into months off the court. And most of us do not find out until it is too late.</p>
                <p>You deserve a recommendation built around you - your swing, your level, and especially your arm.</p>
              </div>
              <div className="lp-pain-cards">
                {[
                  {c:"red",  t:"The just-try-it trap",          d:"You can demo ten rackets and still pick the wrong one without knowing your specs."},
                  {c:"amber",t:"Arm pain that keeps coming back", d:"Tennis elbow, shoulder strain, and wrist pain are usually equipment problems mistaken for technique problems."},
                  {c:"blue", t:"Confusing specs, no guide",       d:"RA, swing weight, beam width — the numbers are everywhere, but nobody translates them for your situation."},
                  {c:"red",  t:"Expensive mistakes",              d:"At $200+ per racket, a wrong purchase stings. Most players end up with frames sitting in the closet."},
                ].map((p,i) => (
                  <div key={i} className="lp-pain-card">
                    <div className={`lp-pain-stripe lp-pain-${p.c}`}/>
                    <div><h4>{p.t}</h4><p>{p.d}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA after Problem */}
          <div className="lp-cta-strip on-cream">
            <button className="lp-btn-primary" onClick={()=>go("modeselect")}>Get My Free Setup -></button>
          </div>

          {/* THE GUIDE */}
          <section className="lp-guide">
            <div className="lp-guide-inner">
              <div>
                <div className="lp-section-label lp-label-gold">Your guide</div>
                <h2 className="lp-section-title lp-title-white">Built by players who have been through it.</h2>
                <p className="lp-guide-body">Perfect Racket exists because too many players spend years with the wrong gear, paying for it in frustration, arm pain, or both. The wrong racket can hurt you. The right one fits how you play. We help you find it, whether you are protecting your arm, chasing your game, or both.</p>
                <div className="lp-credentials">
                  {[
                    {t:"Two paths, one engine",             d:"Performance Fit tunes for your game. Arm Health Fit weights protection at 40%, heaviest in the category."},
                    {t:"42 rackets, rigorously scored",     d:"Each frame rated across 6 technical dimensions — not marketing copy."},
                    {t:"Tension calculated for your body",  d:"Not a generic range. A specific starting number based on your game, your level, and your arm."},
                  ].map((c,i) => (
                    <div key={i} className="lp-credential">
                      <div className="lp-cred-bullet"/>
                      <div><h4>{c.t}</h4><p>{c.d}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-score-mockup">
                <div className="lp-mockup-header">
                  <span className="lp-mockup-ttl">Your Results</span>
                  <span className="lp-score-badge">Top Match</span>
                </div>
                {[
                  {top:true,  n:"1", name:"Wilson Clash 100 Pro",    sub:"100 sq in · 310g · RA 55 · Arm-friendly", score:"94/100"},
                  {top:false, n:"2", name:"Head Gravity MP",          sub:"100 sq in · 295g · RA 58 · Control",      score:"81/100"},
                  {top:false, n:"3", name:"Babolat Pure Strike 100",  sub:"100 sq in · 300g · RA 62 · Control",      score:"74/100"},
                ].map((r,i) => (
                  <div key={i} className={`lp-racket-row${r.top?" lp-racket-top":""}`}>
                    <div className={`lp-racket-rank${r.top?" lp-rank-top":""}`}>{r.n}</div>
                    <div className="lp-racket-info"><h4>{r.name}</h4><p>{r.sub}</p></div>
                    <div className={`lp-racket-score${r.top?" lp-score-top":""}`}>{r.score}</div>
                  </div>
                ))}
                <div className="lp-tension-row">
                  <span>Recommended tension</span>
                  <strong>46-50 <span>lbs</span></strong>
                </div>
              </div>
            </div>
          </section>

          {/* CTA after Guide */}
          <div className="lp-cta-strip on-navy">
            <button className="lp-btn-primary" onClick={()=>go("modeselect")}>Get My Free Setup -></button>
          </div>

          {/* THE PLAN */}
          <section className="lp-plan" id="lp-how">
            <div className="lp-plan-inner">
              <div className="lp-plan-hdr">
                <div className="lp-section-label">How it works</div>
                <h2 className="lp-section-title">Four steps to your <em>ideal setup</em></h2>
                <p>No equipment expertise required. Just answer honestly - we do the analysis.</p>
              </div>
              <div className="lp-steps">
                {[
                  {n:"1",t:"Pick your path",             d:"Performance Fit or Arm Health Fit. The path you pick shapes the whole analysis."},
                  {n:"2",t:"Answer a few questions",     d:"Tell us about your game and how you play. Takes about 3 minutes."},
                  {n:"3",t:"We run the analysis",        d:"Our scoring engine weighs 6 dimensions across 42 rackets and 28 strings."},
                  {n:"4",t:"Get your personalized setup", d:"Top 3 rackets, top 3 strings, an exact tension range, and a script for your stringer."},
                ].map((s,i) => (
                  <div key={i} className="lp-step">
                    <div className="lp-step-num">{s.n}</div>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                    {i<3 && <div className="lp-step-arrow">-></div>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SOCIAL PROOF */}
          <section className="lp-social-proof">
            <div className="lp-sp-inner">
              <div className="lp-sp-hdr">
                <div className="lp-section-label lp-label-gold">Real players, real results</div>
                <h2 className="lp-section-title lp-title-white">What players are saying</h2>
              </div>
              <div className="lp-testimonials">
                {[
                  {q:"Took the quiz on a whim after years of elbow pain and a graveyard of 'arm-friendly' setups that didn't help. Three weeks on the racket it recommended and my elbow finally feels normal. Wish I'd found this sooner.",name:"Josh S.",detail:"NTRP 4.0 · Former NFL Athlete",bg:"#4A7A8A",l:"J"},
                  {q:"Was looking for a real upgrade and the quiz pointed me to the Yonex EZONE 100. Demoed it that weekend, bought it Tuesday, and I'm hitting better than I have in years.",name:"William Bo",detail:"NTRP 4.0 · UTR Singles Player",bg:"#7A4A6A",l:"W"},
                  {q:"I play doubles four nights a week and finally found a quiz that actually asked about it. The setup they recommended is faster at the net and way more comfortable on my volleys. My partner noticed the difference right away.",name:"Freddy L.",detail:"NTRP 3.5 · 40+ Doubles Player",bg:"#3A6A5A",l:"F"},
                ].map((t,i) => (
                  <div key={i} className="lp-testimonial">
                    <div className="lp-testi-stars">★★★★★</div>
                    <div className="lp-testi-quote">{t.q}</div>
                    <div className="lp-testi-author">
                      <div className="lp-testi-avatar" style={{background:t.bg}}>{t.l}</div>
                      <div><div className="lp-testi-name">{t.name}</div><div className="lp-testi-detail">{t.detail}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA after Testimonials */}
          <div className="lp-cta-strip on-navy-mid">
            <button className="lp-btn-primary" onClick={()=>go("modeselect")}>Get My Free Setup -></button>
          </div>

          {/* WHAT YOU GET */}
          <section className="lp-benefits" id="lp-results">
            <div className="lp-benefits-inner">
              <div>
                <div className="lp-section-label">What you get</div>
                <h2 className="lp-section-title">Everything you need to<br/><em>walk into a pro shop</em><br/>with confidence.</h2>
                <p className="lp-benefits-intro">Your results are not a vague suggestion. They are a complete, personalized equipment prescription.</p>
                <div className="lp-benefit-list">
                  {[
                    ["Top 3 racket recommendations","with scores and a why-this-fits-you explanation for each"],
                    ["Top 3 string recommendations","matched to your arm health, swing speed, and priority"],
                    ["Your personalized tension range","a calculated starting point based on your body, not a guess"],
                    ["A tell-your-stringer script","copy-paste ready so nothing gets lost in translation"],
                    ["A full why-this-setup explanation","connects every recommendation to your specific answers"],
                  ].map(([b,d],i) => (
                    <div key={i} className="lp-benefit-item">
                      <div className="lp-benefit-check"/>
                      <p><strong>{b}</strong> - {d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-output-mockup">
                <div className="lp-mockup-dots">
                  <div className="lp-dot lp-dot-red"/><div className="lp-dot lp-dot-yellow"/><div className="lp-dot lp-dot-green"/>
                </div>
                <div className="lp-mockup-body">
                  <div className="lp-result-tension">
                    <div>
                      <div className="lp-tension-label">Recommended tension</div>
                      <div className="lp-tension-val">46-50 <span>lbs</span></div>
                      <div className="lp-tension-hint">Start at 47 lbs · adjust up for more control</div>
                    </div>
                    <div className="lp-tension-badge">Arm-safe</div>
                  </div>
                  <div className="lp-mockup-sub-label">Top Racket Matches</div>
                  {[
                    {top:true, name:"Wilson Clash 100 Pro",   sub:"RA 55 · 310g · 16x19 · Arm-friendly", star:true},
                    {top:false,name:"Head Gravity MP",         sub:"RA 58 · 295g · 16x20 · Control",     star:false},
                    {top:false,name:"Babolat Pure Strike 100", sub:"RA 62 · 300g · 16x19 · Precision",   star:false},
                  ].map((r,i) => (
                    <div key={i} className={`lp-result-racket${r.top?" lp-result-racket-top":""}`}>
                      <span>🎾</span>
                      <div><h4>{r.name}</h4><p>{r.sub}</p></div>
                      {r.star && <span className="lp-result-star">★</span>}
                    </div>
                  ))}
                  <div className="lp-result-why">
                    <div className="lp-result-why-label">Why this setup?</div>
                    <p>Given your mild elbow pain and moderate swing speed, we prioritized frames with RA below 60 and paired them with a multifilament string at lower tension.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA SECTION */}
          <section className="lp-cta">
            <div className="lp-cta-inner">
              <div className="lp-section-label" style={{color:"rgba(255,255,255,0.6)"}}>Ready?</div>
              <h2 className="lp-cta-h2">Your arm will<br/>thank you <em>later.</em></h2>
              <p className="lp-cta-sub">It takes 3 minutes. It is completely free. And it might be the best equipment decision you have ever made.</p>
              <button className="lp-btn-white" onClick={()=>go("modeselect")}>Start My Analysis -></button>
            </div>
          </section>

          {/* FAQ */}
          <section className="lp-faq" id="lp-faq">
            <div className="lp-faq-inner">
              <div className="lp-faq-hdr">
                <div className="lp-section-label">Questions</div>
                <h2 className="lp-section-title">Frequently asked</h2>
              </div>
              {[
                {q:"Is this really free?",                                   a:"Yes, completely. Perfect Racket is free to use. We earn a small affiliate commission if you click through and purchase - but your recommendations are never influenced by commission rates."},
                {q:"I am a beginner. Is this for me?",                       a:"Absolutely. We cover NTRP levels from 2.5 to 4.5+. Beginners often benefit the most - the right frame makes learning significantly easier, and correct tension prevents injuries before they start."},
                {q:"How is this different from a generic quiz?",              a:"Most quizzes ask 3-5 questions and return the same 5 popular rackets. Perfect Racket asks 10+ specific questions and uses a data-driven algorithm across 6 technical dimensions. Pick Arm Health Fit and protection is weighted at 40% of your score, the heaviest in the category. Pick Performance Fit and the algorithm tunes for power, control, spin, or whatever you are optimizing for."},
                {q:"What if I do not have any arm pain?",                    a:"Then Performance Fit is your path. Eleven questions tuned to your level, style, and what you are optimizing for, whether that is power, control, spin, maneuverability, or balanced. Arm Health Fit is still there if you want protection weighted in. Many players run both and compare."},
                {q:"Can I share my results with my coach or stringer?",      a:"Yes - results include a pre-written stringer script you can copy and read aloud at the pro shop. Many coaches use Perfect Racket as a starting point for equipment conversations."},
              ].map((f,i) => <FaqItem key={i} q={f.q} a={f.a}/>)}
            </div>
          </section>

          {/* FOOTER */}
          <footer className="lp-footer">
            <div className="lp-footer-inner">
              <div className="lp-footer-top">
                <div>
                  <div className="lp-logo lp-footer-logo">Perfect<span>Racket</span></div>
                  <p className="lp-footer-tagline">The tennis equipment recommendation engine built around your arm health, your game, and your goals.</p>
                </div>
                {[
                  {h:"Product",   links:[["How it works","#lp-how"],["What you get","#lp-results"],["Get started free","#"]]},
                  {h:"Resources", links:[["Tennis Elbow Guide","/tennis-elbow-racket-guide"],["String Guide","#"],["Racket Spec Glossary","#"]]},
                  {h:"Company",   links:[["About","#"],["Privacy Policy","#"],["Contact","#"]]},
                ].map((col,i) => (
                  <div key={i} className="lp-footer-col">
                    <h4>{col.h}</h4>
                    {col.links.map(([l,h],j) => <a key={j} href={h}>{l}</a>)}
                  </div>
                ))}
              </div>
              <div className="lp-footer-bottom">
                <p>© 2026 Perfect Racket. All rights reserved.</p>
                <p>Shop links are affiliate links to Tennis Express. Recommendations are never influenced by commissions.</p>
              </div>
            </div>
          </footer>

        </div>
      </>
    );
  }

  // -- MODE SELECT ------------------------------------------------------------
  if (screen === "modeselect") {
    const pickMode = (mode) => {
      setD(prev => ({ ...prev, mode }));
      if (typeof window.plausible === "function") {
        window.plausible("Mode Selected", { props: { mode } });
      }
      go("form");
    };
    return (
      <>
        <style>{css}</style>
        <div className="ms-wrap">
          <button className="ms-back" onClick={() => go("landing")}>← Back</button>
          <div className="ms-eyebrow">Choose Your Path</div>
          <h1 className="ms-title">What are you <em>looking for</em>?</h1>
          <p className="ms-sub">Same algorithm, different priorities.</p>
          <div className="ms-divider"><span className="ms-divider-dot"/></div>
          <div className="ms-tiles">

            <button type="button" className="ms-tile" onClick={() => pickMode("performance")}>
              <div className="ms-tile-numeral">01</div>
              <div className="ms-tile-eyebrow">The Player's Path</div>
              <div className="ms-tile-title">Performance Fit</div>
              <div className="ms-tile-rule"/>
              <ul className="ms-tile-bullets">
                <li className="ms-tile-bullet"><span className="ms-tile-bullet-mark">+</span><span>Tuned for power, control, spin, and feel</span></li>
                <li className="ms-tile-bullet"><span className="ms-tile-bullet-mark">+</span><span>Skips arm-health screening</span></li>
              </ul>
              <div className="ms-tile-cta">
                <span>Find My Game</span>
                <span className="ms-tile-cta-arrow">→</span>
              </div>
            </button>

            <button type="button" className="ms-tile" onClick={() => pickMode("armhealth")}>
              <div className="ms-tile-numeral">02</div>
              <div className="ms-tile-eyebrow">The Protective Path</div>
              <div className="ms-tile-title">Arm Health Fit</div>
              <div className="ms-tile-rule"/>
              <ul className="ms-tile-bullets">
                <li className="ms-tile-bullet"><span className="ms-tile-bullet-mark">+</span><span>40% scoring weight on arm-friendliness</span></li>
                <li className="ms-tile-bullet"><span className="ms-tile-bullet-mark">+</span><span>Full health and injury profile</span></li>
              </ul>
              <div className="ms-tile-cta">
                <span>Protect My Arm</span>
                <span className="ms-tile-cta-arrow">→</span>
              </div>
            </button>

          </div>
        </div>
      </>
    );
  }

  // -- LOADING ----------------------------------------------------------------
  if (screen === "loading") {
    const firstName = (d.name || "").split(" ")[0] || null;
    return (
      <>
        <style>{css}</style>
        <div className="pr-app">
          <div className="loading screen">

            {/* Ambient glow */}
            <div className="l-glow"/>

            {/* Personalised greeting */}
            {firstName && (
              <div className="l-greeting">
                Analyzing your game, {firstName}
              </div>
            )}
            {!firstName && (
              <div className="l-greeting">
                Analyzing your setup
              </div>
            )}

            {/* Radar - hero element */}
            <div className="radar">
              <div className="rring"/>
              <div className="rring"/>
              <div className="rring"/>
              <div className="rring"/>
              <div className="rdot"/>
            </div>

            {/* Phase text with fade transition */}
            <div className="l-phase-wrap">
              <h2 className={`l-phase${phaseFade ? " fade" : ""}`}>{(d.mode === "performance" ? PHASES_PERFORMANCE : PHASES_ARMHEALTH)[phase]}</h2>
            </div>

            {/* Step indicator dots */}
            <div className="l-steps">
              {(d.mode === "performance" ? PHASES_PERFORMANCE : PHASES_ARMHEALTH).map((_, i) => (
                <div key={i} className={`l-step-dot${i === phase ? " active" : i < phase ? " done" : ""}`}/>
              ))}
            </div>

            {/* Progress bar */}
            <div className="l-prog-track">
              <div className="l-prog-fill" style={{width:`${prog}%`}}/>
            </div>

            {/* Divider */}
            <div className="l-divider"/>

            {/* Rotating fact */}
            <div className={`l-fact${factFade ? " fade" : ""}`}>
              <div className="l-fact-lbl">Did you know?</div>
              <div className="l-fact-txt">{FACTS[factIdx]}</div>
            </div>

          </div>
        </div>
      </>
    );
  }

  // -- RESULTS ----------------------------------------------------------------
  if (screen === "results" && recs && recs.error) {
    return (
      <>
        <style>{css}</style>
        <div className="pr-app">
          <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"var(--sp-8) var(--sp-5)",textAlign:"center",background:"var(--cream)"}}>
            <div style={{fontSize:"var(--text-3xl)",marginBottom:"var(--sp-5)"}}>🎾</div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"var(--text-xl)",color:"var(--ink)",marginBottom:"var(--sp-3)"}}>Something went wrong</h2>
            <p style={{fontSize:"var(--text-sm)",color:"var(--mid)",lineHeight:1.6,marginBottom:"var(--sp-8)",maxWidth:320}}>We couldn't generate your recommendations. This is rare -- please try again and your results should come through.</p>
            <button onClick={reset} style={{background:"var(--clay)",border:"none",borderRadius:12,padding:"var(--sp-4) var(--sp-5)",fontFamily:"'Outfit',sans-serif",fontSize:"var(--text-base)",fontWeight:700,color:"var(--white)",cursor:"pointer",width:"100%",maxWidth:280}}>Try Again</button>
          </div>
        </div>
      </>
    );
  }

  if (screen === "results" && recs) {
    return (
      <>
        <style>{css}</style>
        <div className="pr-app">
          <div className="results screen">
            <div className="r-hdr">
              <div className="r-check">✓</div>
              <h1 className="r-title">Your Setup</h1>
              <p className="r-sub">{d.mode === "performance" ? "Personalized to your game, level, and priorities" : "Personalized to your game and arm health"}</p>
            </div>
            <div className="r-body">
              {/* Arm health impact callout */}
              {(() => {
                const injF  = recs.injuryFactor || 0;
                const pn    = recs.painNumeric || 0;
                const armWt = Math.round(40 + injF * 40);
                const eliminated = recs.allRacquets
                  ? recs.allRacquets.filter(r => r.hardGatePenalty > 0).length
                  : 0;
                const shifted = recs.allRacquets
                  ? recs.allRacquets.filter(r => r.userRiskPenalty > 5).length
                  : 0;
                const smallGrip = d.gripSize === "4" || d.gripSize === "4⅛";
                const hasElbow  = (d.painLocations||[]).includes("Elbow") || d.pastInjuryElbow === "Yes";
                const gripWarning = smallGrip && hasElbow;

                if (injF > 0.15 || pn >= 3) {
                  return (
                    <div className="arm-impact-card">
                      <div className="arm-impact-top">
                        <div className="arm-impact-shield">🛡️</div>
                        <div>
                          <div className="arm-impact-title">Arm health drove {armWt}% of this recommendation</div>
                          <div className="arm-impact-sub">
                            {eliminated > 0 && `${eliminated} frame${eliminated>1?"s":""} removed as too risky. `}
                            {shifted > 0 && `${shifted} frame${shifted>1?"s":""} ranked lower to protect your arm.`}
                            {eliminated === 0 && shifted === 0 && "Your injury history shifted selections toward safer frames."}
                          </div>
                        </div>
                      </div>
                      <div className="arm-impact-bar-track">
                        <div className="arm-impact-bar-fill" style={{width:`${armWt}%`}}/>
                      </div>
                      {gripWarning && (
                        <div style={{marginTop:"var(--sp-3)",paddingTop:"var(--sp-3)",borderTop:"1px solid rgba(200,82,42,0.15)",display:"flex",alignItems:"flex-start",gap:"var(--sp-2)"}}>
                          <span style={{fontSize:16,flexShrink:0}}>✋</span>
                          <p style={{fontSize:"var(--text-xs)",color:"var(--mid)",lineHeight:1.6,margin:0}}>
                            <strong style={{color:"var(--ink)"}}>Grip size note:</strong> Your {d.gripSize}" grip is on the smaller side. Small grips increase forearm muscle tension and can contribute to elbow stress — consider sizing up to 4¼ when you next restring or replace your frame.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // No arm impact card — show standalone grip warning if relevant
                if (gripWarning) {
                  return (
                    <div className="callout amber" style={{marginBottom:"var(--sp-4)"}}>
                      <span className="c-ico">✋</span>
                      <span className="c-txt">
                        <strong>Grip size note:</strong> Your {d.gripSize}" grip is on the smaller side. Small grips increase forearm muscle tension and can contribute to elbow stress — consider sizing up to 4¼ when you next restring or replace your frame.
                      </span>
                    </div>
                  );
                }

                return null;
              })()}
              <div className="setup-sum">
                <div className="setup-lbl">Your Profile</div>
                <p className="setup-txt">{recs.setupText}</p>
              </div>

              {recs.allOverBudget && (() => {
                const bestInBudget = (recs.allRacquets || []).find(r => r.budgetFlag === "in-budget");
                return (
                  <div>
                    <div className="callout amber" style={{marginBottom:"var(--sp-2)"}}>
                      <span className="c-ico">!</span>
                      <span className="c-txt">All top matches are over your budget. Showing best overall fits - consider these as targets or look for previous-generation versions.</span>
                    </div>
                    {bestInBudget && (
                      <div className="callout blue" style={{marginBottom:"var(--sp-4)"}}>
                        <span className="c-ico">💰</span>
                        <span className="c-txt">
                          <strong>Best in-budget option:</strong> {bestInBudget.brand} {bestInBudget.model} (${bestInBudget.price}) - scored {Math.round(bestInBudget.finalScore)}/100.
                          {" "}Not in your top 3 overall, but the best fit within your range.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Racquets */}
              <div className="r-sec-hdr">
                <span className="r-sec-e">🎾</span>
                <span className="r-sec-t">Racquet Recommendations</span>
              </div>

              {/* Confidence indicator — editorial voice, not a number */}
              {(() => {
                const scores   = recs.racquets.map(rc => rc.finalScore);
                const spread   = scores[0] - scores[2];
                const gap12    = scores[0] - scores[1];
                const injF     = recs.injuryFactor || 0;
                const pn       = recs.painNumeric  || 0;
                const perfFirst = d.comfortVsPerf === "Performance first";
                const highPain  = pn >= 6;
                const competing = highPain && perfFirst;
                const dominant  = gap12 >= 3 && injF >= 0.3;
                const closecall = spread < 2;

                if (competing) {
                  return (
                    <div style={{background:"rgba(200,82,42,0.06)",border:"1px solid rgba(200,82,42,0.18)",borderRadius:12,padding:"var(--sp-3) var(--sp-4)",marginBottom:"var(--sp-4)",display:"flex",alignItems:"flex-start",gap:"var(--sp-3)"}}>
                      <span style={{fontSize:18,flexShrink:0}}>⚖️</span>
                      <p style={{fontSize:"var(--text-sm)",color:"var(--mid)",lineHeight:1.6,margin:0}}>
                        <strong style={{color:"var(--ink)"}}>Your profile has some competing priorities.</strong> You selected performance-first but have significant arm pain — we weighted arm protection first. Your results reflect that trade-off.
                      </p>
                    </div>
                  );
                }
                if (dominant) {
                  return (
                    <div style={{background:"rgba(200,82,42,0.06)",border:"1px solid rgba(200,82,42,0.18)",borderRadius:12,padding:"var(--sp-3) var(--sp-4)",marginBottom:"var(--sp-4)",display:"flex",alignItems:"flex-start",gap:"var(--sp-3)"}}>
                      <span style={{fontSize:18,flexShrink:0}}>🎯</span>
                      <p style={{fontSize:"var(--text-sm)",color:"var(--mid)",lineHeight:1.6,margin:0}}>
                        <strong style={{color:"var(--ink)"}}>Our top pick for your arm.</strong> Given your injury profile, the {recs.racquets[0].model} stood out clearly from the field. The #2 and #3 options are solid alternatives if it is unavailable.
                      </p>
                    </div>
                  );
                }
                if (closecall) {
                  return (
                    <div style={{background:"rgba(13,27,42,0.04)",border:"1px solid var(--border)",borderRadius:12,padding:"var(--sp-3) var(--sp-4)",marginBottom:"var(--sp-4)",display:"flex",alignItems:"flex-start",gap:"var(--sp-3)"}}>
                      <span style={{fontSize:18,flexShrink:0}}>🔍</span>
                      <p style={{fontSize:"var(--text-sm)",color:"var(--mid)",lineHeight:1.6,margin:0}}>
                        <strong style={{color:"var(--ink)"}}>Three strong options — here is how they differ.</strong> Your profile does not point to a single dominant answer. All three scored closely. Read the explanations on each card to decide which trade-off suits your game.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {recs.racquets.map((r, i) => (
                <div key={r.model} className={`rcard${r.top ? " top" : ""}`}>
                  <div className="rc-hdr">
                    <div style={{flex:1}}>
                      <div className="rec-badge" style={{display:"inline-block",marginBottom:"var(--sp-2)"}}>
                        {r.top ? "Best Match" : `#${r.rank} Pick`}
                      </div>
                      <div className="rc-name">{r.brand} {r.model}</div>
                    </div>
                    {r.top
                      ? <div className="rc-rank" style={{fontSize:36,color:"var(--clay)",opacity:1}}>#1</div>
                      : <div className="rc-rank">#{r.rank}</div>
                    }
                  </div>
                  <div className="specs">
                    {Object.entries(r.specs).map(([k, v]) => (
                      <div key={k}><div className="spec-lbl">{k}</div><div className="spec-val">{v}</div></div>
                    ))}
                  </div>
                  {/* Score bars - full color on top card, muted on secondary */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px 10px",marginBottom:"var(--sp-3)"}}>
                    {[["Power",r.scores.power],["Control",r.scores.control],["Comfort",r.scores.comfort],["Spin",r.scores.spin],["Maneuver",r.scores.maneuverability]].map(([lbl,val]) => (
                      <div key={lbl}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:"var(--text-micro)",color:"var(--light)",marginBottom:"var(--sp-1)",fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em"}}>
                          <span>{lbl.toUpperCase()}</span><span>{val}</span>
                        </div>
                        <div style={{height:3,background:"var(--border)",borderRadius:2}}>
                          <div style={{height:"100%",width:`${val}%`,borderRadius:2,background:
                            r.top
                              ? "var(--gold)"
                              : "var(--navy-light)"
                          }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Why this racket -- personalised sentence from scoring engine */}
                  <div className="r-why">
                    <div className="r-why-l">Why this racket</div>
                    <div className="r-why-t">{r.whyText}</div>
                  </div>
                  <div className="r-tags">
                    {r.armFriendly && recs.injuryFactor > 0.15 && (
                      <span className="r-tag" style={{background:"rgba(200,82,42,0.12)",color:"var(--clay-bright)",border:"1px solid rgba(200,82,42,0.25)",display:"flex",alignItems:"center",gap:4}}>
                        <span>🛡️</span> Arm-safe pick
                      </span>
                    )}
                    {r.armFriendly && recs.injuryFactor <= 0.15 && <span className="r-tag">Arm Friendly</span>}
                    <span className="r-tag">{r.topStrengths}</span>
                    {r.budgetFlag === "in-budget" && <span className="r-tag" style={{background:"rgba(40,200,122,.1)",color:"#1A8055"}}>In Budget</span>}
                    {r.budgetFlag === "over-budget" && <span className="r-tag" style={{background:"rgba(232,84,84,.1)",color:"var(--red)"}}>Over Budget</span>}
                  </div>
                  <a href={getRacquetShopUrl(r)}
                     target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}
                     onClick={() => { if (typeof window.plausible === "function") window.plausible("Shop Click", { props: { product: `${r.brand} ${r.model}`, type: "racquet" } }); }}>
                    <button className={`shop-btn${r.top ? "" : " secondary"}`}>Shop on Tennis Express</button>
                  </a>
                </div>
              ))}

              {/* Section divider between racquets and strings */}
              <div className="sec-divider">
                <div className="sec-divider-line"/>
                <div className="sec-divider-label">Your String Setup</div>
                <div className="sec-divider-line"/>
              </div>

              {/* Strings */}
              <div className="r-sec-hdr">
                <span className="r-sec-e">🧵</span>
                <span className="r-sec-t">String Recommendations</span>
              </div>

              {/* Tension — moved here between string title and first string card */}
              <div className="t-card">
                <span style={{fontSize:"var(--text-xl)"}}>🎯</span>
                <div>
                  <div className="t-lbl">Recommended Tension</div>
                  <div className="t-val" style={{color:"var(--gold)"}}>{recs.tension.low}-{recs.tension.high} <span style={{fontSize:"var(--text-base)"}}>lbs</span></div>
                  <div className="t-hint">Start at {recs.tension.recommended} lbs and adjust. Lower tension = more power and comfort.</div>
                </div>
              </div>

              {recs.strings.map((s, i) => (
                <div key={s.name} className={`rcard${s.top ? " top" : ""}`}>
                  <div className="rc-hdr">
                    <div style={{flex:1}}>
                      <div className="rec-badge" style={{display:"inline-block",marginBottom:"var(--sp-2)"}}>
                        {s.top ? "Top Pick" : `#${i+1} Pick`}
                      </div>
                      <div className="rc-name">{s.name}</div>
                    </div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--text-xs)",color:"var(--light)",letterSpacing:"0.08em",marginTop:4,whiteSpace:"nowrap"}}>{s.type}</span>
                  </div>
                  <div className="r-tags" style={{marginBottom:"var(--sp-3)"}}>
                    {(s.tags||[]).map(tag => (
                      <span key={tag} className="r-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="r-why" style={{marginBottom:"var(--sp-3)"}}>
                    <div className="r-why-l">Why this string</div>
                    <div className="r-why-t">{s.why}</div>
                  </div>
                  <a href={getStringShopUrl(s)}
                     target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}
                     onClick={() => { if (typeof window.plausible === "function") window.plausible("Shop Click", { props: { product: s.name, type: "string" } }); }}>
                    <button className={`shop-btn${s.top ? "" : " secondary"}`}>Shop on Tennis Express</button>
                  </a>
                </div>
              ))}

              {/* Stringer script */}
              <div className="str-block" style={{marginBottom:"var(--sp-5)"}}>
                <div className="str-lbl">Your Stringer Script</div>
                <div className="str-script" style={{marginTop:0}}>{recs.stringerScript}</div>
              </div>

              {/* Legal disclaimer */}
              <div style={{background:"rgba(13,27,42,0.04)",border:"1px solid var(--border)",borderRadius:10,padding:"var(--sp-3) var(--sp-4)",marginBottom:"var(--sp-4)"}}>
                <p style={{fontSize:"var(--text-xs)",color:"var(--light)",lineHeight:1.6,margin:0}}>
                  <strong style={{color:"var(--mid)"}}>Equipment guidance only.</strong> Perfect Racket recommendations are based on your self-reported profile and are intended as a starting point for equipment selection — not medical advice. If you are experiencing persistent arm, shoulder, or wrist pain, please consult a qualified medical professional before changing your equipment or continuing to play.
                </p>
              </div>

              {/* Share / Save actions */}
              <div style={{display:"flex",gap:"var(--sp-2)",marginBottom:"var(--sp-3)"}}>
                <button
                  className="restart-btn"
                  style={{flex:1,marginBottom:0}}
                  onClick={() => {
                    const top = recs.racquets[0];
                    const str = recs.strings[0];
                    const text = [
                      "MY PERFECT RACKET SETUP",
                      "========================",
                      `Top Racket: ${top.brand} ${top.model}`,
                      `#2: ${recs.racquets[1].brand} ${recs.racquets[1].model}`,
                      `#3: ${recs.racquets[2].brand} ${recs.racquets[2].model}`,
                      "",
                      `Top String: ${str.name} (${str.type})`,
                      `Tension: ${recs.tension.low}-${recs.tension.high} lbs (start at ${recs.tension.recommended} lbs)`,
                      "",
                      "STRINGER SCRIPT:",
                      recs.stringerScript,
                      "",
                      "Generated by PerfectRacket.com",
                    ].join("\n");
                    navigator.clipboard.writeText(text).then(() => {
                      const btn = document.getElementById("copy-results-btn");
                      if (btn) { btn.textContent = "✓ Copied!"; setTimeout(() => { btn.textContent = "Copy Results"; }, 2000); }
                    }).catch(() => alert("Copy failed - please select and copy manually."));
                  }}
                  id="copy-results-btn"
                >Copy Results</button>
                <button
                  className="restart-btn"
                  style={{flex:1,marginBottom:0}}
                  onClick={() => window.print()}
                >Print / Save PDF</button>
              </div>
              <button className="restart-btn" onClick={reset}>Start Over</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // -- FORM -------------------------------------------------------------------
  const isPerf = d.mode === "performance";
  const totalSteps = isPerf ? 3 : 4;
  // Map actual step to user-visible step number (perf mode skips step 3, so step 4 displays as "step 3 of 3")
  const displayedStep = isPerf && step === 4 ? 3 : step;
  const pct = Math.round(((displayedStep - 1) / totalSteps) * 100);
  const tabs = isPerf
    ? [{ e:"👤", t:"You" }, { e:"🎾", t:"Game" }, { e:"🎯", t:"Goals" }]
    : [{ e:"👤", t:"You" }, { e:"🎾", t:"Game" }, { e:"💪", t:"Arm" }, { e:"🎯", t:"Goals" }];
  // Tab index for highlighting active/done state (perf step 4 = tab index 2 = "Goals")
  const activeTabIdx = isPerf && step === 4 ? 2 : step - 1;

  return (
    <>
      <style>{css}</style>
      <div className="pr-app">
        <div className="f-shell">

          {/* ── LEFT COLUMN: form (mobile = full width, desktop = 480px) ── */}
          <div className="f-col-form">
          {/* Header */}
          <div className="f-hdr">
            <div className="f-hdr-top">
              <span className="step-lbl">Step {displayedStep} of {totalSteps}</span>
              <span className="step-pct">{pct}% complete</span>
            </div>
            <div className="tab-nav">
              {tabs.map((t, i) => (
                <div key={i} className={`tab${activeTabIdx===i?" active":activeTabIdx>i?" done":""}`}>
                  <span className="tab-e">{t.e}</span>
                  <span className="tab-t">{t.t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className={`f-body${shaking?" shake":""}`} ref={bodyRef} style={step===3?{paddingBottom:"184px"}:{}}>

            {/* -- STEP 1: YOU -- */}
            {step === 1 && (
              <div className={`screen ${dir==="left"?"slide-left":"slide-right"}`}>
                <h1 className="step-title">About You</h1>
                <p className="step-sub">A few basics to get started.</p>

                <div className="scard" id="card-contact">
                  <div className="shd"><span className="shd-e">📝</span><span className="shd-t">Contact</span></div>
                  <div className="field">
                    <div className="flbl">Name <span className="req">*</span></div>
                    <input className={`ti${errors.name?" inp-err":""}`} placeholder="Your full name"
                      value={d.name} onChange={e=>upd("name",e.target.value)}
                      autoComplete="name" name="name"/>
                    <Err k="name"/>
                  </div>
                  <div className="field">
                    <div className="flbl">Email <span className="req">*</span></div>
                    <div className="fhint">We will send your recommendations here</div>
                    <input className={`ti${errors.email?" inp-err":""}`} type="email"
                      placeholder="your@email.com" value={d.email}
                      onChange={e=>upd("email",e.target.value)}
                      autoComplete="email" name="email"/>
                    <Err k="email"/>
                  </div>
                </div>

                <div className="scard" id="card-about">
                  <div className="shd"><span className="shd-e">📐</span><span className="shd-t">About You</span></div>
                  <div className="field">
                    <div className="flbl">Age Range <span className="req">*</span></div>
                    <div className="fhint">Age affects injury risk and frame weight recommendations</div>
                    <div className="grid2">
                      {[["18-25"],["26-35"],["36-45"],["46-55"],["56-65"],["66+"]].map(([l]) => (
                        <div key={l} className={`go${d.ageRange===l?" sel":""}`} onClick={()=>{upd("ageRange",l);}}>
                          <span className="go-l">{l}</span>
                          {d.ageRange===l && <div className="chk">✓</div>}
                        </div>
                      ))}
                    </div>
                    <Err k="ageRange"/>
                  </div>
                  <div className="field">
                    <div className="flbl">NTRP Level <span className="req">*</span></div>
                    <div className="fhint">2.5 = beginner, 3.0 = improving, 3.5 = intermediate, 4.0 = strong amateur, 4.5 = advanced</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"var(--sp-2)"}}>
                      {["2.5","3.0","3.5","4.0","4.5"].map(l => (
                        <div key={l} className={`go${d.ntrp===l?" sel":""}`} onClick={()=>{upd("ntrp",l);}}>
                          <span className="go-l" style={{fontSize:"var(--text-lg)",fontFamily:"'Bebas Neue',sans-serif"}}>{l}</span>
                          {d.ntrp===l && <div className="chk">✓</div>}
                        </div>
                      ))}
                    </div>
                    <Err k="ntrp"/>
                  </div>
                  <div className="field" style={{marginBottom:0}}>
                    <div className="flbl">Current Grip Size <span className="fopt">(Optional)</span></div>
                    <div className="fhint">Grip size affects arm health — too small can increase forearm tension and elbow stress</div>
                    <div className="grid2">
                      {[["4","Small"],["4⅛","Small-Med"],["4¼","Medium"],["4⅜","Med-Large"],["4½","Large"],["—","Not Sure"]].map(([size,label]) => (
                        <div key={size} className={`go${d.gripSize===size?" sel":""}`} onClick={()=>upd("gripSize",size)}>
                          <span className="go-l" style={{fontSize:"var(--text-md)",fontFamily:"'Bebas Neue',sans-serif"}}>{size}</span>
                          <span style={{fontSize:"var(--text-xs)",color:"var(--mid)"}}>{label}</span>
                          {d.gripSize===size && <div className="chk">✓</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* -- STEP 2: YOUR GAME -- */}
            {step === 2 && (
              <div className={`screen ${dir==="left"?"slide-left":"slide-right"}`}>
                <h1 className="step-title">Your Game</h1>
                <p className="step-sub">Tell us how you play so we can tailor your setup.</p>

                <div className="scard" id="card-style">
                  <div className="shd"><span className="shd-e">🎾</span><span className="shd-t">Playing Style</span></div>
                  <div className="field">
                    <div className="flbl">Current Racket <span className="fopt">(Optional)</span></div>
                    <div className="fhint">Knowing your current frame helps us explain exactly why we're recommending something different</div>
                    <input className="ti" placeholder="e.g. Wilson Clash 100, Babolat Pure Drive, not sure"
                      value={d.currentRacket} onChange={e=>upd("currentRacket",e.target.value)}/>
                  </div>
                  <div className="field">
                    <div className="flbl">Play Style <span className="req">*</span></div>
                    {[["🎯","Baseliner","Stay back and control rallies"],
                      ["🏃","All-Court","Mix it up from anywhere"],
                      ["👥","Doubles-First","Net play and teamwork"],
                      ["⚡","Serve & Volley","Attack and finish at net"],
                    ].map(([e,t,desc]) => (
                      <div key={t} className={`lo${d.playStyle===t?" sel":""}`} onClick={()=>upd("playStyle",t)}>
                        <span className="lo-e">{e}</span>
                        <div className="lo-c"><div className="lo-t">{t}</div><div className="lo-d">{desc}</div></div>
                        {d.playStyle===t && <div className="chk">✓</div>}
                      </div>
                    ))}
                    <Err k="playStyle"/>
                  </div>
                  <div className="field">
                    <div className="flbl">Play Frequency <span className="req">*</span></div>
                    <div className="grid2">
                      {[["< 1x/wk"],["1-2x/wk"],["3-4x/wk"],["5+x/wk"]].map(([l]) => (
                        <div key={l} className={`go${d.playFrequency===l?" sel":""}`} onClick={()=>{upd("playFrequency",l);}}>
                          <span className="go-l">{l}</span>
                          {d.playFrequency===l && <div className="chk">✓</div>}
                        </div>
                      ))}
                    </div>
                    <Err k="playFrequency"/>
                  </div>
                </div>

                <div className="scard" id="card-swing">
                  <div className="shd"><span className="shd-e">⚡</span><span className="shd-t">Swing</span></div>
                  <div className="field">
                    <div className="flbl">Swing Speed <span className="req">*</span></div>
                    {[["Slow & Controlled","Smooth, measured swings"],
                      ["Moderate","Good pace with controlled acceleration"],
                      ["Fast & Aggressive","Hard swings with lots of racquet head speed"],
                      ["Not sure","I do not know my swing speed"],
                    ].map(([t,desc],i) => (
                      <div key={t} className={`lo${d.swingSpeed===t?" sel":""}`} onClick={()=>upd("swingSpeed",t)}>
                        <span className={`lo-stripe ${["c-clay","c-gold","c-blue"][i%3]}`}/>
                        <div className="lo-c"><div className="lo-t">{t}</div><div className="lo-d">{desc}</div></div>
                        {d.swingSpeed===t && <div className="chk">✓</div>}
                      </div>
                    ))}
                    <Err k="swingSpeed"/>
                  </div>
                </div>

                <div className="scard" id="card-priority-focus">
                  <div className="shd"><span className="shd-e">🎯</span><span className="shd-t">Priority Focus</span></div>
                  <div className="field">
                    <div className="flbl">What matters most to you? <span className="req">*</span></div>
                    <div className="fhint">Pick the single trait you'd most want to optimize. Drives the biggest weight in your final ranking.</div>
                    {[["Power","More pop on every shot, easy depth"],
                      ["Control","Precision over force; place the ball where you want"],
                      ["Spin","More RPM on groundstrokes for shape and bite"],
                      ["Maneuverability","Quick handling, easy to whip around at net"],
                      ["Balanced","No single trait dominant; well-rounded fit"],
                    ].map(([t,desc],i) => (
                      <div key={t} className={`lo${d.priorityFocus===t?" sel":""}`} onClick={()=>upd("priorityFocus",t)}>
                        <span className={`lo-stripe ${["c-clay","c-gold","c-blue"][i%3]}`}/>
                        <div className="lo-c"><div className="lo-t">{t}</div><div className="lo-d">{desc}</div></div>
                        {d.priorityFocus===t && <div className="chk">✓</div>}
                      </div>
                    ))}
                    <Err k="priorityFocus"/>
                  </div>
                </div>
              </div>
            )}

            {/* -- STEP 3: ARM HEALTH -- */}
            {step === 3 && (() => {
              // Live injury factor preview for the arm health meter
              const PAIN_N = {"No issues":0,"Mild discomfort after playing":3,"Pain during play but manageable":6,"Severe pain that limits play":9};
              const pnLive = PAIN_N[d.painSeverity] || 0;
              const pastAdd = (d.pastInjuryElbow==="Yes"?.10:0)+(d.pastInjuryShoulder==="Yes"?.10:0)+(d.pastInjuryWrist==="Yes"?.10:0);
              const rawLive = Math.min(1, Math.max(0, pnLive/10 + pastAdd));
              const armPct  = Math.round(rawLive * 100);
              const armWeight = Math.round(40 + rawLive * 40); // 40% base up to 80% at full injury
              const meterColor = armPct === 0 ? "var(--mid)" : armPct < 30 ? "var(--gold)" : armPct < 60 ? "#E08040" : "var(--clay)";
              const meterMsg = armPct === 0
                ? "Arm health will act as a protective baseline in your results."
                : armPct < 30
                ? "Mild history detected -- arm health will be weighted more heavily than usual."
                : armPct < 60
                ? "Significant arm history -- recommendations will shift meaningfully toward safer frames."
                : "Arm health is now the dominant factor in your recommendation.";
              return (
              <div className={`screen ${dir==="left"?"slide-left":"slide-right"}`}>
                <h1 className="step-title">Arm Health</h1>
                <p className="step-sub">This is where Perfect Racket is different. Your arm health drives up to 80% of your recommendation.</p>



              <div className="scard" id="card-pain">
                  <div className="shd"><span className="shd-e">📍</span><span className="shd-t">Current Pain</span></div>
                  <div className="field">
                    <div className="flbl">Where does it hurt?</div>
                    <div className="fhint">Select all that apply</div>
                    <div className="grid2">
                      {[["No Pain"],["Elbow"],["Shoulder"],["Wrist"]].map(([t]) => (
                        <div key={t} className={`go${(d.painLocations||[]).includes(t)?" sel":""}`} onClick={()=>togglePain(t)}>
                          <span className="go-l">{t}</span>
                          {(d.painLocations||[]).includes(t) && <div className="chk">✓</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <div className="flbl">Current Severity <span className="req">*</span></div>
                    {[["No issues","No arm pain at all"],
                      ["Mild discomfort after playing","Some soreness after sessions"],
                      ["Pain during play but manageable","Affects play but you push through"],
                      ["Severe pain that limits play","Significant impact on your game"],
                    ].map(([t,desc],i) => (
                      <div key={t} className={`lo${d.painSeverity===t?" sel":""}`} onClick={()=>{upd("painSeverity",t);}}>
                        <span className={`lo-stripe ${["c-clay","c-gold","c-blue"][i%3]}`}/>
                        <div className="lo-c"><div className="lo-t">{t}</div><div className="lo-d">{desc}</div></div>
                        {d.painSeverity===t && <div className="chk">✓</div>}
                      </div>
                    ))}
                    <Err k="painSeverity"/>
                  </div>
                </div>

                <div className="scard" id="card-history">
                  <div className="shd"><span className="shd-e">🩺</span><span className="shd-t">Injury History</span></div>
                  <div className="field">
                    <div className="flbl">Any previous arm injuries?</div>
                    <div className="fhint">Past injuries affect your risk profile even when currently pain-free. Select all that apply.</div>
                    <div className="grid2">
                      {[["Elbow"],["Shoulder"],["Wrist"],["None"]].map(([t]) => (
                        <div key={t} className={`go${(d.pastInjuries||[]).includes(t)?" sel":""}`}
                          onClick={() => {togglePastInjury(t);}}>
                          <span className="go-l">{t}</span>
                          {(d.pastInjuries||[]).includes(t) && <div className="chk">✓</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {(d.painSeverity !== "No issues" && d.painSeverity !== "") && (
                  <div className="scard" id="card-rehab">
                    <div className="shd"><span className="shd-e">🏥</span><span className="shd-t">Managing It?</span></div>
                    <div className="field">
                      <div className="flbl">Are you currently doing anything to manage it?</div>
                      {[["Nothing","Not actively managing it"],
                        ["Physical Therapy","Working with a physio"],
                        ["Strength Training","Doing rehab exercises"],
                        ["Load Management","Reducing volume or intensity"],
                        ["Resting It","Taking time off"],
                      ].map(([t,desc],i) => (
                        <div key={t} className={`lo${d.rehabStatus===t?" sel":""}`} onClick={()=>{upd("rehabStatus",t);}}>
                          <span className={`lo-stripe ${["c-clay","c-gold","c-blue"][i%3]}`}/>
                          <div className="lo-c"><div className="lo-t">{t}</div><div className="lo-d">{desc}</div></div>
                          {d.rehabStatus===t && <div className="chk">✓</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="scard" id="card-strings">
                  <div className="shd"><span className="shd-e">🧵</span><span className="shd-t">Current Strings</span></div>
                  <div className="field">
                    <div className="flbl">String Type <span className="req">*</span></div>
                    {[["⚡","Polyester","Hard-hitting but toughest on arms"],
                      ["🤲","Multifilament","Arm-friendly with good feel"],
                      ["🌿","Natural Gut","Most arm-friendly, premium cost"],
                      ["🔀","Hybrid","Poly main + softer cross"],
                      ["🤷","Not Sure","I do not know what's in my racket"],
                    ].map(([e,t,desc]) => (
                      <div key={t} className={`lo${d.stringType===t?" sel":""}`} onClick={()=>upd("stringType",t)}>
                        <span className="lo-e">{e}</span>
                        <div className="lo-c"><div className="lo-t">{t}</div><div className="lo-d">{desc}</div></div>
                        {d.stringType===t && <div className="chk">✓</div>}
                      </div>
                    ))}
                    <Err k="stringType"/>
                  </div>
                  {d.stringType !== "Not Sure" && d.stringType !== "" && (
                    <div className="field">
                      <div className="flbl">Current Tension Range</div>
                      <div className="fhint">Higher tension = more control but more arm stress</div>
                      <div className="grid2" style={{gridTemplateColumns:"1fr 1fr 1fr"}}>
                        {[["🔵","Low","Under 50 lbs"],["🟡","Medium","50-56 lbs"],["🔴","High","Over 56 lbs"]].map(([e,t,desc]) => (
                          <div key={t} className={`go${d.tensionRange===t?" sel":""}`} onClick={()=>{upd("tensionRange",t);}}>
                            <span className="go-e">{e}</span>
                            <span className="go-l">{t}</span>
                            <span style={{fontSize:"var(--text-xs)",color:"var(--light)",textAlign:"center"}}>{desc}</span>
                            {d.tensionRange===t && <div className="chk">✓</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {d.stringType === "Polyester" && (d.painSeverity || "").includes("Pain") && (
                    <div className="callout amber">
                      <span className="c-ico">!</span>
                      <span className="c-txt">Polyester with arm pain is a risky combination. Our recommendations will account for this.</span>
                    </div>
                  )}
                </div>

                <div className="scard" id="card-priority">
                  <div className="shd"><span className="shd-e">⚖️</span><span className="shd-t">Your Priority</span></div>
                  <div className="field">
                    <div className="flbl">If arm health and performance conflict, which wins? <span className="req">*</span></div>
                    <div className="fhint">This is different from play style -- it is about how much you are willing to trade performance to protect your body.</div>
                    {[["#22C55E","🛡️","Comfort first","I will take a less powerful setup if it keeps me healthy"],
                      ["#3B82F6","⚖️","Balanced","Best setup for my game, arm health as an equal factor"],
                      ["#EF4444","🏆","Performance first","Maximum performance -- I will manage arm health separately"],
                    ].map(([c,e,t,desc]) => (
                      <div key={t} className={`co${d.comfortVsPerf===t?" sel":""}`} onClick={()=>{upd("comfortVsPerf",t);}}>
                        <div className="cdot" style={{background:c}}>{e}</div>
                        <div className="co-t">{t}</div>
                        <div className="co-d">{desc}</div>
                        {d.comfortVsPerf===t && <div className="chk" style={{top:10,right:10}}>✓</div>}
                      </div>
                    ))}
                    <Err k="comfortVsPerf"/>
                  </div>
                </div>


              </div>
              );
            })()}

            {/* -- STEP 4: GOALS -- */}
            {step === 4 && (
              <div className={`screen ${dir==="left"?"slide-left":"slide-right"}`}>
                <h1 className="step-title">Final Details</h1>
                <p className="step-sub">Almost there -- just two quick things.</p>

                <div className="scard" id="card-budget">
                  <div className="shd"><span className="shd-e">💰</span><span className="shd-t">Racket Budget</span></div>
                  <div className="field">
                    <div className="flbl">What is your budget? <span className="fopt">(Optional)</span></div>
                    <div className="fhint">We will flag which recommendations are within your range. Your score is never affected by budget.</div>
                    {[["Under $260"],["$260-$290"],["$290+"],["No preference"]].map(([l],i) => (
                      <div key={l} className={`lo${d.budget===l?" sel":""}`} onClick={()=>{upd("budget",l);}}>
                        <span className={`lo-stripe ${["c-clay","c-gold","c-blue"][i%3]}`}/>
                        <div className="lo-c"><div className="lo-t">{l}</div></div>
                        {d.budget===l && <div className="chk">✓</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="scard" id="card-goals">
                  <div className="shd"><span className="shd-e">🎯</span><span className="shd-t">Your Goals</span></div>
                  <div className="field">
                    <div className="flbl">Goals for the next year <span className="fopt">(Select all that apply)</span></div>
                    <div className="fhint">The more specific you are, the better we can tailor the reasoning behind your recommendations.</div>
                    <div className="gchips">
                      {[["Reduce arm pain and play more comfortably"],
                        ["Improve consistency on groundstrokes"],
                        ["Play more doubles and improve net game"],
                        ["Add more power without sacrificing control"],
                        ["Find a setup I can stick with long-term"],
                        ["Generate more spin on my forehand"],
                      ].map(([t],i) => {
                        const selected = (d.goals||[]).includes(t);
                        return (
                          <div key={t}
                            className={`gchip${selected ? " sel" : ""}`}
                            onClick={() => {
                              const curr = d.goals || [];
                              upd("goals", selected
                                ? curr.filter(g => g !== t)
                                : [...curr, t]
                              );
                            }}>
                            <span className={`gchip-stripe ${["c-clay","c-gold","c-blue"][i%3]}`}/>
                            <span style={{flex:1}}>{t}</span>
                            {selected && <div className="gchip-check">✓</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            )}

          </div>

          {/* Arm health strip — mobile only, step 3, sits above footer */}
          {step === 3 && (() => {
            const PAIN_N = {"No issues":0,"Mild discomfort after playing":3,"Pain during play but manageable":6,"Severe pain that limits play":9};
            const pnS = PAIN_N[d.painSeverity] || 0;
            const pastS = (d.pastInjuryElbow==="Yes"?.10:0)+(d.pastInjuryShoulder==="Yes"?.10:0)+(d.pastInjuryWrist==="Yes"?.10:0);
            const rawS = Math.min(1, Math.max(0, pnS/10 + pastS));
            const wtS  = Math.round(40 + rawS * 40);
            const colS = rawS === 0 ? "var(--white)" : rawS < 0.3 ? "var(--gold)" : rawS < 0.6 ? "#E08040" : "var(--clay)";
            return (
              <div className="arm-strip">
                <div className="arm-strip-top">
                  <span className="arm-strip-lbl">Arm Health Meter</span>
                  <span className="arm-strip-pct" style={{color:colS}} key={wtS}>{wtS}%</span>
                </div>
                <div className="arm-strip-track">
                  <div className="arm-strip-fill" style={{width:`${wtS}%`, background:`linear-gradient(to right, ${colS}, var(--clay-bright))`}}/>
                </div>
                <div className="arm-strip-msg">{wtS > 40
                  ? (rawS < 0.3 ? "Mild history detected — arm health weighted more heavily."
                    : rawS < 0.6 ? "Significant history — shifting toward safer frames."
                    : "Arm health is now the dominant factor in your recommendation.")
                  : "Arm health will act as a protective baseline in your results."
                }</div>
              </div>
            );
          })()}

          {/* Footer */}
          <div className={`f-foot${shaking?" shake":""}`}>
            <button className="btn-back" onClick={prev}>Back</button>
            <button className="btn-next" onClick={next}>
              {step === 4 ? "Get My Setup"
                : step === 1 ? "Your Game"
                : step === 2 ? (isPerf ? "Goals" : "Arm Health")
                : "Goals"}
            </button>
          </div>

          </div>{/* end f-col-form */}

          {/* ── RIGHT COLUMN: contextual panel (desktop only) ── */}
          <div className="f-col-panel">
            {(() => {
              // Step 1 — What you'll receive
              if (step === 1) return (
                <div style={{maxWidth:420,width:"100%"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(200,82,42,0.8)",marginBottom:32}}>What you'll receive</div>
                  {[
                    ["🎾","Top 3 racket matches","Scored across 6 dimensions and explained for your game"],
                    ["🧵","String & tension recommendation","Matched to your arm health, swing speed, and play style"],
                    ["📋","Your stringer script","Copy-paste ready to hand straight to your pro shop"],
                  ].map(([e,title,desc]) => (
                    <div key={title} style={{display:"flex",gap:20,marginBottom:32}}>
                      <div style={{width:48,height:48,borderRadius:12,background:"rgba(200,82,42,0.12)",border:"1px solid rgba(200,82,42,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{e}</div>
                      <div>
                        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:"var(--white)",lineHeight:1.2,marginBottom:6}}>{title}</div>
                        <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>{desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24,marginTop:8}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em"}}>FREE · ~3 MINUTES · ARM HEALTH WEIGHTED AT 40%</div>
                  </div>
                </div>
              );

              // Step 2 — Live profile summary
              if (step === 2) return (
                <div style={{maxWidth:420,width:"100%"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(200,82,42,0.8)",marginBottom:32}}>Your profile so far</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:52,fontWeight:700,color:"var(--white)",lineHeight:1,marginBottom:24}}>
                    {d.ntrp || "—"}
                    <span style={{fontSize:24,color:"rgba(255,255,255,0.3)",marginLeft:12}}>NTRP</span>
                  </div>
                  {[
                    ["Age",        d.ageRange   || "—"],
                    ["Play Style", d.playStyle  || "—"],
                    ["Frequency",  d.playFrequency || "—"],
                    ["Swing",      d.swingSpeed || "—"],
                  ].map(([label, value]) => (
                    <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:14,marginBottom:14}}>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.3)"}}>{label}</span>
                      <span style={{fontSize:15,fontWeight:600,color:value==="—"?"rgba(255,255,255,0.2)":"var(--white)"}}>{value}</span>
                    </div>
                  ))}
                </div>
              );

              // Step 3 — Large arm health meter
              if (step === 3) {
                const PAIN_N = {"No issues":0,"Mild discomfort after playing":3,"Pain during play but manageable":6,"Severe pain that limits play":9};
                const pnLive = PAIN_N[d.painSeverity] || 0;
                const pastAdd = (d.pastInjuryElbow==="Yes"?.10:0)+(d.pastInjuryShoulder==="Yes"?.10:0)+(d.pastInjuryWrist==="Yes"?.10:0);
                const rawLive = Math.min(1, Math.max(0, pnLive/10 + pastAdd));
                const armWeight = Math.round(40 + rawLive * 40);
                const meterColor = rawLive === 0 ? "rgba(255,255,255,0.3)" : rawLive < 0.3 ? "var(--gold)" : rawLive < 0.6 ? "#E08040" : "var(--clay-bright)";
                const meterMsg = rawLive === 0
                  ? "Arm health acts as a protective baseline in your results."
                  : rawLive < 0.3 ? "Mild history detected — arm health is weighted more heavily."
                  : rawLive < 0.6 ? "Significant history — recommendations shift toward safer frames."
                  : "Arm health is now the dominant factor in your recommendation.";
                return (
                  <div style={{maxWidth:420,width:"100%",textAlign:"center"}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(200,82,42,0.8)",marginBottom:40}}>Arm Health Influence</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:120,lineHeight:1,color:meterColor,transition:"color 0.4s ease",marginBottom:8}}>{armWeight}%</div>
                    <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:6,overflow:"hidden",marginBottom:24}}>
                      <div style={{height:"100%",width:`${armWeight}%`,background:meterColor,borderRadius:6,transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)"}}/>
                    </div>
                    <div style={{fontSize:14,color:"rgba(255,255,255,0.45)",lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>{meterMsg}</div>
                  </div>
                );
              }

              // Step 4 — Results preview
              return (
                <div style={{maxWidth:420,width:"100%"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(200,82,42,0.8)",marginBottom:32}}>Almost there</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:700,color:"var(--white)",lineHeight:1.2,marginBottom:24}}>Your personalized setup is one step away.</div>
                  <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:24,marginBottom:16}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(200,82,42,0.7)",marginBottom:12}}>Top Racket Match</div>
                    <div style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.25)",letterSpacing:"0.05em"}}>Calculating...</div>
                    <div style={{marginTop:16,display:"flex",gap:6}}>
                      {[60,85,45,70,55].map((w,i) => (
                        <div key={i} style={{flex:1}}>
                          <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2}}>
                            <div style={{height:"100%",width:`${w}%`,background:"rgba(200,82,42,0.3)",borderRadius:2}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:24,opacity:0.6}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(200,82,42,0.7)",marginBottom:12}}>Top String</div>
                    <div style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.2)"}}>Calculating...</div>
                  </div>
                </div>
              );
            })()}
          </div>{/* end f-col-panel */}

        </div>
      </div>
    </>
  );
}
