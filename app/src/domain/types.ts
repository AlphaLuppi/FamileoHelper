export type Photo = {
  id: string;
  uri: string;
  createdAt: string;
  width: number;
  height: number;
  location?: { latitude: number; longitude: number };
};

export type Moment = {
  photos: Photo[];
  startAt: string;
  endAt: string;
  centroid?: { latitude: number; longitude: number };
};

export type PostProposal = {
  momentHash: string;
  photos: Photo[];
  date: string;
  weekday: string;
  city?: string;
  draftText?: string;
};

export type Pad = {
  id: string;
  name: string;
  lastUsedAt?: string;
};
