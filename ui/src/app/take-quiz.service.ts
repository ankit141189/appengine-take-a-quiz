import { Injectable } from '@angular/core';
import { Quiz, QuizService, Question, QuestionScores } from './quiz.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TakeQuizService {
  quizId: string
  quiz: Quiz
  currentQuestion: Question
  submittedAnswerId: string  
  result: boolean
  correctAnswer: {
    id: string
    text: string
  }
  questionBatch: Question[]
  questionIndex: number;
  nextQ: boolean
  done: boolean
  resetEvent = new Subject<void>();
  questionScores: QuestionScores
  totalAnswers: number
  correctAnswers: number
  started: boolean

  constructor(private quizService: QuizService) {
   }

  setQuiz(quizId : string) {
    this.quizService.getQuiz(quizId).subscribe(res => {
      this.quiz = res;
    });
    this.quizId = quizId;
    this.quizService.startQuiz(quizId).subscribe(resA => {
      this.questionScores = new Map<string, number>(Object.entries(resA));
      console.log(this.questionScores)
      this.calculateScore();
      this.started = true
      this.quizService.requestNextQuestions(quizId, 5).subscribe(resB => {
        this.questionBatch = resB;
        this.currentQuestion = this.questionBatch[0]
      })
    });
    this.questionIndex = 0;
    this.nextQ = false;
    this.correctAnswer = undefined;
    this.result = undefined;
    this.submittedAnswerId = undefined;
    this.done = false;
  }

  submitAnswer(answerId: string) {
    if (this.submittedAnswerId) {
      throw Error('Answer already submitted for this question');
    }
    this.submittedAnswerId = answerId;
    return this.quizService.submitAnswer(this.quizId, this.currentQuestion.id, answerId).subscribe(response => {
      this.correctAnswer = response.correct_answer[0]
      this.nextQ = true;
      this.questionScores = new Map<string, number>(Object.entries(response.question_scores))
      this.calculateScore();
      switch (response.code) {
        case 'CORRECT':
          this.result = true
          break;
        case 'INCORRECT':
          this.result = false
          break;
        case 'ALREADY_ANSWERED':
            throw Error('Answer already submitted for this question');
      }
    });
  }

  moveToNextQuestion() {
    if (this.questionBatch.length < 2) {
      this.quizService.requestNextQuestions(this.quizId, 7).subscribe(res => {
        res.filter(a => this.questionBatch.findIndex(b => b.id == a.id )== -1).forEach(a  =>this.questionBatch.push(a));
        this._moveToNextQuestion();
      })
    } else {
      this._moveToNextQuestion();
    }    
  }

  _moveToNextQuestion() {
    this.questionIndex++;
    this.nextQ = false;
    this.correctAnswer = undefined;
    this.result = undefined;
    this.submittedAnswerId = undefined;
    if (this.questionIndex >= this.questionBatch.length) {
      this.done = true
      this.currentQuestion = undefined
    } else {
      this.currentQuestion = this.questionBatch[this.questionIndex];
    }
    this.resetEvent.next(null);
  }

  startAgain() : Promise<void> {
    this.started = false
    return this.quizService.reset(this.quizId).then(_ => { 
      this.setQuiz(this.quizId)
      this.resetEvent.next(null)
    });
  }

  calculateScore() {
    this.totalAnswers = Array.from(this.questionScores.keys()).length
    this.correctAnswers = Array.from(this.questionScores.values()).filter(v => v==1).length
  }
}
