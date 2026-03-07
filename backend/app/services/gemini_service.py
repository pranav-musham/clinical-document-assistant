"""Google Gemini AI Service for Audio Transcription and SOAP Note Generation"""

import asyncio
import logging
import os
from typing import Dict
from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    """Service for interacting with Google Gemini AI"""

    def __init__(self):
        """Initialize Gemini service with API key from settings"""
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set. AI features will not work.")
            self.configured = False
            return

        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-2.0-flash-lite"
        self.configured = True
        logger.info("Gemini AI service initialized successfully")

    async def transcribe_audio(self, audio_path: str) -> str:
        """
        Transcribe audio file to text using Gemini.

        Args:
            audio_path: Path to audio file

        Returns:
            Transcribed text

        Raises:
            Exception: If transcription fails or service not configured
        """
        if not self.configured:
            raise Exception("Gemini API not configured. Please set GEMINI_API_KEY.")

        try:
            logger.info(f"Processing audio file: {audio_path}")

            ext = os.path.splitext(audio_path)[1].lower()
            mime_map = {
                ".webm": "audio/webm",
                ".mp3": "audio/mpeg",
                ".wav": "audio/wav",
                ".m4a": "audio/mp4",
                ".ogg": "audio/ogg",
            }
            mime_type = mime_map.get(ext, "audio/webm")

            with open(audio_path, "rb") as f:
                audio_bytes = f.read()

            logger.info(f"Sending {len(audio_bytes)} bytes inline to Gemini (mime={mime_type})")

            transcript_prompt = """
            Transcribe this medical consultation audio accurately.
            Format the conversation with speaker labels when possible:

            Doctor: [doctor's words]
            Patient: [patient's words]

            Include all spoken content. Maintain professional medical terminology.
            """

            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    transcript_prompt,
                    types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
                ]
            )

            transcript = response.text
            logger.info("Audio transcribed successfully")
            return transcript

        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")

    async def generate_soap_note(self, transcript: str) -> str:
        """
        Generate SOAP note from transcript.

        Args:
            transcript: Consultation transcript

        Returns:
            Formatted SOAP note in markdown

        Raises:
            Exception: If generation fails or service not configured
        """
        if not self.configured:
            raise Exception("Gemini API not configured. Please set GEMINI_API_KEY.")

        try:
            soap_prompt = self._get_soap_prompt(transcript)

            response = self.client.models.generate_content(
                model=self.model,
                contents=soap_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048,
                )
            )

            return response.text

        except Exception as e:
            logger.error(f"SOAP generation error: {str(e)}")
            raise Exception(f"Failed to generate SOAP note: {str(e)}")

    def _get_soap_prompt(self, transcript: str) -> str:
        """Get formatted SOAP generation prompt"""
        return f"""
You are an expert medical scribe. Your task is to generate a comprehensive SOAP note from the consultation transcript below.

CRITICAL INSTRUCTIONS:
1. You MUST include ALL FOUR sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, and PLAN
2. Each section MUST contain relevant information extracted from the transcript
3. Distribute the information appropriately - do NOT put all content in one section
4. Follow the exact section structure and headers provided

TRANSCRIPT:
{transcript}

---

SECTION CONTENT GUIDELINES:

**SUBJECTIVE (What the PATIENT reports):**
- Patient's complaints, symptoms, and concerns in their own words
- When symptoms started, how they feel, what makes it better/worse
- Past medical history, medications, allergies, social history

**OBJECTIVE (What the DOCTOR observes/measures):**
- Vital signs (blood pressure, heart rate, temperature, etc.)
- Physical examination findings (what the doctor sees, hears, feels)
- Test results, lab values, imaging findings
- Observable clinical signs

**ASSESSMENT (What the DOCTOR concludes):**
- Diagnosis or clinical impression
- Differential diagnoses (other possibilities)
- Clinical reasoning - why this diagnosis makes sense

**PLAN (What will be DONE next):**
- Medications prescribed (with dosage, frequency, duration)
- Tests or procedures ordered
- Referrals to specialists
- Patient instructions and education
- Follow-up appointments
- Warning signs to watch for

---

Now generate the SOAP note following this EXACT structure:

## SUBJECTIVE
- **Chief Complaint:** [What brought the patient in - from patient's words]
- **History of Present Illness:** [Patient's description of symptoms, onset, duration, severity]
- **Past Medical History:** [If mentioned: previous conditions, surgeries]
- **Medications:** [If mentioned: current medications]
- **Allergies:** [If mentioned: known allergies]
- **Social History:** [If mentioned: smoking, alcohol, occupation]

## OBJECTIVE
- **Vital Signs:** [If mentioned: BP, HR, temp, RR, O2 sat, etc.]
- **Physical Examination:** [Doctor's findings from examining the patient]
- **Diagnostic Results:** [If mentioned: lab values, imaging results]

## ASSESSMENT
- **Primary Diagnosis:** [Main diagnosis with ICD code if clear]
- **Differential Diagnoses:** [Other possible diagnoses considered]
- **Clinical Reasoning:** [Why this diagnosis - link symptoms to diagnosis]

## PLAN
- **Medications:** [Prescriptions: drug, dose, route, frequency, duration]
- **Diagnostic Tests:** [Labs or imaging ordered]
- **Referrals:** [Specialist referrals if any]
- **Patient Education:** [Instructions given to patient]
- **Follow-up:** [When to return, what to monitor]
- **Precautions:** [Warning signs to watch for]

Generate the complete SOAP note NOW with all four sections filled:
"""

    async def process_consultation_complete(
        self,
        audio_path: str,
        include_transcript: bool = True
    ) -> Dict[str, any]:
        """Complete processing pipeline: transcribe + generate SOAP."""
        import time
        start_time = time.time()

        try:
            transcript = await self.transcribe_audio(audio_path)
            soap_note = await self.generate_soap_note(transcript)
            processing_time = time.time() - start_time

            result = {
                "soap_note": soap_note,
                "processing_time": processing_time
            }

            if include_transcript:
                result["transcript"] = transcript

            logger.info(f"Consultation processed successfully in {processing_time:.2f}s")
            return result

        except Exception as e:
            logger.error(f"Complete processing error: {str(e)}")
            raise

    async def transcribe_with_retry(
        self,
        audio_path: str,
        max_retries: int = 3
    ) -> str:
        """Transcribe audio with retry logic."""
        for attempt in range(max_retries):
            try:
                return await self.transcribe_audio(audio_path)
            except Exception:
                if attempt == max_retries - 1:
                    raise

                wait_time = 2 ** attempt
                logger.warning(
                    f"Transcription attempt {attempt + 1} failed. "
                    f"Retrying in {wait_time} seconds..."
                )
                await asyncio.sleep(wait_time)
