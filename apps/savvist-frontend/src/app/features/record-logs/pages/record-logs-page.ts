import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ApexGrid, ColumnConfiguration } from 'apex-grid';

ApexGrid.register(); // registers <apex-grid> once, before first render

type RecordType = 'Expense' | 'Cash' | 'Savings' | 'Credit' | 'Wishlist';

interface RecordLogRow {
  id: string;
  name: string;
  amount: number;
  recordType: RecordType;
  date: Date;
}

// TEMPORARY: replace with the real record log store later.
const MOCK_LOGS: RecordLogRow[] = [
  { id: '1', name: 'Rent', amount: 8500, recordType: 'Expense', date: new Date('2026-10-01') },
  {
    id: '2',
    name: 'BDO Balance',
    amount: 24350,
    recordType: 'Savings',
    date: new Date('2026-10-02'),
  },
  {
    id: '3',
    name: 'GCash Balance',
    amount: 1820,
    recordType: 'Cash',
    date: new Date('2026-10-03'),
  },
  {
    id: '4',
    name: 'Electric Bill',
    amount: 2340,
    recordType: 'Expense',
    date: new Date('2026-10-05'),
  },
  {
    id: '5',
    name: 'BPI Credit Card',
    amount: 6700,
    recordType: 'Credit',
    date: new Date('2026-10-07'),
  },
  {
    id: '6',
    name: 'Mechanical Keyboard',
    amount: 3900,
    recordType: 'Wishlist',
    date: new Date('2026-10-09'),
  },
  {
    id: '7',
    name: 'Internet Subscription',
    amount: 1499,
    recordType: 'Expense',
    date: new Date('2026-10-10'),
  },
  {
    id: '8',
    name: 'BPI Balance',
    amount: 15200,
    recordType: 'Savings',
    date: new Date('2026-10-12'),
  },
  { id: '9', name: 'Wallet Cash', amount: 950, recordType: 'Cash', date: new Date('2026-10-15') },
  {
    id: '10',
    name: 'Water Bill',
    amount: 480,
    recordType: 'Expense',
    date: new Date('2026-10-18'),
  },
  {
    id: '11',
    name: 'Noise-Cancelling Headphones',
    amount: 7500,
    recordType: 'Wishlist',
    date: new Date('2026-10-20'),
  },
  {
    id: '12',
    name: 'GCash Credit',
    amount: 2300,
    recordType: 'Credit',
    date: new Date('2026-10-22'),
  },
];

@Component({
  selector: 'app-record-logs-page',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './record-logs-page.scss',
  templateUrl: './record-logs-page.html',
})
export class RecordLogsPage {
  protected readonly rows = signal<RecordLogRow[]>(MOCK_LOGS);

  protected readonly columns: ColumnConfiguration<RecordLogRow>[] = [
    { key: 'name', headerText: 'Name', sort: true, filter: true },
    { key: 'amount', headerText: 'Amount', type: 'number', sort: true },
    { key: 'recordType', headerText: 'Record Type', sort: true, filter: true },
    { key: 'date', headerText: 'Date', type: 'date', sort: true },
  ];
}
