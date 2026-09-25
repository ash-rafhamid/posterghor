import { darken, lighten, mix } from "../color";
import type { Palette } from "./types";

/**
 * Illustrated, faceless portrait silhouettes.
 * Used as (a) placeholders in empty photo slots and (b) demo "leaders" for template thumbnails, so we never need
 * real people's photos to show what a template looks like.
 */

const SKINS = ["#e6b08a", "#c68b62", "#efc4a0", "#b57a55"];

interface AvatarSpec {
  skin: string;
  hair: string;
  cloth: string;
  cloth2: string;
  kind: "suit" | "panjabi" | "saree" | "elder";
}

function specFor(index: number, p?: Palette): AvatarSpec {
  const i = ((index % 4) + 4) % 4;
  const kinds: AvatarSpec["kind"][] = ["suit", "panjabi", "saree", "elder"];
  const dark = p ? darken(p.ink, 0.1) : "#2b2f3a";
  return {
    skin: SKINS[i]!,
    hair: i === 3 ? "#e8e6e1" : i === 2 ? "#1d1512" : "#1a1a1c",
    cloth: kinds[i] === "saree" ? (p ? mix(p.secondary, "#000", 0.1) : "#b8322a") : kinds[i] === "panjabi" ? "#efe6cf" : dark,
    cloth2: kinds[i] === "saree" ? (p ? mix(p.primary, "#000", 0.05) : "#0b6b4f") : kinds[i] === "panjabi" ? "#d7c9a6" : "#f3f1ea",
    kind: kinds[i]!,
  };
}

export function avatarSvg(index: number, p?: Palette): string {
  const a = specFor(index, p);
  const bg1 = p ? mix(p.primary, "#000000", 0.25) : "#1d4d3f";
  const bg2 = p ? lighten(mix(p.bgTo, p.primary, 0.4), 0.12) : "#4f8b78";
  const skinShade = darken(a.skin, 0.14);
  const hairTop =
    a.kind === "suit"
      ? `<path d="M182 340C176 250 232 200 300 200C368 200 426 250 418 340C404 292 372 262 300 262C228 262 196 292 182 340Z" fill="${a.hair}"/>`
      : a.kind === "panjabi"
        ? `<path d="M180 312C178 236 234 196 300 196C366 196 422 236 420 312C420 322 414 328 406 322C392 292 356 272 300 272C244 272 208 292 194 322C186 328 180 322 180 312Z" fill="#f6f2e8"/><path d="M196 300C230 276 370 276 404 300" fill="none" stroke="#d9d0bb" stroke-width="4"/><path d="M186 316C230 288 370 288 414 316" fill="none" stroke="#e5decb" stroke-width="3"/>`
        : a.kind === "saree"
          ? `<path d="M178 350C166 250 226 190 300 190C374 190 434 250 422 350C410 290 372 250 300 250C228 250 190 290 178 350Z" fill="${a.hair}"/><circle cx="300" cy="176" r="46" fill="${a.hair}"/>`
          : `<path d="M186 330C184 262 236 226 300 226C364 226 416 262 414 330C402 296 366 272 300 272C234 272 198 296 186 330Z" fill="${a.hair}"/>`;
  const glasses =
    a.kind === "elder"
      ? `<g fill="none" stroke="#3b3b3b" stroke-width="5"><rect x="232" y="352" width="56" height="40" rx="14"/><rect x="312" y="352" width="56" height="40" rx="14"/><path d="M288 368H312"/></g>`
      : "";
  const outfit =
    a.kind === "suit" || a.kind === "elder"
      ? `<path d="M0 750C0 650 104 596 224 570L300 640L376 570C496 596 600 650 600 750Z" fill="${a.cloth}"/>
         <path d="M224 570L300 668L376 570L342 566L300 622L258 566Z" fill="${a.cloth2}"/>
         <path d="M300 622L282 700L300 730L318 700Z" fill="${p ? p.secondary : "#b8322a"}"/>`
      : a.kind === "panjabi"
        ? `<path d="M0 750C0 650 104 596 224 570L376 570C496 596 600 650 600 750Z" fill="${a.cloth}"/>
           <path d="M262 566L300 612L338 566L322 566L300 594L278 566Z" fill="${a.cloth2}"/>
           <path d="M300 612V750" stroke="${a.cloth2}" stroke-width="5"/>
           <circle cx="300" cy="640" r="6" fill="#b89b5a"/><circle cx="300" cy="676" r="6" fill="#b89b5a"/>`
        : `<path d="M0 750C0 650 104 596 224 570L376 570C496 596 600 650 600 750Z" fill="${a.cloth}"/>
           <path d="M120 750C150 660 250 600 330 590L460 750Z" fill="${a.cloth2}" opacity="0.92"/>
           <path d="M178 350C160 480 170 560 230 640" fill="none" stroke="${a.cloth}" stroke-width="30" stroke-linecap="round" opacity="0.9"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">
<defs>
<linearGradient id="a${index}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg2}"/><stop offset="1" stop-color="${bg1}"/></linearGradient>
<radialGradient id="l${index}" cx="0.5" cy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="600" height="750" fill="url(#a${index})"/>
<rect width="600" height="750" fill="url(#l${index})"/>
${outfit}
<path d="M254 470H346V584C330 604 270 604 254 584Z" fill="${skinShade}"/>
<ellipse cx="184" cy="372" rx="20" ry="32" fill="${skinShade}"/>
<ellipse cx="416" cy="372" rx="20" ry="32" fill="${skinShade}"/>
<ellipse cx="300" cy="362" rx="118" ry="146" fill="${a.skin}"/>
<path d="M214 420C226 486 262 512 300 512C338 512 374 486 386 420C364 470 332 490 300 490C268 490 236 470 214 420Z" fill="${skinShade}" opacity="0.32"/>
${hairTop}
${glasses}
</svg>`;
}

/** `data:` URI usable directly as <img src>. */
export function avatarDataUri(index: number, p?: Palette): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(index, p))}`;
}
