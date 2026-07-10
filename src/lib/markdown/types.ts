export interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface RenderedContent {
  html: string;
  headings: Heading[];
}
