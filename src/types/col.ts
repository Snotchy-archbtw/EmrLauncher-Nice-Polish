export interface ColColor {
  name: string;
  color: number;
}

export interface ColWorldColor {
  name: string;
  waterColor: number;
  underwaterColor: number;
  fogColor: number;
}

export interface ColFile {
  version: number;
  colors: ColColor[];
  worldColors: ColWorldColor[];
}
