import { Pipe, PipeTransform } from '@angular/core';

const SUFFIXES: Record<string, string> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
};

@Pipe({ name: 'ordinal' })
export class OrdinalPipe implements PipeTransform {
  private readonly rules = new Intl.PluralRules('en', { type: 'ordinal' });

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';

    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);

    return `${num}${SUFFIXES[this.rules.select(num)]}`;
  }
}
