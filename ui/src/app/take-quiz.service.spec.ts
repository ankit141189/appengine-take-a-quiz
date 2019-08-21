import { TestBed } from '@angular/core/testing';

import { TakeQuizService } from './take-quiz.service';

describe('TakeQuizService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TakeQuizService = TestBed.get(TakeQuizService);
    expect(service).toBeTruthy();
  });
});
