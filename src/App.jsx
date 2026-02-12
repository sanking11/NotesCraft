import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { generateSalt, deriveKey, hashPassword, exportKey, importKey } from "./crypto.js";
import { createSyncAdapter } from "./sync.js";
import { EncryptedStorage } from "./storage.js";

/* ═══════════════════════════════════════════════════
   THEMES
   ═══════════════════════════════════════════════════ */
/* Font sets — each theme references one of these */
const FONTS = {
  default: { heading:"'Orbitron'", body:"'Space Grotesk'", mono:"'IBM Plex Mono'" },
  literary: { heading:"'Playfair Display'", body:"'Lora'", mono:"'Source Code Pro'" },
  minimal: { heading:"'Inter'", body:"'Inter'", mono:"'JetBrains Mono'" },
  elegant: { heading:"'Cormorant Garamond'", body:"'Nunito Sans'", mono:"'Fira Code'" },
  techno: { heading:"'Rajdhani'", body:"'Exo 2'", mono:"'Share Tech Mono'" },
  writer: { heading:"'Libre Baskerville'", body:"'Merriweather'", mono:"'DM Mono'" },
  geometric: { heading:"'Audiowide'", body:"'Quicksand'", mono:"'Inconsolata'" },
  humanist: { heading:"'Poppins'", body:"'DM Sans'", mono:"'Roboto Mono'" },
  creative: { heading:"'Abril Fatface'", body:"'Karla'", mono:"'Victor Mono'" },
  editorial: { heading:"'Fraunces'", body:"'Commissioner'", mono:"'Fragment Mono'" },
  nordic: { heading:"'Sora'", body:"'Outfit'", mono:"'Overpass Mono'" },
  retro: { heading:"'Righteous'", body:"'Nunito'", mono:"'Courier Prime'" },
  luxury: { heading:"'Cinzel'", body:"'Raleway'", mono:"'Fira Code'" },
  casual: { heading:"'Baloo 2'", body:"'Rubik'", mono:"'Red Hat Mono'" },
  scholarly: { heading:"'EB Garamond'", body:"'Source Serif 4'", mono:"'Source Code Pro'" },
  futuristic: { heading:"'Oxanium'", body:"'Chakra Petch'", mono:"'Share Tech Mono'" },
  display: { heading:"'Unbounded'", body:"'Figtree'", mono:"'Space Mono'" },
  handwritten: { heading:"'Caveat'", body:"'Atkinson Hyperlegible'", mono:"'IBM Plex Mono'" },
  industrial: { heading:"'Archivo Black'", body:"'Work Sans'", mono:"'JetBrains Mono'" },
  art: { heading:"'Gloock'", body:"'Instrument Sans'", mono:"'Inconsolata'" },
};

const THEMES = {
  midnight:{id:"midnight",name:"Midnight Void",icon:"🌑",desc:"Deep violet void for focused late-night sessions",dark:true,fonts:"default",bg:"#08060f",bg2:"#0c0a1a",bg3:"#0e0b1e",accent:"#8b5cf6",accent2:"#0ea5e9",accentRgb:"139,92,246",text:"#e8ecf4",dim:"#a0aec0",faint:"rgba(160,174,192,0.7)",bdr:"rgba(139,92,246,0.08)",surf:"rgba(255,255,255,0.03)",surfH:"rgba(139,92,246,0.1)",ok:"#4ade80",err:"#f87171",warn:"#facc15",grad:"radial-gradient(ellipse at 30% 20%,#0c0a1a 0%,#080613 40%,#030208 100%)"},
  oatGreen:{id:"oatGreen",name:"Oat & Fern",icon:"🌿",desc:"Warm oat tones with fresh green accents",dark:false,fonts:"literary",bg:"#faf6ed",bg2:"#f3efe4",bg3:"#faf8f2",accent:"#5cb25d",accent2:"#0f9015",accentRgb:"92,178,93",text:"#1a1a1a",dim:"#3d3d3c",faint:"rgba(61,61,60,0.72)",bdr:"rgba(92,178,93,0.15)",surf:"rgba(92,178,93,0.05)",surfH:"rgba(92,178,93,0.1)",ok:"#0f9015",err:"#e53529",warn:"#c49a1a",grad:"radial-gradient(ellipse at 30% 20%,#f0ede2 0%,#faf6ed 40%,#faf8f2 100%)"},
  roseDusk:{id:"roseDusk",name:"Rose Dusk",icon:"🌸",desc:"Romantic pink haze over a dark twilight sky",dark:true,fonts:"elegant",bg:"#1a1118",bg2:"#1e141c",bg3:"#181016",accent:"#e879a8",accent2:"#c084fc",accentRgb:"232,121,168",text:"#f8eaf2",dim:"#c4a0ad",faint:"rgba(196,160,173,0.7)",bdr:"rgba(232,121,168,0.1)",surf:"rgba(232,121,168,0.04)",surfH:"rgba(232,121,168,0.1)",ok:"#86efac",err:"#fca5a5",warn:"#fde68a",grad:"radial-gradient(ellipse at 30% 20%,#221520 0%,#1a1118 40%,#0f0a0d 100%)"},
  arctic:{id:"arctic",name:"Arctic Frost",icon:"❄️",desc:"Crisp blue-white frost for clear thinking",dark:false,fonts:"minimal",bg:"#f0f4f8",bg2:"#e8eef3",bg3:"#f5f8fb",accent:"#2563eb",accent2:"#0891b2",accentRgb:"37,99,235",text:"#0f172a",dim:"#3b4a60",faint:"rgba(59,74,96,0.72)",bdr:"rgba(37,99,235,0.12)",surf:"rgba(37,99,235,0.04)",surfH:"rgba(37,99,235,0.08)",ok:"#16a34a",err:"#dc2626",warn:"#ca8a04",grad:"radial-gradient(ellipse at 30% 20%,#e0e8f0 0%,#f0f4f8 40%,#f5f8fb 100%)"},
  ember:{id:"ember",name:"Warm Ember",icon:"🔥",desc:"Glowing coals in a dark fireplace",dark:true,fonts:"default",bg:"#1c0c0a",bg2:"#200e0c",bg3:"#180a08",accent:"#ef4444",accent2:"#f59e0b",accentRgb:"239,68,68",text:"#fef3c7",dim:"#c4a87a",faint:"rgba(196,168,122,0.7)",bdr:"rgba(239,68,68,0.1)",surf:"rgba(239,68,68,0.04)",surfH:"rgba(239,68,68,0.1)",ok:"#a3e635",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#281410 0%,#1c0c0a 40%,#100606 100%)"},
  ocean:{id:"ocean",name:"Deep Ocean",icon:"🌊",desc:"Dive into calm deep-sea blues and teals",dark:true,fonts:"humanist",bg:"#0a1628",bg2:"#0c182c",bg3:"#0a1426",accent:"#06b6d4",accent2:"#3b82f6",accentRgb:"6,182,212",text:"#e4f4fe",dim:"#8ad4f8",faint:"rgba(138,212,248,0.7)",bdr:"rgba(6,182,212,0.1)",surf:"rgba(6,182,212,0.04)",surfH:"rgba(6,182,212,0.1)",ok:"#34d399",err:"#fb7185",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#0f2040 0%,#0a1628 40%,#060e1a 100%)"},
  cyberNeon:{id:"cyberNeon",name:"Cyber Neon",icon:"⚡",desc:"Electric green on pitch black, hacker vibes",dark:true,fonts:"art",bg:"#0a0a0f",bg2:"#0d0d14",bg3:"#08080d",accent:"#00ff88",accent2:"#00d4ff",accentRgb:"0,255,136",text:"#e8ffee",dim:"#90e0a8",faint:"rgba(144,224,168,0.7)",bdr:"rgba(0,255,136,0.1)",surf:"rgba(0,255,136,0.04)",surfH:"rgba(0,255,136,0.1)",ok:"#00ff88",err:"#ff4466",warn:"#ffdd00",grad:"radial-gradient(ellipse at 30% 20%,#0d1a10 0%,#0a0a0f 40%,#050508 100%)"},
  sunset:{id:"sunset",name:"Golden Sunset",icon:"🌅",desc:"Warm amber light fading over the horizon",dark:false,fonts:"writer",bg:"#fdf6ee",bg2:"#f8efe2",bg3:"#fef9f3",accent:"#e07b28",accent2:"#d94f7a",accentRgb:"224,123,40",text:"#2a1a08",dim:"#6b4f30",faint:"rgba(107,79,48,0.72)",bdr:"rgba(224,123,40,0.15)",surf:"rgba(224,123,40,0.05)",surfH:"rgba(224,123,40,0.1)",ok:"#16a34a",err:"#dc2626",warn:"#ca8a04",grad:"radial-gradient(ellipse at 30% 20%,#f5e8d4 0%,#fdf6ee 40%,#fef9f3 100%)"},
  lavender:{id:"lavender",name:"Lavender Mist",icon:"💜",desc:"Soft purple haze, gentle and refined",dark:false,fonts:"elegant",bg:"#f3eef8",bg2:"#ece5f3",bg3:"#f7f2fc",accent:"#9333ea",accent2:"#c084fc",accentRgb:"147,51,234",text:"#1e1030",dim:"#4d3868",faint:"rgba(77,56,104,0.7)",bdr:"rgba(147,51,234,0.12)",surf:"rgba(147,51,234,0.04)",surfH:"rgba(147,51,234,0.08)",ok:"#22c55e",err:"#ef4444",warn:"#eab308",grad:"radial-gradient(ellipse at 30% 20%,#e8e0f0 0%,#f3eef8 40%,#f7f2fc 100%)"},
  forest:{id:"forest",name:"Dark Forest",icon:"🌲",desc:"Shadowed woodland with emerald highlights",dark:true,fonts:"literary",bg:"#0c1410",bg2:"#0e1812",bg3:"#0a120e",accent:"#22c55e",accent2:"#14b8a6",accentRgb:"34,197,94",text:"#d8f2e0",dim:"#88c89c",faint:"rgba(136,200,156,0.7)",bdr:"rgba(34,197,94,0.1)",surf:"rgba(34,197,94,0.04)",surfH:"rgba(34,197,94,0.1)",ok:"#4ade80",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#122018 0%,#0c1410 40%,#060a08 100%)"},
  sakura:{id:"sakura",name:"Sakura Bloom",icon:"🌺",desc:"Cherry blossom pinks on a light canvas",dark:false,fonts:"humanist",bg:"#fdf2f5",bg2:"#f8e8ed",bg3:"#fef6f8",accent:"#e83e8c",accent2:"#c04080",accentRgb:"232,62,140",text:"#2a0e1a",dim:"#6e3050",faint:"rgba(110,48,80,0.7)",bdr:"rgba(232,62,140,0.12)",surf:"rgba(232,62,140,0.05)",surfH:"rgba(232,62,140,0.1)",ok:"#22c55e",err:"#e53e3e",warn:"#d69e2e",grad:"radial-gradient(ellipse at 30% 20%,#f5dce4 0%,#fdf2f5 40%,#fef6f8 100%)"},
  slate:{id:"slate",name:"Modern Slate",icon:"🖤",desc:"Clean monochrome for distraction-free writing",dark:true,fonts:"minimal",bg:"#18181b",bg2:"#1c1c20",bg3:"#151518",accent:"#a1a1aa",accent2:"#71717a",accentRgb:"161,161,170",text:"#f0f0f4",dim:"#a8a8b0",faint:"rgba(168,168,176,0.7)",bdr:"rgba(161,161,170,0.1)",surf:"rgba(255,255,255,0.04)",surfH:"rgba(161,161,170,0.1)",ok:"#4ade80",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#222228 0%,#18181b 40%,#0e0e10 100%)"},
  copper:{id:"copper",name:"Brushed Copper",icon:"🥉",desc:"Metallic warmth with burnished copper tones",dark:true,fonts:"writer",bg:"#1c1608",bg2:"#201a0c",bg3:"#181406",accent:"#cd7f52",accent2:"#b8621b",accentRgb:"205,127,82",text:"#f2e8de",dim:"#c0a48a",faint:"rgba(192,164,138,0.7)",bdr:"rgba(205,127,82,0.1)",surf:"rgba(205,127,82,0.04)",surfH:"rgba(205,127,82,0.1)",ok:"#6ee7a0",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#28200e 0%,#1c1608 40%,#100c04 100%)"},
  mint:{id:"mint",name:"Fresh Mint",icon:"🍃",desc:"Cool teal-green that feels crisp and airy",dark:false,fonts:"geometric",bg:"#eef8f5",bg2:"#e4f2ee",bg3:"#f3fbf8",accent:"#0d9488",accent2:"#0891b2",accentRgb:"13,148,136",text:"#0a2a24",dim:"#30645a",faint:"rgba(48,100,90,0.72)",bdr:"rgba(13,148,136,0.14)",surf:"rgba(13,148,136,0.05)",surfH:"rgba(13,148,136,0.1)",ok:"#059669",err:"#dc2626",warn:"#ca8a04",grad:"radial-gradient(ellipse at 30% 20%,#d8f0ea 0%,#eef8f5 40%,#f3fbf8 100%)"},
  dracula:{id:"dracula",name:"Dracula",icon:"🧛",desc:"The classic dark theme loved by developers",dark:true,fonts:"default",bg:"#282a36",bg2:"#2c2e3a",bg3:"#242632",accent:"#bd93f9",accent2:"#ff79c6",accentRgb:"189,147,249",text:"#f8f8f2",dim:"#b0b0c4",faint:"rgba(176,176,196,0.7)",bdr:"rgba(189,147,249,0.1)",surf:"rgba(189,147,249,0.04)",surfH:"rgba(189,147,249,0.1)",ok:"#50fa7b",err:"#ff5555",warn:"#f1fa8c",grad:"radial-gradient(ellipse at 30% 20%,#323446 0%,#282a36 40%,#1e2028 100%)"},
  parchment:{id:"parchment",name:"Old Parchment",icon:"📜",desc:"Aged paper warmth for the literary soul",dark:false,fonts:"writer",bg:"#f5f0e1",bg2:"#ece5d0",bg3:"#f8f4e8",accent:"#8b6914",accent2:"#a67c2e",accentRgb:"139,105,20",text:"#2c2416",dim:"#5c4a2e",faint:"rgba(92,74,46,0.7)",bdr:"rgba(139,105,20,0.15)",surf:"rgba(139,105,20,0.05)",surfH:"rgba(139,105,20,0.1)",ok:"#4d7c0f",err:"#b91c1c",warn:"#a16207",grad:"radial-gradient(ellipse at 30% 20%,#e8e0c8 0%,#f5f0e1 40%,#f8f4e8 100%)"},
  terminal:{id:"terminal",name:"Terminal",icon:"💻",desc:"Green phosphor on black, retro CRT style",dark:true,fonts:"techno",bg:"#0c0c0c",bg2:"#111111",bg3:"#080808",accent:"#00ff41",accent2:"#00cc33",accentRgb:"0,255,65",text:"#00ff41",dim:"#00cc33",faint:"rgba(0,204,51,0.6)",bdr:"rgba(0,255,65,0.1)",surf:"rgba(0,255,65,0.03)",surfH:"rgba(0,255,65,0.08)",ok:"#00ff41",err:"#ff3333",warn:"#ffff00",grad:"radial-gradient(ellipse at 30% 20%,#0a1a0a 0%,#0c0c0c 40%,#050505 100%)"},
  nordicFrost:{id:"nordicFrost",name:"Nordic Frost",icon:"🏔️",desc:"Scandinavian cool with indigo accents",dark:false,fonts:"nordic",bg:"#e8edf2",bg2:"#dde4ec",bg3:"#edf1f5",accent:"#4c6ef5",accent2:"#7950f2",accentRgb:"76,110,245",text:"#1a1b2e",dim:"#434765",faint:"rgba(67,71,101,0.7)",bdr:"rgba(76,110,245,0.12)",surf:"rgba(76,110,245,0.04)",surfH:"rgba(76,110,245,0.08)",ok:"#12b886",err:"#fa5252",warn:"#fab005",grad:"radial-gradient(ellipse at 30% 20%,#d4dce8 0%,#e8edf2 40%,#edf1f5 100%)"},
  monokai:{id:"monokai",name:"Monokai Pro",icon:"🎨",desc:"Vibrant syntax colors on a warm dark base",dark:true,fonts:"default",bg:"#2d2a2e",bg2:"#333036",bg3:"#28252a",accent:"#ffd866",accent2:"#ff6188",accentRgb:"255,216,102",text:"#fcfcfa",dim:"#c1bfb5",faint:"rgba(193,191,181,0.7)",bdr:"rgba(255,216,102,0.1)",surf:"rgba(255,216,102,0.04)",surfH:"rgba(255,216,102,0.08)",ok:"#a9dc76",err:"#ff6188",warn:"#ffd866",grad:"radial-gradient(ellipse at 30% 20%,#383540 0%,#2d2a2e 40%,#221f24 100%)"},
  sand:{id:"sand",name:"Desert Sand",icon:"🏜️",desc:"Sun-baked dunes with terracotta warmth",dark:false,fonts:"retro",bg:"#f6f1e7",bg2:"#ede6d6",bg3:"#faf6ee",accent:"#c2703e",accent2:"#9c5830",accentRgb:"194,112,62",text:"#3d2b1a",dim:"#7a5e42",faint:"rgba(122,94,66,0.7)",bdr:"rgba(194,112,62,0.14)",surf:"rgba(194,112,62,0.05)",surfH:"rgba(194,112,62,0.1)",ok:"#2e7d32",err:"#c62828",warn:"#f57f17",grad:"radial-gradient(ellipse at 30% 20%,#e8ddc8 0%,#f6f1e7 40%,#faf6ee 100%)"},
  aurora:{id:"aurora",name:"Aurora Borealis",icon:"🌌",desc:"Northern lights dancing across a dark sky",dark:true,fonts:"geometric",bg:"#070b14",bg2:"#0a0f1a",bg3:"#060912",accent:"#38ef7d",accent2:"#a855f7",accentRgb:"56,239,125",text:"#e0f0e8",dim:"#88c8a0",faint:"rgba(136,200,160,0.7)",bdr:"rgba(56,239,125,0.1)",surf:"rgba(56,239,125,0.04)",surfH:"rgba(56,239,125,0.08)",ok:"#38ef7d",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#0c1a20 0%,#070b14 40%,#030610 100%)"},
  typewriter:{id:"typewriter",name:"Typewriter",icon:"⌨️",desc:"Ink on paper, classic monochrome nostalgia",dark:false,fonts:"literary",bg:"#f4f1ec",bg2:"#eae5dc",bg3:"#f8f6f2",accent:"#444444",accent2:"#666666",accentRgb:"68,68,68",text:"#1a1a1a",dim:"#555555",faint:"rgba(85,85,85,0.65)",bdr:"rgba(68,68,68,0.15)",surf:"rgba(68,68,68,0.04)",surfH:"rgba(68,68,68,0.08)",ok:"#2e7d32",err:"#c62828",warn:"#8d6e00",grad:"radial-gradient(ellipse at 30% 20%,#e6e2d8 0%,#f4f1ec 40%,#f8f6f2 100%)"},
  synthwave:{id:"synthwave",name:"Synthwave",icon:"🎵",desc:"Retro-futuristic neon over dark purple grids",dark:true,fonts:"techno",bg:"#1a1025",bg2:"#1e1230",bg3:"#160e20",accent:"#ff2975",accent2:"#f222ff",accentRgb:"255,41,117",text:"#f0e0ff",dim:"#c09ee0",faint:"rgba(192,158,224,0.7)",bdr:"rgba(255,41,117,0.12)",surf:"rgba(255,41,117,0.04)",surfH:"rgba(255,41,117,0.1)",ok:"#00ffc8",err:"#ff2975",warn:"#ffe156",grad:"radial-gradient(ellipse at 30% 20%,#261840 0%,#1a1025 40%,#100818 100%)"},
  /* ─── 40 New Themes ─── */
  obsidian:{id:"obsidian",name:"Obsidian Depths",icon:"🪨",desc:"Volcanic glass with molten red edges",dark:true,fonts:"creative",bg:"#100404",bg2:"#140808",bg3:"#0c0202",accent:"#c83020",accent2:"#ff6b35",accentRgb:"200,48,32",text:"#f0e0e0",dim:"#b89090",faint:"rgba(184,144,144,0.7)",bdr:"rgba(200,48,32,0.1)",surf:"rgba(200,48,32,0.04)",surfH:"rgba(200,48,32,0.1)",ok:"#4ade80",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#1c0a08 0%,#100404 40%,#060202 100%)"},
  nebula:{id:"nebula",name:"Nebula Cloud",icon:"🔮",desc:"Cosmic purple dust with stellar pink glow",dark:true,fonts:"display",bg:"#0d0818",bg2:"#100c1e",bg3:"#0a0614",accent:"#c77dff",accent2:"#ff6bb5",accentRgb:"199,125,255",text:"#ece0ff",dim:"#a890cc",faint:"rgba(168,144,204,0.7)",bdr:"rgba(199,125,255,0.1)",surf:"rgba(199,125,255,0.04)",surfH:"rgba(199,125,255,0.1)",ok:"#7aefb2",err:"#ff7096",warn:"#ffd060",grad:"radial-gradient(ellipse at 30% 20%,#180e2a 0%,#0d0818 40%,#06030e 100%)"},
  matrix:{id:"matrix",name:"Matrix Rain",icon:"🟢",desc:"Digital rain cascading through the system",dark:true,fonts:"futuristic",bg:"#050a05",bg2:"#080e08",bg3:"#040804",accent:"#00e050",accent2:"#40ff80",accentRgb:"0,224,80",text:"#c0ffc0",dim:"#60c060",faint:"rgba(96,192,96,0.65)",bdr:"rgba(0,224,80,0.1)",surf:"rgba(0,224,80,0.03)",surfH:"rgba(0,224,80,0.08)",ok:"#00e050",err:"#ff4040",warn:"#e0e000",grad:"radial-gradient(ellipse at 30% 20%,#081a08 0%,#050a05 40%,#020502 100%)"},
  abyss:{id:"abyss",name:"Deep Abyss",icon:"🐋",desc:"Ocean floor darkness with bioluminescent teal",dark:true,fonts:"nordic",bg:"#060d14",bg2:"#081018",bg3:"#050b12",accent:"#20c4b0",accent2:"#1890d0",accentRgb:"32,196,176",text:"#d0f0f0",dim:"#70b0b0",faint:"rgba(112,176,176,0.7)",bdr:"rgba(32,196,176,0.1)",surf:"rgba(32,196,176,0.04)",surfH:"rgba(32,196,176,0.1)",ok:"#40e8c0",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#0c1a24 0%,#060d14 40%,#030810 100%)"},
  noir:{id:"noir",name:"Film Noir",icon:"🎬",desc:"Black and white drama with silver highlights",dark:true,fonts:"industrial",bg:"#101010",bg2:"#141414",bg3:"#0c0c0c",accent:"#c0c0c0",accent2:"#909090",accentRgb:"192,192,192",text:"#e8e8e8",dim:"#a0a0a0",faint:"rgba(160,160,160,0.7)",bdr:"rgba(192,192,192,0.1)",surf:"rgba(255,255,255,0.04)",surfH:"rgba(192,192,192,0.08)",ok:"#80e080",err:"#e07070",warn:"#e0c060",grad:"radial-gradient(ellipse at 30% 20%,#1a1a1a 0%,#101010 40%,#080808 100%)"},
  bloodMoon:{id:"bloodMoon",name:"Blood Moon",icon:"🌘",desc:"Dark crimson eclipse with amber moonlight",dark:true,fonts:"retro",bg:"#180a04",bg2:"#1c0e08",bg3:"#140802",accent:"#a01818",accent2:"#e08020",accentRgb:"160,24,24",text:"#f0d0c0",dim:"#c09080",faint:"rgba(192,144,128,0.7)",bdr:"rgba(160,24,24,0.1)",surf:"rgba(160,24,24,0.04)",surfH:"rgba(160,24,24,0.1)",ok:"#60d880",err:"#f06060",warn:"#e0a030",grad:"radial-gradient(ellipse at 30% 20%,#241008 0%,#180a04 40%,#0c0402 100%)"},
  cosmos:{id:"cosmos",name:"Cosmic Drift",icon:"🪐",desc:"Floating through indigo stardust and silver",dark:true,fonts:"geometric",bg:"#08081a",bg2:"#0c0c22",bg3:"#060616",accent:"#7868e0",accent2:"#9850d0",accentRgb:"120,104,224",text:"#d8e0ff",dim:"#90a0d0",faint:"rgba(144,160,208,0.7)",bdr:"rgba(120,104,224,0.1)",surf:"rgba(120,104,224,0.04)",surfH:"rgba(120,104,224,0.1)",ok:"#50e8a0",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#101030 0%,#08081a 40%,#040410 100%)"},
  shadow:{id:"shadow",name:"Shadow Realm",icon:"👤",desc:"Charcoal depths with warm amber lantern light",dark:true,fonts:"writer",bg:"#121010",bg2:"#161414",bg3:"#100e0e",accent:"#e0a040",accent2:"#d08030",accentRgb:"224,160,64",text:"#f0e4d0",dim:"#b0a088",faint:"rgba(176,160,136,0.7)",bdr:"rgba(224,160,64,0.1)",surf:"rgba(224,160,64,0.04)",surfH:"rgba(224,160,64,0.1)",ok:"#70d890",err:"#f08070",warn:"#e0b040",grad:"radial-gradient(ellipse at 30% 20%,#1e1a14 0%,#121010 40%,#080808 100%)"},
  phantom:{id:"phantom",name:"Phantom Night",icon:"👻",desc:"Cool gray darkness with electric cyan sparks",dark:true,fonts:"futuristic",bg:"#0e1014",bg2:"#121418",bg3:"#0c0e12",accent:"#40d0e0",accent2:"#2090c0",accentRgb:"64,208,224",text:"#e0e8f0",dim:"#88a0b0",faint:"rgba(136,160,176,0.7)",bdr:"rgba(64,208,224,0.1)",surf:"rgba(64,208,224,0.04)",surfH:"rgba(64,208,224,0.1)",ok:"#50e0a0",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#141a20 0%,#0e1014 40%,#080a0e 100%)"},
  volcanic:{id:"volcanic",name:"Volcanic Ash",icon:"🌋",desc:"Dark basalt stone with fiery orange lava veins",dark:true,fonts:"industrial",bg:"#1a1410",bg2:"#1e1814",bg3:"#16120e",accent:"#ff6010",accent2:"#e04808",accentRgb:"255,96,16",text:"#f0e0d0",dim:"#b09880",faint:"rgba(176,152,128,0.7)",bdr:"rgba(255,96,16,0.1)",surf:"rgba(255,96,16,0.04)",surfH:"rgba(255,96,16,0.1)",ok:"#60d880",err:"#f06060",warn:"#e0a040",grad:"radial-gradient(ellipse at 30% 20%,#261c16 0%,#1a1410 40%,#0e0a08 100%)"},
  deepPurple:{id:"deepPurple",name:"Royal Night",icon:"👑",desc:"Rich velvet purple fit for royalty",dark:true,fonts:"luxury",bg:"#140a22",bg2:"#180e28",bg3:"#12081e",accent:"#a050e0",accent2:"#c070ff",accentRgb:"160,80,224",text:"#e8d8f8",dim:"#a890c0",faint:"rgba(168,144,192,0.7)",bdr:"rgba(160,80,224,0.1)",surf:"rgba(160,80,224,0.04)",surfH:"rgba(160,80,224,0.1)",ok:"#60e8a0",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#201434 0%,#140a22 40%,#0a0614 100%)"},
  midnightBlue:{id:"midnightBlue",name:"Midnight Blue",icon:"🫐",desc:"Classic deep navy with soft blue editorial type",dark:true,fonts:"editorial",bg:"#0a0e1e",bg2:"#0e1226",bg3:"#080c1a",accent:"#4488ff",accent2:"#60a0ff",accentRgb:"68,136,255",text:"#d8e4ff",dim:"#88a0d0",faint:"rgba(136,160,208,0.7)",bdr:"rgba(68,136,255,0.1)",surf:"rgba(68,136,255,0.04)",surfH:"rgba(68,136,255,0.1)",ok:"#50e0a0",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#101830 0%,#0a0e1e 40%,#060810 100%)"},
  neonCity:{id:"neonCity",name:"Neon City",icon:"🏙️",desc:"Cyberpunk magenta lighting up dark streets",dark:true,fonts:"futuristic",bg:"#12081a",bg2:"#160c1e",bg3:"#100618",accent:"#ff40a0",accent2:"#e020ff",accentRgb:"255,64,160",text:"#f8e0f0",dim:"#c090b0",faint:"rgba(192,144,176,0.7)",bdr:"rgba(255,64,160,0.1)",surf:"rgba(255,64,160,0.04)",surfH:"rgba(255,64,160,0.1)",ok:"#50f0a0",err:"#ff5080",warn:"#ffe060",grad:"radial-gradient(ellipse at 30% 20%,#1e1026 0%,#12081a 40%,#0a040e 100%)"},
  darkChocolate:{id:"darkChocolate",name:"Dark Chocolate",icon:"🍫",desc:"Rich cocoa warmth for cozy late-night reading",dark:true,fonts:"scholarly",bg:"#14100c",bg2:"#181410",bg3:"#120e0a",accent:"#b0784c",accent2:"#d09060",accentRgb:"176,120,76",text:"#f0e4d4",dim:"#b8a490",faint:"rgba(184,164,144,0.7)",bdr:"rgba(176,120,76,0.1)",surf:"rgba(176,120,76,0.04)",surfH:"rgba(176,120,76,0.1)",ok:"#60c880",err:"#e07060",warn:"#d0a040",grad:"radial-gradient(ellipse at 30% 20%,#201a14 0%,#14100c 40%,#0a0806 100%)"},
  stormCloud:{id:"stormCloud",name:"Storm Cloud",icon:"⛈️",desc:"Dark thunderclouds charged with electric blue",dark:true,fonts:"nordic",bg:"#0e121c",bg2:"#121620",bg3:"#0c1018",accent:"#5090e0",accent2:"#70b0ff",accentRgb:"80,144,224",text:"#d8e0f0",dim:"#8098b8",faint:"rgba(128,152,184,0.7)",bdr:"rgba(80,144,224,0.1)",surf:"rgba(80,144,224,0.04)",surfH:"rgba(80,144,224,0.1)",ok:"#50d8a0",err:"#f87171",warn:"#fbbf24",grad:"radial-gradient(ellipse at 30% 20%,#1a1e2c 0%,#0e121c 40%,#060a10 100%)"},
  witchHour:{id:"witchHour",name:"Witching Hour",icon:"🧙",desc:"Mystical dark teal with enchanted green glow",dark:true,fonts:"art",bg:"#080e0c",bg2:"#0c1210",bg3:"#060c0a",accent:"#30c890",accent2:"#20a070",accentRgb:"48,200,144",text:"#d0f0e0",dim:"#80b8a0",faint:"rgba(128,184,160,0.7)",bdr:"rgba(48,200,144,0.1)",surf:"rgba(48,200,144,0.04)",surfH:"rgba(48,200,144,0.1)",ok:"#40e090",err:"#f08070",warn:"#e0c050",grad:"radial-gradient(ellipse at 30% 20%,#0e1a16 0%,#080e0c 40%,#040806 100%)"},
  darkAmber:{id:"darkAmber",name:"Dark Amber",icon:"✨",desc:"Black onyx surface with liquid gold accents",dark:true,fonts:"luxury",bg:"#0c0a02",bg2:"#100e06",bg3:"#0a0800",accent:"#e0a820",accent2:"#c89010",accentRgb:"224,168,32",text:"#f8f0d0",dim:"#c0b080",faint:"rgba(192,176,128,0.7)",bdr:"rgba(224,168,32,0.1)",surf:"rgba(224,168,32,0.04)",surfH:"rgba(224,168,32,0.1)",ok:"#60d880",err:"#f08060",warn:"#e0b030",grad:"radial-gradient(ellipse at 30% 20%,#181404 0%,#0c0a02 40%,#040400 100%)"},
  eclipse:{id:"eclipse",name:"Solar Eclipse",icon:"🌗",desc:"Dark sky with a blazing golden corona ring",dark:true,fonts:"display",bg:"#0c0810",bg2:"#100c16",bg3:"#0a060e",accent:"#ffc030",accent2:"#e09020",accentRgb:"255,192,48",text:"#f8f0e0",dim:"#b8a880",faint:"rgba(184,168,128,0.7)",bdr:"rgba(255,192,48,0.1)",surf:"rgba(255,192,48,0.04)",surfH:"rgba(255,192,48,0.1)",ok:"#60e890",err:"#f87171",warn:"#ffc030",grad:"radial-gradient(ellipse at 30% 20%,#181420 0%,#0c0810 40%,#060408 100%)"},
  ravens:{id:"ravens",name:"Raven's Wing",icon:"🐦‍⬛",desc:"Blue-black iridescence with cool silver sheen",dark:true,fonts:"editorial",bg:"#06080e",bg2:"#0a0c12",bg3:"#04060c",accent:"#8090b0",accent2:"#a0b0d0",accentRgb:"128,144,176",text:"#d8e0e8",dim:"#8898a8",faint:"rgba(136,152,168,0.7)",bdr:"rgba(128,144,176,0.1)",surf:"rgba(128,144,176,0.04)",surfH:"rgba(128,144,176,0.1)",ok:"#50d890",err:"#f08080",warn:"#e0c050",grad:"radial-gradient(ellipse at 30% 20%,#0e1218 0%,#06080e 40%,#020406 100%)"},
  voidPink:{id:"voidPink",name:"Void Pink",icon:"💖",desc:"Deep darkness punctuated by hot pink energy",dark:true,fonts:"casual",bg:"#100810",bg2:"#140c14",bg3:"#0e060e",accent:"#e830c0",accent2:"#ff60e0",accentRgb:"232,48,192",text:"#f8e0f0",dim:"#c090a8",faint:"rgba(192,144,168,0.7)",bdr:"rgba(232,48,192,0.1)",surf:"rgba(232,48,192,0.04)",surfH:"rgba(232,48,192,0.1)",ok:"#60e8a0",err:"#ff5080",warn:"#ffd060",grad:"radial-gradient(ellipse at 30% 20%,#1c0e1c 0%,#100810 40%,#080408 100%)"},
  cream:{id:"cream",name:"Vanilla Cream",icon:"🍦",desc:"Soft vanilla warmth with espresso accents",dark:false,fonts:"scholarly",bg:"#f8f2e4",bg2:"#f0ead8",bg3:"#fcf6ec",accent:"#8b6040",accent2:"#a07050",accentRgb:"139,96,64",text:"#2a2018",dim:"#6b5840",faint:"rgba(107,88,64,0.7)",bdr:"rgba(139,96,64,0.14)",surf:"rgba(139,96,64,0.05)",surfH:"rgba(139,96,64,0.1)",ok:"#2e7d32",err:"#c62828",warn:"#a16207",grad:"radial-gradient(ellipse at 30% 20%,#eee0cc 0%,#f8f2e4 40%,#fcf6ec 100%)"},
  skyBlue:{id:"skyBlue",name:"Open Sky",icon:"☁️",desc:"Clear blue sky on a perfect cloudless day",dark:false,fonts:"casual",bg:"#e6f0fc",bg2:"#dce8f8",bg3:"#eef4fe",accent:"#3080e0",accent2:"#2060c0",accentRgb:"48,128,224",text:"#0c1a2e",dim:"#3a5068",faint:"rgba(58,80,104,0.7)",bdr:"rgba(48,128,224,0.12)",surf:"rgba(48,128,224,0.04)",surfH:"rgba(48,128,224,0.08)",ok:"#16a34a",err:"#dc2626",warn:"#ca8a04",grad:"radial-gradient(ellipse at 30% 20%,#d0e0f4 0%,#e6f0fc 40%,#eef4fe 100%)"},
  peach:{id:"peach",name:"Peach Sorbet",icon:"🍑",desc:"Sweet peachy warmth with coral highlights",dark:false,fonts:"handwritten",bg:"#fceee4",bg2:"#f6e6d8",bg3:"#fef2ec",accent:"#e07050",accent2:"#d05040",accentRgb:"224,112,80",text:"#2a1810",dim:"#705040",faint:"rgba(112,80,64,0.7)",bdr:"rgba(224,112,80,0.14)",surf:"rgba(224,112,80,0.05)",surfH:"rgba(224,112,80,0.1)",ok:"#22a050",err:"#d03030",warn:"#c08020",grad:"radial-gradient(ellipse at 30% 20%,#f2dcc8 0%,#fceee4 40%,#fef2ec 100%)"},
  sage:{id:"sage",name:"Sage Garden",icon:"🌱",desc:"Muted sage greens evoking a peaceful garden",dark:false,fonts:"elegant",bg:"#f0f4ee",bg2:"#e6ece2",bg3:"#f4f8f2",accent:"#488068",accent2:"#387058",accentRgb:"72,128,104",text:"#1a2a18",dim:"#3a5a48",faint:"rgba(58,90,72,0.7)",bdr:"rgba(72,128,104,0.14)",surf:"rgba(72,128,104,0.05)",surfH:"rgba(72,128,104,0.1)",ok:"#2e8040",err:"#c03030",warn:"#a08020",grad:"radial-gradient(ellipse at 30% 20%,#e0e8dc 0%,#f0f4ee 40%,#f4f8f2 100%)"},
  cloud:{id:"cloud",name:"Silver Cloud",icon:"🌥️",desc:"Soft silver gray, light as a floating cloud",dark:false,fonts:"humanist",bg:"#f0f0f2",bg2:"#e6e6ea",bg3:"#f4f4f6",accent:"#6070a0",accent2:"#5060b0",accentRgb:"96,112,160",text:"#1a1c24",dim:"#505868",faint:"rgba(80,88,104,0.7)",bdr:"rgba(96,112,160,0.12)",surf:"rgba(96,112,160,0.04)",surfH:"rgba(96,112,160,0.08)",ok:"#22a050",err:"#d03030",warn:"#a08820",grad:"radial-gradient(ellipse at 30% 20%,#e0e0e6 0%,#f0f0f2 40%,#f4f4f6 100%)"},
  honey:{id:"honey",name:"Honey Glow",icon:"🍯",desc:"Golden honey dripping on warm toast",dark:false,fonts:"handwritten",bg:"#f8efd0",bg2:"#f0e6c2",bg3:"#fcf4d8",accent:"#d4a010",accent2:"#c08808",accentRgb:"212,160,16",text:"#2a2010",dim:"#6a5830",faint:"rgba(106,88,48,0.7)",bdr:"rgba(212,160,16,0.15)",surf:"rgba(212,160,16,0.05)",surfH:"rgba(212,160,16,0.1)",ok:"#408830",err:"#c03020",warn:"#a88020",grad:"radial-gradient(ellipse at 30% 20%,#eee0b0 0%,#f8efd0 40%,#fcf4d8 100%)"},
  blush:{id:"blush",name:"Soft Blush",icon:"🌷",desc:"Delicate pink tones, feminine and graceful",dark:false,fonts:"creative",bg:"#fce6ee",bg2:"#f6dce6",bg3:"#feecf2",accent:"#d06080",accent2:"#c04868",accentRgb:"208,96,128",text:"#2a1018",dim:"#704050",faint:"rgba(112,64,80,0.7)",bdr:"rgba(208,96,128,0.12)",surf:"rgba(208,96,128,0.05)",surfH:"rgba(208,96,128,0.1)",ok:"#30a050",err:"#d03040",warn:"#c08830",grad:"radial-gradient(ellipse at 30% 20%,#f2d0dc 0%,#fce6ee 40%,#feecf2 100%)"},
  seafoam:{id:"seafoam",name:"Seafoam Shore",icon:"🐚",desc:"Coastal aqua and white-sand serenity",dark:false,fonts:"display",bg:"#e4faf6",bg2:"#d8f4f0",bg3:"#ecfcfa",accent:"#0880b8",accent2:"#0668a0",accentRgb:"8,128,184",text:"#0c1e28",dim:"#284858",faint:"rgba(40,72,88,0.7)",bdr:"rgba(8,128,184,0.14)",surf:"rgba(8,128,184,0.05)",surfH:"rgba(8,128,184,0.1)",ok:"#10a060",err:"#d03030",warn:"#a09020",grad:"radial-gradient(ellipse at 30% 20%,#ccece8 0%,#e4faf6 40%,#ecfcfa 100%)"},
  linen:{id:"linen",name:"Warm Linen",icon:"🧵",desc:"Natural linen texture with terracotta thread",dark:false,fonts:"literary",bg:"#f0e8dc",bg2:"#e8e0d2",bg3:"#f4ece2",accent:"#966050",accent2:"#7e5040",accentRgb:"150,96,80",text:"#2a1c14",dim:"#5e4838",faint:"rgba(94,72,56,0.7)",bdr:"rgba(150,96,80,0.14)",surf:"rgba(150,96,80,0.05)",surfH:"rgba(150,96,80,0.1)",ok:"#2e7d32",err:"#c02828",warn:"#a07818",grad:"radial-gradient(ellipse at 30% 20%,#e0d6c6 0%,#f0e8dc 40%,#f4ece2 100%)"},
  daisy:{id:"daisy",name:"Daisy Field",icon:"🌼",desc:"Cheerful yellow petals over fresh green stems",dark:false,fonts:"casual",bg:"#f8f8ee",bg2:"#f0f0e2",bg3:"#fcfcf4",accent:"#a0a020",accent2:"#80a010",accentRgb:"160,160,32",text:"#1c1c0c",dim:"#505020",faint:"rgba(80,80,32,0.65)",bdr:"rgba(160,160,32,0.14)",surf:"rgba(160,160,32,0.05)",surfH:"rgba(160,160,32,0.1)",ok:"#40a030",err:"#c03020",warn:"#a09020",grad:"radial-gradient(ellipse at 30% 20%,#eeeede 0%,#f8f8ee 40%,#fcfcf4 100%)"},
  pearl:{id:"pearl",name:"Pearl White",icon:"🦪",desc:"Iridescent white with subtle purple shimmer",dark:false,fonts:"luxury",bg:"#eef0fc",bg2:"#e4e8f6",bg3:"#f4f6fe",accent:"#7060b8",accent2:"#5848a0",accentRgb:"112,96,184",text:"#141828",dim:"#404860",faint:"rgba(64,72,96,0.7)",bdr:"rgba(112,96,184,0.12)",surf:"rgba(112,96,184,0.04)",surfH:"rgba(112,96,184,0.08)",ok:"#20a050",err:"#d03030",warn:"#a09030",grad:"radial-gradient(ellipse at 30% 20%,#dee2f0 0%,#eef0fc 40%,#f4f6fe 100%)"},
  coral:{id:"coral",name:"Coral Reef",icon:"🪸",desc:"Tropical coral pinks and warm ocean tones",dark:false,fonts:"retro",bg:"#ffe0d4",bg2:"#f8d4c8",bg3:"#ffe8dc",accent:"#d04830",accent2:"#c03820",accentRgb:"208,72,48",text:"#2a1410",dim:"#6a4840",faint:"rgba(106,72,64,0.7)",bdr:"rgba(208,72,48,0.14)",surf:"rgba(208,72,48,0.05)",surfH:"rgba(208,72,48,0.1)",ok:"#22a050",err:"#d03030",warn:"#c08828",grad:"radial-gradient(ellipse at 30% 20%,#f4ccc0 0%,#ffe0d4 40%,#ffe8dc 100%)"},
  pistachio:{id:"pistachio",name:"Pistachio",icon:"🥜",desc:"Nutty green cream with earthy undertones",dark:false,fonts:"art",bg:"#ecf8e6",bg2:"#e4f2dc",bg3:"#f2fce8",accent:"#7aaa30",accent2:"#609020",accentRgb:"122,170,48",text:"#182210",dim:"#405830",faint:"rgba(64,88,48,0.7)",bdr:"rgba(122,170,48,0.14)",surf:"rgba(122,170,48,0.05)",surfH:"rgba(122,170,48,0.1)",ok:"#388830",err:"#c03020",warn:"#a09020",grad:"radial-gradient(ellipse at 30% 20%,#d8eece 0%,#ecf8e6 40%,#f2fce8 100%)"},
  snowfall:{id:"snowfall",name:"Snowfall",icon:"🎿",desc:"Fresh powder white with icy blue highlights",dark:false,fonts:"nordic",bg:"#e4ecf8",bg2:"#dae4f2",bg3:"#ecf0fc",accent:"#4078c0",accent2:"#3060a0",accentRgb:"64,120,192",text:"#101828",dim:"#3a5068",faint:"rgba(58,80,104,0.7)",bdr:"rgba(64,120,192,0.12)",surf:"rgba(64,120,192,0.04)",surfH:"rgba(64,120,192,0.08)",ok:"#1a9a50",err:"#d03030",warn:"#a88828",grad:"radial-gradient(ellipse at 30% 20%,#ccdcee 0%,#e4ecf8 40%,#ecf0fc 100%)"},
  apricot:{id:"apricot",name:"Apricot Dawn",icon:"🌤️",desc:"Soft morning orange like a sunrise glow",dark:false,fonts:"editorial",bg:"#ffe6cc",bg2:"#f8dcc0",bg3:"#ffeed6",accent:"#d08838",accent2:"#c07028",accentRgb:"208,136,56",text:"#2a1c10",dim:"#6a5430",faint:"rgba(106,84,48,0.7)",bdr:"rgba(208,136,56,0.14)",surf:"rgba(208,136,56,0.05)",surfH:"rgba(208,136,56,0.1)",ok:"#2e8040",err:"#c83020",warn:"#b08828",grad:"radial-gradient(ellipse at 30% 20%,#f4d4b4 0%,#ffe6cc 40%,#ffeed6 100%)"},
  lilac:{id:"lilac",name:"Lilac Breeze",icon:"🪻",desc:"Gentle purple-lavender with spring freshness",dark:false,fonts:"handwritten",bg:"#eee8fc",bg2:"#e6e0f8",bg3:"#f4f0fe",accent:"#8850b0",accent2:"#a060d0",accentRgb:"136,80,176",text:"#1c1028",dim:"#504060",faint:"rgba(80,64,96,0.7)",bdr:"rgba(136,80,176,0.12)",surf:"rgba(136,80,176,0.04)",surfH:"rgba(136,80,176,0.08)",ok:"#22a050",err:"#d03040",warn:"#a08830",grad:"radial-gradient(ellipse at 30% 20%,#dcd4f0 0%,#eee8fc 40%,#f4f0fe 100%)"},
  bamboo:{id:"bamboo",name:"Bamboo Grove",icon:"🎋",desc:"Natural tan and green, zen-like tranquility",dark:false,fonts:"scholarly",bg:"#eef2e2",bg2:"#e6ecd8",bg3:"#f4f6ea",accent:"#608848",accent2:"#507838",accentRgb:"96,136,72",text:"#1c2014",dim:"#485838",faint:"rgba(72,88,56,0.7)",bdr:"rgba(96,136,72,0.14)",surf:"rgba(96,136,72,0.05)",surfH:"rgba(96,136,72,0.1)",ok:"#388830",err:"#c03020",warn:"#a09020",grad:"radial-gradient(ellipse at 30% 20%,#dce4ce 0%,#eef2e2 40%,#f4f6ea 100%)"},
  roseGold:{id:"roseGold",name:"Rose Gold",icon:"💎",desc:"Luxurious metallic pink with warm elegance",dark:false,fonts:"luxury",bg:"#f2dae0",bg2:"#ead0d8",bg3:"#f6e0e6",accent:"#c06080",accent2:"#a85070",accentRgb:"192,96,128",text:"#2a1418",dim:"#684050",faint:"rgba(104,64,80,0.7)",bdr:"rgba(192,96,128,0.12)",surf:"rgba(192,96,128,0.05)",surfH:"rgba(192,96,128,0.1)",ok:"#30a050",err:"#c83838",warn:"#b09030",grad:"radial-gradient(ellipse at 30% 20%,#e4c8d0 0%,#f2dae0 40%,#f6e0e6 100%)"},
  morning:{id:"morning",name:"Morning Mist",icon:"🌫️",desc:"Soft warm gray like fog lifting at sunrise",dark:false,fonts:"industrial",bg:"#eae6e0",bg2:"#e0dcd8",bg3:"#eeecea",accent:"#707880",accent2:"#586068",accentRgb:"112,120,128",text:"#1c1e20",dim:"#505458",faint:"rgba(80,84,88,0.7)",bdr:"rgba(112,120,128,0.14)",surf:"rgba(112,120,128,0.04)",surfH:"rgba(112,120,128,0.08)",ok:"#2e8040",err:"#c83030",warn:"#a08828",grad:"radial-gradient(ellipse at 30% 20%,#dcd8d0 0%,#eae6e0 40%,#eeecea 100%)"},
  spring:{id:"spring",name:"Spring Meadow",icon:"🦋",desc:"Fresh green and yellow like a blooming field",dark:false,fonts:"geometric",bg:"#eefce4",bg2:"#e6f6da",bg3:"#f4feec",accent:"#40b820",accent2:"#30a010",accentRgb:"64,184,32",text:"#141e0c",dim:"#3a5828",faint:"rgba(58,88,40,0.7)",bdr:"rgba(64,184,32,0.14)",surf:"rgba(64,184,32,0.05)",surfH:"rgba(64,184,32,0.1)",ok:"#30a040",err:"#c03020",warn:"#a09828",grad:"radial-gradient(ellipse at 30% 20%,#dcf0ce 0%,#eefce4 40%,#f4feec 100%)"},
};

/* Preset folder colors */
const FOLDER_COLORS=["#8b5cf6","#3b82f6","#06b6d4","#22c55e","#eab308","#f97316","#ef4444","#ec4899","#a855f7","#6b7280"];

/* Subscription plans */
const PLANS=[
  {id:"free",name:"Free",price:"$0",period:"forever",storage:10,features:["10 GB storage","E2E encryption","Cross-device sync","63 themes","Calendar & reminders"],badge:null},
  {id:"pro",name:"Pro",price:"$4",period:"/month",storage:100,features:["100 GB storage","Everything in Free","Priority sync","Early access features"],badge:"Popular"},
  {id:"business",name:"Business",price:"$9",period:"/month",storage:500,features:["500 GB storage","Everything in Pro","Team sharing (soon)","API access (soon)"],badge:null},
];

const tagColorMap = (t) => ({
  "In Progress":{bg:`rgba(${t.accentRgb},0.15)`,text:t.accent,bdr:`rgba(${t.accentRgb},0.3)`},
  "Planned":{bg:`rgba(${t.accentRgb},0.1)`,text:t.dim,bdr:`rgba(${t.accentRgb},0.2)`},
  "Completed":{bg:`rgba(${t.ok === "#4ade80" ? "74,222,128" : t.ok === "#0f9015" ? "15,144,21" : t.ok === "#86efac" ? "134,239,172" : t.ok === "#16a34a" ? "22,163,74" : t.ok === "#a3e635" ? "163,230,53" : "52,211,153"},0.15)`,text:t.ok,bdr:`rgba(${t.ok === "#4ade80" ? "74,222,128" : "52,211,153"},0.3)`},
  "Urgent":{bg:`rgba(${t.err === "#f87171" || t.err === "#fca5a5" ? "248,113,113" : t.err === "#e53529" ? "229,53,41" : t.err === "#dc2626" ? "220,38,38" : "251,113,133"},0.15)`,text:t.err,bdr:`rgba(239,68,68,0.3)`},
  "Review":{bg:`rgba(${t.warn === "#facc15" || t.warn === "#fbbf24" ? "251,191,36" : t.warn === "#fde68a" ? "253,230,138" : "202,138,4"},0.15)`,text:t.warn,bdr:`rgba(251,191,36,0.3)`},
  "Ideas":{bg:`rgba(${t.accentRgb},0.08)`,text:t.accent2,bdr:`rgba(${t.accentRgb},0.2)`},
});

/* Icons as tiny components */
const IC = {
  Note:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  Star:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
  StarF:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
  Trash:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  Archive:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/></svg>,
  Check:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>,
  Tag:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/></svg>,
  Folder:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  Search:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Plus:(p)=><svg width={p?.s||18} height={p?.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  X:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Eye:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Shield:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Logout:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Palette:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  Sync:()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  Restore:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  Clock:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  User:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Mail:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Lock:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Bold:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>,
  Italic:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  Underline:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4v6a6 6 0 0012 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>,
  Strike:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><path d="M16.5 6C15.3 5 13.7 4.5 12 4.5c-2.8 0-5 1.5-5 3.5 0 1.5 1 2.5 3.5 3.5h3c2.5 1 3.5 2 3.5 3.5 0 2-2.2 3.5-5 3.5-1.7 0-3.3-.5-4.5-1.5"/></svg>,
  ListBul:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>,
  ListNum:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 7V3l-1 1" strokeWidth="1.3" fill="none"/><path d="M3 12.5h2l-2 2.5h2" strokeWidth="1.3" fill="none"/><path d="M3 17h1.8a1 1 0 010 2H3" strokeWidth="1.3" fill="none"/></svg>,
  ListCheck:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="4" height="4" rx="1"/><polyline points="4,7 5,8 7,6" strokeWidth="1.5"/><line x1="11" y1="7" x2="21" y2="7"/><rect x="3" y="13" width="4" height="4" rx="1"/><line x1="11" y1="15" x2="21" y2="15"/></svg>,
  Quote:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 8.5c0 2.6-2 4.5-4.5 4.5h-.3c.4 1.7 1.8 3 3.3 3.6l-.7 1.4C5 16.7 3 14 3 10.5V7c0-1.7 1.3-3 3-3h1c1.7 0 3 1.3 3 3v1.5zm11 0c0 2.6-2 4.5-4.5 4.5h-.3c.4 1.7 1.8 3 3.3 3.6l-.7 1.4C16 16.7 14 14 14 10.5V7c0-1.7 1.3-3 3-3h1c1.7 0 3 1.3 3 3v1.5z"/></svg>,
  CodeBlock:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>,
  Highlight:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>,
  Sub:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 5l6 6M10 5L4 11"/><path d="M20 19h-4c0-1.5 4-2 4-4 0-1.1-.9-2-2-2s-2 .9-2 2" strokeWidth="1.5"/></svg>,
  Sup:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12l6 6M10 12L4 18"/><path d="M20 8h-4c0-1.5 4-2 4-4 0-1.1-.9-2-2-2s-2 .9-2 2" strokeWidth="1.5"/></svg>,
  Eraser:()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l4 4c.8.8.8 2 0 2.8L12 18"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  History:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/><circle cx="12" cy="12" r="0" /><polyline points="12,7 12,12 16,14"/></svg>,
  Calendar:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Bell:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  BellRing:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M2 2l2 2"/><path d="M22 2l-2 2"/></svg>,
  Menu:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  ChevL:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>,
  TextAa:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4,7 4,4 20,4 20,7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>,
  AlignL:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>,
  Markdown:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 16V8l3 4 3-4v8" strokeWidth="1.5"/><path d="M18 12l-2.5 2.5L13 12" strokeWidth="1.5"/></svg>,
};

/* Butterfly logo — geometric origami, exact match to reference */
const ButterflyLogo=({s=48,accentRgb,accent,accent2,text,warn,flap})=>{
  const sw=s>=30?2.5:s>=18?1.8:1.2;
  const w1=`rgba(${accentRgb},0.5)`;
  const w2=`rgba(${accentRgb},0.35)`;
  const w3=`rgba(${accentRgb},0.18)`;
  const lFlap=flap?{animation:'flapWing 1.2s ease-in-out infinite',transformOrigin:'21px 27px'}:{};
  const rFlap=flap?{animation:'flapWing 1.2s ease-in-out infinite',transformOrigin:'27px 27px'}:{};
  return<svg width={s} height={s} viewBox="0 0 48 48" fill="none" draggable={false} onContextMenu={e=>e.preventDefault()} style={{overflow:'visible',userSelect:'none',WebkitUserDrag:'none',msUserSelect:'none'}}>
    <g style={lFlap}>
      <path d="M21 11Q17 7 12 5Q8 5 4 8Q1 11 0 16Q1 21 5 25Q13 28 21 29Z" fill={w1} stroke={text} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M21 29L9 19L5 25Z" fill={w2}/><path d="M21 11L12 5L10 16Z" fill={w3}/>
      <path d="M21 29Q13 28 5 25Q2 30 2 37Q5 42 12 44Q17 43 21 39Z" fill={w2} stroke={text} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M21 39L10 33L12 44Z" fill={w3}/>
    </g>
    <g style={rFlap}>
      <path d="M27 11Q31 7 36 5Q40 5 44 8Q47 11 48 16Q47 21 43 25Q35 28 27 29Z" fill={w1} stroke={text} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M27 29L39 19L43 25Z" fill={w2}/><path d="M27 11L36 5L38 16Z" fill={w3}/>
      <path d="M27 29Q35 28 43 25Q46 30 46 37Q43 42 36 44Q31 43 27 39Z" fill={w2} stroke={text} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M27 39L38 33L36 44Z" fill={w3}/>
    </g>
    <path d="M22 12Q19 4 14 1" stroke={text} strokeWidth={sw*0.6} strokeLinecap="round" fill="none"/>
    <path d="M26 12Q29 4 34 1" stroke={text} strokeWidth={sw*0.6} strokeLinecap="round" fill="none"/>
    <rect x="22" y="12" width="4" height="26" rx="2" fill={warn||accent}/>
  </svg>;
};

/* ═══════════════════════════════════════════════════
   STORAGE — encrypted via AES-256-GCM + P2P sync via Gun.js
   See: crypto.js, sync.js, storage.js
   ═══════════════════════════════════════════════════ */

const NOTE_TYPES = [
  {id:"richtext",name:"Rich Text",desc:"Full formatting toolbar with headings, lists, and styles",Ic:IC.Bold},
  {id:"plaintext",name:"Plain Text",desc:"Simple text with no formatting",Ic:IC.AlignL},
  {id:"checklist",name:"Checklist",desc:"Interactive checkbox items you can check off",Ic:IC.ListCheck},
  {id:"code",name:"Code",desc:"Monospace editor for code snippets and scripts",Ic:IC.CodeBlock},
  {id:"markdown",name:"Markdown",desc:"Write in Markdown with a live preview",Ic:IC.Markdown},
];

const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const REMINDER_PRESETS=[{label:"10 min before",minutes:10},{label:"1 hour before",minutes:60},{label:"1 day before",minutes:1440},{label:"Custom",minutes:null}];
const DEF_TAGS = ["In Progress","Planned","Completed","Urgent","Review","Ideas"];
const DEF_NOTES = [
  {id:"w1",title:"Welcome to NotesCraft ✨",blocks:[{id:"b1",type:"richtext",content:"Your encrypted workspace is ready!\n\n• Create notes with tags and folders\n• Switch between 15 beautiful themes\n• Data syncs across all your devices\n• Everything stored securely\n\nHit the + button to create your first note."}],tags:["Ideas"],folder:"Getting Started",starred:true,archived:false,deleted:false,modified:new Date().toISOString(),created:new Date().toISOString()},
  {id:"w2",title:"Project Planning",blocks:[{id:"b2",type:"richtext",content:"Q1 Goals:\n- Finalize design system\n- Ship v2.0 dashboard\n- Hire 2 engineers"},{id:"b2b",type:"checklist",content:JSON.stringify([{text:"User retention rate",done:false},{text:"Time to first value",done:false},{text:"NPS improvements",done:true}])}],tags:["In Progress","Review"],folder:"Work",starred:false,archived:false,deleted:false,modified:new Date(Date.now()-3600000).toISOString(),created:new Date(Date.now()-86400000).toISOString()},
  {id:"w3",title:"Reading List",blocks:[{id:"b3",type:"checklist",content:JSON.stringify([{text:"Designing Data-Intensive Applications",done:false},{text:"The Pragmatic Programmer",done:true},{text:"Atomic Habits",done:false},{text:"React Server Components deep dive",done:false},{text:"WebAssembly beyond the browser",done:false}])}],tags:["Planned","Ideas"],folder:"Personal",starred:true,archived:false,deleted:false,modified:new Date(Date.now()-14400000).toISOString(),created:new Date(Date.now()-259200000).toISOString()},
];

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function NotesCraft(){
  const[authMode,setAuthMode]=useState("login");
  const[user,setUser]=useState(null);
  const[email,setEmail]=useState("");
  const[pw,setPw]=useState("");
  const[uname,setUname]=useState("");
  const[authErr,setAuthErr]=useState("");
  const[authLoad,setAuthLoad]=useState(false);
  const[showPw,setShowPw]=useState(false);
  const[shake,setShake]=useState(false);

  const storageRef=useRef(null); // EncryptedStorage instance, set on login/signup
  const sessionRestored=useRef(false);

  const[notes,setNotes]=useState([]);
  const[selId,setSelId]=useState(null);
  const[search,setSearch]=useState("");
  const[view,setView]=useState("Notes");
  const[folder,setFolder]=useState(null);
  const[eTitle,setETitle]=useState("");
  const[eBlocks,setEBlocks]=useState([]);
  const[themeId,setThemeId]=useState("midnight");
  const[showThemes,setShowThemes]=useState(false);
  const[tags,setTags]=useState(DEF_TAGS);
  const[newTag,setNewTag]=useState("");
  const[showNewTag,setShowNewTag]=useState(false);
  const[newFolder,setNewFolder]=useState("");
  const[showNewFolder,setShowNewFolder]=useState(false);
  const[folderColors,setFolderColors]=useState({});
  const[newFolderColor,setNewFolderColor]=useState(null);
  const[editFolderMenu,setEditFolderMenu]=useState(null);
  const[syncSt,setSyncSt]=useState("ok");
  const[delConfirm,setDelConfirm]=useState(null);
  const[showTypePicker,setShowTypePicker]=useState(false);
  const[quotaGB,setQuotaGB]=useState(10);
  const[storageBytes,setStorageBytes]=useState(0);
  const[quotaWarn,setQuotaWarn]=useState(null);
  const[showHistory,setShowHistory]=useState(false);
  const[showPlans,setShowPlans]=useState(false);
  const[historyPreview,setHistoryPreview]=useState(null);
  const[sidebarOpen,setSidebarOpen]=useState(true);
  const[sbW,setSbW]=useState(240);
  const[nlW,setNlW]=useState(310);

  // Calendar state
  const[calEvents,setCalEvents]=useState([]);
  const[calMonth,setCalMonth]=useState(new Date().getMonth());
  const[calYear,setCalYear]=useState(new Date().getFullYear());
  const[calSelDate,setCalSelDate]=useState(null);
  const[calSelEvent,setCalSelEvent]=useState(null);
  const[calEditing,setCalEditing]=useState(null);
  const[calShowForm,setCalShowForm]=useState(false);
  const[notifPerm,setNotifPerm]=useState(typeof Notification!=="undefined"?Notification.permission:"denied");

  const ceRefs=useRef({});
  const saveRef=useRef(null);
  const dragRef=useRef(null);
  const reminderIntervalRef=useRef(null);
  const calEventsRef=useRef(calEvents);
  calEventsRef.current=calEvents;

  /* Session persistence — save/restore across page refreshes */
  const saveSession=async(em,key)=>{try{const kb=await exportKey(key);sessionStorage.setItem("nc_session",JSON.stringify({email:em,key:kb}))}catch(e){}};
  const clearSession=()=>{sessionStorage.removeItem("nc_session")};

  useEffect(()=>{
    if(sessionRestored.current)return;
    sessionRestored.current=true;
    const raw=sessionStorage.getItem("nc_session");
    if(!raw)return;
    let sess;try{sess=JSON.parse(raw)}catch{return}
    if(!sess.email||!sess.key)return;
    (async()=>{
      try{
        const key=await importKey(sess.key);
        const adapter=await createSyncAdapter();
        const em=sess.email;
        const rawUser=await adapter.get("user:"+em);
        if(!rawUser){clearSession();return}
        let u;try{u=JSON.parse(rawUser)}catch{clearSession();return}
        const es=new EncryptedStorage(adapter,key);
        storageRef.current=es;
        setUser(u);setEmail(em);
        setQuotaGB(u.quotaGB||10);
        const sn=await es.getNotes(em);
        const sp=await es.getPrefs(em);
        const ln=sn||DEF_NOTES;
        setNotes(ln);
        setStorageBytes(measureNotesBytes(ln));
        if(sp){setThemeId(sp.theme||"midnight");setTags(sp.tags||DEF_TAGS);setFolderColors(sp.folderColors||{})}
        const sc=await es.getCalendar(em);setCalEvents(sc||[]);
        const first=ln.find(n=>!n.deleted&&!n.archived);
        if(first){setSelId(first.id);setETitle(first.title);setEBlocks(getBlocks(first))}
        setAuthMode("app");
        es.subscribe(em,(newNotes)=>setNotes(newNotes));
      }catch(e){clearSession()}
    })();
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  const T=THEMES[themeId]||THEMES.midnight;
  const F=FONTS[T.fonts]||FONTS.default;
  const TC=tagColorMap(T);

  /* Dynamic favicon — updates with theme */
  useEffect(()=>{
    const svg=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path d='M22 12Q19 4 14 1' stroke='${T.text}' stroke-width='1.5' stroke-linecap='round' fill='none'/><path d='M26 12Q29 4 34 1' stroke='${T.text}' stroke-width='1.5' stroke-linecap='round' fill='none'/><path d='M21 11Q17 7 12 5Q8 5 4 8Q1 11 0 16Q1 21 5 25Q13 28 21 29Z' fill='rgba(${T.accentRgb},0.5)' stroke='${T.text}' stroke-width='2.5' stroke-linejoin='round'/><path d='M27 11Q31 7 36 5Q40 5 44 8Q47 11 48 16Q47 21 43 25Q35 28 27 29Z' fill='rgba(${T.accentRgb},0.5)' stroke='${T.text}' stroke-width='2.5' stroke-linejoin='round'/><path d='M21 29Q13 28 5 25Q2 30 2 37Q5 42 12 44Q17 43 21 39Z' fill='rgba(${T.accentRgb},0.35)' stroke='${T.text}' stroke-width='2.5' stroke-linejoin='round'/><path d='M27 29Q35 28 43 25Q46 30 46 37Q43 42 36 44Q31 43 27 39Z' fill='rgba(${T.accentRgb},0.35)' stroke='${T.text}' stroke-width='2.5' stroke-linejoin='round'/><rect x='22' y='12' width='4' height='26' rx='2' fill='${T.warn}'/></svg>`;
    const link=document.querySelector("link[rel='icon']")||document.createElement("link");
    link.rel="icon";link.type="image/svg+xml";
    link.href="data:image/svg+xml,"+encodeURIComponent(svg);
    document.head.appendChild(link);
  },[themeId]);

  const sel=notes.find(n=>n.id===selId);

  const getTC=(tag)=>TC[tag]||{bg:`rgba(${T.accentRgb},0.1)`,text:T.accent,bdr:`rgba(${T.accentRgb},0.2)`};

  // ─── Auth ───
  const doShake=()=>{setShake(true);setTimeout(()=>setShake(false),600)};

  const doSignup=async()=>{
    setAuthErr("");
    if(!email||!pw||!uname){setAuthErr("All fields required");doShake();return}
    if(pw.length<4){setAuthErr("Password: min 4 chars");doShake();return}
    setAuthLoad(true);
    try{
      const adapter=await createSyncAdapter();
      const em=email.toLowerCase();
      // Check if account already exists (user record is unencrypted)
      const rawUser=await adapter.get("user:"+em);
      if(rawUser){setAuthErr("Account exists — sign in instead");setAuthLoad(false);doShake();return}
      // Generate salt, derive key, hash password
      const salt=generateSalt();
      const key=await deriveKey(pw,salt);
      const pwHash=await hashPassword(pw,salt);
      // Create encrypted storage instance
      const es=new EncryptedStorage(adapter,key);
      storageRef.current=es;
      // Store user record (unencrypted — only hash + salt + quota)
      const u={email:em,name:uname,pwHash,salt,quotaGB:10};
      await es.setUser(em,u);
      // Encrypt and store default notes + prefs
      await es.setNotes(em,DEF_NOTES);
      await es.setPrefs(em,{theme:"midnight",tags:DEF_TAGS,folderColors:{}});
      await es.setCalendar(em,[]);
      setUser(u);setNotes(DEF_NOTES);setTags(DEF_TAGS);setFolderColors({});
      setQuotaGB(10);setStorageBytes(measureNotesBytes(DEF_NOTES));setCalEvents([]);
      setSelId(DEF_NOTES[0].id);setETitle(DEF_NOTES[0].title);setEBlocks(getBlocks(DEF_NOTES[0]));
      setAuthMode("app");
      saveSession(em,key);
    }catch(e){setAuthErr("Signup failed: "+e.message);doShake()}
    setAuthLoad(false);
  };

  const doLogin=async()=>{
    setAuthErr("");
    if(!email||!pw){setAuthErr("Email & password required");doShake();return}
    setAuthLoad(true);
    try{
      const adapter=await createSyncAdapter();
      const em=email.toLowerCase();
      // Fetch user record (unencrypted)
      const rawUser=await adapter.get("user:"+em);
      if(!rawUser){setAuthErr("No account found");setAuthLoad(false);doShake();return}
      let u;
      try{u=JSON.parse(rawUser)}catch{setAuthErr("Corrupted account data");setAuthLoad(false);doShake();return}

      // Handle legacy accounts (no salt — old SHA-256 hash)
      if(!u.salt){
        const oldHash=async(p)=>{const d=new TextEncoder().encode(p+"nc-2026");const h=await crypto.subtle.digest("SHA-256",d);return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("")};
        const oh=await oldHash(pw);
        if(oh!==u.pwHash){setAuthErr("Wrong password");setAuthLoad(false);doShake();return}
        // Migrate: add salt, re-hash, re-encrypt all data
        const salt=generateSalt();
        const key=await deriveKey(pw,salt);
        const pwHash=await hashPassword(pw,salt);
        u={...u,salt,pwHash,quotaGB:10};
        const es=new EncryptedStorage(adapter,key);
        storageRef.current=es;
        await es.setUser(em,u);
        // Re-encrypt existing notes and prefs (they were plaintext)
        const oldNotes=await es.getNotes(em); // _decryptJSON handles plaintext migration
        const oldPrefs=await es.getPrefs(em);
        const ln=oldNotes||DEF_NOTES;
        const lp=oldPrefs||{theme:"midnight",tags:DEF_TAGS};
        await es.setNotes(em,ln);
        await es.setPrefs(em,lp);
        setUser(u);setNotes(ln);
        setQuotaGB(100);setStorageBytes(measureNotesBytes(ln));
        if(lp){setThemeId(lp.theme||"midnight");setTags(lp.tags||DEF_TAGS)}
        const sc=await es.getCalendar(em);setCalEvents(sc||[]);
        const first=ln.find(n=>!n.deleted&&!n.archived);
        if(first){setSelId(first.id);setETitle(first.title);setEBlocks(getBlocks(first))}
        setAuthMode("app");setAuthLoad(false);
        saveSession(em,key);
        // Subscribe for real-time sync
        es.subscribe(em,(newNotes)=>setNotes(newNotes));
        return;
      }

      // Normal login — derive key, verify password
      const key=await deriveKey(pw,u.salt);
      const pwHash=await hashPassword(pw,u.salt);
      if(pwHash!==u.pwHash){setAuthErr("Wrong password");setAuthLoad(false);doShake();return}
      const es=new EncryptedStorage(adapter,key);
      storageRef.current=es;
      setUser(u);
      setQuotaGB(u.quotaGB||10);
      const sn=await es.getNotes(em);
      const sp=await es.getPrefs(em);
      const ln=sn||DEF_NOTES;
      setNotes(ln);
      setStorageBytes(measureNotesBytes(ln));
      if(sp){setThemeId(sp.theme||"midnight");setTags(sp.tags||DEF_TAGS);setFolderColors(sp.folderColors||{})}
      const sc=await es.getCalendar(em);setCalEvents(sc||[]);
      const first=ln.find(n=>!n.deleted&&!n.archived);
      if(first){setSelId(first.id);setETitle(first.title);setEBlocks(getBlocks(first))}
      setAuthMode("app");
      saveSession(em,key);
      // Subscribe for real-time sync
      es.subscribe(em,(newNotes)=>setNotes(newNotes));
    }catch(e){setAuthErr("Login failed: "+e.message);doShake()}
    setAuthLoad(false);
  };

  const doLogout=()=>{
    flushSave();
    clearSession();
    if(reminderIntervalRef.current){clearInterval(reminderIntervalRef.current);reminderIntervalRef.current=null}
    if(storageRef.current){storageRef.current.unsubscribe();storageRef.current=null}
    setUser(null);setAuthMode("login");setEmail("");setPw("");setUname("");
    setNotes([]);setSelId(null);setETitle("");setEBlocks([]);
    setQuotaGB(100);setStorageBytes(0);setQuotaWarn(null);setShowHistory(false);setHistoryPreview(null);
    setCalEvents([]);setCalSelDate(null);setCalSelEvent(null);setCalEditing(null);setCalShowForm(false);
    setCalMonth(new Date().getMonth());setCalYear(new Date().getFullYear());
  };

  const openPlans=()=>setShowPlans(true);

  // ─── Sync ───
  const syncNotes=useCallback(async(n)=>{
    if(!user||!storageRef.current)return;
    const bytes=measureNotesBytes(n);
    setStorageBytes(bytes);
    if(bytes>quotaGB*1e9){setQuotaWarn("full");setSyncSt("quota");return}
    if(bytes>quotaGB*0.9e9){setQuotaWarn("near")}else{setQuotaWarn(null)}
    setSyncSt("saving");
    const ok=await storageRef.current.setNotes(user.email,n);
    setSyncSt(ok?"ok":"err");
  },[user,quotaGB]);

  const syncPrefs=useCallback(async(p)=>{
    if(!user||!storageRef.current)return;
    await storageRef.current.setPrefs(user.email,p);
  },[user]);

  const debouncedSync=useCallback((n)=>{
    if(saveRef.current)clearTimeout(saveRef.current);
    saveRef.current=setTimeout(()=>syncNotes(n),800);
  },[syncNotes]);

  const upNotes=(fn)=>{
    setNotes(prev=>{const next=typeof fn==="function"?fn(prev):fn;debouncedSync(next);return next});
  };

  // Calendar sync & helpers
  const syncCalendar=useCallback(async(events)=>{
    if(!user||!storageRef.current)return;
    setSyncSt("saving");
    const ok=await storageRef.current.setCalendar(user.email,events);
    setSyncSt(ok?"ok":"err");
  },[user]);

  const upCalEvents=(fn)=>{
    setCalEvents(prev=>{const next=typeof fn==="function"?fn(prev):fn;syncCalendar(next);return next});
  };

  const genCid=()=>"ce_"+Date.now()+Math.random().toString(36).slice(2,6);
  const calDateStr=(y,m,d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const todayStr=calDateStr(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());

  const createCalEvent=(overrides={})=>{
    const ev={id:genCid(),date:calSelDate||todayStr,time:"",endTime:"",title:"",type:"event",color:T.accent,done:false,notes:"",items:[],reminderDate:"",reminderTime:"",reminderFired:false,created:new Date().toISOString(),modified:new Date().toISOString(),...overrides};
    setCalEditing(ev);setCalShowForm(true);
  };
  const saveCalEvent=(ev)=>{
    const updated={...ev,modified:new Date().toISOString()};
    upCalEvents(prev=>{const idx=prev.findIndex(e=>e.id===updated.id);if(idx>=0){const next=[...prev];next[idx]=updated;return next}return[...prev,updated]});
    setCalEditing(null);setCalShowForm(false);setCalSelEvent(updated.id);
  };
  const deleteCalEvent=(id)=>{
    upCalEvents(prev=>prev.filter(e=>e.id!==id));
    if(calSelEvent===id)setCalSelEvent(null);
  };
  const toggleCalTodo=(id)=>{
    upCalEvents(prev=>prev.map(e=>e.id===id?{...e,done:!e.done,modified:new Date().toISOString()}:e));
  };
  const toggleCalTodoItem=(eventId,itemIdx)=>{
    upCalEvents(prev=>prev.map(e=>{
      if(e.id!==eventId)return e;
      const items=[...e.items];items[itemIdx]={...items[itemIdx],done:!items[itemIdx].done};
      return{...e,items,modified:new Date().toISOString()};
    }));
  };
  const calPrevMonth=()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)};
  const calNextMonth=()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)};
  const calGoToday=()=>{const now=new Date();setCalMonth(now.getMonth());setCalYear(now.getFullYear());setCalSelDate(todayStr)};

  const requestNotifPerm=async()=>{
    if(typeof Notification==="undefined")return"denied";
    if(Notification.permission==="granted"){setNotifPerm("granted");return"granted"}
    const result=await Notification.requestPermission();
    setNotifPerm(result);return result;
  };

  const plainToHtml=(text)=>{
    if(!text)return"";
    if(text.includes("<")&&(text.includes("</")||text.includes("<br")))return text;
    return text.split("\n").map(l=>`<div>${l||"<br>"}</div>`).join("");
  };
  const stripHtml=(html)=>{
    if(!html)return"";
    const tmp=document.createElement("div");tmp.innerHTML=html;return tmp.textContent||"";
  };

  // Block helpers
  const genBid=()=>"b"+Date.now()+Math.random().toString(36).slice(2,6);
  const getBlocks=(note)=>{
    if(note.blocks&&Array.isArray(note.blocks)&&note.blocks.length>0)return note.blocks;
    return[{id:"b0",type:note.type||"richtext",content:note.content||""}];
  };
  const blocksText=(blocks)=>{
    if(!blocks||!Array.isArray(blocks))return"";
    return blocks.map(b=>{
      if(b.type==="checklist"){try{return JSON.parse(b.content||"[]").map(x=>x.text).join(" ")}catch{return""}}
      return stripHtml(b.content);
    }).join(" ");
  };
  const measureNotesBytes=(n)=>new Blob([JSON.stringify(n)]).size;

  const maybeSnapshot=(oldNote,newBlocks,newTitle)=>{
    const revs=Array.isArray(oldNote.revisions)?[...oldNote.revisions]:[];
    const oldFp=JSON.stringify({title:oldNote.title,blocks:oldNote.blocks||[]});
    const newFp=JSON.stringify({title:newTitle,blocks:newBlocks});
    if(oldFp===newFp)return revs;
    if(revs.length>0){
      const lastFp=JSON.stringify({title:revs[revs.length-1].title,blocks:revs[revs.length-1].blocks});
      if(lastFp===oldFp)return revs;
      const lastTs=new Date(revs[revs.length-1].ts).getTime();
      if(Date.now()-lastTs<30000)return revs;
    }
    revs.push({id:"r"+Date.now(),ts:new Date().toISOString(),title:oldNote.title,blocks:oldNote.blocks||[]});
    return revs;
  };

  const updateBlock=(bid,content)=>setEBlocks(prev=>prev.map(b=>b.id===bid?{...b,content}:b));
  const addBlock=(type,afterIdx)=>{
    const bid=genBid();
    const defContent=type==="checklist"?JSON.stringify([{text:"",done:false}]):"";
    const newBlock={id:bid,type,content:defContent};
    setEBlocks(prev=>{const next=[...prev];next.splice(afterIdx!==undefined?afterIdx+1:prev.length,0,newBlock);return next});
    setTimeout(()=>{if(type==="richtext"&&ceRefs.current[bid]){ceRefs.current[bid].innerHTML="";ceRefs.current[bid].focus()}},50);
  };
  const removeBlock=(bid)=>setEBlocks(prev=>{if(prev.length<=1)return prev;return prev.filter(b=>b.id!==bid)});

  const flushSave=()=>{
    if(!sel)return;
    const blocks=eBlocks.map(b=>{
      if(b.type==="richtext"&&ceRefs.current[b.id])return{...b,content:ceRefs.current[b.id].innerHTML};
      return b;
    });
    const updated=notes.map(n=>{
      if(n.id!==selId)return n;
      const revisions=maybeSnapshot(n,blocks,eTitle);
      return{...n,title:eTitle,blocks,revisions,modified:new Date().toISOString()};
    });
    setNotes(updated);syncNotes(updated);
  };

  const selectNote=(id)=>{
    flushSave();
    setShowHistory(false);setHistoryPreview(null);
    const n=notes.find(x=>x.id===id);
    if(n){
      setSelId(id);setETitle(n.title);
      const blocks=getBlocks(n);setEBlocks(blocks);
      setTimeout(()=>{blocks.forEach(b=>{if(b.type==="richtext"&&ceRefs.current[b.id])ceRefs.current[b.id].innerHTML=plainToHtml(b.content)})},0);
    }
  };

  const createNote=(type="richtext")=>{
    flushSave();
    const bid=genBid();
    const defContent=type==="checklist"?JSON.stringify([{text:"",done:false}]):"";
    const blocks=[{id:bid,type,content:defContent}];
    const n={id:"n"+Date.now(),title:"Untitled",blocks,tags:[],folder:folder||"",starred:false,archived:false,deleted:false,modified:new Date().toISOString(),created:new Date().toISOString()};
    upNotes(p=>[n,...p]);setSelId(n.id);setETitle(n.title);setEBlocks(blocks);
    setShowTypePicker(false);
    setTimeout(()=>{if(type==="richtext"&&ceRefs.current[bid]){ceRefs.current[bid].innerHTML="";ceRefs.current[bid].focus()}},50);
  };

  const deleteNote=(id)=>{
    const n=notes.find(x=>x.id===id);if(!n)return;
    if(n.deleted){upNotes(p=>p.filter(x=>x.id!==id))}
    else{upNotes(p=>p.map(x=>x.id===id?{...x,deleted:true,modified:new Date().toISOString()}:x))}
    if(selId===id){setSelId(null);setETitle("");setEBlocks([])}
    setDelConfirm(null);
  };

  const restoreNote=(id)=>upNotes(p=>p.map(n=>n.id===id?{...n,deleted:false,archived:false,modified:new Date().toISOString()}:n));
  const archiveNote=(id)=>{upNotes(p=>p.map(n=>n.id===id?{...n,archived:!n.archived,modified:new Date().toISOString()}:n));if(selId===id){setSelId(null);setETitle("");setEBlocks([])}};
  const toggleStar=(id)=>upNotes(p=>p.map(n=>n.id===id?{...n,starred:!n.starred,modified:new Date().toISOString()}:n));
  const toggleNoteTag=(id,tag)=>upNotes(p=>p.map(n=>{if(n.id!==id)return n;const ts=n.tags.includes(tag)?n.tags.filter(x=>x!==tag):[...n.tags,tag];return{...n,tags:ts,modified:new Date().toISOString()}}));

  const addTag=()=>{
    const tg=newTag.trim();if(!tg||tags.includes(tg))return;
    const nt=[...tags,tg];setTags(nt);syncPrefs({theme:themeId,tags:nt,folderColors});
    if(sel)toggleNoteTag(sel.id,tg);
    setNewTag("");setShowNewTag(false);
  };

  const addFolderFn=()=>{
    const f=newFolder.trim();if(!f){setShowNewFolder(false);return}
    const color=newFolderColor||T.accent;
    saveFolderColors({...folderColors,[f]:color});
    setFolder(f);setView("");
    setShowNewFolder(false);setNewFolder("");setNewFolderColor(null);
  };

  const deleteFolder=(name)=>{
    upNotes(p=>p.map(n=>n.folder===name?{...n,folder:""}:n));
    const fc={...folderColors};delete fc[name];saveFolderColors(fc);
    if(folder===name)setFolder(null);
    setEditFolderMenu(null);
  };

  const changeFolderColor=(name,color)=>{
    saveFolderColors({...folderColors,[name]:color});
    setEditFolderMenu(null);
  };

  const changeTheme=(id)=>{setThemeId(id);syncPrefs({theme:id,tags,folderColors})};

  const saveFolderColors=(fc)=>{setFolderColors(fc);syncPrefs({theme:themeId,tags,folderColors:fc})};

  // ─── Panel resize ───
  const startResize=(which)=>(e)=>{
    e.preventDefault();
    const startX=e.clientX;
    const startW=which==="sb"?sbW:nlW;
    const onMove=(ev)=>{
      const delta=ev.clientX-startX;
      const nw=Math.max(which==="sb"?180:220,Math.min(which==="sb"?400:500,startW+delta));
      if(which==="sb")setSbW(nw);else setNlW(nw);
    };
    const onUp=()=>{document.removeEventListener("mousemove",onMove);document.removeEventListener("mouseup",onUp);document.body.style.cursor="";document.body.style.userSelect=""};
    document.body.style.cursor="col-resize";document.body.style.userSelect="none";
    document.addEventListener("mousemove",onMove);document.addEventListener("mouseup",onUp);
  };

  // ─── Derived ───
  const filtered=useMemo(()=>{
    return notes.filter(n=>{
      if(n.deleted&&view!=="Trash")return false;
      if(!n.deleted&&view==="Trash")return false;
      if(n.archived&&view!=="Archived"&&view!=="Trash")return false;
      if(view==="Starred")return n.starred&&!n.deleted&&!n.archived;
      if(view==="Completed")return n.tags.includes("Completed")&&!n.deleted&&!n.archived;
      if(view==="In Progress")return n.tags.includes("In Progress")&&!n.deleted&&!n.archived;
      if(view==="Planned")return n.tags.includes("Planned")&&!n.deleted&&!n.archived;
      if(view==="Untagged")return n.tags.length===0&&!n.deleted&&!n.archived;
      if(view==="Trash")return n.deleted;
      if(view==="Archived")return n.archived&&!n.deleted;
      if(folder)return n.folder===folder&&!n.deleted&&!n.archived;
      return!n.deleted&&!n.archived;
    }).filter(n=>{
      if(!search)return true;const q=search.toLowerCase();
      return n.title.toLowerCase().includes(q)||blocksText(getBlocks(n)).toLowerCase().includes(q)||n.tags.some(x=>x.toLowerCase().includes(q));
    }).sort((a,b)=>new Date(b.modified)-new Date(a.modified));
  },[notes,view,folder,search]);

  const folders=useMemo(()=>{
    const f={};
    Object.keys(folderColors).forEach(name=>{f[name]=0});
    notes.filter(n=>!n.deleted&&!n.archived&&n.folder).forEach(n=>f[n.folder]=(f[n.folder]||0)+1);
    return Object.entries(f).sort((a,b)=>b[1]-a[1]);
  },[notes,folderColors]);

  const quotaInfo=useMemo(()=>{
    const usedGB=storageBytes/1e9;
    const pct=Math.min((storageBytes/(quotaGB*1e9))*100,100);
    const color=pct>90?T.err:pct>70?T.warn:T.ok;
    const label=usedGB<0.001?`${(storageBytes/1024).toFixed(1)} KB`:usedGB<1?`${(storageBytes/1e6).toFixed(1)} MB`:`${usedGB.toFixed(2)} GB`;
    return{pct,color,label};
  },[storageBytes,quotaGB,T]);

  // Calendar computed values
  const calGrid=useMemo(()=>{
    const first=new Date(calYear,calMonth,1);const startDay=first.getDay();
    const dim=new Date(calYear,calMonth+1,0).getDate();
    const dimPrev=new Date(calYear,calMonth,0).getDate();
    const cells=[];
    for(let i=startDay-1;i>=0;i--){const d=dimPrev-i;const m=calMonth===0?11:calMonth-1;const y=calMonth===0?calYear-1:calYear;cells.push({day:d,month:m,year:y,outside:true})}
    for(let d=1;d<=dim;d++)cells.push({day:d,month:calMonth,year:calYear,outside:false});
    const rem=42-cells.length;
    for(let d=1;d<=rem;d++){const m=calMonth===11?0:calMonth+1;const y=calMonth===11?calYear+1:calYear;cells.push({day:d,month:m,year:y,outside:true})}
    return cells;
  },[calMonth,calYear]);

  const eventsForDate=useCallback((ds)=>calEvents.filter(e=>e.date===ds).sort((a,b)=>(a.time||"").localeCompare(b.time||"")),[calEvents]);

  const calSelDayEvents=useMemo(()=>{
    if(!calSelDate)return[];
    return calEvents.filter(e=>e.date===calSelDate).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  },[calEvents,calSelDate]);

  const fmtDate=(d)=>{const ms=Date.now()-new Date(d);if(ms<60000)return"Just now";if(ms<3600000)return Math.floor(ms/60000)+"m";if(ms<86400000)return Math.floor(ms/3600000)+"h";return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"})};
  const fmtFull=(d)=>new Date(d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})+", "+new Date(d).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});

  // Sync richtext block editors when selected note changes
  useEffect(()=>{
    if(selId){
      const n=notes.find(x=>x.id===selId);
      if(n){const blocks=getBlocks(n);blocks.forEach(b=>{if(b.type==="richtext"&&ceRefs.current[b.id])ceRefs.current[b.id].innerHTML=plainToHtml(b.content)})}
    }
  },[selId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reminder notification polling ───
  useEffect(()=>{
    if(reminderIntervalRef.current){clearInterval(reminderIntervalRef.current);reminderIntervalRef.current=null}
    if(!user||authMode!=="app")return;
    const checkReminders=()=>{
      const now=new Date();const nowMs=now.getTime();
      const events=calEventsRef.current;if(!events||!events.length)return;
      let fired=false;
      const updated=events.map(ev=>{
        if(!ev.reminderDate||!ev.reminderTime||ev.reminderFired)return ev;
        const remMs=new Date(`${ev.reminderDate}T${ev.reminderTime}`).getTime();
        if(isNaN(remMs))return ev;
        if(nowMs>=remMs&&nowMs-remMs<120000){
          if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
            try{new Notification("NotesCraft Reminder",{body:ev.title||"Untitled event",tag:`nc-${ev.id}`,requireInteraction:false})}catch(e){}
          }
          fired=true;return{...ev,reminderFired:true,modified:new Date().toISOString()};
        }
        if(nowMs>remMs+120000){fired=true;return{...ev,reminderFired:true,modified:new Date().toISOString()}}
        return ev;
      });
      if(fired)upCalEvents(updated);
    };
    checkReminders();
    reminderIntervalRef.current=setInterval(checkReminders,30000);
    return()=>{if(reminderIntervalRef.current){clearInterval(reminderIntervalRef.current);reminderIntervalRef.current=null}};
  },[user,authMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Dynamic font loading ───
  const fontUrl=useMemo(()=>{
    const families=new Set([F.heading,F.body,F.mono].map(f=>f.replace(/'/g,"")));
    const params=[...families].map(f=>f.replace(/ /g,"+")+":wght@300;400;500;600;700;800;900").join("&family=");
    return `https://fonts.googleapis.com/css2?family=${params}&display=swap`;
  },[F]);

  // ─── Styles ───
  const css=`@import url('${fontUrl}');
*{margin:0;padding:0;box-sizing:border-box}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(${T.accentRgb},0.15);border-radius:3px}
::selection{background:rgba(${T.accentRgb},0.3)}
input::placeholder,textarea::placeholder{color:${T.faint}}
select option{background:${T.bg};color:${T.text}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-4px)}60%{transform:translateX(4px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes orbMove1{0%{transform:translate(0,0)}12%{transform:translate(180px,-60px)}25%{transform:translate(220px,40px)}37%{transform:translate(100px,120px)}50%{transform:translate(-80px,140px)}62%{transform:translate(-200px,60px)}75%{transform:translate(-160px,-80px)}87%{transform:translate(-40px,-120px)}100%{transform:translate(0,0)}}
@keyframes orbMove2{0%{transform:translate(0,0)}14%{transform:translate(-160px,100px)}28%{transform:translate(-220px,-30px)}42%{transform:translate(-80px,-150px)}57%{transform:translate(120px,-100px)}71%{transform:translate(200px,40px)}85%{transform:translate(100px,130px)}100%{transform:translate(0,0)}}
@keyframes orbMove3{0%{transform:translate(0,0)}16%{transform:translate(100px,140px)}33%{transform:translate(-60px,180px)}50%{transform:translate(-180px,40px)}66%{transform:translate(-120px,-100px)}83%{transform:translate(60px,-140px)}100%{transform:translate(0,0)}}
@keyframes gridPulse{0%,100%{opacity:0.04}50%{opacity:0.12}}
@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes borderGlow{0%,100%{border-color:rgba(${T.accentRgb},0.12)}50%{border-color:rgba(${T.accentRgb},0.4)}}
@keyframes particleRise{0%{transform:translateY(0) scale(1);opacity:0}5%{opacity:0.7}95%{opacity:0.7}100%{transform:translateY(-100vh) scale(0.3);opacity:0}}
@keyframes shootStar{0%{transform:translateX(-100px) translateY(100px);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(calc(100vw + 100px)) translateY(-100vh);opacity:0}}
@keyframes auroraShift{0%{transform:translateX(-30%) rotate(-5deg);opacity:0.3}50%{transform:translateX(30%) rotate(5deg);opacity:0.6}100%{transform:translateX(-30%) rotate(-5deg);opacity:0.3}}
@keyframes ringExpand{0%{transform:translate(-50%,-50%) scale(0.3);opacity:0.6;border-width:2px}100%{transform:translate(-50%,-50%) scale(2.5);opacity:0;border-width:0.5px}}
@keyframes orbBreathe{0%,100%{transform:translate(var(--ox,0),var(--oy,0)) scale(1);opacity:0.7}25%{transform:translate(var(--ox,0),var(--oy,0)) scale(1.1);opacity:1}50%{transform:translate(var(--ox,0),var(--oy,0)) scale(1.25);opacity:0.85}75%{transform:translate(var(--ox,0),var(--oy,0)) scale(1.08);opacity:1}}
@keyframes logoPulse{0%,100%{box-shadow:0 0 20px rgba(${T.accentRgb},0.15),0 0 40px rgba(${T.accentRgb},0.08)}50%{box-shadow:0 0 30px rgba(${T.accentRgb},0.4),0 0 60px rgba(${T.accentRgb},0.2),0 0 80px rgba(${T.accentRgb},0.1)}}
@keyframes logoShimmer{0%{left:-100%}100%{left:200%}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes flapWing{0%{transform:scaleX(1)}15%{transform:scaleX(0.6)}30%{transform:scaleX(1)}45%{transform:scaleX(0.55)}60%{transform:scaleX(1)}80%{transform:scaleX(0.7)}100%{transform:scaleX(1)}}
@keyframes butterflyFly{0%{transform:translate(0,0) rotate(0deg)}5%{transform:translate(12px,-5px) rotate(2deg)}10%{transform:translate(25px,-8px) rotate(4deg)}15%{transform:translate(35px,-5px) rotate(5deg)}20%{transform:translate(38px,0px) rotate(4deg)}25%{transform:translate(32px,6px) rotate(2deg)}30%{transform:translate(20px,8px) rotate(-1deg)}35%{transform:translate(8px,5px) rotate(-3deg)}40%{transform:translate(-2px,0px) rotate(-2deg)}45%{transform:translate(-12px,-5px) rotate(-3deg)}50%{transform:translate(-25px,-9px) rotate(-5deg)}55%{transform:translate(-35px,-5px) rotate(-5deg)}60%{transform:translate(-38px,0px) rotate(-4deg)}65%{transform:translate(-32px,6px) rotate(-2deg)}70%{transform:translate(-20px,8px) rotate(1deg)}75%{transform:translate(-8px,5px) rotate(2deg)}80%{transform:translate(2px,0px) rotate(1deg)}85%{transform:translate(8px,-4px) rotate(2deg)}90%{transform:translate(5px,-2px) rotate(1deg)}95%{transform:translate(2px,-1px) rotate(0deg)}100%{transform:translate(0,0) rotate(0deg)}}
@keyframes sparkle1{0%,100%{opacity:0;transform:scale(0.5)}20%{opacity:1;transform:scale(1.2)}40%{opacity:0.3;transform:scale(0.8)}60%{opacity:1;transform:scale(1)}80%{opacity:0.5;transform:scale(0.6)}}
@keyframes sparkle2{0%,100%{opacity:0.3;transform:scale(0.7)}30%{opacity:1;transform:scale(1.1)}50%{opacity:0;transform:scale(0.4)}70%{opacity:0.8;transform:scale(1.3)}90%{opacity:0.2;transform:scale(0.5)}}
@keyframes sparkle3{0%,100%{opacity:0.5;transform:scale(0.9)}25%{opacity:0;transform:scale(0.3)}50%{opacity:1;transform:scale(1.2)}75%{opacity:0.4;transform:scale(0.7)}}
@keyframes penDraw{0%,100%{transform:rotate(-45deg) translate(0,0)}30%{transform:rotate(-45deg) translate(1px,-1px)}60%{transform:rotate(-45deg) translate(-0.5px,0.5px)}}
@keyframes iconRotateHue{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(15deg)}}
.auth-shoot{position:absolute;height:1px;pointer-events:none;border-radius:1px}
.auth-shoot:nth-child(1){top:15%;left:0;width:120px;background:linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.6),transparent);animation:shootStar 4s linear infinite 0s}
.auth-shoot:nth-child(2){top:40%;left:0;width:80px;background:linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.4),transparent);animation:shootStar 6s linear infinite 2s}
.auth-shoot:nth-child(3){top:65%;left:0;width:100px;background:linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.5),transparent);animation:shootStar 5s linear infinite 3.5s}
.auth-shoot:nth-child(4){top:80%;left:0;width:60px;background:linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.3),transparent);animation:shootStar 7s linear infinite 1s}
.auth-shoot:nth-child(5){top:25%;left:0;width:90px;background:linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.45),transparent);animation:shootStar 5.5s linear infinite 5s}
svg[draggable=false]{-webkit-user-drag:none!important;-khtml-user-drag:none!important;-moz-user-drag:none!important;user-drag:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
.glass-btn{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)!important}
.glass-btn:hover{background:rgba(${T.accentRgb},0.12)!important;border-color:rgba(${T.accentRgb},0.35)!important;box-shadow:0 6px 20px rgba(${T.accentRgb},0.15),0 0 30px rgba(${T.accentRgb},0.06),inset 0 0 20px rgba(${T.accentRgb},0.04)!important;transform:translateY(-1px) scale(1.02)!important}
.glass-btn:active{transform:translateY(0px) scale(0.97)!important;box-shadow:0 1px 4px rgba(${T.accentRgb},0.08),inset 0 0 10px rgba(${T.accentRgb},0.03)!important;transition:all 0.1s!important}
.cal-save-btn:hover{transform:translateY(-1px);box-shadow:0 8px 30px rgba(${T.accentRgb},0.45);filter:brightness(1.1)}
.cal-save-btn:active{transform:translateY(0) scale(0.98);box-shadow:0 2px 10px rgba(${T.accentRgb},0.25);filter:brightness(0.95)}
@keyframes btnPulseGlow{0%,100%{box-shadow:0 2px 10px rgba(${T.accentRgb},0.08)}50%{box-shadow:0 4px 20px rgba(${T.accentRgb},0.2),0 0 30px rgba(${T.accentRgb},0.08)}}
@keyframes btnFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes authBtnShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
.auth-submit-btn{animation:authBtnShimmer 3s ease infinite}
.auth-submit-btn:hover{transform:translateY(-2px) scale(1.01)!important;box-shadow:0 8px 35px rgba(${T.accentRgb},0.5),0 0 50px rgba(${T.accentRgb},0.15),inset 0 1px 0 rgba(255,255,255,0.2)!important}
.auth-submit-btn:active{transform:translateY(0px) scale(0.98)!important;box-shadow:0 2px 10px rgba(${T.accentRgb},0.3)!important;transition:all 0.1s!important}
input:focus,textarea:focus{border-color:rgba(${T.accentRgb},0.4)!important;box-shadow:0 0 0 3px rgba(${T.accentRgb},0.08),0 2px 10px rgba(0,0,0,0.1),inset 0 0 10px rgba(${T.accentRgb},0.03)!important}
.sidebar-icon-btn{transition:all 0.25s cubic-bezier(0.4,0,0.2,1)!important}
.sidebar-icon-btn:hover{color:${T.accent}!important;transform:scale(1.15)!important;filter:drop-shadow(0 0 6px rgba(${T.accentRgb},0.3))!important}
.sidebar-icon-btn:active{transform:scale(0.9)!important;transition:all 0.1s!important}
.sb-view-btn{transition:all 0.2s cubic-bezier(0.4,0,0.2,1)!important}
.sb-view-btn:hover{background:rgba(${T.accentRgb},0.08)!important;transform:translateX(3px)!important}
.sb-view-btn:hover .sb-view-ic{transform:scale(1.2) rotate(-5deg);filter:drop-shadow(0 0 5px rgba(${T.accentRgb},0.35));transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1)}
.sb-view-btn:active{transform:translateX(1px) scale(0.98)!important;transition:all 0.1s!important}
.sb-view-btn:active .sb-view-ic{transform:scale(0.9);transition:all 0.1s}
.sb-folder-btn{transition:all 0.2s cubic-bezier(0.4,0,0.2,1)!important}
.sb-folder-btn:hover{background:rgba(${T.accentRgb},0.08)!important;transform:translateX(3px)!important}
.sb-folder-btn:hover .sb-folder-dot{transform:scale(1.4);filter:brightness(1.3);transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1)}
.sb-folder-btn:active{transform:translateX(1px) scale(0.98)!important;transition:all 0.1s!important}
.sb-storage-bar{transition:all 0.25s ease!important;border-radius:6px!important}
.sb-storage-bar:hover{background:rgba(${T.accentRgb},0.06)!important}
.sb-storage-bar:hover .sb-upgrade-hint{opacity:1!important;transform:translateX(0)!important}
.sb-storage-bar:hover .sb-storage-pct{opacity:0!important}
.note-action-btn{transition:all 0.25s cubic-bezier(0.4,0,0.2,1)!important}
.note-action-btn:hover{transform:scale(1.12)!important;filter:drop-shadow(0 0 8px rgba(${T.accentRgb},0.25))!important}
.resize-handle{width:4px;cursor:col-resize;background:transparent;transition:background 0.2s;flex-shrink:0;z-index:20}
.resize-handle:hover,.resize-handle:active{background:rgba(${T.accentRgb},0.3)}
.auth-particle{position:absolute;bottom:0;border-radius:50%;background:${T.accent};pointer-events:none;animation:particleRise linear infinite}
.auth-particle:nth-child(1){left:5%;width:4px;height:4px;animation-duration:7s;animation-delay:0s}
.auth-particle:nth-child(2){left:15%;width:3px;height:3px;animation-duration:9s;animation-delay:1s}
.auth-particle:nth-child(3){left:25%;width:5px;height:5px;animation-duration:6s;animation-delay:0.5s}
.auth-particle:nth-child(4){left:35%;width:3px;height:3px;animation-duration:11s;animation-delay:3s}
.auth-particle:nth-child(5){left:45%;width:4px;height:4px;animation-duration:8s;animation-delay:2s}
.auth-particle:nth-child(6){left:55%;width:3px;height:3px;animation-duration:10s;animation-delay:4s}
.auth-particle:nth-child(7){left:65%;width:5px;height:5px;animation-duration:7s;animation-delay:1.5s}
.auth-particle:nth-child(8){left:72%;width:4px;height:4px;animation-duration:9s;animation-delay:0s}
.auth-particle:nth-child(9){left:82%;width:3px;height:3px;animation-duration:6s;animation-delay:2.5s}
.auth-particle:nth-child(10){left:92%;width:4px;height:4px;animation-duration:8s;animation-delay:1s}
.auth-particle:nth-child(11){left:10%;width:3px;height:3px;animation-duration:12s;animation-delay:5s}
.auth-particle:nth-child(12){left:50%;width:4px;height:4px;animation-duration:7s;animation-delay:3.5s}
.auth-particle:nth-child(13){left:78%;width:3px;height:3px;animation-duration:10s;animation-delay:6s}
.auth-particle:nth-child(14){left:30%;width:5px;height:5px;animation-duration:8s;animation-delay:4.5s}
.auth-particle:nth-child(15){left:60%;width:3px;height:3px;animation-duration:11s;animation-delay:2s}
.nc-editor{outline:none;min-height:100%;white-space:pre-wrap;word-wrap:break-word}
.nc-editor:empty::before{content:attr(data-placeholder);color:${T.faint};pointer-events:none;font-style:italic}
.nc-editor h1{font-size:1.8em;font-weight:700;margin:0.4em 0 0.2em;font-family:${F.heading},sans-serif;color:${T.text}}
.nc-editor h2{font-size:1.4em;font-weight:600;margin:0.3em 0 0.15em;font-family:${F.heading},sans-serif;color:${T.text}}
.nc-editor h3{font-size:1.15em;font-weight:600;margin:0.25em 0 0.1em;color:${T.text}}
.nc-editor blockquote{border-left:3px solid ${T.accent};margin:0.5em 0;padding:0.3em 0 0.3em 1em;color:${T.dim};background:rgba(${T.accentRgb},0.04);border-radius:0 6px 6px 0}
.nc-editor pre{background:${T.dark?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.06)"};border:1px solid rgba(${T.accentRgb},0.1);border-radius:8px;padding:12px 16px;margin:0.5em 0;overflow-x:auto;font-family:${F.mono},monospace;font-size:0.9em;color:${T.dim}}
.nc-editor code{background:${T.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"};padding:1px 5px;border-radius:4px;font-family:${F.mono},monospace;font-size:0.9em}
.nc-editor pre code{background:none;padding:0;border-radius:0}
.nc-editor mark{background:rgba(${T.accentRgb},0.25);color:${T.text};padding:1px 3px;border-radius:3px}
.nc-editor ul,.nc-editor ol{margin:0.3em 0;padding-left:1.6em}
.nc-editor li{margin:0.15em 0}
.nc-editor ul.checklist{list-style:none;padding-left:0.3em}
.nc-editor ul.checklist li{display:flex;align-items:flex-start;gap:6px}
.nc-editor ul.checklist li::before{content:"☐";flex-shrink:0;margin-top:1px}
.nc-editor sub{font-size:0.75em}
.nc-editor sup{font-size:0.75em}`;

  const inp={background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.5)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid rgba(${T.accentRgb},0.15)`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s",boxShadow:`0 2px 10px rgba(0,0,0,0.1), inset 0 0 10px rgba(${T.accentRgb},0.02)`};
  const glass={background:T.dark?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.4)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:`1px solid rgba(${T.accentRgb},0.12)`,boxShadow:`0 8px 32px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,${T.dark?0.03:0.2})`};

  /* ═══════════ AUTH SCREEN ═══════════ */
  if(authMode!=="app"){
    const isL=authMode==="login";
    return(
      <div style={{width:"100vw",height:"100vh",background:T.dark?`linear-gradient(135deg,${T.bg} 0%,${T.bg2} 50%,${T.bg} 100%)`:`linear-gradient(135deg,${T.bg} 0%,${T.bg2} 50%,${T.bg3} 100%)`,backgroundSize:"400% 400%",animation:"gradientShift 8s ease infinite",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:`${F.body},sans-serif`,overflow:"hidden",position:"relative"}}>
        <style>{css}</style>

        {/* Pulsing grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(rgba(${T.accentRgb},0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(${T.accentRgb},0.12) 1px,transparent 1px)`,backgroundSize:"60px 60px",animation:"gridPulse 4s ease-in-out infinite"}}/>

        {/* Aurora / nebula bands */}
        <div style={{position:"absolute",top:"-20%",left:"-10%",width:"120%",height:"40%",background:`linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.08),rgba(${T.accentRgb},0.15),rgba(${T.accentRgb},0.08),transparent)`,filter:"blur(60px)",animation:"auroraShift 12s ease-in-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-15%",left:"-10%",width:"120%",height:"35%",background:`linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.06),rgba(${T.accentRgb},0.12),rgba(${T.accentRgb},0.06),transparent)`,filter:"blur(50px)",animation:"auroraShift 15s ease-in-out infinite 3s",pointerEvents:"none"}}/>

        {/* Expanding pulse rings from center */}
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.3)`,animation:"ringExpand 4s ease-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.25)`,animation:"ringExpand 4s ease-out infinite 1.3s",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.2)`,animation:"ringExpand 4s ease-out infinite 2.6s",pointerEvents:"none"}}/>

        {/* Large floating color orbs with breathing */}
        <div style={{"--ox":"0px","--oy":"0px",position:"absolute",width:650,height:650,borderRadius:"50%",background:`radial-gradient(circle,rgba(${T.accentRgb},0.18) 0%,rgba(${T.accentRgb},0.08) 35%,transparent 70%)`,filter:"blur(30px)",top:"-15%",left:"-5%",animation:"orbMove1 22s ease-in-out infinite, orbBreathe 5s ease-in-out infinite"}}/>
        <div style={{"--ox":"0px","--oy":"0px",position:"absolute",width:580,height:580,borderRadius:"50%",background:`radial-gradient(circle,rgba(${T.accentRgb},0.15) 0%,rgba(${T.accentRgb},0.06) 35%,transparent 70%)`,filter:"blur(25px)",bottom:"-10%",right:"-5%",animation:"orbMove2 26s ease-in-out infinite, orbBreathe 7s ease-in-out infinite 2s"}}/>
        <div style={{"--ox":"0px","--oy":"0px",position:"absolute",width:480,height:480,borderRadius:"50%",background:`radial-gradient(circle,rgba(${T.accentRgb},0.12) 0%,rgba(${T.accentRgb},0.05) 35%,transparent 70%)`,filter:"blur(20px)",top:"30%",right:"20%",animation:"orbMove3 18s ease-in-out infinite, orbBreathe 6s ease-in-out infinite 1s"}}/>
        <div style={{"--ox":"0px","--oy":"0px",position:"absolute",width:400,height:400,borderRadius:"50%",background:`radial-gradient(circle,rgba(${T.accentRgb},0.1) 0%,rgba(${T.accentRgb},0.04) 35%,transparent 70%)`,filter:"blur(35px)",top:"50%",left:"30%",animation:"orbMove1 30s ease-in-out infinite reverse, orbBreathe 8s ease-in-out infinite 3s"}}/>

        {/* Shooting star streaks */}
        <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
          {Array.from({length:5},(_,i)=><div key={i} className="auth-shoot"/>)}
        </div>

        {/* CSS-only rising particles */}
        <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
          {Array.from({length:15},(_,i)=><div key={i} className="auth-particle"/>)}
        </div>

        {/* Corner HUD accents */}
        <div style={{position:"absolute",top:0,left:0,width:100,height:100,borderLeft:`1.5px solid rgba(${T.accentRgb},0.25)`,borderTop:`1.5px solid rgba(${T.accentRgb},0.25)`,margin:20,animation:"borderGlow 3s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:0,right:0,width:100,height:100,borderRight:`1.5px solid rgba(${T.accentRgb},0.25)`,borderTop:`1.5px solid rgba(${T.accentRgb},0.25)`,margin:20,animation:"borderGlow 3s ease-in-out infinite 0.75s"}}/>
        <div style={{position:"absolute",bottom:0,left:0,width:100,height:100,borderLeft:`1.5px solid rgba(${T.accentRgb},0.25)`,borderBottom:`1.5px solid rgba(${T.accentRgb},0.25)`,margin:20,animation:"borderGlow 3s ease-in-out infinite 1.5s"}}/>
        <div style={{position:"absolute",bottom:0,right:0,width:100,height:100,borderRight:`1.5px solid rgba(${T.accentRgb},0.25)`,borderBottom:`1px solid rgba(${T.accentRgb},0.25)`,margin:20,animation:"borderGlow 3s ease-in-out infinite 2.25s"}}/>

        {/* Glassmorphic auth card — transparent */}
        <div style={{position:"relative",zIndex:10,textAlign:"center",animation:shake?"shake 0.6s":"fadeUp 0.5s ease-out",width:400,padding:"32px 28px",borderRadius:20,overflow:"hidden",background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:`1px solid rgba(${T.accentRgb},0.2)`,boxShadow:`0 8px 40px rgba(0,0,0,0.25), 0 0 80px rgba(${T.accentRgb},0.08), inset 0 0 0 1px rgba(255,255,255,${T.dark?0.06:0.12}), inset 0 1px 0 rgba(255,255,255,${T.dark?0.08:0.15})`}}>
          {/* Butterfly logo — flying animation (protected) */}
          <div onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} style={{margin:"0 auto 18px",animation:"butterflyFly 18s ease-in-out infinite",filter:`drop-shadow(0 4px 20px rgba(${T.accentRgb},0.4))`,userSelect:"none",WebkitUserDrag:"none",position:"relative"}}>
            <ButterflyLogo s={72} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.text} warn={T.warn} flap/>
            <div style={{position:"absolute",inset:0,zIndex:1}}/>
          </div>

          <h1 style={{fontSize:32,fontWeight:900,margin:0,fontFamily:`${F.heading},sans-serif`,background:`linear-gradient(135deg,${T.text} 30%,${T.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:3}}>NOTESCRAFT</h1>

          <p style={{color:T.accent,fontSize:10,margin:"8px 0 0",fontWeight:500,letterSpacing:4,textTransform:"uppercase",fontFamily:`${F.body},sans-serif`}}>Where privacy is part of the craft</p>

          <p style={{color:T.text,fontSize:10,margin:"12px auto 28px",lineHeight:1.7,maxWidth:440,opacity:0.7}}>Privacy isn't an add-on or a setting you have to find.<br/>It's part of how NotesCraft is built — from the first word you write.</p>

          <div style={{display:"flex",gap:0,marginBottom:18,background:T.dark?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:3,border:`1px solid rgba(${T.accentRgb},0.12)`}}>
            {["login","signup"].map(tab=>(
              <button key={tab} onClick={()=>{setAuthMode(tab);setAuthErr("")}}
                style={{flex:1,padding:"9px 0",border:"none",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:`${F.body},sans-serif`,cursor:"pointer",letterSpacing:.5,background:authMode===tab?`rgba(${T.accentRgb},0.15)`:"transparent",backdropFilter:authMode===tab?"blur(6px)":"none",color:authMode===tab?T.accent:T.text,opacity:authMode===tab?1:0.5,transition:"all 0.3s",boxShadow:authMode===tab?`0 2px 8px rgba(${T.accentRgb},0.1)`:"none"}}>
                {tab==="login"?"Sign In":"Sign Up"}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {!isL&&<div style={{position:"relative"}}><div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.text,opacity:0.5}}><IC.User/></div><input value={uname} onChange={e=>{setUname(e.target.value);setAuthErr("")}} placeholder="Your name" style={{...inp,width:"100%",padding:"12px 14px 12px 42px"}}/></div>}
            <div style={{position:"relative"}}><div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.text,opacity:0.5}}><IC.Mail/></div><input value={email} onChange={e=>{setEmail(e.target.value);setAuthErr("")}} placeholder="Email" type="email" onKeyDown={e=>e.key==="Enter"&&(isL?doLogin():doSignup())} style={{...inp,width:"100%",padding:"12px 14px 12px 42px"}}/></div>
            <div style={{position:"relative"}}><div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.text,opacity:0.5}}><IC.Lock/></div><input value={pw} onChange={e=>{setPw(e.target.value);setAuthErr("")}} placeholder="Password" type={showPw?"text":"password"} onKeyDown={e=>e.key==="Enter"&&(isL?doLogin():doSignup())} style={{...inp,width:"100%",padding:"12px 42px 12px 42px"}}/><button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.text,opacity:0.5,cursor:"pointer"}}>{showPw?<IC.EyeOff/>:<IC.Eye/>}</button></div>
          </div>
          {authErr&&<p style={{color:T.err,fontSize:12,marginTop:8,textAlign:"left"}}>{authErr}</p>}
          <button onClick={isL?doLogin:doSignup} disabled={authLoad} className="auth-submit-btn"
            style={{width:"100%",padding:"14px 0",marginTop:16,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,backgroundSize:"200% 200%",border:`1px solid rgba(255,255,255,0.15)`,borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,fontFamily:`${F.heading},sans-serif`,cursor:authLoad?"wait":"pointer",letterSpacing:2,textTransform:"uppercase",boxShadow:`0 4px 25px rgba(${T.accentRgb},0.35), inset 0 1px 0 rgba(255,255,255,0.15)`,opacity:authLoad?.6:1,transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)"}}>
            {authLoad?"···":(isL?"SIGN IN":"CREATE ACCOUNT")}
          </button>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:18,color:T.text,opacity:0.5,fontSize:10,letterSpacing:1}}>
            <IC.Shield/><span>AES-256 · Cross-Device Sync</span>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════ MAIN APP ═══════════ */
  const VIEWS=[
    {n:"Notes",i:<IC.Note/>,c:notes.filter(n=>!n.deleted&&!n.archived).length},
    {n:"Starred",i:<IC.Star/>},
    {n:"Archived",i:<IC.Archive/>},
    {n:"Trash",i:<IC.Trash/>},
    {d:true},
    {n:"Calendar",i:<IC.Calendar/>,c:calEvents.length},
    {d:true},
    {n:"Completed",i:<IC.Check/>},
    {n:"In Progress",i:<IC.Clock/>},
    {n:"Planned",i:<IC.Tag/>},
    {n:"Untagged",i:<IC.Tag/>},
  ];

  return(
    <div onClick={()=>editFolderMenu&&setEditFolderMenu(null)} style={{width:"100vw",height:"100vh",display:"flex",background:T.bg,fontFamily:`${F.body},sans-serif`,color:T.text,overflow:"hidden"}}>
      <style>{css}</style>

      {/* Delete confirm modal */}
      {delConfirm&&<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>setDelConfirm(null)}>
        <div style={{...glass,borderRadius:16,padding:28,width:360,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
          <p style={{fontSize:16,fontWeight:600,marginBottom:8}}>Delete permanently?</p>
          <p style={{fontSize:14,color:T.dim,marginBottom:20}}>This cannot be undone.</p>
          <div style={{display:"flex",gap:10}}>
            <button className="glass-btn" onClick={()=>setDelConfirm(null)} style={{flex:1,padding:"10px 0",background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.4)",backdropFilter:"blur(8px)",border:`1px solid rgba(${T.accentRgb},0.12)`,borderRadius:8,color:T.text,fontSize:14,fontFamily:"inherit",cursor:"pointer",transition:"all 0.3s"}}>Cancel</button>
            <button onClick={()=>deleteNote(delConfirm)} style={{flex:1,padding:"10px 0",background:"rgba(239,68,68,.1)",backdropFilter:"blur(8px)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,color:T.err,fontSize:14,fontWeight:600,fontFamily:"inherit",cursor:"pointer",transition:"all 0.3s"}}>Delete</button>
          </div>
        </div>
      </div>}

      {/* Theme picker modal */}
      {showThemes&&<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>setShowThemes(false)}>
        <div style={{...glass,borderRadius:16,padding:28,width:560,maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <h3 style={{fontSize:17,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:1}}>Choose Theme</h3>
            <span style={{fontSize:12,color:T.dim}}>{Object.keys(THEMES).length} themes</span>
            <button onClick={()=>setShowThemes(false)} style={{background:"none",border:"none",color:T.faint,cursor:"pointer"}}><IC.X/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,overflowY:"auto",paddingRight:4}}>
            {Object.values(THEMES).map(theme=>(
              <button key={theme.id} onClick={()=>{changeTheme(theme.id);setShowThemes(false)}} className="glass-btn"
                style={{padding:14,borderRadius:10,cursor:"pointer",textAlign:"left",border:themeId===theme.id?`2px solid ${theme.accent}`:`1px solid rgba(${T.accentRgb},0.1)`,background:themeId===theme.id?`rgba(${theme.accentRgb},0.1)`:T.dark?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.3)",backdropFilter:"blur(8px)",fontFamily:"inherit",color:T.text,transition:"all 0.3s",boxShadow:themeId===theme.id?`0 0 20px rgba(${theme.accentRgb},0.1)`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                  <span style={{fontSize:20}}>{theme.icon}</span>
                  <span style={{fontSize:13,fontWeight:600}}>{theme.name}</span>
                </div>
                {theme.desc&&<div style={{fontSize:11,color:T.dim,opacity:0.7,marginBottom:6,lineHeight:1.3}}>{theme.desc}</div>}
                <div style={{display:"flex",gap:4}}>
                  {[theme.bg,theme.accent,theme.accent2,theme.text].map((c,i)=>(
                    <div key={i} style={{width:20,height:20,borderRadius:5,background:c,border:"1px solid rgba(128,128,128,.15)"}}/>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* Plans modal */}
      {showPlans&&<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>setShowPlans(false)}>
        <div style={{...glass,borderRadius:16,padding:28,width:680,maxHeight:"80vh",display:"flex",flexDirection:"column",animation:"fadeUp 0.2s ease-out"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <h3 style={{fontSize:17,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:1}}>Choose Your Plan</h3>
            <button onClick={()=>setShowPlans(false)} style={{background:"none",border:"none",color:T.faint,cursor:"pointer"}}><IC.X/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            {PLANS.map(plan=>{
              const isCurrent=plan.id==="free";
              const isPro=plan.id==="pro";
              return(
                <div key={plan.id} style={{borderRadius:12,padding:20,border:isPro?`2px solid ${T.accent}`:`1px solid rgba(${T.accentRgb},0.12)`,background:isPro?`rgba(${T.accentRgb},0.06)`:T.dark?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.3)",position:"relative",display:"flex",flexDirection:"column"}}>
                  {plan.badge&&<span style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:T.accent,color:T.dark?"#fff":"#fff",fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:10,letterSpacing:0.5}}>{plan.badge}</span>}
                  <div style={{fontSize:18,fontWeight:700,fontFamily:`${F.heading},sans-serif`,marginBottom:4}}>{plan.name}</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:2,marginBottom:12}}>
                    <span style={{fontSize:28,fontWeight:800,color:T.accent}}>{plan.price}</span>
                    <span style={{fontSize:12,color:T.dim}}>{plan.period}</span>
                  </div>
                  <div style={{fontSize:13,color:T.dim,marginBottom:14,fontWeight:600}}>{plan.storage} GB storage</div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
                    {plan.features.map((f,i)=><div key={i} style={{fontSize:12,color:T.dim,display:"flex",alignItems:"center",gap:6}}><span style={{color:T.ok,fontSize:14}}>&#10003;</span>{f}</div>)}
                  </div>
                  {isCurrent?(
                    <div style={{padding:"8px 0",borderRadius:8,fontSize:13,fontWeight:600,textAlign:"center",background:`rgba(${T.accentRgb},0.08)`,color:T.accent,border:`1px solid rgba(${T.accentRgb},0.2)`}}>Current Plan</div>
                  ):(
                    <div style={{padding:"8px 0",borderRadius:8,fontSize:13,fontWeight:600,textAlign:"center",background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",color:T.dim,border:`1px solid rgba(${T.accentRgb},0.08)`,cursor:"default"}}>Coming Soon</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>}

      {/* Note type picker modal */}
      {showTypePicker&&<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>setShowTypePicker(false)}>
        <div style={{...glass,borderRadius:16,padding:28,width:400,animation:"fadeUp 0.2s ease-out"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <h3 style={{fontSize:17,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:1}}>Choose a note type</h3>
            <button onClick={()=>setShowTypePicker(false)} style={{background:"none",border:"none",color:T.faint,cursor:"pointer"}}><IC.X/></button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {NOTE_TYPES.map(nt=>(
              <button key={nt.id} onClick={()=>createNote(nt.id)} className="glass-btn"
                style={{padding:"12px 14px",borderRadius:10,cursor:"pointer",textAlign:"left",border:`1px solid rgba(${T.accentRgb},0.1)`,background:T.dark?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.3)",backdropFilter:"blur(8px)",fontFamily:"inherit",color:T.text,transition:"all 0.3s",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:`rgba(${T.accentRgb},0.1)`,display:"flex",alignItems:"center",justifyContent:"center",color:T.accent,flexShrink:0}}><nt.Ic/></div>
                <div><div style={{fontSize:14,fontWeight:600}}>{nt.name}</div><div style={{fontSize:12,color:T.dim,marginTop:2}}>{nt.desc}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* Calendar event create/edit modal */}
      {calShowForm&&calEditing&&<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.45)",backdropFilter:"blur(10px)"}} onClick={()=>{setCalShowForm(false);setCalEditing(null)}}>
        <div style={{background:T.dark?"rgba(30,30,35,0.95)":"rgba(255,255,255,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${T.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.1)"}`,boxShadow:`0 24px 80px rgba(0,0,0,${T.dark?0.5:0.25})`,borderRadius:16,padding:28,width:440,maxHeight:"80vh",overflowY:"auto",animation:"fadeUp 0.2s ease-out",color:T.text}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <h3 style={{fontSize:17,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:1,color:T.text}}>{calEvents.find(e=>e.id===calEditing.id)?"Edit Event":"New Event"}</h3>
            <button onClick={()=>{setCalShowForm(false);setCalEditing(null)}} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:4}}><IC.X/></button>
          </div>

          {/* Type selector */}
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {["event","reminder","todo"].map(type=>(
              <button key={type} onClick={()=>setCalEditing(prev=>({...prev,type}))} className="glass-btn"
                style={{flex:1,padding:"9px 0",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",letterSpacing:0.5,
                  background:calEditing.type===type?`rgba(${T.accentRgb},0.18)`:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                  color:calEditing.type===type?T.accent:T.text,
                  border:calEditing.type===type?`1.5px solid ${T.accent}`:`1px solid ${T.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,
                  transition:"all 0.2s"}}>
                {type==="event"?"Event":type==="reminder"?"Reminder":"To-Do"}
              </button>
            ))}
          </div>

          {/* Title */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>TITLE</label>
            <input value={calEditing.title} onChange={e=>setCalEditing(prev=>({...prev,title:e.target.value}))}
              placeholder={calEditing.type==="todo"?"What needs to be done?":"Event title"} autoFocus
              style={{width:"100%",padding:"10px 12px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
          </div>

          {/* Date */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>DATE</label>
            <input type="date" value={calEditing.date} onChange={e=>setCalEditing(prev=>({...prev,date:e.target.value}))}
              style={{width:"100%",padding:"10px 12px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
          </div>

          {/* Time (for events only — reminders use the REMINDER section) */}
          {calEditing.type==="event"&&<div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}>
              <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>START TIME</label>
              <input type="time" value={calEditing.time} onChange={e=>setCalEditing(prev=>({...prev,time:e.target.value}))}
                style={{width:"100%",padding:"10px 12px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>END TIME</label>
              <input type="time" value={calEditing.endTime} onChange={e=>setCalEditing(prev=>({...prev,endTime:e.target.value}))}
                style={{width:"100%",padding:"10px 12px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
            </div>
          </div>}

          {/* Color picker */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>COLOR</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {FOLDER_COLORS.map(c=>(
                <button key={c} onClick={()=>setCalEditing(prev=>({...prev,color:c}))}
                  style={{width:24,height:24,borderRadius:"50%",background:c,
                    border:calEditing.color===c?`2.5px solid ${T.text}`:"2.5px solid transparent",
                    cursor:"pointer",padding:0,transition:"all 0.15s",
                    boxShadow:calEditing.color===c?`0 0 8px ${c}66`:"none"}}/>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>NOTES</label>
            <textarea value={calEditing.notes} onChange={e=>setCalEditing(prev=>({...prev,notes:e.target.value}))}
              placeholder="Optional description..." rows={3}
              style={{width:"100%",padding:"10px 12px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",resize:"vertical",transition:"all 0.3s"}}/>
          </div>

          {/* Reminder */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>REMINDER</label>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:calEditing.reminderDate?8:0}}>
              <button onClick={async()=>{
                if(calEditing.reminderDate){setCalEditing(prev=>({...prev,reminderDate:"",reminderTime:"",reminderFired:false}))}
                else{const perm=await requestNotifPerm();if(perm!=="granted")return;setCalEditing(prev=>({...prev,reminderDate:prev.date,reminderTime:prev.time||"09:00",reminderFired:false}))}
              }} className="glass-btn"
                style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",letterSpacing:0.5,
                  background:calEditing.reminderDate?`rgba(${T.accentRgb},0.18)`:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                  color:calEditing.reminderDate?T.accent:T.text,
                  border:calEditing.reminderDate?`1.5px solid ${T.accent}`:`1px solid ${T.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,
                  transition:"all 0.2s",display:"flex",alignItems:"center",gap:5}}>
                <IC.Bell/>{calEditing.reminderDate?"Reminder On":"Add Reminder"}
              </button>
              {notifPerm==="denied"&&<span style={{fontSize:11,color:T.err||"#ef4444",fontWeight:500}}>Notifications blocked in browser</span>}
            </div>
            {calEditing.reminderDate&&<>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                {REMINDER_PRESETS.map(p=>(
                  <button key={p.label} onClick={()=>{
                    if(p.minutes===null)return;
                    const evDT=new Date(`${calEditing.date}T${calEditing.time||"00:00"}`);
                    const remDT=new Date(evDT.getTime()-p.minutes*60000);
                    const rd=remDT.getFullYear()+"-"+String(remDT.getMonth()+1).padStart(2,"0")+"-"+String(remDT.getDate()).padStart(2,"0");
                    const rt=String(remDT.getHours()).padStart(2,"0")+":"+String(remDT.getMinutes()).padStart(2,"0");
                    setCalEditing(prev=>({...prev,reminderDate:rd,reminderTime:rt,reminderFired:false}));
                  }} className="glass-btn"
                    style={{padding:"5px 11px",borderRadius:6,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                      background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,color:T.text,transition:"all 0.2s"}}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:3,display:"block"}}>REMIND DATE</label>
                  <input type="date" value={calEditing.reminderDate}
                    onChange={e=>setCalEditing(prev=>({...prev,reminderDate:e.target.value,reminderFired:false}))}
                    style={{width:"100%",padding:"8px 10px",fontSize:13,background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:3,display:"block"}}>REMIND TIME</label>
                  <input type="time" value={calEditing.reminderTime}
                    onChange={e=>setCalEditing(prev=>({...prev,reminderTime:e.target.value,reminderFired:false}))}
                    style={{width:"100%",padding:"8px 10px",fontSize:13,background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
                </div>
              </div>
              <p style={{fontSize:11,color:T.dim,margin:"8px 0 0",lineHeight:1.4,opacity:0.6}}>Notifications only work while the app tab is open in your browser.</p>
            </>}
          </div>

          {/* Checklist items (todo type) */}
          {calEditing.type==="todo"&&<div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>CHECKLIST ITEMS</label>
            <div style={{display:"flex",flexDirection:"column",gap:4,padding:10,borderRadius:10,border:`1px solid ${T.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.08)"}`,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.02)"}}>
              {(calEditing.items||[]).map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="checkbox" checked={item.done}
                    onChange={()=>{const items=[...calEditing.items];items[i]={...items[i],done:!items[i].done};setCalEditing(prev=>({...prev,items}))}}
                    style={{width:16,height:16,accentColor:T.accent,cursor:"pointer"}}/>
                  <input value={item.text}
                    onChange={e=>{const items=[...calEditing.items];items[i]={...items[i],text:e.target.value};setCalEditing(prev=>({...prev,items}))}}
                    onKeyDown={e=>{
                      if(e.key==="Enter"){e.preventDefault();const items=[...calEditing.items];items.splice(i+1,0,{text:"",done:false});setCalEditing(prev=>({...prev,items}))}
                      if(e.key==="Backspace"&&!item.text&&calEditing.items.length>0){e.preventDefault();const items=[...calEditing.items];items.splice(i,1);setCalEditing(prev=>({...prev,items}))}
                    }}
                    placeholder="Item..."
                    style={{flex:1,background:"none",border:"none",outline:"none",color:T.text,fontSize:14,fontFamily:"inherit",padding:"5px 0"}}/>
                  <button onClick={()=>{const items=[...calEditing.items];items.splice(i,1);setCalEditing(prev=>({...prev,items}))}}
                    style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:2,opacity:.4,display:"flex"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".4"}><IC.X/></button>
                </div>
              ))}
              <button onClick={()=>setCalEditing(prev=>({...prev,items:[...(prev.items||[]),{text:"",done:false}]}))}
                style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:12,fontWeight:500,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,padding:"5px 0"}}>
                <IC.Plus s={13}/>Add item
              </button>
            </div>
          </div>}

          {/* Save */}
          <button onClick={()=>saveCalEvent(calEditing)} className="cal-save-btn"
            style={{width:"100%",padding:"13px 0",marginTop:8,
              background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,
              border:"none",borderRadius:10,
              color:"#fff",fontSize:13,fontWeight:700,fontFamily:`${F.heading},sans-serif`,
              cursor:"pointer",letterSpacing:1,textTransform:"uppercase",
              boxShadow:`0 4px 20px rgba(${T.accentRgb},0.3)`,transition:"all 0.3s"}}>
            {calEvents.find(e=>e.id===calEditing.id)?"SAVE CHANGES":"CREATE"}
          </button>
        </div>
      </div>}

      {/* ══════ SIDEBAR ══════ */}
      <div style={{width:sidebarOpen?sbW:54,minWidth:sidebarOpen?54:54,height:"100%",background:T.dark?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.45)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRight:`1px solid rgba(${T.accentRgb},0.1)`,display:"flex",flexDirection:"column",overflow:"hidden",transition:"width 0.2s"}}>
        <div style={{padding:sidebarOpen?"14px 14px 12px":"10px 10px 10px",borderBottom:`1px solid ${T.bdr}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div onClick={()=>setSidebarOpen(!sidebarOpen)} onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",userSelect:"none"}} title={sidebarOpen?"Collapse sidebar":"Expand sidebar"}>
              <ButterflyLogo s={20} accentRgb="255,255,255" accent="#fff" accent2="#fff" text="rgba(255,255,255,0.9)" warn="rgba(255,255,255,0.95)"/>
            </div>
            {sidebarOpen&&<span style={{fontSize:15,fontWeight:700,flex:1,letterSpacing:1,fontFamily:`${F.heading},sans-serif`,overflow:"hidden",whiteSpace:"nowrap"}}>NotesCraft</span>}
          </div>
        </div>

        <div style={{padding:sidebarOpen?"10px 6px 0":"6px 4px 0",overflowY:"auto",flex:1}}>
          {sidebarOpen&&<div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:T.faint,padding:"0 8px 6px",textTransform:"uppercase"}}>Views</div>}
          {VIEWS.map((v,i)=>v.d?<div key={i} style={{height:1,background:T.bdr,margin:sidebarOpen?"6px 8px":"4px 4px"}}/>:(
            <button key={v.n} className="sb-view-btn" onClick={()=>{flushSave();setView(v.n);setFolder(null);if(v.n!=="Calendar"){setCalSelDate(null);setCalSelEvent(null)}}} title={sidebarOpen?undefined:v.n}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:sidebarOpen?"flex-start":"center",gap:9,padding:sidebarOpen?"7px 10px":"7px 0",marginBottom:2,background:view===v.n&&!folder?T.surfH:"transparent",border:"none",borderRadius:6,color:view===v.n&&!folder?T.accent:T.dim,fontSize:14,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>
              <span className="sb-view-ic" style={{opacity:.7,flexShrink:0,display:"inline-flex",transition:"all 0.2s ease"}}>{v.i}</span>
              {sidebarOpen&&<><span style={{flex:1}}>{v.n}</span>{v.c!==undefined&&<span style={{fontSize:12,color:T.faint}}>{v.c}</span>}</>}
            </button>
          ))}

          <div style={{marginTop:10,borderTop:`1px solid ${T.bdr}`,paddingTop:10,position:"relative"}}>
            {sidebarOpen&&<div style={{display:"flex",alignItems:"center",padding:"0 8px 6px"}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:T.faint,textTransform:"uppercase",flex:1}}>Folders</span>
              <button onClick={()=>{setShowNewFolder(true);setNewFolderColor(null)}} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:0,display:"flex"}}><IC.Plus s={15}/></button>
            </div>}
            {sidebarOpen&&showNewFolder&&<div style={{padding:"2px 6px 8px"}}>
              <div style={{display:"flex",gap:4,marginBottom:6}}>
                <input value={newFolder} onChange={e=>setNewFolder(e.target.value)} placeholder="Folder name" autoFocus onKeyDown={e=>{if(e.key==="Enter")addFolderFn();if(e.key==="Escape"){setShowNewFolder(false);setNewFolder("");setNewFolderColor(null)}}} style={{flex:1,padding:"5px 8px",background:T.surf,border:`1px solid rgba(${T.accentRgb},.2)`,borderRadius:5,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
                <button onClick={addFolderFn} className="glass-btn" style={{background:`rgba(${T.accentRgb},.08)`,backdropFilter:"blur(6px)",border:`1px solid rgba(${T.accentRgb},.12)`,borderRadius:6,color:T.accent,cursor:"pointer",padding:"4px 10px",fontSize:12,fontFamily:"inherit",transition:"all 0.3s"}}>Add</button>
              </div>
              <div style={{display:"flex",gap:4,padding:"0 2px",flexWrap:"wrap"}}>
                {FOLDER_COLORS.map(c=><button key={c} onClick={()=>setNewFolderColor(c)} style={{width:16,height:16,borderRadius:"50%",background:c,border:newFolderColor===c?`2px solid ${T.text}`:`2px solid transparent`,cursor:"pointer",padding:0,transition:"all 0.15s"}}/>)}
              </div>
            </div>}
            {folders.map(([n,c])=>{const fc=folderColors[n]||T.accent;return(
              <div key={n} style={{position:"relative"}}>
                <button className="sb-folder-btn" onClick={()=>{flushSave();setFolder(n);setView("");setEditFolderMenu(null);setCalSelDate(null);setCalSelEvent(null)}} onContextMenu={e=>{e.preventDefault();setEditFolderMenu(editFolderMenu===n?null:n)}} title={sidebarOpen?undefined:n}
                  style={{width:"100%",display:"flex",alignItems:"center",justifyContent:sidebarOpen?"flex-start":"center",gap:9,padding:sidebarOpen?"7px 10px":"7px 0",marginBottom:2,background:folder===n?T.surfH:"transparent",border:"none",borderRadius:6,color:folder===n?T.accent:T.dim,fontSize:14,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>
                  <span className="sb-folder-dot" style={{width:10,height:10,borderRadius:"50%",background:fc,flexShrink:0,boxShadow:`0 0 4px ${fc}44`,transition:"all 0.2s ease"}}/>{sidebarOpen&&<><span style={{flex:1}}>{n}</span><span style={{fontSize:12,color:T.faint}}>{c}</span></>}
                </button>
                {sidebarOpen&&editFolderMenu===n&&<div onClick={e=>e.stopPropagation()} style={{padding:"8px",margin:"0 6px 6px",background:T.dark?"rgba(30,30,40,0.95)":"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderRadius:8,border:`1px solid rgba(${T.accentRgb},0.15)`,boxShadow:`0 4px 20px rgba(0,0,0,0.15)`}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                    {FOLDER_COLORS.map(cl=><button key={cl} onClick={()=>changeFolderColor(n,cl)} style={{width:18,height:18,borderRadius:"50%",background:cl,border:fc===cl?`2px solid ${T.text}`:`2px solid transparent`,cursor:"pointer",padding:0,transition:"all 0.15s"}}/>)}
                  </div>
                  <button onClick={()=>deleteFolder(n)} style={{width:"100%",padding:"5px 0",borderRadius:5,fontSize:11,fontWeight:600,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",color:T.err,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>Delete folder</button>
                </div>}
              </div>
            )})}
          </div>
        </div>

        <div style={{borderTop:`1px solid rgba(${T.accentRgb},0.08)`,background:T.dark?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:sidebarOpen?6:0,padding:sidebarOpen?"8px 12px":"8px 0",justifyContent:sidebarOpen?"flex-start":"center",flexWrap:sidebarOpen?"nowrap":"wrap"}}>
            <div style={{width:24,height:24,borderRadius:6,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0}}>{user?.name?.[0]?.toUpperCase()||"?"}</div>
            {sidebarOpen&&<span style={{fontSize:13,color:T.dim,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</span>}
            {sidebarOpen&&<button onClick={()=>setShowThemes(true)} className="sidebar-icon-btn" style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Themes"><IC.Palette/></button>}
            {sidebarOpen&&<button onClick={doLogout} className="sidebar-icon-btn" style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Sign out"><IC.Logout/></button>}
          </div>
          {sidebarOpen&&<div style={{padding:"2px 12px 6px",cursor:"pointer"}} onClick={openPlans} title="View Plans">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:10,color:T.faint}}>{quotaInfo.label} / {quotaGB} GB</span>
              <span style={{fontSize:10,color:quotaInfo.color}}>{quotaInfo.pct.toFixed(1)}%</span>
            </div>
            <div style={{height:3,borderRadius:2,background:`rgba(${T.accentRgb},0.1)`,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,background:quotaInfo.color,width:`${quotaInfo.pct}%`,transition:"width 0.3s"}}/>
            </div>
          </div>}
          {sidebarOpen&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px 8px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:syncSt==="ok"?T.ok:syncSt==="quota"?T.err:T.warn,boxShadow:`0 0 4px ${syncSt==="ok"?T.ok:syncSt==="quota"?T.err:T.warn}`,animation:syncSt==="saving"?"pulse 1s infinite":"none"}}/>
            <span style={{fontSize:11,color:T.faint,flex:1}}>{syncSt==="ok"?"Synced":syncSt==="quota"?"Quota full":"Saving..."}</span>
            <span style={{color:T.faint,animation:syncSt==="saving"?"spin 1s linear infinite":"none",display:"flex"}}><IC.Sync/></span>
          </div>}
          {!sidebarOpen&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"4px 0 8px"}}>
            <button onClick={()=>setShowThemes(true)} className="sidebar-icon-btn" style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Themes"><IC.Palette/></button>
            <button onClick={doLogout} className="sidebar-icon-btn" style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Sign out"><IC.Logout/></button>
            <div style={{width:6,height:6,borderRadius:"50%",background:syncSt==="ok"?T.ok:syncSt==="quota"?T.err:T.warn,boxShadow:`0 0 4px ${syncSt==="ok"?T.ok:syncSt==="quota"?T.err:T.warn}`}}/>
          </div>}
        </div>
      </div>

      {/* Sidebar resize handle */}
      {sidebarOpen&&<div className="resize-handle" onMouseDown={startResize("sb")}/>}

      {/* ══════ NOTE LIST / CALENDAR PANEL ══════ */}
      <div style={{width:nlW,minWidth:220,height:"100%",background:T.dark?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.35)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRight:`1px solid rgba(${T.accentRgb},0.08)`,display:"flex",flexDirection:"column"}}>
        {view==="Calendar"?(<>
        {/* Calendar panel */}
        <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${T.bdr}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            {!sidebarOpen&&<button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Open sidebar"><IC.Menu/></button>}
            <span style={{fontSize:20,fontWeight:800,flex:1,letterSpacing:0.5,display:"flex",alignItems:"center",gap:8}}><IC.Calendar/> Calendar</span>
            <button onClick={()=>createCalEvent()} className="glass-btn" style={{background:`rgba(${T.accentRgb},.08)`,backdropFilter:"blur(8px)",border:`1px solid rgba(${T.accentRgb},.15)`,borderRadius:8,color:T.accent,cursor:"pointer",padding:"5px 8px",display:"flex",transition:"all 0.3s",boxShadow:`0 2px 8px rgba(${T.accentRgb},0.08)`}}><IC.Plus s={17}/></button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <button onClick={calPrevMonth} className="glass-btn" style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:"2px 6px",borderRadius:5,fontSize:18,fontFamily:"inherit"}}>&#8249;</button>
            <span style={{flex:1,textAlign:"center",fontSize:15,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:0.5}}>{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={calNextMonth} className="glass-btn" style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:"2px 6px",borderRadius:5,fontSize:18,fontFamily:"inherit"}}>&#8250;</button>
          </div>
          <button onClick={calGoToday} style={{width:"100%",padding:"4px 0",borderRadius:6,fontSize:11,fontWeight:600,background:`rgba(${T.accentRgb},0.05)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",letterSpacing:0.5}}>Today</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
          {/* Day headers */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
            {DAY_LABELS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.faint,padding:"4px 0",letterSpacing:0.5}}>{d}</div>)}
          </div>
          {/* Day cells */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
            {calGrid.map((cell,i)=>{
              const ds=calDateStr(cell.year,cell.month,cell.day);
              const isToday=ds===todayStr;const isSel=ds===calSelDate;
              const dayEv=eventsForDate(ds);const hasEv=dayEv.length>0;
              return<div key={i} onClick={()=>setCalSelDate(ds)} style={{
                aspectRatio:"1",borderRadius:6,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                background:isSel?`rgba(${T.accentRgb},0.15)`:isToday?`rgba(${T.accentRgb},0.06)`:"transparent",
                border:isSel?`1.5px solid ${T.accent}`:isToday?`1px solid rgba(${T.accentRgb},0.2)`:"1px solid transparent",
                transition:"all 0.15s",opacity:cell.outside?0.35:1}}>
                <span style={{fontSize:13,fontWeight:isToday||isSel?700:400,color:isSel?T.accent:isToday?T.accent:cell.outside?T.faint:T.text}}>{cell.day}</span>
                {hasEv&&<div style={{display:"flex",gap:2}}>
                  {dayEv.slice(0,3).map(ev=><div key={ev.id} style={{width:4,height:4,borderRadius:"50%",background:ev.color||T.accent,boxShadow:`0 0 3px ${ev.color||T.accent}44`}}/>)}
                  {dayEv.length>3&&<span style={{fontSize:8,color:T.faint}}>+</span>}
                </div>}
              </div>
            })}
          </div>

          {/* Selected day event list */}
          {calSelDate&&<div style={{marginTop:10,borderTop:`1px solid ${T.bdr}`,paddingTop:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:700,flex:1}}>{new Date(calSelDate+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
              <span style={{fontSize:11,color:T.faint}}>{calSelDayEvents.length} item{calSelDayEvents.length!==1?"s":""}</span>
            </div>
            {calSelDayEvents.length===0&&<div style={{padding:16,textAlign:"center",color:T.faint,fontSize:13}}>No events for this day</div>}
            {calSelDayEvents.map(ev=>(
              <div key={ev.id} onClick={()=>setCalSelEvent(ev.id)} style={{
                padding:"8px 10px",marginBottom:3,borderRadius:8,cursor:"pointer",
                background:calSelEvent===ev.id?(T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.5)"):"transparent",
                border:calSelEvent===ev.id?`1px solid rgba(${T.accentRgb},.12)`:"1px solid transparent",
                transition:"all 0.2s",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:ev.color||T.accent,flexShrink:0,boxShadow:`0 0 4px ${ev.color||T.accent}44`}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {ev.type==="todo"&&<input type="checkbox" checked={ev.done} onChange={e=>{e.stopPropagation();toggleCalTodo(ev.id)}} style={{width:14,height:14,accentColor:T.accent,cursor:"pointer",flexShrink:0}}/>}
                    {ev.type==="reminder"&&<span style={{color:T.warn,flexShrink:0}}><IC.Bell/></span>}
                    <span style={{fontSize:13,fontWeight:600,color:ev.done?T.faint:T.text,textDecoration:ev.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title||"Untitled"}</span>
                  </div>
                  {ev.time&&<span style={{fontSize:11,color:T.faint}}>{ev.time}{ev.endTime?` - ${ev.endTime}`:""}</span>}
                  {ev.type==="todo"&&ev.items&&ev.items.length>0&&<span style={{fontSize:11,color:T.faint}}>{ev.items.filter(x=>x.done).length}/{ev.items.length} done</span>}
                </div>
                {ev.reminderDate&&ev.reminderTime&&!ev.reminderFired&&<span style={{color:T.warn,flexShrink:0,opacity:0.7}} title={`Reminder: ${ev.reminderDate} ${ev.reminderTime}`}><IC.BellRing/></span>}
                <span style={{fontSize:9,fontWeight:600,letterSpacing:0.5,color:T.faint,textTransform:"uppercase",flexShrink:0}}>{ev.type}</span>
              </div>
            ))}
            {/* Quick-add buttons */}
            <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
              {[{type:"event",label:"Event",Ico:IC.Calendar},{type:"reminder",label:"Reminder",Ico:IC.Bell},{type:"todo",label:"To-Do",Ico:IC.ListCheck}].map(({type,label,Ico})=>(
                <button key={type} onClick={()=>createCalEvent({type,date:calSelDate})} className="glass-btn"
                  style={{flex:1,padding:"6px 0",borderRadius:6,fontSize:11,fontWeight:600,background:`rgba(${T.accentRgb},0.05)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.3s"}}>
                  <Ico/>+{label}
                </button>
              ))}
            </div>
          </div>}
        </div>
        </>):(<>
        {/* Normal note list */}
        <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${T.bdr}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            {!sidebarOpen&&<button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Open sidebar"><IC.Menu/></button>}
            <span style={{fontSize:20,fontWeight:800,flex:1,letterSpacing:0.5,display:"flex",alignItems:"center",gap:8}}>{folder&&<span style={{width:10,height:10,borderRadius:"50%",background:folderColors[folder]||T.accent,flexShrink:0}}/>}{folder||view||"Notes"}</span>
            <span style={{fontSize:12,color:T.faint}}>{filtered.length}</span>
            <button onClick={()=>setShowTypePicker(true)} className="glass-btn" style={{background:`rgba(${T.accentRgb},.08)`,backdropFilter:"blur(8px)",border:`1px solid rgba(${T.accentRgb},.15)`,borderRadius:8,color:T.accent,cursor:"pointer",padding:"5px 8px",display:"flex",transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)",boxShadow:`0 2px 8px rgba(${T.accentRgb},0.08)`,animation:"btnPulseGlow 4s ease-in-out infinite"}}><IC.Plus s={17}/></button>
          </div>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.faint}}><IC.Search/></div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes..." style={{width:"100%",padding:"8px 10px 8px 32px",background:T.dark?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.35)",backdropFilter:"blur(6px)",border:`1px solid rgba(${T.accentRgb},0.1)`,borderRadius:8,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"4px 6px"}}>
          {filtered.length===0&&<div style={{padding:28,textAlign:"center",color:T.faint,fontSize:14}}>{view==="Trash"?"Trash empty":"No notes yet"}</div>}
          {filtered.map((n,i)=>(
            <div key={n.id} onClick={()=>selectNote(n.id)} style={{padding:"10px 10px 8px",marginBottom:3,borderRadius:9,cursor:"pointer",background:selId===n.id?(T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.5)"):"transparent",backdropFilter:selId===n.id?"blur(6px)":"none",border:selId===n.id?`1px solid rgba(${T.accentRgb},.12)`:"1px solid transparent",transition:"all 0.2s",animation:`slideIn 0.15s ease-out ${i*0.02}s both`,boxShadow:selId===n.id?`0 2px 8px rgba(0,0,0,0.06)`:""}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{color:`rgba(${T.accentRgb},.5)`,flexShrink:0}}>{(()=>{const blocks=getBlocks(n);const t=blocks[0]?.type||"richtext";const nt=NOTE_TYPES.find(x=>x.id===t);return nt?<nt.Ic/>:<IC.Note/>})()}</span>
                <span style={{fontSize:14,fontWeight:600,color:selId===n.id?T.text:T.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{n.title}</span>
                {n.starred&&<span style={{color:T.warn,flexShrink:0}}><IC.StarF/></span>}
              </div>
              <p style={{fontSize:12,color:T.faint,margin:"0 0 5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingLeft:22}}>{(()=>{const blocks=getBlocks(n);const b=blocks[0];if(!b)return"Empty";if(b.type==="checklist"){try{const items=JSON.parse(b.content);return items.map(x=>(x.done?"✓ ":"○ ")+x.text).join(", ").substring(0,80)||"Empty checklist"}catch{return"Empty"}}return stripHtml(b.content).substring(0,80)||(blocks.length>1?"Multiple blocks":"Empty")})()}</p>
              <div style={{display:"flex",alignItems:"center",gap:4,paddingLeft:22,flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:T.faint}}>{fmtDate(n.modified)}</span>
                {!folder&&n.folder&&<span style={{padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:500,background:`${folderColors[n.folder]||T.accent}18`,color:folderColors[n.folder]||T.accent,border:`1px solid ${folderColors[n.folder]||T.accent}30`,display:"flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:"50%",background:folderColors[n.folder]||T.accent}}/>{n.folder}</span>}
                {n.tags.map(tag=>{const c=getTC(tag);return<span key={tag} style={{padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:500,background:c.bg,color:c.text,border:`1px solid ${c.bdr}`}}>{tag}</span>})}
              </div>
              {view==="Trash"&&<div style={{display:"flex",gap:6,paddingLeft:22,marginTop:6}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>restoreNote(n.id)} className="glass-btn" style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:500,background:`rgba(${T.accentRgb},.05)`,backdropFilter:"blur(6px)",border:`1px solid rgba(${T.accentRgb},.12)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3,transition:"all 0.3s"}}><IC.Restore/>Restore</button>
                <button onClick={()=>setDelConfirm(n.id)} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:500,background:"rgba(239,68,68,.05)",backdropFilter:"blur(6px)",border:"1px solid rgba(239,68,68,.12)",color:T.err,cursor:"pointer",fontFamily:"inherit",transition:"all 0.3s"}}>Delete</button>
              </div>}
            </div>
          ))}
        </div>
        </>)}
      </div>

      {/* Note list resize handle */}
      <div className="resize-handle" onMouseDown={startResize("nl")}/>

      {/* ══════ EDITOR ══════ */}
      <div style={{flex:1,height:"100%",display:"flex",flexDirection:"column",background:T.dark?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.2)",backdropFilter:"blur(8px)"}}>
        {quotaWarn&&<div style={{padding:"8px 24px",display:"flex",alignItems:"center",gap:10,background:quotaWarn==="full"?`rgba(239,68,68,0.1)`:`rgba(251,191,36,0.1)`,borderBottom:`1px solid ${quotaWarn==="full"?T.err:T.warn}`}}>
          <span style={{fontSize:13,color:quotaWarn==="full"?T.err:T.warn,flex:1}}>{quotaWarn==="full"?"Storage full! Upgrade to continue saving.":"Storage 90% full. Upgrade for more space."}</span>
          <button onClick={openPlans} className="glass-btn" style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:600,background:quotaWarn==="full"?`rgba(239,68,68,0.1)`:`rgba(251,191,36,0.1)`,border:`1px solid ${quotaWarn==="full"?T.err:T.warn}`,color:quotaWarn==="full"?T.err:T.warn,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.3s"}}>View Plans</button>
        </div>}
        {view==="Calendar"?(()=>{
          const ev=calEvents.find(e=>e.id===calSelEvent);
          if(!ev)return(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
              <div style={{color:`rgba(${T.accentRgb},.2)`}}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
              <span style={{color:T.faint,fontSize:15}}>Select an event or create one</span>
              <button onClick={()=>createCalEvent()} className="glass-btn" style={{marginTop:8,padding:"10px 24px",background:`rgba(${T.accentRgb},.06)`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.accentRgb},.15)`,borderRadius:10,color:T.accent,fontSize:14,fontWeight:600,fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.3s",boxShadow:`0 2px 10px rgba(${T.accentRgb},0.08)`,animation:"btnFloat 3s ease-in-out infinite, btnPulseGlow 4s ease-in-out infinite"}}>
                <IC.Plus s={16}/>New Event
              </button>
            </div>
          );
          return<>
            {/* Event detail header */}
            <div style={{padding:"12px 24px 10px",borderBottom:`1px solid ${T.bdr}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:12,height:12,borderRadius:"50%",background:ev.color||T.accent,flexShrink:0}}/>
                <span style={{fontSize:22,fontWeight:700,flex:1,color:T.text}}>{ev.title||"Untitled"}</span>
                <span style={{fontSize:11,fontWeight:600,letterSpacing:0.5,padding:"2px 8px",borderRadius:4,background:`rgba(${T.accentRgb},0.08)`,color:T.accent,textTransform:"uppercase"}}>{ev.type}</span>
              </div>
              <div style={{display:"flex",gap:12,fontSize:13,color:T.dim,flexWrap:"wrap"}}>
                <span>{new Date(ev.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</span>
                {ev.time&&<span>{ev.time}{ev.endTime?` - ${ev.endTime}`:""}</span>}
              </div>
            </div>

            {/* Event action buttons */}
            <div style={{padding:"6px 24px",borderBottom:`1px solid rgba(${T.accentRgb},0.08)`,display:"flex",gap:2,alignItems:"center"}}>
              <span style={{fontSize:12,color:T.faint,flex:1}}/>
              <button onClick={()=>{setCalEditing({...ev});setCalShowForm(true)}} className="glass-btn note-action-btn" style={{background:"transparent",border:"1px solid transparent",color:T.faint,cursor:"pointer",padding:"5px 7px",borderRadius:7,display:"flex",alignItems:"center",gap:4,fontSize:12}} title="Edit"><IC.Highlight/><span>Edit</span></button>
              <button onClick={()=>deleteCalEvent(ev.id)} className="glass-btn note-action-btn" style={{background:"transparent",border:"1px solid transparent",color:T.faint,cursor:"pointer",padding:"5px 7px",borderRadius:7,display:"flex"}} title="Delete"><IC.Trash/></button>
            </div>

            {/* Event body */}
            <div style={{flex:1,overflow:"auto",padding:"16px 24px"}}>
              {ev.notes&&<div style={{fontSize:15,lineHeight:1.8,color:T.dim,marginBottom:16,padding:12,borderRadius:8,border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)",whiteSpace:"pre-wrap"}}>{ev.notes}</div>}

              {ev.type==="todo"&&ev.items&&ev.items.length>0&&<div style={{display:"flex",flexDirection:"column",gap:2,padding:8,borderRadius:8,border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:T.faint,marginBottom:4,textTransform:"uppercase"}}>Checklist</div>
                {ev.items.map((item,idx)=>(
                  <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 4px",borderRadius:6,background:item.done?`rgba(${T.accentRgb},0.04)`:"transparent"}}>
                    <input type="checkbox" checked={item.done} onChange={()=>toggleCalTodoItem(ev.id,idx)}
                      style={{width:18,height:18,accentColor:T.accent,cursor:"pointer",flexShrink:0}}/>
                    <span style={{flex:1,fontSize:15,color:item.done?T.faint:T.text,textDecoration:item.done?"line-through":"none",opacity:item.done?0.6:1}}>{item.text}</span>
                  </div>
                ))}
                <div style={{fontSize:11,color:T.faint,marginTop:4}}>{ev.items.filter(x=>x.done).length}/{ev.items.length} completed</div>
              </div>}

              {ev.type==="reminder"&&<div style={{display:"flex",alignItems:"center",gap:8,padding:12,borderRadius:8,border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)"}}>
                <IC.Bell/><span style={{fontSize:14,color:T.dim}}>Reminder{ev.time?` at ${ev.time}`:""}</span>
              </div>}

              {ev.reminderDate&&ev.reminderTime&&<div style={{display:"flex",alignItems:"center",gap:8,padding:12,borderRadius:8,marginTop:8,
                border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)"}}>
                <span style={{color:ev.reminderFired?T.faint:T.warn}}>{ev.reminderFired?<IC.Bell/>:<IC.BellRing/>}</span>
                <span style={{fontSize:14,color:ev.reminderFired?T.faint:T.dim}}>
                  {ev.reminderFired?"Reminder sent":"Reminder set for"}{" "}
                  {new Date(ev.reminderDate+"T"+ev.reminderTime).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                </span>
              </div>}
            </div>

            {/* Event status bar */}
            <div style={{padding:"8px 24px",borderTop:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",gap:10,fontSize:11,color:T.faint}}>
              <span>Created {fmtFull(ev.created)}</span><span>·</span>
              <span>Modified {fmtFull(ev.modified)}</span>
              <div style={{flex:1}}/>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:T.ok,boxShadow:`0 0 3px ${T.ok}`}}/>
                <span>Encrypted</span>
              </div>
            </div>
          </>;
        })()
        :sel?(
          <>
            <div style={{padding:"12px 24px 10px",borderBottom:`1px solid ${T.bdr}`}}>
              <input value={eTitle} onChange={e=>setETitle(e.target.value)} onBlur={flushSave}
                style={{width:"100%",background:"none",border:"none",outline:"none",color:T.text,fontSize:22,fontWeight:700,fontFamily:"inherit",padding:0,marginBottom:8}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
                {sel.tags.map(tag=>{const c=getTC(tag);return(
                  <span key={tag} onClick={()=>toggleNoteTag(sel.id,tag)} style={{padding:"2px 8px",borderRadius:4,fontSize:12,fontWeight:500,background:c.bg,color:c.text,border:`1px solid ${c.bdr}`,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    #{tag}<span style={{opacity:.5,fontSize:10}}>×</span>
                  </span>
                )})}
                {showNewTag?(
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    <input value={newTag} onChange={e=>setNewTag(e.target.value)} placeholder="Tag name" autoFocus
                      onKeyDown={e=>{if(e.key==="Enter")addTag();if(e.key==="Escape"){setShowNewTag(false);setNewTag("")}}}
                      style={{padding:"2px 6px",borderRadius:4,fontSize:12,background:T.surf,border:`1px solid rgba(${T.accentRgb},.2)`,color:T.text,fontFamily:"inherit",outline:"none",width:80}}/>
                    <button onClick={()=>{setShowNewTag(false);setNewTag("")}} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontSize:11}}>✕</button>
                  </div>
                ):(
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    <select value="" onChange={e=>{if(e.target.value)toggleNoteTag(sel.id,e.target.value)}}
                      style={{padding:"2px 4px",borderRadius:4,fontSize:12,background:T.surf,border:`1px solid ${T.bdr}`,color:T.faint,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                      <option value="">+tag</option>
                      {tags.filter(tg=>!sel.tags.includes(tg)).map(tg=><option key={tg} value={tg}>{tg}</option>)}
                    </select>
                    <button onClick={()=>setShowNewTag(true)} className="glass-btn" style={{padding:"3px 8px",borderRadius:5,fontSize:11,background:T.dark?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.3)",backdropFilter:"blur(4px)",border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.faint,fontFamily:"inherit",cursor:"pointer",transition:"all 0.3s"}}>+new</button>
                  </div>
                )}
              </div>
              <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:T.faint}}>Folder:</span>
                {(()=>{const cf=notes.find(n=>n.id===selId)?.folder||"";const fc=folderColors[cf];return(
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {cf&&fc&&<span style={{width:8,height:8,borderRadius:"50%",background:fc,flexShrink:0}}/>}
                    <select value={cf} onChange={e=>upNotes(p=>p.map(n=>n.id===selId?{...n,folder:e.target.value,modified:new Date().toISOString()}:n))}
                      style={{padding:"2px 6px",borderRadius:4,fontSize:12,background:T.surf,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none",minWidth:100}}>
                      <option value="">None</option>
                      {folders.map(([name])=><option key={name} value={name}>{name}</option>)}
                      {cf&&!folders.find(([n])=>n===cf)&&<option value={cf}>{cf}</option>}
                    </select>
                  </div>
                )})()}
              </div>
            </div>

            {/* Note actions bar */}
            <div style={{padding:"6px 24px",borderBottom:`1px solid rgba(${T.accentRgb},0.08)`,display:"flex",gap:2,alignItems:"center"}}>
              <span style={{fontSize:12,color:T.faint,flex:1}}>{eBlocks.length} block{eBlocks.length!==1?"s":""}</span>
              <button onClick={()=>toggleStar(sel.id)} className="glass-btn note-action-btn" style={{background:sel.starred?`rgba(${T.accentRgb},0.06)`:"transparent",border:sel.starred?`1px solid rgba(${T.accentRgb},0.1)`:"1px solid transparent",color:sel.starred?T.warn:T.faint,cursor:"pointer",padding:"5px 7px",borderRadius:7,display:"flex",alignItems:"center"}}>
                {sel.starred?<IC.StarF/>:<IC.Star/>}
              </button>
              <button onClick={()=>archiveNote(sel.id)} className="glass-btn note-action-btn" style={{background:"transparent",border:"1px solid transparent",color:T.faint,cursor:"pointer",padding:"5px 7px",borderRadius:7,display:"flex"}} title="Archive"><IC.Archive/></button>
              <button onClick={()=>{if(sel.deleted)setDelConfirm(sel.id);else deleteNote(sel.id)}} className="glass-btn note-action-btn" style={{background:"transparent",border:"1px solid transparent",color:T.faint,cursor:"pointer",padding:"5px 7px",borderRadius:7,display:"flex"}} title="Delete"><IC.Trash/></button>
              <button onClick={()=>{setShowHistory(!showHistory);setHistoryPreview(null)}} className="glass-btn note-action-btn" style={{background:showHistory?`rgba(${T.accentRgb},0.06)`:"transparent",border:showHistory?`1px solid rgba(${T.accentRgb},0.1)`:"1px solid transparent",color:showHistory?T.accent:T.faint,cursor:"pointer",padding:"5px 7px",borderRadius:7,display:"flex",alignItems:"center",gap:4}} title="Revision History">
                <IC.History/>{(sel.revisions?.length||0)>0&&<span style={{fontSize:10,fontWeight:600}}>{sel.revisions.length}</span>}
              </button>
            </div>

            {/* Block-based content */}
            <div style={{flex:1,overflow:"auto",padding:"12px 24px"}}>
              {eBlocks.map((block,bi)=>{
                const nt=NOTE_TYPES.find(x=>x.id===block.type);
                return<div key={block.id} style={{marginBottom:12}}>
                  {/* Block header */}
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,padding:"2px 0"}}>
                    <span style={{color:T.accent,display:"flex",opacity:.6}}>{nt?<nt.Ic/>:<IC.Note/>}</span>
                    <span style={{fontSize:11,color:T.faint,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",flex:1}}>{nt?.name||"Block"}</span>
                    {eBlocks.length>1&&<button onClick={()=>removeBlock(block.id)} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,opacity:.3,display:"flex",transition:"opacity 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".3"}><IC.X/></button>}
                  </div>

                  {/* RICH TEXT block */}
                  {block.type==="richtext"&&<>
                    <div style={{display:"flex",gap:2,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                      <select defaultValue="" onChange={e=>{if(!e.target.value)return;document.execCommand("formatBlock",false,e.target.value);e.target.value=""}} onMouseDown={e=>e.preventDefault()} style={{padding:"3px 5px",borderRadius:5,fontSize:11,background:T.surf,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                        <option value="">Normal</option><option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option>
                      </select>
                      {[{cmd:"bold",Ic:IC.Bold},{cmd:"italic",Ic:IC.Italic},{cmd:"underline",Ic:IC.Underline},{cmd:"strikeThrough",Ic:IC.Strike}].map(b=>(
                        <button key={b.cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(b.cmd)}} style={{background:"transparent",border:"none",color:T.faint,cursor:"pointer",padding:"3px 5px",borderRadius:5,display:"flex",alignItems:"center"}}><b.Ic/></button>
                      ))}
                      <div style={{width:1,height:16,background:T.bdr}}/>
                      <button onMouseDown={e=>{e.preventDefault();document.execCommand("hiliteColor",false,"rgba("+T.accentRgb+",0.25)")}} style={{background:"transparent",border:"none",color:T.faint,cursor:"pointer",padding:"3px 5px",borderRadius:5,display:"flex"}}><IC.Highlight/></button>
                      {[{cmd:"insertUnorderedList",Ic:IC.ListBul},{cmd:"insertOrderedList",Ic:IC.ListNum}].map(b=>(
                        <button key={b.cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(b.cmd)}} style={{background:"transparent",border:"none",color:T.faint,cursor:"pointer",padding:"3px 5px",borderRadius:5,display:"flex"}}><b.Ic/></button>
                      ))}
                      <div style={{width:1,height:16,background:T.bdr}}/>
                      <button onMouseDown={e=>{e.preventDefault();document.execCommand("formatBlock",false,"blockquote")}} style={{background:"transparent",border:"none",color:T.faint,cursor:"pointer",padding:"3px 5px",borderRadius:5,display:"flex"}}><IC.Quote/></button>
                      <button onMouseDown={e=>{e.preventDefault();document.execCommand("formatBlock",false,"pre")}} style={{background:"transparent",border:"none",color:T.faint,cursor:"pointer",padding:"3px 5px",borderRadius:5,display:"flex"}}><IC.CodeBlock/></button>
                      {[{cmd:"subscript",Ic:IC.Sub},{cmd:"superscript",Ic:IC.Sup}].map(b=>(
                        <button key={b.cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(b.cmd)}} style={{background:"transparent",border:"none",color:T.faint,cursor:"pointer",padding:"3px 5px",borderRadius:5,display:"flex"}}><b.Ic/></button>
                      ))}
                      <button onMouseDown={e=>{e.preventDefault();document.execCommand("removeFormat")}} style={{background:"transparent",border:"none",color:T.faint,cursor:"pointer",padding:"3px 5px",borderRadius:5,display:"flex"}}><IC.Eraser/></button>
                    </div>
                    <div ref={el=>{if(el)ceRefs.current[block.id]=el}} className="nc-editor" contentEditable suppressContentEditableWarning
                      data-placeholder="Start writing..."
                      onInput={()=>{if(ceRefs.current[block.id])updateBlock(block.id,ceRefs.current[block.id].innerHTML)}}
                      onBlur={flushSave}
                      style={{minHeight:60,color:T.dark?"rgba(226,232,240,.9)":"rgba(26,26,26,.9)",fontSize:15,lineHeight:1.8,fontFamily:`${F.mono},'Courier New',monospace`,padding:8,borderRadius:8,border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)"}}/>
                  </>}

                  {/* PLAIN TEXT block */}
                  {block.type==="plaintext"&&<textarea value={block.content} onChange={e=>updateBlock(block.id,e.target.value)} onBlur={flushSave} placeholder="Start writing..."
                    style={{width:"100%",minHeight:80,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)",border:`1px solid rgba(${T.accentRgb},0.06)`,borderRadius:8,outline:"none",color:T.dark?"rgba(226,232,240,.9)":"rgba(26,26,26,.9)",fontSize:15,lineHeight:1.8,fontFamily:`${F.mono},'Courier New',monospace`,resize:"vertical",padding:8,boxSizing:"border-box"}}/>}

                  {/* CODE block */}
                  {block.type==="code"&&<textarea value={block.content} onChange={e=>updateBlock(block.id,e.target.value)} onBlur={flushSave} placeholder="// Write your code here..." spellCheck={false}
                    onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();const s=e.target.selectionStart;const end=e.target.selectionEnd;const v=block.content;updateBlock(block.id,v.substring(0,s)+"  "+v.substring(end));setTimeout(()=>{e.target.selectionStart=e.target.selectionEnd=s+2},0)}}}
                    style={{width:"100%",minHeight:80,background:T.dark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.03)",border:`1px solid rgba(${T.accentRgb},0.08)`,borderRadius:8,outline:"none",color:T.dark?"#a5f3c4":"#1a1a1a",fontSize:14,lineHeight:1.7,fontFamily:`${F.mono},'Courier New',monospace`,resize:"vertical",padding:12,boxSizing:"border-box",tabSize:2,whiteSpace:"pre"}}/>}

                  {/* CHECKLIST block */}
                  {block.type==="checklist"&&(()=>{
                    let items=[];try{items=JSON.parse(block.content||"[]")}catch{items=[]}
                    const upItems=(ni)=>{updateBlock(block.id,JSON.stringify(ni))};
                    return<div style={{display:"flex",flexDirection:"column",gap:2,padding:4,borderRadius:8,border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)"}}>
                      {items.map((item,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 4px",borderRadius:6,background:item.done?`rgba(${T.accentRgb},0.04)`:"transparent"}}>
                          <input type="checkbox" checked={item.done} onChange={()=>{const n=[...items];n[i]={...n[i],done:!n[i].done};upItems(n)}}
                            style={{width:18,height:18,accentColor:T.accent,cursor:"pointer",flexShrink:0}}/>
                          <input value={item.text} onChange={e=>{const n=[...items];n[i]={...n[i],text:e.target.value};upItems(n)}}
                            onKeyDown={e=>{
                              if(e.key==="Enter"){e.preventDefault();const n=[...items];n.splice(i+1,0,{text:"",done:false});upItems(n);setTimeout(()=>{const inputs=e.target.parentElement.parentElement.querySelectorAll("input[type=text]");inputs[i+1]?.focus()},0)}
                              if(e.key==="Backspace"&&!item.text&&items.length>1){e.preventDefault();const n=[...items];n.splice(i,1);upItems(n);setTimeout(()=>{const inputs=e.target.parentElement.parentElement.querySelectorAll("input[type=text]");inputs[Math.max(0,i-1)]?.focus()},0)}
                            }}
                            onBlur={flushSave} type="text" placeholder="Type an item..."
                            style={{flex:1,background:"none",border:"none",outline:"none",color:item.done?T.faint:T.text,fontSize:15,lineHeight:1.8,fontFamily:`${F.body},sans-serif`,textDecoration:item.done?"line-through":"none",opacity:item.done?.6:1,padding:0}}/>
                          <button onClick={()=>{const n=[...items];n.splice(i,1);upItems(n.length?n:[{text:"",done:false}])}}
                            style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,opacity:.3,display:"flex"}}
                            onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".3"}><IC.X/></button>
                        </div>
                      ))}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2,padding:"2px 4px"}}>
                        <button onClick={()=>upItems([...items,{text:"",done:false}])} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,padding:0,opacity:.6}}><IC.Plus s={13}/>Add item</button>
                        {items.length>0&&<span style={{fontSize:11,color:T.faint}}>{items.filter(x=>x.done).length}/{items.length} done</span>}
                      </div>
                    </div>
                  })()}

                  {/* MARKDOWN block */}
                  {block.type==="markdown"&&<div style={{display:"flex",gap:0,minHeight:80,border:`1px solid rgba(${T.accentRgb},0.06)`,borderRadius:8,overflow:"hidden",background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)"}}>
                    <textarea value={block.content} onChange={e=>updateBlock(block.id,e.target.value)} onBlur={flushSave} placeholder="# Write Markdown here..."
                      style={{flex:1,background:"none",border:"none",borderRight:`1px solid rgba(${T.accentRgb},0.08)`,outline:"none",color:T.dark?"rgba(226,232,240,.9)":"rgba(26,26,26,.9)",fontSize:14,lineHeight:1.8,fontFamily:`${F.mono},monospace`,resize:"none",padding:8,boxSizing:"border-box"}}/>
                    <div className="nc-editor" style={{flex:1,padding:8,fontSize:14,lineHeight:1.8,fontFamily:`${F.body},sans-serif`,color:T.dark?"rgba(226,232,240,.9)":"rgba(26,26,26,.9)",overflowY:"auto"}}
                      dangerouslySetInnerHTML={{__html:(()=>{
                        let md=block.content||"";
                        md=md.replace(/^### (.+)$/gm,"<h3>$1</h3>");md=md.replace(/^## (.+)$/gm,"<h2>$1</h2>");md=md.replace(/^# (.+)$/gm,"<h1>$1</h1>");
                        md=md.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");md=md.replace(/\*(.+?)\*/g,"<em>$1</em>");
                        md=md.replace(/~~(.+?)~~/g,"<del>$1</del>");md=md.replace(/`([^`]+)`/g,"<code>$1</code>");
                        md=md.replace(/^- (.+)$/gm,"<li>$1</li>");md=md.replace(/(<li>.*<\/li>)/gs,"<ul>$1</ul>");md=md.replace(/<\/ul>\s*<ul>/g,"");
                        md=md.replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>");
                        md=md.replace(/\n\n/g,"<br/><br/>");md=md.replace(/\n/g,"<br/>");
                        return md||'<span style="color:'+T.faint+';font-style:italic">Preview</span>'
                      })()}}/>
                  </div>}
                </div>
              })}

              {/* Add block bar */}
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"8px 0",marginTop:4}}>
                <div style={{flex:1,height:1,background:`rgba(${T.accentRgb},0.1)`}}/>
                <span style={{fontSize:10,color:T.faint,fontWeight:600,letterSpacing:1}}>ADD BLOCK</span>
                <div style={{flex:1,height:1,background:`rgba(${T.accentRgb},0.1)`}}/>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {NOTE_TYPES.map(nt=>(
                  <button key={nt.id} onClick={()=>addBlock(nt.id)} className="glass-btn"
                    style={{padding:"6px 12px",borderRadius:7,cursor:"pointer",border:`1px solid rgba(${T.accentRgb},0.1)`,background:T.dark?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.3)",color:T.dim,fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,transition:"all 0.3s"}}>
                    <span style={{color:T.accent,display:"flex"}}><nt.Ic/></span>{nt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div style={{padding:"8px 24px",borderTop:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",gap:10,fontSize:11,color:T.faint}}>
              <span>{fmtFull(sel.modified)}</span><span>·</span>
              <span>{blocksText(eBlocks).length} chars</span><span>·</span>
              <span>{blocksText(eBlocks).split(/\s+/).filter(Boolean).length} words</span>
              <div style={{flex:1}}/>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:T.ok,boxShadow:`0 0 3px ${T.ok}`}}/>
                <span>Encrypted</span>
              </div>
            </div>
          </>
        ):(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
            <div style={{color:`rgba(${T.accentRgb},.2)`}}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            </div>
            <span style={{color:T.faint,fontSize:15}}>Select or create a note</span>
            <button onClick={()=>setShowTypePicker(true)} className="glass-btn" style={{marginTop:8,padding:"10px 24px",background:`rgba(${T.accentRgb},.06)`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.accentRgb},.15)`,borderRadius:10,color:T.accent,fontSize:14,fontWeight:600,fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.3s",boxShadow:`0 2px 10px rgba(${T.accentRgb},0.08)`,animation:"btnFloat 3s ease-in-out infinite, btnPulseGlow 4s ease-in-out infinite"}}>
              <IC.Plus s={16}/>New Note
            </button>
          </div>
        )}
      </div>

      {/* ══════ REVISION HISTORY PANEL ══════ */}
      {showHistory&&sel&&<div style={{width:320,minWidth:320,height:"100%",background:T.dark?"rgba(10,10,15,0.95)":"rgba(255,255,255,0.95)",backdropFilter:"blur(16px)",borderLeft:`1px solid rgba(${T.accentRgb},0.12)`,display:"flex",flexDirection:"column",animation:"slideIn 0.2s ease-out"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",gap:8}}>
          <IC.History/><span style={{fontSize:15,fontWeight:700,flex:1,color:T.text}}>Revision History</span>
          <button onClick={()=>{setShowHistory(false);setHistoryPreview(null)}} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}}><IC.X/></button>
        </div>
        {historyPreview?<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>setHistoryPreview(null)} style={{background:"none",border:"none",color:T.accent,cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:0}}>Back</button>
            <span style={{fontSize:12,color:T.faint,flex:1}}>{fmtFull(historyPreview.ts)}</span>
            <button onClick={()=>{setETitle(historyPreview.title);setEBlocks(historyPreview.blocks);setTimeout(()=>{historyPreview.blocks.forEach(b=>{if(b.type==="richtext"&&ceRefs.current[b.id])ceRefs.current[b.id].innerHTML=plainToHtml(b.content)})},0);setHistoryPreview(null);setShowHistory(false);flushSave()}} className="glass-btn" style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,background:`rgba(${T.accentRgb},0.08)`,border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",transition:"all 0.3s"}}>Restore</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
            <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>{historyPreview.title}</div>
            {historyPreview.blocks.map(b=><div key={b.id} style={{marginBottom:8,padding:8,borderRadius:6,border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.4)"}}>
              <div style={{fontSize:10,color:T.faint,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>{b.type}</div>
              {b.type==="checklist"?(()=>{try{const items=JSON.parse(b.content||"[]");return items.map((x,i)=><div key={i} style={{fontSize:13,color:x.done?T.faint:T.dim,textDecoration:x.done?"line-through":"none"}}>{x.done?"✓":"○"} {x.text}</div>)}catch{return<span style={{color:T.faint,fontSize:13}}>Empty</span>}})()
              :<div style={{fontSize:13,color:T.dim,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:b.content||"<em style='color:"+T.faint+"'>Empty</em>"}}/>}
            </div>)}
          </div>
        </div>
        :<div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          {(!sel.revisions||sel.revisions.length===0)?<div style={{padding:24,textAlign:"center",color:T.faint,fontSize:13}}>No revisions yet. Revisions are created automatically as you edit.</div>
          :[...sel.revisions].reverse().map(rev=>(
            <div key={rev.id} style={{padding:"10px 16px",borderBottom:`1px solid rgba(${T.accentRgb},0.06)`,cursor:"pointer",transition:"background 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfH} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <IC.Clock/><span style={{fontSize:12,color:T.dim,flex:1}}>{fmtFull(rev.ts)}</span>
              </div>
              <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rev.title}</div>
              <div style={{fontSize:11,color:T.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>{rev.blocks?blocksText(rev.blocks).substring(0,80)||"Empty":"Empty"}</div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setHistoryPreview(rev)} className="glass-btn" style={{padding:"3px 10px",borderRadius:5,fontSize:11,background:`rgba(${T.accentRgb},0.05)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",transition:"all 0.3s"}}>Preview</button>
                <button onClick={()=>{setETitle(rev.title);setEBlocks(rev.blocks);setTimeout(()=>{rev.blocks.forEach(b=>{if(b.type==="richtext"&&ceRefs.current[b.id])ceRefs.current[b.id].innerHTML=plainToHtml(b.content)})},0);setShowHistory(false);setHistoryPreview(null);flushSave()}} className="glass-btn" style={{padding:"3px 10px",borderRadius:5,fontSize:11,background:`rgba(${T.accentRgb},0.05)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",transition:"all 0.3s"}}>Restore</button>
              </div>
            </div>
          ))}
        </div>}
      </div>}
    </div>
  );
}
