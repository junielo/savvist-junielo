import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * A reusable radial progress ring (no center text).
 *
 * <app-basic-radial-bar [value]="70" [width]="48" [height]="48"
 *                       [thickness]="6" color="#4caf50" />
 */
@Component({
  selector: 'app-basic-radial-bar',
  templateUrl: './basic-radial-bar.html',
  styleUrl: './basic-radial-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicRadialBar {
  /** Progress from 0 to 100. Values outside the range are clamped. */
  readonly value = input.required({ transform: numberAttribute });

  /** Width in px. */
  readonly width = input(80, { transform: numberAttribute });

  /** Height in px. */
  readonly height = input(80, { transform: numberAttribute });

  /** Ring thickness in px. */
  readonly thickness = input(10, { transform: numberAttribute });

  /** Color of the progress bar (any CSS color or var()). */
  readonly color = input('var(--mat-sys-primary, #1976d2)');

  /** Color of the background track. */
  readonly trackColor = input('rgba(128, 128, 128, 0.25)');

  /** Accessible label, e.g. "Savings progress". */
  readonly label = input('');

  protected readonly progress = computed(() => Math.min(100, Math.max(0, this.value() || 0)));

  protected readonly centerX = computed(() => this.width() / 2);
  protected readonly centerY = computed(() => this.height() / 2);

  /** The ring fits inside the smaller side, and the stroke stays inside the box. */
  protected readonly radius = computed(() => {
    const size = Math.min(this.width(), this.height());
    const stroke = Math.min(this.thickness(), size);
    return Math.max((size - stroke) / 2, 0);
  });

  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());

  protected readonly dashOffset = computed(
    () => this.circumference() * (1 - this.progress() / 100),
  );
}
