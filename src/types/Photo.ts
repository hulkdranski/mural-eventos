
export type PhotoStatus = "pending" | "approved" | "rejected";

export interface Photo {
  id: string;
  eventId: string;
  storagePath: string;
  caption: string;
  status: PhotoStatus;
  uploadedAt: unknown;
  approvedAt?: unknown;
  approvedBy?: string;
}
