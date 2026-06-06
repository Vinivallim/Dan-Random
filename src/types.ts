export interface CharacterInfo {
  character: string;
  copyright: string;
  imageUrl: string;
  sourceUrl: string;
}

export interface Favorite extends CharacterInfo {
  id: string;
  userId: string;
  createdAt: any; // Firestore Timestamp
}
