export type Pad = {
  id: string;
  name: string;
};

export type Gazette = {
  id: string;
  padId: string;
  closesAt: string; // ISO datetime
  publishedAt?: string;
};

export type PhotoUpload = {
  filename: string;
  contentType: string;
  bytes: Buffer;
};

export type PostInput = {
  padId: string;
  text: string;
  photos: PhotoUpload[];
};

export type PostResult = {
  postId: string;
  padId: string;
  postedAt: string;
};
