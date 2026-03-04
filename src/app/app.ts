import { Component } from '@angular/core';
import { NavComponent } from './nav/nav';
import { HeroComponent } from './hero/hero';
import { ProblemComponent } from './problem/problem';
import { SolutionComponent } from './solution/solution';
import { InteractiveComponent } from './interactive/interactive';
import { ResultsComponent } from './results/results';
import { FooterComponent } from './footer/footer';

@Component({
  selector: 'app-root',
  imports: [
    NavComponent,
    HeroComponent,
    ProblemComponent,
    SolutionComponent,
    InteractiveComponent,
    ResultsComponent,
    FooterComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
