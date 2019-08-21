import { Component, OnInit, ViewChild } from '@angular/core';
import { TakeQuizService } from '../take-quiz.service';
import { Question } from '../quiz.service';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent {

  @ViewChild(MatRadioGroup, {static: false}) choiceGroup: MatRadioGroup;
  @ViewChild(MatRadioButton, {static: false}) choiceButton: MatRadioButton;
  choiceFormControl = new FormControl('', Validators.required);

  constructor(private takeQuiz : TakeQuizService) {
    this.takeQuiz.resetEvent.subscribe(_ => {
      if (this.choiceGroup.selected) {
        this.choiceGroup.selected.checked = false;
      }
    })  
  }

  get question(): Question {
    return this.takeQuiz.currentQuestion;
  }

  submit() {
    this.takeQuiz.submitAnswer(this.choiceGroup.value);
  }

  invalid() {
    return this.choiceFormControl.invalid
  }

  next() {
    this.takeQuiz.moveToNextQuestion();
  }
}
