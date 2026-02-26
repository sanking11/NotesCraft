import React,{ useState, useEffect, useRef, useCallback, useMemo } from "react";
import zxcvbn from "zxcvbn";
import { generateSalt, deriveKey, hashPassword, exportKey, importKey, generateTOTPSecret, verifyTOTP, generateTOTP, getTOTPRemaining, generateRecoveryCodes } from "./crypto.js";
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
  TagOff:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/><line x1="2" y1="2" x2="22" y2="22"/></svg>,
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
  Flag:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Repeat:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  Chart:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Paperclip:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
  Download:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  PriUrgent:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" strokeWidth="1.5"/></svg>,
  PriImportant:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  PriMedium:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="5"/></svg>,
  PriLow:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Settings:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Danger:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

/* Butterfly logo — geometric origami, exact match to reference */
const ShieldLogo=({s=60,accentRgb,accent,accent2,text,warn,pulse,uid})=>{
  const id=uid||'sh';const a2=accent2||accent;
  return<svg width={s} height={s*1.1} viewBox="0 0 200 220" fill="none" draggable={false} onContextMenu={e=>e.preventDefault()} style={{overflow:'visible',userSelect:'none',WebkitUserDrag:'none',msUserSelect:'none'}}>
    <defs>
      <linearGradient id={`${id}SG`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={accent}/><stop offset="50%" stopColor={a2}/><stop offset="100%" stopColor={a2}/></linearGradient>
      <linearGradient id={`${id}SF`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={accent} stopOpacity="0.14"/><stop offset="100%" stopColor={a2} stopOpacity="0.04"/></linearGradient>
      <filter id={`${id}Gl`}><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id={`${id}GlS`}><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <style>{`@keyframes ${id}D{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-600}}@keyframes ${id}N{0%,100%{opacity:.35}50%{opacity:1}}@keyframes ${id}S{0%,60%{transform:translateY(0) rotate(0)}70%,90%{transform:translateY(-6px) rotate(-15deg)}100%{transform:translateY(0) rotate(0)}}@keyframes ${id}R{0%{r:18;opacity:.45}100%{r:36;opacity:0}}@keyframes ${id}B{0%,60%{fill:rgba(${accentRgb},0.18)}70%,90%{fill:rgba(${accentRgb},0.3)}100%{fill:rgba(${accentRgb},0.18)}}`}</style>
    <path d="M100 12 L34 46 L34 122 C34 162 62 184 100 200 C138 184 166 162 166 122 L166 46 Z" fill="none" stroke={`rgba(${accentRgb},0.3)`} strokeWidth="3" strokeDasharray="12 8" style={{animation:`${id}D 8s linear infinite`}}/>
    <path d="M100 24 L44 54 L44 118 C44 154 68 176 100 190 C132 176 156 154 156 118 L156 54 Z" fill={`url(#${id}SF)`} stroke={`url(#${id}SG)`} strokeWidth="5" strokeLinejoin="round"/>
    <g stroke={accent} strokeWidth="2.5" opacity="0.5">
      <line x1="62" y1="72" x2="82" y2="72"/><line x1="118" y1="72" x2="138" y2="72"/>
      <line x1="58" y1="105" x2="78" y2="105"/><line x1="122" y1="105" x2="146" y2="105"/>
      <line x1="64" y1="140" x2="82" y2="140"/><line x1="118" y1="140" x2="138" y2="140"/>
      <line x1="72" y1="72" x2="72" y2="105"/><line x1="128" y1="72" x2="128" y2="105"/>
    </g>
    <g fill={accent} filter={`url(#${id}GlS)`}>
      {[[62,72,0],[138,72,.3],[58,105,.6],[146,105,.9],[64,140,.2],[138,140,.5],[72,88,.4],[128,88,.7]].map(([cx,cy,d],i)=><circle key={i} cx={cx} cy={cy} r={i<6?4.5:4} style={{animation:`${id}N 1.8s ease-in-out ${d}s infinite`}}/>)}
    </g>
    <circle cx="100" cy="108" r="18" fill="none" stroke={accent} strokeWidth="1.5" style={{animation:`${id}R 4s ease-out infinite`}}/>
    <circle cx="100" cy="108" r="18" fill="none" stroke={accent} strokeWidth="1.5" style={{animation:`${id}R 4s ease-out 2s infinite`}}/>
    <g filter={`url(#${id}Gl)`}>
      <rect x="80" y="100" width="40" height="30" rx="6" stroke={`url(#${id}SG)`} strokeWidth="4" style={{animation:`${id}B 4s ease-in-out infinite`}}/>
      <path d="M88 100 L88 84 C88 74 93 68 100 68 C107 68 112 74 112 84 L112 100" fill="none" stroke={`url(#${id}SG)`} strokeWidth="5" strokeLinecap="round" style={{transformOrigin:'100px 86px',animation:`${id}S 4s ease-in-out infinite`}}/>
      <circle cx="100" cy="113" r="5" fill={accent}/><rect x="97.5" y="117" width="5" height="7" rx="1.5" fill={accent}/>
    </g>
  </svg>;
};
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
   STORAGE — encrypted via AES-256-GCM + sync via relay server
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
const PRIORITIES=[{id:"urgent",label:"Urgent",color:"#ef4444",Ic:IC.PriUrgent},{id:"important",label:"Important",color:"#f59e0b",Ic:IC.PriImportant},{id:"medium",label:"Medium",color:"#22c55e",Ic:IC.PriMedium},{id:"low",label:"Low",color:"#6b7280",Ic:IC.PriLow}];
const REPEAT_OPTIONS=[{id:"none",label:"Does not repeat"},{id:"daily",label:"Daily"},{id:"weekdays",label:"Weekdays"},{id:"weekly",label:"Weekly"},{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly"},{id:"custom",label:"Custom"}];
const DEF_TAGS = ["In Progress","Planned","Completed","Urgent","Review","Ideas"];
const DEF_NOTES = [
  {id:"w1",title:"Welcome to NotesCraft ✨",blocks:[{id:"b1",type:"richtext",content:"Your encrypted workspace is ready!\n\n• Create notes with tags and folders\n• Switch between 15 beautiful themes\n• Data syncs across all your devices\n• Everything stored securely\n\nHit the + button to create your first note."}],tags:["Ideas"],folder:"Getting Started",starred:true,archived:false,deleted:false,modified:new Date().toISOString(),created:new Date().toISOString()},
  {id:"w2",title:"Project Planning",blocks:[{id:"b2",type:"richtext",content:"Q1 Goals:\n- Finalize design system\n- Ship v2.0 dashboard\n- Hire 2 engineers"},{id:"b2b",type:"checklist",content:JSON.stringify([{text:"User retention rate",done:false},{text:"Time to first value",done:false},{text:"NPS improvements",done:true}])}],tags:["In Progress","Review"],folder:"Work",starred:false,archived:false,deleted:false,modified:new Date(Date.now()-3600000).toISOString(),created:new Date(Date.now()-86400000).toISOString()},
  {id:"w3",title:"Reading List",blocks:[{id:"b3",type:"checklist",content:JSON.stringify([{text:"Designing Data-Intensive Applications",done:false},{text:"The Pragmatic Programmer",done:true},{text:"Atomic Habits",done:false},{text:"React Server Components deep dive",done:false},{text:"WebAssembly beyond the browser",done:false}])}],tags:["Planned","Ideas"],folder:"Personal",starred:true,archived:false,deleted:false,modified:new Date(Date.now()-14400000).toISOString(),created:new Date(Date.now()-259200000).toISOString()},
];

/* ═══════════ PASSWORD POLICY ═══════════ */
const BANNED_PW=new Set(["password","123456","12345678","123456789","1234567890","qwerty","abc123","password1","iloveyou","sunshine","princess","football","charlie","shadow","michael","master","jennifer","trustno1","batman","access","hello","monkey","dragon","letmein","696969","baseball","welcome","login","admin","passw0rd","starwars","solo","qwerty123","password123","123123","111111","000000","654321","qwertyuiop","lovely","7777777","888888","changeme","computer","whatever","p@ssw0rd","zaq1zaq1","qazwsx","1qaz2wsx","!@#$%^&*","password!","secret","god","love","sex","test","default","passwd","system","internet","service","server","canada","hello123","matrix","soccer","dallas","killer","trustme","jordan","amanda","hunter","buster","thomas","robert","summer","george","harley","222222","andrea","joshua","freedom","thunder","corvette","austin","1111","merlin","ginger","hammer","silver"]);

const PW_WORDS=["crystal","thunder","velvet","meadow","falcon","copper","silver","harbor","dragon","forest","castle","shadow","arctic","violet","breeze","mystic","canyon","golden","marble","ember","summit","willow","orchid","stellar","phoenix","cobalt","zenith","aurora","citrus","blazer","nimble","coral","prism","drift","spark","lunar","rogue","quest","frost","blaze","tiger","cedar","ocean","delta","pixel","flare","ivory","onyx","sage","dusk","ripple","vortex","beacon","cinder","mosaic","glacier","tempest","nectar","quartz","scarlet","trophy","mirage","anchor","sphinx","voyage","rumble","pebble","atlas","comet","sentry","marvel","gravel","zenith","tundra","cipher","gadget","plume","rhythm","torque","vivid","magnet","nexus","alpine","riddle","saffron","lantern","jasper","bolted","vertex","garnet","whisper","nebula","dagger","eclipse","tropic","warden","zephyr","radiant","basalt","condor","ember"];

/** Crypto-secure random int in [0, max) */
function secRand(max){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max}

const _prevHashes=new Set();
async function _hashPw(pw){const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pw));return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function generateStrongPw(){
  const cap=s=>s[0].toUpperCase()+s.slice(1);
  const syms="!@#$%&*?";
  const i1=secRand(PW_WORDS.length);
  let i2;do{i2=secRand(PW_WORDS.length)}while(i2===i1);
  let i3;do{i3=secRand(PW_WORDS.length)}while(i3===i1||i3===i2);
  const num=secRand(90)+10;
  const sym=syms[secRand(syms.length)];
  const pw=cap(PW_WORDS[i1])+cap(PW_WORDS[i2])+cap(PW_WORDS[i3])+num+sym;
  _hashPw(pw).then(h=>{_prevHashes.add(h);if(_prevHashes.size>500)_prevHashes.clear()});
  return pw;
}

/* ═══════════ PASSWORD GENERATOR PAGE LOGIC ═══════════ */
function generateRandomPw(len,upper,lower,digits,symbols,noAmbig){
  let chars="";
  const UP="ABCDEFGHIJKLMNOPQRSTUVWXYZ",LO="abcdefghijklmnopqrstuvwxyz",DG="0123456789",SY="!@#$%^&*()-_=+[]{}|;:,.<>?";
  const AMBIG="0O1lI|";
  const rm=s=>noAmbig?s.split("").filter(c=>!AMBIG.includes(c)).join(""):s;
  if(upper)chars+=rm(UP);if(lower)chars+=rm(LO);if(digits)chars+=rm(DG);if(symbols)chars+=rm(SY);
  if(!chars)chars=rm(LO)||LO;
  const arr=[];
  // Ensure at least one from each selected category
  if(upper&&rm(UP))arr.push(rm(UP)[secRand(rm(UP).length)]);
  if(lower&&rm(LO))arr.push(rm(LO)[secRand(rm(LO).length)]);
  if(digits&&rm(DG))arr.push(rm(DG)[secRand(rm(DG).length)]);
  if(symbols&&rm(SY))arr.push(rm(SY)[secRand(rm(SY).length)]);
  while(arr.length<len)arr.push(chars[secRand(chars.length)]);
  // Shuffle using Fisher-Yates with crypto random
  for(let i=arr.length-1;i>0;i--){const j=secRand(i+1);[arr[i],arr[j]]=[arr[j],arr[i]]}
  const pw=arr.join("");
  _hashPw(pw).then(h=>{_prevHashes.add(h);if(_prevHashes.size>500)_prevHashes.clear()});
  return pw;
}

const SEP_MAP={hyphens:"-",spaces:" ",periods:".",commas:",",underscores:"_",numbers:()=>String(secRand(10)),numbersSymbols:()=>{const cs="0123456789!@#$%&*?";return cs[secRand(cs.length)]}};
function validateCustomWords(wordsStr){
  const words=wordsStr.split(/[\s,;]+/).filter(w=>w.length>0);
  for(const w of words){
    const lo=w.toLowerCase();
    if(COMMON_WORDS.includes(lo))return`"${w}" is a common password — choose a different word`;
    if(hasSequential(lo,3))return`"${w}" contains sequential characters (abc, 123…)`;
    if(hasRepeating(lo,3))return`"${w}" contains repeated characters`;
    if(lo.length<2)return`"${w}" is too short — use at least 2 characters`;
  }
  return"";
}
function generateMemorablePw(wordCount,addDigit,addSymbol,sepKey="hyphens",customWordsStr=""){
  const cap=s=>s[0].toUpperCase()+s.slice(1);
  const custom=customWordsStr.split(/[\s,;]+/).filter(w=>w.length>0).map(w=>cap(w.toLowerCase()));
  const need=Math.max(0,wordCount-custom.length);
  const used=new Set();const rWords=[];
  while(rWords.length<need){const idx=secRand(PW_WORDS.length);if(!used.has(idx)){used.add(idx);rWords.push(cap(PW_WORDS[idx]))}}
  const all=[...custom,...rWords];
  for(let i=all.length-1;i>0;i--){const j=secRand(i+1);[all[i],all[j]]=[all[j],all[i]]}
  const sepVal=SEP_MAP[sepKey];
  let pw=typeof sepVal==="function"?all.reduce((a,w,i)=>i===0?w:a+sepVal()+w,""):all.join(sepVal);
  if(addDigit)pw+=secRand(90)+10;
  if(addSymbol){const sy="!@#$%&*?";pw+=sy[secRand(sy.length)]}
  _hashPw(pw).then(h=>{_prevHashes.add(h);if(_prevHashes.size>500)_prevHashes.clear()});
  return pw;
}

function calcPwStrength(pw){
  if(!pw)return{label:"",color:"#666",percent:0,time:"",qTime:"",qColor:"#666",bits:0,qBits:0,qResist:false};
  // For long passwords, skip zxcvbn (it freezes on 100+ chars) — calculate entropy from charset
  let entropy;
  if(pw.length>100){
    let pool=0;
    if(/[a-z]/.test(pw))pool+=26;if(/[A-Z]/.test(pw))pool+=26;if(/[0-9]/.test(pw))pool+=10;if(/[^A-Za-z0-9]/.test(pw))pool+=32;
    entropy=pw.length*Math.log2(pool||1);
  }else{
    const z=zxcvbn(pw);
    entropy=Math.log2(z.guesses||1);
  }
  const fmtTime=s=>{
    if(s<1)return"Instantly";if(s<60)return Math.round(s)+" seconds";if(s<3600)return Math.round(s/60)+" minutes";if(s<86400)return Math.round(s/3600)+" hours";if(s<31536000)return Math.round(s/86400)+" days";
    const y=s/31536000;if(!isFinite(y))return"∞ years";
    const names=[[1e33,"decillion"],[1e30,"nonillion"],[1e27,"octillion"],[1e24,"septillion"],[1e21,"sextillion"],[1e18,"quintillion"],[1e15,"quadrillion"],[1e12,"trillion"],[1e9,"billion"],[1e6,"million"],[1e3,"thousand"]];
    for(const[v,n]of names){if(y>=v){const r=y/v;if(!isFinite(r))return"∞ years";if(r>=1e6)return r.toExponential(2)+" "+n+" years";return(r>=1e3?Math.round(r).toLocaleString():r>=100?Math.round(r).toLocaleString():r.toFixed(1).replace(/\.0$/,""))+" "+n+" years"}}
    return Math.round(y).toLocaleString()+" years";
  };
  const secs=Math.pow(2,entropy)/1e9;// 10^9 attempts/sec (modern GPU)
  const qEffBits=entropy/2;// Grover's halves entropy
  const qSecs=Math.pow(2,qEffBits)/1e7;// 10^7 Grover iterations/sec (optimistic future quantum)
  const time=fmtTime(secs);
  const qTime=fmtTime(qSecs);
  const bits=+entropy.toFixed(1);
  const qBits=+(qEffBits).toFixed(1);
  const qResist=qEffBits>=64;
  const qColor=qSecs<1?"#ef4444":qSecs<86400?"#ef4444":qSecs<31536000?"#f59e0b":qSecs<31536000*1e3?"#f59e0b":qSecs<31536000*1e6?"#22c55e":"#10b981";
  if(entropy<40)return{label:"Weak",color:"#ef4444",percent:20,time,qTime,qColor,bits,qBits,qResist};
  if(entropy<60)return{label:"Fair",color:"#f59e0b",percent:45,time,qTime,qColor,bits,qBits,qResist};
  if(entropy<80)return{label:"Strong",color:"#22c55e",percent:72,time,qTime,qColor,bits,qBits,qResist};
  return{label:"Very Strong",color:"#10b981",percent:100,time,qTime,qColor,bits,qBits,qResist};
}

const COMMON_WORDS=["password","letmein","welcome","monkey","dragon","master","qwerty","login","admin","princess","football","shadow","sunshine","trustno","access","hello","charlie","donald","batman","michael","jennifer","jordan","thomas","robert","daniel","andrew","joshua","james","john","david","secret","love","pass","test","user","guest","default","changeme","computer","internet","server","canada"];
function hasSequential(p,n=4){const s=p.toLowerCase();for(let i=0;i<=s.length-n;i++){let asc=true,desc=true;for(let j=1;j<n;j++){if(s.charCodeAt(i+j)!==s.charCodeAt(i)+j)asc=false;if(s.charCodeAt(i+j)!==s.charCodeAt(i)-j)desc=false}if(asc||desc)return true}return false}
function hasRepeating(p,n=3){for(let i=0;i<=p.length-n;i++){if(p.slice(i,i+n).split("").every(c=>c===p[i]))return true}return false}
function hasCommonWord(p){const lo=p.toLowerCase();return COMMON_WORDS.some(w=>lo.includes(w))}
function analyzePw(p){
  const checks=[];
  const len=p.length;
  if(len>=14)checks.push({label:"14+ characters",ok:true});
  else if(len>=12)checks.push({label:"12+ characters",ok:true});
  else checks.push({label:`${len}/12 characters`,ok:false});
  checks.push({label:"Uppercase letter",ok:/[A-Z]/.test(p)});
  checks.push({label:"Lowercase letter",ok:/[a-z]/.test(p)});
  checks.push({label:"Number",ok:/[0-9]/.test(p)});
  checks.push({label:"Symbol (!@#$…)",ok:/[^A-Za-z0-9]/.test(p)});
  const isBanned=BANNED_PW.has(p.toLowerCase());
  const hasSeq=hasSequential(p);
  const hasRep=hasRepeating(p);
  const hasWord=hasCommonWord(p);
  if(isBanned)checks.push({label:"Not a common password",ok:false});
  if(hasSeq)checks.push({label:"No sequential chars (1234, abcd)",ok:false});
  if(hasRep)checks.push({label:"No repeated chars (aaa, 111)",ok:false});
  if(hasWord)checks.push({label:"No common words (password, admin…)",ok:false});
  // Score: 0-5
  let score=0;
  if(len>=12)score++;
  if(len>=16)score++;
  if(/[A-Z]/.test(p)&&/[a-z]/.test(p))score++;
  if(/[0-9]/.test(p))score++;
  if(/[^A-Za-z0-9]/.test(p))score++;
  if(isBanned)score=0;
  if(hasSeq||hasRep)score=Math.min(score,2);
  if(hasWord)score=Math.min(score,2);
  if(len<12)score=Math.min(score,1);
  const labels=["Very Weak","Weak","Fair","Good","Strong","Very Strong"];
  const colors=["#ef4444","#f97316","#eab308","#22c55e","#10b981","#06b6d4"];
  return{checks,score,label:labels[score],color:colors[score]};
}

async function checkHIBP(p){
  try{
    const enc=new TextEncoder();
    const buf=await crypto.subtle.digest("SHA-1",enc.encode(p));
    const hex=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
    const prefix=hex.slice(0,5),suffix=hex.slice(5);
    const res=await fetch("https://api.pwnedpasswords.com/range/"+prefix);
    if(!res.ok)return{breached:false,count:0};
    const txt=await res.text();
    const line=txt.split("\n").find(l=>l.startsWith(suffix));
    if(!line)return{breached:false,count:0};
    return{breached:true,count:parseInt(line.split(":")[1])};
  }catch{return{breached:false,count:0}}
}

/* ═══════════ FLIP CARD ═══════════ */
function NeoFlipCard({w,h,rgb,x,y,r,f,d,dl,title,plain,enc,opacity=1,delay=0}){
  const[flipped,setFlipped]=React.useState(false);
  const timerRef=React.useRef(null);
  React.useEffect(()=>{
    let alive=true;
    const schedule=()=>{timerRef.current=setTimeout(()=>{if(!alive)return;setFlipped(v=>!v);schedule()},3000+Math.random()*5000)};
    timerRef.current=setTimeout(()=>{if(!alive)return;setFlipped(v=>!v);schedule()},delay+1000+Math.random()*4000);
    return()=>{alive=false;clearTimeout(timerRef.current)};
  },[]);
  return(
    <div style={{position:"absolute",left:x,top:y,width:w,height:h,perspective:600,pointerEvents:"none",opacity,animation:`neoFloat${f} ${d} ease-in-out infinite ${dl}`}}>
      <div style={{position:"relative",width:"100%",height:"100%",transition:"transform 0.7s cubic-bezier(0.4,0,0.2,1)",transformStyle:"preserve-3d",transform:flipped?"rotateY(180deg)":"rotateY(0deg)"}}>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column",padding:"8px 10px",border:`2px solid rgba(${rgb},0.7)`,background:`rgba(${rgb},0.06)`,boxShadow:`0 0 15px rgba(${rgb},0.3),0 0 30px rgba(${rgb},0.15),inset 0 0 15px rgba(${rgb},0.06)`,transform:`rotate(${r}deg)`}}>
          <div style={{fontSize:Math.max(7,w*0.055),fontWeight:700,color:`rgba(${rgb},0.9)`,marginBottom:2,fontFamily:"monospace",letterSpacing:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
          <div style={{fontSize:Math.max(5,w*0.04),color:"rgba(255,255,255,0.5)",lineHeight:1.4,fontFamily:"monospace",whiteSpace:"pre-line",overflow:"hidden",flex:1}}>{plain}</div>
        </div>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column",padding:"8px 10px",border:`2px solid rgba(${rgb},0.9)`,background:`rgba(${rgb},0.12)`,boxShadow:`0 0 20px rgba(${rgb},0.5),0 0 40px rgba(${rgb},0.2),inset 0 0 20px rgba(${rgb},0.1)`,transform:`rotateY(180deg) rotate(${r}deg)`}}>
          <div style={{fontSize:Math.max(6,w*0.045),fontWeight:700,color:`rgba(${rgb},1)`,marginBottom:2,fontFamily:"monospace",letterSpacing:1,display:"flex",alignItems:"center",gap:3}}>{"\u{1F512}"} Encrypted</div>
          <div style={{fontSize:Math.max(5,w*0.04),color:`rgba(${rgb},0.7)`,lineHeight:1.3,fontFamily:"monospace",whiteSpace:"pre-line",overflow:"hidden",flex:1,wordBreak:"break-all"}}>{enc}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function NotesCraft(){
  const[authMode,setAuthMode]=useState("login");
  const[showLanding,setShowLanding]=useState(true);
  const validInfoPages=["about","privacy","terms","password-manager","security-blog"];
  const[infoPage,setInfoPage]=useState(()=>{const h=window.location.hash.replace("#","");if(h.startsWith("blog/"))return"security-blog";return validInfoPages.includes(h)?h:null});
  const[blogArticle,setBlogArticle]=useState(()=>{const h=window.location.hash.replace("#","");return h.startsWith("blog/")?h.slice(5):null});
  const[user,setUser]=useState(null);
  const[email,setEmail]=useState("");
  const[pw,setPw]=useState("");
  const[uname,setUname]=useState("");
  const[authErr,setAuthErr]=useState("");
  const[authLoad,setAuthLoad]=useState(false);
  const[showPw,setShowPw]=useState(false);
  const[pwFocus,setPwFocus]=useState(false);
  const[showPwGen,setShowPwGen]=useState(false);
  const[genPw,setGenPw]=useState("");
  const[genPwDisplay,setGenPwDisplay]=useState("");
  const[genScrambling,setGenScrambling]=useState(false);
  const genScrambleRef=React.useRef(null);
  const[genCopied,setGenCopied]=useState(false);
  // Password Generator state
  const[pgMode,setPgMode]=useState("memorable");
  const[pgLen,setPgLen]=useState(20);
  const[pgWords,setPgWords]=useState(4);
  const[pgUpper,setPgUpper]=useState(true);
  const[pgLower,setPgLower]=useState(true);
  const[pgDigits,setPgDigits]=useState(true);
  const[pgSymbols,setPgSymbols]=useState(true);
  const[pgNoAmbig,setPgNoAmbig]=useState(false);
  const[pgSep,setPgSep]=useState("hyphens");
  const[pgCustomWords,setPgCustomWords]=useState("");
  const[pgUseCustom,setPgUseCustom]=useState(false);
  const[pgCustomErr,setPgCustomErr]=useState("");
  const[pgQuantumSafe,setPgQuantumSafe]=useState(false);
  const[pgResult,setPgResult]=useState("");
  const[pgDisplay,setPgDisplay]=useState("");
  const[pgScrambling,setPgScrambling]=useState(false);
  const[pgCopied,setPgCopied]=useState(false);
  const[pgHidden,setPgHidden]=useState(false);
  const[pgStrength,setPgStrength]=useState(null);
  const pgScrambleRef=React.useRef(null);
  // Password Manager state
  const[pmCredentials,setPmCredentials]=useState([]);
  const[pmSearch,setPmSearch]=useState("");
  const[pmView,setPmView]=useState("list"); // "list"|"add"|"edit"|"generator"
  const[pmShowLogin,setPmShowLogin]=useState(false);
  const[pmSignupMode,setPmSignupMode]=useState(false);
  const[pmSignupName,setPmSignupName]=useState("");
  const[pmFolderFilter,setPmFolderFilter]=useState(null);
  const[pmSelectedId,setPmSelectedId]=useState(null);
  const[pmFormSite,setPmFormSite]=useState("");
  const[pmFormUrl,setPmFormUrl]=useState("");
  const[pmFormUser,setPmFormUser]=useState("");
  const[pmFormPw,setPmFormPw]=useState("");
  const[pmFormNotes,setPmFormNotes]=useState("");
  const[pmFormTotp,setPmFormTotp]=useState("");
  const[pmFormFolder,setPmFormFolder]=useState("");
  const[pmFormStarred,setPmFormStarred]=useState(false);
  const[pmShowPw,setPmShowPw]=useState({});
  const[pmCopied,setPmCopied]=useState("");
  const[pmTotpCodes,setPmTotpCodes]=useState({});
  const[pmTotpRemaining,setPmTotpRemaining]=useState(30);
  const[pmDelConfirm,setPmDelConfirm]=useState(null);
  const[pmIsLoggedIn,setPmIsLoggedIn]=useState(false);
  const[pmLoginEmail,setPmLoginEmail]=useState("");
  const[pmLoginPw,setPmLoginPw]=useState("");
  const[pmLoginErr,setPmLoginErr]=useState("");
  const[pmLoginLoad,setPmLoginLoad]=useState(false);
  const[pmLogin2FA,setPmLogin2FA]=useState(false);
  const[pmLogin2FACode,setPmLogin2FACode]=useState("");
  const[pmLogin2FAErr,setPmLogin2FAErr]=useState("");
  const[pmViewMode,setPmViewMode]=useState("grid");
  const[pmSortBy,setPmSortBy]=useState("recent");
  const[pmSortOpen,setPmSortOpen]=useState(false);
  const[pmCreateMenu,setPmCreateMenu]=useState(false);
  const[pmFormType,setPmFormType]=useState("login");
  const[pmShowThemes,setPmShowThemes]=useState(false);
  const[pmVaultDefs,setPmVaultDefs]=useState({});
  const[pmShowNewVault,setPmShowNewVault]=useState(false);
  const[pmNewVaultName,setPmNewVaultName]=useState("");
  const[pmNewVaultColor,setPmNewVaultColor]=useState("#6366f1");
  const[pmEditVaultMenu,setPmEditVaultMenu]=useState(null);
  const[pmFormCardNum,setPmFormCardNum]=useState("");
  const[pmFormCardExp,setPmFormCardExp]=useState("");
  const[pmFormCardCvv,setPmFormCardCvv]=useState("");
  const[pmFormCardHolder,setPmFormCardHolder]=useState("");
  const[pmFormFullName,setPmFormFullName]=useState("");
  const[pmFormPhone,setPmFormPhone]=useState("");
  const[pmFormAddress,setPmFormAddress]=useState("");
  // ThreatShield state
  const[pmThreatScanning,setPmThreatScanning]=useState(false);
  const[pmThreatProgress,setPmThreatProgress]=useState({done:0,total:0});
  const[pmThreatLastScan,setPmThreatLastScan]=useState(null);
  const pmThreatAbortRef=useRef(false);
  // Ghost Shield state
  const[pmGhostUnlocked,setPmGhostUnlocked]=useState(new Set());
  const[pmGhostInput,setPmGhostInput]=useState(false);
  const[pmGhostName,setPmGhostName]=useState("");
  const[pmGhostCode,setPmGhostCode]=useState("");
  const[pmGhostErr,setPmGhostErr]=useState("");
  const[pmGhostCreating,setPmGhostCreating]=useState(false);
  const[pmGhostNewCode,setPmGhostNewCode]=useState("");
  const pmStorageRef=useRef(null);
  const pmUserRef=useRef(null);
  // 2FA state
  const[twoFASetup,setTwoFASetup]=useState(null);
  const[twoFAStep,setTwoFAStep]=useState(1);
  const[twoFACode,setTwoFACode]=useState("");
  const[twoFAErr,setTwoFAErr]=useState("");
  const[twoFALoad,setTwoFALoad]=useState(false);
  const[twoFAShowRecovery,setTwoFAShowRecovery]=useState(false);
  const[twoFARecoveryCodes,setTwoFARecoveryCodes]=useState([]);
  const[twoFADisableCode,setTwoFADisableCode]=useState("");
  const[pending2FA,setPending2FA]=useState(null);
  const[useRecoveryCode,setUseRecoveryCode]=useState(false);
  const[shake,setShake]=useState(false);
  const[showProfileMenu,setShowProfileMenu]=useState(false);
  const[profileTab,setProfileTab]=useState("info"); // "info" | "password" | "name"
  const[changePwOld,setChangePwOld]=useState("");
  const[changePwNew,setChangePwNew]=useState("");
  const[changePwConfirm,setChangePwConfirm]=useState("");
  const[changePwErr,setChangePwErr]=useState("");
  const[changePwOk,setChangePwOk]=useState("");
  const[changePwLoad,setChangePwLoad]=useState(false);
  const[changeNameVal,setChangeNameVal]=useState("");
  const[changeNameErr,setChangeNameErr]=useState("");
  const[changeNameOk,setChangeNameOk]=useState("");

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
  const[calShowReports,setCalShowReports]=useState(false);
  const[calSearch,setCalSearch]=useState("");
  const[calFilter,setCalFilter]=useState({type:"all",priority:"all",status:"all"});
  const[notifPerm,setNotifPerm]=useState(typeof Notification!=="undefined"?Notification.permission:"denied");

  const ceRefs=useRef({});
  const saveRef=useRef(null);
  const dragRef=useRef(null);
  const reminderIntervalRef=useRef(null);
  const remoteSyncRef=useRef(false);
  const flushTimerRef=useRef(null);
  const flushSaveRef=useRef(null);
  const calEventsRef=useRef(calEvents);
  calEventsRef.current=calEvents;
  const ldScrollRef=useRef(null);
  const gridCvsRef=useRef(null);
  const gridAnimRef=useRef(0);

  /* Session persistence — save/restore across page refreshes */
  const saveSession=async(em,key)=>{try{const kb=await exportKey(key);sessionStorage.setItem("nc_session",JSON.stringify({email:em,key:kb}))}catch(e){}};
  const clearSession=()=>{sessionStorage.removeItem("nc_session")};

  // Scramble/glitch reveal animation when password changes
  useEffect(()=>{
    if(!pgResult)return;
    if(pgScrambleRef.current)clearInterval(pgScrambleRef.current);
    const GLITCH="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:<>?~";
    const target=pgResult;const len=target.length;
    const revealed=new Array(len).fill(false);
    let frame=0;const totalFrames=24;
    setPgScrambling(true);
    pgScrambleRef.current=setInterval(()=>{
      frame++;
      // Progressively reveal chars from left to right
      const revealCount=Math.floor((frame/totalFrames)*len);
      for(let i=0;i<revealCount;i++)revealed[i]=true;
      const display=target.split("").map((c,i)=>revealed[i]?c:GLITCH[secRand(GLITCH.length)]).join("");
      setPgDisplay(display);
      if(frame>=totalFrames){
        clearInterval(pgScrambleRef.current);pgScrambleRef.current=null;
        setPgDisplay(target);setPgScrambling(false);
      }
    },40);
    return()=>{if(pgScrambleRef.current)clearInterval(pgScrambleRef.current)};
  },[pgResult]);

  // Scramble animation for side card password generator
  useEffect(()=>{
    if(!genPw)return;
    if(genScrambleRef.current)clearInterval(genScrambleRef.current);
    const GLITCH="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const target=genPw;const len=target.length;
    const revealed=new Array(len).fill(false);
    let frame=0;const totalFrames=20;
    setGenScrambling(true);
    genScrambleRef.current=setInterval(()=>{
      frame++;
      const revealCount=Math.floor((frame/totalFrames)*len);
      for(let i=0;i<revealCount;i++)revealed[i]=true;
      setGenPwDisplay(target.split("").map((c,i)=>revealed[i]?c:GLITCH[secRand(GLITCH.length)]).join(""));
      if(frame>=totalFrames){
        clearInterval(genScrambleRef.current);genScrambleRef.current=null;
        setGenPwDisplay(target);setGenScrambling(false);
      }
    },35);
    return()=>{if(genScrambleRef.current)clearInterval(genScrambleRef.current)};
  },[genPw]);

  // Enforce quantum-safe minimums
  useEffect(()=>{
    if(!pgQuantumSafe)return;
    if(pgMode==="random"){setPgLen(65);setPgUpper(true);setPgLower(true);setPgDigits(true);setPgSymbols(true)}
    else{setPgWords(10);setPgDigits(true);setPgSymbols(true)}
  },[pgQuantumSafe,pgMode]);
  // Password Manager — CRUD helpers
  const pmClearForm=()=>{setPmFormSite("");setPmFormUrl("");setPmFormUser("");setPmFormPw("");setPmFormNotes("");setPmFormTotp("");setPmFormFolder("");setPmFormStarred(false);setPmFormType("login");setPmFormCardNum("");setPmFormCardExp("");setPmFormCardCvv("");setPmFormCardHolder("");setPmFormFullName("");setPmFormPhone("");setPmFormAddress("")};
  const pmSave=async(creds,vDefs)=>{
    const cr=creds||pmCredentials;const vd=vDefs||pmVaultDefs;
    if(creds)setPmCredentials(cr);if(vDefs)setPmVaultDefs(vd);
    const stRef=pmStorageRef.current||storageRef.current;
    const uRef=pmUserRef.current||(user&&email);
    if(stRef&&uRef){try{await stRef.setPasswords(typeof uRef==="string"?uRef:uRef.email||email,{__v:2,credentials:cr,vaultDefs:vd})}catch(e){console.error("PM save failed",e)}}
  };
  const pmAddCredential=()=>{
    const cred={id:"pm_"+crypto.randomUUID(),type:pmFormType,siteName:pmFormSite,siteUrl:pmFormUrl,username:pmFormUser,password:pmFormPw,notes:pmFormNotes,totpSecret:pmFormTotp,folder:pmFormFolder,starred:pmFormStarred,cardNumber:pmFormCardNum,cardExpiry:pmFormCardExp,cardCvv:pmFormCardCvv,cardHolder:pmFormCardHolder,fullName:pmFormFullName,phone:pmFormPhone,address:pmFormAddress,created:new Date().toISOString(),modified:new Date().toISOString()};
    pmSave([...pmCredentials,cred]);pmClearForm();setPmView("list");setPmCreateMenu(false)
  };
  const pmUpdateCredential=()=>{
    const updated=pmCredentials.map(c=>c.id===pmSelectedId?{...c,type:pmFormType,siteName:pmFormSite,siteUrl:pmFormUrl,username:pmFormUser,password:pmFormPw,notes:pmFormNotes,totpSecret:pmFormTotp,folder:pmFormFolder,starred:pmFormStarred,cardNumber:pmFormCardNum,cardExpiry:pmFormCardExp,cardCvv:pmFormCardCvv,cardHolder:pmFormCardHolder,fullName:pmFormFullName,phone:pmFormPhone,address:pmFormAddress,modified:new Date().toISOString()}:c);
    pmSave(updated);pmClearForm();setPmSelectedId(null);setPmView("list")
  };
  const pmDeleteCredential=(id)=>{pmSave(pmCredentials.filter(c=>c.id!==id));setPmDelConfirm(null)};
  const pmEditCredential=(c)=>{setPmFormType(c.type||"login");setPmFormSite(c.siteName||"");setPmFormUrl(c.siteUrl||"");setPmFormUser(c.username||"");setPmFormPw(c.password||"");setPmFormNotes(c.notes||"");setPmFormTotp(c.totpSecret||"");setPmFormFolder(c.folder||"");setPmFormStarred(c.starred||false);setPmFormCardNum(c.cardNumber||"");setPmFormCardExp(c.cardExpiry||"");setPmFormCardCvv(c.cardCvv||"");setPmFormCardHolder(c.cardHolder||"");setPmFormFullName(c.fullName||"");setPmFormPhone(c.phone||"");setPmFormAddress(c.address||"");setPmSelectedId(c.id);setPmView("edit")};
  // ThreatShield — scan functions
  const pmScanThreats=async()=>{
    setPmThreatScanning(true);pmThreatAbortRef.current=false;
    const targets=pmCredentials.filter(c=>c.password&&c.type!=="note");
    setPmThreatProgress({done:0,total:targets.length});
    const updated=[...pmCredentials];
    for(let i=0;i<targets.length;i++){
      if(pmThreatAbortRef.current)break;
      const cred=targets[i];const idx=updated.findIndex(c=>c.id===cred.id);
      try{const r=await checkHIBP(cred.password);updated[idx]={...updated[idx],breachCheck:{breached:r.breached,count:r.count,checkedAt:new Date().toISOString()}}}catch{}
      setPmThreatProgress({done:i+1,total:targets.length});
      if(i<targets.length-1)await new Promise(r=>setTimeout(r,200));
    }
    await pmSave(updated);setPmThreatLastScan(new Date().toISOString());setPmThreatScanning(false);
  };
  const pmScanSingle=async(credId)=>{
    const cred=pmCredentials.find(c=>c.id===credId);if(!cred||!cred.password)return;
    try{const r=await checkHIBP(cred.password);const updated=pmCredentials.map(c=>c.id===credId?{...c,breachCheck:{breached:r.breached,count:r.count,checkedAt:new Date().toISOString()}}:c);await pmSave(updated)}catch{}
  };
  // Ghost Shield — helpers
  const pmHashPasscode=async(code)=>{const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(code));return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("")};
  const pmCreateGhostVault=async(name,color,passcode)=>{
    if(!name.trim()||!passcode||passcode.length!==6)return;
    const hash=await pmHashPasscode(passcode);
    const nd={...pmVaultDefs,[name.trim()]:{color,ghost:true,passcodeHash:hash}};
    setPmVaultDefs(nd);await pmSave(null,nd);
  };
  const pmUnlockGhost=async(name,code)=>{
    const def=pmVaultDefs[name];
    if(!def||!def.ghost){setPmGhostErr("Vault not found");return false}
    const hash=await pmHashPasscode(code);
    if(hash!==def.passcodeHash){setPmGhostErr("Incorrect passcode");return false}
    setPmGhostUnlocked(prev=>new Set([...prev,name]));
    setPmGhostErr("");setPmGhostInput(false);setPmGhostName("");setPmGhostCode("");return true;
  };
  const pmLockGhost=(name)=>{setPmGhostUnlocked(prev=>{const n=new Set(prev);n.delete(name);return n});if(pmFolderFilter===name){setPmFolderFilter(null);setPmView("list")}};
  const pmLockAllGhosts=()=>{setPmGhostUnlocked(new Set())};
  const isGhostLocked=(folder)=>{if(!folder)return false;const def=pmVaultDefs[folder];return def&&def.ghost&&!pmGhostUnlocked.has(folder)};
  const pmLoadVault=async(stRef,em)=>{
    try{
      let raw=await stRef.getPasswords(em);
      let creds,vDefs={};
      if(raw&&raw.__v===2){creds=raw.credentials||[];vDefs=raw.vaultDefs||{}}
      else if(Array.isArray(raw)&&raw.length){creds=raw}
      else{creds=[
          {id:"pm_demo_1",type:"login",siteName:"GitHub",siteUrl:"https://github.com",username:"dev@notecraft.app",password:"Gh$ecure2026!xK9",notes:"Personal development account",totpSecret:"JBSWY3DPEHPK3PXP",folder:"Development",starred:true,created:"2026-01-15T10:30:00Z",modified:"2026-02-20T14:22:00Z"},
          {id:"pm_demo_2",type:"login",siteName:"Google",siteUrl:"https://google.com",username:"user@gmail.com",password:"G00gl3P@ss!Str0ng",notes:"Main Google account",totpSecret:"NBSWY3DPEHPK3PXQ",folder:"Personal",starred:true,created:"2026-01-10T08:00:00Z",modified:"2026-02-18T09:15:00Z"},
          {id:"pm_demo_3",type:"login",siteName:"Netflix",siteUrl:"https://netflix.com",username:"chill@email.com",password:"N3tfl!x_Str3am#42",notes:"Family plan",folder:"Entertainment",starred:false,created:"2026-02-01T12:00:00Z",modified:"2026-02-25T16:30:00Z"},
          {id:"pm_demo_4",type:"login",siteName:"AWS Console",siteUrl:"https://aws.amazon.com",username:"admin@notecraft.app",password:"Aws!R00t_2026$Sec",notes:"Production infrastructure",totpSecret:"HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ",folder:"Development",starred:true,created:"2026-01-20T09:00:00Z",modified:"2026-02-22T11:45:00Z"},
          {id:"pm_demo_5",type:"login",siteName:"Spotify",siteUrl:"https://spotify.com",username:"music@email.com",password:"Sp0t!fy_Beats#99",notes:"Premium individual",folder:"Entertainment",starred:false,created:"2026-02-05T14:00:00Z",modified:"2026-02-24T10:00:00Z"},
          {id:"pm_demo_6",type:"login",siteName:"Discord",siteUrl:"https://discord.com",username:"gamer#1337",password:"D!sc0rd_Ch@t$2026",notes:"Gaming communities",folder:"Social",starred:false,created:"2026-01-25T16:00:00Z",modified:"2026-02-19T20:30:00Z"},
          {id:"pm_demo_7",type:"login",siteName:"Vercel",siteUrl:"https://vercel.com",username:"deploy@notecraft.app",password:"V3rc3l!D3pl0y#Pr0",notes:"NotesCraft hosting",totpSecret:"GEZDGNBVGY3TQOJQ",folder:"Development",starred:true,created:"2026-01-18T11:00:00Z",modified:"2026-02-21T13:00:00Z"},
          {id:"pm_demo_8",type:"login",siteName:"Stripe",siteUrl:"https://stripe.com",username:"payments@notecraft.app",password:"Str!pe_P@y$2026!Kx",notes:"Payment processing",totpSecret:"MFRGGZDFMY4TQMJSHEZDQNBVGY3TQOJQ",folder:"Development",starred:true,created:"2026-01-22T10:15:00Z",modified:"2026-02-20T17:00:00Z"},
          {id:"pm_demo_9",type:"card",siteName:"Personal Visa",folder:"Personal",starred:false,cardNumber:"4532015112830366",cardExpiry:"12/28",cardCvv:"847",cardHolder:"Sunny Tailor",notes:"Primary debit card",created:"2026-01-05T08:00:00Z",modified:"2026-02-15T10:00:00Z"},
          {id:"pm_demo_10",type:"card",siteName:"Work Mastercard",folder:"Work",starred:true,cardNumber:"5425233430109903",cardExpiry:"06/27",cardCvv:"392",cardHolder:"Sunny Tailor",notes:"Business expenses only",created:"2026-01-08T09:00:00Z",modified:"2026-02-10T14:00:00Z"},
          {id:"pm_demo_11",type:"note",siteName:"Server Config",folder:"Development",starred:false,notes:"Production: 192.168.1.100\\nStaging: 192.168.1.101\\nSSH key: ~/.ssh/prod_key\\nDB port: 5432",created:"2026-02-01T11:00:00Z",modified:"2026-02-22T16:00:00Z"},
          {id:"pm_demo_12",type:"identity",siteName:"Primary Identity",folder:"Personal",starred:false,fullName:"Sunny Tailor",username:"sunny@email.com",phone:"+64 21 123 4567",address:"123 Main St, Auckland, New Zealand",notes:"Main identity",created:"2026-01-01T08:00:00Z",modified:"2026-02-18T12:00:00Z"}
        ];
        await stRef.setPasswords(em,{__v:2,credentials:creds,vaultDefs:{}});
      }
      setPmCredentials(creds);setPmVaultDefs(vDefs);setPmIsLoggedIn(true);
    }catch(e){console.error("PM load failed",e)}
  };
  const pmDoLogin=async()=>{
    setPmLoginErr("");setPmLoginLoad(true);
    try{
      const adapter=await createSyncAdapter();
      const em=pmLoginEmail.toLowerCase();
      const tempEs=new EncryptedStorage(adapter,null);
      const u=await tempEs.getUser(em);
      if(!u){setPmLoginErr("No account found");setPmLoginLoad(false);return}
      if(!u.salt){setPmLoginErr("Please login via main app first to migrate your account");setPmLoginLoad(false);return}
      const key=await deriveKey(pmLoginPw,u.salt);
      const pwHash=await hashPassword(pmLoginPw,u.salt);
      if(pwHash!==u.pwHash){setPmLoginErr("Wrong password");setPmLoginLoad(false);return}
      const es=new EncryptedStorage(adapter,key);
      if(u.twoFactorEnabled&&!pmLogin2FA){
        pmStorageRef.current=es;pmUserRef.current=em;
        setPmLogin2FA(true);setPmLoginLoad(false);return
      }
      if(u.twoFactorEnabled&&pmLogin2FA){
        const twofaData=await es.getTwoFA(em);
        if(!twofaData){setPmLogin2FAErr("2FA data not found");setPmLoginLoad(false);return}
        const ok=await verifyTOTP(twofaData.secret,pmLogin2FACode);
        if(!ok){setPmLogin2FAErr("Invalid code");setPmLoginLoad(false);return}
      }
      pmStorageRef.current=es;pmUserRef.current=em;
      await pmLoadVault(es,em);
      await es.subscribe(em,()=>{},()=>{},()=>{},(newPw)=>{if(newPw){if(newPw.__v===2){setPmCredentials(newPw.credentials||[]);setPmVaultDefs(newPw.vaultDefs||{})}else if(Array.isArray(newPw)){setPmCredentials(newPw)}}});
      setPmLoginPw("");setPmLogin2FACode("");setPmShowLogin(false);setPmLogin2FA(false)
    }catch(e){setPmLoginErr("Login failed: "+e.message)}
    setPmLoginLoad(false)
  };
  const pmDoSignup=async()=>{
    setPmLoginErr("");
    if(!pmLoginEmail||!pmLoginPw||!pmSignupName){setPmLoginErr("All fields required");return}
    if(pmLoginPw.length<12){setPmLoginErr("Password must be at least 12 characters");return}
    setPmLoginLoad(true);
    try{
      const adapter=await createSyncAdapter();
      const em=pmLoginEmail.toLowerCase();
      const salt=generateSalt();
      const key=await deriveKey(pmLoginPw,salt);
      const pwHash=await hashPassword(pmLoginPw,salt);
      const es=new EncryptedStorage(adapter,key);
      const existing=await es.getUser(em);
      if(existing){setPmLoginErr("Account exists — sign in instead");setPmLoginLoad(false);return}
      const u={email:em,name:pmSignupName,pwHash,salt,quotaGB:10};
      await es.setUser(em,u);
      await es.setNotes(em,[]);await es.setPrefs(em,{theme:"midnight",tags:[],folderColors:{}});
      await es.setCalendar(em,[]);await es.setPasswords(em,[]);
      pmStorageRef.current=es;pmUserRef.current=em;
      setPmCredentials([]);setPmIsLoggedIn(true);setPmShowLogin(false);setPmSignupMode(false);
      setPmLoginPw("");setPmSignupName("")
    }catch(e){setPmLoginErr("Signup failed: "+e.message)}
    setPmLoginLoad(false)
  };
  // Auto-login to PM when already logged in to main app
  useEffect(()=>{
    if(infoPage==="password-manager"&&authMode==="app"&&storageRef.current&&!pmIsLoggedIn){
      pmStorageRef.current=storageRef.current;pmUserRef.current=email;
      pmLoadVault(storageRef.current,email)
    }
  },[infoPage,authMode]);
  // TOTP code rotation (1s interval)
  useEffect(()=>{
    if(!pmIsLoggedIn)return;
    const credsWithTotp=pmCredentials.filter(c=>c.totpSecret);
    if(!credsWithTotp.length)return;
    const tick=async()=>{
      const codes={};
      for(const c of credsWithTotp){try{codes[c.id]=await generateTOTP(c.totpSecret)}catch{codes[c.id]="------"}}
      setPmTotpCodes(codes);setPmTotpRemaining(getTOTPRemaining())
    };
    tick();
    const iv=setInterval(tick,1000);
    return()=>clearInterval(iv)
  },[pmIsLoggedIn,pmCredentials]);
  // Sync infoPage + blogArticle ↔ URL hash for shareable links
  useEffect(()=>{
    if(blogArticle)history.replaceState(null,"","#blog/"+blogArticle);
    else if(infoPage)history.replaceState(null,"","#"+infoPage);
    else if(window.location.hash)history.replaceState(null,"",window.location.pathname);
  },[infoPage,blogArticle]);
  useEffect(()=>{
    const onHash=()=>{
      const h=window.location.hash.replace("#","");
      if(h.startsWith("blog/")){setInfoPage("security-blog");setBlogArticle(h.slice(5))}
      else{setBlogArticle(null);setInfoPage(validInfoPages.includes(h)?h:null)}
    };
    window.addEventListener("hashchange",onHash);
    return()=>window.removeEventListener("hashchange",onHash);
  },[]);
  // Auto-generate password when generator page options change
  useEffect(()=>{
    if(infoPage!=="password-manager")return;
    const cw=pgUseCustom?pgCustomWords:"";
    if(cw){const err=validateCustomWords(cw);setPgCustomErr(err);if(err)return;}else{setPgCustomErr("")}
    const pw=pgMode==="random"?generateRandomPw(pgLen,pgUpper,pgLower,pgDigits,pgSymbols,pgNoAmbig):generateMemorablePw(pgWords,pgDigits,pgSymbols,pgSep,cw);
    setPgResult(pw);setPgStrength(calcPwStrength(pw));setPgCopied(false);
  },[pgMode,pgLen,pgWords,pgUpper,pgLower,pgDigits,pgSymbols,pgNoAmbig,pgSep,pgCustomWords,pgUseCustom,pgQuantumSafe,infoPage]);

  useEffect(()=>{
    if(sessionRestored.current)return;
    sessionRestored.current=true;
    const raw=sessionStorage.getItem("nc_session");
    if(!raw)return;
    setShowLanding(false);
    let sess;try{sess=JSON.parse(raw)}catch{return}
    if(!sess.email||!sess.key)return;
    (async()=>{
      try{
        const key=await importKey(sess.key);
        const adapter=await createSyncAdapter();
        const em=sess.email;
        const es=new EncryptedStorage(adapter,key);
        const u=await es.getUser(em);
        if(!u){clearSession();return}
        storageRef.current=es;
        setUser(u);setEmail(em);
        setQuotaGB(u.quotaGB||10);
        const sn=await es.getNotes(em);
        const sp=await es.getPrefs(em);
        const ln=sn||DEF_NOTES;
        setNotes(ln);
        setStorageBytes(measureNotesBytes(ln));
        if(sp){setThemeId(sp.theme||"midnight");setTags(sp.tags||DEF_TAGS);setFolderColors(sp.folderColors||{})}
        const sc=await es.getCalendar(em);setCalEvents(sc||[]);const spw=await es.getPasswords(em);setPmCredentials(spw||[]);pmStorageRef.current=es;pmUserRef.current=em;setPmIsLoggedIn(true);
        const first=ln.find(n=>!n.deleted&&!n.archived);
        if(first){setSelId(first.id);setETitle(first.title);setEBlocks(getBlocks(first))}
        setAuthMode("app");
        await es.subscribe(em,(newNotes)=>{remoteSyncRef.current=true;setNotes(newNotes)},(newCal)=>setCalEvents(newCal),(newPrefs)=>{if(newPrefs){setThemeId(newPrefs.theme||"midnight");setTags(newPrefs.tags||DEF_TAGS);setFolderColors(newPrefs.folderColors||{})}},(newPw)=>{if(newPw){if(newPw.__v===2){setPmCredentials(newPw.credentials||[]);setPmVaultDefs(newPw.vaultDefs||{})}else if(Array.isArray(newPw)){setPmCredentials(newPw)}}});
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
    if(pw.length<12){setAuthErr("Password must be at least 12 characters");doShake();return}
    const analysis=analyzePw(pw);
    const failedChecks=analysis.checks.filter(c=>!c.ok);
    if(failedChecks.length>0){setAuthErr("Fix: "+failedChecks.map(c=>c.label).join(", "));doShake();return}
    if(analysis.score<3){setAuthErr("Password is too weak — try our password generator for a strong one");doShake();return}
    if(BANNED_PW.has(pw.toLowerCase())){setAuthErr("This password is too common — choose something unique");doShake();return}
    setAuthLoad(true);
    // Check against breach database
    try{
      const hibp=await checkHIBP(pw);
      if(hibp.breached){setAuthErr(`This password appeared in ${hibp.count.toLocaleString()} data breaches — choose a different one`);doShake();setAuthLoad(false);return}
    }catch{}
    try{
      const adapter=await createSyncAdapter();
      const em=email.toLowerCase();
      // Generate salt, derive key, hash password
      const salt=generateSalt();
      const key=await deriveKey(pw,salt);
      const pwHash=await hashPassword(pw,salt);
      // Create encrypted storage instance
      const es=new EncryptedStorage(adapter,key);
      // Check if account already exists (uses hashed key)
      const existingUser=await es.getUser(em);
      if(existingUser){setAuthErr("Account exists — sign in instead");setAuthLoad(false);doShake();return}
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
      // We need a temporary EncryptedStorage to look up user (with hashed key + migration)
      // For legacy lookup, we don't have a real key yet, but getUser doesn't need it
      const tempEs=new EncryptedStorage(adapter,null);
      let u=await tempEs.getUser(em);
      if(!u){setAuthErr("No account found");setAuthLoad(false);doShake();return}

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
        const sc=await es.getCalendar(em);setCalEvents(sc||[]);const spw=await es.getPasswords(em);setPmCredentials(spw||[]);pmStorageRef.current=es;pmUserRef.current=em;setPmIsLoggedIn(true);
        const first=ln.find(n=>!n.deleted&&!n.archived);
        if(first){setSelId(first.id);setETitle(first.title);setEBlocks(getBlocks(first))}
        setAuthMode("app");setAuthLoad(false);
        saveSession(em,key);
        // Subscribe for real-time sync
        await es.subscribe(em,(newNotes)=>{remoteSyncRef.current=true;setNotes(newNotes)},(newCal)=>setCalEvents(newCal),(newPrefs)=>{if(newPrefs){setThemeId(newPrefs.theme||"midnight");setTags(newPrefs.tags||DEF_TAGS);setFolderColors(newPrefs.folderColors||{})}},(newPw)=>{if(newPw){if(newPw.__v===2){setPmCredentials(newPw.credentials||[]);setPmVaultDefs(newPw.vaultDefs||{})}else if(Array.isArray(newPw)){setPmCredentials(newPw)}}});
        return;
      }

      // Normal login — derive key, verify password
      const key=await deriveKey(pw,u.salt);
      const pwHash=await hashPassword(pw,u.salt);
      if(pwHash!==u.pwHash){setAuthErr("Wrong password");setAuthLoad(false);doShake();return}
      const es=new EncryptedStorage(adapter,key);
      // 2FA check — if enabled, pause login and show 2FA screen
      if(u.twoFactorEnabled){
        setPending2FA({user:u,key,adapter,es,email:em});
        setAuthMode("2fa");setAuthLoad(false);setTwoFACode("");setTwoFAErr("");setUseRecoveryCode(false);
        return;
      }
      storageRef.current=es;
      setUser(u);
      setQuotaGB(u.quotaGB||10);
      const sn=await es.getNotes(em);
      const sp=await es.getPrefs(em);
      const ln=sn||DEF_NOTES;
      setNotes(ln);
      setStorageBytes(measureNotesBytes(ln));
      if(sp){setThemeId(sp.theme||"midnight");setTags(sp.tags||DEF_TAGS);setFolderColors(sp.folderColors||{})}
      const sc=await es.getCalendar(em);setCalEvents(sc||[]);const spw=await es.getPasswords(em);setPmCredentials(spw||[]);pmStorageRef.current=es;pmUserRef.current=em;setPmIsLoggedIn(true);
      const first=ln.find(n=>!n.deleted&&!n.archived);
      if(first){setSelId(first.id);setETitle(first.title);setEBlocks(getBlocks(first))}
      setAuthMode("app");
      saveSession(em,key);
      // Subscribe for real-time sync
      await es.subscribe(em,(newNotes)=>{remoteSyncRef.current=true;setNotes(newNotes)},(newCal)=>setCalEvents(newCal),(newPrefs)=>{if(newPrefs){setThemeId(newPrefs.theme||"midnight");setTags(newPrefs.tags||DEF_TAGS);setFolderColors(newPrefs.folderColors||{})}},(newPw)=>{if(newPw){if(newPw.__v===2){setPmCredentials(newPw.credentials||[]);setPmVaultDefs(newPw.vaultDefs||{})}else if(Array.isArray(newPw)){setPmCredentials(newPw)}}});
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

  // ─── 2FA Functions ───
  const doVerify2FA=async()=>{
    if(!pending2FA)return;
    setTwoFAErr("");setTwoFALoad(true);
    const{user:u,key,es,email:em}=pending2FA;
    try{
      const twofaData=await es.getTwoFA(em);
      if(!twofaData){setTwoFAErr("2FA data not found");setTwoFALoad(false);return}
      if(useRecoveryCode){
        const code=twoFACode.trim().toUpperCase();
        const idx=twofaData.recoveryCodes.indexOf(code);
        if(idx===-1){setTwoFAErr("Invalid recovery code");setTwoFALoad(false);return}
        twofaData.recoveryCodes.splice(idx,1);
        await es.setTwoFA(em,twofaData);
      }else{
        const valid=await verifyTOTP(twofaData.secret,twoFACode);
        if(!valid){setTwoFAErr("Invalid code — check your authenticator app");setTwoFALoad(false);return}
      }
      // 2FA verified — complete login
      storageRef.current=es;
      setUser(u);setQuotaGB(u.quotaGB||10);
      const sn=await es.getNotes(em);const sp=await es.getPrefs(em);
      const ln=sn||DEF_NOTES;setNotes(ln);setStorageBytes(measureNotesBytes(ln));
      if(sp){setThemeId(sp.theme||"midnight");setTags(sp.tags||DEF_TAGS);setFolderColors(sp.folderColors||{})}
      const sc=await es.getCalendar(em);setCalEvents(sc||[]);const spw=await es.getPasswords(em);setPmCredentials(spw||[]);pmStorageRef.current=es;pmUserRef.current=em;setPmIsLoggedIn(true);
      const first=ln.find(n=>!n.deleted&&!n.archived);
      if(first){setSelId(first.id);setETitle(first.title);setEBlocks(getBlocks(first))}
      setAuthMode("app");saveSession(em,key);
      setPending2FA(null);setTwoFACode("");setUseRecoveryCode(false);
      await es.subscribe(em,(newNotes)=>{remoteSyncRef.current=true;setNotes(newNotes)},(newCal)=>setCalEvents(newCal),(newPrefs)=>{if(newPrefs){setThemeId(newPrefs.theme||"midnight");setTags(newPrefs.tags||DEF_TAGS);setFolderColors(newPrefs.folderColors||{})}},(newPw)=>{if(newPw){if(newPw.__v===2){setPmCredentials(newPw.credentials||[]);setPmVaultDefs(newPw.vaultDefs||{})}else if(Array.isArray(newPw)){setPmCredentials(newPw)}}});
    }catch(e){setTwoFAErr("Verification failed: "+e.message)}
    setTwoFALoad(false);
  };

  const doEnable2FASetup=()=>{
    const secret=generateTOTPSecret();
    const codes=generateRecoveryCodes();
    setTwoFASetup({secret,recoveryCodes:codes});
    setTwoFAStep(1);setTwoFACode("");setTwoFAErr("");
  };

  const doConfirm2FASetup=async()=>{
    if(!twoFASetup)return;
    setTwoFAErr("");setTwoFALoad(true);
    try{
      const valid=await verifyTOTP(twoFASetup.secret,twoFACode);
      if(!valid){setTwoFAErr("Invalid code — make sure you scanned the QR code");setTwoFALoad(false);return}
      const twofaData={secret:twoFASetup.secret,recoveryCodes:twoFASetup.recoveryCodes,enabledAt:new Date().toISOString()};
      await storageRef.current.setTwoFA(user.email,twofaData);
      const updatedUser={...user,twoFactorEnabled:true};
      await storageRef.current.setUser(user.email,updatedUser);
      setUser(updatedUser);
      setTwoFARecoveryCodes(twoFASetup.recoveryCodes);
      setTwoFAStep(3);setTwoFACode("");
    }catch(e){setTwoFAErr("Setup failed: "+e.message)}
    setTwoFALoad(false);
  };

  const doDisable2FA=async()=>{
    setTwoFAErr("");
    if(!twoFADisableCode){setTwoFAErr("Enter your authenticator code");return}
    setTwoFALoad(true);
    try{
      const twofaData=await storageRef.current.getTwoFA(user.email);
      if(!twofaData){setTwoFAErr("2FA data not found");setTwoFALoad(false);return}
      const valid=await verifyTOTP(twofaData.secret,twoFADisableCode);
      if(!valid){setTwoFAErr("Invalid code");setTwoFALoad(false);return}
      const updatedUser={...user,twoFactorEnabled:false};
      await storageRef.current.setUser(user.email,updatedUser);
      setUser(updatedUser);
      const h=await storageRef.current.getEmailHash(user.email);
      await storageRef.current.adapter.set("twofa:"+h,"");
      setTwoFADisableCode("");setTwoFAErr("");
    }catch(e){setTwoFAErr("Failed: "+e.message)}
    setTwoFALoad(false);
  };

  const doViewRecoveryCodes=async()=>{
    setTwoFALoad(true);
    try{
      const twofaData=await storageRef.current.getTwoFA(user.email);
      if(twofaData){setTwoFARecoveryCodes(twofaData.recoveryCodes);setTwoFAShowRecovery(true)}
    }catch(e){setTwoFAErr("Failed to load: "+e.message)}
    setTwoFALoad(false);
  };

  const doChangePassword=async()=>{
    setChangePwErr("");setChangePwOk("");
    if(!changePwOld||!changePwNew||!changePwConfirm){setChangePwErr("All fields required");return}
    if(changePwNew.length<4){setChangePwErr("New password: min 4 chars");return}
    if(changePwNew!==changePwConfirm){setChangePwErr("Passwords don't match");return}
    if(changePwOld===changePwNew){setChangePwErr("New password must be different");return}
    setChangePwLoad(true);
    try{
      const oldHash=await hashPassword(changePwOld,user.salt);
      if(oldHash!==user.pwHash){setChangePwErr("Current password is wrong");setChangePwLoad(false);return}
      const salt=generateSalt();
      const key=await deriveKey(changePwNew,salt);
      const pwHash=await hashPassword(changePwNew,salt);
      const updatedUser={...user,salt,pwHash};
      const es=new EncryptedStorage(storageRef.current.adapter,key);
      await es.setUser(user.email,updatedUser);
      // Re-encrypt notes, prefs, calendar with new key
      const curNotes=notes;const curPrefs={theme:themeId,tags,folderColors};const curCal=calEvents;
      await es.setNotes(user.email,curNotes);
      await es.setPrefs(user.email,curPrefs);
      await es.setCalendar(user.email,curCal);
      // Re-encrypt 2FA data if enabled
      if(user.twoFactorEnabled){try{const td=await storageRef.current.getTwoFA(user.email);if(td)await es.setTwoFA(user.email,td)}catch{}}
      storageRef.current=es;
      setUser(updatedUser);
      saveSession(user.email,key);
      setChangePwOld("");setChangePwNew("");setChangePwConfirm("");
      setChangePwOk("Password changed successfully!");
    }catch(e){setChangePwErr("Failed: "+e.message)}
    setChangePwLoad(false);
  };

  const doChangeName=async()=>{
    setChangeNameErr("");setChangeNameOk("");
    if(!changeNameVal.trim()){setChangeNameErr("Name cannot be empty");return}
    if(changeNameVal.trim()===user.name){setChangeNameErr("Same as current name");return}
    try{
      const updatedUser={...user,name:changeNameVal.trim()};
      await storageRef.current.setUser(user.email,updatedUser);
      setUser(updatedUser);
      setChangeNameOk("Name updated!");
    }catch(e){setChangeNameErr("Failed: "+e.message)}
  };

  const doDeleteAccount=async()=>{
    if(!window.confirm("Are you sure you want to delete your account? This will permanently delete ALL your notes, calendar events, and settings. This action cannot be undone."))return;
    try{
      const es=storageRef.current;
      const h=await es.getEmailHash(user.email);
      const adapter=es.adapter;
      await adapter.set("user:"+h,"");
      await adapter.set("notes:"+h,"");
      await adapter.set("prefs:"+h,"");
      await adapter.set("calendar:"+h,"");
      await adapter.set("twofa:"+h,"");
      doLogout();
    }catch(e){alert("Delete failed: "+e.message)}
  };

  const[resyncStatus,setResyncStatus]=useState("");
  const doForceResync=async()=>{
    if(!user||!storageRef.current)return;
    setResyncStatus("syncing");
    try{
      const es=storageRef.current;
      await es.setUser(user.email,user);
      await es.setNotes(user.email,notes);
      await es.setPrefs(user.email,{theme:themeId,tags,folderColors});
      await es.setCalendar(user.email,calEvents);
      setResyncStatus("done");
      setTimeout(()=>setResyncStatus(""),3000);
    }catch(e){setResyncStatus("error: "+e.message);setTimeout(()=>setResyncStatus(""),5000)}
  };

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
    const ev={id:genCid(),date:calSelDate||todayStr,time:"",endTime:"",title:"",type:"event",color:T.accent,done:false,notes:"",items:[],reminderDate:"",reminderTime:"",reminderFired:false,priority:"medium",repeat:"none",repeatEnd:"",repeatCustomDays:7,attachments:[],created:new Date().toISOString(),modified:new Date().toISOString(),...overrides};
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
  const mdToHtml=(md)=>{
    if(!md)return"";
    // Protect code blocks first
    const codeBlocks=[];
    md=md.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,lang,code)=>{codeBlocks.push({lang,code:code.replace(/</g,"&lt;").replace(/>/g,"&gt;").trimEnd()});return`\x00CB${codeBlocks.length-1}\x00`});
    // Protect inline code
    const inlineCodes=[];
    md=md.replace(/`([^`\n]+)`/g,(_,code)=>{inlineCodes.push(code.replace(/</g,"&lt;").replace(/>/g,"&gt;"));return`\x00IC${inlineCodes.length-1}\x00`});
    // Horizontal rules
    md=md.replace(/^(\s*[-*_]\s*){3,}$/gm,`<hr style="border:none;border-top:1px solid ${T.bdr};margin:12px 0"/>`);
    // Headings
    md=md.replace(/^#{6}\s+(.+)$/gm,`<h6 style="margin:10px 0 4px;font-size:12px;font-weight:700;color:${T.text}">$1</h6>`);
    md=md.replace(/^#{5}\s+(.+)$/gm,`<h5 style="margin:10px 0 4px;font-size:13px;font-weight:700;color:${T.text}">$1</h5>`);
    md=md.replace(/^#{4}\s+(.+)$/gm,`<h4 style="margin:10px 0 4px;font-size:14px;font-weight:700;color:${T.text}">$1</h4>`);
    md=md.replace(/^###\s+(.+)$/gm,`<h3 style="margin:12px 0 4px;font-size:15px;font-weight:700;color:${T.text}">$1</h3>`);
    md=md.replace(/^##\s+(.+)$/gm,`<h2 style="margin:14px 0 6px;font-size:17px;font-weight:700;color:${T.text}">$1</h2>`);
    md=md.replace(/^#\s+(.+)$/gm,`<h1 style="margin:16px 0 8px;font-size:20px;font-weight:700;color:${T.text}">$1</h1>`);
    // Images (before links)
    md=md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,`<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:6px 0"/>`);
    // Links
    md=md.replace(/\[([^\]]+)\]\(([^)]+)\)/g,`<a href="$2" target="_blank" rel="noopener" style="color:${T.accent};text-decoration:underline">$1</a>`);
    // Bold + italic
    md=md.replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>");
    md=md.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
    md=md.replace(/\*(.+?)\*/g,"<em>$1</em>");
    md=md.replace(/~~(.+?)~~/g,"<del>$1</del>");
    // Blockquotes (collect consecutive lines)
    md=md.replace(/^(?:>\s?(.*)(?:\n|$))+/gm,(m)=>{
      const lines=m.split("\n").filter(l=>l.startsWith(">")).map(l=>l.replace(/^>\s?/,""));
      return`<blockquote style="margin:8px 0;padding:6px 12px;border-left:3px solid ${T.accent};color:${T.dim};background:rgba(${T.accentRgb},0.04);border-radius:0 6px 6px 0">${lines.join("<br/>")}</blockquote>`;
    });
    // Task lists (- [x] or - [ ])
    md=md.replace(/^[-*]\s+\[x\]\s+(.+)$/gm,`<div style="margin:2px 0;display:flex;align-items:center;gap:6px"><span style="color:${T.ok}">&#9745;</span><span style="text-decoration:line-through;color:${T.faint}">$1</span></div>`);
    md=md.replace(/^[-*]\s+\[\s?\]\s+(.+)$/gm,`<div style="margin:2px 0;display:flex;align-items:center;gap:6px"><span style="color:${T.dim}">&#9744;</span><span>$1</span></div>`);
    // Ordered lists
    md=md.replace(/^(?:\d+\.\s+.+(?:\n|$))+/gm,(m)=>{
      const items=m.trim().split("\n").map(l=>l.replace(/^\d+\.\s+/,""));
      return`<ol style="margin:6px 0;padding-left:22px">${items.map(i=>`<li style="margin:2px 0">${i}</li>`).join("")}</ol>`;
    });
    // Unordered lists
    md=md.replace(/^(?:[-*+]\s+(?!\[).+(?:\n|$))+/gm,(m)=>{
      const items=m.trim().split("\n").map(l=>l.replace(/^[-*+]\s+/,""));
      return`<ul style="margin:6px 0;padding-left:22px">${items.map(i=>`<li style="margin:2px 0">${i}</li>`).join("")}</ul>`;
    });
    // Tables
    md=md.replace(/^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)+)/gm,(_,header,_sep,body)=>{
      const thStyle=`padding:4px 8px;border:1px solid ${T.bdr};font-weight:700;background:rgba(${T.accentRgb},0.06)`;
      const tdStyle=`padding:4px 8px;border:1px solid ${T.bdr}`;
      const ths=header.split("|").filter(c=>c.trim()).map(c=>`<th style="${thStyle}">${c.trim()}</th>`).join("");
      const rows=body.trim().split("\n").map(r=>{
        const tds=r.split("|").filter(c=>c.trim()).map(c=>`<td style="${tdStyle}">${c.trim()}</td>`).join("");
        return`<tr>${tds}</tr>`;
      }).join("");
      return`<table style="border-collapse:collapse;margin:8px 0;width:100%"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
    });
    // Restore code blocks
    md=md.replace(/\x00CB(\d+)\x00/g,(_,i)=>{
      const cb=codeBlocks[+i];
      return`<pre style="margin:8px 0;padding:10px 12px;background:${T.dark?"rgba(0,0,0,0.4)":"rgba(0,0,0,0.06)"};border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;font-family:${F.mono},monospace"><code>${cb.code}</code></pre>`;
    });
    // Restore inline code
    md=md.replace(/\x00IC(\d+)\x00/g,(_,i)=>`<code style="padding:1px 5px;background:${T.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"};border-radius:4px;font-size:0.9em;font-family:${F.mono},monospace">${inlineCodes[+i]}</code>`);
    // Paragraphs: double newline
    md=md.replace(/\n\n+/g,"</p><p style=\"margin:6px 0\">");
    // Single newlines to <br>
    md=md.replace(/\n/g,"<br/>");
    return`<div style="line-height:1.8"><p style="margin:6px 0">${md}</p></div>`;
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
  flushSaveRef.current=flushSave;
  const debouncedFlush=()=>{if(flushTimerRef.current)clearTimeout(flushTimerRef.current);flushTimerRef.current=setTimeout(()=>flushSaveRef.current&&flushSaveRef.current(),1000)};

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

  const getRecurrenceForDate=(ev,ds)=>{
    const repeat=ev.repeat||"none";
    if(repeat==="none")return ev.date===ds?ev:null;
    const evDate=new Date(ev.date+"T00:00:00");
    const target=new Date(ds+"T00:00:00");
    if(target<evDate)return null;
    if(ev.repeatEnd&&target>new Date(ev.repeatEnd+"T23:59:59"))return null;
    const diffDays=Math.round((target-evDate)/86400000);
    let matches=false;
    switch(repeat){
      case"daily":matches=true;break;
      case"weekdays":matches=target.getDay()>=1&&target.getDay()<=5&&evDate.getDay()>=1&&evDate.getDay()<=5||target.getDay()>=1&&target.getDay()<=5;break;
      case"weekly":matches=diffDays%7===0;break;
      case"monthly":matches=target.getDate()===evDate.getDate();break;
      case"yearly":matches=target.getMonth()===evDate.getMonth()&&target.getDate()===evDate.getDate();break;
      case"custom":matches=diffDays%(ev.repeatCustomDays||7)===0;break;
    }
    if(!matches)return null;
    if(ds===ev.date)return ev;
    return{...ev,id:ev.id+"_v_"+ds,date:ds,_virtualOf:ev.id,_isVirtual:true};
  };

  const eventsForDate=useCallback((ds)=>calEvents.flatMap(ev=>{
    const inst=getRecurrenceForDate(ev,ds);return inst?[inst]:[];
  }).sort((a,b)=>(a.time||"").localeCompare(b.time||"")),[calEvents]);

  const calSelDayEvents=useMemo(()=>{
    if(!calSelDate)return[];
    let events=calEvents.flatMap(ev=>{
      const inst=getRecurrenceForDate(ev,calSelDate);return inst?[inst]:[];
    });
    if(calSearch){const q=calSearch.toLowerCase();events=events.filter(e=>(e.title||"").toLowerCase().includes(q)||(e.notes||"").toLowerCase().includes(q))}
    if(calFilter.type!=="all")events=events.filter(e=>e.type===calFilter.type);
    if(calFilter.priority!=="all")events=events.filter(e=>(e.priority||"medium")===calFilter.priority);
    if(calFilter.status==="done")events=events.filter(e=>e.done);
    if(calFilter.status==="pending")events=events.filter(e=>!e.done);
    return events.sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  },[calEvents,calSelDate,calSearch,calFilter]);

  const fmtDate=(d)=>{const ms=Date.now()-new Date(d);if(ms<60000)return"Just now";if(ms<3600000)return Math.floor(ms/60000)+"m";if(ms<86400000)return Math.floor(ms/3600000)+"h";return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"})};
  const fmtFull=(d)=>new Date(d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})+", "+new Date(d).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});

  // Sync richtext block editors when selected note changes
  useEffect(()=>{
    if(selId){
      const n=notes.find(x=>x.id===selId);
      if(n){const blocks=getBlocks(n);blocks.forEach(b=>{if(b.type==="richtext"&&ceRefs.current[b.id])ceRefs.current[b.id].innerHTML=plainToHtml(b.content)})}
    }
  },[selId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update editor when remote sync changes the selected note
  useEffect(()=>{
    if(remoteSyncRef.current&&selId){
      remoteSyncRef.current=false;
      const n=notes.find(x=>x.id===selId);
      if(n){
        setETitle(n.title);
        const blocks=getBlocks(n);setEBlocks(blocks);
        setTimeout(()=>{blocks.forEach(b=>{if(b.type==="richtext"&&ceRefs.current[b.id])ceRefs.current[b.id].innerHTML=plainToHtml(b.content)})},0);
      }
    }
  },[notes]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ─── Curved grid canvas with glitch + drift ───
  useEffect(()=>{
    cancelAnimationFrame(gridAnimRef.current);
    const c=gridCvsRef.current;
    if(!c)return;
    const ctx=c.getContext("2d");
    const dpr=window.devicePixelRatio||1;
    let W,H;
    const resize=()=>{W=c.clientWidth||window.innerWidth;H=c.clientHeight||window.innerHeight;c.width=W*dpr;c.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)};
    resize();
    window.addEventListener("resize",resize);
    const sp=60,rgb=T.accentRgb;
    let off=0,driftX=0,driftTarget=0,driftTimer=0;
    // Glitch state
    let glitchActive=false,glitchTimer=0,glitchLines=[],glitchColorShift=0;
    const draw=(ts)=>{
      ctx.clearRect(0,0,W,H);
      const cs=H*0.78,ch=H-cs;
      off=(off+0.3)%sp;
      // Random left/right drift
      driftTimer++;
      if(driftTimer>120+Math.random()*200){driftTimer=0;driftTarget=(Math.random()-0.5)*40}
      driftX+=(driftTarget-driftX)*0.02;
      // Random glitch trigger
      glitchTimer++;
      if(!glitchActive&&glitchTimer>180+Math.random()*300){
        glitchActive=true;glitchTimer=0;
        glitchLines=Array.from({length:3+Math.floor(Math.random()*5)},()=>({y:Math.random()*H,h:2+Math.random()*6,dx:(Math.random()-0.5)*30}));
        glitchColorShift=Math.random()>0.5?1:0;
      }
      if(glitchActive&&glitchTimer>6+Math.random()*8){glitchActive=false;glitchTimer=0}
      ctx.save();
      ctx.translate(driftX,0);
      // Glow pass
      const glitchRgb=glitchActive&&glitchColorShift?`255,${50+Math.random()*100},${Math.random()*80}`:rgb;
      ctx.strokeStyle=`rgba(${glitchRgb},0.06)`;ctx.lineWidth=5;
      drawGrid(ctx,W,H,sp,cs,ch,off,glitchActive?glitchLines:null,driftX);
      // Sharp pass
      ctx.strokeStyle=`rgba(${glitchRgb},${glitchActive?0.35:0.2})`;ctx.lineWidth=1;
      drawGrid(ctx,W,H,sp,cs,ch,off,glitchActive?glitchLines:null,driftX);
      // Draw glitch scanlines
      if(glitchActive){
        ctx.globalAlpha=0.15+Math.random()*0.15;
        for(const g of glitchLines){
          ctx.fillStyle=`rgba(${rgb},0.3)`;
          ctx.fillRect(-driftX+g.dx,g.y,W+40,g.h);
        }
        ctx.globalAlpha=1;
      }
      ctx.restore();
      gridAnimRef.current=requestAnimationFrame(draw);
    };
    draw(0);
    return()=>{cancelAnimationFrame(gridAnimRef.current);window.removeEventListener("resize",resize)};
  },[showLanding,T.accentRgb]);
  function drawGrid(ctx,W,H,sp,cs,ch,off,glitchLines){
    const cx=W/2;
    // Horizontal lines (scroll down)
    for(let b=-sp*2;b<=H+sp;b+=sp){
      const y=b+off;
      if(y<-sp||y>H+sp*2)continue;
      // Glitch: offset certain horizontal lines
      let gx=0;
      if(glitchLines){for(const g of glitchLines){if(Math.abs(y-g.y)<sp*0.6){gx=g.dx;break}}}
      ctx.beginPath();
      if(y<=cs){ctx.moveTo(gx,y);ctx.lineTo(W+gx,y)}
      else{const t=Math.min((y-cs)/ch,1),sag=-(t*t*140);ctx.moveTo(gx,y);ctx.quadraticCurveTo(cx+gx,y+sag,W+gx,y)}
      ctx.stroke();
    }
    // Vertical lines (static, curve at bottom)
    for(let x=-sp*2;x<=W+sp*2;x+=sp){
      ctx.beginPath();ctx.moveTo(x,0);
      if(cs<H){ctx.lineTo(x,cs);const d=x-cx,p=d*-0.35;ctx.quadraticCurveTo(x-p*0.3,cs+ch*0.5,x-p,H+60)}
      else ctx.lineTo(x,H);
      ctx.stroke();
    }
  }

  // ─── Dynamic font loading ───
  const fontUrl=useMemo(()=>{
    const families=new Set([F.heading,F.body,F.mono].map(f=>f.replace(/'/g,"")));
    const params=[...families].map(f=>f.replace(/ /g,"+")+":wght@300;400;500;600;700;800;900").join("&family=");
    return `https://fonts.googleapis.com/css2?family=${params}&display=swap`;
  },[F]);

  // ─── Styles ───
  const css=`@import url('${fontUrl}');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Roboto:wght@300;400;700&family=Open+Sans:wght@300;400;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;600;700&family=Poppins:wght@300;400;600;700&family=Raleway:wght@300;400;700&family=Nunito:wght@300;400;700&family=Playfair+Display:wght@400;700&family=Merriweather:wght@300;400;700&family=Source+Code+Pro:wght@400;600&family=Fira+Code:wght@400;600&family=Dancing+Script:wght@400;700&family=Pacifico&family=Caveat:wght@400;700&family=Oswald:wght@300;400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(${T.accentRgb},0.15);border-radius:3px}
::selection{background:rgba(${T.accentRgb},0.3)}
input::placeholder,textarea::placeholder{color:${T.faint}}
select option{background:${T.bg};color:${T.text}}
@keyframes fadeUp{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-4px)}60%{transform:translateX(4px)}}
@keyframes warnSlideIn{from{opacity:0;transform:translateX(30px) scale(0.92)}to{opacity:1;transform:translateX(0) scale(1)}}
@keyframes warnAttention{0%,100%{transform:scale(1);box-shadow:0 0 20px rgba(245,158,11,0.15),0 8px 32px rgba(0,0,0,0.3)}50%{transform:scale(1.03);box-shadow:0 0 35px rgba(245,158,11,0.35),0 8px 32px rgba(0,0,0,0.3)}}
@keyframes warnBorderGlow{0%,100%{border-color:rgba(245,158,11,0.25)}50%{border-color:rgba(245,158,11,0.6)}}
@keyframes pgSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes pgPulseGlow{0%,100%{box-shadow:0 0 8px rgba(var(--ar),0.3)}50%{box-shadow:0 0 20px rgba(var(--ar),0.6),0 0 40px rgba(var(--ar),0.2)}}
@keyframes pgCopySuccess{0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)}}
@keyframes pgBtnShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes djStepIn{from{opacity:0;transform:translateY(16px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes djArrowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes djIconPulse{0%,100%{box-shadow:0 0 20px rgba(var(--sc),0.2)}50%{box-shadow:0 0 32px rgba(var(--sc),0.45)}}
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
@keyframes shieldFloat{0%{transform:translateY(0px) rotate(0deg)}20%{transform:translateY(-6px) rotate(1.5deg)}40%{transform:translateY(-2px) rotate(-0.5deg)}60%{transform:translateY(-8px) rotate(-1.5deg)}80%{transform:translateY(-3px) rotate(0.5deg)}100%{transform:translateY(0px) rotate(0deg)}}
@keyframes shieldEntrance{0%{transform:scale(0) rotate(-20deg);opacity:0;filter:blur(8px)}30%{transform:scale(1.15) rotate(4deg);opacity:1;filter:blur(0)}55%{transform:scale(0.92) rotate(-2deg)}75%{transform:scale(1.03) rotate(1deg)}100%{transform:scale(1) rotate(0deg);opacity:1;filter:blur(0)}}
@keyframes flapWing{0%{transform:scaleX(1)}15%{transform:scaleX(0.6)}30%{transform:scaleX(1)}45%{transform:scaleX(0.55)}60%{transform:scaleX(1)}80%{transform:scaleX(0.7)}100%{transform:scaleX(1)}}
@keyframes butterflyFly{0%{transform:translate(0,0) scaleX(1) rotate(0deg)}5%{transform:translate(80px,-30px) scaleX(1) rotate(4deg)}10%{transform:translate(180px,-50px) scaleX(1) rotate(7deg)}15%{transform:translate(260px,-25px) scaleX(1) rotate(5deg)}20%{transform:translate(300px,-10px) scaleX(1) rotate(2deg)}24%{transform:translate(280px,-5px) scaleX(-1) rotate(3deg)}30%{transform:translate(150px,-15px) scaleX(-1) rotate(6deg)}35%{transform:translate(50px,-25px) scaleX(-1) rotate(4deg)}40%{transform:translate(-30px,-35px) scaleX(-1) rotate(2deg)}45%{transform:translate(-120px,-50px) scaleX(-1) rotate(6deg)}50%{transform:translate(-220px,-60px) scaleX(-1) rotate(8deg)}55%{transform:translate(-300px,-35px) scaleX(-1) rotate(5deg)}60%{transform:translate(-280px,-20px) scaleX(-1) rotate(2deg)}64%{transform:translate(-240px,-25px) scaleX(1) rotate(-2deg)}70%{transform:translate(-100px,-15px) scaleX(1) rotate(-5deg)}75%{transform:translate(-20px,-10px) scaleX(1) rotate(-3deg)}80%{transform:translate(40px,-15px) scaleX(1) rotate(-2deg)}85%{transform:translate(25px,-10px) scaleX(1) rotate(-1deg)}90%{transform:translate(12px,-5px) scaleX(1) rotate(0deg)}95%{transform:translate(4px,-2px) scaleX(1) rotate(0deg)}100%{transform:translate(0,0) scaleX(1) rotate(0deg)}}
@keyframes butterflyFly2{0%{transform:translate(0,0) scaleX(-1) rotate(0deg)}4%{transform:translate(-60px,-15px) scaleX(-1) rotate(3deg)}8%{transform:translate(-150px,-30px) scaleX(-1) rotate(6deg)}12%{transform:translate(-240px,-20px) scaleX(-1) rotate(4deg)}18%{transform:translate(-280px,-40px) scaleX(-1) rotate(1deg)}22%{transform:translate(-260px,-50px) scaleX(1) rotate(-3deg)}28%{transform:translate(-150px,-35px) scaleX(1) rotate(-5deg)}34%{transform:translate(-30px,-20px) scaleX(1) rotate(-3deg)}40%{transform:translate(80px,-30px) scaleX(1) rotate(-2deg)}46%{transform:translate(180px,-45px) scaleX(1) rotate(-4deg)}52%{transform:translate(260px,-30px) scaleX(1) rotate(-6deg)}58%{transform:translate(300px,-40px) scaleX(1) rotate(-4deg)}62%{transform:translate(280px,-35px) scaleX(-1) rotate(3deg)}68%{transform:translate(180px,-25px) scaleX(-1) rotate(4deg)}74%{transform:translate(80px,-15px) scaleX(-1) rotate(3deg)}80%{transform:translate(20px,-10px) scaleX(-1) rotate(2deg)}86%{transform:translate(-10px,-8px) scaleX(-1) rotate(1deg)}92%{transform:translate(-5px,-4px) scaleX(1) rotate(0deg)}100%{transform:translate(0,0) scaleX(1) rotate(0deg)}}
@keyframes authButterflyFly{0%{transform:translate(0,0) scaleX(1) rotate(0deg)}8%{transform:translate(15px,-6px) scaleX(1) rotate(3deg)}16%{transform:translate(28px,-3px) scaleX(1) rotate(2deg)}22%{transform:translate(25px,2px) scaleX(-1) rotate(2deg)}30%{transform:translate(12px,5px) scaleX(-1) rotate(4deg)}38%{transform:translate(-5px,0px) scaleX(-1) rotate(2deg)}46%{transform:translate(-18px,-6px) scaleX(-1) rotate(5deg)}54%{transform:translate(-28px,-4px) scaleX(-1) rotate(3deg)}62%{transform:translate(-22px,2px) scaleX(1) rotate(-2deg)}70%{transform:translate(-10px,4px) scaleX(1) rotate(-3deg)}80%{transform:translate(5px,-2px) scaleX(1) rotate(-1deg)}90%{transform:translate(2px,-1px) scaleX(1) rotate(0deg)}100%{transform:translate(0,0) scaleX(1) rotate(0deg)}}
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
.tb-btn{transition:all 0.2s ease!important;opacity:.65}
.tb-btn:hover{opacity:1!important;background:rgba(${T.accentRgb},0.12)!important;transform:scale(1.15)!important;color:${T.accent}!important}
.tb-btn:active{transform:scale(0.92)!important;opacity:.8!important}
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
.nc-editor sup{font-size:0.75em}
@keyframes footerFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes footerGlow{0%,100%{text-shadow:0 0 8px rgba(${T.accentRgb},0)}50%{text-shadow:0 0 12px rgba(${T.accentRgb},0.3)}}
@keyframes footerHeartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.15)}60%{transform:scale(1)}}
@keyframes footerSteam{0%,100%{opacity:0.4;transform:translateY(0) scale(1)}50%{opacity:0.8;transform:translateY(-3px) scale(1.1)}}
@keyframes footerBlink{0%,48%,52%,100%{opacity:1}50%{opacity:0.3}}
@keyframes footerNameShimmer{0%{background-position:200% center}100%{background-position:-200% center}}
.nc-footer-name{background:linear-gradient(90deg,${T.accent},${T.accent2||T.accent},${T.text},${T.accent2||T.accent},${T.accent});background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:footerNameShimmer 4s linear infinite}
@keyframes ldReveal{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes ldFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes ldPulseRing{0%{transform:scale(0.8);opacity:0.6}100%{transform:scale(2.5);opacity:0}}
@keyframes ldGridFlow{0%{background-position:0 0}100%{background-position:60px 60px}}
@keyframes neoGridScroll{0%{background-position:0 0}100%{background-position:0 60px}}
@keyframes neoFloat1{0%,100%{transform:translateY(0)}50%{transform:translateY(-22px)}}
@keyframes neoFloat2{0%,100%{transform:translateY(0)}50%{transform:translateY(-30px)}}
@keyframes neoFloat3{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes neoPulse{0%,100%{opacity:0.25}50%{opacity:0.65}}
@keyframes scanDown{0%{top:-2%;opacity:0}5%{opacity:0.5}95%{opacity:0.5}100%{top:102%;opacity:0}}
@keyframes ldGlowPulse{0%,100%{opacity:0.3}50%{opacity:0.7}}
@keyframes ldTextReveal{from{opacity:0;transform:translateY(20px);filter:blur(8px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
@keyframes ldShine{0%{left:-100%}100%{left:200%}}
@keyframes ldOrb1{0%{transform:translate(0,0)}25%{transform:translate(100px,-50px)}50%{transform:translate(-50px,80px)}75%{transform:translate(-120px,-30px)}100%{transform:translate(0,0)}}
@keyframes ldOrb2{0%{transform:translate(0,0)}25%{transform:translate(-80px,60px)}50%{transform:translate(60px,-90px)}75%{transform:translate(100px,40px)}100%{transform:translate(0,0)}}
@keyframes ldLine{0%{transform:translateX(-100%);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateX(100vw);opacity:0}}
@keyframes ldMockFloat{0%,100%{transform:perspective(1000px) rotateY(-3deg) rotateX(2deg) translateY(0)}50%{transform:perspective(1000px) rotateY(3deg) rotateX(-2deg) translateY(-8px)}}
.ld-section{opacity:0;transform:translateY(60px) scale(0.97);transition:opacity 1s cubic-bezier(0.16,1,0.3,1),transform 1.2s cubic-bezier(0.16,1,0.3,1)}.ld-section.ld-vis{opacity:1;transform:translateY(0) scale(1)}
.ld-card{transition:all 0.4s cubic-bezier(0.4,0,0.2,1)}.ld-card:hover{transform:translateY(-6px);box-shadow:0 20px 60px rgba(${T.accentRgb},0.15),0 0 40px rgba(${T.accentRgb},0.05)!important;border-color:rgba(${T.accentRgb},0.3)!important}
.ld-cta{transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}.ld-cta:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 8px 30px rgba(${T.accentRgb},0.4),0 0 60px rgba(${T.accentRgb},0.1)!important}
.ld-cta:active{transform:translateY(0) scale(0.98)}
.ld-cta-ghost{transition:all 0.3s}.ld-cta-ghost:hover{background:rgba(${T.accentRgb},0.1)!important;border-color:rgba(${T.accentRgb},0.4)!important;transform:translateY(-2px)}
.ld-price-card{transition:all 0.4s cubic-bezier(0.4,0,0.2,1)}.ld-price-card:hover{transform:translateY(-8px) scale(1.02);box-shadow:0 25px 60px rgba(0,0,0,0.3),0 0 50px rgba(${T.accentRgb},0.1)!important}
.ld-nav-btn{transition:all 0.25s}.ld-nav-btn:hover{color:${T.accent}!important;text-shadow:0 0 12px rgba(${T.accentRgb},0.4)}
.ld-particle{position:absolute;border-radius:50%;pointer-events:none;background:${T.accent};opacity:0;animation:particleRise linear infinite}
.ld-particle:nth-child(1){left:8%;width:3px;height:3px;animation-duration:8s;animation-delay:0s;opacity:0.4}
.ld-particle:nth-child(2){left:18%;width:2px;height:2px;animation-duration:11s;animation-delay:1.5s;opacity:0.3}
.ld-particle:nth-child(3){left:30%;width:4px;height:4px;animation-duration:7s;animation-delay:0.5s;opacity:0.5}
.ld-particle:nth-child(4){left:42%;width:2px;height:2px;animation-duration:10s;animation-delay:3s;opacity:0.3}
.ld-particle:nth-child(5){left:55%;width:3px;height:3px;animation-duration:9s;animation-delay:2s;opacity:0.4}
.ld-particle:nth-child(6){left:68%;width:2px;height:2px;animation-duration:12s;animation-delay:4s;opacity:0.3}
.ld-particle:nth-child(7){left:78%;width:3px;height:3px;animation-duration:8s;animation-delay:1s;opacity:0.4}
.ld-particle:nth-child(8){left:90%;width:4px;height:4px;animation-duration:6s;animation-delay:2.5s;opacity:0.5}
html{scroll-behavior:smooth}
@keyframes qrPulse{0%,100%{box-shadow:0 0 20px rgba(16,185,129,0.15),0 0 40px rgba(16,185,129,0.06),inset 0 0 20px rgba(16,185,129,0.04)}50%{box-shadow:0 0 25px rgba(16,185,129,0.25),0 0 50px rgba(16,185,129,0.1),inset 0 0 25px rgba(16,185,129,0.06)}}
@keyframes pgGlowPulse{0%,100%{opacity:0.5}50%{opacity:1}}
@keyframes pgStripeMove{0%{background-position:0 0}100%{background-position:50px -50px}}
@keyframes pgBorderGlow{0%,100%{border-color:rgba(${T.accentRgb},0.5);box-shadow:0 12px 60px rgba(0,0,0,0.4),0 0 25px rgba(${T.accentRgb},0.3),0 0 50px rgba(${T.accentRgb},0.15),0 0 100px rgba(${T.accentRgb},0.08),inset 0 0 25px rgba(${T.accentRgb},0.05)}50%{border-color:rgba(${T.accentRgb},0.8);box-shadow:0 12px 60px rgba(0,0,0,0.4),0 0 30px rgba(${T.accentRgb},0.45),0 0 60px rgba(${T.accentRgb},0.25),0 0 120px rgba(${T.accentRgb},0.12),inset 0 0 30px rgba(${T.accentRgb},0.08)}}
@keyframes qmBorderGlow{0%,100%{border-color:rgba(16,185,129,0.6);box-shadow:0 12px 60px rgba(0,0,0,0.4),0 0 25px rgba(16,185,129,0.35),0 0 60px rgba(16,185,129,0.2),0 0 120px rgba(16,185,129,0.1),inset 0 0 30px rgba(16,185,129,0.05)}50%{border-color:rgba(16,185,129,0.9);box-shadow:0 12px 60px rgba(0,0,0,0.4),0 0 35px rgba(16,185,129,0.5),0 0 80px rgba(16,185,129,0.3),0 0 150px rgba(16,185,129,0.15),inset 0 0 40px rgba(16,185,129,0.08)}}
@keyframes qmCornerPulse{0%,100%{opacity:0.7;box-shadow:0 0 10px rgba(16,185,129,0.4)}50%{opacity:1;box-shadow:0 0 20px rgba(16,185,129,0.7),0 0 40px rgba(16,185,129,0.3)}}
.pg-slider-qm{-webkit-appearance:none!important;appearance:none!important;width:100%;height:10px;border-radius:5px;background:linear-gradient(90deg,rgba(16,185,129,0.2),rgba(16,185,129,0.6))!important;outline:none;cursor:pointer;position:relative;box-shadow:0 0 14px rgba(16,185,129,0.35),inset 0 1px 2px rgba(0,0,0,0.3)}
.pg-slider-qm::-webkit-slider-thumb{-webkit-appearance:none!important;appearance:none!important;width:24px;height:24px;border-radius:50%;background:#10b981;box-shadow:0 0 16px rgba(16,185,129,0.8),0 0 32px rgba(16,185,129,0.4),0 0 48px rgba(16,185,129,0.2);border:3px solid rgba(255,255,255,0.5);cursor:pointer;transition:all 0.2s;position:relative;z-index:2}
.pg-slider-qm::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 0 24px rgba(16,185,129,1),0 0 48px rgba(16,185,129,0.5),0 0 64px rgba(16,185,129,0.25)}
.pg-slider-qm::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#10b981;box-shadow:0 0 16px rgba(16,185,129,0.8),0 0 32px rgba(16,185,129,0.4);border:3px solid rgba(255,255,255,0.5);cursor:pointer}
.pg-slider-qm::-moz-range-track{height:10px;border-radius:5px;background:linear-gradient(90deg,rgba(16,185,129,0.2),rgba(16,185,129,0.6));box-shadow:0 0 14px rgba(16,185,129,0.35)}
.pg-chk-on-qm{background:rgba(16,185,129,0.3);border:2px solid #10b981;box-shadow:0 0 12px rgba(16,185,129,0.5),0 0 24px rgba(16,185,129,0.15),inset 0 0 8px rgba(16,185,129,0.2)}
.pg-mode-active-qm{background:rgba(16,185,129,0.2);color:#10b981;font-weight:700;box-shadow:0 0 16px rgba(16,185,129,0.3),inset 0 0 12px rgba(16,185,129,0.1);border:1.5px solid rgba(16,185,129,0.45);text-shadow:0 0 8px rgba(16,185,129,0.4)}
.pg-mode-inactive-qm:hover{background:rgba(16,185,129,0.08);color:#10b981;border-color:rgba(16,185,129,0.2)}
.pg-slider{-webkit-appearance:none!important;appearance:none!important;width:100%;height:10px;border-radius:5px;background:linear-gradient(90deg,rgba(${T.accentRgb},0.2),${T.accent}80)!important;outline:none;cursor:pointer;position:relative;box-shadow:0 0 12px rgba(${T.accentRgb},0.3),inset 0 1px 2px rgba(0,0,0,0.3)}
.pg-slider::-webkit-slider-thumb{-webkit-appearance:none!important;appearance:none!important;width:24px;height:24px;border-radius:50%;background:${T.accent};box-shadow:0 0 16px rgba(${T.accentRgb},0.8),0 0 32px rgba(${T.accentRgb},0.4),0 0 48px rgba(${T.accentRgb},0.2);border:3px solid rgba(255,255,255,0.5);cursor:pointer;transition:all 0.2s;position:relative;z-index:2}
.pg-slider::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 0 24px rgba(${T.accentRgb},1),0 0 48px rgba(${T.accentRgb},0.5),0 0 64px rgba(${T.accentRgb},0.25)}
.pg-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:${T.accent};box-shadow:0 0 16px rgba(${T.accentRgb},0.8),0 0 32px rgba(${T.accentRgb},0.4);border:3px solid rgba(255,255,255,0.5);cursor:pointer}
.pg-slider::-moz-range-track{height:10px;border-radius:5px;background:linear-gradient(90deg,rgba(${T.accentRgb},0.2),${T.accent}80);box-shadow:0 0 12px rgba(${T.accentRgb},0.3)}
.pg-chk{width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;transition:all 0.3s;cursor:pointer;flex-shrink:0}
.pg-chk-on{background:rgba(${T.accentRgb},0.3);border:2px solid ${T.accent};box-shadow:0 0 12px rgba(${T.accentRgb},0.5),0 0 24px rgba(${T.accentRgb},0.15),inset 0 0 8px rgba(${T.accentRgb},0.2)}
.pg-chk-off{background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.2);box-shadow:inset 0 1px 3px rgba(0,0,0,0.2)}
.pg-mode-btn{padding:11px 0;border-radius:8px;border:none;font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.3s;letter-spacing:0.5px;position:relative;overflow:hidden}
.pg-mode-active{background:rgba(${T.accentRgb},0.2);color:${T.accent};font-weight:700;box-shadow:0 0 16px rgba(${T.accentRgb},0.3),inset 0 0 12px rgba(${T.accentRgb},0.1);border:1.5px solid rgba(${T.accentRgb},0.45);text-shadow:0 0 8px rgba(${T.accentRgb},0.4)}
.pg-mode-inactive{background:rgba(255,255,255,0.02);color:${T.dim};font-weight:500;border:1.5px solid transparent}
.pg-mode-inactive:hover{background:rgba(${T.accentRgb},0.08);color:${T.accent};border-color:rgba(${T.accentRgb},0.2)}`;

  const inp={background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.5)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid rgba(${T.accentRgb},0.15)`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s",boxShadow:`0 2px 10px rgba(0,0,0,0.1), inset 0 0 10px rgba(${T.accentRgb},0.02)`};
  const glass={background:T.dark?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.4)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:`1px solid rgba(${T.accentRgb},0.12)`,boxShadow:`0 8px 32px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,${T.dark?0.03:0.2})`};

  /* ═══════════ SHIELDCRAFT VAULT APP (full-screen when logged in) ═══════════ */
  if(infoPage==="password-manager"&&pmIsLoggedIn){
    const q=pmSearch.toLowerCase();
    const defVC=["#6366f1","#f59e0b","#10b981","#ef4444","#ec4899","#8b5cf6","#06b6d4","#f97316","#84cc16","#a855f7","#14b8a6","#e11d48"];
    const PM_TYPES=[{id:"login",name:"Login",icon:"🔑"},{id:"card",name:"Card",icon:"💳"},{id:"note",name:"Note",icon:"📝"},{id:"identity",name:"Identity",icon:"👤"},{id:"api",name:"API Credential",icon:"</>"},{id:"database",name:"Database",icon:"🗄️"},{id:"server",name:"Server",icon:"🖥️"},{id:"ssh",name:"SSH Key",icon:"🔐"},{id:"wifi",name:"WiFi Network",icon:"📶"},{id:"software",name:"Software License",icon:"📋"},{id:"bank",name:"Bank Account",icon:"🏦"},{id:"crypto",name:"Crypto Wallet",icon:"₿"},{id:"drivers-license",name:"Driver License",icon:"🪪"},{id:"medical",name:"Medical Record",icon:"🏥"},{id:"membership",name:"Membership",icon:"🎫"},{id:"passport",name:"Passport",icon:"🛂"},{id:"reward",name:"Reward Program",icon:"🎁"},{id:"social-security",name:"Social Security",icon:"👥"}];
    const PM_CAT={main:["login","card","note","identity"],tech:["api","database","server","ssh","wifi","software"],finance:["bank","crypto"],personal:["drivers-license","medical","membership","passport","reward","social-security"]};
    const PM_CAT_NAMES={main:"",tech:"Technology",finance:"Finance",personal:"Personal"};
    const vaultShield=(color,sz=16)=><svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={`${color}20`} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 1.5" opacity="0.5"/></svg>;
    const PM_SORTS=[{id:"recent",name:"Most Recent"},{id:"name-az",name:"Name (a-z)"},{id:"name-za",name:"Name (z-a)"},{id:"folder-az",name:"Vault (a-z)"},{id:"folder-za",name:"Vault (z-a)"}];
    const existingFolders=[...new Set(pmCredentials.filter(c=>c.folder).map(c=>c.folder))].sort();
    const allVaults=[...new Set([...Object.keys(pmVaultDefs),...existingFolders])].filter(v=>{const d=pmVaultDefs[v];return!(d&&d.ghost&&!pmGhostUnlocked.has(v))}).sort();
    const gvc=(name)=>(pmVaultDefs[name]&&pmVaultDefs[name].color)||defVC[allVaults.indexOf(name)%defVC.length];
    const typeIcon=(t)=>(PM_TYPES.find(x=>x.id===t)||PM_TYPES[0]).icon;
    const filtered=pmCredentials.filter(c=>{
      if(isGhostLocked(c.folder))return false;
      if(pmFolderFilter&&c.folder!==pmFolderFilter)return false;
      if(pmView==="starred-view")return c.starred;
      if(pmView==="totp-view")return!!c.totpSecret;
      if(!q)return true;
      return(c.siteName||"").toLowerCase().includes(q)||(c.username||"").toLowerCase().includes(q)||(c.siteUrl||"").toLowerCase().includes(q)||(c.fullName||"").toLowerCase().includes(q)||(c.cardHolder||"").toLowerCase().includes(q)
    }).sort((a,b)=>{
      if(pmSortBy==="name-az")return(a.siteName||"").localeCompare(b.siteName||"");
      if(pmSortBy==="name-za")return(b.siteName||"").localeCompare(a.siteName||"");
      if(pmSortBy==="folder-az")return(a.folder||"").localeCompare(b.folder||"");
      if(pmSortBy==="folder-za")return(b.folder||"").localeCompare(a.folder||"");
      return new Date(b.modified)-new Date(a.modified);
    });
    const selCred=pmSelectedId?pmCredentials.find(c=>c.id===pmSelectedId):null;
    const now=new Date();const tod=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const w7=new Date(tod-7*864e5);const m30=new Date(tod-30*864e5);
    const timeGroups=[];
    if(pmSortBy==="recent"){
      const gT=filtered.filter(c=>new Date(c.modified)>=tod);
      const gW=filtered.filter(c=>{const d=new Date(c.modified);return d>=w7&&d<tod});
      const gM=filtered.filter(c=>{const d=new Date(c.modified);return d>=m30&&d<w7});
      const gO=filtered.filter(c=>new Date(c.modified)<m30);
      if(gT.length)timeGroups.push({l:"Today",items:gT});
      if(gW.length)timeGroups.push({l:"Last 7 days",items:gW});
      if(gM.length)timeGroups.push({l:"Last month",items:gM});
      if(gO.length)timeGroups.push({l:"Older",items:gO});
    }else{
      if(filtered.length)timeGroups.push({l:`Sorted by ${PM_SORTS.find(s=>s.id===pmSortBy)?.name||""}`,items:filtered});
    }
    const scCopy=(txt,key)=>{navigator.clipboard.writeText(txt);setPmCopied(key);setTimeout(()=>setPmCopied(""),1500)};
    const itemSub=(c)=>{const t=c.type||"login";if(t==="card")return c.cardNumber?"••••"+c.cardNumber.slice(-4):c.cardHolder||"";if(t==="note")return(c.notes||"").slice(0,40);if(t==="identity")return c.fullName||c.username||"";return c.username||""};
    const itemFav=(c)=>{const t=c.type||"login";if(t!=="login"||!c.siteUrl)return<span style={{fontSize:16}}>{typeIcon(t)}</span>;return<img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(c.siteUrl)}&sz=32`} width="24" height="24" style={{borderRadius:4}} onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentElement.innerHTML=`<span style="font-size:16px">${typeIcon(t)}</span>`}}/>};
    const vCss=`
.sc-item{transition:all 0.15s;cursor:pointer;border-left:3px solid transparent}.sc-item:hover{background:rgba(${T.accentRgb},0.06)!important}
.sc-item.active{background:rgba(${T.accentRgb},0.1)!important;border-left-color:${T.accent}!important}
.sc-grid-item{transition:all 0.2s;cursor:pointer}.sc-grid-item:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(0,0,0,0.2),0 0 12px rgba(${T.accentRgb},0.1)!important}
.sc-vault-btn{transition:all 0.15s;cursor:pointer}.sc-vault-btn:hover{background:rgba(${T.accentRgb},0.06)!important}
.sc-vault-btn.active{background:rgba(${T.accentRgb},0.1)!important}
.sc-field{transition:all 0.15s;border-radius:12px}.sc-field:hover{background:rgba(${T.accentRgb},0.04)!important}
.sc-copy-btn{opacity:0;transition:all 0.15s}.sc-field:hover .sc-copy-btn{opacity:1}
.sc-bottom-btn{transition:all 0.15s;cursor:pointer}.sc-bottom-btn:hover{background:rgba(${T.accentRgb},0.06)!important;color:${T.text}!important}
.sc-dd{position:absolute;top:100%;right:0;margin-top:4px;background:${T.dark?T.bg2||"#1e1e2e":"#fff"};border:1px solid ${T.bdr};border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:50;min-width:180px;padding:4px;overflow:hidden}
.sc-dd button{width:100%;display:flex;align-items:center;gap:10px;padding:8px 12px;background:transparent;border:none;border-radius:6px;color:${T.text};font-size:13px;font-family:inherit;cursor:pointer;text-align:left;transition:all 0.15s}
.sc-dd button:hover{background:rgba(${T.accentRgb},0.08)}
`;
    const rpActive=pmSelectedId||pmView==="add"||pmView==="edit"||pmView==="generator"||pmView==="threat";
    const gridWide=pmViewMode==="grid"&&!rpActive;
    return(<div style={{width:"100vw",height:"100vh",display:"flex",background:T.bg,fontFamily:`${F.body},sans-serif`,color:T.text,overflow:"hidden"}}>
      <style>{css}{vCss}</style>

      {/* ═══ LEFT SIDEBAR ═══ */}
      <div style={{width:260,minWidth:260,height:"100%",background:T.dark?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.02)",borderRight:`1px solid ${T.bdr}`,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 12px 10px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{flexShrink:0}}><ShieldLogo s={56} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn} uid="scSb"/></div>
          <span style={{fontSize:17,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:1.2}}>ShieldCraft</span>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0 10px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 6px 8px"}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:1.2,color:T.dim,textTransform:"uppercase"}}>Vaults</span>
            <button onClick={()=>setPmShowNewVault(!pmShowNewVault)} style={{width:22,height:22,borderRadius:6,background:`rgba(${T.accentRgb},0.12)`,border:"none",color:T.accent,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Create vault">+</button>
          </div>

          {/* New vault form */}
          {pmShowNewVault&&<div style={{padding:"8px",marginBottom:6,borderRadius:8,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${T.bdr}`}}>
            <input value={pmNewVaultName} onChange={e=>setPmNewVaultName(e.target.value)} placeholder="Vault name..." style={{width:"100%",padding:"6px 8px",borderRadius:6,background:"transparent",border:`1px solid ${T.bdr}`,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6,alignItems:"center"}}>
              {defVC.map(c=><button key={c} onClick={()=>setPmNewVaultColor(c)} style={{width:18,height:18,borderRadius:4,background:c,border:pmNewVaultColor===c?`2px solid ${T.text}`:"2px solid transparent",cursor:"pointer",padding:0}}/>)}
              <label style={{width:18,height:18,borderRadius:4,overflow:"hidden",cursor:"pointer",border:`2px solid ${T.bdr}`,position:"relative",background:`conic-gradient(red,yellow,lime,aqua,blue,magenta,red)`}}>
                <input type="color" value={pmNewVaultColor} onChange={e=>setPmNewVaultColor(e.target.value)} style={{position:"absolute",inset:-4,width:"calc(100% + 8px)",height:"calc(100% + 8px)",cursor:"pointer",opacity:0}}/>
              </label>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"pointer",fontSize:11,color:T.text}}>
              <div onClick={()=>setPmGhostCreating(!pmGhostCreating)} style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${pmGhostCreating?T.accent:`rgba(${T.accentRgb},0.3)`}`,background:pmGhostCreating?`rgba(${T.accentRgb},0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{pmGhostCreating&&<span style={{color:T.accent,fontSize:9}}>✓</span>}</div>
              <span>👻 Ghost Vault <span style={{color:T.dim,fontWeight:400}}>(hidden, requires passcode)</span></span>
            </label>
            {pmGhostCreating&&<input value={pmGhostNewCode} onChange={e=>setPmGhostNewCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit passcode" maxLength={6} style={{width:"100%",padding:"6px 8px",borderRadius:6,background:"transparent",border:`1px solid ${T.bdr}`,color:T.text,fontSize:12,fontFamily:"monospace",letterSpacing:4,outline:"none",boxSizing:"border-box",marginBottom:6,textAlign:"center"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/>}
            <div style={{display:"flex",gap:4}}>
              <button onClick={async()=>{if(pmNewVaultName.trim()){if(pmGhostCreating){if(pmGhostNewCode.length!==6)return;await pmCreateGhostVault(pmNewVaultName,pmNewVaultColor,pmGhostNewCode)}else{const nd={...pmVaultDefs,[pmNewVaultName.trim()]:{color:pmNewVaultColor}};setPmVaultDefs(nd);pmSave(null,nd)}setPmNewVaultName("");setPmShowNewVault(false);setPmGhostCreating(false);setPmGhostNewCode("")}}} style={{flex:1,padding:"5px",background:`rgba(${T.accentRgb},0.15)`,border:"none",borderRadius:6,color:T.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Create</button>
              <button onClick={()=>{setPmShowNewVault(false);setPmNewVaultName("");setPmGhostCreating(false);setPmGhostNewCode("")}} style={{flex:1,padding:"5px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:T.dim,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>}

          {/* All Items */}
          <button className={`sc-vault-btn${!pmFolderFilter&&pmView!=="starred-view"&&pmView!=="totp-view"&&pmView!=="generator"&&pmView!=="add"&&pmView!=="edit"&&pmView!=="threat"?" active":""}`} onClick={()=>{setPmFolderFilter(null);setPmView("list")}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:1,background:"transparent",border:"none",borderRadius:8,color:(!pmFolderFilter&&pmView!=="starred-view"&&pmView!=="totp-view"&&pmView!=="generator"&&pmView!=="threat")?T.text:T.dim,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>
            <span style={{width:28,height:28,borderRadius:8,background:`rgba(${T.accentRgb},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IC.Shield/></span>
            <span style={{flex:1,fontWeight:500}}>All Items</span>
            <span style={{fontSize:12,color:T.faint}}>{pmCredentials.filter(c=>!isGhostLocked(c.folder)).length}</span>
          </button>

          {/* Vault entries */}
          {allVaults.map((v,vi)=>{
            const vc=gvc(v);const cnt=pmCredentials.filter(c=>c.folder===v).length;
            return<div key={v} style={{position:"relative"}}>
              <button className={`sc-vault-btn${pmFolderFilter===v?" active":""}`} onClick={()=>{setPmFolderFilter(pmFolderFilter===v?null:v);setPmView("list");setPmEditVaultMenu(null)}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:1,background:"transparent",border:"none",borderRadius:8,color:pmFolderFilter===v?T.text:T.dim,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>
                <span style={{width:28,height:28,borderRadius:8,background:`${vc}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{vaultShield(vc,18)}</span>
                <span style={{flex:1,fontWeight:500}}>{v}</span>
                <span style={{fontSize:12,color:T.faint}}>{cnt}</span>
                <span onClick={e=>{e.stopPropagation();setPmEditVaultMenu(pmEditVaultMenu===v?null:v)}} style={{fontSize:14,color:T.dim,padding:"0 2px",cursor:"pointer",opacity:0.5}}>⋮</span>
              </button>
              {/* Vault edit menu */}
              {pmEditVaultMenu===v&&<div style={{position:"absolute",right:4,top:"100%",zIndex:50,background:T.dark?T.bg2||"#1e1e2e":"#fff",border:`1px solid ${T.bdr}`,borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",padding:4,minWidth:160}}>
                <div style={{padding:"8px 10px 4px",fontSize:10,fontWeight:700,color:T.dim,textTransform:"uppercase",letterSpacing:0.5}}>Color</div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap",padding:"0 10px 8px",alignItems:"center"}}>
                  {defVC.map(c=><button key={c} onClick={()=>{const nd={...pmVaultDefs,[v]:{...pmVaultDefs[v],color:c}};setPmVaultDefs(nd);pmSave(null,nd);setPmEditVaultMenu(null)}} style={{width:18,height:18,borderRadius:4,background:c,border:vc===c?`2px solid ${T.text}`:"2px solid transparent",cursor:"pointer",padding:0}}/>)}
                  <label style={{width:18,height:18,borderRadius:4,overflow:"hidden",cursor:"pointer",border:`2px solid ${T.bdr}`,position:"relative",background:`conic-gradient(red,yellow,lime,aqua,blue,magenta,red)`}}>
                    <input type="color" value={vc} onChange={e=>{const nd={...pmVaultDefs,[v]:{...pmVaultDefs[v],color:e.target.value}};setPmVaultDefs(nd);pmSave(null,nd)}} style={{position:"absolute",inset:-4,width:"calc(100% + 8px)",height:"calc(100% + 8px)",cursor:"pointer",opacity:0}}/>
                  </label>
                </div>
                <button onClick={()=>{const newName=prompt("Rename vault:",v);if(newName&&newName!==v){const upd=pmCredentials.map(c=>c.folder===v?{...c,folder:newName}:c);const nd={...pmVaultDefs};nd[newName]=nd[v]||{color:vc};delete nd[v];setPmVaultDefs(nd);pmSave(upd,nd);setPmEditVaultMenu(null);if(pmFolderFilter===v)setPmFolderFilter(newName)}}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"transparent",border:"none",borderRadius:6,color:T.text,fontSize:12,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>Rename</button>
                <button onClick={()=>{if(confirm(`Delete vault "${v}"? Items will become unassigned.`)){const upd=pmCredentials.map(c=>c.folder===v?{...c,folder:""}:c);const nd={...pmVaultDefs};delete nd[v];setPmVaultDefs(nd);pmSave(upd,nd);setPmEditVaultMenu(null);if(pmFolderFilter===v)setPmFolderFilter(null)}}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"transparent",border:"none",borderRadius:6,color:"#ef4444",fontSize:12,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>Delete</button>
                <button onClick={()=>setPmEditVaultMenu(null)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"transparent",border:"none",borderRadius:6,color:T.dim,fontSize:12,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>Close</button>
              </div>}
            </div>
          })}

          <div style={{height:1,background:T.bdr,margin:"10px 6px"}}/>

          <button className={`sc-vault-btn${pmView==="starred-view"?" active":""}`} onClick={()=>{setPmFolderFilter(null);setPmView("starred-view")}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:1,background:"transparent",border:"none",borderRadius:8,color:pmView==="starred-view"?T.text:T.dim,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>
            <span style={{width:28,height:28,borderRadius:8,background:"rgba(245,158,11,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>⭐</span>
            <span style={{flex:1,fontWeight:500}}>Starred</span>
            <span style={{fontSize:12,color:T.faint}}>{pmCredentials.filter(c=>c.starred).length}</span>
          </button>

          <button className={`sc-vault-btn${pmView==="totp-view"?" active":""}`} onClick={()=>{setPmFolderFilter(null);setPmView("totp-view")}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:1,background:"transparent",border:"none",borderRadius:8,color:pmView==="totp-view"?T.text:T.dim,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>
            <span style={{width:28,height:28,borderRadius:8,background:"rgba(16,185,129,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🔐</span>
            <span style={{flex:1,fontWeight:500}}>With 2FA</span>
            <span style={{fontSize:12,color:T.faint}}>{pmCredentials.filter(c=>c.totpSecret).length}</span>
          </button>

          <button className={`sc-vault-btn${pmView==="threat"?" active":""}`} onClick={()=>{setPmFolderFilter(null);setPmView("threat");setPmSelectedId(null)}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:1,background:"transparent",border:"none",borderRadius:8,color:pmView==="threat"?T.text:T.dim,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}}>
            <span style={{width:28,height:28,borderRadius:8,background:pmCredentials.some(c=>c.breachCheck&&c.breachCheck.breached)?"rgba(239,68,68,0.12)":"rgba(245,158,11,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🛡️</span>
            <span style={{flex:1,fontWeight:500}}>ThreatShield</span>
            {pmCredentials.filter(c=>c.breachCheck&&c.breachCheck.breached).length>0&&<span style={{fontSize:10,fontWeight:700,color:"#fff",background:"#ef4444",borderRadius:10,padding:"1px 6px",minWidth:18,textAlign:"center"}}>{pmCredentials.filter(c=>c.breachCheck&&c.breachCheck.breached).length}</span>}
          </button>

          <div style={{height:1,background:T.bdr,margin:"8px 6px 4px"}}/>

          {/* Ghost Shield unlock */}
          <button className="sc-vault-btn" onClick={()=>{setPmGhostInput(true);setPmGhostErr("");setPmGhostName("");setPmGhostCode("")}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:1,background:"transparent",border:"none",borderRadius:8,color:T.dim,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left",opacity:0.7}}>
            <span style={{width:28,height:28,borderRadius:8,background:"rgba(168,85,247,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>👻</span>
            <span style={{flex:1,fontWeight:500,fontStyle:"italic"}}>Ghost Shield</span>
          </button>
          {/* Unlocked ghost vaults */}
          {[...pmGhostUnlocked].map(gv=>{const def=pmVaultDefs[gv];if(!def)return null;const vc=def.color||"#a855f7";const cnt=pmCredentials.filter(c=>c.folder===gv).length;return<div key={"ghost-"+gv} style={{position:"relative"}}><button className={`sc-vault-btn${pmFolderFilter===gv?" active":""}`} onClick={()=>{setPmFolderFilter(pmFolderFilter===gv?null:gv);setPmView("list")}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:1,background:"transparent",border:"none",borderRadius:8,borderLeft:`2px dashed ${vc}`,color:pmFolderFilter===gv?T.text:T.dim,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left",opacity:0.9}}><span style={{width:28,height:28,borderRadius:8,background:`${vc}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>👻</span><span style={{flex:1,fontWeight:500}}>{gv}</span><span style={{fontSize:12,color:T.faint}}>{cnt}</span><span onClick={e=>{e.stopPropagation();pmLockGhost(gv)}} style={{fontSize:14,color:T.dim,padding:"0 2px",cursor:"pointer",opacity:0.7}} title="Lock ghost vault">🔒</span></button></div>})}
        </div>

        {/* Bottom */}
        <div style={{borderTop:`1px solid ${T.bdr}`,padding:"6px 10px 4px"}}>
          <button className={pmView==="generator"?"sc-vault-btn active":"sc-bottom-btn"} onClick={()=>{setPmView("generator");setPmSelectedId(null)}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",background:pmView==="generator"?`rgba(${T.accentRgb},0.1)`:"transparent",border:"none",borderRadius:8,color:pmView==="generator"?T.accent:T.dim,fontSize:13,fontFamily:"inherit",textAlign:"left",cursor:"pointer"}}>
            <span>⚡</span><span>Generator</span>
          </button>
          <button className="sc-bottom-btn" onClick={()=>setPmShowThemes(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",background:"transparent",border:"none",borderRadius:8,color:T.dim,fontSize:13,fontFamily:"inherit",textAlign:"left",cursor:"pointer"}}>
            <span>🎨</span><span>Themes</span>
          </button>
          <button className="sc-bottom-btn" onClick={()=>{setPmIsLoggedIn(false);setPmCredentials([]);pmStorageRef.current=null;pmUserRef.current=null;pmLockAllGhosts()}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",background:"transparent",border:"none",borderRadius:8,color:T.dim,fontSize:13,fontFamily:"inherit",textAlign:"left",cursor:"pointer"}}>
            <span>🔒</span><span>Lock ShieldCraft</span>
          </button>
          <button className="sc-bottom-btn" onClick={()=>{setInfoPage(null);setShowLanding(true)}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 8px",marginBottom:4,background:"transparent",border:"none",borderRadius:8,color:T.dim,fontSize:13,fontFamily:"inherit",textAlign:"left",cursor:"pointer"}}>
            <span>🦋</span><span>NotesCraft</span>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 8px 8px",borderTop:`1px solid ${T.bdr}`}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,flexShrink:0}}>{(pmUserRef.current||email||"?")[0].toUpperCase()}</div>
            <div style={{flex:1,overflow:"hidden"}}>
              <div style={{fontSize:12,fontWeight:600,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{pmUserRef.current||email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MIDDLE COLUMN ═══ */}
      <div style={{...(gridWide?{flex:1,minWidth:350}:{width:350,minWidth:350}),height:"100%",borderRight:gridWide?"none":`1px solid ${T.bdr}`,display:"flex",flexDirection:"column",background:T.dark?"rgba(255,255,255,0.008)":"rgba(0,0,0,0.01)"}}>
        <div style={{padding:"14px 16px 0"}}>
          <div style={{position:"relative",marginBottom:12}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.dim,fontSize:14,pointerEvents:"none"}}>🔍</span>
            <input value={pmSearch} onChange={e=>setPmSearch(e.target.value)} placeholder="Search in all items..." style={{width:"100%",padding:"10px 14px 10px 36px",borderRadius:8,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/>
          </div>
          {/* Controls row */}
          <div style={{display:"flex",alignItems:"center",gap:6,paddingBottom:10}}>
            {/* View mode toggle */}
            <div style={{display:"flex",border:`1px solid ${T.bdr}`,borderRadius:6,overflow:"hidden"}}>
              <button onClick={()=>setPmViewMode("list")} style={{padding:"4px 8px",background:pmViewMode==="list"?`rgba(${T.accentRgb},0.15)`:"transparent",border:"none",color:pmViewMode==="list"?T.accent:T.dim,fontSize:13,cursor:"pointer"}} title="List view">☰</button>
              <button onClick={()=>setPmViewMode("grid")} style={{padding:"4px 8px",background:pmViewMode==="grid"?`rgba(${T.accentRgb},0.15)`:"transparent",border:"none",color:pmViewMode==="grid"?T.accent:T.dim,fontSize:13,cursor:"pointer"}} title="Grid view">⊞</button>
            </div>
            {/* Sort dropdown */}
            <div style={{position:"relative"}}>
              <button onClick={()=>{setPmSortOpen(!pmSortOpen);setPmCreateMenu(false)}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${T.bdr}`,background:"transparent",color:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                Sort: {PM_SORTS.find(s=>s.id===pmSortBy)?.name||"Recent"} <span style={{fontSize:8}}>▼</span>
              </button>
              {pmSortOpen&&<><div style={{position:"fixed",inset:0,zIndex:49}} onClick={()=>setPmSortOpen(false)}/><div className="sc-dd" style={{left:0,right:"auto"}}>
                {PM_SORTS.map(s=><button key={s.id} onClick={()=>{setPmSortBy(s.id);setPmSortOpen(false)}} style={{color:pmSortBy===s.id?T.accent:T.text,fontWeight:pmSortBy===s.id?600:400}}>{s.name}{pmSortBy===s.id&&<span style={{marginLeft:"auto"}}>✓</span>}</button>)}
              </div></>}
            </div>
            <div style={{flex:1}}/>
            {/* Create Item dropdown */}
            <div style={{position:"relative"}}>
              <button onClick={()=>{setPmCreateMenu(!pmCreateMenu);setPmSortOpen(false)}} style={{padding:"5px 12px",borderRadius:20,border:`1px solid rgba(${T.accentRgb},0.25)`,background:`rgba(${T.accentRgb},0.08)`,color:T.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Create item</button>
              {pmCreateMenu&&<><div style={{position:"fixed",inset:0,zIndex:49}} onClick={()=>setPmCreateMenu(false)}/><div className="sc-dd" style={{maxHeight:420,overflowY:"auto",minWidth:220}}>
                {Object.entries(PM_CAT).map(([cat,ids])=><div key={cat}>
                  {PM_CAT_NAMES[cat]&&<div style={{padding:"8px 12px 4px",fontSize:10,fontWeight:700,color:T.dim,textTransform:"uppercase",letterSpacing:0.5}}>{PM_CAT_NAMES[cat]}</div>}
                  {ids.map(id=>{const t=PM_TYPES.find(x=>x.id===id);return t?<button key={t.id} onClick={()=>{pmClearForm();setPmFormType(t.id);setPmView("add");setPmSelectedId(null);setPmCreateMenu(false)}}><span style={{fontSize:14,width:22,textAlign:"center"}}>{t.icon}</span>{t.name}</button>:null})}
                </div>)}
              </div></>}
            </div>
          </div>
        </div>

        {/* Credential list/grid */}
        <div style={{flex:1,overflowY:"auto",padding:pmViewMode==="grid"?"0 12px":"0"}}>
          {!filtered.length&&<div style={{textAlign:"center",padding:"60px 20px",color:T.dim,fontSize:13}}>{pmCredentials.length?`No results for "${pmSearch}"`:"Your vault is empty"}</div>}

          {pmViewMode==="grid"?
            /* ── GRID VIEW ── */
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10,paddingBottom:20}}>
              {filtered.map(c=><div key={c.id} className="sc-grid-item" onClick={()=>{setPmSelectedId(c.id);if(pmView==="add"||pmView==="edit"||pmView==="generator")setPmView("list")}} style={{padding:"16px 12px",borderRadius:12,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${pmSelectedId===c.id?T.accent:T.bdr}`,textAlign:"center",position:"relative",cursor:"pointer"}}>
                <div style={{width:40,height:40,borderRadius:10,background:T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",overflow:"hidden"}}>{itemFav(c)}</div>
                <div style={{fontSize:13,fontWeight:600,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:2}}>{c.siteName||c.fullName||"Untitled"}</div>
                <div style={{fontSize:11,color:T.dim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{itemSub(c)}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:6}}>
                  <span style={{fontSize:10,opacity:0.6}}>{typeIcon(c.type||"login")}</span>
                  {c.starred&&<span style={{color:"#f59e0b",fontSize:10}}>★</span>}
                  {c.totpSecret&&<span style={{fontSize:9,color:T.accent,background:`rgba(${T.accentRgb},0.1)`,padding:"0 4px",borderRadius:3,fontWeight:600}}>2FA</span>}
                </div>
                {c.folder&&<div style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:gvc(c.folder)}}/>}
                {c.breachCheck&&c.breachCheck.breached&&<div style={{position:"absolute",top:6,left:6,width:18,height:18,borderRadius:"50%",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}} title={`Found in ${c.breachCheck.count} breaches`}>⚠️</div>}
              </div>)}
            </div>
          :
            /* ── LIST VIEW ── */
            <div>
              {timeGroups.map((g,gi)=><div key={gi}>
                <div style={{padding:"12px 16px 6px",fontSize:11,fontWeight:700,color:T.faint,letterSpacing:0.5,textTransform:"uppercase"}}>{g.l}</div>
                {g.items.map(c=><div key={c.id} className={`sc-item${pmSelectedId===c.id?" active":""}`} onClick={()=>{setPmSelectedId(c.id);if(pmView==="add"||pmView==="edit"||pmView==="generator")setPmView("list")}} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"transparent",borderBottom:`1px solid ${T.bdr}`}}>
                  <div style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>{itemFav(c)}</div>
                  <div style={{flex:1,overflow:"hidden"}}>
                    <div style={{fontSize:14,fontWeight:600,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.siteName||c.fullName||"Untitled"}</div>
                    <div style={{fontSize:12,color:T.dim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{itemSub(c)}</div>
                  </div>
                  {c.breachCheck&&c.breachCheck.breached&&<span style={{fontSize:11,color:"#ef4444",flexShrink:0}} title={`${c.breachCheck.count} breaches`}>⚠️</span>}
                  {c.folder&&<div style={{width:8,height:8,borderRadius:"50%",background:gvc(c.folder),flexShrink:0}}/>}
                  {c.starred&&<span style={{color:"#f59e0b",fontSize:12}}>★</span>}
                </div>)}
              </div>)}
            </div>
          }
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      {!gridWide&&<div style={{flex:1,height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>

        {/* ─── THEME PICKER OVERLAY ─── */}
        {pmShowThemes&&<div style={{position:"absolute",inset:0,zIndex:100,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={()=>setPmShowThemes(false)}>
          <div style={{width:640,maxHeight:"80vh",background:T.bg,borderRadius:16,border:`1px solid ${T.bdr}`,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"18px 24px",borderBottom:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <h2 style={{fontSize:18,fontWeight:700,fontFamily:`${F.heading},sans-serif`,margin:0}}>Choose Theme</h2>
              <button onClick={()=>setPmShowThemes(false)} style={{background:"none",border:"none",color:T.dim,fontSize:20,cursor:"pointer",padding:4}}>×</button>
            </div>
            <div style={{padding:20,overflowY:"auto",maxHeight:"65vh",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
              {Object.values(THEMES).map(th=><button key={th.id} onClick={()=>{setThemeId(th.id)}} style={{padding:0,background:"transparent",border:themeId===th.id?`2px solid ${th.accent}`:`2px solid transparent`,borderRadius:10,cursor:"pointer",overflow:"hidden",textAlign:"center"}}>
                <div style={{height:48,background:th.bg,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                  <div style={{width:14,height:14,borderRadius:"50%",background:th.accent,boxShadow:`0 0 8px ${th.accent}`}}/>
                  {th.accent2&&<div style={{width:8,height:8,borderRadius:"50%",background:th.accent2}}/>}
                </div>
                <div style={{padding:"6px 4px",background:th.dark?"rgba(0,0,0,0.3)":"rgba(255,255,255,0.8)"}}>
                  <div style={{fontSize:10,fontWeight:600,color:th.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{th.icon} {th.name}</div>
                </div>
              </button>)}
            </div>
          </div>
        </div>}

        {/* ─── ADD / EDIT FORM ─── */}
        {(pmView==="add"||pmView==="edit")&&<div style={{flex:1,overflowY:"auto",padding:"32px 40px"}}>
          <div style={{maxWidth:560,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:700,fontFamily:`${F.heading},sans-serif`,margin:0}}>{pmView==="add"?`Add ${(PM_TYPES.find(t=>t.id===pmFormType)||PM_TYPES[0]).name}`:"Edit Item"}</h2>
              <div style={{display:"flex",gap:8}}>
                {pmView==="edit"&&<button onClick={()=>{if(pmDelConfirm===pmSelectedId){pmDeleteCredential(pmSelectedId);pmClearForm();setPmSelectedId(null);setPmView("list")}else{setPmDelConfirm(pmSelectedId)}}} style={{padding:"7px 14px",background:pmDelConfirm===pmSelectedId?"rgba(239,68,68,0.15)":"transparent",border:`1px solid ${pmDelConfirm===pmSelectedId?"rgba(239,68,68,0.4)":"rgba(239,68,68,0.2)"}`,borderRadius:8,color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{pmDelConfirm===pmSelectedId?"Confirm Delete":"Delete"}</button>}
                <button onClick={()=>{pmClearForm();setPmSelectedId(null);setPmView("list");setPmDelConfirm(null)}} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:8,color:T.dim,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              </div>
            </div>
            {/* Type indicator */}
            {(()=>{const ct=PM_TYPES.find(t=>t.id===pmFormType)||PM_TYPES[0];return<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",borderRadius:8,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${T.bdr}`}}><span style={{fontSize:16}}>{ct.icon}</span><span style={{fontSize:13,fontWeight:600,color:T.text}}>{ct.name}</span>{pmView==="add"&&<button onClick={()=>setPmCreateMenu(!pmCreateMenu)} style={{marginLeft:"auto",padding:"3px 10px",borderRadius:6,background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.2)`,color:T.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Change</button>}</div>})()}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Common: Name */}
              <div>
                <label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>{pmFormType==="identity"?"Identity Name":pmFormType==="card"?"Card Name":pmFormType==="note"?"Title":"Name"}</label>
                <input value={pmFormSite} onChange={e=>setPmFormSite(e.target.value)} placeholder={pmFormType==="card"?"My Visa Card":pmFormType==="note"?"Note title":pmFormType==="identity"?"Primary Identity":pmFormType==="api"?"GitHub API":pmFormType==="database"?"Production DB":pmFormType==="server"?"Web Server":pmFormType==="ssh"?"Dev Server SSH":pmFormType==="wifi"?"Office WiFi":pmFormType==="software"?"Adobe CC":pmFormType==="bank"?"Chase Checking":pmFormType==="crypto"?"MetaMask Wallet":"Item name"} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/>
              </div>
              {/* Credential fields (login + all tech/finance/personal types) */}
              {pmFormType!=="card"&&pmFormType!=="note"&&pmFormType!=="identity"&&<>
                {(()=>{const ft=pmFormType;const flds=[
                  ft==="ssh"?{l:"Host / Server",v:pmFormUrl,s:setPmFormUrl,ph:"192.168.1.1"}:ft==="wifi"?{l:"Network Name (SSID)",v:pmFormUrl,s:setPmFormUrl,ph:"MyWiFi-5G"}:ft==="api"?{l:"API Endpoint",v:pmFormUrl,s:setPmFormUrl,ph:"https://api.example.com/v1"}:ft==="database"?{l:"Connection String / Host",v:pmFormUrl,s:setPmFormUrl,ph:"db.example.com:5432"}:ft==="server"?{l:"Host / IP Address",v:pmFormUrl,s:setPmFormUrl,ph:"192.168.1.100"}:ft==="software"?{l:"Product URL",v:pmFormUrl,s:setPmFormUrl,ph:"https://example.com"}:ft==="bank"?{l:"Bank / Institution",v:pmFormUrl,s:setPmFormUrl,ph:"Chase, Wells Fargo..."}:ft==="crypto"?{l:"Wallet Address",v:pmFormUrl,s:setPmFormUrl,ph:"0x1234..."}:{l:"URL",v:pmFormUrl,s:setPmFormUrl,ph:"https://github.com"},
                  ft==="ssh"?{l:"Username",v:pmFormUser,s:setPmFormUser,ph:"root"}:ft==="api"?{l:"API Key / Client ID",v:pmFormUser,s:setPmFormUser,ph:"sk-abc123..."}:ft==="database"?{l:"Username",v:pmFormUser,s:setPmFormUser,ph:"admin"}:ft==="software"?{l:"License Key",v:pmFormUser,s:setPmFormUser,ph:"XXXX-XXXX-XXXX-XXXX"}:ft==="bank"?{l:"Account Number",v:pmFormUser,s:setPmFormUser,ph:"1234567890"}:ft==="crypto"?{l:"Seed Phrase / Private Key",v:pmFormUser,s:setPmFormUser,ph:"word1 word2 word3..."}:ft==="wifi"?{l:"Security Type",v:pmFormUser,s:setPmFormUser,ph:"WPA2-Personal"}:{l:"Username / Email",v:pmFormUser,s:setPmFormUser,ph:"user@example.com"}
                ];return flds.map((f,i)=><div key={i}><label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.ph} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/></div>)})()}
                <div><label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>{pmFormType==="ssh"?"SSH Key / Passphrase":pmFormType==="api"?"API Secret":pmFormType==="wifi"?"WiFi Password":pmFormType==="crypto"?"Wallet Password":pmFormType==="software"?"Activation Code":"Password"}</label><div style={{display:"flex",gap:8}}>
                  <input type="password" value={pmFormPw} onChange={e=>setPmFormPw(e.target.value)} placeholder={pmFormType==="ssh"?"Private key or passphrase":pmFormType==="api"?"Secret key":"Enter password"} style={{flex:1,padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/>
                  <button onClick={()=>{const g=generateRandomPw(20,true,true,true,true,false);setPmFormPw(g)}} style={{padding:"8px 14px",background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.25)`,borderRadius:10,color:T.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Generate</button>
                </div></div>
                {pmFormType==="login"&&<div><label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>TOTP Secret (optional)</label><input value={pmFormTotp} onChange={e=>setPmFormTotp(e.target.value)} placeholder="JBSWY3DPEHPK3PXP" style={{width:"100%",padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/></div>}
              </>}
              {/* Card fields */}
              {pmFormType==="card"&&<>
                {[{l:"Cardholder Name",v:pmFormCardHolder,s:setPmFormCardHolder,ph:"John Doe"},{l:"Card Number",v:pmFormCardNum,s:setPmFormCardNum,ph:"4532 0151 1283 0366"},{l:"Expiry Date",v:pmFormCardExp,s:setPmFormCardExp,ph:"12/28"},{l:"CVV",v:pmFormCardCvv,s:setPmFormCardCvv,ph:"847"}].map((f,i)=><div key={i}><label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.ph} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/></div>)}
              </>}
              {/* Identity fields */}
              {pmFormType==="identity"&&<>
                {[{l:"Full Name",v:pmFormFullName,s:setPmFormFullName,ph:"John Doe"},{l:"Email",v:pmFormUser,s:setPmFormUser,ph:"john@example.com"},{l:"Phone",v:pmFormPhone,s:setPmFormPhone,ph:"+64 21 123 4567"},{l:"Address",v:pmFormAddress,s:setPmFormAddress,ph:"123 Main St, City"}].map((f,i)=><div key={i}><label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>{f.l}</label><input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.ph} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/></div>)}
              </>}
              {/* Notes (all types) */}
              <div><label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>Notes</label><textarea value={pmFormNotes} onChange={e=>setPmFormNotes(e.target.value)} placeholder={pmFormType==="note"?"Write your note here...":"Additional notes (optional)"} rows={pmFormType==="note"?8:3} style={{width:"100%",padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",resize:"vertical"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/></div>
              {/* Vault selector */}
              <div><label style={{fontSize:11,fontWeight:600,color:T.dim,display:"block",marginBottom:5,letterSpacing:0.5,textTransform:"uppercase"}}>Vault</label><div style={{display:"flex",gap:8}}>
                <select value={allVaults.includes(pmFormFolder)?pmFormFolder:""} onChange={e=>setPmFormFolder(e.target.value)} style={{flex:1,padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}>
                  <option value="">No vault</option>
                  {allVaults.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
                <input value={!allVaults.includes(pmFormFolder)?pmFormFolder:""} onChange={e=>setPmFormFolder(e.target.value)} placeholder="Or type new..." style={{flex:1,padding:"10px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=T.bdr}}/>
              </div>{pmFormFolder&&pmVaultDefs[pmFormFolder]&&pmVaultDefs[pmFormFolder].ghost&&<div style={{fontSize:10,color:"#facc15",marginTop:4,display:"flex",alignItems:"center",gap:4}}><span>👻</span> This is a ghost vault. Items will be hidden unless unlocked.</div>}</div>
              {/* Star */}
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:T.text}}>
                <div onClick={()=>setPmFormStarred(!pmFormStarred)} style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${pmFormStarred?T.accent:`rgba(${T.accentRgb},0.3)`}`,background:pmFormStarred?`rgba(${T.accentRgb},0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{pmFormStarred&&<span style={{color:T.accent,fontSize:11}}>★</span>}</div>
                Star this item
              </label>
              {/* TOTP display in edit */}
              {pmView==="edit"&&pmFormTotp&&pmTotpCodes[pmSelectedId]&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:12,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${T.bdr}`}}>
                <span style={{fontSize:11,color:T.dim,fontWeight:600}}>TOTP:</span>
                <span style={{fontSize:22,fontFamily:"monospace",fontWeight:700,color:T.accent,letterSpacing:3}}>{pmTotpCodes[pmSelectedId]}</span>
                <div style={{width:24,height:24,position:"relative"}}><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke={`rgba(${T.accentRgb},0.15)`} strokeWidth="2"/><circle cx="12" cy="12" r="10" fill="none" stroke={T.accent} strokeWidth="2" strokeDasharray={`${(pmTotpRemaining/30)*62.8} 62.8`} strokeLinecap="round" transform="rotate(-90 12 12)" style={{transition:"stroke-dasharray 0.3s"}}/></svg><span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:T.dim}}>{pmTotpRemaining}</span></div>
                <button onClick={()=>{navigator.clipboard.writeText(pmTotpCodes[pmSelectedId]);setPmCopied("totp");setTimeout(()=>setPmCopied(""),1500)}} style={{marginLeft:"auto",background:"none",border:"none",color:pmCopied==="totp"?T.accent:T.dim,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="totp"?"Copied!":"Copy"}</button>
              </div>}
              {/* Save button */}
              <button onClick={pmView==="add"?pmAddCredential:pmUpdateCredential} disabled={!pmFormSite&&pmFormType!=="note"} style={{padding:"12px 0",background:(!pmFormSite&&pmFormType!=="note")?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:12,color:(!pmFormSite&&pmFormType!=="note")?T.dim:"#fff",fontSize:14,fontWeight:700,cursor:(!pmFormSite&&pmFormType!=="note")?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:1,marginTop:4,boxShadow:(!pmFormSite&&pmFormType!=="note")?"none":`0 4px 20px rgba(${T.accentRgb},0.35)`}}>{pmView==="add"?"Save":"Update"}</button>
            </div>
          </div>
        </div>}

        {/* ─── GENERATOR VIEW ─── */}
        {pmView==="generator"&&<div style={{flex:1,overflowY:"auto",padding:"32px 40px"}}>
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <h2 style={{fontSize:20,fontWeight:700,fontFamily:`${F.heading},sans-serif`,margin:0}}>Password Generator</h2>
              <button onClick={()=>setPmView("list")} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:8,color:T.dim,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Back</button>
            </div>
            <div style={{background:pgQuantumSafe?"rgba(16,185,129,0.05)":"rgba(255,255,255,0.06)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:pgQuantumSafe?`2px solid rgba(16,185,129,${pgScrambling?0.9:0.5})`:`2px solid ${pgScrambling?T.accent:`rgba(${T.accentRgb},0.45)`}`,borderRadius:16,padding:"22px 26px",marginBottom:20,position:"relative",transition:"all 0.4s",boxShadow:pgQuantumSafe?`0 6px 30px rgba(0,0,0,0.25),0 0 ${pgScrambling?40:18}px rgba(16,185,129,${pgScrambling?0.45:0.2})`:`0 6px 30px rgba(0,0,0,0.25),0 0 ${pgScrambling?40:18}px rgba(${T.accentRgb},${pgScrambling?0.4:0.18})`,overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,backgroundImage:pgQuantumSafe?"repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(16,185,129,0.15) 18px,rgba(16,185,129,0.15) 36px)":`repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(${T.accentRgb},0.12) 18px,rgba(${T.accentRgb},0.12) 36px)`,backgroundSize:"50px 50px",animation:"pgStripeMove 3s linear infinite",pointerEvents:"none",borderRadius:14}}/>
              <div style={{position:"relative",zIndex:1,fontSize:(pgDisplay||pgResult).length>30?14:18,fontFamily:"monospace",fontWeight:600,color:pgScrambling?(pgQuantumSafe?"#10b981":T.accent):T.text,wordBreak:"break-all",lineHeight:1.6,letterSpacing:0.5,minHeight:28,paddingRight:90}}>{pgHidden&&!pgScrambling?"•".repeat(Math.min((pgDisplay||pgResult).length,40)):(pgDisplay||pgResult)}</div>
              <div style={{position:"absolute",top:14,right:14,zIndex:2,display:"flex",gap:8}}>
                <button onClick={()=>setPgHidden(!pgHidden)} style={{width:36,height:36,borderRadius:"50%",background:`rgba(${T.accentRgb},0.15)`,border:`2px solid rgba(${T.accentRgb},0.5)`,color:T.accent,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title={pgHidden?"Show":"Hide"}>{pgHidden?"🙈":"🐵"}</button>
                <button onClick={()=>{const cw=pgUseCustom?pgCustomWords:"";if(cw){const err=validateCustomWords(cw);setPgCustomErr(err);if(err)return}else{setPgCustomErr("")}const pw=pgMode==="random"?generateRandomPw(pgLen,pgUpper,pgLower,pgDigits,pgSymbols,pgNoAmbig):generateMemorablePw(pgWords,pgDigits,pgSymbols,pgSep,cw);setPgResult(pw);setPgStrength(calcPwStrength(pw));setPgCopied(false);setPgHidden(false)}} style={{width:36,height:36,borderRadius:"50%",background:`rgba(${T.accentRgb},0.15)`,border:`2px solid rgba(${T.accentRgb},0.5)`,color:T.accent,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Regenerate">&#x21bb;</button>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <button onClick={()=>{navigator.clipboard.writeText(pgResult);setPgCopied(true);setTimeout(()=>setPgCopied(false),2000)}} style={{flex:1,padding:"12px 0",background:pgCopied?`rgba(${T.accentRgb},0.15)`:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:pgCopied?`1px solid ${T.accent}`:"none",borderRadius:12,color:pgCopied?T.accent:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>{pgCopied?"Copied!":"Copy Password"}</button>
            </div>
            {pgStrength&&<div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:600,color:T.dim}}>Strength</span>
                <span style={{fontSize:11,fontWeight:700,color:pgStrength.color||T.dim}}>{pgStrength.label||"—"}</span>
              </div>
              <div style={{height:4,borderRadius:2,background:`rgba(${T.accentRgb},0.1)`,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,background:pgStrength.color||T.accent,width:`${pgStrength.percent||0}%`,transition:"all 0.4s"}}/>
              </div>
            </div>}
            <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${T.bdr}`,padding:"18px 20px",borderRadius:14}}>
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {["random","memorable"].map(m=><button key={m} onClick={()=>setPgMode(m)} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${pgMode===m?T.accent:`rgba(${T.accentRgb},0.15)`}`,background:pgMode===m?`rgba(${T.accentRgb},0.12)`:"transparent",color:pgMode===m?T.accent:T.dim,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{m==="random"?"Random":"Memorable"}</button>)}
              </div>
              {pgMode==="random"?<div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><label style={{fontSize:12,fontWeight:600,color:T.text}}>Length</label><span style={{fontSize:13,fontWeight:700,color:T.accent}}>{pgLen}</span></div><input type="range" min={pgQuantumSafe?65:8} max={256} value={pgLen} onChange={e=>setPgLen(+e.target.value)} className={pgQuantumSafe?"pg-slider-qm":"pg-slider"}/></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  {[{l:"Uppercase",v:pgUpper,s:setPgUpper},{l:"Lowercase",v:pgLower,s:setPgLower},{l:"Digits",v:pgDigits,s:setPgDigits},{l:"Symbols",v:pgSymbols,s:setPgSymbols},{l:"No ambiguous",v:pgNoAmbig,s:setPgNoAmbig}].map((o,i)=><label key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.text,cursor:"pointer"}}><div onClick={()=>o.s(!o.v)} style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${o.v?T.accent:`rgba(${T.accentRgb},0.3)`}`,background:o.v?`rgba(${T.accentRgb},0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{o.v&&<span style={{color:T.accent,fontSize:9}}>✓</span>}</div>{o.l}</label>)}
                </div>
              </div>:<div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><label style={{fontSize:12,fontWeight:600,color:T.text}}>Words</label><span style={{fontSize:13,fontWeight:700,color:T.accent}}>{pgWords}</span></div><input type="range" min={2} max={8} value={pgWords} onChange={e=>setPgWords(+e.target.value)} className="pg-slider"/></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.text,cursor:"pointer"}}><div onClick={()=>setPgDigits(!pgDigits)} style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${pgDigits?T.accent:`rgba(${T.accentRgb},0.3)`}`,background:pgDigits?`rgba(${T.accentRgb},0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{pgDigits&&<span style={{color:T.accent,fontSize:9}}>✓</span>}</div>Number</label>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.text,cursor:"pointer"}}><div onClick={()=>setPgSymbols(!pgSymbols)} style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${pgSymbols?T.accent:`rgba(${T.accentRgb},0.3)`}`,background:pgSymbols?`rgba(${T.accentRgb},0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{pgSymbols&&<span style={{color:T.accent,fontSize:9}}>✓</span>}</div>Symbol</label>
                </div>
                <div><label style={{fontSize:12,fontWeight:600,color:T.text,display:"block",marginBottom:4}}>Separator</label><select value={pgSep} onChange={e=>setPgSep(e.target.value)} style={{padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none"}}>{[{l:"Hyphens",v:"-"},{l:"Spaces",v:" "},{l:"Dots",v:"."},{l:"Underscores",v:"_"},{l:"None",v:""}].map(s=><option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
              </div>}
            </div>
          </div>
        </div>}

        {/* ─── THREATSHIELD VIEW ─── */}
        {pmView==="threat"&&<div style={{flex:1,overflowY:"auto",padding:"32px 40px"}}>
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
              <div style={{width:56,height:56,borderRadius:14,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🛡️</div>
              <div><h2 style={{fontSize:22,fontWeight:700,fontFamily:`${F.heading},sans-serif`,margin:0}}>ThreatShield</h2><div style={{fontSize:12,color:T.dim,marginTop:2}}>Dark Web Monitoring</div></div>
              <button onClick={()=>setPmView("list")} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:8,color:T.dim,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Back</button>
            </div>
            <button onClick={pmThreatScanning?()=>{pmThreatAbortRef.current=true}:pmScanThreats} style={{width:"100%",padding:"14px 0",background:pmThreatScanning?"rgba(239,68,68,0.1)":"linear-gradient(135deg,#ef4444,#dc2626)",border:pmThreatScanning?"1px solid rgba(239,68,68,0.3)":"none",borderRadius:12,color:pmThreatScanning?"#ef4444":"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,marginBottom:16,boxShadow:pmThreatScanning?"none":"0 4px 20px rgba(239,68,68,0.35)"}}>{pmThreatScanning?`Scanning... ${pmThreatProgress.done}/${pmThreatProgress.total} — Click to Cancel`:"Scan All Passwords"}</button>
            {pmThreatScanning&&<div style={{height:4,borderRadius:2,background:"rgba(239,68,68,0.1)",overflow:"hidden",marginBottom:16}}><div style={{height:"100%",borderRadius:2,background:"#ef4444",width:`${pmThreatProgress.total?(pmThreatProgress.done/pmThreatProgress.total*100):0}%`,transition:"width 0.3s"}}/></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
              {[{label:"Scanned",value:pmCredentials.filter(c=>c.breachCheck).length,icon:"🔍",color:T.accent},{label:"Compromised",value:pmCredentials.filter(c=>c.breachCheck&&c.breachCheck.breached).length,icon:"⚠️",color:"#ef4444"},{label:"Safe",value:pmCredentials.filter(c=>c.breachCheck&&!c.breachCheck.breached).length,icon:"✅",color:"#4ade80"}].map((s,i)=><div key={i} style={{padding:"16px 14px",borderRadius:12,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${T.bdr}`,textAlign:"center"}}><div style={{fontSize:18,marginBottom:4}}>{s.icon}</div><div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.value}</div><div style={{fontSize:11,color:T.dim,marginTop:2}}>{s.label}</div></div>)}
            </div>
            {pmThreatLastScan&&<div style={{fontSize:11,color:T.faint,marginBottom:16,textAlign:"center"}}>Last full scan: {new Date(pmThreatLastScan).toLocaleString()}</div>}
            {pmCredentials.filter(c=>c.breachCheck&&c.breachCheck.breached).length>0&&<>
              <div style={{fontSize:12,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>Compromised Credentials</div>
              {pmCredentials.filter(c=>c.breachCheck&&c.breachCheck.breached).map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",marginBottom:4,borderRadius:10,background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.15)",cursor:"pointer"}} onClick={()=>{setPmSelectedId(c.id);setPmView("list")}}>
                <div style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{itemFav(c)}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text}}>{c.siteName||"Untitled"}</div><div style={{fontSize:11,color:T.dim}}>{c.username}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:700,color:"#ef4444"}}>{c.breachCheck.count.toLocaleString()} breaches</div><div style={{fontSize:9,color:T.faint}}>{new Date(c.breachCheck.checkedAt).toLocaleDateString()}</div></div>
                <button onClick={e=>{e.stopPropagation();pmEditCredential(c)}} style={{padding:"5px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:6,color:"#ef4444",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Change Password</button>
              </div>)}
            </>}
            {pmCredentials.filter(c=>c.breachCheck&&!c.breachCheck.breached).length>0&&<>
              <div style={{fontSize:12,fontWeight:700,color:"#4ade80",letterSpacing:0.5,textTransform:"uppercase",marginTop:16,marginBottom:8}}>Safe Credentials</div>
              {pmCredentials.filter(c=>c.breachCheck&&!c.breachCheck.breached).map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",marginBottom:2,borderRadius:8,background:T.dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.01)"}}><span style={{fontSize:12}}>✅</span><span style={{fontSize:13,color:T.text,fontWeight:500}}>{c.siteName||"Untitled"}</span><span style={{fontSize:11,color:T.faint,marginLeft:"auto"}}>{new Date(c.breachCheck.checkedAt).toLocaleDateString()}</span></div>)}
            </>}
            {!pmCredentials.some(c=>c.breachCheck)&&!pmThreatScanning&&<div style={{textAlign:"center",padding:"40px 20px",color:T.dim}}><div style={{fontSize:40,marginBottom:12}}>🛡️</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No scan results yet</div><div style={{fontSize:12}}>Click "Scan All Passwords" to check your credentials against known data breaches.</div></div>}
          </div>
        </div>}

        {/* ─── DETAIL VIEW ─── */}
        {pmView!=="add"&&pmView!=="edit"&&pmView!=="generator"&&pmView!=="threat"&&selCred&&<div style={{flex:1,overflowY:"auto",padding:"32px 40px"}}>
          {selCred.breachCheck&&selCred.breachCheck.breached&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:12,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:16}}><span style={{fontSize:20}}>⚠️</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#ef4444"}}>Password Compromised</div><div style={{fontSize:11,color:T.dim}}>Found in {selCred.breachCheck.count.toLocaleString()} known data breaches. Change your password immediately.</div></div><button onClick={()=>pmEditCredential(selCred)} style={{padding:"6px 14px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,color:"#ef4444",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Change Password</button></div>}
          <div style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:16}}>
              <div style={{width:56,height:56,borderRadius:14,background:T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:700,color:T.accent,flexShrink:0,overflow:"hidden"}}>
                {(selCred.type||"login")==="login"&&selCred.siteUrl?<img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(selCred.siteUrl)}&sz=64`} width="40" height="40" style={{borderRadius:6}} onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentElement.textContent=(selCred.siteName||"?")[0].toUpperCase()}}/>:<span style={{fontSize:28}}>{typeIcon(selCred.type||"login")}</span>}
              </div>
              <div style={{flex:1}}>
                <h1 style={{fontSize:24,fontWeight:700,fontFamily:`${F.heading},sans-serif`,margin:"0 0 6px"}}>{selCred.siteName||selCred.fullName||"Untitled"}</h1>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {selCred.folder&&<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:6,background:`${gvc(selCred.folder)}22`,color:gvc(selCred.folder),fontSize:11,fontWeight:600}}>{vaultShield(gvc(selCred.folder),13)} {selCred.folder}</span>}
                  <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:6,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",color:T.dim,fontSize:11,fontWeight:500}}>{typeIcon(selCred.type||"login")} {(PM_TYPES.find(t=>t.id===(selCred.type||"login"))||PM_TYPES[0]).name}</span>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>pmEditCredential(selCred)} style={{padding:"8px 20px",background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.25)`,borderRadius:8,color:T.accent,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
              <button onClick={()=>{if(pmDelConfirm===selCred.id){pmDeleteCredential(selCred.id);setPmSelectedId(null);setPmDelConfirm(null)}else{setPmDelConfirm(selCred.id)}}} style={{padding:"8px 20px",background:pmDelConfirm===selCred.id?"rgba(239,68,68,0.15)":"transparent",border:`1px solid ${pmDelConfirm===selCred.id?"rgba(239,68,68,0.4)":"rgba(239,68,68,0.15)"}`,borderRadius:8,color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{pmDelConfirm===selCred.id?"Confirm Delete":"Delete"}</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {/* Login detail fields */}
            {(selCred.type||"login")==="login"&&<>
              <div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>👤</span><div style={{flex:1,overflow:"hidden"}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Email</div><div style={{fontSize:14,color:T.text,fontWeight:500}}>{selCred.username}</div></div><button className="sc-copy-btn" onClick={()=>scCopy(selCred.username,"user")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="user"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="user"?"Copied":"Copy"}</button></div>
              <div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🔑</span><div style={{flex:1,overflow:"hidden"}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Password</div><div style={{fontSize:14,color:T.text,fontWeight:500,fontFamily:"monospace",letterSpacing:pmShowPw[selCred.id]?0:2}}>{pmShowPw[selCred.id]?selCred.password:"••••••••••••"}</div></div><button onClick={()=>setPmShowPw(p=>({...p,[selCred.id]:!p[selCred.id]}))} style={{padding:"6px",background:"transparent",border:"none",color:T.dim,fontSize:15,cursor:"pointer"}}>{pmShowPw[selCred.id]?"🐵":"🙈"}</button><button className="sc-copy-btn" onClick={()=>scCopy(selCred.password,"pw")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="pw"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="pw"?"Copied":"Copy"}</button></div>
              {selCred.totpSecret&&pmTotpCodes[selCred.id]&&<div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🔐</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>2FA token (TOTP)</div><div style={{fontSize:24,fontFamily:"monospace",fontWeight:700,color:T.accent,letterSpacing:4}}>{pmTotpCodes[selCred.id]}</div></div><div style={{width:30,height:30,position:"relative",flexShrink:0}}><svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="none" stroke={`rgba(${T.accentRgb},0.15)`} strokeWidth="2.5"/><circle cx="15" cy="15" r="13" fill="none" stroke={T.accent} strokeWidth="2.5" strokeDasharray={`${(pmTotpRemaining/30)*81.7} 81.7`} strokeLinecap="round" transform="rotate(-90 15 15)" style={{transition:"stroke-dasharray 0.3s"}}/></svg><span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:T.dim}}>{pmTotpRemaining}</span></div><button className="sc-copy-btn" onClick={()=>scCopy(pmTotpCodes[selCred.id],"totp")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="totp"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="totp"?"Copied":"Copy"}</button></div>}
              {selCred.siteUrl&&<div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🌐</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Websites</div><a href={selCred.siteUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:14,color:T.accent,textDecoration:"none",fontWeight:500}}>{selCred.siteUrl}</a></div></div>}
            </>}
            {/* Card detail fields */}
            {selCred.type==="card"&&<>
              {selCred.cardHolder&&<div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>👤</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Cardholder</div><div style={{fontSize:14,color:T.text,fontWeight:500}}>{selCred.cardHolder}</div></div><button className="sc-copy-btn" onClick={()=>scCopy(selCred.cardHolder,"ch")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="ch"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="ch"?"Copied":"Copy"}</button></div>}
              {selCred.cardNumber&&<div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>💳</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Card Number</div><div style={{fontSize:14,color:T.text,fontWeight:500,fontFamily:"monospace",letterSpacing:2}}>{pmShowPw[selCred.id]?selCred.cardNumber:"•••• •••• •••• "+selCred.cardNumber.slice(-4)}</div></div><button onClick={()=>setPmShowPw(p=>({...p,[selCred.id]:!p[selCred.id]}))} style={{padding:"6px",background:"transparent",border:"none",color:T.dim,fontSize:15,cursor:"pointer"}}>{pmShowPw[selCred.id]?"🐵":"🙈"}</button><button className="sc-copy-btn" onClick={()=>scCopy(selCred.cardNumber,"cn")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="cn"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="cn"?"Copied":"Copy"}</button></div>}
              <div style={{display:"flex",gap:2}}>
                {selCred.cardExpiry&&<div className="sc-field" style={{flex:1,display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>📅</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Expiry</div><div style={{fontSize:14,color:T.text,fontWeight:500}}>{selCred.cardExpiry}</div></div></div>}
                {selCred.cardCvv&&<div className="sc-field" style={{flex:1,display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🔒</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>CVV</div><div style={{fontSize:14,color:T.text,fontWeight:500,fontFamily:"monospace"}}>{pmShowPw[selCred.id]?selCred.cardCvv:"•••"}</div></div></div>}
              </div>
            </>}
            {/* Identity detail fields */}
            {selCred.type==="identity"&&<>
              {selCred.fullName&&<div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>👤</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Full Name</div><div style={{fontSize:14,color:T.text,fontWeight:500}}>{selCred.fullName}</div></div><button className="sc-copy-btn" onClick={()=>scCopy(selCred.fullName,"fn")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="fn"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="fn"?"Copied":"Copy"}</button></div>}
              {selCred.username&&<div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>✉️</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Email</div><div style={{fontSize:14,color:T.text,fontWeight:500}}>{selCred.username}</div></div><button className="sc-copy-btn" onClick={()=>scCopy(selCred.username,"em")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="em"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="em"?"Copied":"Copy"}</button></div>}
              {selCred.phone&&<div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>📞</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Phone</div><div style={{fontSize:14,color:T.text,fontWeight:500}}>{selCred.phone}</div></div><button className="sc-copy-btn" onClick={()=>scCopy(selCred.phone,"ph")} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:6,color:pmCopied==="ph"?T.accent:T.dim,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{pmCopied==="ph"?"Copied":"Copy"}</button></div>}
              {selCred.address&&<div className="sc-field" style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>📍</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Address</div><div style={{fontSize:14,color:T.text,fontWeight:400,lineHeight:1.5}}>{selCred.address}</div></div></div>}
            </>}
            {/* Notes (all types) */}
            {selCred.notes&&<div className="sc-field" style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 16px"}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>📝</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:3}}>Note</div><div style={{fontSize:14,color:T.text,fontWeight:400,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{selCred.notes}</div></div></div>}
            {/* Timestamps */}
            <div className="sc-field" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",marginTop:8}}><span style={{width:36,height:36,borderRadius:10,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🕐</span><div style={{flex:1}}><div style={{fontSize:11,color:T.dim,fontWeight:500,marginBottom:4}}>Last modified</div><div style={{fontSize:13,color:T.text}}>{new Date(selCred.modified).toLocaleString()}</div><div style={{fontSize:11,color:T.dim,marginTop:6}}>Created: {new Date(selCred.created).toLocaleString()}</div></div></div>
          </div>
        </div>}

        {/* ─── EMPTY STATE ─── */}
        {pmView!=="add"&&pmView!=="edit"&&pmView!=="generator"&&!selCred&&!pmShowThemes&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
          <div style={{width:100,height:100,borderRadius:22,background:`rgba(${T.accentRgb},0.08)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <ShieldLogo s={64} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn} uid="scEmpty"/>
          </div>
          <div style={{fontSize:16,fontWeight:600,color:T.dim,marginTop:8}}>Select an item</div>
          <div style={{fontSize:13,color:T.faint}}>Choose from the list or create a new item</div>
        </div>}

      </div>}
    </div>);
  }

  /* ═══════════ INFO PAGES (About / Privacy / Terms) ═══════════ */
  if(infoPage&&(authMode!=="app"||infoPage==="password-manager")){
    const infoGlass={background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.06)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:`1px solid rgba(${T.accentRgb},0.18)`,borderRadius:20,boxShadow:`0 8px 40px rgba(0,0,0,0.3),0 0 60px rgba(${T.accentRgb},0.06),inset 0 1px 0 rgba(255,255,255,0.06)`};
    const infoH={fontSize:28,fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0",marginBottom:24,letterSpacing:2};
    const infoH2={fontSize:18,fontWeight:700,fontFamily:`${F.heading},sans-serif`,color:T.accent,margin:"28px 0 12px",letterSpacing:1};
    const infoP={fontSize:14,lineHeight:1.9,color:"#b0bec9",margin:"0 0 12px"};
    const infoPages={
      about:<>
        <h1 style={infoH}>About NotesCraft</h1>
        <p style={infoP}>NotesCraft is a privacy-first encrypted notes application designed for people who believe their thoughts deserve the same protection as their most sensitive data.</p>
        <h2 style={infoH2}>Our Mission</h2>
        <p style={infoP}>Privacy isn't a feature we added — it's the reason we built this. Every word you write is encrypted on your device before it ever touches the network. We can't read your notes, and neither can anyone else.</p>
        <h2 style={infoH2}>What We Offer</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,margin:"16px 0"}}>
          {[["End-to-End Encryption","AES-256 encryption happens on your device. Your data is unreadable to everyone — including us."],["Cross-Device Sync","Access your notes from any device. Encrypted data syncs securely through the cloud."],["Rich Text & Markdown","Full formatting toolbar, code blocks, checklists, and markdown support for expressive writing."],["Calendar & Reminders","Built-in calendar with event scheduling, reminders, and task management — all encrypted."],["Custom Themes","Personalize your workspace with 50+ themes, accent colors, and font combinations."],["Zero-Knowledge Architecture","We never store your encryption keys. Only you can decrypt your data."]].map(([t,d],i)=><div key={i} style={{...infoGlass,padding:"20px 18px",borderRadius:14}}><div style={{fontSize:13,fontWeight:700,color:T.dark?T.text:"#e2e8f0",marginBottom:6}}>{t}</div><div style={{fontSize:12,lineHeight:1.7,color:"#94a3b8"}}>{d}</div></div>)}
        </div>
        <h2 style={infoH2}>Built With Love</h2>
        <p style={infoP}>Designed and developed by <span style={{fontWeight:800,color:T.accent,letterSpacing:2,fontFamily:`${F.heading},sans-serif`}}>SUNNY</span> — with a passion for privacy, clean design, and great user experiences. NotesCraft is built on encrypted architecture, powered by AES-256 encryption, and crafted to be the most beautiful encrypted notes app you've ever used.</p>
      </>,
      privacy:<>
        <h1 style={infoH}>Privacy Policy</h1>
        <p style={{...infoP,fontStyle:"italic",opacity:0.7}}>Last updated: February 2026</p>
        <p style={infoP}>At NotesCraft, privacy isn't just a policy — it's our entire architecture. This document explains how we handle (or rather, don't handle) your data.</p>
        <h2 style={infoH2}>Zero Data Collection</h2>
        <p style={infoP}>We do not use analytics, tracking pixels, cookies for advertising, or any third-party data collection tools. We don't know how you use the app, what you write, or when you use it.</p>
        <h2 style={infoH2}>End-to-End Encryption</h2>
        <p style={infoP}>All your notes, calendar events, and attachments are encrypted on your device using AES-256 encryption before being transmitted or stored. Your encryption key is derived from your password and never leaves your device. We have zero ability to read your data.</p>
        <h2 style={infoH2}>Zero-Knowledge Architecture</h2>
        <p style={infoP}>Our servers only ever see encrypted blobs. We cannot decrypt, read, analyze, or share your content — even if compelled by law — because we simply don't have the keys.</p>
        <h2 style={infoH2}>Data Storage</h2>
        <p style={infoP}>Your encrypted data is stored securely in the cloud solely for the purpose of cross-device synchronization. The stored data is meaningless without your encryption key, which only you possess.</p>
        <h2 style={infoH2}>No Third-Party Sharing</h2>
        <p style={infoP}>We do not sell, share, or provide your data to any third parties. There is no advertising, no data brokers, and no partnerships that involve your information.</p>
        <h2 style={infoH2}>Account Deletion</h2>
        <p style={infoP}>You can delete your account at any time. When you do, all your encrypted data is permanently removed from our servers. This action is irreversible.</p>
        <h2 style={infoH2}>Contact</h2>
        <p style={infoP}>If you have questions about this privacy policy, reach out through the app or email <a href="mailto:privacy@notecraft.app" style={{color:T.accent,textDecoration:"none"}}>privacy@notecraft.app</a>.</p>
      </>,
      terms:<>
        <h1 style={infoH}>Terms of Service</h1>
        <p style={{...infoP,fontStyle:"italic",opacity:0.7}}>Last updated: February 2026</p>
        <p style={infoP}>By using NotesCraft, you agree to the following terms. Please read them carefully.</p>
        <h2 style={infoH2}>1. Acceptance of Terms</h2>
        <p style={infoP}>By accessing or using NotesCraft, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.</p>
        <h2 style={infoH2}>2. Service Description</h2>
        <p style={infoP}>NotesCraft is an encrypted notes application that provides end-to-end encrypted note-taking, calendar management, and file storage with cross-device synchronization.</p>
        <h2 style={infoH2}>3. User Responsibilities</h2>
        <p style={infoP}>You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating an account. You agree not to use the service for any illegal or unauthorized purpose.</p>
        <h2 style={infoH2}>4. Encryption & Password</h2>
        <p style={infoP}>Your data is encrypted using a key derived from your password. <strong style={{color:"#e2e8f0"}}>If you lose your password, your data cannot be recovered.</strong> We do not store your password or encryption keys. You are solely responsible for remembering your credentials.</p>
        <h2 style={infoH2}>5. Service Availability</h2>
        <p style={infoP}>NotesCraft is provided "as is" without warranties of any kind. We strive for high availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue features at any time.</p>
        <h2 style={infoH2}>6. Limitation of Liability</h2>
        <p style={infoP}>To the maximum extent permitted by law, NotesCraft and its developer shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service, including data loss due to forgotten passwords.</p>
        <h2 style={infoH2}>7. Changes to Terms</h2>
        <p style={infoP}>We reserve the right to update these terms at any time. Continued use of NotesCraft after changes constitutes acceptance of the updated terms.</p>
      </>,
      "password-manager":<>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:4,marginTop:-8}}>
          <div style={{animation:"shieldEntrance 0.8s ease-out, shieldFloat 8s ease-in-out infinite 0.8s",filter:`drop-shadow(0 4px 12px rgba(${T.accentRgb},0.3))`}}>
            <ShieldLogo s={80} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn} pulse uid="scPub"/>
          </div>
          <div>
            <h1 style={{...infoH,background:`linear-gradient(135deg,${T.dark?T.text:"#e2e8f0"} 30%,${T.accent} 70%,${T.accent2||T.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textShadow:"none",margin:0,fontSize:32}}>ShieldCraft</h1>
            <p style={{fontSize:12,color:T.dim,margin:"2px 0 0",letterSpacing:1.5,fontWeight:500}}>Password Generator Tool by NotesCraft</p>
          </div>
        </div>
        <p style={{...infoP,color:"rgba(176,190,201,0.8)"}}>Generate strong passwords and securely store your credentials with end-to-end encryption.</p>

        {/* Top-right Login button */}
        <div style={{position:"absolute",top:20,right:24,zIndex:10}}>
          <button onClick={()=>{setPmShowLogin(true);setPmLoginErr("");setPmLogin2FA(false);setPmLogin2FACode("");setPmLogin2FAErr("");setPmSignupMode(false)}} style={{padding:"8px 20px",background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:0.5,boxShadow:`0 4px 16px rgba(${T.accentRgb},0.35)`,transition:"all 0.3s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"}}>Login</button>
        </div>

        {/* ═══════ GHOST SHIELD UNLOCK MODAL ═══════ */}
        {pmGhostInput&&<div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}} onClick={e=>{if(e.target===e.currentTarget)setPmGhostInput(false)}}>
          <div style={{width:340,maxWidth:"90vw",background:T.dark?"rgba(16,18,27,0.95)":"rgba(30,32,44,0.95)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:`1px solid rgba(${T.accentRgb},0.2)`,borderRadius:20,padding:"32px 28px",boxShadow:`0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(${T.accentRgb},0.08)`}}>
            <div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:40,marginBottom:8}}>👻</div><h3 style={{fontSize:18,fontWeight:700,fontFamily:`${F.heading},sans-serif`,color:T.text,margin:"0 0 4px"}}>Ghost Shield</h3><p style={{fontSize:11,color:T.dim,margin:0}}>Enter the vault name and 6-digit passcode to reveal</p></div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={pmGhostName} onChange={e=>setPmGhostName(e.target.value)} placeholder="Vault name" style={{padding:"11px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=`rgba(${T.accentRgb},0.15)`}}/>
              <input value={pmGhostCode} onChange={e=>setPmGhostCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6} style={{padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:22,fontFamily:"monospace",fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center",letterSpacing:8}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=`rgba(${T.accentRgb},0.15)`}} onKeyDown={e=>{if(e.key==="Enter"&&pmGhostCode.length===6)pmUnlockGhost(pmGhostName,pmGhostCode)}}/>
              {pmGhostErr&&<p style={{fontSize:11,color:"#ef4444",margin:0,fontWeight:500,textAlign:"center"}}>{pmGhostErr}</p>}
              <button onClick={()=>pmUnlockGhost(pmGhostName,pmGhostCode)} disabled={pmGhostCode.length!==6||!pmGhostName} style={{padding:"12px 0",background:(pmGhostCode.length!==6||!pmGhostName)?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:10,color:(pmGhostCode.length!==6||!pmGhostName)?T.dim:"#fff",fontSize:14,fontWeight:700,cursor:(pmGhostCode.length!==6||!pmGhostName)?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:1}}>Unlock</button>
              <button onClick={()=>setPmGhostInput(false)} style={{padding:"8px",background:"transparent",border:`1px solid ${T.bdr}`,borderRadius:10,color:T.dim,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>
        </div>}

        {/* ═══════ LOGIN / SIGNUP MODAL ═══════ */}
        {pmShowLogin&&<div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}} onClick={e=>{if(e.target===e.currentTarget)setPmShowLogin(false)}}>
          <div style={{width:380,maxWidth:"90vw",background:T.dark?"rgba(16,18,27,0.95)":"rgba(30,32,44,0.95)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:`1px solid rgba(${T.accentRgb},0.2)`,borderRadius:20,padding:"32px 28px",boxShadow:`0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(${T.accentRgb},0.08)`,position:"relative"}}>
            <button onClick={()=>setPmShowLogin(false)} style={{position:"absolute",top:12,right:14,background:"none",border:"none",color:T.dim,fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>x</button>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><div style={{animation:"shieldEntrance 0.6s ease-out"}}><ShieldLogo s={52} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn} uid="scMdl"/></div></div>
            <h2 style={{fontSize:20,fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.text,margin:"0 0 4px",letterSpacing:1,textAlign:"center"}}>{pmSignupMode?"Create Account":"Login to ShieldCraft"}</h2>
            <p style={{fontSize:11,color:T.dim,margin:"0 0 20px",textAlign:"center"}}>{pmSignupMode?"Create a NotesCraft account to store passwords":"Use your NotesCraft credentials"}</p>
            {!pmLogin2FA?<div style={{display:"flex",flexDirection:"column",gap:10}}>
              {pmSignupMode&&<input type="text" value={pmSignupName} onChange={e=>setPmSignupName(e.target.value)} placeholder="Full Name" style={{padding:"11px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.3s"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=`rgba(${T.accentRgb},0.15)`}}/>}
              <input type="email" value={pmLoginEmail} onChange={e=>setPmLoginEmail(e.target.value)} placeholder="Email" style={{padding:"11px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.3s"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=`rgba(${T.accentRgb},0.15)`}} onKeyDown={e=>{if(e.key==="Enter"){pmSignupMode?pmDoSignup():pmDoLogin()}}}/>
              <input type="password" value={pmLoginPw} onChange={e=>setPmLoginPw(e.target.value)} placeholder="Password" style={{padding:"11px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.3s"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=`rgba(${T.accentRgb},0.15)`}} onKeyDown={e=>{if(e.key==="Enter"){pmSignupMode?pmDoSignup():pmDoLogin()}}}/>
              {pmLoginErr&&<p style={{fontSize:11,color:T.err||"#ef4444",margin:0,fontWeight:500}}>{pmLoginErr}</p>}
              <button onClick={pmSignupMode?pmDoSignup:pmDoLogin} disabled={pmLoginLoad} style={{padding:"12px 0",background:pmLoginLoad?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:10,color:pmLoginLoad?T.dim:"#fff",fontSize:14,fontWeight:700,cursor:pmLoginLoad?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:1,transition:"all 0.3s",boxShadow:pmLoginLoad?"none":`0 4px 16px rgba(${T.accentRgb},0.3)`}}>{pmLoginLoad?"Please wait...":(pmSignupMode?"Create Account":"Login")}</button>
              <p style={{fontSize:11,color:T.dim,textAlign:"center",margin:"4px 0 0"}}>{pmSignupMode?"Already have an account?":"Don't have an account?"} <button onClick={()=>{setPmSignupMode(!pmSignupMode);setPmLoginErr("")}} style={{background:"none",border:"none",color:T.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>{pmSignupMode?"Login":"Sign Up"}</button></p>
            </div>
            :<div style={{display:"flex",flexDirection:"column",gap:10}}>
              <p style={{fontSize:12,color:T.text,margin:0,textAlign:"center"}}>Enter your 2FA code</p>
              <input type="text" value={pmLogin2FACode} onChange={e=>setPmLogin2FACode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6} style={{padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:22,fontFamily:"monospace",fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center",letterSpacing:8,transition:"border-color 0.3s"}} onFocus={e=>{e.currentTarget.style.borderColor=T.accent}} onBlur={e=>{e.currentTarget.style.borderColor=`rgba(${T.accentRgb},0.15)`}} onKeyDown={e=>{if(e.key==="Enter")pmDoLogin()}} autoFocus/>
              {pmLogin2FAErr&&<p style={{fontSize:11,color:T.err||"#ef4444",margin:0,fontWeight:500,textAlign:"center"}}>{pmLogin2FAErr}</p>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={pmDoLogin} disabled={pmLoginLoad||pmLogin2FACode.length!==6} style={{flex:1,padding:"12px 0",background:(pmLoginLoad||pmLogin2FACode.length!==6)?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:10,color:(pmLoginLoad||pmLogin2FACode.length!==6)?T.dim:"#fff",fontSize:14,fontWeight:700,cursor:(pmLoginLoad||pmLogin2FACode.length!==6)?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.3s"}}>{pmLoginLoad?"Verifying...":"Verify"}</button>
                <button onClick={()=>{setPmLogin2FA(false);setPmLogin2FACode("");setPmLogin2FAErr("")}} style={{padding:"12px 16px",background:"rgba(255,255,255,0.06)",border:`1px solid rgba(${T.accentRgb},0.15)`,borderRadius:10,color:T.dim,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Back</button>
              </div>
            </div>}
          </div>
        </div>}

        {/* Password Display */}
        <div style={{background:pgQuantumSafe?"rgba(16,185,129,0.05)":"rgba(255,255,255,0.06)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:pgQuantumSafe?`2px solid rgba(16,185,129,${pgScrambling?0.9:0.5})`:`2px solid ${pgScrambling?T.accent:`rgba(${T.accentRgb},0.45)`}`,borderRadius:16,padding:"22px 26px",marginBottom:20,position:"relative",transition:"all 0.4s",boxShadow:pgQuantumSafe?`0 6px 30px rgba(0,0,0,0.25),0 0 ${pgScrambling?40:18}px rgba(16,185,129,${pgScrambling?0.45:0.2}),0 0 ${pgScrambling?60:35}px rgba(16,185,129,${pgScrambling?0.2:0.08}),inset 0 1px 0 rgba(255,255,255,0.1),inset 0 0 20px rgba(16,185,129,0.05)`:`0 6px 30px rgba(0,0,0,0.25),0 0 ${pgScrambling?40:18}px rgba(${T.accentRgb},${pgScrambling?0.4:0.18}),0 0 ${pgScrambling?60:35}px rgba(${T.accentRgb},${pgScrambling?0.15:0.06}),inset 0 1px 0 rgba(255,255,255,0.1),inset 0 0 20px rgba(${T.accentRgb},0.04)`,overflow:"hidden"}}>
          {/* Diagonal stripe pattern background */}
          <div style={{position:"absolute",inset:0,backgroundImage:pgQuantumSafe?"repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(16,185,129,0.15) 18px,rgba(16,185,129,0.15) 36px)":`repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(${T.accentRgb},0.12) 18px,rgba(${T.accentRgb},0.12) 36px)`,backgroundSize:"50px 50px",animation:"pgStripeMove 3s linear infinite",pointerEvents:"none",borderRadius:14}}/>
          <div style={{position:"relative",zIndex:1,fontSize:(pgDisplay||pgResult).length>30?14:18,fontFamily:"monospace",fontWeight:600,color:pgScrambling?(pgQuantumSafe?"#10b981":T.accent):T.text,wordBreak:"break-all",lineHeight:1.6,letterSpacing:0.5,minHeight:28,paddingRight:90,transition:"color 0.2s",textShadow:pgScrambling?(pgQuantumSafe?"0 0 10px rgba(16,185,129,0.5)":`0 0 10px rgba(${T.accentRgb},0.5)`):(pgQuantumSafe?"0 0 6px rgba(16,185,129,0.25)":`0 0 6px rgba(${T.accentRgb},0.2)`)}}>{pgHidden&&!pgScrambling?"•".repeat(Math.min((pgDisplay||pgResult).length,40)):(pgDisplay||pgResult)}</div>
          {/* Hide/Show + Regenerate buttons */}
          <div style={{position:"absolute",top:14,right:14,zIndex:2,display:"flex",gap:8}}>
            <button onClick={()=>setPgHidden(!pgHidden)}
              style={{width:40,height:40,borderRadius:"50%",background:pgQuantumSafe?"linear-gradient(135deg,rgba(16,185,129,0.25),rgba(16,185,129,0.1))":`linear-gradient(135deg,rgba(${T.accentRgb},0.25),rgba(${T.accentRgb},0.1))`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:pgQuantumSafe?"2px solid rgba(16,185,129,0.6)":`2px solid rgba(${T.accentRgb},0.5)`,color:pgQuantumSafe?"#10b981":T.accent,fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s",boxShadow:pgQuantumSafe?"0 0 16px rgba(16,185,129,0.4),0 0 30px rgba(16,185,129,0.15),inset 0 0 10px rgba(16,185,129,0.15)":`0 0 16px rgba(${T.accentRgb},0.35),0 0 30px rgba(${T.accentRgb},0.12),inset 0 0 10px rgba(${T.accentRgb},0.12)`}} title={pgHidden?"Show Password":"Hide Password"}
              onMouseEnter={e=>{const g=pgQuantumSafe;e.currentTarget.style.boxShadow=g?"0 0 24px rgba(16,185,129,0.7),0 0 40px rgba(16,185,129,0.25),inset 0 0 12px rgba(16,185,129,0.2)":`0 0 24px rgba(${T.accentRgb},0.65),0 0 40px rgba(${T.accentRgb},0.2),inset 0 0 12px rgba(${T.accentRgb},0.15)`;e.currentTarget.style.transform="scale(1.12)"}}
              onMouseLeave={e=>{const g=pgQuantumSafe;e.currentTarget.style.boxShadow=g?"0 0 16px rgba(16,185,129,0.4),0 0 30px rgba(16,185,129,0.15),inset 0 0 10px rgba(16,185,129,0.15)":`0 0 16px rgba(${T.accentRgb},0.35),0 0 30px rgba(${T.accentRgb},0.12),inset 0 0 10px rgba(${T.accentRgb},0.12)`;e.currentTarget.style.transform="scale(1)"}}>{pgHidden?"🙈":"🐵"}</button>
            <button onClick={e=>{const btn=e.currentTarget;btn.style.animation="pgSpin 0.4s ease-out";setTimeout(()=>{btn.style.animation=""},400);const cw=pgUseCustom?pgCustomWords:"";if(cw){const err=validateCustomWords(cw);setPgCustomErr(err);if(err)return}else{setPgCustomErr("")}const pw=pgMode==="random"?generateRandomPw(pgLen,pgUpper,pgLower,pgDigits,pgSymbols,pgNoAmbig):generateMemorablePw(pgWords,pgDigits,pgSymbols,pgSep,cw);setPgResult(pw);setPgStrength(calcPwStrength(pw));setPgCopied(false);setPgHidden(false)}}
              style={{width:40,height:40,borderRadius:"50%",background:pgQuantumSafe?"linear-gradient(135deg,rgba(16,185,129,0.25),rgba(16,185,129,0.1))":`linear-gradient(135deg,rgba(${T.accentRgb},0.25),rgba(${T.accentRgb},0.1))`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:pgQuantumSafe?"2px solid rgba(16,185,129,0.6)":`2px solid rgba(${T.accentRgb},0.5)`,color:pgQuantumSafe?"#10b981":T.accent,fontSize:20,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s",boxShadow:pgQuantumSafe?"0 0 16px rgba(16,185,129,0.4),0 0 30px rgba(16,185,129,0.15),inset 0 0 10px rgba(16,185,129,0.15)":`0 0 16px rgba(${T.accentRgb},0.35),0 0 30px rgba(${T.accentRgb},0.12),inset 0 0 10px rgba(${T.accentRgb},0.12)`}} title="Regenerate"
              onMouseEnter={e=>{const g=pgQuantumSafe;e.currentTarget.style.boxShadow=g?"0 0 24px rgba(16,185,129,0.7),0 0 40px rgba(16,185,129,0.25),inset 0 0 12px rgba(16,185,129,0.2)":`0 0 24px rgba(${T.accentRgb},0.65),0 0 40px rgba(${T.accentRgb},0.2),inset 0 0 12px rgba(${T.accentRgb},0.15)`;e.currentTarget.style.transform="scale(1.12)"}}
              onMouseLeave={e=>{const g=pgQuantumSafe;e.currentTarget.style.boxShadow=g?"0 0 16px rgba(16,185,129,0.4),0 0 30px rgba(16,185,129,0.15),inset 0 0 10px rgba(16,185,129,0.15)":`0 0 16px rgba(${T.accentRgb},0.35),0 0 30px rgba(${T.accentRgb},0.12),inset 0 0 10px rgba(${T.accentRgb},0.12)`;e.currentTarget.style.transform="scale(1)"}}>&#x21bb;</button>
          </div>
        </div>

        {/* Mode Toggle + Options */}
        <div style={{background:pgQuantumSafe?"rgba(16,185,129,0.05)":"rgba(255,255,255,0.06)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:pgQuantumSafe?`1.5px solid rgba(16,185,129,0.4)`:`1.5px solid rgba(${T.accentRgb},0.3)`,borderRadius:16,padding:"18px 26px",marginBottom:20,position:"relative",transition:"all 0.4s",boxShadow:pgQuantumSafe?"0 6px 25px rgba(0,0,0,0.2),0 0 15px rgba(16,185,129,0.12),inset 0 1px 0 rgba(255,255,255,0.08)":`0 6px 25px rgba(0,0,0,0.2),0 0 15px rgba(${T.accentRgb},0.1),inset 0 1px 0 rgba(255,255,255,0.08)`}}>
          <div style={{display:"grid",gridTemplateColumns:"130px 1fr",gap:16,alignItems:"start"}}>
            <div style={{display:"flex",flexDirection:"column",gap:3,background:pgQuantumSafe?"rgba(16,185,129,0.04)":"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:12,padding:5,border:pgQuantumSafe?"1.5px solid rgba(16,185,129,0.25)":`1.5px solid rgba(${T.accentRgb},0.2)`,boxShadow:pgQuantumSafe?"0 4px 20px rgba(0,0,0,0.2),0 0 12px rgba(16,185,129,0.06),inset 0 1px 0 rgba(255,255,255,0.08)":`0 4px 20px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.08)`,transition:"all 0.4s"}}>
              {["random","memorable"].map(m=><button key={m} onClick={()=>setPgMode(m)} className={`pg-mode-btn ${pgMode===m?(pgQuantumSafe?"pg-mode-active-qm":"pg-mode-active"):(pgQuantumSafe?"pg-mode-inactive pg-mode-inactive-qm":"pg-mode-inactive")}`}>{m==="random"?"Random":"Memorable"}</button>)}
            </div>
            <div>
              {pgMode==="random"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontSize:12,fontWeight:600,color:T.text}}>Length</label>
                    <span style={{fontSize:13,fontWeight:700,color:pgQuantumSafe?"#10b981":T.accent}}>{pgLen}</span>
                  </div>
                  <input type="range" min={pgQuantumSafe?65:8} max={256} value={pgLen} onChange={e=>setPgLen(+e.target.value)} className={pgQuantumSafe?"pg-slider-qm":"pg-slider"}/>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                  {[{label:"Uppercase",val:pgUpper,set:setPgUpper,lock:pgQuantumSafe},{label:"Lowercase",val:pgLower,set:setPgLower,lock:pgQuantumSafe},{label:"Digits",val:pgDigits,set:setPgDigits,lock:pgQuantumSafe},{label:"Symbols",val:pgSymbols,set:setPgSymbols,lock:pgQuantumSafe},{label:"No ambiguous",val:pgNoAmbig,set:setPgNoAmbig}].map((o,i)=>
                    <label key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:o.lock&&o.val?(pgQuantumSafe?"#10b981":T.accent):T.text,cursor:o.lock&&o.val?"not-allowed":"pointer",opacity:o.lock&&o.val?0.8:1,letterSpacing:0.3}}>
                      <div onClick={()=>{if(o.lock&&o.val)return;o.set(!o.val)}} className={`pg-chk ${o.val?(pgQuantumSafe?"pg-chk-on-qm":"pg-chk-on"):"pg-chk-off"}`} style={{cursor:o.lock&&o.val?"not-allowed":"pointer"}}>
                        {o.val&&<span style={{color:pgQuantumSafe?"#10b981":T.accent,fontSize:10,fontWeight:700,textShadow:pgQuantumSafe?"0 0 6px rgba(16,185,129,0.5)":`0 0 6px rgba(${T.accentRgb},0.5)`}}>{o.lock?"🔒":"✓"}</span>}
                      </div>
                      {o.label}
                    </label>
                  )}
                </div>
              </div>}
              {pgMode==="memorable"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontSize:12,fontWeight:600,color:T.text}}>Words</label>
                    <span style={{fontSize:13,fontWeight:700,color:pgQuantumSafe?"#10b981":T.accent}}>{pgWords}</span>
                  </div>
                  <input type="range" min={pgQuantumSafe?10:3} max={pgQuantumSafe?20:6} value={pgWords} onChange={e=>setPgWords(+e.target.value)} className={pgQuantumSafe?"pg-slider-qm":"pg-slider"}/>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                  {[{label:"Number",val:pgDigits,set:setPgDigits,lock:pgQuantumSafe},{label:"Symbol",val:pgSymbols,set:setPgSymbols,lock:pgQuantumSafe},{label:"Add Your Own Words",val:pgUseCustom,set:v=>{setPgUseCustom(v);if(!v){setPgCustomWords("");setPgCustomErr("")}}}].map((o,i)=>
                    <label key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:o.lock&&o.val?(pgQuantumSafe?"#10b981":T.accent):T.text,cursor:o.lock&&o.val?"not-allowed":"pointer",opacity:o.lock&&o.val?0.8:1,letterSpacing:0.3}}>
                      <div onClick={()=>{if(o.lock&&o.val)return;o.set(!o.val)}} className={`pg-chk ${o.val?(pgQuantumSafe?"pg-chk-on-qm":"pg-chk-on"):"pg-chk-off"}`} style={{cursor:o.lock&&o.val?"not-allowed":"pointer"}}>
                        {o.val&&<span style={{color:pgQuantumSafe?"#10b981":T.accent,fontSize:10,fontWeight:700,textShadow:pgQuantumSafe?"0 0 6px rgba(16,185,129,0.5)":`0 0 6px rgba(${T.accentRgb},0.5)`}}>{o.lock?"🔒":"✓"}</span>}
                      </div>
                      {o.label}
                    </label>
                  )}
                  <select value={pgSep} onChange={e=>setPgSep(e.target.value)} style={{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.04)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:pgQuantumSafe?"1px solid rgba(16,185,129,0.2)":`1px solid rgba(${T.accentRgb},0.15)`,color:T.text,fontSize:11,fontFamily:"inherit",outline:"none",cursor:"pointer",appearance:"auto",transition:"border-color 0.3s"}}>
                    {[{v:"hyphens",l:"Hyphens"},{v:"spaces",l:"Spaces"},{v:"periods",l:"Periods"},{v:"commas",l:"Commas"},{v:"underscores",l:"Underscores"},{v:"numbers",l:"Numbers"},{v:"numbersSymbols",l:"Num+Sym"}].map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                {pgUseCustom&&<div>
                  <input type="text" value={pgCustomWords} onChange={e=>{setPgCustomWords(e.target.value);const err=validateCustomWords(e.target.value);setPgCustomErr(err)}} placeholder="e.g. cyber vault omega — separate with spaces or commas" style={{width:"100%",padding:"9px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1.5px solid ${pgCustomErr?T.err||"#ef4444":`rgba(${T.accentRgb},0.15)`}`,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",letterSpacing:0.3,transition:"all 0.3s",boxShadow:`inset 0 1px 0 rgba(255,255,255,0.03)`}} onFocus={e=>{if(!pgCustomErr){e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.boxShadow=`0 0 12px rgba(${T.accentRgb},0.15),inset 0 1px 0 rgba(255,255,255,0.03)`}}} onBlur={e=>{if(!pgCustomErr){e.currentTarget.style.borderColor=`rgba(${T.accentRgb},0.15)`;e.currentTarget.style.boxShadow=`inset 0 1px 0 rgba(255,255,255,0.03)`}}}/>
                  {pgCustomErr&&<p style={{fontSize:10,color:T.err||"#ef4444",margin:"4px 0 0",fontWeight:500}}>{pgCustomErr}</p>}
                </div>}
              </div>}
            </div>
          </div>
        </div>

        {/* Copy + Download Row */}
        <div style={{display:"flex",gap:12,marginBottom:16}}>
          <button onClick={e=>{const btn=e.currentTarget;btn.style.animation="pgCopySuccess 0.3s ease-out";setTimeout(()=>{btn.style.animation=""},300);navigator.clipboard.writeText(pgResult).then(()=>{setPgCopied(true);setTimeout(()=>setPgCopied(false),2000)})}}
            style={{flex:2,padding:"13px 0",background:pgCopied?T.ok:pgQuantumSafe?"linear-gradient(135deg,#10b981,#059669)":`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:1.5,transition:"all 0.3s",boxShadow:pgCopied?`0 0 25px ${T.ok}40`:pgQuantumSafe?"0 4px 24px rgba(16,185,129,0.4),0 0 40px rgba(16,185,129,0.15)":`0 4px 24px rgba(${T.accentRgb},0.35),0 0 40px rgba(${T.accentRgb},0.12)`,backgroundSize:"200% auto",position:"relative",overflow:"hidden"}}
            onMouseEnter={e=>{if(!pgCopied){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=pgQuantumSafe?"0 6px 30px rgba(16,185,129,0.6),0 0 50px rgba(16,185,129,0.25)":`0 6px 30px rgba(${T.accentRgb},0.55),0 0 50px rgba(${T.accentRgb},0.2)`}}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=pgCopied?`0 0 25px ${T.ok}40`:pgQuantumSafe?"0 4px 24px rgba(16,185,129,0.4),0 0 40px rgba(16,185,129,0.15)":`0 4px 24px rgba(${T.accentRgb},0.35),0 0 40px rgba(${T.accentRgb},0.12)`}}>
            {pgCopied?"✓ Copied!":"Copy Password"}
          </button>
          <button onClick={()=>{if(!pgResult)return;const blob=new Blob([pgResult],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="password.txt";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)}}
            style={{flex:1,padding:"13px 0",background:"rgba(255,255,255,0.04)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:pgQuantumSafe?"1.5px solid rgba(16,185,129,0.3)":`1.5px solid rgba(${T.accentRgb},0.25)`,borderRadius:12,color:pgQuantumSafe?"#10b981":T.accent,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:0.5,transition:"all 0.3s",boxShadow:`0 2px 12px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.05)`}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor=pgQuantumSafe?"rgba(16,185,129,0.6)":`rgba(${T.accentRgb},0.5)`;e.currentTarget.style.boxShadow=pgQuantumSafe?"0 4px 20px rgba(16,185,129,0.25),inset 0 1px 0 rgba(255,255,255,0.08)":`0 4px 20px rgba(${T.accentRgb},0.2),inset 0 1px 0 rgba(255,255,255,0.08)`}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor=pgQuantumSafe?"rgba(16,185,129,0.3)":`rgba(${T.accentRgb},0.25)`;e.currentTarget.style.boxShadow=`0 2px 12px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.05)`}}>
            ↓ Download .txt
          </button>
        </div>

        {/* Strength Meter */}
        {pgStrength&&<div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,fontWeight:600,color:T.text}}>Password Strength</span>
              {pgStrength.qResist&&<span style={{fontSize:9,fontWeight:700,color:"#10b981",background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:4,padding:"2px 6px",letterSpacing:0.5}}>✅ Quantum Resistant</span>}
            </div>
            <span style={{fontSize:12,fontWeight:700,color:pgStrength.color}}>{pgStrength.label}</span>
          </div>
          <div style={{height:8,borderRadius:4,background:"rgba(255,255,255,0.08)",overflow:"hidden",marginBottom:6,position:"relative",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.3)"}}>
            <div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${pgStrength.color}90,${pgStrength.color})`,width:pgStrength.percent+"%",transition:"width 0.4s ease",boxShadow:`0 0 16px ${pgStrength.color}60,0 0 6px ${pgStrength.color}40,0 0 30px ${pgStrength.color}20`}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:10,color:T.dim}}>{pgStrength.bits} bits of entropy · Effective Bits: <span style={{fontWeight:600}}>{pgStrength.qBits}</span></span>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:10,color:T.dim}}>🖥️ Classical <span style={{opacity:0.6}}>[modern GPU · 10⁹ attempts/sec]</span> :</span>
            <span style={{fontSize:10,fontWeight:600,color:pgStrength.color}}>{pgStrength.time}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:T.dim}}>⚛️ Quantum <span style={{opacity:0.6}}>[10⁷ Grover iter/sec]</span> :</span>
            <span style={{fontSize:10,fontWeight:600,color:pgStrength.qColor}}>{pgStrength.qTime}</span>
          </div>
        </div>}

        {/* Quantum Resistant details card */}
        {pgQuantumSafe&&pgStrength&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2,marginBottom:16,borderRadius:14,overflow:"hidden",border:"1.5px solid rgba(16,185,129,0.25)",boxShadow:"0 4px 20px rgba(0,0,0,0.2),0 0 20px rgba(16,185,129,0.08)"}}>
          {[
            {label:"Length",value:pgResult.length+" chars",icon:"📏"},
            {label:"Entropy",value:pgStrength.bits+" bits",icon:"🎲"},
            {label:"Classical",value:pgStrength.time,icon:"🖥️",color:pgStrength.color},
            {label:"Quantum",value:pgStrength.qTime,icon:"⚛️",color:pgStrength.qColor}
          ].map((s,i)=><div key={i} style={{padding:"14px 12px",background:"rgba(16,185,129,0.04)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderLeft:i>0?"1px solid rgba(16,185,129,0.12)":"none"}}>
            <div style={{fontSize:10,color:T.dim,fontWeight:600,letterSpacing:0.5,marginBottom:6}}>{s.icon} {s.label}</div>
            <div style={{fontSize:13,fontWeight:700,color:s.color||T.text,lineHeight:1.3,wordBreak:"break-word",textShadow:s.color?`0 0 8px ${s.color}40`:"none"}}>{s.value}</div>
          </div>)}
        </div>}
        {/* Quantum Resistant toggle */}
        <div style={{marginTop:14,marginBottom:pgQuantumSafe?10:12,padding:"14px 18px",borderRadius:14,background:pgQuantumSafe?"rgba(16,185,129,0.08)":"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:pgQuantumSafe?"2px solid rgba(16,185,129,0.7)":`2px solid rgba(${T.accentRgb},0.4)`,transition:"all 0.4s",boxShadow:pgQuantumSafe?"0 0 20px rgba(16,185,129,0.3),0 0 40px rgba(16,185,129,0.12),inset 0 0 20px rgba(16,185,129,0.06)":`0 4px 16px rgba(0,0,0,0.15),0 0 15px rgba(${T.accentRgb},0.2),0 0 30px rgba(${T.accentRgb},0.08),inset 0 1px 0 rgba(255,255,255,0.06)`,animation:pgQuantumSafe?"qrPulse 3s ease-in-out infinite":"none",position:"relative",overflow:"hidden"}}>
          {/* Subtle stripe overlay */}
          <div style={{position:"absolute",inset:0,backgroundImage:pgQuantumSafe?"repeating-linear-gradient(45deg,transparent,transparent 14px,rgba(16,185,129,0.03) 14px,rgba(16,185,129,0.03) 28px)":`repeating-linear-gradient(45deg,transparent,transparent 14px,rgba(${T.accentRgb},0.02) 14px,rgba(${T.accentRgb},0.02) 28px)`,backgroundSize:"40px 40px",animation:"pgStripeMove 4s linear infinite",pointerEvents:"none",borderRadius:12}}/>
          <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",position:"relative",zIndex:1}}>
            <div onClick={()=>setPgQuantumSafe(!pgQuantumSafe)} style={{width:44,height:24,borderRadius:12,background:pgQuantumSafe?"rgba(16,185,129,0.35)":`rgba(${T.accentRgb},0.15)`,border:pgQuantumSafe?"1.5px solid rgba(16,185,129,0.6)":`1.5px solid rgba(${T.accentRgb},0.4)`,position:"relative",cursor:"pointer",transition:"all 0.4s",flexShrink:0,boxShadow:pgQuantumSafe?"0 0 16px rgba(16,185,129,0.4),0 0 30px rgba(16,185,129,0.15),inset 0 0 10px rgba(16,185,129,0.1)":`0 0 10px rgba(${T.accentRgb},0.15),inset 0 1px 3px rgba(0,0,0,0.2)`}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:pgQuantumSafe?"#10b981":T.accent,position:"absolute",top:2,left:pgQuantumSafe?23:2,transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)",boxShadow:pgQuantumSafe?"0 0 10px rgba(16,185,129,0.8),0 0 20px rgba(16,185,129,0.4)":`0 0 8px rgba(${T.accentRgb},0.4),0 1px 3px rgba(0,0,0,0.3)`,opacity:pgQuantumSafe?1:0.7}}/>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:pgQuantumSafe?"#10b981":T.text,textShadow:pgQuantumSafe?"0 0 10px rgba(16,185,129,0.4)":"none",transition:"all 0.3s"}}>⚛️ Turn On Quantum Resistant Mode</span>
            <span style={{fontSize:9,color:pgQuantumSafe?"rgba(16,185,129,0.6)":T.dim,marginLeft:"auto",transition:"color 0.3s"}}>(enforces min {pgMode==="random"?"65 chars + all charsets":"10 words"} for 128+ bit entropy)</span>
          </label>
        </div>
        {pgQuantumSafe&&<div style={{marginBottom:12,padding:"14px 16px",borderRadius:10,background:"rgba(245,158,11,0.05)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid rgba(245,158,11,0.18)",fontSize:10,lineHeight:1.7,color:T.dim,boxShadow:"0 2px 12px rgba(0,0,0,0.1),inset 0 0 12px rgba(245,158,11,0.03)"}}>
          <p style={{margin:"0 0 8px"}}><span style={{color:"#f59e0b"}}>⚠️</span> <strong style={{color:T.text}}>Disclaimer:</strong> Quantum resistance estimates model Grover's search algorithm (O(√N) speedup) against symmetric key spaces at 10⁷ logical Grover iterations/sec — an optimistic projection for fault-tolerant quantum hardware. <strong style={{color:T.text}}>No cryptographically relevant quantum computer currently exists.</strong> These are forward-looking theoretical projections, not assessments of present-day risk.</p>
          <p style={{margin:0}}>Real-world quantum attack feasibility depends on logical qubit count, gate fidelity thresholds, quantum error correction overhead (surface codes), decoherence rates, and circuit depth limitations — variables that remain unsolved at scale. <strong style={{color:T.text}}>No guarantees are made regarding actual post-quantum security.</strong> This model is for entropy planning and threat modeling purposes only.</p>
        </div>}

      </>,
      "security-blog":<>{(()=>{
        const blogArticles=[
          {slug:"csprng-vs-prng",tag:"Security Deep-Dive",title:"Cryptographic vs Normal Password Generators",subtitle:"Why the random numbers behind your passwords matter more than you think — explained with entropy, physics, and a cup of hot coffee.",icon:"🔐",date:"February 2026"}
        ];
        const activeArticle=blogArticles.find(a=>a.slug===blogArticle);
        const shareLink=(slug)=>{const url=window.location.origin+window.location.pathname+"#blog/"+slug;navigator.clipboard.writeText(url).then(()=>{setAuthErr("Link copied!");setTimeout(()=>setAuthErr(""),2000)})};

        // Blog listing
        if(!activeArticle)return<>
          <h1 style={infoH}>Security Blog</h1>
          <p style={infoP}>In-depth articles about cryptography, password security, and privacy.</p>
          <div style={{display:"flex",flexDirection:"column",gap:16,marginTop:24}}>
            {blogArticles.map(a=><div key={a.slug} onClick={()=>{setBlogArticle(a.slug);window.scrollTo(0,0)}} style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:16,padding:"24px 22px",cursor:"pointer",transition:"all 0.3s",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.transform="translateY(-2px)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.transform="translateY(0)"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,background:`radial-gradient(circle,rgba(${T.accentRgb},0.08),transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <span style={{fontSize:28}}>{a.icon}</span>
                <span style={{display:"inline-block",background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",border:`1px solid ${T.bdr}`,borderRadius:999,padding:"3px 12px",fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",color:T.accent}}>{a.tag}</span>
                <span style={{fontSize:10,color:T.dim,marginLeft:"auto"}}>{a.date}</span>
              </div>
              <h3 style={{fontSize:18,fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0",marginBottom:8,lineHeight:1.3}}>{a.title}</h3>
              <p style={{fontSize:13,color:"#8892a4",lineHeight:1.6,margin:0}}>{a.subtitle}</p>
              <div style={{display:"flex",alignItems:"center",gap:12,marginTop:16}}>
                <span style={{fontSize:12,fontWeight:600,color:T.accent}}>Read Article</span>
                <span style={{color:T.accent}}>&#8594;</span>
                <button onClick={e=>{e.stopPropagation();shareLink(a.slug)}} style={{marginLeft:"auto",background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.3)`,borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:600,color:T.accent,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=`rgba(${T.accentRgb},0.2)`}
                  onMouseLeave={e=>e.currentTarget.style.background=`rgba(${T.accentRgb},0.1)`}>Share Link</button>
              </div>
            </div>)}
          </div>
        </>;

        // Individual article view
        return<>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
            <button onClick={()=>{setBlogArticle(null);window.scrollTo(0,0)}} style={{background:`rgba(${T.accentRgb},0.08)`,border:`1px solid rgba(${T.accentRgb},0.3)`,borderRadius:8,padding:"6px 14px",color:T.accent,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>&#8592; All Articles</button>
            <button onClick={()=>shareLink(activeArticle.slug)} style={{marginLeft:"auto",background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.3)`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,color:T.accent,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.background=`rgba(${T.accentRgb},0.2)`}
              onMouseLeave={e=>e.currentTarget.style.background=`rgba(${T.accentRgb},0.1)`}>Share Article</button>
          </div>

          {/* Article: csprng-vs-prng */}
          {activeArticle.slug==="csprng-vs-prng"&&<>
        <div style={{textAlign:"center",marginBottom:40}}>
          <span style={{display:"inline-block",background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",border:`1px solid ${T.bdr}`,borderRadius:999,padding:"5px 16px",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",color:T.accent,marginBottom:16}}>Security Deep-Dive</span>
          <h2 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0",lineHeight:1.2,marginBottom:12}}>
            <span style={{background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Cryptographic</span> vs <span style={{color:T.err||"#f87171"}}>Normal</span> Password Generators
          </h2>
          <p style={{fontSize:14,color:"#8892a4",maxWidth:500,margin:"0 auto",lineHeight:1.6}}>Why the random numbers behind your passwords matter more than you think — explained with entropy, physics, and a cup of hot coffee.</p>
        </div>

        <h2 style={infoH2}>What's Actually Inside a Password Generator?</h2>
        <p style={infoP}>Every password generator has a core engine — a <strong style={{color:T.text}}>random number generator (RNG)</strong>. This engine decides which characters end up in your password. The difference between a cryptographically secure generator and a normal one comes down to one thing: <strong style={{color:T.text}}>how unpredictable that engine truly is</strong>.</p>
        <p style={infoP}>A normal generator uses what's called a <strong style={{color:T.text}}>Pseudo-Random Number Generator (PRNG)</strong>. It's fast, it looks random, and it works great for games and simulations. But if someone knows the algorithm and the starting "seed" value, they can reproduce every single output.</p>
        <p style={infoP}>A cryptographically secure generator uses a <strong style={{color:T.text}}>CSPRNG</strong> — a Cryptographically Secure Pseudo-Random Number Generator. It draws unpredictability from physical noise in your hardware (mouse movements, CPU timing jitter, electrical noise) and is designed so that even if an attacker sees millions of outputs, they cannot predict the next one.</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,margin:"24px 0"}}>
          <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderTop:`3px solid ${T.accent}`,borderRadius:14,padding:"20px 18px"}}>
            <div style={{width:42,height:42,borderRadius:10,background:`rgba(${T.accentRgb},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:12}}>🔒</div>
            <div style={{fontSize:14,fontWeight:700,color:T.dark?T.text:"#e2e8f0",marginBottom:6}}>Cryptographically Secure</div>
            <p style={{fontSize:12,color:"#8892a4",margin:0,lineHeight:1.6}}>Uses OS-level entropy sources, hardware noise, and algorithms proven resistant to prediction attacks. Used in banking, encryption keys, and authentication tokens.</p>
          </div>
          <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderTop:"3px solid #f87171",borderRadius:14,padding:"20px 18px"}}>
            <div style={{width:42,height:42,borderRadius:10,background:"rgba(248,113,113,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:12}}>🎲</div>
            <div style={{fontSize:14,fontWeight:700,color:T.dark?T.text:"#e2e8f0",marginBottom:6}}>Normal (PRNG-based)</div>
            <p style={{fontSize:12,color:"#8892a4",margin:0,lineHeight:1.6}}>Uses mathematical formulas like the Mersenne Twister. Fast and statistically uniform, but deterministic — the same seed always produces the same sequence.</p>
          </div>
        </div>

        <h3 style={{fontSize:14,fontWeight:600,color:T.accent,margin:"28px 0 12px"}}>Example Output Comparison</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10,margin:"16px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:10,padding:"12px 16px"}}>
            <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,color:T.accent,width:70,flexShrink:0}}>CSPRNG</span>
            <span style={{fontFamily:"monospace",fontSize:14,letterSpacing:1,color:T.dark?T.text:"#e2e8f0",wordBreak:"break-all"}}>k$9Tz!mW@4vQp&Lx</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:10,padding:"12px 16px"}}>
            <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,color:"#f87171",width:70,flexShrink:0}}>PRNG</span>
            <span style={{fontFamily:"monospace",fontSize:14,letterSpacing:1,color:T.dark?T.text:"#e2e8f0",wordBreak:"break-all"}}>j7hR3mNq8xBw2kPf</span>
          </div>
        </div>
        <p style={infoP}>Both look random to the human eye. The difference is invisible on screen — it lives in <strong style={{color:T.text}}>how the characters were chosen</strong>. A CSPRNG's output cannot be reverse-engineered; a PRNG's output theoretically can be.</p>

        <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.bdr},transparent)`,margin:"32px 0"}}/>

        <h2 style={infoH2}>Head-to-Head Comparison</h2>
        <div style={{border:`1px solid ${T.bdr}`,borderRadius:14,overflow:"hidden",margin:"16px 0"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}}>
              <th style={{textAlign:"left",padding:"12px 16px",fontWeight:600,fontSize:11,letterSpacing:1,textTransform:"uppercase",color:T.dark?T.text:"#e2e8f0",borderBottom:`1px solid ${T.bdr}`}}>Feature</th>
              <th style={{textAlign:"left",padding:"12px 16px",fontWeight:600,fontSize:11,letterSpacing:1,textTransform:"uppercase",color:"#8892a4",borderBottom:`1px solid ${T.bdr}`}}>CSPRNG</th>
              <th style={{textAlign:"left",padding:"12px 16px",fontWeight:600,fontSize:11,letterSpacing:1,textTransform:"uppercase",color:"#8892a4",borderBottom:`1px solid ${T.bdr}`}}>PRNG</th>
            </tr></thead>
            <tbody>
              {[
                ["Randomness Source","Hardware entropy (electrical noise, CPU jitter)","Mathematical formula with a seed"],
                ["Predictability","Unpredictable","Predictable if seed known"],
                ["Speed","Slower (gathers entropy)","Very Fast"],
                ["Entropy Quality","High — 128+ bits","Low — often 32-48 bits"],
                ["Backtrack Resistance","Yes — past outputs safe","No — state reconstructable"],
                ["Suitable For","Passwords, keys, tokens, OTPs","Games, simulations, UI"],
                ["Attack Surface","Minimal","Wide — seed guessing, state recovery"],
                ["Regulatory","Meets NIST, FIPS standards","Fails crypto requirements"],
                ["Reproducibility","Not reproducible (by design)","Fully reproducible with same seed"]
              ].map((row,i)=><tr key={i} style={{borderBottom:i<8?`1px solid ${T.bdr}`:"none"}}>
                <td style={{padding:"10px 16px",fontWeight:600,color:T.dark?T.text:"#e2e8f0"}}>{row[0]}</td>
                <td style={{padding:"10px 16px",color:T.accent}}>{row[1]}</td>
                <td style={{padding:"10px 16px",color:"#f87171"}}>{row[2]}</td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.bdr},transparent)`,margin:"32px 0"}}/>

        <h2 style={infoH2}>Visualizing the Difference</h2>
        <h3 style={{fontSize:14,fontWeight:600,color:T.dark?T.text:"#e2e8f0",margin:"20px 0 10px"}}>Entropy Score (bits)</h3>
        <p style={infoP}>Entropy measures unpredictability. Higher entropy means more combinations an attacker must try. Each extra bit <strong style={{color:T.text}}>doubles</strong> the search space.</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,margin:"20px 0"}}>
          <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{position:"relative",width:100,height:100,margin:"0 auto 12px"}}>
              <svg viewBox="0 0 120 120" width="100" height="100" style={{transform:"rotate(-90deg)"}}>
                <circle cx="60" cy="60" r="54" fill="none" stroke={T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} strokeWidth="8"/>
                <circle cx="60" cy="60" r="54" fill="none" stroke={T.accent} strokeWidth="8" strokeLinecap="round" strokeDasharray="339.292" strokeDashoffset="33.93"/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontFamily:"monospace",fontSize:22,fontWeight:700,color:T.accent}}>128</span>
                <span style={{fontSize:9,color:"#8892a4",textTransform:"uppercase",letterSpacing:1}}>bits</span>
              </div>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:T.dark?T.text:"#e2e8f0"}}>CSPRNG Password</div>
            <div style={{fontSize:11,color:"#8892a4",marginTop:2}}>16-char with full symbol set</div>
          </div>
          <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{position:"relative",width:100,height:100,margin:"0 auto 12px"}}>
              <svg viewBox="0 0 120 120" width="100" height="100" style={{transform:"rotate(-90deg)"}}>
                <circle cx="60" cy="60" r="54" fill="none" stroke={T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} strokeWidth="8"/>
                <circle cx="60" cy="60" r="54" fill="none" stroke="#f87171" strokeWidth="8" strokeLinecap="round" strokeDasharray="339.292" strokeDashoffset="254.47"/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontFamily:"monospace",fontSize:22,fontWeight:700,color:"#f87171"}}>32</span>
                <span style={{fontSize:9,color:"#8892a4",textTransform:"uppercase",letterSpacing:1}}>bits</span>
              </div>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:T.dark?T.text:"#e2e8f0"}}>PRNG Password</div>
            <div style={{fontSize:11,color:"#8892a4",marginTop:2}}>Limited by seed entropy</div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,margin:"20px 0"}}>
          <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#8892a4",textTransform:"uppercase",letterSpacing:1.5}}>Possible Combinations</div>
            <div style={{fontFamily:"monospace",fontSize:"clamp(24px,4vw,36px)",fontWeight:600,color:T.accent,margin:"6px 0"}}>3.4 × 10<sup>38</sup></div>
            <div style={{fontSize:12,color:"#8892a4"}}>128-bit CSPRNG space</div>
            <div style={{fontSize:10,color:"#4a5568",fontFamily:"monospace",marginTop:4}}>= 340 undecillion attempts</div>
          </div>
          <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:14,padding:20,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#8892a4",textTransform:"uppercase",letterSpacing:1.5}}>Possible Combinations</div>
            <div style={{fontFamily:"monospace",fontSize:"clamp(24px,4vw,36px)",fontWeight:600,color:"#f87171",margin:"6px 0"}}>4.3 × 10<sup>9</sup></div>
            <div style={{fontSize:12,color:"#8892a4"}}>32-bit PRNG space</div>
            <div style={{fontSize:10,color:"#4a5568",fontFamily:"monospace",marginTop:4}}>= 4.3 billion attempts</div>
          </div>
        </div>

        <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:14,padding:20,margin:"20px 0"}}>
          <div style={{fontSize:13,fontWeight:600,color:T.dark?T.text:"#e2e8f0",marginBottom:16}}>Estimated Time to Brute-Force (10 billion guesses/sec)</div>
          {[
            {label:"CSPRNG 16-char",time:"1 billion+ years",pct:98,color:`linear-gradient(90deg,${T.accent},${T.accent2||T.accent})`},
            {label:"CSPRNG 12-char",time:"3 million years",pct:78,color:`linear-gradient(90deg,${T.accent},${T.accent2||T.accent})`},
            {label:"PRNG 16-char",time:"~0.4 seconds*",pct:28,color:"linear-gradient(90deg,#fbbf24,#f59e0b)"},
            {label:"PRNG 8-char",time:"Instant*",pct:12,color:"linear-gradient(90deg,#f87171,#ef4444)"}
          ].map((b,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{width:110,fontSize:11,color:"#8892a4",textAlign:"right",flexShrink:0}}>{b.label}</div>
            <div style={{flex:1,height:28,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",borderRadius:6,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:6,background:b.color,width:b.pct+"%",display:"flex",alignItems:"center",paddingLeft:10,fontSize:10,fontWeight:600,color:"#0c0e13"}}>{b.time}</div>
            </div>
          </div>)}
          <p style={{fontSize:10,color:"#4a5568",marginTop:8}}>* If attacker exploits the PRNG's limited seed space instead of brute-forcing characters</p>
        </div>

        <div style={{background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,borderRadius:14,padding:20,margin:"20px 0"}}>
          <div style={{fontSize:13,fontWeight:600,color:T.dark?T.text:"#e2e8f0",marginBottom:16}}>Attack Vulnerability Breakdown</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:T.accent,marginBottom:10}}>CSPRNG Generator</div>
              {[{a:"Brute Force",b:"Resistant",p:5},{a:"Seed Prediction",b:"Immune",p:2},{a:"State Recovery",b:"Immune",p:2},{a:"Pattern Analysis",b:"Immune",p:3}].map((r,i)=><div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#8892a4",marginBottom:3}}><span>{r.a}</span><span>{r.b}</span></div>
                <div style={{height:6,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:T.accent,width:r.p+"%"}}/></div>
              </div>)}
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#f87171",marginBottom:10}}>Normal PRNG Generator</div>
              {[{a:"Brute Force",b:"Moderate Risk",p:45},{a:"Seed Prediction",b:"High Risk",p:85},{a:"State Recovery",b:"High Risk",p:78},{a:"Pattern Analysis",b:"Vulnerable",p:70}].map((r,i)=><div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#8892a4",marginBottom:3}}><span>{r.a}</span><span>{r.b}</span></div>
                <div style={{height:6,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:"#f87171",width:r.p+"%"}}/></div>
              </div>)}
            </div>
          </div>
        </div>

        <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.bdr},transparent)`,margin:"32px 0"}}/>

        <h2 style={infoH2}>Entropy Fun Facts From Physics</h2>
        <p style={infoP}>The word "entropy" in cryptography is borrowed directly from physics — specifically thermodynamics. It measures <strong style={{color:T.text}}>disorder and unpredictability</strong> in both worlds.</p>

        {[
          {emoji:"☕",title:"Why Does Your Coffee Go Cold?",body:"You make a fresh cup of hot coffee. You leave it on your desk. 20 minutes later, it's lukewarm. Why? Entropy. In physics, the Second Law of Thermodynamics says that entropy (disorder) in a closed system always increases. Your hot coffee has concentrated heat energy — that's low entropy. The room is cooler — that's high entropy. Heat flows from hot to cold until everything equalizes.",simple:"Think of it like pouring a drop of red ink into water. It spreads out everywhere and you can never get it back into one neat drop. Heat does the same thing. Your coffee's warmth escapes into the room because nature always moves toward spreading things out evenly. That's entropy — the reason you've never seen a cold cup of coffee spontaneously heat itself up!"},
          {emoji:"🃏",title:"A Shuffled Deck Has More Arrangements Than Atoms in Earth",body:"A standard 52-card deck can be arranged in 52! (52 factorial) ways. That's roughly 8 × 10⁶⁷ possible orderings. For perspective, there are only about 10⁵⁰ atoms in the entire Earth. Every time you properly shuffle a deck, that specific ordering has almost certainly never existed before in human history.",simple:"Imagine every human who ever lived shuffled a deck once every second since the Big Bang. They still wouldn't come close to covering all possible orderings. A well-shuffled deck is nature's own password generator — and it's exactly this massive possibility space that makes cryptographic passwords strong. More possibilities = harder to guess = more entropy."},
          {emoji:"🌌",title:"The Universe Will \"Die\" of Entropy",body:"Scientists predict that in about 10¹⁰⁰ years (a googol years), the universe will reach maximum entropy — a state called Heat Death. All stars will burn out, all matter will decay, and temperature will be perfectly uniform everywhere.",simple:"Imagine the universe is a giant battery. Right now, it has charged spots (stars, planets) and empty spots (cold space). This difference drives everything — weather, life, chemistry. But slowly, everything is evening out. One day, everything will be the exact same temperature and nothing can ever happen again. Same principle as your coffee — just on a cosmic scale!"},
          {emoji:"🔗",title:"So How Does This Connect to Passwords?",body:"In cryptography, entropy = unpredictability. A password with 128 bits of entropy has 2¹²⁸ possible states — just like a physical system with enormous disorder. An attacker trying to guess it faces the same hopeless odds as trying to un-shuffle a deck back to a specific order.",simple:"Your computer collects tiny bits of chaos from the real world — electrical static, the exact microsecond you pressed a key, tiny temperature fluctuations in the chip. It mixes all this unpredictable physical noise into your password. So in a very real way, the same force of nature that cools your coffee is what makes your password uncrackable."}
        ].map((fact,i)=><div key={i} style={{background:`linear-gradient(135deg,${T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"},${T.dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)"})`,border:`1px solid rgba(${T.accentRgb},0.2)`,borderRadius:18,padding:"24px 22px",margin:"20px 0",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,background:`radial-gradient(circle,rgba(${T.accentRgb},0.1),transparent 70%)`,pointerEvents:"none"}}/>
          <div style={{fontSize:28,marginBottom:10}}>{fact.emoji}</div>
          <h4 style={{fontFamily:`${F.heading},sans-serif`,fontSize:16,color:T.accent,marginBottom:10}}>{fact.title}</h4>
          <p style={{fontSize:13,color:"#8892a4",lineHeight:1.7,marginBottom:10}}>{fact.body}</p>
          <div style={{background:`rgba(${T.accentRgb},0.06)`,borderLeft:`3px solid ${T.accent}`,padding:"10px 14px",borderRadius:"0 8px 8px 0",fontSize:12,color:"#8892a4",lineHeight:1.7}}>
            <strong style={{color:T.accent}}>In simple words: </strong>{fact.simple}
          </div>
        </div>)}

        <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.bdr},transparent)`,margin:"32px 0"}}/>

        <h2 style={infoH2}>The Bottom Line</h2>
        <p style={infoP}>If you're building an app, writing a script, or choosing a password manager — always check that it uses a <strong style={{color:T.text}}>CSPRNG</strong> under the hood. In Python, use <code style={{background:T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",padding:"2px 6px",borderRadius:4,fontSize:12}}>secrets</code>. In JavaScript, use <code style={{background:T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",padding:"2px 6px",borderRadius:4,fontSize:12}}>crypto.getRandomValues()</code>.</p>
        <p style={infoP}>The visual difference between a CSPRNG password and a PRNG password is zero. But the security difference is the gap between <strong style={{color:T.accent}}>"uncrackable for billions of years"</strong> and <strong style={{color:"#f87171"}}>"broken in under a second."</strong></p>
        <p style={infoP}>And the next time your coffee goes cold, you can tell your coworkers it happened because of the Second Law of Thermodynamics — the very same law that keeps their passwords safe.</p>

        <div style={{textAlign:"center",marginTop:32,fontSize:12,color:"#4a5568"}}>Written with entropy and intention.</div>

        <div style={{marginTop:32,textAlign:"center"}}>
          <button onClick={()=>{setInfoPage("password-manager");setBlogArticle(null);window.scrollTo(0,0)}}
            style={{background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:10,padding:"14px 32px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,boxShadow:`0 4px 20px rgba(${T.accentRgb},0.35)`,transition:"all 0.3s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 6px 25px rgba(${T.accentRgb},0.5)`}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 4px 20px rgba(${T.accentRgb},0.35)`}}>
            Try ShieldCraft
          </button>
        </div>
          </>}
        </>;
      })()}</>
    };
    return(
      <div style={{width:"100%",height:"100vh",overflowY:"auto",overflowX:"hidden",background:T.dark?T.bg:"#0a0a12",color:T.dark?T.text:"#e2e8f0",fontFamily:`${F.body},sans-serif`,position:"relative"}}>
        <style>{css}</style>
        <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
          <canvas ref={gridCvsRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
          <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 70%)",filter:"blur(60px)",top:"-15%",left:"-10%",animation:"ldOrb1 25s ease-in-out infinite"}}/>
          <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,rgba(${T.accentRgb},0.18) 0%,transparent 70%)`,filter:"blur(45px)",bottom:"-10%",right:"-5%",animation:"ldOrb2 30s ease-in-out infinite"}}/>
        </div>
        <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"16px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",background:`linear-gradient(180deg,${T.dark?T.bg:"#0a0a12"} 0%,transparent 100%)`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setBlogArticle(null);setInfoPage(null)}}>
            <ButterflyLogo s={28} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn} flap/>
            <span style={{fontSize:18,fontWeight:800,letterSpacing:3,fontFamily:`${F.heading},sans-serif`,background:`linear-gradient(135deg,${T.dark?T.text:"#e2e8f0"} 30%,${T.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NOTESCRAFT</span>
          </div>
          <button onClick={()=>{if(blogArticle){setBlogArticle(null);window.scrollTo(0,0)}else{setInfoPage(null)}}} style={{background:`rgba(${T.accentRgb},0.08)`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1.5px solid rgba(${T.accentRgb},0.4)`,borderRadius:8,padding:"8px 20px",color:T.dark?T.text:"#e2e8f0",fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer",letterSpacing:1}}>{blogArticle?"← Blog":"← Back"}</button>
        </nav>
        <div style={{position:"relative",zIndex:1,maxWidth:800,margin:"0 auto",padding:"100px 24px 60px"}}>
          {infoPage==="password-manager"&&<>
            <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:pgQuantumSafe?"radial-gradient(circle,rgba(16,185,129,0.25) 0%,rgba(16,185,129,0.08) 40%,transparent 70%)":`radial-gradient(circle,rgba(${T.accentRgb},0.25) 0%,rgba(${T.accentRgb},0.08) 40%,transparent 70%)`,filter:"blur(60px)",top:"-5%",left:"-20%",pointerEvents:"none",animation:"ldOrb1 20s ease-in-out infinite",transition:"background 0.8s"}}/>
            <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:pgQuantumSafe?"radial-gradient(circle,rgba(16,185,129,0.2) 0%,rgba(16,185,129,0.05) 40%,transparent 70%)":"radial-gradient(circle,rgba(139,92,246,0.22) 0%,rgba(139,92,246,0.06) 40%,transparent 70%)",filter:"blur(50px)",bottom:"5%",right:"-15%",pointerEvents:"none",animation:"ldOrb2 25s ease-in-out infinite",transition:"background 0.8s"}}/>
            <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:pgQuantumSafe?"radial-gradient(circle,rgba(16,185,129,0.18) 0%,transparent 60%)":`radial-gradient(circle,rgba(${T.accentRgb},0.18) 0%,transparent 60%)`,filter:"blur(40px)",top:"35%",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",animation:"pgGlowPulse 4s ease-in-out infinite",transition:"background 0.8s"}}/>
            <div style={{position:"absolute",width:250,height:250,borderRadius:"50%",background:pgQuantumSafe?"radial-gradient(circle,rgba(16,185,129,0.15) 0%,transparent 70%)":"radial-gradient(circle,rgba(236,72,153,0.12) 0%,transparent 70%)",filter:"blur(45px)",top:"15%",right:"5%",pointerEvents:"none",animation:"pgGlowPulse 6s ease-in-out infinite 2s",transition:"background 0.8s"}}/>
          </>}
          <div style={{...(infoPage==="password-manager"?(pgQuantumSafe?{background:"rgba(16,185,129,0.04)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",border:"2.5px dashed rgba(16,185,129,0.7)",borderRadius:24,boxShadow:"0 12px 60px rgba(0,0,0,0.4),0 0 25px rgba(16,185,129,0.4),0 0 60px rgba(16,185,129,0.25),0 0 120px rgba(16,185,129,0.12),inset 0 0 30px rgba(16,185,129,0.06)",animation:"qmBorderGlow 3s ease-in-out infinite",transition:"all 0.6s"}:{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",border:`2px solid rgba(${T.accentRgb},0.6)`,borderRadius:24,boxShadow:`0 12px 60px rgba(0,0,0,0.4),0 0 25px rgba(${T.accentRgb},0.35),0 0 50px rgba(${T.accentRgb},0.2),0 0 100px rgba(${T.accentRgb},0.1),inset 0 0 25px rgba(${T.accentRgb},0.06),inset 0 1px 0 rgba(255,255,255,0.1)`,animation:"pgBorderGlow 4s ease-in-out infinite",transition:"all 0.6s"}):infoGlass),padding:"48px 40px",position:"relative",overflow:"hidden"}}>
            {infoPage==="password-manager"&&!pgQuantumSafe&&<>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent 10%,rgba(${T.accentRgb},0.5) 50%,transparent 90%)`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent 20%,rgba(139,92,246,0.2) 50%,transparent 80%)`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",top:0,left:0,bottom:0,width:1,background:`linear-gradient(180deg,rgba(${T.accentRgb},0.4),transparent 30%,transparent 70%,rgba(139,92,246,0.15))`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",top:0,right:0,bottom:0,width:1,background:`linear-gradient(180deg,rgba(${T.accentRgb},0.4),transparent 30%,transparent 70%,rgba(139,92,246,0.15))`,pointerEvents:"none"}}/>
            </>}
            {infoPage==="password-manager"&&pgQuantumSafe&&<>
              {/* Corner brackets — animated + glowing */}
              <div style={{position:"absolute",top:14,left:14,width:32,height:32,borderTop:"3px solid rgba(16,185,129,0.9)",borderLeft:"3px solid rgba(16,185,129,0.9)",borderRadius:"4px 0 0 0",pointerEvents:"none",animation:"qmCornerPulse 2s ease-in-out infinite"}}/>
              <div style={{position:"absolute",top:14,right:14,width:32,height:32,borderTop:"3px solid rgba(16,185,129,0.9)",borderRight:"3px solid rgba(16,185,129,0.9)",borderRadius:"0 4px 0 0",pointerEvents:"none",animation:"qmCornerPulse 2s ease-in-out infinite 0.5s"}}/>
              <div style={{position:"absolute",bottom:14,left:14,width:32,height:32,borderBottom:"3px solid rgba(16,185,129,0.9)",borderLeft:"3px solid rgba(16,185,129,0.9)",borderRadius:"0 0 0 4px",pointerEvents:"none",animation:"qmCornerPulse 2s ease-in-out infinite 1s"}}/>
              <div style={{position:"absolute",bottom:14,right:14,width:32,height:32,borderBottom:"3px solid rgba(16,185,129,0.9)",borderRight:"3px solid rgba(16,185,129,0.9)",borderRadius:"0 0 4px 0",pointerEvents:"none",animation:"qmCornerPulse 2s ease-in-out infinite 1.5s"}}/>
            </>}
            {infoPages[infoPage]}
          </div>
          {/* Floating neon side cards */}
          {infoPage==="password-manager"&&<>
            <div style={{position:"absolute",left:-260,top:130,width:245,height:190,pointerEvents:"none",animation:"neoFloat1 6s ease-in-out infinite",zIndex:2}}>
              <div style={{width:"100%",height:"100%",borderRadius:6,padding:"18px 18px",border:"2px solid rgba(16,185,129,0.8)",background:"rgba(16,185,129,0.1)",boxShadow:"0 0 15px rgba(16,185,129,0.35),0 0 30px rgba(16,185,129,0.18),inset 0 0 15px rgba(16,185,129,0.08)",transform:"rotate(-8deg)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{fontSize:17,fontWeight:900,color:"#10b981",marginBottom:8,fontFamily:"monospace",letterSpacing:1}}>⚛️ Quantum-Safe</div>
                <div style={{fontSize:13.5,color:"rgba(255,255,255,0.88)",lineHeight:1.65,fontFamily:"monospace",flex:1,overflow:"hidden"}}>Only password genrator with Grover-aware effective{"\n"}bits calculation —{"\n"}models real quantum{"\n"}attack cost, not just{"\n"}classical brute-force</div>
              </div>
            </div>
            <div style={{position:"absolute",right:-255,top:310,width:240,height:180,pointerEvents:"none",animation:"neoFloat2 7s ease-in-out infinite 1s",zIndex:2}}>
              <div style={{width:"100%",height:"100%",borderRadius:6,padding:"18px 18px",border:`2px solid rgba(${T.accentRgb},0.8)`,background:`rgba(${T.accentRgb},0.1)`,boxShadow:`0 0 15px rgba(${T.accentRgb},0.35),0 0 30px rgba(${T.accentRgb},0.18),inset 0 0 15px rgba(${T.accentRgb},0.08)`,transform:"rotate(6deg)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{fontSize:17,fontWeight:900,color:T.accent,marginBottom:8,fontFamily:"monospace",letterSpacing:1}}>🔑 256-Char Max</div>
                <div style={{fontSize:13.5,color:"rgba(255,255,255,0.88)",lineHeight:1.65,fontFamily:"monospace",flex:1,overflow:"hidden"}}>Most generators cap{"\n"}at 64-128 chars.{"\n"}Only password generator{"\n"}allowing ultra-long{"\n"}passwords for max{"\n"}entropy & future-proof</div>
              </div>
            </div>
            <div style={{position:"absolute",left:-250,top:400,width:240,height:175,pointerEvents:"none",animation:"neoFloat3 8s ease-in-out infinite 0.5s",zIndex:2}}>
              <div style={{width:"100%",height:"100%",borderRadius:6,padding:"18px 18px",border:"2px solid rgba(245,158,11,0.8)",background:"rgba(245,158,11,0.1)",boxShadow:"0 0 15px rgba(245,158,11,0.35),0 0 30px rgba(245,158,11,0.18),inset 0 0 15px rgba(245,158,11,0.08)",transform:"rotate(5deg)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{fontSize:17,fontWeight:900,color:"#f59e0b",marginBottom:8,fontFamily:"monospace",letterSpacing:1}}>🛡️ 100% Free</div>
                <div style={{fontSize:13.5,color:"rgba(255,255,255,0.88)",lineHeight:1.65,fontFamily:"monospace",flex:1,overflow:"hidden"}}>One and only free{"\n"}Quantum Resistant{"\n"}password generator{"\n"}tool — no signup,{"\n"}no limits, no ads</div>
              </div>
            </div>
          </>}
          {infoPage==="password-manager"&&<div onClick={()=>{setInfoPage("security-blog");window.scrollTo(0,0)}} style={{marginTop:32,borderRadius:16,overflow:"hidden",cursor:"pointer",border:`1px solid rgba(${T.accentRgb},0.2)`,background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.06)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",transition:"all 0.3s",boxShadow:`0 4px 24px rgba(0,0,0,0.2)`}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 32px rgba(${T.accentRgb},0.25)`}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,0.2)"}}>
            <div style={{height:160,background:`linear-gradient(135deg,rgba(${T.accentRgb},0.3) 0%,rgba(${T.accentRgb},0.05) 50%,rgba(139,92,246,0.2) 100%)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(255,255,255,0.02) 20px,rgba(255,255,255,0.02) 40px)"}}/>
              <div style={{fontSize:56,filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.3))",zIndex:1}}>🔐</div>
            </div>
            <div style={{padding:"20px 24px"}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.accent,display:"block",marginBottom:8}}>Security Deep-Dive</span>
              <h3 style={{fontSize:18,fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0",margin:"0 0 8px",lineHeight:1.3}}>Cryptographic vs Normal Password Generators</h3>
              <p style={{fontSize:12,color:T.dim,margin:0,lineHeight:1.5}}>Why the random numbers behind your passwords matter more than you think — explained with entropy, physics, and a cup of hot coffee.</p>
              <span style={{display:"inline-block",marginTop:12,fontSize:11,fontWeight:600,color:T.accent,letterSpacing:0.5}}>Read Article →</span>
            </div>
          </div>}
        </div>
        <footer style={{position:"relative",zIndex:1,padding:"30px 24px 24px",borderTop:`1px solid rgba(${T.accentRgb},0.15)`,textAlign:"center",background:`rgba(${T.dark?"0,0,0":"10,10,18"},0.12)`,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,flexWrap:"wrap",marginBottom:16}}>
            {["about","privacy","terms","password-manager","security-blog"].map(p=><button key={p} onClick={()=>{setInfoPage(p);window.scrollTo(0,0)}} style={{fontSize:12,color:infoPage===p?T.accent:"#94a3b8",textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:infoPage===p?700:400,letterSpacing:1}}>{p==="terms"?"Terms of Service":p==="privacy"?"Privacy Policy":p==="password-manager"?"ShieldCraft":p==="security-blog"?"Blog":p.charAt(0).toUpperCase()+p.slice(1)}</button>)}
          </div>
          <p style={{fontSize:11,color:"#7a8898",letterSpacing:0.8,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap",lineHeight:2,margin:0}}>
            <span style={{fontStyle:"italic"}}>Designed and Developed by</span>
            <span className="nc-footer-name" style={{fontWeight:800,fontSize:12,letterSpacing:2.5,fontFamily:`${F.heading},sans-serif`}}>SUNNY</span>
            <span>with lots of</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>love <span style={{animation:"footerHeartbeat 1.5s ease-in-out infinite",display:"inline-block",fontSize:13}}>💚</span></span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>coffee <span style={{animation:"footerSteam 2s ease-in-out infinite",display:"inline-block",fontSize:13}}>☕</span></span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>and AI <span style={{animation:"footerBlink 3s ease-in-out infinite",display:"inline-block",fontSize:13}}>👽</span></span>
          </p>
        </footer>
      </div>
    );
  }

  /* ═══════════ LANDING PAGE ═══════════ */
  if(showLanding&&authMode!=="app"){
    const goAuth=(mode)=>{if(window.location.hash)history.replaceState(null,"",window.location.pathname);if(ldScrollRef.current)ldScrollRef.current.scrollTop=0;window.scrollTo(0,0);document.documentElement.scrollTop=0;setShowLanding(false);setAuthMode(mode)};
    const ldGlass={background:T.dark?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid rgba(${T.accentRgb},0.12)`,borderRadius:20};
    const ldAnim=(d)=>({animation:`ldReveal 0.8s ease-out ${d}s both`});
    const onLdScroll=()=>{const c=ldScrollRef.current;if(!c)return;const ch=c.clientHeight;c.querySelectorAll("[data-ld]").forEach(el=>{const r=el.getBoundingClientRect();if(r.top<ch*0.88&&r.bottom>0)el.classList.add("ld-vis");else el.classList.remove("ld-vis")})};
    const features=[
      {icon:<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>,title:"End-to-End Encryption",desc:"AES-256-GCM encryption powered by PBKDF2 key derivation. Your data is encrypted before it ever leaves your device. Not even we can read it.",tag:"BY DESIGN"},
      {icon:<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23" stroke={T.err||"#ef4444"} strokeWidth="2"/></svg>,title:"Zero-Tracking Philosophy",desc:"No ads. No analytics. No surveillance. No data harvesting. We don't track what you write, when you write, or how you think.",tag:"EVER"},
      {icon:<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>,title:"Your Thoughts. Fully Yours.",desc:"What you write stays yours — cryptographically guaranteed. No server-side access, no backdoors, no third-party sharing. Complete digital sovereignty.",tag:"ALWAYS"},
    ];
    const plans=[
      {name:"Free",price:"$0",period:"forever",features:["Unlimited notes","E2E encryption","Cross-device sync","10 GB storage","Rich text & markdown","Calendar & reminders"],cta:"Start Free",pop:false},
      {name:"Pro",price:"$4",period:"/month",features:["Everything in Free","100 GB storage","Priority sync","File attachments","Advanced themes","Priority support"],cta:"Go Pro",pop:true},
      {name:"Lifetime",price:"$49",period:"one-time",features:["Everything in Pro","Lifetime access","All future updates","100 GB forever","Early feature access","Support the mission"],cta:"Get Lifetime",pop:false},
    ];
    return(
      <div ref={el=>{ldScrollRef.current=el;if(el)requestAnimationFrame(onLdScroll)}} onScroll={onLdScroll} style={{width:"100%",height:"100vh",overflowY:"auto",overflowX:"hidden",background:T.dark?T.bg:"#0a0a12",color:T.dark?T.text:"#e2e8f0",fontFamily:`${F.body},sans-serif`,position:"relative"}}>
        <style>{css}</style>

        {/* ── Animated Background ── */}
        <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
          {/* Canvas curved grid — flat at top, bends at bottom */}
          <canvas ref={gridCvsRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
          {/* Aurora gradient orbs - vibrant multi-color */}
          <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.3) 0%,transparent 70%)",filter:"blur(60px)",top:"-15%",left:"-10%",animation:"ldOrb1 25s ease-in-out infinite"}}/>
          <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.25) 0%,transparent 70%)",filter:"blur(50px)",bottom:"-10%",right:"-5%",animation:"ldOrb2 30s ease-in-out infinite"}}/>
          <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,rgba(${T.accentRgb},0.28) 0%,transparent 70%)`,filter:"blur(45px)",top:"30%",left:"50%",animation:"ldOrb1 20s ease-in-out infinite reverse"}}/>
          <div style={{position:"absolute",width:450,height:450,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,182,212,0.22) 0%,transparent 70%)",filter:"blur(40px)",top:"60%",left:"15%",animation:"ldOrb2 22s ease-in-out infinite 3s"}}/>
          {/* Horizontal light streaks */}
          {[0,1,2].map(i=><div key={i} style={{position:"absolute",top:`${25+i*25}%`,left:0,width:200,height:"1px",background:`linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.5),transparent)`,animation:`ldLine ${8+i*3}s linear infinite ${i*4}s`}}/>)}
          {/* Rising particles */}
          <div style={{position:"absolute",inset:0}}>{Array.from({length:8},(_,i)=><div key={i} className="ld-particle"/>)}</div>
        </div>

        {/* ── Interactive neon flip cards ── */}
        <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
          {[[180,130,'255,34,102','3%','8%',15,1,'14s','0s','Meeting Notes','Team standup at 9am\nReview sprint goals\nUpdate backlog items\nAssign new tickets\nDemo prep for Friday\nSync with design team','\u2588\u2591\u2593x\u00a7\u00b6\u2592\u2588\u00a4\u2591\u00a7\n\u2593\u2592\u00a4\u2588\u2591x\u00b6\u2593\u2592\u2588\n\u2591\u00a7\u2593\u2588\u2592\u00a4x\u00b6\u2591\n\u2588\u00a4\u2592x\u2593\u00a7\u2591\u00b6\u2588\n\u2593\u2591\u2588\u00a4x\u2592\u00a7\u00b6\n\u2592\u2588\u2591x\u00a7\u2593\u00b6\u00a4'],[220,160,'51,102,255','-5%','32%',-12,2,'18s','2s','My Journal','Today was a great day.\nFinished the project\non time. Team loved it.\nCelebrated with dinner.\nTomorrow: start v2.\nFeeling motivated.\nNew ideas brewing.','x\u00a7\u2593\u2591\u2588\u00b6\u2592\u00a4\u2591\n\u2588\u2592x\u00a7\u2593\u2591\u00b6\u2588\u00a4\n\u2591\u2593\u2588x\u00a4\u2592\u00a7\u00b6\n\u00a4\u2593\u2591\u2588\u00b6x\u00a7\u2592\n\u2592\u2588\u00a7x\u2591\u2593\u00b6\u00a4\n\u2588\u2591x\u00a7\u2593\u2592\u00b6\u00a4\n\u2591\u2593\u2588\u2592x\u00a4\u00a7\u00b6'],[140,100,'255,136,68','78%','12%',25,3,'16s','1s','Ideas','Build privacy-first app\nEnd-to-end encryption\nOffline mode support\nMarkdown editor\nCloud sync optional','x\u2592\u2588\u00a7\u2591\u2593\u00b6\u00a4\n\u2588\u2591\u2593x\u00a7\u2592\u00b6\n\u00a4\u2591\u2588x\u2593\u00a7\u2592\n\u2593\u2588\u00a4x\u2591\u00b6\u2592\n\u2591\u2588\u2593\u00a7x\u00a4\u00b6'],[100,70,'0,240,255','68%','55%',-20,1,'12s','3s','Todo','Buy groceries\nCall dentist at 3pm\nPick up dry cleaning\nPay electricity bill','x\u2591\u2593\u00a7\u2592\u2588\n\u00a4\u2591\u2588x\u2593\u00a7\n\u2592\u2588\u00a4\u2591x\u00b6\n\u2593\u2591x\u2588\u00a7\u2592'],[120,80,'170,68,255','12%','68%',35,2,'15s','4s','Recipes','Pasta: boil 8 min\nDrain, save cup water\nSaute garlic in oil\nAdd sauce + basil\nToss with pasta','x\u2588\u00a4\u2591\u00a7\u2593\u00b6\n\u2592\u2591\u2588\u00b6x\u00a4\u2593\n\u2588\u2591\u2593x\u00a7\u2592\u00b6\n\u00a4\u2593\u2591\u2588x\u2592\u00a7\n\u2591\u2588\u2593\u00a4x\u00b6\u2592'],[60,45,'0,255,136','48%','18%',-30,3,'10s','2.5s','Keys','API: sk-49f...\nDB: pg://usr\nSSH: id_rsa','x\u2591\u2593\u2588\u00a7\n\u2592\u00a4\u2588x\u2591\n\u2593\u2588\u2591\u00a7x'],[50,35,'255,34,102','88%','78%',45,1,'11s','5s','PIN','Bank: 4829\nPhone: 1947\nSafe: 7731','x\u2588\u2591\u2593\n\u00a7\u2592\u2588x\n\u2591\u2593\u00a4\u2588'],[40,30,'0,240,255','38%','88%',-15,2,'9s','1.5s','Pwd','admin@Q9!\nroot#Zk3\nssh!Mv2p','x\u2593\u2588\u2591\n\u00a7\u2592x\u2588\n\u2591\u2593\u2588x']].map(([w,h,rgb,x,y,r,f,d,dl,title,plain,enc],i)=><NeoFlipCard key={i} w={w} h={h} rgb={rgb} x={x} y={y} r={r} f={f} d={d} dl={dl} title={title} plain={plain} enc={enc} delay={i*1200}/>)}
        </div>

        {/* ── Navbar ── */}
        <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"16px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",background:`linear-gradient(180deg,${T.dark?T.bg:"#0a0a12"} 0%,transparent 100%)`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <ButterflyLogo s={28} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn} flap/>
            <span style={{fontSize:18,fontWeight:800,letterSpacing:3,fontFamily:`${F.heading},sans-serif`,background:`linear-gradient(135deg,${T.dark?T.text:"#e2e8f0"} 30%,${T.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NOTESCRAFT</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <a href="#features" className="ld-nav-btn" style={{color:"rgba(226,232,240,0.8)",fontSize:13,fontWeight:500,textDecoration:"none",fontFamily:"inherit"}}>Features</a>
            <a href="#pricing" className="ld-nav-btn" style={{color:"rgba(226,232,240,0.8)",fontSize:13,fontWeight:500,textDecoration:"none",fontFamily:"inherit"}}>Pricing</a>
            <button onClick={()=>setInfoPage("password-manager")} className="ld-nav-btn" style={{color:"rgba(226,232,240,0.8)",fontSize:13,fontWeight:500,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>ShieldCraft</button>
            <button onClick={()=>setInfoPage("security-blog")} className="ld-nav-btn" style={{color:"rgba(226,232,240,0.8)",fontSize:13,fontWeight:500,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Blog</button>
            <button onClick={()=>goAuth("login")} className="ld-nav-btn" style={{background:`rgba(${T.accentRgb},0.08)`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1.5px solid rgba(${T.accentRgb},0.4)`,borderRadius:8,padding:"8px 20px",color:T.dark?T.text:"#e2e8f0",fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer",letterSpacing:1}}>Sign In</button>
          </div>
        </nav>

        {/* ── Hero Section ── */}
        <section style={{position:"relative",zIndex:1,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"120px 24px 80px"}}>
          {/* Pulse rings */}
          <div style={{position:"absolute",top:"50%",left:"50%",width:200,height:200,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.3)`,animation:"ldPulseRing 4s ease-out infinite",pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:"50%",left:"50%",width:200,height:200,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.2)`,animation:"ldPulseRing 4s ease-out infinite 1.3s",pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:"50%",left:"50%",width:200,height:200,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.15)`,animation:"ldPulseRing 4s ease-out infinite 2.6s",pointerEvents:"none"}}/>

          <div style={{animation:"ldTextReveal 1s ease-out, butterflyFly 20s ease-in-out infinite",marginBottom:20,filter:`drop-shadow(0 4px 20px rgba(${T.accentRgb},0.4))`}}>
            <ButterflyLogo s={64} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn} flap/>
          </div>
          <h1 style={{fontSize:"clamp(48px,8vw,88px)",fontWeight:900,letterSpacing:"clamp(6px,1.5vw,16px)",fontFamily:`${F.heading},sans-serif`,margin:0,lineHeight:1.1,background:`linear-gradient(135deg,${T.dark?T.text:"#e2e8f0"} 20%,${T.accent} 50%,${T.accent2||T.accent} 80%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"ldTextReveal 1s ease-out 0.2s both"}}>NOTESCRAFT</h1>
          <p style={{fontSize:"clamp(10px,1.2vw,13px)",fontWeight:500,letterSpacing:5,textTransform:"uppercase",color:T.accent,marginTop:16,animation:"ldTextReveal 1s ease-out 0.4s both"}}>Where privacy is part of the craft</p>
          <p style={{fontSize:"clamp(16px,2vw,22px)",maxWidth:600,lineHeight:1.7,marginTop:24,color:"#cbd5e1",fontWeight:300,animation:"ldTextReveal 1s ease-out 0.6s both"}}>Privacy isn't an add-on. It's built into every word.</p>
          <div style={{display:"flex",gap:16,marginTop:40,flexWrap:"wrap",justifyContent:"center",animation:"ldTextReveal 1s ease-out 0.8s both"}}>
            <button onClick={()=>goAuth("login")} className="ld-cta" style={{padding:"16px 36px",background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,fontFamily:`${F.heading},sans-serif`,cursor:"pointer",letterSpacing:2,boxShadow:`0 4px 25px rgba(${T.accentRgb},0.35)`}}>START WRITING SECURELY</button>
            <a href="#features" className="ld-cta-ghost" style={{padding:"16px 36px",background:`rgba(${T.accentRgb},0.08)`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1.5px solid rgba(${T.accentRgb},0.4)`,borderRadius:12,color:T.dark?T.text:"#e2e8f0",fontSize:15,fontWeight:600,fontFamily:`${F.heading},sans-serif`,cursor:"pointer",letterSpacing:1,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}>SEE HOW IT WORKS <span style={{fontSize:18}}>↓</span></a>
          </div>
          {/* Scroll hint */}
          <div style={{position:"absolute",bottom:40,animation:"ldFloat 3s ease-in-out infinite",opacity:0.4}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section id="features" className="ld-section" data-ld="" style={{position:"relative",zIndex:1,padding:"80px 24px",maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:64}}>
            <p style={{fontSize:11,fontWeight:600,letterSpacing:5,textTransform:"uppercase",color:T.accent,marginBottom:12}}>SECURITY ARCHITECTURE</p>
            <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:800,fontFamily:`${F.heading},sans-serif`,margin:0,lineHeight:1.2,color:T.dark?T.text:"#e2e8f0"}}>Built on Unbreakable Foundations</h2>
            <p style={{fontSize:16,color:"#b0bec9",marginTop:12,maxWidth:500,margin:"12px auto 0"}}>Every layer engineered for privacy. Every decision made for you.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24}}>
            {features.map((f,i)=>(
              <div key={i} className="ld-card" style={{...ldGlass,padding:"36px 28px",textAlign:"center"}}>
                <div style={{width:80,height:80,borderRadius:20,background:`rgba(${T.accentRgb},0.06)`,border:`1px solid rgba(${T.accentRgb},0.1)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>{f.icon}</div>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:3,color:T.accent,textTransform:"uppercase"}}>{f.tag}</span>
                <h3 style={{fontSize:20,fontWeight:700,fontFamily:`${F.heading},sans-serif`,margin:"10px 0 12px",color:T.dark?T.text:"#e2e8f0"}}>{f.title}</h3>
                <p style={{fontSize:14,lineHeight:1.8,color:"#b0bec9",margin:0}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Encryption Flow Visual ── */}
        <section className="ld-section" data-ld="" style={{position:"relative",zIndex:1,padding:"80px 24px 40px",maxWidth:1000,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <p style={{fontSize:11,fontWeight:600,letterSpacing:5,textTransform:"uppercase",color:T.accent,marginBottom:12}}>HOW IT WORKS</p>
            <h3 style={{fontSize:"clamp(26px,4vw,38px)",fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0",marginBottom:12}}>Your Data Journey</h3>
            <p style={{fontSize:16,color:"#94a3b8",maxWidth:600,margin:"0 auto",lineHeight:1.6}}>Every piece of data is encrypted on your device before it ever leaves. No one — not even us — can read your notes.</p>
          </div>

          {/* Horizontal flow chart */}
          <div style={{overflowX:"hidden",paddingBottom:0}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:0,minWidth:960,position:"relative"}}>
              {[
                {icon:"✍️",title:"You Type",desc:"Write notes, create events, manage your data freely in the app.",color:"139,92,246"},
                {icon:"🔑",title:"Key Derived",desc:"Your password generates a unique AES-256 encryption key. The key never leaves your device.",color:T.accentRgb},
                {icon:"🔐",title:"Encrypted Locally",desc:"All data is encrypted before it's sent to server. Even your note titles and tags are encrypted.",color:"34,197,94"},
                {icon:"📡",title:"Blob Sent",desc:"Only unreadable encrypted blobs are sent to the server. The server sees random bytes — no plaintext, no metadata.",color:"6,182,212"},
                {icon:"🗄️",title:"Stored Encrypted",desc:"Data is stored as encrypted blobs on the server. Even storage keys are hashed — the server can't link data to your email.",color:"245,158,11"},
                {icon:"🔓",title:"You Decrypt",desc:"When you sign in on any device, your password re-derives the same key. Only you can unlock and read your data.",color:"239,68,68"}
              ].map((step,i)=>(
              <React.Fragment key={i}>
                  <div className="ld-section" data-ld="" style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",flex:"0 0 140px",gap:8,transitionDelay:`${i*0.15}s`}}>
                    <div style={{width:60,height:60,borderRadius:16,background:`rgba(${step.color},0.1)`,border:`2px solid rgba(${step.color},0.35)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:`0 0 24px rgba(${step.color},0.2)`}}>
                      {step.icon}
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:T.dark?T.text:"#e2e8f0",fontFamily:`${F.heading},sans-serif`,lineHeight:1.3}}>{step.title}</div>
                    <p style={{fontSize:11,color:"#94a3b8",lineHeight:1.5,margin:0,maxWidth:140}}>{step.desc}</p>
                  </div>
                  {i<5&&<div className="ld-section" data-ld="" style={{display:"flex",alignItems:"center",flex:"0 0 24px",paddingTop:20,transitionDelay:`${i*0.15+0.1}s`}}>
                    <svg width="24" height="20" viewBox="0 0 24 20" fill="none"><path d="M2 10h16M14 4l6 6-6 6" stroke={`rgba(${step.color},0.5)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ── App Preview ── */}
        <section className="ld-section" data-ld="" style={{position:"relative",zIndex:1,padding:"40px 24px 100px",maxWidth:1000,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:40}}>
            <p style={{fontSize:11,fontWeight:600,letterSpacing:5,textTransform:"uppercase",color:T.accent,marginBottom:12}}>BEAUTIFUL INTERFACE</p>
            <h2 style={{fontSize:"clamp(28px,4vw,40px)",fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0"}}>Writing, Elevated</h2>
            <p style={{fontSize:16,color:"#b0bec9",marginTop:8}}>A distraction-free workspace that feels like the future</p>
          </div>
          <div style={{animation:"ldMockFloat 8s ease-in-out 1.2s infinite",maxWidth:800,margin:"0 auto"}}>
            <div style={{...ldGlass,borderRadius:16,overflow:"hidden",boxShadow:`0 30px 80px rgba(0,0,0,0.4), 0 0 60px rgba(${T.accentRgb},0.06)`}}>
              {/* Window bar */}
              <div style={{padding:"12px 16px",borderBottom:`1px solid rgba(${T.accentRgb},0.08)`,display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:12,height:12,borderRadius:"50%",background:"#ff5f57"}}/>
                <div style={{width:12,height:12,borderRadius:"50%",background:"#febc2e"}}/>
                <div style={{width:12,height:12,borderRadius:"50%",background:"#28c840"}}/>
                <span style={{flex:1,textAlign:"center",fontSize:12,color:"#8896a4",letterSpacing:1}}>NotesCraft</span>
              </div>
              {/* Mock content */}
              <div style={{display:"flex",minHeight:300}}>
                {/* Sidebar mock */}
                <div style={{width:180,borderRight:`1px solid rgba(${T.accentRgb},0.06)`,padding:"16px 12px"}}>
                  {["My Journal","Project Ideas","Reading List","Travel Plans"].map((n,i)=>(
                    <div key={i} style={{padding:"8px 10px",borderRadius:8,fontSize:13,color:i===0?T.accent:"#94a3b8",background:i===0?`rgba(${T.accentRgb},0.08)`:"transparent",marginBottom:4,fontWeight:i===0?600:400}}>{n}</div>
                  ))}
                  <div style={{marginTop:16,padding:"0 10px"}}>
                    <div style={{width:"60%",height:3,borderRadius:2,background:`rgba(${T.accentRgb},0.15)`,marginBottom:6}}/>
                    <div style={{fontSize:10,color:"#6b7a8a"}}>0.02 GB / 10 GB</div>
                  </div>
                </div>
                {/* Editor mock */}
                <div style={{flex:1,padding:"24px 28px"}}>
                  <div style={{fontSize:24,fontWeight:700,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0",marginBottom:16}}>My Journal</div>
                  <div style={{fontSize:14,lineHeight:2,color:"#a8b5c4"}}>
                    <p>Today was a breakthrough. The new encryption layer is working beautifully — every word protected by AES-256 before it touches the network.</p>
                    <p style={{marginTop:12}}>Sometimes the best features are the ones nobody sees. <span style={{color:T.accent,fontWeight:600}}>Privacy by design</span> means the architecture does the heavy lifting.</p>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:20}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:T.ok||"#22c55e",boxShadow:`0 0 4px ${T.ok||"#22c55e"}`}}/>
                    <span style={{fontSize:11,color:"#8896a4"}}>Encrypted · Synced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Section ── */}
        <section id="pricing" className="ld-section" data-ld="" style={{position:"relative",zIndex:1,padding:"80px 24px 100px",maxWidth:1000,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:50}}>
            <p style={{fontSize:11,fontWeight:600,letterSpacing:5,textTransform:"uppercase",color:T.accent,marginBottom:12}}>SIMPLE PRICING</p>
            <h2 style={{fontSize:"clamp(28px,4vw,40px)",fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0"}}>Privacy Shouldn't Cost a Fortune</h2>
            <p style={{fontSize:16,color:"#b0bec9",marginTop:8}}>Start free. Upgrade when you're ready. No tracking either way.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,alignItems:"start"}}>
            {plans.map((p,i)=>(
              <div key={i} className="ld-price-card" style={{...ldGlass,padding:"36px 28px",textAlign:"center",position:"relative",overflow:"hidden",borderColor:p.pop?`rgba(${T.accentRgb},0.3)`:`rgba(${T.accentRgb},0.08)`}}>
                {p.pop&&<div style={{position:"absolute",top:16,right:-30,background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,color:"#fff",fontSize:10,fontWeight:700,letterSpacing:2,padding:"4px 40px",transform:"rotate(45deg)",textTransform:"uppercase"}}>POPULAR</div>}
                <h3 style={{fontSize:18,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:2,color:T.dark?T.text:"#e2e8f0",margin:"0 0 8px"}}>{p.name}</h3>
                <div style={{marginBottom:20}}>
                  <span style={{fontSize:44,fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:p.pop?T.accent:(T.dark?T.text:"#e2e8f0")}}>{p.price}</span>
                  <span style={{fontSize:14,color:"#94a3b8",marginLeft:4}}>{p.period}</span>
                </div>
                <div style={{marginBottom:24,display:"inline-flex",flexDirection:"column",textAlign:"left"}}>
                  {p.features.map((f,j)=>(
                    <div key={j} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{fontSize:13,color:"#cbd5e1"}}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>goAuth("login")} className={p.pop?"ld-cta":"ld-cta-ghost"} style={{width:"100%",padding:"14px 0",borderRadius:10,fontSize:14,fontWeight:700,fontFamily:`${F.heading},sans-serif`,cursor:"pointer",letterSpacing:2,...(p.pop?{background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",color:"#fff",boxShadow:`0 4px 20px rgba(${T.accentRgb},0.3)`}:{background:`rgba(${T.accentRgb},0.08)`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1.5px solid rgba(${T.accentRgb},0.4)`,color:T.dark?T.text:"#e2e8f0"})}}>{p.cta}</button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="ld-section" data-ld="" style={{position:"relative",zIndex:1,padding:"60px 24px 40px",textAlign:"center"}}>
          <div>
            <h2 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:800,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0",marginBottom:12}}>Ready to Think Freely?</h2>
            <p style={{fontSize:16,color:"#b0bec9",marginBottom:32,maxWidth:450,margin:"0 auto 32px"}}>Your notes deserve the same privacy as your thoughts.</p>
            <button onClick={()=>goAuth("login")} className="ld-cta" style={{padding:"18px 48px",background:`linear-gradient(135deg,${T.accent},${T.accent2||T.accent})`,border:"none",borderRadius:14,color:"#fff",fontSize:16,fontWeight:700,fontFamily:`${F.heading},sans-serif`,cursor:"pointer",letterSpacing:3,boxShadow:`0 4px 30px rgba(${T.accentRgb},0.35)`}}>GET STARTED FREE</button>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{position:"relative",zIndex:1,padding:"40px 24px 30px",borderTop:`1px solid rgba(${T.accentRgb},0.15)`,textAlign:"center",background:`rgba(${T.dark?"0,0,0":"10,10,18"},0.12)`,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}>
            <ButterflyLogo s={22} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.dark?T.text:"#e2e8f0"} warn={T.warn}/>
            <span style={{fontSize:14,fontWeight:700,letterSpacing:3,fontFamily:`${F.heading},sans-serif`,color:T.dark?T.text:"#e2e8f0"}}>NOTESCRAFT</span>
          </div>
          <p style={{fontSize:12,color:"#8896a4",marginBottom:20,maxWidth:400,margin:"0 auto 20px",lineHeight:1.7}}>Privacy isn't a feature we added. It's the reason we built this.</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginBottom:24,flexWrap:"wrap"}}>
            <a href="#features" style={{fontSize:12,color:"#94a3b8",textDecoration:"none"}}>Features</a>
            <a href="#pricing" style={{fontSize:12,color:"#94a3b8",textDecoration:"none"}}>Pricing</a>
            <button onClick={()=>goAuth("login")} style={{fontSize:12,color:"#94a3b8",textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Sign In</button>
            <span style={{color:"rgba(148,163,184,0.3)"}}>·</span>
            <button onClick={()=>setInfoPage("about")} style={{fontSize:12,color:"#94a3b8",textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>About</button>
            <button onClick={()=>setInfoPage("privacy")} style={{fontSize:12,color:"#94a3b8",textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Privacy</button>
            <button onClick={()=>setInfoPage("terms")} style={{fontSize:12,color:"#94a3b8",textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Terms</button>
            <button onClick={()=>setInfoPage("password-manager")} style={{fontSize:12,color:"#94a3b8",textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>ShieldCraft</button>
            <button onClick={()=>setInfoPage("security-blog")} style={{fontSize:12,color:"#94a3b8",textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Blog</button>
          </div>
          <p style={{fontSize:11,color:"#7a8898",letterSpacing:0.8,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap",lineHeight:2,margin:0}}>
            <span style={{fontStyle:"italic"}}>Designed and Developed by</span>
            <span className="nc-footer-name" style={{fontWeight:800,fontSize:12,letterSpacing:2.5,fontFamily:`${F.heading},sans-serif`}}>SUNNY</span>
            <span>with lots of</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>love <span style={{animation:"footerHeartbeat 1.5s ease-in-out infinite",display:"inline-block",fontSize:13}}>💚</span></span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>coffee <span style={{animation:"footerSteam 2s ease-in-out infinite",display:"inline-block",fontSize:13}}>☕</span></span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>and AI <span style={{animation:"footerBlink 3s ease-in-out infinite",display:"inline-block",fontSize:13}}>👽</span></span>
          </p>
        </footer>
      </div>
    );
  }

  /* ═══════════ 2FA VERIFICATION SCREEN ═══════════ */
  if(authMode==="2fa"){
    return(
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:9999,background:T.dark?`linear-gradient(135deg,${T.bg} 0%,${T.bg2} 50%,${T.bg} 100%)`:`linear-gradient(135deg,${T.bg} 0%,${T.bg2} 50%,${T.bg3} 100%)`,backgroundSize:"400% 400%",animation:"gradientShift 8s ease infinite",fontFamily:`${F.body},sans-serif`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{css}</style>
        <canvas ref={gridCvsRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.3)`,animation:"ringExpand 4s ease-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.2)`,animation:"ringExpand 4s ease-out infinite 2s",pointerEvents:"none"}}/>

        <div style={{position:"relative",zIndex:10,textAlign:"center",animation:"fadeUp 0.5s ease-out both",width:400,maxWidth:"90%",padding:"36px 32px",borderRadius:20,background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:`1px solid rgba(${T.accentRgb},0.2)`,boxShadow:`0 8px 40px rgba(0,0,0,0.25), 0 0 80px rgba(${T.accentRgb},0.08)`}}>

          <div style={{margin:"0 auto 16px",width:56,height:56,borderRadius:16,background:`rgba(${T.accentRgb},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,border:`1.5px solid rgba(${T.accentRgb},0.25)`}}>🛡️</div>

          <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 4px",fontFamily:`${F.heading},sans-serif`,color:T.text,letterSpacing:2}}>TWO-FACTOR AUTH</h1>
          <p style={{fontSize:11,color:T.dim,margin:"0 0 24px"}}>{useRecoveryCode?"Enter one of your recovery codes":"Enter the 6-digit code from your authenticator app"}</p>

          {useRecoveryCode?(
            <input value={twoFACode} onChange={e=>{setTwoFACode(e.target.value.toUpperCase());setTwoFAErr("")}} placeholder="XXXXX-XXXXX" maxLength={11}
              style={{...inp,width:"100%",padding:"14px 16px",textAlign:"center",letterSpacing:3,fontSize:18,fontFamily:"monospace"}}/>
          ):(
            <input value={twoFACode} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);setTwoFACode(v);setTwoFAErr("")}} placeholder="000000" inputMode="numeric" maxLength={6} autoFocus
              style={{...inp,width:"100%",padding:"16px 16px",textAlign:"center",letterSpacing:10,fontSize:28,fontFamily:"monospace",fontWeight:700}}
              onKeyDown={e=>{if(e.key==="Enter"&&twoFACode.length>=6)doVerify2FA()}}/>
          )}

          {twoFAErr&&<p style={{color:T.err,fontSize:12,marginTop:10,textAlign:"center"}}>{twoFAErr}</p>}

          <button onClick={doVerify2FA} disabled={twoFALoad||(!useRecoveryCode&&twoFACode.length<6)}
            style={{width:"100%",padding:"14px 0",marginTop:16,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,fontFamily:`${F.heading},sans-serif`,cursor:twoFALoad?"wait":"pointer",letterSpacing:2,boxShadow:`0 4px 25px rgba(${T.accentRgb},0.35)`,opacity:twoFALoad?0.6:1,transition:"all 0.3s"}}>
            {twoFALoad?"VERIFYING...":"VERIFY"}
          </button>

          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>{setUseRecoveryCode(!useRecoveryCode);setTwoFACode("");setTwoFAErr("")}}
              style={{background:"none",border:"none",color:T.accent,fontSize:11,cursor:"pointer",fontFamily:"inherit",opacity:0.8}}>
              {useRecoveryCode?"Use authenticator code instead":"Lost your device? Use a recovery code"}
            </button>
            <button onClick={()=>{setAuthMode("login");setPending2FA(null);setTwoFACode("");setTwoFAErr("");setUseRecoveryCode(false)}}
              style={{background:"none",border:"none",color:T.dim,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← Back to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════ AUTH SCREEN ═══════════ */
  if(authMode!=="app"){
    const isL=authMode==="login";
    return(
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:9999,background:T.dark?`linear-gradient(135deg,${T.bg} 0%,${T.bg2} 50%,${T.bg} 100%)`:`linear-gradient(135deg,${T.bg} 0%,${T.bg2} 50%,${T.bg3} 100%)`,backgroundSize:"400% 400%",animation:"gradientShift 8s ease infinite",fontFamily:`${F.body},sans-serif`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{css}</style>

        {/* Canvas curved grid — flat at top, bends at bottom */}
        <canvas ref={gridCvsRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>

        {/* Aurora / nebula bands - vibrant */}
        <div style={{position:"absolute",top:"-20%",left:"-10%",width:"120%",height:"40%",background:`linear-gradient(90deg,transparent,rgba(139,92,246,0.15),rgba(${T.accentRgb},0.2),rgba(139,92,246,0.15),transparent)`,filter:"blur(60px)",animation:"auroraShift 12s ease-in-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-15%",left:"-10%",width:"120%",height:"35%",background:`linear-gradient(90deg,transparent,rgba(236,72,153,0.12),rgba(${T.accentRgb},0.18),rgba(236,72,153,0.12),transparent)`,filter:"blur(50px)",animation:"auroraShift 15s ease-in-out infinite 3s",pointerEvents:"none"}}/>

        {/* Expanding pulse rings from center */}
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.3)`,animation:"ringExpand 4s ease-out infinite",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.25)`,animation:"ringExpand 4s ease-out infinite 1.3s",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:300,height:300,borderRadius:"50%",border:`1.5px solid rgba(${T.accentRgb},0.2)`,animation:"ringExpand 4s ease-out infinite 2.6s",pointerEvents:"none"}}/>

        {/* Large floating color orbs - multi-color */}
        <div style={{position:"absolute",width:650,height:650,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.25) 0%,rgba(139,92,246,0.08) 35%,transparent 70%)",filter:"blur(30px)",top:"-15%",left:"-5%",animation:"orbMove1 22s ease-in-out infinite, orbBreathe 5s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:580,height:580,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.2) 0%,rgba(236,72,153,0.06) 35%,transparent 70%)",filter:"blur(25px)",bottom:"-10%",right:"-5%",animation:"orbMove2 26s ease-in-out infinite, orbBreathe 7s ease-in-out infinite 2s"}}/>
        <div style={{position:"absolute",width:480,height:480,borderRadius:"50%",background:`radial-gradient(circle,rgba(${T.accentRgb},0.22) 0%,rgba(${T.accentRgb},0.07) 35%,transparent 70%)`,filter:"blur(20px)",top:"30%",right:"20%",animation:"orbMove3 18s ease-in-out infinite, orbBreathe 6s ease-in-out infinite 1s"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,182,212,0.18) 0%,rgba(6,182,212,0.05) 35%,transparent 70%)",filter:"blur(35px)",top:"50%",left:"30%",animation:"orbMove1 30s ease-in-out infinite reverse, orbBreathe 8s ease-in-out infinite 3s"}}/>

        {/* Interactive neon flip cards (auth page) */}
        {[[120,85,'255,34,102','5%','10%',20,1,'16s','0s','Notes','Quick ideas for later\nBrainstorm features\nResearch competitors\nSketch wireframes\nAsk for feedback','\u2588\u2591\u2593x\u00a7\u00b6\u2592\n\u2593\u2592\u00a4\u2588\u2591x\u00b6\n\u2591\u00a7\u2593\u2588\u2592\u00a4x\n\u2588\u00a4\u2592x\u2593\u00a7\u2591\n\u2593\u2591\u2588\u00a4x\u2592\u00a7'],[90,65,'51,102,255','82%','18%',-15,2,'20s','3s','Draft','Dear team,\nPlease review the\nattached proposal.\nDeadline is Friday.','\u00a4\u2593\u2591\u2588\u00b6x\u00a7\n\u2592\u2588x\u00a7\u2593\u2591\u00b6\n\u2591\u2593\u2588x\u00a4\u2592\u00a7\n\u2588\u00a4\u2591\u2593x\u00a7\u2592'],[70,50,'0,240,255','75%','72%',30,3,'14s','2s','Secret','API: sk-49f3...\nDB: pg://host\nToken: ey8Jh...','\u2588\u2591\u2593x\u00a7\u2592\n\u00a4\u2591\u2588x\u2593\u00b6\n\u2592\u2588\u00a7\u2591x\u2593'],[55,38,'170,68,255','8%','78%',-25,1,'12s','5s','PIN','Bank: 4829\nPhone: 1947\nSafe: 7731','\u2588\u2591\u2593\u2588\n\u00a7\u2592\u2588x\n\u2591\u2593\u00a4\u2588']].map(([w,h,rgb,x,y,r,f,d,dl,title,plain,enc],i)=><NeoFlipCard key={'nr'+i} w={w} h={h} rgb={rgb} x={x} y={y} r={r} f={f} d={d} dl={dl} title={title} plain={plain} enc={enc} opacity={0.85} delay={i*1500}/>)}

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

        {/* Auth card + warning card wrapper */}
        {/* Auth card */}
        <div style={{position:"relative",zIndex:10,textAlign:"center",animation:shake?"shake 0.6s":"fadeUp 0.5s ease-out both",width:400,maxWidth:"100%",padding:"28px 28px",borderRadius:20,background:T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:`1px solid rgba(${T.accentRgb},0.2)`,boxShadow:`0 8px 40px rgba(0,0,0,0.25), 0 0 80px rgba(${T.accentRgb},0.08), inset 0 0 0 1px rgba(255,255,255,${T.dark?0.06:0.12}), inset 0 1px 0 rgba(255,255,255,${T.dark?0.08:0.15})`}}>
          {/* Butterfly logo — flying animation (protected) */}
          <div onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} style={{margin:"0 auto 12px",animation:"authButterflyFly 12s ease-in-out infinite",filter:`drop-shadow(0 4px 20px rgba(${T.accentRgb},0.4))`,userSelect:"none",WebkitUserDrag:"none",position:"relative"}}>
            <ButterflyLogo s={56} accentRgb={T.accentRgb} accent={T.accent} accent2={T.accent2} text={T.text} warn={T.warn} flap/>
            <div style={{position:"absolute",inset:0,zIndex:1}}/>
          </div>

          <h1 style={{fontSize:28,fontWeight:900,margin:0,fontFamily:`${F.heading},sans-serif`,background:`linear-gradient(135deg,${T.text} 30%,${T.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:3}}>NOTESCRAFT</h1>

          <p style={{color:T.accent,fontSize:10,margin:"6px 0 0",fontWeight:500,letterSpacing:4,textTransform:"uppercase",fontFamily:`${F.body},sans-serif`}}>Where privacy is part of the craft</p>

          <p style={{color:T.text,fontSize:10,margin:"8px auto 20px",lineHeight:1.7,maxWidth:440,opacity:0.7}}>Privacy isn't an add-on or a setting you have to find.<br/>It's part of how NotesCraft is built — from the first word you write.</p>

          <div style={{display:"flex",gap:0,marginBottom:14,background:T.dark?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",borderRadius:10,padding:3,border:`1px solid rgba(${T.accentRgb},0.12)`}}>
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
            <div style={{position:"relative"}}><div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.text,opacity:0.5}}><IC.Lock/></div><input value={pw} onChange={e=>{setPw(e.target.value);setAuthErr("")}} placeholder="Password" type={showPw?"text":"password"} onFocus={()=>setPwFocus(true)} onBlur={()=>setPwFocus(false)} onKeyDown={e=>e.key==="Enter"&&(isL?doLogin():doSignup())} style={{...inp,width:"100%",padding:"12px 42px 12px 42px"}}/><button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.text,opacity:0.5,cursor:"pointer"}}>{showPw?<IC.EyeOff/>:<IC.Eye/>}</button></div>
            {/* Password strength meter + generator — signup only */}
            {!isL&&pw.length>0&&(()=>{const a=analyzePw(pw);return(
              <div style={{marginTop:2}}>
                <div style={{display:"flex",gap:3,marginBottom:3}}>{[0,1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=a.score-1?a.color:"rgba(255,255,255,0.1)",transition:"background 0.3s"}}/>)}</div>
                <div style={{fontSize:9,fontWeight:700,color:a.color,marginBottom:2}}>{a.label}</div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                  {a.checks.map((c,i)=><span key={i} style={{fontSize:9,color:c.ok?"#22c55e":"rgba(239,68,68,0.7)",display:"flex",alignItems:"center",gap:1,whiteSpace:"nowrap"}}>{c.ok?"✓":"✗"}{c.label}</span>)}
                </div>
              </div>
            )})()}
          </div>
          {authErr&&<p style={{color:T.err,fontSize:12,marginTop:8,textAlign:"left"}}>{authErr}</p>}
          <button onClick={isL?doLogin:doSignup} disabled={authLoad} className="auth-submit-btn"
            style={{width:"100%",padding:"14px 0",marginTop:16,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,backgroundSize:"200% 200%",border:`1px solid rgba(255,255,255,0.15)`,borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,fontFamily:`${F.heading},sans-serif`,cursor:authLoad?"wait":"pointer",letterSpacing:2,textTransform:"uppercase",boxShadow:`0 4px 25px rgba(${T.accentRgb},0.35), inset 0 1px 0 rgba(255,255,255,0.15)`,opacity:authLoad?.6:1,transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)"}}>
            {authLoad?"···":(isL?"SIGN IN":"CREATE ACCOUNT")}
          </button>
          <button onClick={()=>setShowLanding(true)} style={{marginTop:14,background:`rgba(${T.accentRgb},0.08)`,border:`1px solid rgba(${T.accentRgb},0.25)`,borderRadius:8,padding:"8px 20px",color:T.accent,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,transition:"all 0.3s"}}>← Back to home</button>
        </div>

        {/* Side cards — absolutely positioned right of form, doesn't affect centering */}
        {!isL&&<div style={{position:"absolute",left:"50%",marginLeft:224,top:"32%",transform:"translateY(-50%)",width:250,display:"flex",flexDirection:"column",gap:14,animation:"warnSlideIn 0.5s ease-out both",zIndex:10,pointerEvents:"auto"}}>

          {/* Encryption warning card */}
          <div style={{padding:"18px 16px",borderRadius:16,background:"rgba(10,10,20,0.65)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",border:`1.5px solid rgba(245,158,11,${pwFocus?0.5:0.25})`,boxShadow:`0 8px 32px rgba(0,0,0,0.3)${pwFocus?", 0 0 30px rgba(245,158,11,0.2)":""}`,transition:"border-color 0.4s, box-shadow 0.4s",textAlign:"left",...(pwFocus?{animation:"warnAttention 1.2s ease-in-out infinite, warnBorderGlow 1.2s ease-in-out infinite"}:{})}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:28,height:28,borderRadius:7,background:"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🔐</div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5}}>ENCRYPTION NOTICE</div>
                <div style={{fontSize:8,color:T.dim,marginTop:1}}>Please read carefully</div>
              </div>
            </div>
            <div style={{width:"100%",height:1,background:"linear-gradient(90deg,transparent,rgba(245,158,11,0.3),transparent)",marginBottom:10}}/>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:"#f59e0b",fontSize:10,lineHeight:1,marginTop:1,flexShrink:0}}>●</span><p style={{fontSize:9,color:"#cbd5e1",lineHeight:1.5,margin:0}}>Data encrypted with a key from <strong style={{color:"#f59e0b"}}>your password</strong></p></div>
              <div style={{display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:"#ef4444",fontSize:10,lineHeight:1,marginTop:1,flexShrink:0}}>●</span><p style={{fontSize:9,color:"#cbd5e1",lineHeight:1.5,margin:0}}>Lost password = data <strong style={{color:"#ef4444"}}>cannot be recovered</strong></p></div>
              <div style={{display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:"#22c55e",fontSize:10,lineHeight:1,marginTop:1,flexShrink:0}}>●</span><p style={{fontSize:9,color:"#cbd5e1",lineHeight:1.5,margin:0}}>We <strong style={{color:"#22c55e"}}>never store</strong> your password or keys</p></div>
              <div style={{display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:T.accent,fontSize:10,lineHeight:1,marginTop:1,flexShrink:0}}>●</span><p style={{fontSize:9,color:"#cbd5e1",lineHeight:1.5,margin:0}}>You are solely responsible for credentials</p></div>
            </div>
            {pwFocus&&<div style={{marginTop:10,padding:"6px 8px",borderRadius:6,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",textAlign:"center",animation:"fadeUp 0.3s ease-out"}}>
              <p style={{fontSize:7,fontWeight:700,color:"#f59e0b",margin:0,letterSpacing:0.3,lineHeight:1.5}}>⚠️ CHOOSE A PASSWORD YOU WILL REMEMBER<br/>OR SAVE PASSWORD SOMEWHERE SAFE</p>
            </div>}
          </div>

          {/* Password generator card */}
          <div style={{padding:"16px 14px",borderRadius:16,background:"rgba(10,10,20,0.65)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",border:`1.5px solid rgba(${T.accentRgb},0.25)`,boxShadow:"0 8px 32px rgba(0,0,0,0.35)",textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:28,height:28,borderRadius:7,background:`rgba(${T.accentRgb},0.15)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🎲</div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:T.accent,letterSpacing:0.5}}>PASSWORD GENERATOR</div>
                <div style={{fontSize:8,color:T.dim,marginTop:1}}>Strong & memorable</div>
              </div>
            </div>
            <div style={{width:"100%",height:1,background:`linear-gradient(90deg,transparent,rgba(${T.accentRgb},0.25),transparent)`,marginBottom:10}}/>
            {!showPwGen?<button type="button" onClick={()=>{const g=generateStrongPw();setGenPw(g);setGenCopied(false);setShowPwGen(true)}} style={{width:"100%",padding:"8px 0",background:`rgba(${T.accentRgb},0.08)`,border:`1px dashed rgba(${T.accentRgb},0.3)`,borderRadius:8,color:T.accent,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:0.3,transition:"all 0.2s"}}>Generate a Password</button>
            :<div style={{animation:"fadeUp 0.2s ease-out"}}>
              <code style={{display:"block",fontSize:11,color:genScrambling?T.accent:"#22c55e",fontFamily:"monospace",wordBreak:"break-all",background:"rgba(0,0,0,0.3)",padding:"8px 10px",borderRadius:6,letterSpacing:0.5,marginBottom:8,border:`1px solid ${genScrambling?`rgba(${T.accentRgb},0.4)`:"rgba(34,197,94,0.15)"}`,transition:"border-color 0.2s, color 0.2s",textShadow:genScrambling?`0 0 6px rgba(${T.accentRgb},0.4)`:"none"}}>{genPwDisplay||genPw}</code>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>{setPw(genPw);setShowPwGen(false);setAuthErr("")}} style={{flex:1,padding:"6px 0",background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:6,color:"#22c55e",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Use This</button>
                <button onClick={()=>{navigator.clipboard.writeText(genPw).then(()=>{setGenCopied(true);setTimeout(()=>setGenCopied(false),2000)})}} style={{padding:"6px 10px",background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.25)`,borderRadius:6,color:T.accent,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{genCopied?"✓":"Copy"}</button>
                <button onClick={()=>{const g=generateStrongPw();setGenPw(g);setGenCopied(false)}} style={{padding:"6px 10px",background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.25)`,borderRadius:6,color:T.accent,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>🔄</button>
              </div>
            </div>}
            <button onClick={()=>{setInfoPage("password-manager");setShowLanding(true)}} style={{width:"100%",marginTop:10,padding:"7px 0",background:`linear-gradient(135deg,rgba(${T.accentRgb},0.15),rgba(${T.accentRgb},0.08))`,border:`1px solid rgba(${T.accentRgb},0.35)`,borderRadius:8,color:T.accent,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:0.5}}>Full Tool →</button>
          </div>

        </div>}

        {/* Footer */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,textAlign:"center",padding:"14px 20px",background:`linear-gradient(180deg,transparent,rgba(${T.dark?"0,0,0":"0,0,0"},0.15))`,animation:"footerFadeIn 1.2s ease-out 0.5s both",zIndex:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:8}}>
            <button onClick={()=>{setInfoPage("about");setShowLanding(true)}} style={{fontSize:11,color:T.dim,opacity:0.7,textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>About</button>
            <button onClick={()=>{setInfoPage("privacy");setShowLanding(true)}} style={{fontSize:11,color:T.dim,opacity:0.7,textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Privacy</button>
            <button onClick={()=>{setInfoPage("terms");setShowLanding(true)}} style={{fontSize:11,color:T.dim,opacity:0.7,textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Terms</button>
            <button onClick={()=>{setInfoPage("password-manager");setShowLanding(true)}} style={{fontSize:11,color:T.dim,opacity:0.7,textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>ShieldCraft</button>
            <button onClick={()=>{setInfoPage("security-blog");setShowLanding(true)}} style={{fontSize:11,color:T.dim,opacity:0.7,textDecoration:"none",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Blog</button>
          </div>
          <p style={{fontSize:11,color:T.dim,fontFamily:`${F.body},sans-serif`,letterSpacing:0.8,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap",lineHeight:2,margin:0}}>
            <span style={{fontStyle:"italic",opacity:0.7}}>Designed and Developed by</span>
            <span className="nc-footer-name" style={{fontWeight:800,fontSize:13,letterSpacing:2.5,fontFamily:`${F.heading},sans-serif`}}>SUNNY</span>
            <span style={{opacity:0.6}}>with lots of</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
              <span style={{opacity:0.7}}>love</span>
              <span style={{animation:"footerHeartbeat 1.5s ease-in-out infinite",display:"inline-block",fontSize:14}}>💚</span>
            </span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
              <span style={{opacity:0.7}}>coffee</span>
              <span style={{animation:"footerSteam 2s ease-in-out infinite",display:"inline-block",fontSize:14}}>☕</span>
            </span>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
              <span style={{opacity:0.6}}>and</span>
              <span style={{opacity:0.7}}>AI</span>
              <span style={{animation:"footerBlink 3s ease-in-out infinite",display:"inline-block",fontSize:14}}>👽</span>
            </span>
          </p>
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
    {n:"Untagged",i:<IC.TagOff/>},
    {d:true},
    {n:"ShieldCraft",i:<IC.Shield/>,c:pmCredentials.length,action:()=>{setInfoPage("password-manager");setShowLanding(true)}},
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

      {/* Profile / Account Settings modal */}
      {showProfileMenu&&<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}} onClick={()=>{setShowProfileMenu(false);setProfileTab("info");setChangePwErr("");setChangePwOk("");setChangeNameErr("");setChangeNameOk("")}}>
        <div style={{...glass,borderRadius:16,padding:0,width:440,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:20,fontWeight:700,flexShrink:0}}>{user?.name?.[0]?.toUpperCase()||"?"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:16,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
              <div style={{fontSize:12,color:T.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
            </div>
            <button onClick={()=>{setShowProfileMenu(false);setProfileTab("info");setChangePwErr("");setChangePwOk("");setChangeNameErr("");setChangeNameOk("")}} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:4,display:"flex",opacity:.7}}><IC.X/></button>
          </div>

          {/* Tab navigation */}
          <div style={{display:"flex",borderBottom:`1px solid ${T.bdr}`,padding:"0 24px"}}>
            {[{id:"info",label:"Account"},{id:"security",label:"Security"},{id:"password",label:"Password"},{id:"name",label:"Edit Profile"},{id:"danger",label:"Danger Zone"}].map(tab=>(
              <button key={tab.id} onClick={()=>{setProfileTab(tab.id);setChangePwErr("");setChangePwOk("");setChangeNameErr("");setChangeNameOk("")}}
                style={{padding:"10px 16px",fontSize:12,fontWeight:600,color:profileTab===tab.id?T.accent:T.dim,background:"none",border:"none",borderBottom:profileTab===tab.id?`2px solid ${T.accent}`:"2px solid transparent",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",letterSpacing:0.3}}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{padding:24,overflowY:"auto",flex:1}}>

            {/* Account Info tab */}
            {profileTab==="info"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {[
                  {label:"Name",value:user?.name,icon:<IC.User/>},
                  {label:"Email",value:user?.email,icon:<IC.Mail/>},
                  {label:"Storage Plan",value:`${quotaGB} GB`,icon:<IC.Folder/>},
                  {label:"Storage Used",value:quotaInfo.label+` (${quotaInfo.pct.toFixed(1)}%)`,icon:<IC.Chart/>},
                  {label:"Encryption",value:"AES-256 End-to-End",icon:<IC.Shield/>},
                  {label:"Session",value:"Browser Session Storage",icon:<IC.Lock/>},
                ].map((item,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`}}>
                    <span style={{color:T.accent,display:"flex",flexShrink:0}}>{item.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:T.dim,fontWeight:700,letterSpacing:0.4,marginBottom:3,textTransform:"uppercase"}}>{item.label}</div>
                      <div style={{fontSize:14,color:T.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={()=>setProfileTab("password")} className="glass-btn" style={{flex:1,padding:"10px 0",borderRadius:8,fontSize:12,fontWeight:700,background:`rgba(${T.accentRgb},${T.dark?0.08:0.15})`,border:`1px solid rgba(${T.accentRgb},${T.dark?0.15:0.3})`,color:T.dark?T.accent:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <IC.Lock/>Change Password
                </button>
                <button onClick={()=>{setProfileTab("name");setChangeNameVal(user?.name||"")}} className="glass-btn" style={{flex:1,padding:"10px 0",borderRadius:8,fontSize:12,fontWeight:700,background:`rgba(${T.accentRgb},${T.dark?0.08:0.15})`,border:`1px solid rgba(${T.accentRgb},${T.dark?0.15:0.3})`,color:T.dark?T.accent:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <IC.User/>Edit Name
                </button>
              </div>
              <button onClick={doForceResync} disabled={resyncStatus==="syncing"} className="glass-btn"
                style={{width:"100%",padding:"10px 0",borderRadius:8,fontSize:12,fontWeight:700,background:resyncStatus==="done"?`${T.ok}15`:`rgba(${T.accentRgb},${T.dark?0.05:0.12})`,border:`1px solid ${resyncStatus==="done"?`${T.ok}30`:`rgba(${T.accentRgb},${T.dark?0.1:0.25})`}`,color:resyncStatus==="done"?T.ok:(T.dark?T.accent:T.text),cursor:resyncStatus==="syncing"?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:4,transition:"all 0.2s"}}>
                <IC.Sync/>{resyncStatus==="syncing"?"Syncing...":resyncStatus==="done"?"Synced Successfully!":resyncStatus?"Sync Failed":"Force Resync to Cloud"}
              </button>
            </div>}

            {/* Security (2FA) tab */}
            {profileTab==="security"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4}}>Two-Factor Authentication</div>

              {/* 2FA Setup Wizard */}
              {twoFASetup?(
                <div>
                  {twoFAStep===1&&<div style={{display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
                    <p style={{fontSize:12,color:T.faint,lineHeight:1.6,textAlign:"center"}}>Scan this QR code with your authenticator app<br/>(Google Authenticator, Authy, Microsoft Authenticator, etc.)</p>
                    <div style={{padding:12,background:"#fff",borderRadius:12,display:"inline-block"}}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`otpauth://totp/NotesCraft:${encodeURIComponent(user.email)}?secret=${twoFASetup.secret}&issuer=NotesCraft&digits=6&period=30`)}`} alt="QR" width={180} height={180} style={{display:"block"}}/>
                    </div>
                    <div style={{width:"100%"}}>
                      <label style={{fontSize:10,fontWeight:600,color:T.dim,letterSpacing:0.3,display:"block",marginBottom:4}}>Or enter this key manually:</label>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <code style={{flex:1,fontSize:11,fontFamily:"monospace",color:T.accent,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",padding:"8px 10px",borderRadius:6,wordBreak:"break-all",letterSpacing:1,border:`1px solid ${T.bdr}`}}>{twoFASetup.secret}</code>
                        <button onClick={()=>{navigator.clipboard.writeText(twoFASetup.secret)}} style={{padding:"8px 12px",background:`rgba(${T.accentRgb},${T.dark?0.1:0.15})`,border:`1px solid rgba(${T.accentRgb},${T.dark?0.25:0.35})`,borderRadius:6,color:T.dark?T.accent:T.text,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Copy</button>
                      </div>
                    </div>
                    <button onClick={()=>setTwoFAStep(2)} style={{width:"100%",padding:"10px 0",background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>Next — Verify Code</button>
                  </div>}

                  {twoFAStep===2&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <p style={{fontSize:12,color:T.faint,lineHeight:1.5}}>Enter the 6-digit code from your authenticator app to confirm setup:</p>
                    <input value={twoFACode} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);setTwoFACode(v);setTwoFAErr("")}} placeholder="000000" inputMode="numeric" maxLength={6} autoFocus
                      style={{width:"100%",padding:"14px 12px",borderRadius:8,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:24,fontFamily:"monospace",fontWeight:700,textAlign:"center",letterSpacing:8,outline:"none",boxSizing:"border-box"}}
                      onKeyDown={e=>{if(e.key==="Enter"&&twoFACode.length===6)doConfirm2FASetup()}}/>
                    {twoFAErr&&<div style={{fontSize:12,color:T.err,fontWeight:500}}>{twoFAErr}</div>}
                    <button onClick={doConfirm2FASetup} disabled={twoFALoad||twoFACode.length<6}
                      style={{padding:"10px 0",background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:twoFALoad?"wait":"pointer",fontFamily:"inherit",letterSpacing:1,opacity:twoFALoad||twoFACode.length<6?0.5:1}}>
                      {twoFALoad?"Verifying...":"Verify & Enable 2FA"}
                    </button>
                    <button onClick={()=>{setTwoFASetup(null);setTwoFACode("");setTwoFAErr("")}} style={{padding:"8px 0",background:"none",border:`1px solid ${T.bdr}`,borderRadius:8,color:T.dim,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                  </div>}

                  {twoFAStep===3&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{padding:"10px 14px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>✅</span>
                      <span style={{fontSize:12,fontWeight:600,color:"#22c55e"}}>2FA is now enabled!</span>
                    </div>
                    <p style={{fontSize:12,color:T.faint,lineHeight:1.5}}>Save these recovery codes in a safe place. Each can be used once if you lose access to your authenticator app.</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {twoFARecoveryCodes.map((c,i)=><code key={i} style={{fontSize:11,fontFamily:"monospace",padding:"6px 8px",borderRadius:4,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",border:`1px solid ${T.bdr}`,color:T.text,textAlign:"center",letterSpacing:1}}>{c}</code>)}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{navigator.clipboard.writeText(twoFARecoveryCodes.join("\n"))}} style={{flex:1,padding:"8px 0",background:`rgba(${T.accentRgb},${T.dark?0.1:0.15})`,border:`1px solid rgba(${T.accentRgb},${T.dark?0.25:0.35})`,borderRadius:6,color:T.dark?T.accent:T.text,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Copy All</button>
                      <button onClick={()=>{const blob=new Blob(["NotesCraft Recovery Codes\n========================\n\n"+twoFARecoveryCodes.join("\n")+"\n\nEach code can only be used once.\nKeep these codes in a safe place.\n"],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="notescraft-recovery-codes.txt";a.click()}} style={{flex:1,padding:"8px 0",background:`rgba(${T.accentRgb},${T.dark?0.1:0.15})`,border:`1px solid rgba(${T.accentRgb},${T.dark?0.25:0.35})`,borderRadius:6,color:T.dark?T.accent:T.text,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Download .txt</button>
                    </div>
                    <button onClick={()=>{setTwoFASetup(null);setTwoFARecoveryCodes([])}} style={{padding:"10px 0",background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>Done</button>
                  </div>}
                </div>
              ):(
                <div>
                  {user.twoFactorEnabled?(
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      <div style={{padding:"12px 16px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:20}}>🛡️</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>2FA is Active</div>
                          <div style={{fontSize:10,color:T.dim,marginTop:2}}>Your account is protected with two-factor authentication</div>
                        </div>
                      </div>
                      <button onClick={doViewRecoveryCodes} disabled={twoFALoad}
                        style={{padding:"10px 0",background:`rgba(${T.accentRgb},${T.dark?0.08:0.15})`,border:`1px solid rgba(${T.accentRgb},${T.dark?0.2:0.35})`,borderRadius:8,color:T.dark?T.accent:T.text,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        {twoFALoad?"Loading...":"View Recovery Codes"}
                      </button>
                      {twoFAShowRecovery&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{fontSize:11,color:T.dim}}>{twoFARecoveryCodes.length} of 8 codes remaining</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          {twoFARecoveryCodes.map((c,i)=><code key={i} style={{fontSize:11,fontFamily:"monospace",padding:"6px 8px",borderRadius:4,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",border:`1px solid ${T.bdr}`,color:T.text,textAlign:"center",letterSpacing:1}}>{c}</code>)}
                        </div>
                        <button onClick={()=>setTwoFAShowRecovery(false)} style={{padding:"6px",background:"none",border:"none",color:T.dim,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Hide</button>
                      </div>}
                      <div style={{borderTop:`1px solid ${T.bdr}`,paddingTop:14,marginTop:4}}>
                        <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:8}}>Disable 2FA</div>
                        <p style={{fontSize:11,color:T.dim,marginBottom:8,lineHeight:1.5}}>Enter a code from your authenticator app to disable 2FA:</p>
                        <div style={{display:"flex",gap:8}}>
                          <input value={twoFADisableCode} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);setTwoFADisableCode(v);setTwoFAErr("")}} placeholder="000000" inputMode="numeric" maxLength={6}
                            style={{flex:1,padding:"8px 10px",borderRadius:6,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:16,fontFamily:"monospace",fontWeight:600,textAlign:"center",letterSpacing:4,outline:"none",boxSizing:"border-box"}}/>
                          <button onClick={doDisable2FA} disabled={twoFALoad||twoFADisableCode.length<6}
                            style={{padding:"8px 16px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,color:"#ef4444",fontSize:11,fontWeight:600,cursor:twoFALoad?"wait":"pointer",fontFamily:"inherit",opacity:twoFALoad||twoFADisableCode.length<6?0.5:1}}>Disable</button>
                        </div>
                        {twoFAErr&&<div style={{fontSize:11,color:T.err,marginTop:6}}>{twoFAErr}</div>}
                      </div>
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      <p style={{fontSize:12,color:T.faint,lineHeight:1.6}}>Add an extra layer of security to your account. When enabled, you'll need both your password and a code from your authenticator app to sign in.</p>
                      <p style={{fontSize:11,color:T.dim,lineHeight:1.5}}>Works with any TOTP authenticator app: Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden, and more.</p>
                      <button onClick={doEnable2FASetup}
                        style={{padding:"12px 0",background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,boxShadow:`0 4px 15px rgba(${T.accentRgb},0.3)`}}>Enable Two-Factor Authentication</button>
                    </div>
                  )}
                </div>
              )}
            </div>}

            {/* Change Password tab */}
            {profileTab==="password"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4}}>Change Password</div>
              <div style={{fontSize:12,color:T.faint,lineHeight:1.5}}>Changing your password will re-encrypt all your data with a new key. Make sure you remember your new password — it cannot be recovered.</div>
              {[{label:"Current Password",val:changePwOld,set:setChangePwOld},{label:"New Password",val:changePwNew,set:setChangePwNew},{label:"Confirm New Password",val:changePwConfirm,set:setChangePwConfirm}].map((f,i)=>(
                <div key={i}>
                  <label style={{fontSize:11,fontWeight:600,color:T.faint,letterSpacing:0.3,marginBottom:4,display:"block"}}>{f.label}</label>
                  <input type="password" value={f.val} onChange={e=>{f.set(e.target.value);setChangePwErr("");setChangePwOk("")}}
                    style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>{e.target.style.borderColor=T.accent}} onBlur={e=>{e.target.style.borderColor=T.bdr}}/>
                </div>
              ))}
              {changePwErr&&<div style={{fontSize:12,color:T.err,fontWeight:500}}>{changePwErr}</div>}
              {changePwOk&&<div style={{fontSize:12,color:T.ok,fontWeight:500}}>{changePwOk}</div>}
              <button onClick={doChangePassword} disabled={changePwLoad} className="glass-btn"
                style={{padding:"10px 0",borderRadius:8,fontSize:13,fontWeight:600,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",color:"#fff",cursor:changePwLoad?"wait":"pointer",fontFamily:"inherit",opacity:changePwLoad?0.6:1,transition:"all 0.2s",marginTop:4}}>
                {changePwLoad?"Changing...":"Change Password"}
              </button>
            </div>}

            {/* Edit Name tab */}
            {profileTab==="name"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4}}>Edit Display Name</div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:T.faint,letterSpacing:0.3,marginBottom:4,display:"block"}}>Display Name</label>
                <input value={changeNameVal} onChange={e=>{setChangeNameVal(e.target.value);setChangeNameErr("");setChangeNameOk("")}}
                  style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                  onFocus={e=>{e.target.style.borderColor=T.accent}} onBlur={e=>{e.target.style.borderColor=T.bdr}}
                  onKeyDown={e=>{if(e.key==="Enter")doChangeName()}}/>
              </div>
              {changeNameErr&&<div style={{fontSize:12,color:T.err,fontWeight:500}}>{changeNameErr}</div>}
              {changeNameOk&&<div style={{fontSize:12,color:T.ok,fontWeight:500}}>{changeNameOk}</div>}
              <button onClick={doChangeName} className="glass-btn"
                style={{padding:"10px 0",borderRadius:8,fontSize:13,fontWeight:600,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",marginTop:4}}>
                Save Name
              </button>
            </div>}

            {/* Danger Zone tab */}
            {profileTab==="danger"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.err,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><IC.Danger/> Danger Zone</div>
              <div style={{padding:16,borderRadius:10,border:`1px solid ${T.err}33`,background:`${T.err}08`}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>Delete Account</div>
                <div style={{fontSize:12,color:T.faint,lineHeight:1.5,marginBottom:12}}>Permanently delete your account and all associated data including notes, calendar events, and settings. This action cannot be undone.</div>
                <button onClick={doDeleteAccount} className="glass-btn"
                  style={{padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:600,background:T.err,border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
                  Delete My Account
                </button>
              </div>
              <div style={{padding:16,borderRadius:10,border:`1px solid ${T.bdr}`,background:T.dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.01)"}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>Sign Out</div>
                <div style={{fontSize:12,color:T.faint,lineHeight:1.5,marginBottom:12}}>Sign out of your current session. Your data remains safe and encrypted.</div>
                <button onClick={()=>{setShowProfileMenu(false);doLogout()}} className="glass-btn"
                  style={{padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:600,background:`rgba(${T.accentRgb},0.1)`,border:`1px solid rgba(${T.accentRgb},0.15)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
                  Sign Out
                </button>
              </div>
            </div>}

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

          {/* Priority */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>PRIORITY</label>
            <div style={{display:"flex",gap:6}}>
              {PRIORITIES.map(p=>(
                <button key={p.id} onClick={()=>setCalEditing(prev=>({...prev,priority:p.id}))} className="glass-btn"
                  style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",letterSpacing:0.3,
                    background:(calEditing.priority||"medium")===p.id?`${p.color}22`:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                    color:(calEditing.priority||"medium")===p.id?p.color:T.dim,
                    border:(calEditing.priority||"medium")===p.id?`1.5px solid ${p.color}`:`1px solid ${T.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,
                    transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                  <p.Ic/>{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>DATE</label>
            <input type="date" value={calEditing.date} onChange={e=>setCalEditing(prev=>({...prev,date:e.target.value}))}
              style={{width:"100%",padding:"10px 12px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",transition:"all 0.3s"}}/>
          </div>

          {/* Repeat */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>REPEAT</label>
            <select value={calEditing.repeat||"none"} onChange={e=>setCalEditing(prev=>({...prev,repeat:e.target.value}))}
              style={{width:"100%",padding:"10px 12px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box",cursor:"pointer"}}>
              {REPEAT_OPTIONS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            {(calEditing.repeat||"none")==="custom"&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
              <span style={{fontSize:12,color:T.dim}}>Every</span>
              <input type="number" min={1} max={365} value={calEditing.repeatCustomDays||7}
                onChange={e=>setCalEditing(prev=>({...prev,repeatCustomDays:parseInt(e.target.value)||7}))}
                style={{width:60,padding:"8px 10px",background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontSize:14,fontFamily:`${F.body},sans-serif`,outline:"none",textAlign:"center"}}/>
              <span style={{fontSize:12,color:T.dim}}>days</span>
            </div>}
            {(calEditing.repeat||"none")!=="none"&&<div style={{marginTop:8}}>
              <label style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:3,display:"block"}}>REPEAT UNTIL (optional)</label>
              <input type="date" value={calEditing.repeatEnd||""} onChange={e=>setCalEditing(prev=>({...prev,repeatEnd:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",fontSize:13,background:T.dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)",border:`1px solid ${T.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,color:T.text,fontFamily:`${F.body},sans-serif`,outline:"none",boxSizing:"border-box"}}/>
            </div>}
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

          {/* Attachments */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:5,display:"block"}}>ATTACHMENTS</label>
            {(calEditing.attachments||[]).length>0&&<div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8,padding:8,borderRadius:10,border:`1px solid ${T.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.08)"}`,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.02)"}}>
              {(calEditing.attachments||[]).map((att,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
                  <IC.Paperclip/>
                  <span style={{flex:1,fontSize:13,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</span>
                  <span style={{fontSize:11,color:T.faint}}>{(att.data.length*0.75/1024).toFixed(0)} KB</span>
                  <button onClick={()=>{const a=[...(calEditing.attachments||[])];a.splice(i,1);setCalEditing(prev=>({...prev,attachments:a}))}}
                    style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:2,display:"flex"}}><IC.X/></button>
                </div>
              ))}
            </div>}
            <button onClick={()=>document.getElementById("cal-attach-input").click()} className="glass-btn"
              style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",letterSpacing:0.3,
                background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",color:T.dim,
                border:`1px solid ${T.dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,transition:"all 0.2s",display:"flex",alignItems:"center",gap:5}}>
              <IC.Paperclip/>Attach File
            </button>
            <input id="cal-attach-input" type="file" multiple style={{display:"none"}}
              onChange={e=>{
                Array.from(e.target.files).forEach(file=>{
                  if(file.size>5*1024*1024){alert(`File "${file.name}" is too large (max 5MB)`);return}
                  const reader=new FileReader();
                  reader.onload=()=>{
                    const base64=reader.result.split(",")[1];
                    setCalEditing(prev=>({...prev,attachments:[...(prev.attachments||[]),{name:file.name,data:base64,type:file.type}]}));
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value="";
              }}/>
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
            <button key={v.n} className="sb-view-btn" onClick={()=>{if(v.action){v.action();return}flushSave();setView(v.n);setFolder(null);if(v.n!=="Calendar"){setCalSelDate(null);setCalSelEvent(null)}}} title={sidebarOpen?undefined:v.n}
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
            <div onClick={()=>setShowProfileMenu(true)} style={{width:24,height:24,borderRadius:6,background:`linear-gradient(135deg,${T.accent},${T.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0,cursor:"pointer",transition:"transform 0.15s"}} title="Account Settings">{user?.name?.[0]?.toUpperCase()||"?"}</div>
            {sidebarOpen&&<span onClick={()=>setShowProfileMenu(true)} style={{fontSize:13,color:T.dim,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}}>{user?.name}</span>}
            {sidebarOpen&&<button onClick={()=>setShowProfileMenu(true)} className="sidebar-icon-btn" style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Account Settings"><IC.Settings/></button>}
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
            <button onClick={()=>setShowProfileMenu(true)} className="sidebar-icon-btn" style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:2,display:"flex"}} title="Account Settings"><IC.Settings/></button>
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
            <button onClick={()=>{setCalShowReports(!calShowReports);if(!calShowReports)setCalSelEvent(null)}} className="glass-btn" title="Reports"
              style={{background:calShowReports?`rgba(${T.accentRgb},.15)`:`rgba(${T.accentRgb},.08)`,backdropFilter:"blur(8px)",border:`1px solid rgba(${T.accentRgb},.15)`,borderRadius:8,color:calShowReports?T.accent:T.dim,cursor:"pointer",padding:"5px 8px",display:"flex",transition:"all 0.3s"}}><IC.Chart/></button>
            <button onClick={()=>createCalEvent()} className="glass-btn" style={{background:`rgba(${T.accentRgb},.08)`,backdropFilter:"blur(8px)",border:`1px solid rgba(${T.accentRgb},.15)`,borderRadius:8,color:T.accent,cursor:"pointer",padding:"5px 8px",display:"flex",transition:"all 0.3s",boxShadow:`0 2px 8px rgba(${T.accentRgb},0.08)`}}><IC.Plus s={17}/></button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <button onClick={calPrevMonth} className="glass-btn" style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:"2px 6px",borderRadius:5,fontSize:18,fontFamily:"inherit"}}>&#8249;</button>
            <span style={{flex:1,textAlign:"center",fontSize:15,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:0.5}}>{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={calNextMonth} className="glass-btn" style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:"2px 6px",borderRadius:5,fontSize:18,fontFamily:"inherit"}}>&#8250;</button>
          </div>
          <button onClick={calGoToday} style={{width:"100%",padding:"4px 0",borderRadius:6,fontSize:11,fontWeight:600,background:`rgba(${T.accentRgb},0.05)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",letterSpacing:0.5}}>Today</button>
          {/* Search & Filter */}
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:7,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)",border:`1px solid ${T.bdr}`}}>
              <IC.Search/>
              <input value={calSearch} onChange={e=>setCalSearch(e.target.value)} placeholder="Search events..."
                style={{flex:1,background:"none",border:"none",outline:"none",color:T.text,fontSize:12,fontFamily:"inherit",padding:"2px 0"}}/>
              {calSearch&&<button onClick={()=>setCalSearch("")} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",padding:0,display:"flex"}}><IC.X/></button>}
            </div>
            <div style={{display:"flex",gap:4}}>
              <select value={calFilter.type} onChange={e=>setCalFilter(p=>({...p,type:e.target.value}))}
                style={{flex:1,padding:"3px 4px",borderRadius:5,fontSize:10,background:T.surf,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                <option value="all">All Types</option><option value="event">Events</option><option value="reminder">Reminders</option><option value="todo">To-Dos</option>
              </select>
              <select value={calFilter.priority} onChange={e=>setCalFilter(p=>({...p,priority:e.target.value}))}
                style={{flex:1,padding:"3px 4px",borderRadius:5,fontSize:10,background:T.surf,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                <option value="all">All Priority</option>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <select value={calFilter.status} onChange={e=>setCalFilter(p=>({...p,status:e.target.value}))}
                style={{flex:1,padding:"3px 4px",borderRadius:5,fontSize:10,background:T.surf,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                <option value="all">All Status</option><option value="done">Done</option><option value="pending">Pending</option>
              </select>
            </div>
          </div>
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
            {/* Quick-add buttons */}
            <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
              {[{type:"event",label:"Event",Ico:IC.Calendar},{type:"reminder",label:"Reminder",Ico:IC.Bell},{type:"todo",label:"To-Do",Ico:IC.ListCheck}].map(({type,label,Ico})=>(
                <button key={type} onClick={()=>createCalEvent({type,date:calSelDate})} className="glass-btn"
                  style={{flex:1,padding:"6px 0",borderRadius:6,fontSize:11,fontWeight:600,background:`rgba(${T.accentRgb},0.05)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.3s"}}>
                  <Ico/>{label}
                </button>
              ))}
            </div>
            {calSelDayEvents.length===0&&<div style={{padding:16,textAlign:"center",color:T.faint,fontSize:13}}>No events for this day</div>}
            {calSelDayEvents.map(ev=>{const pri=PRIORITIES.find(p=>p.id===(ev.priority||"medium"));return(
              <div key={ev.id} onClick={()=>{setCalSelEvent(ev._isVirtual?ev._virtualOf:ev.id);setCalShowReports(false)}} style={{
                padding:"8px 10px",marginBottom:3,borderRadius:8,cursor:"pointer",
                background:calSelEvent===ev.id?(T.dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.5)"):"transparent",
                border:calSelEvent===ev.id?`1px solid rgba(${T.accentRgb},.12)`:"1px solid transparent",
                borderLeft:`3px solid ${pri?.color||"transparent"}`,
                transition:"all 0.2s",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:ev.color||T.accent,flexShrink:0,boxShadow:`0 0 4px ${ev.color||T.accent}44`}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {ev.type==="todo"&&<input type="checkbox" checked={ev.done} onChange={e=>{e.stopPropagation();toggleCalTodo(ev._virtualOf||ev.id)}} style={{width:14,height:14,accentColor:T.accent,cursor:"pointer",flexShrink:0}}/>}
                    {ev.type==="reminder"&&<span style={{color:T.warn,flexShrink:0}}><IC.Bell/></span>}
                    <span style={{fontSize:13,fontWeight:600,color:ev.done?T.faint:T.text,textDecoration:ev.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title||"Untitled"}</span>
                  </div>
                  {ev.time&&<span style={{fontSize:11,color:T.faint}}>{ev.time}{ev.endTime?` - ${ev.endTime}`:""}</span>}
                  {ev.type==="todo"&&ev.items&&ev.items.length>0&&<span style={{fontSize:11,color:T.faint}}>{ev.items.filter(x=>x.done).length}/{ev.items.length} done</span>}
                </div>
                {pri&&pri.id!=="medium"&&<span style={{color:pri.color,flexShrink:0}} title={pri.label}><pri.Ic/></span>}
                {(ev.repeat||"none")!=="none"&&<span style={{color:T.faint,flexShrink:0}} title={`Repeats: ${ev.repeat}`}><IC.Repeat/></span>}
                {(ev.attachments||[]).length>0&&<span style={{fontSize:10,color:T.faint,display:"flex",alignItems:"center",gap:2,flexShrink:0}}><IC.Paperclip/>{(ev.attachments||[]).length}</span>}
                {ev.reminderDate&&ev.reminderTime&&!ev.reminderFired&&<span style={{color:T.warn,flexShrink:0,opacity:0.7}} title={`Reminder: ${ev.reminderDate} ${ev.reminderTime}`}><IC.BellRing/></span>}
                <span style={{fontSize:9,fontWeight:600,letterSpacing:0.5,color:T.faint,textTransform:"uppercase",flexShrink:0}}>{ev.type}</span>
              </div>
            )})}
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
          if(calShowReports){
            const getEventStatus=(ev)=>{
              if(ev.done)return"completed";
              const now=new Date();
              const evDT=new Date(`${ev.date}T${ev.time||"23:59"}`);
              if(ev.type==="todo"&&ev.items&&ev.items.length>0){
                const doneCount=ev.items.filter(x=>x.done).length;
                if(doneCount>0&&doneCount<ev.items.length)return"in_progress";
              }
              if(evDT<now){
                if(ev.type==="todo")return"late";
                return"completed";
              }
              return"not_started";
            };
            const statusCounts={not_started:0,in_progress:0,late:0,completed:0};
            const typeCounts={event:0,reminder:0,todo:0};
            const priorityCounts={urgent:{not_started:0,in_progress:0,late:0,completed:0},important:{not_started:0,in_progress:0,late:0,completed:0},medium:{not_started:0,in_progress:0,late:0,completed:0},low:{not_started:0,in_progress:0,late:0,completed:0}};
            let recurring=0,withAttachments=0,withReminders=0;
            const upcoming=[];const now=new Date();
            calEvents.forEach(ev=>{
              const s=getEventStatus(ev);statusCounts[s]++;
              const pri=ev.priority||"medium";if(priorityCounts[pri])priorityCounts[pri][s]++;
              typeCounts[ev.type]=(typeCounts[ev.type]||0)+1;
              if((ev.repeat||"none")!=="none")recurring++;
              if((ev.attachments||[]).length>0)withAttachments++;
              if(ev.reminderDate&&ev.reminderTime)withReminders++;
              const evDT=new Date(`${ev.date}T${ev.time||"00:00"}`);
              if(evDT>=now&&!ev.done)upcoming.push({...ev,_dt:evDT});
            });
            upcoming.sort((a,b)=>a._dt-b._dt);
            const total=calEvents.length||1;
            const tasksLeft=statusCounts.not_started+statusCounts.in_progress+statusCounts.late;
            const statusDefs=[{key:"not_started",label:"Not Started",color:"#9ca3af"},{key:"in_progress",label:"In Progress",color:"#3b82f6"},{key:"late",label:"Late",color:"#ef4444"},{key:"completed",label:"Completed",color:"#22c55e"}];
            const radius=60;const circ=2*Math.PI*radius;let accOffset=0;
            const segments=statusDefs.filter(s=>statusCounts[s.key]>0).map(s=>{const dashLen=circ*(statusCounts[s.key]/total);const seg={...s,val:statusCounts[s.key],dashLen,accOffset};accOffset+=dashLen;return seg});
            const completionRate=calEvents.length?Math.round((statusCounts.completed/calEvents.length)*100):0;
            return<div style={{flex:1,overflow:"auto",padding:"24px"}}>
              <h3 style={{fontSize:17,fontWeight:700,fontFamily:`${F.heading},sans-serif`,letterSpacing:1,color:T.text,marginBottom:20,display:"flex",alignItems:"center",gap:8}}><IC.Chart/> Reports</h3>

              {/* Summary cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,marginBottom:24}}>
                {[{label:"Total",val:calEvents.length,color:T.accent},{label:"Completed",val:statusCounts.completed,color:"#22c55e"},{label:"Late",val:statusCounts.late,color:"#ef4444"},{label:"Recurring",val:recurring,color:"#8b5cf6"},{label:"Completion",val:completionRate+"%",color:"#3b82f6"}].map(c=>(
                  <div key={c.label} style={{padding:"12px 10px",borderRadius:10,background:T.dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${T.dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"}`,textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:700,color:c.color}}>{c.val}</div>
                    <div style={{fontSize:10,fontWeight:600,color:T.faint,letterSpacing:0.5,marginTop:2}}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Status & Type donuts side by side */}
              <div style={{display:"flex",gap:24,marginBottom:28,flexWrap:"wrap"}}>
                {/* Status donut */}
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:12}}>Status</div>
                  <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                    <svg width="140" height="140" viewBox="0 0 160 160">
                      {segments.length===0&&<circle cx="80" cy="80" r={radius} fill="none" stroke={T.bdr} strokeWidth="16"/>}
                      {segments.map(seg=>(
                        <circle key={seg.key} cx="80" cy="80" r={radius} fill="none" stroke={seg.color} strokeWidth="16"
                          strokeDasharray={`${seg.dashLen} ${circ-seg.dashLen}`}
                          strokeDashoffset={circ/4-seg.accOffset}
                          style={{transition:"all 0.5s"}}/>
                      ))}
                      <text x="80" y="76" textAnchor="middle" fill={T.text} fontSize="26" fontWeight="700">{tasksLeft}</text>
                      <text x="80" y="96" textAnchor="middle" fill={T.dim} fontSize="12">Tasks left</text>
                    </svg>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {statusDefs.map(s=>(
                        <div key={s.key} style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                          <span style={{fontSize:12,color:T.dim,minWidth:72}}>{s.label}</span>
                          <span style={{fontSize:14,fontWeight:700,color:T.text}}>{statusCounts[s.key]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Type breakdown donut */}
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:12}}>By Type</div>
                  <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                    {(()=>{const typeDefs=[{key:"event",label:"Events",color:"#3b82f6",Ic:IC.Calendar},{key:"reminder",label:"Reminders",color:"#f59e0b",Ic:IC.Bell},{key:"todo",label:"To-Dos",color:"#22c55e",Ic:IC.ListCheck}];
                      let tOff=0;const tSegs=typeDefs.filter(t=>typeCounts[t.key]>0).map(t=>{const dl=circ*(typeCounts[t.key]/total);const s={...t,val:typeCounts[t.key],dl,tOff};tOff+=dl;return s});
                      return<>
                        <svg width="140" height="140" viewBox="0 0 160 160">
                          {tSegs.length===0&&<circle cx="80" cy="80" r={radius} fill="none" stroke={T.bdr} strokeWidth="16"/>}
                          {tSegs.map(s=><circle key={s.key} cx="80" cy="80" r={radius} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${s.dl} ${circ-s.dl}`} strokeDashoffset={circ/4-s.tOff} style={{transition:"all 0.5s"}}/>)}
                          <text x="80" y="76" textAnchor="middle" fill={T.text} fontSize="26" fontWeight="700">{calEvents.length}</text>
                          <text x="80" y="96" textAnchor="middle" fill={T.dim} fontSize="12">Total</text>
                        </svg>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {typeDefs.map(t=><div key={t.key} style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:9,height:9,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                            <span style={{fontSize:12,color:T.dim,minWidth:72,display:"flex",alignItems:"center",gap:4}}><t.Ic/>{t.label}</span>
                            <span style={{fontSize:14,fontWeight:700,color:T.text}}>{typeCounts[t.key]||0}</span>
                          </div>)}
                        </div>
                      </>})()}
                  </div>
                </div>
              </div>

              {/* Priority breakdown */}
              <div style={{fontSize:13,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:12}}>Priority</div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
                {(()=>{const maxPri=Math.max(...PRIORITIES.map(p=>Object.values(priorityCounts[p.id]||{}).reduce((s,v)=>s+v,0)),1);
                return PRIORITIES.map(pri=>{
                  const counts=priorityCounts[pri.id]||{};
                  const priTotal=Object.values(counts).reduce((s,v)=>s+v,0);
                  return<div key={pri.id} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{width:75,fontSize:12,fontWeight:600,color:pri.color,display:"flex",alignItems:"center",gap:4}}><pri.Ic/>{pri.label}</span>
                    <div style={{flex:1,height:22,borderRadius:6,background:T.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",overflow:"hidden",display:"flex"}}>
                      {statusDefs.map(s=>{const count=counts[s.key]||0;if(!count)return null;const w=(count/maxPri)*100;
                        return<div key={s.key} style={{width:`${w}%`,background:s.color,minWidth:count?4:0,transition:"width 0.5s"}} title={`${s.label}: ${count}`}/>})}
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:T.text,width:28,textAlign:"right"}}>{priTotal}</span>
                  </div>;
                })})()}
                <div style={{display:"flex",gap:16,marginTop:4,flexWrap:"wrap"}}>
                  {statusDefs.map(s=><div key={s.key} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.dim}}>
                    <div style={{width:10,height:10,borderRadius:2,background:s.color}}/>{s.label}
                  </div>)}
                </div>
              </div>

              {/* Upcoming events */}
              <div style={{fontSize:13,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:12}}>Upcoming Events</div>
              {upcoming.length===0?<div style={{fontSize:13,color:T.faint,padding:8}}>No upcoming events</div>:
              <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:28}}>
                {upcoming.slice(0,8).map(ev=>{const pri=PRIORITIES.find(p=>p.id===(ev.priority||"medium"));return(
                  <div key={ev.id} onClick={()=>{setCalSelEvent(ev.id);setCalShowReports(false)}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",borderLeft:`3px solid ${pri?.color||"transparent"}`,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",transition:"all 0.2s"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:ev.color||T.accent,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title||"Untitled"}</span>
                    <span style={{fontSize:11,color:T.faint}}>{new Date(ev.date+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                    <span style={{fontSize:9,fontWeight:600,color:T.faint,textTransform:"uppercase"}}>{ev.type}</span>
                  </div>
                )})}
              </div>}

              {/* Quick stats */}
              <div style={{fontSize:13,fontWeight:700,color:T.dim,letterSpacing:0.5,marginBottom:12}}>Quick Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{label:"With Reminders",val:withReminders,Ic:IC.Bell},{label:"With Attachments",val:withAttachments,Ic:IC.Paperclip},{label:"Recurring",val:recurring,Ic:IC.Repeat},{label:"Overdue",val:statusCounts.late,Ic:IC.Clock}].map(s=>(
                  <div key={s.label} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,background:T.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${T.dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"}`}}>
                    <span style={{color:T.accent,display:"flex"}}><s.Ic/></span>
                    <span style={{flex:1,fontSize:12,color:T.dim}}>{s.label}</span>
                    <span style={{fontSize:14,fontWeight:700,color:T.text}}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>;
          }
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
                {(()=>{const pri=PRIORITIES.find(p=>p.id===(ev.priority||"medium"));return pri?<span style={{fontSize:11,fontWeight:600,letterSpacing:0.5,padding:"2px 8px",borderRadius:4,background:`${pri.color}18`,color:pri.color,display:"flex",alignItems:"center",gap:3}}><pri.Ic/>{pri.label}</span>:null})()}
                {(ev.repeat||"none")!=="none"&&<span style={{fontSize:11,fontWeight:600,letterSpacing:0.5,padding:"2px 8px",borderRadius:4,background:`rgba(${T.accentRgb},0.08)`,color:T.dim,display:"flex",alignItems:"center",gap:3}}><IC.Repeat/>{REPEAT_OPTIONS.find(r=>r.id===ev.repeat)?.label||ev.repeat}</span>}
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

              {/* Attachments */}
              {(ev.attachments||[]).length>0&&<div style={{marginTop:16,padding:12,borderRadius:8,border:`1px solid rgba(${T.accentRgb},0.06)`,background:T.dark?"rgba(255,255,255,0.015)":"rgba(255,255,255,0.3)"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:T.faint,marginBottom:8,textTransform:"uppercase",display:"flex",alignItems:"center",gap:6}}><IC.Paperclip/>Attachments ({ev.attachments.length})</div>
                {ev.attachments.map((att,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",borderRadius:6,background:T.dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)",marginBottom:4}}>
                    <IC.Paperclip/>
                    <span style={{flex:1,fontSize:14,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</span>
                    <span style={{fontSize:11,color:T.faint}}>{(att.data.length*0.75/1024).toFixed(0)} KB</span>
                    <button onClick={()=>{const link=document.createElement("a");link.href=`data:${att.type||"application/octet-stream"};base64,${att.data}`;link.download=att.name;link.click()}} className="glass-btn"
                      style={{padding:"4px 8px",borderRadius:6,fontSize:11,fontWeight:600,background:`rgba(${T.accentRgb},0.06)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,transition:"all 0.3s"}}>
                      <IC.Download/>Download
                    </button>
                  </div>
                ))}
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
              <input value={eTitle} onChange={e=>{setETitle(e.target.value);debouncedFlush()}} onBlur={flushSave}
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
                <select defaultValue="" onChange={e=>{if(e.target.value){addBlock(e.target.value);e.target.value=""}}} style={{padding:"4px 8px",borderRadius:6,fontSize:11,fontWeight:600,background:`rgba(${T.accentRgb},0.06)`,border:`1px solid rgba(${T.accentRgb},0.1)`,color:T.accent,fontFamily:"inherit",cursor:"pointer",outline:"none",marginLeft:6}}>
                  <option value="">+ Add Block</option>{NOTE_TYPES.map(nt=><option key={nt.id} value={nt.id}>{nt.name}</option>)}
                </select>
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
                    {eBlocks.length>1&&<button onClick={()=>removeBlock(block.id)} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:2,opacity:.7,display:"flex",transition:"opacity 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".7"}><IC.X/></button>}
                  </div>

                  {/* RICH TEXT block */}
                  {block.type==="richtext"&&<>
                    <div style={{display:"flex",gap:2,alignItems:"center",flexWrap:"wrap",marginBottom:4,position:"sticky",top:0,zIndex:5,background:T.bg2||T.bg,padding:"6px 6px",borderBottom:`2px solid ${T.bdr}`,borderRadius:"6px 6px 0 0",boxShadow:`0 3px 12px rgba(0,0,0,${T.dark?"0.4":"0.12"})`}}>
                      <select defaultValue="" onChange={e=>{const v=e.target.value;if(!v)return;if(v==="ul")document.execCommand("insertUnorderedList");else if(v==="ol")document.execCommand("insertOrderedList");else document.execCommand("formatBlock",false,v);e.target.value=""}} style={{padding:"4px 6px",borderRadius:6,fontSize:11,background:T.bg3||T.bg,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none"}}>
                        <option value="">Normal</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="ul">Bulleted List</option><option value="ol">Numbered List</option><option value="blockquote">Quote</option><option value="pre">Code Block</option>
                      </select>
                      <select defaultValue="" onMouseDown={e=>{const sel=window.getSelection();if(sel.rangeCount>0)e.currentTarget._savedRange=sel.getRangeAt(0).cloneRange()}} onChange={e=>{if(!e.target.value)return;const range=e.currentTarget._savedRange;if(range){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)}document.execCommand("fontName",false,e.target.value);e.target.value=""}}
                        style={{padding:"4px 6px",borderRadius:6,fontSize:11,background:T.bg3||T.bg,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none",maxWidth:90}}>
                        <option value="">Font</option>
                        <option value="Arial" style={{fontFamily:"Arial"}}>Arial</option>
                        <option value="Georgia" style={{fontFamily:"Georgia"}}>Georgia</option>
                        <option value="Times New Roman" style={{fontFamily:"Times New Roman"}}>Times New Roman</option>
                        <option value="Courier New" style={{fontFamily:"Courier New"}}>Courier New</option>
                        <option value="Verdana" style={{fontFamily:"Verdana"}}>Verdana</option>
                        <option value="Trebuchet MS" style={{fontFamily:"Trebuchet MS"}}>Trebuchet MS</option>
                        <option value="Impact" style={{fontFamily:"Impact"}}>Impact</option>
                        <option value="Comic Sans MS" style={{fontFamily:"Comic Sans MS"}}>Comic Sans MS</option>
                        <option value="Inter" style={{fontFamily:"Inter"}}>Inter</option>
                        <option value="Roboto" style={{fontFamily:"Roboto"}}>Roboto</option>
                        <option value="Open Sans" style={{fontFamily:"Open Sans"}}>Open Sans</option>
                        <option value="Lato" style={{fontFamily:"Lato"}}>Lato</option>
                        <option value="Montserrat" style={{fontFamily:"Montserrat"}}>Montserrat</option>
                        <option value="Poppins" style={{fontFamily:"Poppins"}}>Poppins</option>
                        <option value="Raleway" style={{fontFamily:"Raleway"}}>Raleway</option>
                        <option value="Nunito" style={{fontFamily:"Nunito"}}>Nunito</option>
                        <option value="Playfair Display" style={{fontFamily:"Playfair Display"}}>Playfair Display</option>
                        <option value="Merriweather" style={{fontFamily:"Merriweather"}}>Merriweather</option>
                        <option value="Source Code Pro" style={{fontFamily:"Source Code Pro"}}>Source Code Pro</option>
                        <option value="Fira Code" style={{fontFamily:"Fira Code"}}>Fira Code</option>
                        <option value="Dancing Script" style={{fontFamily:"Dancing Script"}}>Dancing Script</option>
                        <option value="Pacifico" style={{fontFamily:"Pacifico"}}>Pacifico</option>
                        <option value="Caveat" style={{fontFamily:"Caveat"}}>Caveat</option>
                        <option value="Oswald" style={{fontFamily:"Oswald"}}>Oswald</option>
                      </select>
                      <select defaultValue="" onMouseDown={e=>{const sel=window.getSelection();if(sel.rangeCount>0)e.currentTarget._savedRange=sel.getRangeAt(0).cloneRange()}} onChange={e=>{if(!e.target.value)return;const range=e.currentTarget._savedRange;if(range){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)}document.execCommand("fontSize",false,e.target.value);e.target.value=""}}
                        style={{padding:"4px 6px",borderRadius:6,fontSize:11,background:T.bg3||T.bg,border:`1px solid ${T.bdr}`,color:T.dim,fontFamily:"inherit",cursor:"pointer",outline:"none",width:62}}>
                        <option value="">Size</option>
                        <option value="1">8px</option>
                        <option value="2">10px</option>
                        <option value="3">12px</option>
                        <option value="4">14px</option>
                        <option value="5">18px</option>
                        <option value="6">24px</option>
                        <option value="7">36px</option>
                      </select>
                      {[{cmd:"bold",Ic:IC.Bold},{cmd:"italic",Ic:IC.Italic},{cmd:"underline",Ic:IC.Underline},{cmd:"strikeThrough",Ic:IC.Strike}].map(b=>(
                        <button key={b.cmd} className="tb-btn" onMouseDown={e=>{e.preventDefault();document.execCommand(b.cmd)}} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex",alignItems:"center"}}><b.Ic/></button>
                      ))}
                      <div style={{width:1,height:16,background:T.bdr}}/>
                      {[{cmd:"foreColor",title:"Text Color",Ic:IC.TextAa},{cmd:"hiliteColor",title:"Background Color",Ic:IC.Highlight}].map(cp=>(
                        <label key={cp.cmd} className="tb-btn" style={{position:"relative",display:"flex",alignItems:"center",cursor:"pointer",padding:"4px 6px",borderRadius:6}} title={cp.title}
                          onMouseDown={e=>{const sel=window.getSelection();if(sel.rangeCount>0){e.currentTarget._savedRange=sel.getRangeAt(0).cloneRange()}}}>
                          <cp.Ic/>
                          <input type="color" onInput={e=>{const label=e.target.closest("label");const range=label?._savedRange;if(range){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)}document.execCommand(cp.cmd,false,e.target.value)}}
                            style={{position:"absolute",width:0,height:0,opacity:0,cursor:"pointer"}}/>
                        </label>
                      ))}
                      <button className="tb-btn" onMouseDown={e=>{e.preventDefault();document.execCommand("removeFormat")}} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}} title="Remove Formatting"><IC.X/></button>
                      {[{cmd:"insertUnorderedList",Ic:IC.ListBul},{cmd:"insertOrderedList",Ic:IC.ListNum}].map(b=>(
                        <button key={b.cmd} className="tb-btn" onMouseDown={e=>{e.preventDefault();document.execCommand(b.cmd)}} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}><b.Ic/></button>
                      ))}
                      <div style={{width:1,height:16,background:T.bdr}}/>
                      <button className="tb-btn" onMouseDown={e=>{e.preventDefault();document.execCommand("formatBlock",false,"blockquote")}} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}><IC.Quote/></button>
                      <button className="tb-btn" onMouseDown={e=>{e.preventDefault();document.execCommand("formatBlock",false,"pre")}} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}><IC.CodeBlock/></button>
                      {[{cmd:"subscript",Ic:IC.Sub},{cmd:"superscript",Ic:IC.Sup}].map(b=>(
                        <button key={b.cmd} className="tb-btn" onMouseDown={e=>{e.preventDefault();document.execCommand(b.cmd)}} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}><b.Ic/></button>
                      ))}
                      <button className="tb-btn" onMouseDown={e=>{e.preventDefault();document.execCommand("removeFormat")}} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",padding:"4px 6px",borderRadius:6,display:"flex"}}><IC.Eraser/></button>
                    </div>
                    <div ref={el=>{if(el)ceRefs.current[block.id]=el}} className="nc-editor" contentEditable suppressContentEditableWarning
                      data-placeholder="Start writing..."
                      onInput={()=>{if(ceRefs.current[block.id]){updateBlock(block.id,ceRefs.current[block.id].innerHTML);debouncedFlush()}}}
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
                            style={{background:"none",border:"none",color:T.dim,cursor:"pointer",padding:2,opacity:.7,display:"flex"}}
                            onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".7"}><IC.X/></button>
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
                    <div className="nc-editor" style={{flex:1,padding:8,fontSize:14,fontFamily:`${F.body},sans-serif`,color:T.dark?"rgba(226,232,240,.9)":"rgba(26,26,26,.9)",overflowY:"auto"}}
                      dangerouslySetInnerHTML={{__html:mdToHtml(block.content)||`<span style="color:${T.faint};font-style:italic">Preview</span>`}}/>
                  </div>}
                </div>
              })}

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
