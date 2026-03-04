import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.html',
  styleUrl: './nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavComponent {}
