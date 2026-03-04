import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';
import { RevealDirective } from '../directives/reveal.directive';

@Component({
  selector: 'app-results',
  imports: [RevealDirective],
  templateUrl: './results.html',
  styleUrl: './results.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent implements OnDestroy {
  private readonly el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;

  constructor() {
    afterNextRender(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          }
        },
        { threshold: 0.15 },
      );
      this.el.nativeElement.querySelectorAll('.stat-box').forEach((el: Element) => {
        this.observer!.observe(el);
      });
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
