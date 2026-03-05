import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';
import { RevealDirective } from '../directives/reveal.directive';

interface CollabEntry {
  label: string;
  miou: number;
  iou: number;
}

@Component({
  selector: 'app-interactive',
  imports: [RevealDirective],
  templateUrl: './interactive.html',
  styleUrl: './interactive.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveComponent implements OnDestroy {
  readonly collabChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('collabChart');
  readonly gaussChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('gaussChart');

  readonly collabValue = signal(0);
  readonly collabMiou = signal('29.2');
  readonly collabIou = signal('67.8');
  readonly collabVs = signal('Baseline');
  readonly collabVsColor = signal('var(--text-muted)');
  readonly collabLabels = signal<boolean[]>([true, false, false, false]);

  readonly gaussMiou = signal('35.5');
  readonly gaussComm = signal('0.27');
  readonly gaussPct = signal('34.6%');
  readonly gaussPctColor = signal('var(--accent-green)');

  private resizeHandler: (() => void) | null = null;

  private readonly collabData: CollabEntry[] = [
    { label: 'Single Car', miou: 29.20, iou: 67.76 },
    { label: 'Zero-Shot', miou: 30.54, iou: 67.88 },
    { label: 'Naive Share', miou: 36.02, iou: 70.10 },
    { label: 'Smart Fusion', miou: 37.44, iou: 72.87 },
  ];
  private readonly coHFFCollab = { miou: 34.16, iou: 50.46 };
  private readonly gaussMin = { miou: 35.50, iou: 71.81, comm: 0.27 };
  private readonly gaussMax = { miou: 37.44, iou: 72.87, comm: 1.07 };
  private readonly coHFFComm = 0.78;

  constructor() {
    afterNextRender(() => {
      setTimeout(() => {
        this.updateCollab(0);
        this.updateGauss(0);
      }, 200);

      this.resizeHandler = () => {
        this.updateCollab(this.collabValue());
        const gaussSlider = document.getElementById('gauss-slider') as HTMLInputElement | null;
        if (gaussSlider) this.updateGauss(parseInt(gaussSlider.value, 10));
      };
      window.addEventListener('resize', this.resizeHandler);
    });
  }

  ngOnDestroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  onCollabChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.updateCollab(val);
  }

  onGaussChange(event: Event): void {
    const pct = parseInt((event.target as HTMLInputElement).value, 10);
    this.updateGauss(pct);
  }

  private updateCollab(val: number): void {
    this.collabValue.set(val);
    const d = this.collabData[val];

    this.collabLabels.set(this.collabData.map((_, i) => i === val));
    this.collabMiou.set(d.miou.toFixed(1));
    this.collabIou.set(d.iou.toFixed(1));

    const diff = (d.miou - this.coHFFCollab.miou).toFixed(2);
    if (val === 0) {
      this.collabVs.set('Baseline');
      this.collabVsColor.set('var(--text-muted)');
    } else {
      this.collabVs.set((parseFloat(diff) >= 0 ? '+' : '') + diff);
      this.collabVsColor.set(parseFloat(diff) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)');
    }

    const canvas = this.collabChartCanvas()?.nativeElement;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);

    const goldHex = '#CFB991';
    const goldDim = '#9E8B6E';
    const bars = this.collabData.map((cd, i) => ({
      val: cd.miou,
      label: cd.label,
      refLine: i === 0 ? this.coHFFCollab.miou : undefined,
    }));
    bars[0].refLine = this.coHFFCollab.miou;
    const colors = this.collabData.map((_, i) => i === val ? goldHex : goldDim + '88');
    this.drawBarChart(ctx, canvas.offsetWidth, canvas.offsetHeight, bars, 45, colors);
  }

  private updateGauss(pct: number): void {
    const t = pct / 100;
    const miou = this.lerp(this.gaussMin.miou, this.gaussMax.miou, t);
    const comm = this.lerp(this.gaussMin.comm, this.gaussMax.comm, t);
    const count = Math.round(this.lerp(6400, 25600, t));
    const pctOfCoHFF = ((comm / this.coHFFComm) * 100).toFixed(1);

    this.gaussMiou.set(miou.toFixed(1));
    this.gaussComm.set(comm.toFixed(2));
    this.gaussPct.set(pctOfCoHFF + '%');
    this.gaussPctColor.set(parseFloat(pctOfCoHFF) < 100 ? 'var(--accent-green)' : 'var(--gold)');

    const canvas = this.gaussChartCanvas()?.nativeElement;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);

    const bars = [
      { val: this.coHFFCollab.miou, label: 'CoHFF', refLine: this.coHFFCollab.miou },
      { val: miou, label: `Ours ${(count / 1000).toFixed(1)}K` },
    ];
    this.drawBarChart(ctx, canvas.offsetWidth, canvas.offsetHeight, bars, 45, ['#6688BB', '#CFB991']);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private drawBarChart(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    bars: { val: number; label: string; refLine?: number }[],
    maxVal: number,
    colors: string[],
  ): void {
    ctx.clearRect(0, 0, W, H);
    const pad = 8;
    const barW = (W - pad * (bars.length + 1)) / bars.length;

    bars.forEach((bar, i) => {
      const barH = (bar.val / maxVal) * (H - 30);
      const x = pad + i * (barW + pad);
      const y = H - barH - 20;

      const grd = ctx.createLinearGradient(x, y, x, H - 20);
      grd.addColorStop(0, colors[i]);
      grd.addColorStop(1, colors[i].slice(0, 7) + '55');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, barW, barH);

      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barW, barH);

      ctx.fillStyle = colors[i];
      ctx.font = `bold ${Math.max(9, barW * 0.22)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(bar.val.toFixed(1), x + barW / 2, y - 3);

      ctx.fillStyle = '#998E7A';
      ctx.font = `${Math.max(8, barW * 0.16)}px 'JetBrains Mono', monospace`;
      ctx.fillText(bar.label.substring(0, Math.floor(barW / 6) + 3), x + barW / 2, H - 5);
    });

    if (bars[0]?.refLine !== undefined) {
      const refY = H - 20 - (bars[0].refLine / maxVal) * (H - 30);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#8888FF88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, refY);
      ctx.lineTo(W, refY);
      ctx.stroke();
      ctx.fillStyle = '#8888FF88';
      ctx.font = '8px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`CoHFF: ${bars[0].refLine}`, W - 2, refY - 2);
      ctx.restore();
    }
  }
}
