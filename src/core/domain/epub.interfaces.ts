export class epubI {
  sampleUrl: string;
  createdUserId: string;
  properties: object;
}

export interface OptionsI {
  title: string;
  author: string;
  content: { title: string; data: string }[];
}
