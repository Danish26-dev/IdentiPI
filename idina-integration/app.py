import os
import time
import json
import base64
import random
import string
import urllib.request
import tempfile
from flask import Flask, render_template, request, jsonify
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# AWS configuration
AWS_REGION = os.environ.get("AWS_DEFAULT_REGION", "ap-south-1")
S3_BUCKET = os.environ.get("S3_BUCKET", "idina-hackathon-bucket") # Will wait for your real bucket

# Attempt to initialize AWS clients
try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    transcribe_client = boto3.client('transcribe', region_name=AWS_REGION)
    bedrock_client = boto3.client('bedrock-runtime', region_name=AWS_REGION)
    polly_client = boto3.client('polly', region_name=AWS_REGION)
    
    # Quick check if configured properly (will fail if no credentials)
    boto3.Session().get_credentials().get_frozen_credentials()
    aws_configured = True
    print("AWS configured successfully. Using real services.")
except Exception as e:
    print(f"Warning: AWS credentials not found or invalid. Running in local Mock Demo Mode. Error: {e}")
    aws_configured = False


@app.route('/')
def index():
    return render_template('index.html')


def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def transcribe_audio(file_path):
    """
    Handles Amazon Transcribe logic.
    For a hackathon demo, this uploads to S3, starts transcription, and polls for result.
    If no AWS credentials exist, returns a mocked result.
    """
    if not aws_configured:
        print("Mock: Transcribing audio from file...")
        time.sleep(1.5) # simulate network latency
        return "Create my decentralized identity please."

    job_name = f"idina-transcribe-{random_string()}"
    file_name = f"audio-{random_string()}.webm"
    s3_uri = f"s3://{S3_BUCKET}/{file_name}"

    try:
        # 1. Upload audio to S3
        print(f"Uploading file to {s3_uri}")
        s3_client.upload_file(file_path, S3_BUCKET, file_name)

        # 2. Start transcription
        print(f"Starting Transcription via Amazon Transcribe: {job_name}")
        transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': s3_uri},
            MediaFormat='webm',
            LanguageCode='en-US'
        )

        # 3. Poll for completion
        while True:
            status = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
            job_status = status['TranscriptionJob']['TranscriptionJobStatus']
            if job_status in ['COMPLETED', 'FAILED']:
                break
            time.sleep(1) # Faster polling for the hackathon demo

        # 4. Fetch the transcript JSON from the signed URL
        if job_status == 'COMPLETED':
            transcript_file_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
            with urllib.request.urlopen(transcript_file_uri) as response:
                data = json.loads(response.read().decode('utf-8'))
                transcript = data['results']['transcripts'][0]['transcript']
                print(f"Amazon Transcribe Output: {transcript}")
                return transcript
        else:
            print("Amazon Transcribe Job Failed:", status)
            return "Sorry, there was an issue understanding the speech."

    except Exception as e:
        print(f"AWS Transcribe Exception: {e}")
        # Graceful fallback so demo doesn't crash completely
        return "Create my digital identity."


def bedrock_get_intent(text):
    """
    Invokes Amazon Bedrock Llama 3 Instruct model to map text to a backend identity action.
    """
    if not aws_configured:
        print("Mock: Analyzing intent via Amazon Bedrock...")
        time.sleep(1.2)
        return {
            "action_id": "CREATE_DID",
            "spoken_response": "Your decentralized identity has been created successfully."
        }

    # System instruction tailored for Amazon Bedrock Llama 3 Instruct 
    prompt = f"""
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are Idina, a voice-only AI assistant for a Web3 decentralized identity platform.
You manage: decentralized identifiers, verifiable credentials, verification requests, and reliability scores.

Based on the user's transcribed speech below:
1. Identify the ONE matching backend action identifier from this exact list:
   - CREATE_DID (Create decentralized identity)
   - SHOW_SCORE (Show identity reliability score)
   - REQUEST_VERIFICATION (Request credential verification)
   - APPROVE_REQUEST (Approve verification request)
   - CHECK_STATUS (Check credential status)
   - UNKNOWN (If the intent doesn't match the list)
2. Generate a highly conversational, voice-friendly spoken response. Do not use asterisks or emojis. Keep it under 2 sentences.

IMPORTANT: Respond ONLY with a raw JSON object containing exactly two keys: "action_id" and "spoken_response". Do not output markdown code blocks.
<|eot_id|><|start_header_id|>user<|end_header_id|>
User's speech: "{text}"
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

    # Amazon Bedrock payload for Llama 3 models
    body = json.dumps({
        "prompt": prompt,
        "max_gen_len": 200,
        "temperature": 0.1,
        "top_p": 0.9
    })

    try:
        print("Invoking Bedrock (Meta Llama 3 Instruct)...")
        response = bedrock_client.invoke_model(
            modelId='meta.llama3-8b-instruct-v1:0', # Must have requested access to Llama 3 inside AWS Bedrock Console
            body=body,
            accept='application/json',
            contentType='application/json'
        )
        response_body = json.loads(response.get('body').read())
        generation = response_body.get('generation', '').strip()
        
        # Parse output and return dict
        parsed_response = json.loads(generation)
        print(f"Bedrock Output: {parsed_response}")
        return parsed_response

    except Exception as e:
        print(f"Bedrock Exception: {e}")
        return {
            "action_id": "UNKNOWN",
            "spoken_response": "I encountered an error connecting to the Amazon Bedrock model cluster."
        }


def synthesize_speech(text):
    """
    Connects to Amazon Polly for Natural Neural TTS generation.
    Returns the MP3 data encoded as base64 for fast HTML5 Audio playback.
    """
    if not aws_configured:
        print("Mock: Generating speech via Amazon Polly...")
        return None # We rely on a default beep sound, or simply update UI without audio for mock mode.

    try:
        print("Synthesizing speech via Amazon Polly...")
        # Ruth is a very human-like neural voice available on Amazon Polly
        response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId='Ruth',
            Engine='neural' 
        )
        if "AudioStream" in response:
            audio_bytes = response["AudioStream"].read()
            return base64.b64encode(audio_bytes).decode('utf-8')
    except Exception as e:
        print(f"Polly Exception: {e}")
        return None


@app.route('/api/interact', methods=['POST'])
def interact():
    if 'audio_file' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio_file']
    
    # Store the webm file safely, especially on Windows
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"request_{random_string()}.webm")
    audio_file.save(file_path)

    try:
        # STEP 1: Amazon Transcribe (Speech-to-Text)
        transcription = transcribe_audio(file_path)

        # STEP 2: Amazon Bedrock (Intent routing & Response creation)
        ai_payload = bedrock_get_intent(transcription)
        action_id = ai_payload.get("action_id", "UNKNOWN")
        spoken_response = ai_payload.get("spoken_response", "I'm sorry, I couldn't map that to an identity action.")

        # STEP 3: Amazon Polly (Text-to-Speech)
        audio_base64 = synthesize_speech(spoken_response)

        return jsonify({
            "transcription": transcription,
            "action_id": action_id,
            "spoken_response": spoken_response,
            "audio_base64": audio_base64
        })

    finally:
        # Clean up the local temp audio file
        if os.path.exists(file_path):
            os.remove(file_path)


if __name__ == '__main__':
    # Run server locally.
    print("=" * 60)
    print("Starting Idina Identity Assistant...")
    print("WARNING: To fully utilize AWS, ensure AWS credentials and Region are configured locally!")
    print("=" * 60)
    app.run(debug=True, port=5000)
