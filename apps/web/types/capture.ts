export type CaptureType =
  | "link"
  | "note"
  | "image"
  | "pdf"
  | "audio";

export type CaptureOption = {
  type: CaptureType;
  title: string;
  description: string;
  icon: string;
  available: boolean;
};

export type QuickNoteInput = {
  title?: string;
  content: string;
  workspaceId:
    | "private"
    | "business";
};
