import boto3, json, os;
from dotenv import load_dotenv;
load_dotenv();

try:
    client = boto3.client('bedrock-runtime', region_name='ap-south-1');
    body=json.dumps({'prompt': 'test', 'max_gen_len': 10, 'temperature': 0.1, 'top_p': 0.9});
    print("Testing bedrock model invoke...");
    response = client.invoke_model(modelId='meta.llama3-8b-instruct-v1:0', body=body)
    print("SUCCESS!")
    print(response['body'].read())
except Exception as e:
    print("EXCEPTION:")
    print(e)
