export interface PickerList {
  readonly id: number;
  readonly name: string;
  readonly count: number;
  readonly privacy: string;
  readonly rank: number;
  readonly owner: string;
  readonly collaboration: boolean;
  readonly selected: boolean;
}
