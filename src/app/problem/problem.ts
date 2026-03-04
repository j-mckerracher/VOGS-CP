import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { RevealDirective } from '../directives/reveal.directive';

@Component({
  selector: 'app-problem',
  imports: [RevealDirective],
  templateUrl: './problem.html',
  styleUrl: './problem.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemComponent implements OnDestroy {
  readonly sceneCanvas = viewChild<ElementRef<HTMLCanvasElement>>('sceneCanvasBefore');
  private animId = 0;
  private t = 0;

  constructor() {
    afterNextRender(() => {
      const canvas = this.sceneCanvas()?.nativeElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const animate = () => {
        this.resizeScene(canvas);
        this.drawScene(ctx, canvas.width, canvas.height, 0);
        this.t++;
        this.animId = requestAnimationFrame(animate);
      };
      animate();
    });
  }

  ngOnDestroy(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  private resizeScene(canvas: HTMLCanvasElement): void {
    const size = canvas.parentElement?.offsetWidth ?? 400;
    canvas.width = size;
    canvas.height = size;
  }

  private drawScene(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    showNeighbor: number,
  ): void {
    const cx = W / 2, cy = H / 2;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    // Road
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(cx - W * 0.15, 0, W * 0.3, H);
    ctx.fillRect(0, cy - H * 0.15, W, H * 0.3);

    // Road dashes
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = '#CFB99144';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, cy - H * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.15); ctx.lineTo(cx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cx - W * 0.15, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + W * 0.15, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.setLineDash([]);

    // Building
    ctx.fillStyle = '#3D3530';
    ctx.fillRect(W * 0.55, H * 0.05, W * 0.3, H * 0.35);
    ctx.strokeStyle = '#5A4A3A';
    ctx.lineWidth = 1;
    ctx.strokeRect(W * 0.55, H * 0.05, W * 0.3, H * 0.35);

    ctx.fillStyle = '#6A5A4A';
    ctx.font = `bold ${W * 0.024}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('BUILDING', W * 0.7, H * 0.22);

    // Ego vehicle
    ctx.save();
    ctx.translate(cx, cy + H * 0.05);
    ctx.fillStyle = '#CFB991';
    ctx.fillRect(-W * 0.04, -H * 0.025, W * 0.08, H * 0.05);
    ctx.fillStyle = '#0A0A0A';
    ctx.font = `${W * 0.022}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('YOU', 0, H * 0.008);
    ctx.restore();

    // Blind spot cone
    const blindAngle = -Math.PI / 4;
    const coneR = W * 0.55;
    ctx.save();
    ctx.translate(cx, cy + H * 0.05);
    ctx.globalAlpha = 0.07 + 0.03 * Math.sin(this.t * 0.04);
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, coneR, blindAngle - 0.5, blindAngle + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Blind spot label
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#C0392B';
    ctx.font = `bold ${W * 0.022}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BLIND SPOT', W * 0.78, H * 0.35);
    ctx.restore();

    // Hidden car
    if (showNeighbor) {
      ctx.save();
      ctx.globalAlpha = showNeighbor;
      ctx.translate(W * 0.75, H * 0.12);
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(-W * 0.025, -H * 0.035, W * 0.05, H * 0.06);
      ctx.fillStyle = '#FFF';
      ctx.font = `${W * 0.016}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', 0, H * 0.004);
      ctx.fillText('CAR', 0, H * 0.018);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(W * 0.75, H * 0.12);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#555';
      ctx.fillRect(-W * 0.025, -H * 0.035, W * 0.05, H * 0.06);
      ctx.fillStyle = '#888';
      ctx.font = `bold ${W * 0.04}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('?', 0, H * 0.01);
      ctx.restore();
    }

    // Visible view cone
    ctx.save();
    ctx.translate(cx, cy + H * 0.05);
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#CFB991';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let a = Math.PI * 0.6; a <= Math.PI * 1.4; a += 0.1) {
      ctx.lineTo(Math.cos(a) * W * 0.45, Math.sin(a) * W * 0.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.font = `${W * 0.02}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#CFB991';
    ctx.textAlign = 'center';
    ctx.fillText('CAN SEE', -W * 0.15, H * 0.22);
    ctx.restore();
  }
}
