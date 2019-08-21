import { Component, OnInit } from '@angular/core';
import { Category, CategoryService } from '../category.service';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit {

  category: Observable<Category>; 

  constructor(
    private categoryService: CategoryService,
    private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.paramMap.pipe(map(params => params.get('cid'))).subscribe(
      categoryId => {
        console.log(categoryId);
        this.category = this.categoryService.getCategory(categoryId);
      });
  }

}
