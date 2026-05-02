import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

# Connect to DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
table = dynamodb.Table('QueueData')

# Fix Decimal serialization issue from DynamoDB
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def lambda_handler(event, context):
    method = event.get('httpMethod', '')

    # POST /predict - Calculate and save prediction
    if method == 'POST':
        try:
            body = json.loads(event.get('body', '{}'))
            people   = int(body['people'])
            avg_time = float(body['avg_time'])

            # Prediction Formula
            wait_time = round(people * avg_time, 2)

            # Save to DynamoDB
            item = {
                'id':             str(uuid.uuid4()),
                'people':         people,
                'avg_time':       str(avg_time),
                'predicted_time': str(wait_time),
                'timestamp':      datetime.utcnow().isoformat()
            }
            table.put_item(Item=item)

            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'wait_time': wait_time,
                    'message': 'Prediction saved!'
                }, cls=DecimalEncoder)
            }

        except Exception as e:
            return error_response(400, str(e))

    # GET /history - Fetch all records
    elif method == 'GET':
        try:
            response = table.scan()
            items = response.get('Items', [])

            # Sort by latest first
            items.sort(
                key=lambda x: x.get('timestamp', ''),
                reverse=True
            )

            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'count': len(items),
                    'records': items
                }, cls=DecimalEncoder)
            }

        except Exception as e:
            return error_response(500, str(e))

    else:
        return error_response(405, 'Method Not Allowed')


# CORS headers for React frontend
def cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }

# Standard error response
def error_response(code, msg):
    return {
        'statusCode': code,
        'headers': cors_headers(),
        'body': json.dumps({'error': msg})
    }
