import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { ApexGrid, ColumnConfiguration } from 'apex-grid';
import { RecordLogListItemModel } from '../models/record-log-list-item-model';
import { RecordLogService } from '../services/record-log.service';

ApexGrid.register(); // registers <apex-grid> once, before first render

@Component({
  selector: 'app-record-logs-page',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './record-logs-page.scss',
  templateUrl: './record-logs-page.html',
})
export class RecordLogsPage {
  private readonly recordLogService = inject(RecordLogService);

  protected readonly rows = this.recordLogService.recordLogs;
  protected readonly isLoading = this.recordLogService.isLoading;

  protected readonly columns: ColumnConfiguration<RecordLogListItemModel>[] = [
    { key: 'name', headerText: 'Name', sort: true, filter: true },
    { key: 'amount', headerText: 'Amount', type: 'number', sort: true },
    { key: 'recordType', headerText: 'Record Type', sort: true, filter: true },
    { key: 'date', headerText: 'Date', type: 'date', sort: true },
  ];
}
