import { Directive, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  host: {
    'class': 'reveal',
  },
})
export class RevealDirective implements OnDestroy {
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
      this.observer.observe(this.el.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
