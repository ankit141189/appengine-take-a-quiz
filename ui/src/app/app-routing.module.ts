import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ChooseCategoryComponent } from './choose-category/choose-category.component';
import { SelectQuizComponent } from './select-quiz/select-quiz.component';
import { QuizComponent } from './quiz/quiz.component';
import { QuestionComponent } from './question/question.component';
import { CategoryComponent } from './category/category.component';


const routes: Routes = [
  { 
    path: 'choose-category',
    component: ChooseCategoryComponent,
  },
  {
    path: '',
    redirectTo: 'choose-category',
    pathMatch: 'full'
  },
  { 
    path: 'category/:cid',
    component: CategoryComponent,
    children: [{
      path: '',
      component: SelectQuizComponent
    }, {
      path: 'quiz/:quizId',
      component: QuizComponent,
      children: [{
        path: 'question',
        component: QuestionComponent
      }, {
        path: '',
        redirectTo: 'question',
        pathMatch: 'full'
      },]
    }]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
