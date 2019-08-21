from flask import Flask, jsonify, request, session
from google.cloud import datastore
from flask_cors import cross_origin
import random

app = Flask(__name__)
app.secret_key = 'super secret key'
ds = datastore.Client()

CATEGORY_KIND = 'Category'
QUIZ_KIND = 'Quiz'
QUESTION_KIND = 'Question'
QUESTION_SESSION = 'QuestionSession'
PAGE_LIMIT = 10


@app.route('/api/categories', methods=['GET'])
@cross_origin()
def get_categories():
    query = ds.query(kind=CATEGORY_KIND)
    result = []
    for e in query.fetch():
        entity_with_id = {}
        entity_with_id.update(e)
        entity_with_id['id'] = e.id
        result.append(entity_with_id)
    return jsonify(result)


@app.route('/api/quizes', methods=['GET'])
@cross_origin()
def search_quizes():
    category = request.args.get('category')
    print('Searching quizes for category %s' % category)
    query = ds.query(kind=QUIZ_KIND)
    query.add_filter('category', '=', int(category))
    result = []
    for q in query.fetch():
        q_with_id = {}
        q_with_id.update(q)
        q_with_id['id'] = q.key.id_or_name
        result.append(q_with_id)
    return jsonify(result)


@app.route('/api/quizes/<quiz_id>', methods=['GET'])
@cross_origin()
def get_quiz(quiz_id):
    quiz_entity = ds.get(ds.key(QUIZ_KIND, quiz_id))
    quiz_entity['id'] = quiz_entity.key.id_or_name
    return jsonify(quiz_entity)


@app.route('/api/quizes/<quiz_id>/questions', methods=['GET'])
@cross_origin()
def list_questions(quiz_id):
    quiz_key = ds.key(QUIZ_KIND, quiz_id)
    quiz_entity = ds.get(quiz_key)
    version = quiz_entity['version']
    query = ds.query(kind=QUESTION_KIND, ancestor=quiz_key)
    query.add_filter('version', '=', version)
    result = []
    for q in query.fetch():
        q_with_id = {}
        q_with_id.update(q)
        q_with_id['id'] = q.key.name
        result.append(q_with_id)
    return jsonify(result)


def get_one_page_of_questions(quiz_id, cursor=None):
    quiz_key = ds.key(QUIZ_KIND, quiz_id)
    query = ds.query(kind=QUESTION_KIND, ancestor=quiz_key)
    query.keys_only()
    query_iter = query.fetch(start_cursor=cursor, limit=5)
    page = next(query_iter.pages)
    questions = list(page)
    next_cursor = query_iter.next_page_token
    return questions, next_cursor if next_cursor is not None else None


@app.route('/api/quizes/<quiz_id>/start', methods=['POST'])
@cross_origin(supports_credentials=True)
def start_quiz(quiz_id):
    quiz_key = ds.key(QUIZ_KIND, quiz_id)
    quiz_sessions = session['quiz-sessions'] = session.get('quiz-sessions', {})
    if quiz_id not in quiz_sessions.keys():
        print('Creating new session')
        quiz_session_entity = create_quiz_session(quiz_key)
    else:
        print('Re-using existing session')
        quiz_session_entity = ds.get(ds.key(QUESTION_SESSION, quiz_sessions[quiz_id], parent=quiz_key))
        if quiz_session_entity is None:
            quiz_session_entity = create_quiz_session(quiz_key)
    quiz_sessions[quiz_id] = quiz_session_entity.id
    result = {}
    result['question_scores'] = {k:v for (k,v) in quiz_session_entity['questions'].items() if v != -1}
    return jsonify(result)

def create_quiz_session(quiz_key):
    quiz_session_entity = datastore.Entity(ds.key(QUESTION_SESSION, parent=quiz_key))
    quiz_session_entity['questions'] = {}
    quiz_session_entity['EOQ'] = False
    ds.put(quiz_session_entity)
    return quiz_session_entity

@app.route('/api/quizes/<quiz_id>/next', methods=['POST'])
@cross_origin(supports_credentials=True)
def next_questions(quiz_id):
    quiz_key = ds.key(QUIZ_KIND, quiz_id)
    request_page_size = int(request.json['n'])
    quiz_session = session['quiz-sessions'][quiz_id]

    quiz_session_entity = ds.get(ds.key(QUESTION_SESSION, quiz_session, parent=quiz_key))
    unanswered_questions = [k for (k,v) in quiz_session_entity['questions'].items() if v == -1]
    print(quiz_session_entity)
    if len(unanswered_questions) < request_page_size and not quiz_session_entity['EOQ']:
        print('Fetching a page of questions')
        questions, next_cursor = get_one_page_of_questions(quiz_id, quiz_session_entity.get('next_cursor', None))
        for q in questions:
            print(q)
            quiz_session_entity['questions'][q.key.name] = -1
            unanswered_questions.append(q.key.name)
        quiz_session_entity['next_cursor'] = next_cursor
        quiz_session_entity['EOQ'] = next_cursor is None
    ds.put(quiz_session_entity)

    questions = unanswered_questions[:request_page_size]
    random.shuffle(questions)
    question_entities = ds.get_multi([ds.key(QUESTION_KIND, q, parent=quiz_key) for q in questions])
    result = []
    for q in question_entities:
        q_with_id = {}
        q_with_id.update(q)
        q_with_id['id'] = q.key.name
        result.append(q_with_id)
    return jsonify(result)


@app.route('/api/quizes/<quiz_id>/submitanswer', methods=['POST'])
@cross_origin(supports_credentials=True)
def submit_answer(quiz_id):
    quiz_key = ds.key(QUIZ_KIND, quiz_id)
    quiz_session = session['quiz-sessions'][quiz_id]
    question_reply = request.json
    question_id = question_reply.get('question_id')
    user_answer_id = question_reply['answer_id']
    question_entity = ds.get(ds.key(QUESTION_KIND, question_id, parent=quiz_key))
    correct_answer = [a for a in question_entity['answer_choices'] if a['is_correct']]

    quiz_session_entity = ds.get(ds.key(QUESTION_SESSION, quiz_session, parent=quiz_key))
    print(quiz_session_entity['questions'][question_id])
    if quiz_session_entity['questions'][question_id] != -1:
        return jsonify({
            'code': 'ALREADY_ANSWERED',
            correct_answer: correct_answer
        })

    success = len([a for a in correct_answer if a['id'] == user_answer_id ]) > 0
    score = 1 if success else 0
    response_code = 'CORRECT' if success else 'INCORRECT'

    quiz_session_entity = ds.get(ds.key(QUESTION_SESSION, quiz_session, parent=quiz_key))
    quiz_session_entity['questions'][question_id] = score
    ds.put(quiz_session_entity)

    return jsonify({
        'code': response_code,
        'correct_answer': correct_answer,
        'question_scores': {k:v for (k,v) in quiz_session_entity['questions'].items() if v != -1}
    })



@app.route('/api/quizes/<quiz_id>/reset', methods=['POST'])
@cross_origin(supports_credentials=True)
def reset(quiz_id):
    if 'quiz-sessions' not in session.keys():
        return jsonify({})
    print(session['quiz-sessions'])
    if quiz_id in session['quiz-sessions'].keys():
        ds.delete(ds.key(QUESTION_SESSION, session['quiz-sessions'][quiz_id], parent=ds.key(QUIZ_KIND, quiz_id)))
        session['quiz-sessions'].pop(quiz_id)

    return jsonify({})


@app.route('/api/quizes/upsert', methods=['POST'])
@cross_origin()
def create_quiz():
    create_quiz_request = request.json

    print(create_quiz_request)
    with ds.transaction():
        quiz_id = create_quiz_request['id']
        quiz_key = ds.key(QUIZ_KIND, quiz_id)
        existing_quiz_entity = ds.get(quiz_key)
        req_quiz_entity = datastore.Entity(key=quiz_key)
        req_quiz_entity['title'] = create_quiz_request['title']
        if 'desc' in create_quiz_request.keys():
            req_quiz_entity['desc'] = create_quiz_request['desc']
        req_quiz_entity['category'] = create_quiz_request['category']
        req_quiz_entity['difficulty'] = create_quiz_request['difficulty']
        if existing_quiz_entity is None:
            new_version = req_quiz_entity['version'] = 1
            category_key = ds.key(CATEGORY_KIND, req_quiz_entity['category'])
            category = ds.get(category_key)
            if category is None:
                raise Exception('Category %s not found' % (req_quiz_entity['category']))

            category['quiz_count'] = category.get('quiz_count', 0) + 1
            ds.put(category)
        else:
            new_version = req_quiz_entity['version'] = existing_quiz_entity['version'] + 1
            if req_quiz_entity['category'] != existing_quiz_entity['category']:
                new_category = ds.get(ds.key(CATEGORY_KIND, req_quiz_entity['category']))
                existing_category = ds.get(ds.key(CATEGORY_KIND, existing_quiz_entity['category']))
                existing_category['quiz_count'] -= 1
                new_category['quiz_count'] = new_category.get('quiz_count', 0) + 1
                ds.put_multi([new_category, existing_category])

        req_quiz_entity['question_count'] = create_quiz_request['questions'].length
        ds.put(req_quiz_entity)

        for q in create_quiz_request['questions']:
            q_key = ds.key(QUESTION_KIND, q['id'], parent=quiz_key)
            q_entity = datastore.Entity(q_key)
            q_entity['text'] = q['text']
            q_entity['type'] = q['type']
            answer_choices = []
            for a in q['answer_choices']:
                answer_choice = {
                    'id': a['id'],
                    'text': a.get('text', ''),
                    'is_correct': a.get('is_correct', False)
                }
                answer_choices.append(answer_choice)
            q_entity['answer_choices'] = answer_choices
            q_entity['version'] = new_version
            ds.put(q_entity)
        return jsonify({})


if __name__ == '__main__':
    app.run(debug=True)
