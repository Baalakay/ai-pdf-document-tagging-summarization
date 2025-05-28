import boto3

bedrock = boto3.client('bedrock', region_name='us-east-1')  # Note: not 'bedrock-runtime'

response = bedrock.list_foundation_models()

print("Available Bedrock Models:")
for model in response.get('modelSummaries', []):
    print(f"Model ID: {model['modelId']} | Name: {model['modelName']}") 