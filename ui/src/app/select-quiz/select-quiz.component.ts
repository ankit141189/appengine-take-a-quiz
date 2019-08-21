import { Component, OnInit, Input } from '@angular/core';
import { QuizService, Quiz } from '../quiz.service';
import { Category, CategoryService } from '../category.service';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { map, tap } from 'rxjs/operators';

@Component({
  selector: 'app-select-quiz',
  templateUrl: './select-quiz.component.html',
  styleUrls: ['./select-quiz.component.css']
})
export class SelectQuizComponent implements OnInit {

  quizList: Observable<Quiz[]>;

  constructor(
    private quizSerive : QuizService,
    private categoryService: CategoryService,
    private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.parent.paramMap.pipe(map(params => params.get('cid'))).subscribe(
      categoryId => {
        console.log(categoryId);
        this.quizList = this.quizSerive.getQuizesForCategory(categoryId)
        this.quizList.subscribe(res => console.log(res));
      });
  }

}
