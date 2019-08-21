import requests
import argparse
import json
import random

from google.cloud import datastore

def create_datastore_client():
  return datastore.Client.from_service_account_json('datastore-import-key.json')

API_URL_TEMPLATE='https://opentdb.com/api.php?amount=%d&category=%d&difficulty=%s'

def read_questions(number_of_questions, category, difficulty):
    response = requests.get(url=(API_URL_TEMPLATE % (number_of_questions, category, difficulty)))
    return response.json()['results']

if __name__ == '__main__':
    parser = argparse.ArgumentParser()

    parser.add_argument('--number_of_questions', help='Number of questions.', default=30)
    parser.add_argument('--category', help='Category')
    parser.add_argument('--difficulty', help='Difficulty')

    args = parser.parse_args()
    ds = create_datastore_client()
    category = int(args.category)

    response = read_questions(int(args.number_of_questions), category, args.difficulty)
    transformed = []
    for (index, value) in enumerate(response):
        q = {
            'id': str(index),
            'text': value['question'],
            'type' : value['type'],
        }
        answer_choices = [{
            'text': value['correct_answer'],
            'is_correct': True
        }]
        for a in value['incorrect_answers']:
            answer_choices.append({
                'text': a,
                'is_correct': False
            })
        random.shuffle(answer_choices)
        q['answer_choices'] = []
        for (a_index, a) in enumerate(answer_choices):
            a['id'] = a_index + 1
            q['answer_choices'].append(a)
        transformed.append(q)

    quiz = {
        'category': category,
        'difficulty': args.difficulty,
        'questions': transformed
    }

    print(json.dumps(quiz, indent=2))
