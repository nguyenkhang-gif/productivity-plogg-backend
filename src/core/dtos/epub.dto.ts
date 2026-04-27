export class createEpubDto {
  sampleUrl: string;
  properties: object;
  createdUserId?: string;
}

export class parseEpubDto {
  html?: string;
  url: string;
  formated: string;
}

export class generateEpubDto {
  options: {
    title: string;
    author: string;
    content: { title: string; data: string }[];
  };
}

export class updateEpubDto {
  _id: string;
  sampleUrl?: string;
  properties?: object;
}

export class deleteEpubDto {
  _id: string;
}
