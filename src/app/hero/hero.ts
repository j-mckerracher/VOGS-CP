import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent implements OnDestroy {
  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('splatterCanvas');
  private resizeHandler: (() => void) | null = null;

  constructor() {
    afterNextRender(() => {
      const canvasEl = this.canvas()?.nativeElement;
      if (!canvasEl) return;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        canvasEl.width = canvasEl.offsetWidth;
        canvasEl.height = canvasEl.offsetHeight;
        this.draw(ctx, canvasEl.width, canvasEl.height);
      };

      this.resizeHandler = resize;
      window.addEventListener('resize', resize);
      resize();
    });
  }

  ngOnDestroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  private randBetween(a: number, b: number): number {
    return a + Math.random() * (b - a);
  }

  private drawSplat(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: string,
    alpha: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    ctx.beginPath();
    const pts = 7 + Math.floor(Math.random() * 5);
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i <= pts; i++) {
      const angle = baseAngle + (i / pts) * Math.PI * 2;
      const rad = r * this.randBetween(0.5, 1.3);
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    const drips = Math.floor(Math.random() * 5);
    for (let d = 0; d < drips; d++) {
      const dx = cx + this.randBetween(-r, r);
      const dLen = this.randBetween(20, 80);
      const dW = this.randBetween(2, 8);
      ctx.beginPath();
      ctx.moveTo(dx - dW / 3, cy + r * 0.6);
      const cp1x = dx + this.randBetween(-15, 15);
      ctx.quadraticCurveTo(cp1x, cy + r * 0.6 + dLen * 0.5, dx, cy + r * 0.6 + dLen);
      ctx.lineWidth = dW;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dx, cy + r * 0.6 + dLen, dW * 1.4, 0, Math.PI * 2);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fill();
    }

    ctx.globalAlpha = alpha * 0.7;
    const dots = Math.floor(Math.random() * 30);
    for (let s = 0; s < dots; s++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = r + this.randBetween(5, r * 2.5);
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist;
      const sr = this.randBetween(1, 5);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, W, H);

    const palette = [
      '#CFB991', '#B59B6B', '#E8D5A3', '#9E8B6E',
      '#7A6A50', '#D4C09A', '#F0E0B5', '#A08A60',
      '#1C1C1C', '#2A2A2A', '#3A3A3A',
    ];

    for (let i = 0; i < 18; i++) {
      this.drawSplat(
        ctx,
        this.randBetween(0, W), this.randBetween(0, H),
        this.randBetween(40, 130),
        palette[Math.floor(Math.random() * palette.length)],
        this.randBetween(0.05, 0.25),
      );
    }

    for (let i = 0; i < 30; i++) {
      this.drawSplat(
        ctx,
        this.randBetween(0, W), this.randBetween(0, H),
        this.randBetween(15, 55),
        palette[Math.floor(Math.random() * palette.length)],
        this.randBetween(0.2, 0.55),
      );
    }

    for (let c = 0; c < 8; c++) {
      const cx = this.randBetween(0, W);
      const cy = this.randBetween(0, H);
      const clr = palette[Math.floor(Math.random() * 8)];
      for (let s = 0; s < 20; s++) {
        ctx.save();
        ctx.globalAlpha = this.randBetween(0.3, 0.7);
        ctx.fillStyle = clr;
        ctx.beginPath();
        const angle = Math.random() * Math.PI * 2;
        const dist = this.randBetween(0, 80);
        ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, this.randBetween(1, 4), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.globalAlpha = this.randBetween(0.06, 0.18);
      ctx.strokeStyle = palette[Math.floor(Math.random() * 8)];
      ctx.lineWidth = this.randBetween(8, 30);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const sx = this.randBetween(0, W), sy = this.randBetween(0, H);
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        this.randBetween(0, W), this.randBetween(0, H),
        this.randBetween(0, W), this.randBetween(0, H),
        this.randBetween(0, W), this.randBetween(0, H),
      );
      ctx.stroke();
      ctx.restore();
    }
  }
}
