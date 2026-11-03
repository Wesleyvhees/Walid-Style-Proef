import { continueRender, delayRender, staticFile } from "remotion";
import { FONT_FAMILY } from "./styles";

const FILES: [string, string, string?][] = [
  [FONT_FAMILY.serif, "fonts/InstrumentSerif-Regular.ttf"],
  [FONT_FAMILY.italic, "fonts/InstrumentSerif-Italic.ttf"],
  [FONT_FAMILY.condensed, "fonts/Anton-Regular.ttf"],
  [FONT_FAMILY.mono, "fonts/DMMono-Regular.ttf"],
  [FONT_FAMILY.sans, "fonts/Inter-Variable.ttf", "100 900"],
];

let started = false;
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("fonts");
  Promise.all(
    FILES.map(([family, file, weight]) => {
      const f = new FontFace(family, `url(${staticFile(file)})`, weight ? { weight } : {});
      return f.load().then((loaded) => document.fonts.add(loaded));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
