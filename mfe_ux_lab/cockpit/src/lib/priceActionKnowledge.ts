export type KnowledgeConcept = {
  id: string;
  name: string;
  definition: string;
  cues: string[];
  abstain: string[];
  pages: number[];
  implementation: "GEOMETRY_PROXY" | "SOURCE_NOTES";
};

export type KnowledgeRelationship = {
  from: string;
  to: string;
  kind: string;
  label: string;
  pages: number[];
};

export type SetupFamily = { id: string; concept_ids: string[]; steps: string[] };
export type KnowledgeChapter = { number: number; title: string; printed_range: number[]; pdf_range: number[]; reviewed_printed_pages: number[]; concept_ids: string[]; summary: string };
export type SourceLens = {
  id: string;
  name: string;
  definition: string;
  cues: string[];
  abstain: string[];
  pages: number[];
  concept_ids: string[];
  implementation: "SOURCE_NOTES";
};

/**
 * A source-grounded review case whose market tape/label is intentionally not
 * available. These records make held-out source examples discoverable without
 * pretending that a PDF figure is an OHLC fixture or an outcome dataset.
 */
export type HeldOutSourceFixture = {
  id: string;
  lens_id: string;
  pages: number[];
  status: "SOURCE_REVIEW_ONLY";
  data_status: "UNAVAILABLE";
  outcome_status: "WITHHELD";
};

export type KnowledgeMap = {
  schema: string;
  title: string;
  authority?: string;
  caveat?: string;
  source: { author: string; title: string; year: number; sha256: string; pages?: number[]; pdf_pages?: number; ocr_text_pages?: number };
  concepts: KnowledgeConcept[];
  /** Source-grounded lenses that are intentionally not detector concepts. */
  source_lenses?: SourceLens[];
  /** Source review cases held out from detector/outcome claims. */
  held_out_source_fixtures?: HeldOutSourceFixture[];
  relationships: KnowledgeRelationship[];
  setup_families: SetupFamily[];
  book_index: KnowledgeChapter[];
  coverage: { status: string; page_convention: string; limitations: string[]; toc_pdf_pages: number[] };
  case_study_months: { month: string; year: number; printed_range: number[]; pdf_range: number[] }[];
  glossary: { term: string; meaning: string; pages: number[] }[];
};

/** Relationship vocabulary used by the source map's directed graph. */
export const PRICE_ACTION_RELATIONSHIP_KINDS = ["supports", "frames", "qualifies", "leads_to", "anchors", "magnets"] as const;

type ValidationCandidate = {
  schema?: unknown;
  authority?: unknown;
  source?: Partial<KnowledgeMap["source"]>;
  concepts?: unknown;
  source_lenses?: unknown;
  held_out_source_fixtures?: unknown;
  relationships?: unknown;
  setup_families?: unknown;
  book_index?: unknown;
  coverage?: unknown;
  case_study_months?: unknown;
  glossary?: unknown;
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validPages(value: unknown, max: number): value is number[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  // Keep anchors canonical as well as in range.  Duplicate or descending
  // pages are easy to introduce while hand-curating the map and make source
  // provenance harder to audit (and can render misleading page labels).
  return value.every((page, index) => Number.isInteger(page) && page >= 1 && page <= max && (index === 0 || page > value[index - 1])) as boolean;
}

/**
 * Validate the source-attested graph before it is used for navigation or
 * chart annotations. Returning errors keeps this helper usable by import
 * checks and tests without coupling it to React rendering.
 */
export function validatePriceActionKnowledgeMap(candidate: unknown): { ok: boolean; errors: string[] } {
  const map = (candidate && typeof candidate === "object" ? candidate : {}) as ValidationCandidate;
  const errors: string[] = [];
  if (typeof map.schema !== "string" || !/^quantsmart\.price-action-knowledge-map\/\d+$/.test(map.schema)) errors.push("invalid schema");
  if (!nonEmptyString((map as { title?: unknown }).title)) errors.push("map title is required");
  if (map.authority !== "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false") errors.push("authority boundary must remain SHADOW_ONLY");
  const source = map.source;
  const maxPage = source?.pdf_pages;
  if (!source || !nonEmptyString(source.author) || !nonEmptyString(source.title)) errors.push("source author and title are required");
  if (!Number.isInteger(source?.year) || (source?.year ?? 0) < 1900) errors.push("source year is invalid");
  if (!Number.isInteger(maxPage) || (maxPage ?? 0) < 1) errors.push("source pdf_pages is invalid");
  if (typeof source?.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(source.sha256)) errors.push("source sha256 is invalid");
  const pageLimit = Number.isInteger(maxPage) && (maxPage as number) > 0 ? maxPage as number : Number.MAX_SAFE_INTEGER;
  if (source?.pages !== undefined && !validPages(source.pages, pageLimit)) errors.push("source page anchors are invalid");
  if (source?.ocr_text_pages !== undefined && (!Number.isInteger(source.ocr_text_pages) || source.ocr_text_pages < 0 || source.ocr_text_pages > pageLimit)) errors.push("source ocr_text_pages is invalid");

  const concepts = Array.isArray(map.concepts) ? map.concepts : [];
  if (!concepts.length) errors.push("at least one concept is required");
  const conceptIds = new Set<string>();
  concepts.forEach((raw, index) => {
    const concept = raw as Partial<KnowledgeConcept>;
    if (!nonEmptyString(concept.id)) errors.push(`concept ${index} has no id`);
    else if (conceptIds.has(concept.id)) errors.push(`duplicate concept id: ${concept.id}`);
    else conceptIds.add(concept.id);
    if (!nonEmptyString(concept.name) || !nonEmptyString(concept.definition)) errors.push(`concept ${index} needs a name and definition`);
    if (!Array.isArray(concept.cues) || !concept.cues.length || !concept.cues.every(nonEmptyString)) errors.push(`concept ${index} needs source cues`);
    if (!Array.isArray(concept.abstain) || !concept.abstain.length || !concept.abstain.every(nonEmptyString)) errors.push(`concept ${index} needs abstain cues`);
    if (!validPages(concept.pages, pageLimit)) errors.push(`concept ${concept.id || index} has invalid page anchors`);
    if (concept.implementation !== "GEOMETRY_PROXY" && concept.implementation !== "SOURCE_NOTES") errors.push(`concept ${concept.id || index} needs an explicit implementation scope`);
  });

  // A source lens records a missing or deliberately unimplemented part of the
  // book method (for example wider trend/range selection) without making it a
  // detector concept or inventing numerical thresholds. Keep this additive so
  // older schema/1 maps remain importable while validating new lenses fully.
  if (map.source_lenses !== undefined) {
    const lenses = Array.isArray(map.source_lenses) ? map.source_lenses : [];
    if (!Array.isArray(map.source_lenses) || !lenses.length) errors.push("source lenses must be a non-empty array when present");
    const lensIds = new Set<string>();
    lenses.forEach((raw, index) => {
      const lens = raw as Partial<SourceLens>;
      if (!nonEmptyString(lens.id) || lensIds.has(lens.id)) errors.push(`source lens ${index} has an invalid or duplicate id`);
      else lensIds.add(lens.id);
      if (!nonEmptyString(lens.name) || !nonEmptyString(lens.definition)) errors.push(`source lens ${index} needs a name and definition`);
      if (!Array.isArray(lens.cues) || !lens.cues.length || !lens.cues.every(nonEmptyString)) errors.push(`source lens ${index} needs source cues`);
      if (!Array.isArray(lens.abstain) || !lens.abstain.length || !lens.abstain.every(nonEmptyString)) errors.push(`source lens ${index} needs abstain cues`);
      if (!validPages(lens.pages, pageLimit)) errors.push(`source lens ${lens.id || index} has invalid page anchors`);
      if (lens.implementation !== "SOURCE_NOTES") errors.push(`source lens ${lens.id || index} must remain SOURCE_NOTES`);
      if (!Array.isArray(lens.concept_ids) || !lens.concept_ids.length || new Set(lens.concept_ids).size !== lens.concept_ids.length || lens.concept_ids.some((id) => !nonEmptyString(id) || !conceptIds.has(id))) errors.push(`source lens ${lens.id || index} needs indexed concept ids`);
      if (validPages(lens.pages, pageLimit) && Array.isArray(lens.concept_ids) && lens.concept_ids.every((id) => nonEmptyString(id) && conceptIds.has(id))) {
        const linkedPages = new Set(concepts.filter((concept) => lens.concept_ids?.includes(concept.id)).flatMap((concept) => concept.pages));
        if (!lens.pages.some((page) => linkedPages.has(page))) errors.push(`source lens ${lens.id || index} has no linked concept-page overlap`);
        if (lens.pages.some((page) => !linkedPages.has(page))) errors.push(`source lens ${lens.id || index} cites a page outside linked concept anchors`);
      }
    });
  }

  // Held-out source cases are provenance fixtures only. They must point to an
  // indexed SOURCE_NOTES lens and explicitly withhold market data and outcome
  // labels; otherwise a later test could accidentally treat a PDF example as
  // an independent OHLC fixture.
  if (map.held_out_source_fixtures !== undefined) {
    const fixtures = Array.isArray(map.held_out_source_fixtures) ? map.held_out_source_fixtures : [];
    if (!Array.isArray(map.held_out_source_fixtures) || !fixtures.length) errors.push("held-out source fixtures must be a non-empty array when present");
    const fixtureIds = new Set<string>();
    const lenses = Array.isArray(map.source_lenses) ? map.source_lenses as SourceLens[] : [];
    fixtures.forEach((raw, index) => {
      if (!raw || typeof raw !== "object") { errors.push(`held-out source fixture ${index} is invalid`); return; }
      const fixture = raw as Partial<HeldOutSourceFixture>;
      if (!nonEmptyString(fixture.id) || fixtureIds.has(fixture.id)) errors.push(`held-out source fixture ${index} has an invalid or duplicate id`);
      else fixtureIds.add(fixture.id);
      const lens = lenses.find(candidate => candidate.id === fixture.lens_id);
      if (!lens || lens.implementation !== "SOURCE_NOTES") errors.push(`held-out source fixture ${fixture.id || index} needs a SOURCE_NOTES lens`);
      if (!validPages(fixture.pages, pageLimit)) errors.push(`held-out source fixture ${fixture.id || index} has invalid page anchors`);
      if (fixture.status !== "SOURCE_REVIEW_ONLY") errors.push(`held-out source fixture ${fixture.id || index} must remain SOURCE_REVIEW_ONLY`);
      if (fixture.data_status !== "UNAVAILABLE") errors.push(`held-out source fixture ${fixture.id || index} must withhold market data`);
      if (fixture.outcome_status !== "WITHHELD") errors.push(`held-out source fixture ${fixture.id || index} must withhold outcomes`);
      const allowedKeys = ["id", "lens_id", "pages", "status", "data_status", "outcome_status"];
      if (Object.keys(fixture).some(key => !allowedKeys.includes(key))) errors.push(`held-out source fixture ${fixture.id || index} may only retain review metadata`);
      if (lens && validPages(fixture.pages, pageLimit) && fixture.pages.some(page => !lens.pages.includes(page))) errors.push(`held-out source fixture ${fixture.id || index} cites a page outside its source lens`);
      const chapters = Array.isArray(map.book_index) ? map.book_index as KnowledgeChapter[] : [];
      if (validPages(fixture.pages, pageLimit) && fixture.pages.some(page => !chapters.some(chapter => Array.isArray(chapter?.reviewed_printed_pages) && chapter.reviewed_printed_pages.includes(page)))) errors.push(`held-out source fixture ${fixture.id || index} needs curated source pages`);
    });
  }

  const relationships = Array.isArray(map.relationships) ? map.relationships : [];
  relationships.forEach((raw, index) => {
    const relationship = raw as Partial<KnowledgeRelationship>;
    if (!nonEmptyString(relationship.from) || !conceptIds.has(relationship.from)) errors.push(`relationship ${index} has an unknown from concept`);
    if (!nonEmptyString(relationship.to) || !conceptIds.has(relationship.to)) errors.push(`relationship ${index} has an unknown to concept`);
    if (relationship.from === relationship.to) errors.push(`relationship ${index} cannot connect a concept to itself`);
    if (!(PRICE_ACTION_RELATIONSHIP_KINDS as readonly string[]).includes(String(relationship.kind))) errors.push(`relationship ${index} has an unknown kind`);
    if (!nonEmptyString(relationship.label)) errors.push(`relationship ${index} needs a directional label`);
    if (!validPages(relationship.pages, pageLimit)) errors.push(`relationship ${index} has invalid page anchors`);
    // A valid PDF page number is not enough: an edge must cite a page attached
    // to at least one endpoint so its direction remains source-grounded.
    const fromPages = concepts.find((concept) => concept.id === relationship.from)?.pages || [];
    const toPages = concepts.find((concept) => concept.id === relationship.to)?.pages || [];
    const endpointPages = new Set([...fromPages, ...toPages]);
    if (validPages(relationship.pages, pageLimit) && !relationship.pages.some((page) => endpointPages.has(page))) errors.push(`relationship ${index} has no endpoint source-page overlap`);
    // Every cited edge page must belong to at least one endpoint.  An overlap
    // alone still permits unrelated pages to be smuggled into a relationship
    // citation, weakening the source-grounded direction of the graph.
    if (validPages(relationship.pages, pageLimit) && relationship.pages.some((page) => !endpointPages.has(page))) errors.push(`relationship ${index} cites a page outside endpoint source anchors`);
  });

  const families = Array.isArray(map.setup_families) ? map.setup_families : [];
  const familyIds = new Set<string>();
  families.forEach((raw, index) => {
    const family = raw as Partial<SetupFamily>;
    if (!nonEmptyString(family.id) || familyIds.has(family.id)) errors.push(`setup family ${index} has an invalid or duplicate id`);
    else familyIds.add(family.id);
    if (!Array.isArray(family.concept_ids) || !family.concept_ids.length || !family.concept_ids.every((id) => nonEmptyString(id) && conceptIds.has(id))) errors.push(`setup family ${family.id || index} needs indexed concept ids`);
    else if (new Set(family.concept_ids).size !== family.concept_ids.length) errors.push(`setup family ${family.id || index} has duplicate concept ids`);
    if (!Array.isArray(family.steps) || !family.steps.length || !family.steps.every(nonEmptyString)) errors.push(`setup family ${index} needs ordered steps`);
  });
  const chapters = Array.isArray(map.book_index) ? map.book_index : [];
  const range = (value: unknown): value is number[] => Array.isArray(value) && value.length === 2 && value.every(Number.isInteger) && value[0] >= 1 && value[1] >= value[0];
  if (chapters.length !== 12) errors.push("book index must include all 12 source chapters");
  chapters.forEach((chapter, index) => {
    if (!chapter || typeof chapter !== "object") { errors.push(`chapter ${index + 1} is invalid`); return; }
    if (chapter.number !== index + 1 || !nonEmptyString(chapter.title) || !nonEmptyString(chapter.summary)) errors.push(`chapter ${index + 1} needs ordered identity and notes`);
    if (!range(chapter.printed_range) || !range(chapter.pdf_range) || chapter.pdf_range[1] > pageLimit
      || chapter.pdf_range[0] !== chapter.printed_range[0] + 10 || chapter.pdf_range[1] !== chapter.printed_range[1] + 10) errors.push(`chapter ${index + 1} has invalid printed/PDF ranges`);
    if (index > 0 && range(chapter.printed_range) && range(chapters[index - 1]?.printed_range) && chapter.printed_range[0] !== chapters[index - 1].printed_range[1] + 1) errors.push(`chapter ${index + 1} leaves a gap or overlap in the book index`);
    if (range(chapter.printed_range) && ((index === 0 && chapter.printed_range[0] !== 3) || (index === 11 && chapter.printed_range[1] !== 421))) errors.push("book index must span printed pages 3-421");
    if (!validPages(chapter.reviewed_printed_pages, pageLimit) || !range(chapter.printed_range) || chapter.reviewed_printed_pages.some((page: number) => page < chapter.printed_range[0] || page > chapter.printed_range[1])) errors.push(`chapter ${index + 1} has invalid reviewed-page coverage`);
    if (!Array.isArray(chapter.concept_ids) || !chapter.concept_ids.length || new Set(chapter.concept_ids).size !== chapter.concept_ids.length || chapter.concept_ids.some((id: string) => !conceptIds.has(id))) errors.push(`chapter ${index + 1} has invalid concept links`);
  });
  const coverage = map.coverage as KnowledgeMap["coverage"] | undefined;
  if (!coverage || coverage.status !== "PARTIAL_CURATED_NOTES" || !nonEmptyString(coverage.page_convention) || !Array.isArray(coverage.limitations) || !coverage.limitations.length || !coverage.limitations.every(nonEmptyString) || !validPages(coverage.toc_pdf_pages, pageLimit)) errors.push("book coverage must distinguish partial notes from a full source implementation");
  const months = Array.isArray(map.case_study_months) ? map.case_study_months : [];
  if (months.length !== 6) errors.push("consecutive case studies need six month ranges");
  months.forEach((month, index) => {
    if (!month || typeof month !== "object") { errors.push(`case study month ${index + 1} is invalid`); return; }
    if (month.month !== ["March", "April", "May", "June", "July", "August"][index] || month.year !== 2012 || !range(month.printed_range) || !range(month.pdf_range)
      || month.printed_range[0] < 250 || month.printed_range[1] > 382 || month.pdf_range[0] !== month.printed_range[0] + 10 || month.pdf_range[1] !== month.printed_range[1] + 10
      || (index === 0 && month.printed_range[0] !== 250) || (index === 5 && month.printed_range[1] !== 382)
      || (index > 0 && range(months[index - 1]?.printed_range) && month.printed_range[0] !== months[index - 1].printed_range[1] + 1)) errors.push(`case study month ${index + 1} has invalid source ranges`);
  });
  const glossary = Array.isArray(map.glossary) ? map.glossary : [];
  if (!glossary.length || glossary.some(entry => !entry || !nonEmptyString(entry.term) || !nonEmptyString(entry.meaning) || !validPages(entry.pages, pageLimit))) errors.push("book glossary needs anchored source terms");
  return { ok: errors.length === 0, errors };
}
