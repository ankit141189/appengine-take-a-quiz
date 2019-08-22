import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, mapTo, flatMap, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import decode from 'unescape';


export interface Quiz {
  id: string
  title: string
  difficulty: string
  question_count: number
}

export interface Question {
  id : string,
  text: string,
  answer_choices: {
    id: string,
    text: string
  }[]
}

export interface SubmitAnswerResponse {
  code: SubsmitAnswerResponseCode,
  correct_answer: {
    id: string,
    text: string
  }[]
  question_scores: QuestionScores
}

export type QuestionScores = Map<string, number>

export type SubsmitAnswerResponseCode = 'CORRECT'| 'INCORRECT'|'ALREADY_ANSWERED'

const API_BASE_URL = "/api/quizes"
const CREDENTIALS_OPTIONS =  {
  headers: {
    'Access-Control-Allow-Credentials': 'true',
  },
  withCredentials: true
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {

  constructor(private httpClient: HttpClient) { }

  getQuizesForCategory(categoryId: string): Observable<Quiz[]> {
    return this.httpClient.get(API_BASE_URL, {
      params: {
        category: categoryId
      }
    }).pipe(map(response => response as Quiz[]))
  }

  getQuiz(quizId: string): Observable<Quiz> {
    return this.httpClient.get(API_BASE_URL + '/' + quizId).pipe(map(respose => respose as Quiz))
  }

  startQuiz(quizId: string):  Observable<QuestionScores> {
    return this.httpClient.post(API_BASE_URL + `/${quizId}/start`, {}, CREDENTIALS_OPTIONS)
      .pipe(map(res => res['question_scores'] as QuestionScores));
  }
  
  requestNextQuestions(quizId: string, size: number): Observable<Question[]> {
    return this.httpClient.post(API_BASE_URL + `/${quizId}/next`, {
      n: size
    }, CREDENTIALS_OPTIONS)
      .pipe(map(res => res as Question[]), tap(qs => qs.forEach(q => {
        q.text = decode(q.text)
      })));

  }

  submitAnswer(quizId: string, questionId: string, answerId: string):Observable<SubmitAnswerResponse> {
    return this.httpClient.post(API_BASE_URL + `/${quizId}/submitanswer`, {
      question_id: questionId,
      answer_id: answerId
    }, CREDENTIALS_OPTIONS).pipe(map(res => res as SubmitAnswerResponse))
  }

  reset(quizId: string): Promise<any> {
    return this.httpClient.post(API_BASE_URL + `/${quizId}/reset`, {},  CREDENTIALS_OPTIONS).toPromise();
  }
}
