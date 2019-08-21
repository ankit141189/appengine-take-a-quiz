import { Component, OnInit, Self, Host, Optional } from '@angular/core';
import { Observable } from 'rxjs';
import { Quiz, QuizService } from '../quiz.service';
import { ActivatedRoute, Router } from '@angular/router';
import { map, shareReplay } from 'rxjs/operators';
import { TakeQuizService } from '../take-quiz.service';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css'],
  providers: [{
    provide: TakeQuizService,
    deps: [
      QuizService
    ],
    useFactory: (quizService) => new TakeQuizService(quizService)
  }]
})
export class QuizComponent implements OnInit {

  takeQuiz: TakeQuizService
  get quiz(): Quiz {
    return this.takeQuiz.quiz;
  }

  constructor(
    @Self() takeQuiz: TakeQuizService,
    private route: ActivatedRoute,
    private router: Router) {
      this.takeQuiz = takeQuiz;
  }

  ngOnInit() {
    this.route.paramMap.pipe(map(params => params.get('quizId'))).subscribe(
      quizId => this.takeQuiz.setQuiz(quizId))
  }

  startAgain() {
    this.takeQuiz.startAgain();
  }
}
