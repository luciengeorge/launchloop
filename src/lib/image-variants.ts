export const IMAGE_VARIANTS = {
  og: { width: 1200, height: 630, file: "og-1200x630.png", label: "Open Graph link preview (1200×630)" },
  x: { width: 1600, height: 900, file: "x-1600x900.png", label: "X / LinkedIn post image (1600×900)" },
  ph: { width: 1270, height: 760, file: "product-hunt-gallery-1270x760.png", label: "Product Hunt gallery (1270×760)" },
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;
export const isImageVariant = (v: string): v is ImageVariant => v in IMAGE_VARIANTS;
