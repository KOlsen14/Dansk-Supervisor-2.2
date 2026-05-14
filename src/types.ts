export type Fp9Relevans = "høj" | "middel" | "lav" | "uklar";

export type TextStatus = "verificeret" | "foreløbig" | "kræver kilde";

export type TekstopgivelseStatus = "ja" | "nej" | "kræver vurdering";

export type AnbefaletBrug = "hovedtekst" | "perspektivering" | "supplerende materiale";

export interface TextCard {
  text_id: string;
  titel: string;
  ophav?: string;
  rolle_ophav?: string;
  år?: string;
  medieform?: string;
  genre?: string;
  platform_eller_kilde?: string;
  primær_tekstkategori: string;
  sekundær_tekstkategori?: string;
  temaer?: string[];
  periode?: string;
  fp9_relevans?: Fp9Relevans;
  mulige_fordybelsesområder?: string[];
  kan_indgå_i_tekstopgivelser?: TekstopgivelseStatus;
  anbefalet_brug?: AnbefaletBrug;
  klassifikationssikkerhed: number;
  status: TextStatus;
  kilder?: string[];
  faglige_noter?: string;
  oprettet?: string;
  sidst_opdateret?: string;
}

export interface TextSummary {
  text_id: string;
  titel: string;
  ophav: string;
  år: string;
  medieform: string;
  genre: string;
  primær_tekstkategori: string;
  temaer: string[];
  fp9_relevans: string;
  status: TextStatus;
  sidst_opdateret: string;
}

export interface SearchFilters {
  primær_tekstkategori?: string;
  fp9_relevans?: Fp9Relevans;
  status?: TextStatus;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  errors: string[];
  data?: T;
}
