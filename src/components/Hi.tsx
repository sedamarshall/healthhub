// Hugeicons (stroke rounded), the icon set the reference storefront uses, drawn as CSS masks
// (defined once in globals.css) so each product card carries an empty <span> instead of SVG markup.
type P = { size?: number; className?: string };

const icon = (name: string, def: number) =>
  function Icon({ size = def, className = "" }: P) {
    return <span aria-hidden="true" className={`hi hi-${name} ${className}`} style={{ width: size, height: size }} />;
  };

export const CartHi = icon("cart", 20);
export const HeartHi = icon("heart", 20);
export const ViewHi = icon("view", 24);
