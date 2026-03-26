import type { VoxelMap } from "./VoxelRenderer";
import type { VoxelPalette } from "./voxelPalette";

type CharKey =
  | "." | "H" | "h" | "S" | "s" | "d" | "E" | "M" | "B"
  | "J" | "j" | "k" | "c" | "V" | "v" | "W" | "T" | "t"
  | "b" | "U" | "L" | "l" | "R" | "O" | "o" | "P" | "Q"
  | "G" | "F" | "f" | "g" | "N" | "n" | "D" | "e" | "C"
  | "i" | "A" | "a" | "X";

function resolve(ch: string, p: VoxelPalette): string | null {
  switch (ch) {
    case ".": return null;
    case "H": return p.hairBase;
    case "h": return p.hairHighlight;
    case "S": return p.skinBase;
    case "s": return p.skinHighlight;
    case "d": return p.skinShadow;
    case "E": return p.eyeColor;
    case "M": return p.mouthColor;
    case "B": return p.browColor;
    case "J": return p.suitBase;
    case "j": return p.suitMid;
    case "k": return p.suitLight;
    case "c": return p.suitCheck;
    case "V": return p.vestBase;
    case "v": return p.vestLight;
    case "W": return p.shirtWhite;
    case "T": return p.tieBase;
    case "t": return p.tiePattern;
    case "b": return p.beltColor;
    case "U": return p.beltBuckle;
    case "L": return p.trouserBase;
    case "l": return p.trouserLight;
    case "R": return p.trouserCrease;
    case "O": return p.shoeBase;
    case "o": return p.shoeSole;
    case "P": return p.shoeHighlight;
    case "Q": return p.pocketSquare;
    case "G": return p.lapelPin;
    case "F": return p.briefcaseBase;
    case "f": return p.briefcaseDark;
    case "g": return p.briefcaseHardware;
    case "N": return p.phoneBody;
    case "n": return p.phoneScreen;
    case "D": return p.docWhite;
    case "e": return p.docLine;
    case "C": return p.coffeeCup;
    case "i": return p.coffeeLid;
    case "A": return p.platformBase;
    case "a": return p.platformLight;
    case "X": return p.lapelPin;
    default: return null;
  }
}

function parseMap(lines: string[], palette: VoxelPalette): VoxelMap {
  const maxW = Math.max(...lines.map((l) => l.length));
  return lines.map((line) => {
    const padded = line.padEnd(maxW, ".");
    return padded.split("").map((ch) => resolve(ch, palette));
  });
}

const FRONT_ELITE: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HdSSSSSSSSdH.........",
  ".........HdSSSSSSSSdH.........",
  ".........dSSSSSSSSSSD.........",
  "..........SBSSSSSBS..........",
  "..........SEsSsSsES..........",
  "..........SSSddSSSSS..........",
  "..........SSSSdSSSS...........",
  "..........SSSdddSSS...........",
  "..........SSSMMMSS...........",
  "...........dSSSSd............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........jWWTTWWj...........",
  ".........jjWWTTWWjj..........",
  "........JjjWWTtWWjjJ.........",
  ".......JJjkWWTTWWkjJJ........",
  "......JJJjkWWTtWWkjJJJ.......",
  ".....JJJjjkWWTTWWkjjJJJ......",
  ".....JJJjjVVVTtVVVjjJJJ......",
  ".....JcJjjVVVTTVVVjjJcJ......",
  ".....JJJjjVvVTtVvVjjJJJ......",
  ".....JJGjjVVVTTVVVjjQJJ......",
  ".....JJJjjVVVTtVVVjjJJJ......",
  ".....JJJjcVVVbbVVVcjJJJ......",
  "....DJJJjcVVbUUbVVcjJJJN.....",
  "....DDJJjcLLLLLLLLcjJJNN.....",
  "....DDJJjLLLLLLLLLLjJJNN.....",
  "....DDJjjLLLLlLLLLLjjJNN.....",
  "....DSSjjLLLLlLLLLLjjSSN.....",
  ".....SSjjLLLLlLLLLLjjSN......",
  ".....SS.LLLLRLRLLLL.SN.......",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLlLlLLL...........",
  "..........LLlRLlLL...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "....FFff.aAAAaAAAa.CCi.......",
  "....FgFf.aAaAaAaAa.Cii......",
  "....FFff.aaAaAaAaa...........",
];

const FRONT_PREMIUM: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HdSSSSSSSSdH.........",
  ".........HdSSSSSSSSdH.........",
  ".........dSSSSSSSSSSD.........",
  "..........SBSSSSSBS..........",
  "..........SEsSsSsES..........",
  "..........SSSddSSSSS..........",
  "..........SSSSdSSSS...........",
  "..........SSSdddSSS...........",
  "..........SSSMMMSS...........",
  "...........dSSSSd............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........jWWTTWWj...........",
  ".........jjWWTTWWjj..........",
  "........JjjWWTTWWjjJ.........",
  ".......JJjkWWTTWWkjJJ........",
  "......JJJjkWWTTWWkjJJJ.......",
  ".....JJJjjkWWTTWWkjjJJJ......",
  ".....JJJjjjWWTTWWjjjJJJ......",
  ".....JcJjjjWWTTWWjjjJcJ......",
  ".....JJJjjjWWTTWWjjjJJJ......",
  ".....JJJjjjWWTTWWjjjJJJ......",
  ".....JJJjjjWWTTWWjjjJJJ......",
  ".....JJJjcjjjbbbjjcjJJJ......",
  ".....JJJjcLLbUUbLLcjJJJ......",
  ".....JJJjcLLLLLLLLcjJJJ......",
  ".....JJJjLLLLLLLLLLjJJJ......",
  ".....JJjjLLLLlLLLLLjjJJ......",
  ".....SSjjLLLLlLLLLLjjSS......",
  ".....SS.LLLLRLRLLLL.SS.......",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLlLlLLL...........",
  "..........LLlRLlLL...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "..............................",
  "........aAAAaAAAa............",
  "........aAaAaAaAa............",
  "........aaAaAaAaa............",
];

const FRONT_RISING: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HdSSSSSSSSdH.........",
  ".........HdSSSSSSSSdH.........",
  ".........dSSSSSSSSSSD.........",
  "..........SBSSSSSBS..........",
  "..........SEsSsSsES..........",
  "..........SSSddSSSSS..........",
  "..........SSSSdSSSS...........",
  "..........SSSdddSSS...........",
  "..........SSSMMMSS...........",
  "...........dSSSSd............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........WWWWWWWW...........",
  ".........jjWWWWWWjj..........",
  "........jjjWWWWWWjjj.........",
  ".......jjjjWWWWWWjjjj........",
  "......jjjjjWWWWWWjjjjj.......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjjjbbjjjjjjjj......",
  ".....jjjjjjLbUUbLjjjjjj......",
  ".....jjjjjLLLLLLLLjjjjj......",
  "......jjjLLLLLLLLLLjjj.......",
  "......SSjLLLLlLLLLLjSS.......",
  "......SS.LLLLlLLLLL.SS.......",
  "..........LLLLlLLLL..........",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLlLlLLL...........",
  "..........LLlRLlLL...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "..............................",
  "........aAAAaAAAa............",
  "........aAaAaAaAa............",
  "........aaAaAaAaa............",
];

const FRONT_STARTER: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HdSSSSSSSSdH.........",
  ".........HdSSSSSSSSdH.........",
  ".........dSSSSSSSSSSD.........",
  "..........SBSSSSSBS..........",
  "..........SEsSsSsES..........",
  "..........SSSddSSSSS..........",
  "..........SSSSdSSSS...........",
  "..........SSSdddSSS...........",
  "..........SSSMMMSS...........",
  "...........dSSSSd............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........WWWWWWWW...........",
  ".........WWWWWWWWWW..........",
  "........WWWWWWWWWWWW.........",
  ".......WWWWWWWWWWWWWW........",
  "......WWWWWWWWWWWWWWWW.......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  "..........jjjjjjjjjj.........",
  "..........jjjjjjjjjj.........",
  "..........jjjjjjjjjj.........",
  "..........jjjjjjjjjj.........",
  "......SSjjjjjjljjjjjjSS......",
  "......SS.jjjjjljjjjj.SS......",
  "..........jjjjjjjjjj.........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  "..........jjjjljjjj...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "..............................",
  "........aAAAaAAAa............",
  "........aAaAaAaAa............",
  "........aaAaAaAaa............",
];

const SIDE_ELITE: string[] = [
  "...........HHHhH...........",
  "..........HHHhHhH..........",
  ".........HHHhHhHhH.........",
  ".........HHhHhHhHh.........",
  "........HHHHHHHHHh.........",
  "........HSSSSSSSSSd........",
  "........dSSSSSSSSSd........",
  "........dSSSSSSSSSSS.......",
  "........SBSSSSSSSSS.......",
  "........SESSSSESSSS.......",
  "........SSSSSddSSSS.......",
  ".........SSSSSdSSS........",
  ".........SSSddddSSS.......",
  ".........SSSSMMSSS........",
  "..........dSSSSSd.........",
  "...........dSSd...........",
  "...........WWWWW..........",
  "..........jWWTWWj.........",
  ".........jjWWTWWjj........",
  "........JjjWWTWWjjD.......",
  ".......JJjkWWTWWkjDD......",
  "......JJJjkWWTWWkjDDD.....",
  ".....JJJjjkWWTWWkjjDD.....",
  ".....JJJjjVVVTVVVjjSD.....",
  ".....JcJjjVVVTVVVjjSS.....",
  ".....JJJjjVvVTVvVjjS......",
  ".....JJGjjVVVTVVVjjS......",
  ".....JJJjjVVVTVVVjS.......",
  ".....JJJjcVVVbVVVcS.......",
  ".....JJJjcVVbUbVVcS.......",
  ".....JJJjcLLLLLLLcS.......",
  "......JJjLLLLLLLLLS.......",
  "......JjjLLLlLLLLLS.......",
  "......SSjLLLlLLLLSS.......",
  "......SS.LLLlLLLLSS.......",
  "..........LLLlLLLL........",
  "..........LLLlLLLL........",
  "..........LLRLlLLL........",
  "..........LLLlLLLL........",
  "..........LLLlLLLL........",
  "..........LLRLlLLL........",
  "..........LLLlLLLL........",
  "..........LLlLlLLL........",
  "..........LLlRLlLL........",
  ".........OOOOl.OOOO.......",
  ".........OPOOo.OPOO.......",
  ".........ooooo.oooo.......",
  ".............................",
  "....FFff.aAAAaAAAa.........",
  "....FgFf.aAaAaAaAa.........",
  "....FFff.aaAaAaAaa.........",
  ".............................",
];

const BACK_ELITE: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHHH..........",
  "..........HHHHHHHH...........",
  "..........HHHHHHHH...........",
  "...........HHHHHH............",
  "...........HHHHHH............",
  "............HHHH.............",
  "...........dSSSSd............",
  "...........dSSSSd............",
  "............dSSd.............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........jWWWWWWj...........",
  ".........jjWWWWWWjj..........",
  "........JjjWWWWWWjjJ.........",
  ".......JJjkWWWWWWkjJJ........",
  "......JJJjkWWWWWWkjJJJ.......",
  ".....JJJjjkJJJJJJkjjJJJ......",
  ".....JJJjjJJJJJJJJjjJJJ......",
  ".....JcJjjJJJJJJJJjjJcJ......",
  ".....JJJjjJJcJJcJJjjJJJ......",
  ".....JJJjjJJJJJJJJjjJJJ......",
  ".....JJJjjJJJJJJJJjjJJJ......",
  ".....JJJjcJJJbbJJJcjJJJ......",
  ".....JJJjcJJbUUbJJcjJJJ......",
  ".....JJJjcLLLLLLLLcjJJJ......",
  ".....JJJjLLLLLLLLLLjJJJ......",
  ".....JJjjLLLLRLLLLLjjJJ......",
  ".....SSjjLLLLRLLLLLjjSS......",
  ".....SS.LLLLRLRLLLL.SS.......",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLlRLlLL...........",
  "..........LLlRLlLL...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "..............................",
  "........aAAAaAAAa............",
  "........aAaAaAaAa............",
  "........aaAaAaAaa............",
];

const HAIR_MAPS: Record<string, { front: string[]; side: string[]; back: string[] }> = {
  textured_crop: {
    front: [
      "...........hHhHhH............",
      "..........HhHhHhHH...........",
      ".........HHhHhHhHHH..........",
      ".........HHHhHhHHHH..........",
      "........HHHHHHHHHHHHH........",
    ],
    side: [
      "..........hHhHhH..........",
      ".........HhHhHhH.........",
      "........HHhHhHhHH........",
      "........HHHhHhHHH........",
      ".......HHHHHHHHHHH.......",
    ],
    back: [
      "...........HhHhHH............",
      "..........HHhHhHHH...........",
      ".........HHHhHhHHHH..........",
      ".........HHHHhHHHHH..........",
      "........HHHHHHHHHHHHH........",
    ],
  },
  side_part: {
    front: [
      "............HHHhHH............",
      "...........HHHhHhHH...........",
      "..........HHHhHhHhHH..........",
      "..........HHhHhHhHhH..........",
      ".........HHHHHHHHHhHH.........",
    ],
    side: [
      "...........HHHhH...........",
      "..........HHHhHhH..........",
      ".........HHHhHhHhH.........",
      ".........HHhHhHhHh.........",
      "........HHHHHHHHHh.........",
    ],
    back: [
      "............HHHhHH............",
      "...........HHHhHhHH...........",
      "..........HHHhHhHhHH..........",
      "..........HHhHhHhHhH..........",
      ".........HHHHHHHHHhHH.........",
    ],
  },
  slicked_back: {
    front: [
      "............HHHH.............",
      "...........HHHHHH............",
      "..........HHHHHHHH...........",
      "..........HHHHHHHH...........",
      ".........HHHHHHHHHH..........",
    ],
    side: [
      "...........HHHH............",
      "..........HHHHH............",
      ".........HHHHHH............",
      ".........HHHHHHH...........",
      "........HHHHHHHH...........",
    ],
    back: [
      "............HHHH.............",
      "...........HHHHHH............",
      "..........HHHHHHHH...........",
      "..........HHHHHHHH...........",
      ".........HHHHHHHHHH..........",
    ],
  },
  buzz_cut: {
    front: [
      "..............................",
      "...........HHHHHH............",
      "..........HHHHHHHH...........",
      "..........HHHHHHHH...........",
      ".........HHHHHHHHHH..........",
    ],
    side: [
      ".............................",
      "..........HHHHHH............",
      ".........HHHHHHH............",
      ".........HHHHHHHH...........",
      "........HHHHHHHHH...........",
    ],
    back: [
      "..............................",
      "...........HHHHHH............",
      "..........HHHHHHHH...........",
      "..........HHHHHHHH...........",
      ".........HHHHHHHHHH..........",
    ],
  },
  medium_natural: {
    front: [
      "...........hHhHhHh...........",
      "..........hHhHhHhHh..........",
      ".........HhHhHhHhHH..........",
      ".........HHhHhHhHHHH.........",
      "........HHHHHHHHHHHHHH.......",
    ],
    side: [
      "..........hHhHhHh..........",
      ".........hHhHhHhHh.........",
      "........HhHhHhHhHH........",
      "........HHhHhHhHHH........",
      ".......HHHHHHHHHHHHH......",
    ],
    back: [
      "...........hHhHhHh...........",
      "..........hHhHhHhHh..........",
      ".........HhHhHhHhHH..........",
      ".........HHhHhHhHHHH.........",
      "........HHHHHHHHHHHHH........",
    ],
  },
  bald: {
    front: [
      "..............................",
      "..............................",
      "..............................",
      "..............................",
      "..............................",
    ],
    side: [
      ".............................",
      ".............................",
      ".............................",
      ".............................",
      ".............................",
    ],
    back: [
      "..............................",
      "..............................",
      "..............................",
      "..............................",
      "..............................",
    ],
  },
};

function normalizeHairStyle(style: string): string {
  const aliases: Record<string, string> = {
    clean_cut: "side_part",
    slick_back: "slicked_back",
    undercut: "slicked_back",
    textured_crop: "textured_crop",
    french_crop: "textured_crop",
    taper: "textured_crop",
    side_part: "side_part",
    classic_side_part: "side_part",
    caesar: "buzz_cut",
    crew_cut: "buzz_cut",
    "low-fade": "buzz_cut",
    pompadour: "textured_crop",
    man_bun: "slicked_back",
    natural: "medium_natural",
    waves: "medium_natural",
    textured_pixie: "medium_natural",
    natural_medium: "medium_natural",
    short_bob: "medium_natural",
    side_part_long: "medium_natural",
    medium_natural: "medium_natural",
    bald: "bald",
  };
  return aliases[style] ?? "side_part";
}

function applyHairToMap(baseLines: string[], hairLines: string[]): string[] {
  const result = [...baseLines];
  for (let i = 0; i < Math.min(hairLines.length, result.length); i++) {
    const hLine = hairLines[i];
    const bLine = result[i];
    let merged = "";
    const maxLen = Math.max(hLine.length, bLine.length);
    for (let j = 0; j < maxLen; j++) {
      const hc = j < hLine.length ? hLine[j] : ".";
      const bc = j < bLine.length ? bLine[j] : ".";
      if (hc !== ".") {
        merged += hc;
      } else {
        merged += bc;
      }
    }
    result[i] = merged;
  }
  return result;
}

const SIDE_STARTER: string[] = [
  "...........HHHhH...........",
  "..........HHHhHhH..........",
  ".........HHHhHhHhH.........",
  ".........HHhHhHhHh.........",
  "........HHHHHHHHHh.........",
  "........HSSSSSSSSSd........",
  "........dSSSSSSSSSd........",
  "........dSSSSSSSSSSS.......",
  "........SBSSSSSSSSS.......",
  "........SESSSSESSSS.......",
  "........SSSSSddSSSS.......",
  ".........SSSSSdSSS........",
  ".........SSSddddSSS.......",
  ".........SSSSMMSSS........",
  "..........dSSSSSd.........",
  "...........dSSd...........",
  "...........WWWWW..........",
  "..........WWWWWWW.........",
  ".........WWWWWWWWW........",
  "........WWWWWWWWWWW.......",
  ".......WWWWWWWWWWWWW......",
  "......WWWWWWWWWWWWWWW.....",
  ".....WWWWWWWWWWWWWWWW.....",
  ".....WWWWWWWWWWWWWWWW.....",
  ".....WWWWWWWWWWWWWWWW.....",
  ".....WWWWWWWWWWWWWWWW.....",
  ".....WWWWWWWWWWWWWWWW.....",
  ".....WWWWWWWWWWWWWWWW.....",
  "..........jjjjbjjjjj......",
  "..........jjjjbjjjjj......",
  "..........jjjjjjjjjj......",
  "......jjjjjjjjjjjjjj.....",
  "......SSjjjjjljjjjjjS....",
  "......SS.jjjjljjjjjSS....",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  "..........jjjjljjjj.......",
  ".........OOOOl.OOOO.......",
  ".........OPOOo.OPOO.......",
  ".........ooooo.oooo.......",
  ".............................",
  "........aAAAaAAAa...........",
  "........aAaAaAaAa...........",
  "........aaAaAaAaa...........",
  ".............................",
];

const SIDE_RISING: string[] = [
  "...........HHHhH...........",
  "..........HHHhHhH..........",
  ".........HHHhHhHhH.........",
  ".........HHhHhHhHh.........",
  "........HHHHHHHHHh.........",
  "........HSSSSSSSSSd........",
  "........dSSSSSSSSSd........",
  "........dSSSSSSSSSSS.......",
  "........SBSSSSSSSSS.......",
  "........SESSSSESSSS.......",
  "........SSSSSddSSSS.......",
  ".........SSSSSdSSS........",
  ".........SSSddddSSS.......",
  ".........SSSSMMSSS........",
  "..........dSSSSSd.........",
  "...........dSSd...........",
  "...........WWWWW..........",
  "..........jWWWWWj.........",
  ".........jjWWWWWjj........",
  "........jjjWWWWWjjj.......",
  ".......jjjjWWWWWjjjj......",
  "......jjjjjWWWWWjjjjj.....",
  ".....jjjjjjWWWWWjjjjjj....",
  ".....jjjjjjWWWWWjjjjjj....",
  ".....jjjjjjWWWWWjjjjjj....",
  ".....jjjjjjWWWWWjjjjjj....",
  ".....jjjjjjWWWWWjjjjjj....",
  ".....jjjjjjWWWWWjjjjjj....",
  ".....jjjjjjjjbbjjjjjjj....",
  ".....jjjjjLLbUbLLjjjjj....",
  ".....jjjjjLLLLLLLjjjjj....",
  "......jjjLLLLLLLLLjjj.....",
  "......SSjLLLlLLLLLjSS.....",
  "......SS.LLLlLLLLLSS......",
  "..........LLLlLLLL........",
  "..........LLLlLLLL........",
  "..........LLRLlLLL........",
  "..........LLLlLLLL........",
  "..........LLLlLLLL........",
  "..........LLRLlLLL........",
  "..........LLLlLLLL........",
  "..........LLlLlLLL........",
  "..........LLlRLlLL........",
  "..........LLlRLlLL........",
  ".........OOOOl.OOOO.......",
  ".........OPOOo.OPOO.......",
  ".........ooooo.oooo.......",
  ".............................",
  "........aAAAaAAAa...........",
  "........aAaAaAaAa...........",
  "........aaAaAaAaa...........",
  ".............................",
];

const SIDE_PREMIUM: string[] = [
  "...........HHHhH...........",
  "..........HHHhHhH..........",
  ".........HHHhHhHhH.........",
  ".........HHhHhHhHh.........",
  "........HHHHHHHHHh.........",
  "........HSSSSSSSSSd........",
  "........dSSSSSSSSSd........",
  "........dSSSSSSSSSSS.......",
  "........SBSSSSSSSSS.......",
  "........SESSSSESSSS.......",
  "........SSSSSddSSSS.......",
  ".........SSSSSdSSS........",
  ".........SSSddddSSS.......",
  ".........SSSSMMSSS........",
  "..........dSSSSSd.........",
  "...........dSSd...........",
  "...........WWWWW..........",
  "..........jWWTWWj.........",
  ".........jjWWTWWjj........",
  "........JjjWWTWWjjJ.......",
  ".......JJjkWWTWWkjJJ......",
  "......JJJjkWWTWWkjJJJ.....",
  ".....JJJjjkWWTWWkjjJJJ....",
  ".....JJJjjjWWTWWjjjJJJ....",
  ".....JJJjjjWWTWWjjjJJJ....",
  ".....JJJjjjWWTWWjjjJJJ....",
  ".....JJJjjjWWTWWjjjJJJ....",
  ".....JJJjjjWWTWWjjjJJJ....",
  ".....JJJjcjjjbjjjcjJJJ....",
  ".....JJJjcLLbUbLLcjJJJ....",
  ".....JJJjcLLLLLLLcjJJJ....",
  "......JJjLLLLLLLLLjJJ.....",
  "......SSjLLLlLLLLLjSS.....",
  "......SS.LLLlLLLLLSS......",
  "..........LLLlLLLL........",
  "..........LLLlLLLL........",
  "..........LLRLlLLL........",
  "..........LLLlLLLL........",
  "..........LLLlLLLL........",
  "..........LLRLlLLL........",
  "..........LLLlLLLL........",
  "..........LLlLlLLL........",
  "..........LLlRLlLL........",
  "..........LLlRLlLL........",
  ".........OOOOl.OOOO.......",
  ".........OPOOo.OPOO.......",
  ".........ooooo.oooo.......",
  ".............................",
  "........aAAAaAAAa...........",
  "........aAaAaAaAa...........",
  "........aaAaAaAaa...........",
  ".............................",
];

const BACK_STARTER: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHHH..........",
  "..........HHHHHHHH...........",
  "..........HHHHHHHH...........",
  "...........HHHHHH............",
  "...........HHHHHH............",
  "............HHHH.............",
  "...........dSSSSd............",
  "...........dSSSSd............",
  "............dSSd.............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........WWWWWWWW...........",
  ".........WWWWWWWWWW..........",
  "........WWWWWWWWWWWW.........",
  ".......WWWWWWWWWWWWWW........",
  "......WWWWWWWWWWWWWWWW.......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  ".....WWWWWWWWWWWWWWWWWW......",
  "..........jjjjjjjjjj.........",
  "..........jjjjjjjjjj.........",
  "..........jjjjjjjjjj.........",
  "..........jjjjjjjjjj.........",
  "......SSjjjjjjRjjjjjjSS.....",
  "......SS.jjjjRjjjjj.SS......",
  "..........jjjjjjjjjj.........",
  "..........jjjjRjjjj...........",
  "..........jjjjjjjjj...........",
  "..........jjjjRjjjj...........",
  "..........jjjjjjjjj...........",
  "..........jjjjjjjjj...........",
  "..........jjjjRjjjj...........",
  "..........jjjjjjjjj...........",
  "..........jjjjRjjjj...........",
  "..........jjjjRjjjj...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "..............................",
  "........aAAAaAAAa............",
  "........aAaAaAaAa............",
  "........aaAaAaAaa............",
];

const BACK_RISING: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHHH..........",
  "..........HHHHHHHH...........",
  "..........HHHHHHHH...........",
  "...........HHHHHH............",
  "...........HHHHHH............",
  "............HHHH.............",
  "...........dSSSSd............",
  "...........dSSSSd............",
  "............dSSd.............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........jWWWWWWj...........",
  ".........jjWWWWWWjj..........",
  "........jjjWWWWWWjjj.........",
  ".......jjjjWWWWWWjjjj........",
  "......jjjjjWWWWWWjjjjj.......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjWWWWWWjjjjjj......",
  ".....jjjjjjjjbbjjjjjjjj......",
  ".....jjjjjjLbUUbLjjjjjj......",
  ".....jjjjjLLLLLLLLjjjjj......",
  "......jjjLLLLLLLLLLjjj.......",
  "......SSjLLLLRLLLLLjSS.......",
  "......SS.LLLLRLLLLL.SS.......",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLlRLlLL...........",
  "..........LLlRLlLL...........",
  "..........LLlRLlLL...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "..............................",
  "........aAAAaAAAa............",
  "........aAaAaAaAa............",
  "........aaAaAaAaa............",
];

const BACK_PREMIUM: string[] = [
  "............HHHhHH............",
  "...........HHHhHhHH...........",
  "..........HHHhHhHhHH..........",
  "..........HHhHhHhHhH..........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHhHH.........",
  ".........HHHHHHHHHHH..........",
  "..........HHHHHHHH...........",
  "..........HHHHHHHH...........",
  "...........HHHHHH............",
  "...........HHHHHH............",
  "............HHHH.............",
  "...........dSSSSd............",
  "...........dSSSSd............",
  "............dSSd.............",
  "............dSSd.............",
  "...........WWWWWW............",
  "..........jWWWWWWj...........",
  ".........jjWWWWWWjj..........",
  "........JjjWWWWWWjjJ.........",
  ".......JJjkWWWWWWkjJJ........",
  "......JJJjkWWWWWWkjJJJ.......",
  ".....JJJjjkJJJJJJkjjJJJ......",
  ".....JJJjjJJJJJJJJjjJJJ......",
  ".....JJJjjJJJJJJJJjjJJJ......",
  ".....JJJjjJJcJJcJJjjJJJ......",
  ".....JJJjjJJJJJJJJjjJJJ......",
  ".....JJJjjJJJJJJJJjjJJJ......",
  ".....JJJjcJJJbbJJJcjJJJ......",
  ".....JJJjcJJbUUbJJcjJJJ......",
  ".....JJJjcLLLLLLLLcjJJJ......",
  ".....JJJjLLLLLLLLLLjJJJ......",
  ".....JJjjLLLLRLLLLLjjJJ......",
  ".....SSjjLLLLRLLLLLjjSS......",
  ".....SS.LLLLRLRLLLL.SS.......",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLLlLLLL...........",
  "..........LLLRLlLL...........",
  "..........LLLlLLLL...........",
  "..........LLlRLlLL...........",
  "..........LLlRLlLL...........",
  ".........OOOOl.OOOOl.........",
  ".........OPOOo.OPOOo.........",
  ".........ooooo.ooooo.........",
  "..............................",
  "..............................",
  "........aAAAaAAAa............",
  "........aAaAaAaAa............",
  "........aaAaAaAaa............",
];

function getBaseMapForTier(tier: number, view: "front" | "side" | "back"): string[] {
  if (view === "front") {
    switch (tier) {
      case 1: return FRONT_STARTER;
      case 2: return FRONT_RISING;
      case 3: return FRONT_PREMIUM;
      default: return FRONT_ELITE;
    }
  }
  if (view === "side") {
    switch (tier) {
      case 1: return SIDE_STARTER;
      case 2: return SIDE_RISING;
      case 3: return SIDE_PREMIUM;
      default: return SIDE_ELITE;
    }
  }
  switch (tier) {
    case 1: return BACK_STARTER;
    case 2: return BACK_RISING;
    case 3: return BACK_PREMIUM;
    default: return BACK_ELITE;
  }
}

export function buildVoxelMap(
  palette: VoxelPalette,
  view: "front" | "side" | "back",
  outfitTier: number,
  hairStyle: string,
): VoxelMap {
  const normalizedHair = normalizeHairStyle(hairStyle);
  const hairData = HAIR_MAPS[normalizedHair] ?? HAIR_MAPS.side_part;
  const hairLines = hairData[view];

  const baseLines = getBaseMapForTier(outfitTier, view);
  const finalLines = applyHairToMap(baseLines, hairLines);

  return parseMap(finalLines, palette);
}
