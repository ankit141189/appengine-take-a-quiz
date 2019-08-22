import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap,  } from 'rxjs/operators';

export interface Category {
  name: string
  id: string
  quiz_count: number
}
const URL = '/api/categories'
@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  categories: Observable<Category[]> = this.httpClient.get(URL).pipe(
    tap(res => console.log(res)),
    map(response => response as Category[]), shareReplay())

  constructor(private httpClient: HttpClient) { }

  getCategories(): Observable<Category[]> {
    return this.categories;
  }

  getCategory(categoryId: string): Observable<Category> {
    return this.categories.pipe(map(allValues => allValues.find(val => val.id == categoryId)));
  }
}
