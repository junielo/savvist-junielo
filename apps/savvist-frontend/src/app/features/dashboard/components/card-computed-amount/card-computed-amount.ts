import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  imports: [DecimalPipe],
  selector: 'app-card-computed-amount',
  styleUrl: './card-computed-amount.scss',
  templateUrl: './card-computed-amount.html',
})
export class CardComputedAmount {
  readonly amount = input<number>(0);
  readonly subText = input<string>('');
  readonly height = input<string>('400px');
  readonly width = input<string>('100%');
  readonly backgroundColor = input<string>('#ffffff');
  readonly textColor = input<string>('');
  readonly mainTextColor = input<string>('');
  readonly subTextColor = input<string>('');
}
