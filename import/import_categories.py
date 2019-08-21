import requests
import argparse

from google.cloud import datastore

def create_datastore_client():
  return datastore.Client.from_service_account_json('datastore-import-key.json')


def read_categories():
  response = requests.get(url='https://opentdb.com/api_category.php')
  return response.json()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers()

    parser.add_argument('--project-id', help='Your cloud project ID.')

    args = parser.parse_args()
    client = create_datastore_client()

    print('Staring category import...')
    categories = read_categories()['trivia_categories']
    batch = client.batch()
    with batch:
        for category in categories:
            print(category, end='\n')
            key = client.key('Category', category['id'])
            category_entity = datastore.Entity(key)
            category_entity['name'] = category['name']
            batch.put(category_entity)
