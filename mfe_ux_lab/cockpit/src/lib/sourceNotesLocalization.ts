import type { KnowledgeConcept } from "./priceActionKnowledge.ts";

export type SourceNotesLocale = "en" | "vi";
export type SourceNotesCopy = Pick<KnowledgeConcept, "name" | "definition" | "cues" | "abstain">;

const vi = (value: string) => decodeURIComponent(value);

// Vietnamese presentation copy stays separate from the attested English map.
// The source wording remains intact so no PDF meaning is silently replaced.
const VI_NAMES: Record<string, string> = {
  double_pressure: vi("%C3%81p%20l%E1%BB%B1c%20k%C3%A9p"),
  dominant_pressure: vi("%C3%81p%20l%E1%BB%B1c%20chi%20ph%E1%BB%91i"),
  support_resistance: vi("H%E1%BB%97%20tr%E1%BB%A3%20v%C3%A0%20kh%C3%A1ng%20c%E1%BB%B1"),
  buildup: vi("T%C3%ADch%20l%C5%A9y%20tr%C6%B0%E1%BB%9Bc%20ph%C3%A1%20v%E1%BB%A1"),
  false_break: vi("Ph%C3%A1%20v%E1%BB%A1%20gi%E1%BA%A3"),
  tease_break: vi("Ph%C3%A1%20v%E1%BB%A1%20th%C4%83m%20d%C3%B2"),
  false_high_low: vi("%C4%90%E1%BB%89nh%20%2F%20%C4%91%C3%A1y%20gi%E1%BA%A3"),
  pullback_reversal: vi("%C4%90%E1%BA%A3o%20chi%E1%BB%81u%20sau%20h%E1%BB%93i%20gi%C3%A1"),
  ceiling_test: vi("Ki%E1%BB%83m%20tra%20tr%E1%BA%A7n%20%2F%20nam%20ch%C3%A2m"),
  round_number: vi("Hi%E1%BB%87u%20%E1%BB%A9ng%20s%E1%BB%91%20tr%C3%B2n"),
  pattern_break_combi: vi("T%E1%BB%95%20h%E1%BB%A3p%20ph%C3%A1%20m%E1%BA%ABu%20h%C3%ACnh"),
  pattern_break: vi("Ph%C3%A1%20m%E1%BA%ABu%20h%C3%ACnh"),
  pattern_break_pullback: vi("H%E1%BB%93i%20quy%20sau%20ph%C3%A1%20m%E1%BA%ABu%20h%C3%ACnh"),
  signal_entry_bar: vi("N%E1%BA%BFn%20t%C3%ADn%20hi%E1%BB%87u%20v%C3%A0%20n%E1%BA%BFn%20v%C3%A0o%20l%E1%BB%87nh"),
  bracket_costs: vi("L%E1%BB%87nh%20bracket%2C%20m%E1%BB%A5c%20ti%C3%AAu%2C%20d%E1%BB%ABng%20l%E1%BB%97%20v%C3%A0%20chi%20ph%C3%AD"),
  news_exit: vi("Tho%C3%A1t%20l%E1%BB%87nh%20tr%C6%B0%E1%BB%9Bc%20tin"),
  resistance_exit: vi("Tho%C3%A1t%20t%E1%BA%A1i%20kh%C3%A1ng%20c%E1%BB%B1%20v%C3%A0%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20%C4%91%E1%BA%BFn%20m%E1%BB%A5c%20ti%C3%AAu"),
  reversal_exit: vi("Tho%C3%A1t%20khi%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u%20v%C3%A0%20h%C3%ACnh%20th%C3%A0nh%20%C3%A1p%20l%E1%BB%B1c%20ng%C6%B0%E1%BB%A3c%20chi%E1%BB%81u"),
  trade_selection_failure: vi("L%E1%BB%B1a%20ch%E1%BB%8Dn%20giao%20d%E1%BB%8Bch%20v%C3%A0%20giao%20d%E1%BB%8Bch%20ph%C3%A1%20v%E1%BB%A1%20th%E1%BA%A5t%20b%E1%BA%A1i"),
  consecutive_review: vi("R%C3%A0%20so%C3%A1t%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20li%C3%AAn%20ti%E1%BA%BFp"),
  position_sizing: vi("Kh%E1%BB%91i%20l%C6%B0%E1%BB%A3ng%20giao%20d%E1%BB%8Bch%20v%C3%A0%20l%C3%A3i%20k%C3%A9p"),
  low_volatility: vi("Th%C3%ADch%20%E1%BB%A9ng%20v%E1%BB%9Bi%20bi%E1%BA%BFn%20%C4%91%E1%BB%99ng%20th%E1%BA%A5p"),
  obstacle_room: vi("V%E1%BA%ADt%20c%E1%BA%A3n%20v%C3%A0%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20ph%C3%ADa%20tr%C6%B0%E1%BB%9Bc"),
};

const VI_READINGS: Record<string, { definition: string; cues: string[]; abstain: string[] }> = {
  signal_entry_bar: {
    definition: vi("Thanh%20n%E1%BA%BFn%20t%C3%ADch%20l%C5%A9y%20cu%E1%BB%91i%20c%C3%B9ng%20x%C3%A1c%20%C4%91%E1%BB%8Bnh%20m%E1%BB%99t%20%C4%91i%E1%BB%83m%20k%C3%ADch%20ho%E1%BA%A1t%20ti%E1%BB%81m%20n%C4%83ng%3B%20thanh%20n%E1%BA%BFn%20v%E1%BB%81%20sau%20ph%C3%A1%20v%E1%BB%A1%20n%C3%B3%20l%C3%A0%20n%E1%BA%BFn%20v%C3%A0o%20l%E1%BB%87nh.%20Ph%C3%A9p%20%C4%91o%20theo%20gi%C3%A1%20%C4%91%C3%B3ng%20c%E1%BB%ADa%20c%E1%BB%A7a%20thi%E1%BA%BFt%20l%E1%BA%ADp%20thu%E1%BB%99c%20m%E1%BB%99t%20ch%C3%ADnh%20s%C3%A1ch%20nghi%C3%AAn%20c%E1%BB%A9u%20kh%C3%A1c."),
    cues: [
      vi("Ranh%20gi%E1%BB%9Bi%20%C4%91ang%20ch%E1%BB%8Bu%20%C3%A1p%20l%E1%BB%B1c%20v%E1%BB%9Bi%20chu%E1%BB%97i%20t%C3%ADch%20l%C5%A9y%20g%E1%BB%93m%20c%C3%A1c%20n%E1%BA%BFn%20lu%C3%A2n%20phi%C3%AAn"),
      vi("N%E1%BA%BFn%20t%C3%ADn%20hi%E1%BB%87u%20t%C4%83ng%20g%E1%BA%A7n%20ranh%20gi%E1%BB%9Bi%20tr%C3%AAn%20ho%E1%BA%B7c%20n%E1%BA%BFn%20gi%E1%BA%A3m%20g%E1%BA%A7n%20ranh%20gi%E1%BB%9Bi%20d%C6%B0%E1%BB%9Bi"),
      vi("Ph%C3%A1%20v%E1%BB%A1%20x%E1%BA%A3y%20ra%20sau%20%C4%91%C3%B3%2C%20sau%20khi%20%C4%91%C3%A3%20ki%E1%BB%83m%20tra%20%C3%A1p%20l%E1%BB%B1c%2C%20m%E1%BB%A9c%20b%E1%BA%A3o%20v%E1%BB%87%20v%C3%A0%20v%E1%BA%ADt%20c%E1%BA%A3n")
    ],
    abstain: [
      vi("V%C3%A0o%20tr%C6%B0%E1%BB%9Bc%20khi%20n%E1%BA%BFn%20t%C3%ADn%20hi%E1%BB%87u%20b%E1%BB%8B%20ph%C3%A1%20v%E1%BB%A1"),
      vi("Nh%E1%BA%A7m%20m%E1%BB%99t%20gi%C3%A1%20%C4%91%C3%B3ng%20c%E1%BB%ADa%20tr%C3%AAn%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20ho%E1%BA%B7c%20m%E1%BB%99t%20h%C3%ACnh%20d%E1%BA%A1ng%20%C4%91%C6%A1n%20l%E1%BA%BB%20v%E1%BB%9Bi%20%C4%91i%E1%BB%83m%20v%C3%A0o%20l%E1%BB%87nh%20theo%20ngu%E1%BB%93n")
    ],
  },
  bracket_costs: {
    definition: vi("T%C3%A0i%20li%E1%BB%87u%20minh%20h%E1%BB%8Da%20vi%E1%BB%87c%20v%C3%A0o%20to%C3%A0n%20b%E1%BB%99%20v%E1%BB%8B%20th%E1%BA%BF%20v%C3%A0%20m%E1%BB%99t%20khung%20OCO%20m%E1%BB%A5c%20ti%C3%AAu%2Fd%E1%BB%ABng%20l%E1%BB%97%20tr%C3%AAn%20EURUSD%20M5.%20V%C3%AD%20d%E1%BB%A5%2020%2F10%20pip%20mang%20t%C3%ADnh%20b%E1%BB%91i%20c%E1%BA%A3nh%20v%C3%A0%20ph%E1%BA%A3i%20%C4%91%C3%A1nh%20gi%C3%A1%20l%E1%BA%A1i%20theo%20bi%C3%AAn%20%C4%91%E1%BB%99%2C%20chi%20ph%C3%AD%20v%C3%A0%20th%E1%BB%B1c%20thi."),
    cues: [
      vi("%C4%90i%E1%BB%83m%20v%C3%A0o%2C%20d%E1%BB%ABng%20l%E1%BB%97%20b%E1%BA%A3o%20v%E1%BB%87%20v%C3%A0%20m%E1%BB%A5c%20ti%C3%AAu%20%C4%91%C6%B0%E1%BB%A3c%20x%C3%A1c%20%C4%91%E1%BB%8Bnh%20tr%C6%B0%E1%BB%9Bc%20khi%20bi%E1%BA%BFt%20k%E1%BA%BFt%20qu%E1%BA%A3"),
      vi("Ghi%20nh%E1%BA%ADn%20tr%C6%B0%E1%BB%A3t%20gi%C3%A1%20c%E1%BB%A7a%20d%E1%BB%ABng%20l%E1%BB%97%20th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng%20c%C3%B9ng%20spread%20v%C3%A0%20hoa%20h%E1%BB%93ng"),
      vi("%C4%90%C3%A1nh%20gi%C3%A1%20l%E1%BA%A1i%20kho%E1%BA%A3ng%20c%C3%A1ch%20khi%20bi%E1%BA%BFn%20%C4%91%E1%BB%99ng%20thay%20%C4%91%E1%BB%95i")
    ],
    abstain: [
      vi("Sao%20ch%C3%A9p%20kho%E1%BA%A3ng%20c%C3%A1ch%20pip%20c%E1%BB%A7a%20EURUSD%20sang%20XAUUSD"),
      vi("Coi%20vi%E1%BB%87c%20OHLC%20ch%E1%BA%A1m%20m%E1%BB%A9c%20l%C3%A0%20kh%E1%BB%9Bp%20l%E1%BB%87nh%20ch%E1%BA%AFc%20ch%E1%BA%AFn"),
      vi("Coi%20nghi%C3%AAn%20c%E1%BB%A9u%20ATR%202.2%2F1%20c%E1%BB%A7a%20%E1%BB%A9ng%20d%E1%BB%A5ng%20l%C3%A0%20khung%20l%E1%BB%87nh%20c%E1%BB%A7a%20t%C3%A0i%20li%E1%BB%87u")
    ],
  },
  news_exit: {
    definition: vi("Nh%E1%BB%AFng%20c%C3%B4ng%20b%E1%BB%91%20quan%20tr%E1%BB%8Dng%20s%E1%BA%AFp%20t%E1%BB%9Bi%20c%C3%B3%20th%E1%BB%83%20l%C3%A0m%20gi%C3%A1n%20%C4%91o%E1%BA%A1n%20%C3%A1p%20l%E1%BB%B1c%20quan%20s%C3%A1t%20%C4%91%C6%B0%E1%BB%A3c%20tr%C6%B0%E1%BB%9Bc%20%C4%91%C3%B3.%20Ngu%E1%BB%93n%20th%E1%BA%A3o%20lu%E1%BA%ADn%20vi%E1%BB%87c%20gi%E1%BA%A3m%20m%E1%BB%A9c%20ph%C6%A1i%20nhi%E1%BB%85m%20ho%E1%BA%B7c%20r%E1%BB%9Di%20giao%20d%E1%BB%8Bch%20tr%C6%B0%E1%BB%9Bc%20khi%20c%C3%B4ng%20b%E1%BB%91%2C%20v%E1%BB%9Bi%20th%E1%BB%9Di%20%C4%91i%E1%BB%83m%20ph%E1%BB%A5%20thu%E1%BB%99c%20s%E1%BB%B1%20ki%E1%BB%87n%20v%C3%A0%20b%E1%BB%91i%20c%E1%BA%A3nh."),
    cues: [
      vi("L%E1%BB%8Bch%20s%E1%BB%B1%20ki%E1%BB%87n%20c%C3%B3%20ng%C3%A0y%20v%C3%A0%20m%E1%BB%A9c%20li%C3%AAn%20quan%20%C4%91%E1%BA%BFn%20c%C3%B4ng%20c%E1%BB%A5%20giao%20d%E1%BB%8Bch"),
      vi("H%C3%A0nh%20%C4%91%E1%BB%99ng%20y%C3%AAn%20%E1%BA%AFng%20tr%C6%B0%E1%BB%9Bc%20c%C3%B4ng%20b%E1%BB%91%20v%E1%BA%ABn%20c%C3%B3%20th%E1%BB%83%20%C4%91i%20tr%C6%B0%E1%BB%9Bc%20m%E1%BB%99t%20ph%E1%BA%A3n%20%E1%BB%A9ng%20l%E1%BB%9Bn"),
      vi("Ghi%20l%E1%BA%A1i%20quy%E1%BA%BFt%20%C4%91%E1%BB%8Bnh%20tho%C3%A1t%20tr%C6%B0%E1%BB%9Bc%20khi%20quan%20s%C3%A1t%20k%E1%BA%BFt%20qu%E1%BA%A3%20c%E1%BB%A7a%20tin")
    ],
    abstain: [
      vi("Suy%20ra%20m%E1%BB%99t%20c%C3%B4ng%20b%E1%BB%91%20%C4%91%C3%A3%20l%C3%AAn%20l%E1%BB%8Bch%20ch%E1%BB%89%20t%E1%BB%AB%20c%C3%A1c%20n%E1%BA%BFn"),
      vi("%C3%81p%20d%E1%BB%A5ng%20m%E1%BB%99t%20b%E1%BB%99%20%C4%91%E1%BA%BFm%20ng%C6%B0%E1%BB%A3c%20ho%E1%BA%B7c%20kho%E1%BA%A3ng%20%C4%91%E1%BB%87m%20an%20to%C3%A0n%20chung%20do%20t%E1%BB%B1%20%C4%91%E1%BA%B7t%20ra")
    ],
  },
  resistance_exit: {
    definition: vi("X%C3%A1c%20%C4%91%E1%BB%8Bnh%20v%E1%BA%ADt%20c%E1%BA%A3n%20v%C3%A0%20m%E1%BB%A5c%20ti%C3%AAu%20c%C3%B3%20th%E1%BB%83%20%C4%91%C6%B0%E1%BB%A3c%20r%C3%BAt%20ng%E1%BA%AFn%20tr%C6%B0%E1%BB%9Bc%20khi%20v%C3%A0o%20l%E1%BB%87nh%2C%20sau%20%C4%91%C3%B3%20%C4%91%C3%A1nh%20gi%C3%A1%20li%E1%BB%87u%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20c%C3%B2n%20l%E1%BA%A1i%20c%C3%B3%20bi%E1%BB%87n%20minh%20cho%20giao%20d%E1%BB%8Bch.%20So%20s%C3%A1nh%20can%20thi%E1%BB%87p%20v%E1%BB%9Bi%20vi%E1%BB%87c%20gi%E1%BB%AF%20nguy%C3%AAn%20khung%20l%E1%BB%87nh%20ban%20%C4%91%E1%BA%A7u."),
    cues: [
      vi("Ranh%20gi%E1%BB%9Bi%20bi%C3%AAn%20%C4%91%E1%BB%99%2C%20s%E1%BB%91%20tr%C3%B2n%2C%20c%E1%BB%B1c%20tr%E1%BB%8B%20tr%C6%B0%E1%BB%9Bc%20%C4%91%C3%B3%20ho%E1%BA%B7c%20v%C3%B9ng%20ki%E1%BB%83m%20tra%20k%E1%BB%B9%20thu%E1%BA%ADt%20%E1%BB%9F%20ph%C3%ADa%20tr%C6%B0%E1%BB%9Bc"),
      vi("Ph%C3%A2n%20bi%E1%BB%87t%20%C4%91i%E1%BB%81u%20ki%E1%BB%87n%20c%C3%B3%20xu%20h%C6%B0%E1%BB%9Bng%20v%E1%BB%9Bi%20%C4%91i%E1%BB%81u%20ki%E1%BB%87n%20%C4%91i%20ngang"),
      vi("V%C3%AD%20d%E1%BB%A5%20ngu%E1%BB%93n%20n%C3%B3i%20v%E1%BB%81%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%2014%20pip%20v%E1%BB%9Bi%20khung%2020%2F10%2C%20kh%C3%B4ng%20ph%E1%BA%A3i%20ng%C6%B0%E1%BB%A1ng%20chung%20cho%20m%E1%BB%8Di%20c%C3%B4ng%20c%E1%BB%A5")
    ],
    abstain: [
      vi("H%E1%BA%A1%20m%E1%BB%A5c%20ti%C3%AAu%20sau%20khi%20v%C3%A0o%20l%E1%BB%87nh%20ch%E1%BB%89%20v%C3%AC%20s%E1%BB%A3%20h%C3%A3i"),
      vi("Kho%E1%BA%A3ng%20tr%E1%BB%91ng%20sau%20chi%20ph%C3%AD%20kh%C3%B4ng%20%C4%91%E1%BB%A7"),
      vi("Kh%E1%BA%B3ng%20%C4%91%E1%BB%8Bnh%20m%E1%BB%8Di%20kh%C3%A1ng%20c%E1%BB%B1%20%C4%91%C6%B0%E1%BB%A3c%20ch%E1%BA%A1m%20%C4%91%E1%BB%81u%20ph%E1%BA%A3i%20t%E1%BB%AB%20ch%E1%BB%91i%20gi%C3%A1")
    ],
  },
  reversal_exit: {
    definition: vi("M%E1%BB%99t%20giao%20d%E1%BB%8Bch%20%C4%91%C3%A3%20m%E1%BB%9F%20c%C3%B3%20th%E1%BB%83%20g%E1%BA%B7p%20c%E1%BB%A5m%20ki%E1%BB%83u%20M%2FW%20b%E1%BA%A5t%20l%E1%BB%A3i.%20M%E1%BB%99t%20ph%C3%A1%20v%E1%BB%A1%20%C4%91%C6%B0%E1%BB%A3c%20h%E1%BB%97%20tr%E1%BB%A3%20b%E1%BB%9Fi%20%C3%A1p%20l%E1%BB%B1c%20powerbar%20b%E1%BA%A5t%20l%E1%BB%A3i%20c%C3%B3%20th%E1%BB%83%20bi%E1%BB%87n%20minh%20cho%20l%E1%BB%91i%20tho%C3%A1t%20theo%20ki%E1%BB%83u%20ngu%E1%BB%93n%3B%20m%E1%BB%99t%20c%C3%BA%20xuy%C3%AAn%20qua%20c%E1%BB%9D%20y%E1%BA%BFu%20c%C3%B3%20th%E1%BB%83%20thay%20v%C3%A0o%20%C4%91%C3%B3%20l%C3%A0%20b%E1%BA%ABy."),
    cues: [
      vi("C%E1%BB%A5m%20%E1%BB%9F%20ph%E1%BA%A7n%20gi%E1%BB%AFa%20v%E1%BB%9Bi%20ti%E1%BA%BFn%20tri%E1%BB%83n%20th%E1%BA%A5t%20b%E1%BA%A1i%20v%E1%BB%81%20ph%C3%ADa%20m%E1%BB%A5c%20ti%C3%AAu"),
      vi("Powerbar%20ho%E1%BA%B7c%20combi%20b%E1%BA%A5t%20l%E1%BB%A3i%2C%20sau%20%C4%91%C3%B3%20l%C3%A0%20ph%C3%A1%20v%E1%BB%A1%20c%E1%BB%A5m%20%C4%91%C3%B3"),
      vi("Ghi%20l%E1%BA%A1i%20ph%E1%BA%A7n%20n%C3%A0o%20c%E1%BB%A7a%20chuy%E1%BB%83n%20%C4%91%E1%BB%99ng%20tr%C6%B0%E1%BB%9Bc%20%C4%91%C3%B3%20%C4%91%C3%A3%20t%E1%BB%93n%20t%E1%BA%A1i%20tr%C6%B0%E1%BB%9Bc%20khi%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u")
    ],
    abstain: [
      vi("D%C3%B9ng%20b%E1%BA%A5t%20k%E1%BB%B3%20n%E1%BA%BFn%20kh%C3%A1c%20m%C3%A0u%20n%C3%A0o%20l%C3%A0m%20l%C3%BD%20do%20tho%C3%A1t"),
      vi("Nh%E1%BA%A7m%20m%E1%BB%99t%20ph%C3%A1%20v%E1%BB%A1%20m%E1%BB%9Bi%20th%E1%BA%A5t%20b%E1%BA%A1i%20v%E1%BB%9Bi%20m%E1%BB%99t%20giao%20d%E1%BB%8Bch%20c%C3%B3%20l%C3%A3i%20%C4%91ang%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u"),
      vi("B%E1%BB%8Ba%20th%E1%BB%9Di%20%C4%91i%E1%BB%83m%20kh%E1%BB%9Bp%20l%E1%BB%87nh%20trong%20n%E1%BA%BFn%20t%E1%BB%AB%20d%E1%BB%AF%20li%E1%BB%87u%20OHLC")
    ],
  },
  trade_selection_failure: {
    definition: vi("%C4%90%C3%A1nh%20gi%C3%A1%20%C3%A1p%20l%E1%BB%B1c%20v%C3%A0%20%C4%91i%E1%BB%81u%20ki%E1%BB%87n%20tr%C6%B0%E1%BB%9Bc%20thi%E1%BA%BFt%20l%E1%BA%ADp%20c%E1%BB%A5c%20b%E1%BB%99.%20M%E1%BB%99t%20ph%C3%A1%20v%E1%BB%A1%20%C4%91%C6%B0%E1%BB%A3c%20h%C3%ACnh%20th%C3%A0nh%20t%E1%BB%91t%20nh%C6%B0ng%20%C4%91i%20ng%C6%B0%E1%BB%A3c%20%C3%A1p%20l%E1%BB%B1c%20chi%20ph%E1%BB%91i%20c%C3%B3%20th%E1%BB%83%20th%E1%BA%A5t%20b%E1%BA%A1i%20v%E1%BB%81%20sau%20v%C3%A0%20t%E1%BA%A1o%20c%C6%A1%20h%E1%BB%99i%20ph%C3%A1%20v%E1%BB%A1%20ng%C6%B0%E1%BB%A3c%20chi%E1%BB%81u%20c%C3%B9ng%20%C3%A1p%20l%E1%BB%B1c%20chi%20ph%E1%BB%91i%3B%20ri%C3%AAng%20ph%C3%A1%20v%E1%BB%A1%20gi%E1%BA%A3%20l%C3%A0%20ch%C6%B0a%20%C4%91%E1%BB%A7."),
    cues: [
      vi("Ranh%20gi%E1%BB%9Bi%2C%20t%C3%ADch%20l%C5%A9y%20v%C3%A0%20t%C3%ADn%20hi%E1%BB%87u%20trong%20l%E1%BA%A7n%20ph%C3%A1%20v%E1%BB%A1%20%C4%91ang%20%C4%91%C6%B0%E1%BB%A3c%20th%E1%BB%AD"),
      vi("Ph%C3%A1%20v%E1%BB%A1%20ng%C6%B0%E1%BB%A3c%20chi%E1%BB%81u%20ph%C3%B9%20h%E1%BB%A3p%20v%E1%BB%9Bi%20%C3%A1p%20l%E1%BB%B1c%20chi%20ph%E1%BB%91i%20%C4%91%C3%A3%20h%C3%ACnh%20th%C3%A0nh"),
      vi("Ki%E1%BB%83m%20tra%20kh%C3%A1ng%20c%E1%BB%B1%20ho%E1%BA%B7c%20h%E1%BB%97%20tr%E1%BB%A3%20ph%C3%ADa%20tr%C6%B0%E1%BB%9Bc%2C%20kho%E1%BA%A3ng%20c%C3%A1ch%20%C4%91%E1%BA%BFn%20EMA%20v%C3%A0%20c%C3%A1c%20nam%20ch%C3%A2m%20b%E1%BA%A5t%20l%E1%BB%A3i")
    ],
    abstain: [
      vi("%C4%90%C3%A1nh%20ng%C6%B0%E1%BB%A3c%20m%E1%BB%8Di%20ph%C3%A1%20v%E1%BB%A1%20th%E1%BA%A5t%20b%E1%BA%A1i"),
      vi("%C3%81p%20l%E1%BB%B1c%20h%E1%BB%93i%20gi%C3%A1%20m%E1%BA%A1nh%20ho%E1%BA%B7c%20c%C3%A1c%20n%E1%BA%BFn%20l%E1%BB%9Bn%20b%E1%BA%A5t%20th%C6%B0%E1%BB%9Dng%20xu%E1%BA%A5t%20hi%E1%BB%87n%20d%E1%BB%93n%20d%E1%BA%ADp"),
      vi("V%C3%A0o%20l%E1%BB%87nh%20khi%20t%C3%ADch%20l%C5%A9y%20qu%C3%A1%20%C3%ADt%20ho%E1%BA%B7c%20kh%C3%B4ng%20c%C3%B2n%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20%C4%91%E1%BB%83%20gi%C3%A1%20%C4%91i%20ti%E1%BA%BFp")
    ],
  },
  consecutive_review: {
    definition: vi("Ngu%E1%BB%93n%20tr%C3%ACnh%20b%C3%A0y%20c%C3%A1c%20phi%C3%AAn%20EURUSD%20t%E1%BB%AB%20th%C3%A1ng%203%20%C4%91%E1%BA%BFn%20th%C3%A1ng%208%20n%C4%83m%202012%20nh%C6%B0%20m%E1%BB%99t%20t%E1%BA%ADp%20nghi%C3%AAn%20c%E1%BB%A9u%2C%20s%E1%BB%AD%20d%E1%BB%A5ng%20b%E1%BB%91i%20c%E1%BA%A3nh%20qua%20c%C3%A1c%20ng%C3%A0y%20li%C3%AAn%20ti%E1%BA%BFp.%20Ch%C3%BA%20th%C3%ADch%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20v%C3%A0%20k%E1%BA%BFt%20qu%E1%BA%A3%20gi%C3%A1o%20d%E1%BB%A5c%20kh%C3%B4ng%20ph%E1%BA%A3i%20b%E1%BB%99%20x%C3%A1c%20th%E1%BB%B1c%20XAUUSD%20%C4%91%C6%B0%E1%BB%A3c%20g%E1%BA%AFn%20nh%C3%A3n%20m%C3%A1y."),
    cues: [
      vi("R%C3%A0%20so%C3%A1t%20to%C3%A0n%20b%E1%BB%99%20phi%C3%AAn%2C%20bao%20g%E1%BB%93m%20c%E1%BA%A3%20tr%C6%B0%E1%BB%9Dng%20h%E1%BB%A3p%20b%E1%BB%8F%20qua%20v%C3%A0%20tr%C6%B0%E1%BB%9Dng%20h%E1%BB%A3p%20m%C6%A1%20h%E1%BB%93"),
      vi("C%C3%A1c%20nh%C3%A3n%20pb%2Fpbp%2Fpbc%2Fpr%2Ftff%20ph%C3%A2n%20bi%E1%BB%87t%20c%C3%A1c%20nh%C3%B3m%20thi%E1%BA%BFt%20l%E1%BA%ADp"),
      vi("Ghi%20ri%C3%AAng%20m%C3%BAi%20gi%E1%BB%9D%20c%E1%BB%A7a%20phi%C3%AAn%20v%E1%BB%9Bi%20d%E1%BB%AF%20li%E1%BB%87u%20th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng%20UTC")
    ],
    abstain: [
      vi("Bi%E1%BA%BFn%20c%C3%A1c%20v%C3%AD%20d%E1%BB%A5%20l%E1%BB%8Bch%20s%E1%BB%AD%20c%C3%B3%20ch%C3%BA%20th%C3%ADch%20th%C3%A0nh%20t%E1%BB%B7%20l%E1%BB%87%20th%E1%BA%AFng%20c%E1%BB%A7a%20chi%E1%BA%BFn%20l%C6%B0%E1%BB%A3c"),
      vi("Gi%E1%BA%A3%20%C4%91%E1%BB%8Bnh%20c%C3%B3%20th%E1%BB%83%20lu%C3%B4n%20%C4%91%E1%BB%8Dc%20ch%C3%ADnh%20x%C3%A1c%20vi%E1%BB%87c%20ch%E1%BA%A1m%20m%E1%BB%A5c%20ti%C3%AAu%20ho%E1%BA%B7c%20d%E1%BB%ABng%20l%E1%BB%97%20t%E1%BB%AB%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20in")
    ],
  },
  position_sizing: {
    definition: vi("Quy%20m%C3%B4%20v%E1%BB%8B%20th%E1%BA%BF%20l%C3%A0m%20thay%20%C4%91%E1%BB%95i%20k%E1%BA%BFt%20qu%E1%BA%A3%20h%E1%BA%A1ch%20to%C3%A1n%20c%E1%BB%A7a%20m%E1%BB%99t%20chu%E1%BB%97i%20giao%20d%E1%BB%8Bch%20%C4%91%C3%A3%20t%E1%BB%93n%20t%E1%BA%A1i.%20%C4%90i%E1%BB%81u%20ch%E1%BB%89nh%20theo%20t%E1%BB%B7%20l%E1%BB%87%20ph%E1%BA%A7n%20tr%C4%83m%20s%E1%BA%BD%20co%20gi%C3%A3n%20s%E1%BB%91%20%C4%91%C6%A1n%20v%E1%BB%8B%20theo%20v%E1%BB%91n%3B%20ch%C3%BAng%20kh%C3%B4ng%20c%E1%BA%A3i%20thi%E1%BB%87n%20l%E1%BB%A3i%20th%E1%BA%BF%20c%E1%BB%A7a%20vi%E1%BB%87c%20ch%E1%BB%8Dn%20giao%20d%E1%BB%8Bch."),
    cues: [
      vi("T%C3%A1ch%20k%E1%BA%BFt%20qu%E1%BA%A3%20giao%20d%E1%BB%8Bch%20theo%20%C4%91%C6%A1n%20v%E1%BB%8B%20r%E1%BB%A7i%20ro%20kh%E1%BB%8Fi%20h%E1%BA%A1ch%20to%C3%A1n%20b%E1%BA%B1ng%20ti%E1%BB%81n%20t%E1%BB%87"),
      vi("Gi%E1%BA%A3m%20s%E1%BB%91%20%C4%91%C6%A1n%20v%E1%BB%8B%20khi%20t%C3%A0i%20kho%E1%BA%A3n%20m%C3%B4%20h%C3%ACnh%20thu%20h%E1%BA%B9p"),
      vi("C%C3%A1c%20v%C3%AD%20d%E1%BB%A5%20t%C4%83ng%20tr%C6%B0%E1%BB%9Fng%20b%E1%BA%B1ng%20s%E1%BB%91%20li%E1%BB%87u%20c%E1%BB%A7a%20ngu%E1%BB%93n%20ch%E1%BB%89%20l%C3%A0%20minh%20h%E1%BB%8Da%20gi%E1%BA%A3%20%C4%91%E1%BB%8Bnh")
    ],
    abstain: [
      vi("D%E1%BB%B1%20ph%C3%B3ng%20m%E1%BB%A9c%20t%C4%83ng%20tr%C6%B0%E1%BB%9Fng%20%C4%91%E1%BB%81u%20trong%20v%C3%AD%20d%E1%BB%A5%20c%E1%BB%A7a%20t%C3%A0i%20li%E1%BB%87u%20th%C3%A0nh%20d%E1%BB%B1%20b%C3%A1o"),
      vi("T%C4%83ng%20quy%20m%C3%B4%20%C4%91%E1%BB%83%20b%C3%B9%20cho%20m%E1%BB%99t%20ph%C6%B0%C6%A1ng%20ph%C3%A1p%20kh%C3%B4ng%20c%C3%B3%20l%C3%A3i"),
      vi("B%E1%BB%8F%20qua%20k%C3%ADch%20th%C6%B0%E1%BB%9Bc%20lot%20t%E1%BB%91i%20thi%E1%BB%83u%2C%20chi%20ph%C3%AD%20ho%E1%BA%B7c%20t%E1%BB%95n%20th%E1%BA%A5t%20th%E1%BB%B1c%20thi")
    ],
  },
  low_volatility: {
    definition: vi("Ho%E1%BA%A1t%20%C4%91%E1%BB%99ng%20k%C3%A9o%20d%C3%A0i%20%E1%BB%9F%20m%E1%BB%A9c%20th%E1%BA%A5p%20c%C3%B3%20th%E1%BB%83%20l%C3%A0m%20suy%20y%E1%BA%BFu%20%C4%91%C3%A0%20ti%E1%BA%BFp%20di%E1%BB%85n%20ngay%20c%E1%BA%A3%20khi%20nguy%C3%AAn%20t%E1%BA%AFc%20h%C3%A0nh%20%C4%91%E1%BB%99ng%20gi%C3%A1%20v%E1%BA%ABn%20ph%C3%B9%20h%E1%BB%A3p.%20Ngu%E1%BB%93n%20xem%20x%C3%A9t%20m%E1%BB%A5c%20ti%C3%AAu%20nh%E1%BB%8F%20h%C6%A1n%2C%20c%C3%A1c%20giao%20d%E1%BB%8Bch%20ti%E1%BA%BFp%20di%E1%BB%85n%20%C4%91%C6%B0%E1%BB%A3c%20ch%E1%BB%8Dn%20l%E1%BB%8Dc%20h%C6%A1n%20v%C3%A0%20c%C3%A1c%20th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng%20ho%E1%BA%B7c%20khung%20th%E1%BB%9Di%20gian%20thay%20th%E1%BA%BF."),
    cues: [
      vi("So%20s%C3%A1nh%20m%E1%BB%A9c%20ho%E1%BA%A1t%20%C4%91%E1%BB%99ng%20v%C3%A0%20%C4%91%C3%A0%20ti%E1%BA%BFp%20di%E1%BB%85n%20v%E1%BB%9Bi%20%C4%91%C6%B0%E1%BB%9Dng%20c%C6%A1%20s%E1%BB%9F%20%C4%91%C3%A3%20ki%E1%BB%83m%20tra"),
      vi("Y%C3%AAu%20c%E1%BA%A7u%20t%C3%ADch%20l%C5%A9y%20c%C3%B3%20%C3%BD%20ngh%C4%A9a%20thay%20v%C3%AC%20c%C3%A1c%20n%E1%BA%BFn%20g%E1%BA%A7n%20nh%C6%B0%20%C4%91%E1%BB%A9ng%20y%C3%AAn"),
      vi("Vi%E1%BB%87c%20th%C3%ADch%20%E1%BB%A9ng%20v%E1%BB%9Bi%20200%20tick%20c%E1%BB%A7a%20ngu%E1%BB%93n%20c%E1%BA%A7n%20d%E1%BB%AF%20li%E1%BB%87u%20tick%20th%E1%BA%ADt%3B%20%E1%BB%A9ng%20d%E1%BB%A5ng%20n%C3%A0y%20v%E1%BA%ABn%20d%C3%B9ng%20XAUUSD%20M5")
    ],
    abstain: [
      vi("%C3%89p%20bu%E1%BB%99c%20giao%20d%E1%BB%8Bch%20h%E1%BA%B1ng%20ng%C3%A0y%20trong%20m%C3%B4i%20tr%C6%B0%E1%BB%9Dng%20tr%C3%AC%20tr%E1%BB%87"),
      vi("T%E1%BB%95ng%20h%E1%BB%A3p%20tick%20ho%E1%BA%B7c%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20nhanh%20h%C6%A1n%20t%E1%BB%AB%20OHLC%20M5"),
      vi("T%E1%BB%B1%20%C4%91%E1%BB%99ng%20r%C3%BAt%20ng%E1%BA%AFn%20m%E1%BB%A5c%20ti%C3%AAu%20m%C3%A0%20ch%C6%B0a%20ki%E1%BB%83m%20tra%20chi%20ph%C3%AD%20v%C3%A0%20b%E1%BB%91i%20c%E1%BA%A3nh")
    ],
  },
  obstacle_room: {
    definition: vi("Xem%20x%C3%A9t%20kh%C3%A1ng%20c%E1%BB%B1%20tr%C6%B0%E1%BB%9Bc%20%C4%91%C3%B3%20ph%C3%ADa%20tr%C3%AAn%20ph%C3%A1%20v%E1%BB%A1%20t%C4%83ng%20ho%E1%BA%B7c%20h%E1%BB%97%20tr%E1%BB%A3%20ph%C3%ADa%20d%C6%B0%E1%BB%9Bi%20ph%C3%A1%20v%E1%BB%A1%20gi%E1%BA%A3m%2C%20kho%E1%BA%A3ng%20c%C3%A1ch%20b%E1%BA%A3o%20v%E1%BB%87%20k%E1%BB%B9%20thu%E1%BA%ADt%20v%C3%A0%20c%C3%A1c%20nam%20ch%C3%A2m%20b%E1%BA%A5t%20l%E1%BB%A3i%20tr%C6%B0%E1%BB%9Bc%20khi%20di%E1%BB%85n%20gi%E1%BA%A3i%20thi%E1%BA%BFt%20l%E1%BA%ADp.%20Kh%C3%A1ng%20c%E1%BB%B1%20swing%20g%E1%BA%A7n%20c%C3%B3%20th%E1%BB%83%20%C4%91%E1%BB%83%20l%E1%BA%A1i%20%C3%ADt%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20d%C3%B9%20n%E1%BA%BFn%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u%20tr%C3%B4ng%20h%E1%BA%A5p%20d%E1%BA%ABn%3B%20ch%E1%BB%89%20ri%C3%AAng%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20nh%C3%ACn%20th%E1%BA%A5y%20kh%C3%B4ng%20th%E1%BB%83%20x%C3%A1c%20l%E1%BA%ADp%20giao%20d%E1%BB%8Bch."),
    cues: [
      vi("%C4%90%C3%A1nh%20gi%C3%A1%20h%C6%B0%E1%BB%9Bng%20%C4%91i%2C%20%C4%91i%E1%BB%81u%20ki%E1%BB%87n%20%C4%91i%20ngang%20ho%E1%BA%B7c%20c%C3%B3%20xu%20h%C6%B0%E1%BB%9Bng%20v%C3%A0%20c%C3%A1c%20v%E1%BA%ADt%20c%E1%BA%A3n%20g%E1%BA%A7n%20tr%C6%B0%E1%BB%9Bc%20khi%20tham%20gia"),
      vi("So%20s%C3%A1nh%20kho%E1%BA%A3ng%20tr%E1%BB%91ng%20c%C3%B3%20th%E1%BB%83%20s%E1%BB%AD%20d%E1%BB%A5ng%20v%E1%BB%9Bi%20m%E1%BB%A9c%20b%E1%BA%A3o%20v%E1%BB%87%20c%C3%B3%20c%C6%A1%20s%E1%BB%9F%20k%E1%BB%B9%20thu%E1%BA%ADt%2C%20thay%20v%C3%AC%20n%E1%BB%9Bi%20r%E1%BB%99ng%20d%E1%BB%ABng%20l%E1%BB%97%20%C4%91%E1%BB%83%20hy%20v%E1%BB%8Dng"),
      vi("Ph%C3%A2n%20bi%E1%BB%87t%20b%E1%BB%91i%20c%E1%BA%A3nh%20h%C3%ACnh%20h%E1%BB%8Dc%20%C4%91%C3%A3%20bi%E1%BA%BFt%20t%E1%BA%A1i%20thi%E1%BA%BFt%20l%E1%BA%ADp%20v%E1%BB%9Bi%20%C4%91%C3%A0%20ti%E1%BA%BFp%20di%E1%BB%85n%20v%E1%BB%81%20sau"),
      vi("EMA%20l%C3%A0%20m%E1%BB%99t%20%C4%91%C6%B0%E1%BB%9Dng%20trung%20b%C3%ACnh%2C%20t%E1%BB%B1%20n%C3%B3%20kh%C3%B4ng%20ph%E1%BA%A3i%20h%E1%BB%97%20tr%E1%BB%A3%20hay%20kh%C3%A1ng%20c%E1%BB%B1")
    ],
    abstain: [
      vi("M%E1%BB%99t%20n%E1%BA%BFn%20t%C3%ADn%20hi%E1%BB%87u%20g%E1%BB%8Dn%20n%E1%BA%B1m%20ngay%20s%C3%A1t%20kh%C3%A1ng%20c%E1%BB%B1%20ho%E1%BA%B7c%20h%E1%BB%97%20tr%E1%BB%A3%20swing%20tr%C6%B0%E1%BB%9Bc%20%C4%91%C3%B3"),
      vi("D%E1%BB%ABng%20l%E1%BB%97%20k%E1%BB%B9%20thu%E1%BA%ADt%20r%E1%BB%99ng%20ho%E1%BA%B7c%20nam%20ch%C3%A2m%20b%E1%BA%A5t%20l%E1%BB%A3i%20l%C3%A0m%20suy%20y%E1%BA%BFu%20thi%E1%BA%BFt%20l%E1%BA%ADp"),
      vi("Tuy%C3%AAn%20b%E1%BB%91%20%C4%91%C6%B0%E1%BB%9Dng%20%C4%91i%20th%C3%B4ng%20tho%C3%A1ng%20ch%E1%BB%89%20v%C3%AC%20m%E1%BB%99t%20l%E1%BA%A7n%20qu%C3%A9t%20c%C3%B3%20gi%E1%BB%9Bi%20h%E1%BA%A1n%20kh%C3%B4ng%20t%C3%ACm%20th%E1%BA%A5y%20swing%20%C4%91%C3%A3%20x%C3%A1c%20nh%E1%BA%ADn"),
      vi("%E1%BB%A8ng%20d%E1%BB%A5ng%20ch%E1%BB%89%20cung%20c%E1%BA%A5p%20ph%C3%A9p%20%C4%91o%20b%E1%BB%91i%20c%E1%BA%A3nh%20c%E1%BB%A5c%20b%E1%BB%99%20t%C3%B9y%20ch%E1%BB%8Dn%2C%20kh%C3%B4ng%20ph%E1%BA%A3i%20b%E1%BB%99%20ph%C3%A1t%20hi%E1%BB%87n%20t%C3%ADn%20hi%E1%BB%87u%20%C4%91%E1%BB%99c%20l%E1%BA%ADp%20hay%20t%E1%BB%B7%20l%E1%BB%87%20th%E1%BA%AFng%20%C4%91%C3%A3%20l%E1%BB%8Dc.%20C%C3%A1c%20swing%20hai%20ph%C3%ADa%2C%20ph%E1%BA%A1m%20vi%2096%20n%E1%BA%BFn%2C%20dung%20sai%20v%C3%B9ng%20v%C3%A0%20m%E1%BB%91c%20s%E1%BB%91%20tr%C3%B2n%20XAUUSD%20l%C3%A0%20c%C3%A1c%20quy%20t%E1%BA%AFc%20c%E1%BB%A5c%20b%E1%BB%99")
    ],
  },
};
const viDefinitionPrefix = vi("B%E1%BA%A3n%20di%E1%BB%85n%20gi%E1%BA%A3i%20ti%E1%BA%BFng%20Vi%E1%BB%87t%20d%E1%BB%B1a%20tr%C3%AAn%20ghi%20ch%C3%BA%20PDF%3A%20");
const viCuePrefix = vi("Xem%20x%C3%A9t%3A%20");
const viAbstainPrefix = vi("Tr%C3%A1nh%20di%E1%BB%85n%20gi%E1%BA%A3i%20khi%3A%20");

export function getSourceNotesCopy(knowledge: KnowledgeConcept, locale: SourceNotesLocale): SourceNotesCopy {
  if (locale !== "vi") return { name: knowledge.name, definition: knowledge.definition, cues: knowledge.cues, abstain: knowledge.abstain };
  const reading = VI_READINGS[knowledge.id];
  return {
    name: VI_NAMES[knowledge.id] || knowledge.name,
    definition: reading?.definition || `${viDefinitionPrefix}${knowledge.definition}`,
    cues: reading?.cues || knowledge.cues.map((cue) => `${viCuePrefix}${cue}`),
    abstain: reading?.abstain || knowledge.abstain.map((cue) => `${viAbstainPrefix}${cue}`),
  };
}

export function sourceNotesUi(locale: SourceNotesLocale) {
  if (locale === "vi") return {
    language: vi("Ng%C3%B4n%20ng%E1%BB%AF%20ghi%20ch%C3%BA%20ngu%E1%BB%93n"), english: "English", vietnamese: vi("Ti%E1%BA%BFng%20Vi%E1%BB%87t"),
    switchTo: vi("%C4%90%E1%BB%95i%20ng%C3%B4n%20ng%E1%BB%AF%20ghi%20ch%C3%BA%20ngu%E1%BB%93n"), translated: vi("B%E1%BA%A3n%20di%E1%BB%85n%20gi%E1%BA%A3i%20ti%E1%BA%BFng%20Vi%E1%BB%87t"), original: vi("Nguy%C3%AAn%20b%E1%BA%A3n%20ngu%E1%BB%93n%20ti%E1%BA%BFng%20Anh"),
    definition: vi("Di%E1%BB%85n%20gi%E1%BA%A3i%20ngu%E1%BB%93n"), cues: vi("D%E1%BA%A5u%20hi%E1%BB%87u%20c%E1%BA%A7n%20xem"), abstain: vi("D%E1%BA%A5u%20hi%E1%BB%87u%20c%E1%BA%A7n%20tr%C3%A1nh"), sourceOnly: vi("Ch%E1%BB%89%20r%C3%A0%20so%C3%A1t%20ngu%E1%BB%93n"),
    dataUnavailable: vi("D%E1%BB%AF%20li%E1%BB%87u%20UNAVAILABLE"), outcomeWithheld: vi("K%E1%BA%BFt%20qu%E1%BA%A3%20WITHHELD"), authority: "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false",
    noNotes: vi("Kh%C3%B4ng%20c%C3%B3%20ghi%20ch%C3%BA%20ngu%E1%BB%93n%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t%20li%C3%AAn%20quan%20%C4%91%E1%BA%BFn%20kh%C3%A1i%20ni%E1%BB%87m%20n%C3%A0y."), read: vi("%C4%90%E1%BB%8Dc%20ghi%20ch%C3%BA%20ngu%E1%BB%93n%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t"), hide: vi("%E1%BA%A8n%20ghi%20ch%C3%BA%20ngu%E1%BB%93n%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t"),
    loading: vi("%C4%90ang%20t%E1%BA%A3i%20ghi%20ch%C3%BA%20ngu%E1%BB%93n%20PDF%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t..."), failed: vi("Kh%C3%B4ng%20th%E1%BB%83%20t%E1%BA%A3i%20ghi%20ch%C3%BA%20ngu%E1%BB%93n%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t."), retry: vi("Th%E1%BB%AD%20l%E1%BA%A1i%20ghi%20ch%C3%BA%20ngu%E1%BB%93n"),
  } as const;
  return {
    language: "Source notes language", english: "English", vietnamese: "Vietnamese", switchTo: "Switch source notes language", translated: "Vietnamese interpretation", original: "English source wording", definition: "Source interpretation", cues: "Review cues", abstain: "Abstain cues", sourceOnly: "Source review only", dataUnavailable: "data UNAVAILABLE", outcomeWithheld: "outcome WITHHELD", authority: "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false", noNotes: "No reviewed source notes are linked to this concept.", read: "Read reviewed source notes", hide: "Hide reviewed source notes", loading: "Loading reviewed PDF source notes...", failed: "Reviewed source notes could not be loaded.", retry: "Retry source notes",
  } as const;
}

export function sourceNotesStatus(_locale: SourceNotesLocale) {
  return "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD";
}
