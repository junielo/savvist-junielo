export interface SelectOption {
  value: string;
  icon?: string;
}

/** Plain strings, or objects when you want an icon. Both can be mixed. */
export type SelectOptionInput = string | SelectOption;
