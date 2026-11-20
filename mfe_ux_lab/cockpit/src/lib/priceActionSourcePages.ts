/** Verified Arabic printed-page offset for the attested 438-page source copy.
 * Stored anchors remain printed pages for detector and snapshot compatibility. */
export const PRICE_ACTION_PRINTED_PDF_OFFSET = 10;

export function formatPriceActionSourcePages(pages: readonly number[] | undefined): string {
  if (!pages?.length || pages.some(page => !Number.isInteger(page) || page < 1 || page > 421)) return "Source page anchors unavailable";
  const canonical = [...new Set(pages)].sort((a, b) => a - b);
  const label = (values: number[]) => {
    const groups: string[] = [];
    for (let start = 0; start < values.length;) {
      let end = start;
      while (end + 1 < values.length && values[end + 1] === values[end] + 1) end++;
      groups.push(start === end ? String(values[start]) : `${values[start]}-${values[end]}`);
      start = end + 1;
    }
    return `${values.length === 1 ? "p." : "pp."} ${groups.join(", ")}`;
  };
  return `Printed ${label(canonical)} · PDF ${label(canonical.map(page => page + PRICE_ACTION_PRINTED_PDF_OFFSET))}`;
}
