export interface ListDraft {
  name: string;
  description: string;
  privacy: string;
  allow_comments: boolean;
  display_numbers: boolean;
  sort_by: string;
  sort_how: string;
  collaborators: string[];
}
