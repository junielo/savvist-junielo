import {
  afterRenderEffect,
  Component,
  computed,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import { TitleCasePipe } from '@angular/common';
import { SelectOption, SelectOptionInput } from '../../models/aria-select-option';

@Component({
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, OverlayModule, TitleCasePipe],
  selector: 'app-aria-select',
  styleUrl: './aria-select.scss',
  templateUrl: './aria-select.html',
})
export class AriaSelect {
  /** List of options: `['A', 'B']` or `[{value: 'A', icon: 'star'}]`. */
  readonly options = input.required<SelectOptionInput[]>();

  /** Placeholder shown when nothing is selected. */
  readonly placeholder = input('Select an option');

  /** Selected value. Supports two-way binding: `[(value)]="x"`. */
  readonly value = model<string>('');

  readonly listbox = viewChild(Listbox);
  readonly popupExpanded = signal(false);

  /** Normalizes strings into `{value, icon?}` objects. */
  readonly normalizedOptions = computed<SelectOption[]>(() =>
    this.options().map((o) => (typeof o === 'string' ? { value: o } : o)),
  );

  readonly selectedValues = computed(() => (this.value() ? [this.value()] : []));

  readonly displayIcon = computed(
    () => this.normalizedOptions().find((o) => o.value === this.value())?.icon ?? '',
  );

  readonly displayValue = computed(() => this.value() || this.placeholder());

  constructor() {
    afterRenderEffect(() => {
      this.listbox()?.scrollActiveItemIntoView();
    });
  }

  onValueChange(values: string[]) {
    this.value.set(values[0] ?? '');
  }

  onCommit() {
    this.popupExpanded.set(false);
  }
}
