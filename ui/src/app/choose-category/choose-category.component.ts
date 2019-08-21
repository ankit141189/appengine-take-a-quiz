import { Component, OnInit } from '@angular/core';
import { CategoryService, Category } from '../category.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-choose-category',
  templateUrl: './choose-category.component.html',
  styleUrls: ['./choose-category.component.css']
})
export class ChooseCategoryComponent {

  categories: Observable<Category[]> = this.categoryService.getCategories();

  constructor(private categoryService: CategoryService, private router: Router) { }

  selectQuiz(categoryId: string) {
    this.router.navigate(['/category', categoryId]);
  }

}
