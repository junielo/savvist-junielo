import { Component, computed, input } from '@angular/core';
import {
  NgApexchartsModule,
  ApexChart,
  ApexPlotOptions,
  ApexFill,
  ApexStroke,
} from 'ng-apexcharts';

@Component({
  selector: 'app-apex-gauge-label',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './apex-gauge-label.html',
  styleUrl: './apex-gauge-label.scss',
})
export class ApexGaugeLabel {
  readonly value = input<number>(58);
  readonly label = input<string>('CPU Usage');
  readonly height = input<number | string>(350);

  protected readonly chartSeries = computed(() => [this.value()]);
  protected readonly chartLabels = computed(() => [this.label()]);

  protected readonly chartConfig = computed<ApexChart>(() => ({
    height: typeof this.height() === 'number' ? this.height() : parseInt(this.height() as string, 10) || 350,
    type: 'gauge',
  }));

  protected readonly plotOptions = computed<ApexPlotOptions>(() => ({
    radialBar: {
      hollow: {
        margin: 15,
        size: '70%',
      },
      dataLabels: {
        name: {
          show: true,
          offsetY: -20,
          fontSize: '16px',
          color: '#999',
        },
        value: {
          show: true,
          fontSize: '40px',
          fontWeight: 700,
          offsetY: 6,
          formatter: (val: number) => `${Math.round(val)}%`,
        },
      },
    },
  }));

  protected readonly fillConfig: ApexFill = {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      shadeIntensity: 0.5,
      gradientToColors: ['#ABE5A1'],
      inverseColors: true,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100],
    },
  };

  protected readonly strokeConfig: ApexStroke = {
    lineCap: 'round',
  };
}
