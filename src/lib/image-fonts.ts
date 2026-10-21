import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FontWeight } from "./image-fit";

export type KitImageFont = { name: string; data: Buffer; weight: FontWeight; style: "normal" };

let loaded: Promise<KitImageFont[]> | undefined;

/**
 * Geist in the three weights the kit images use (OFL, assets/fonts). Passing fonts to ImageResponse
 * replaces its built-in Geist Regular, which has no bold, so all three are listed.
 */
export function kitImageFonts(): Promise<KitImageFont[]> {
  loaded ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-Bold.ttf")),
  ]).then(
    ([regular, semibold, bold]) => [
      { name: "Geist", data: regular, weight: 400, style: "normal" },
      { name: "Geist", data: semibold, weight: 600, style: "normal" },
      { name: "Geist", data: bold, weight: 700, style: "normal" },
    ],
    (error: unknown) => {
      loaded = undefined;
      throw error;
    },
  );
  return loaded;
}
