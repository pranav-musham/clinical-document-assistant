#!/usr/bin/env python3
"""
Test Script: Process Consultation with Gemini AI

This script processes a pending consultation by:
1. Retrieving the consultation from the database
2. Using GeminiService to transcribe audio and generate SOAP note
3. Updating the consultation record with results

Usage:
    python test_process_consultation.py [consultation_id]

If no consultation_id is provided, it will process the first pending consultation.
"""

import os
import sys
import asyncio
from datetime import datetime
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.consultation import Consultation, ConsultationStatus
from app.services.gemini_service import GeminiService
from app.config import settings


def print_separator(char="=", length=60):
    """Print a visual separator"""
    print(char * length)


def print_section(title):
    """Print a section header"""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


async def process_consultation(consultation_id: int = None):
    """Process a consultation with Gemini AI"""

    print_section("CONSULTATION PROCESSING TEST")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Initialize database session
    db = SessionLocal()

    try:
        # Get consultation
        if consultation_id:
            consultation = db.query(Consultation).filter(
                Consultation.id == consultation_id
            ).first()

            if not consultation:
                print(f"❌ Error: Consultation #{consultation_id} not found")
                return False
        else:
            # Get first pending consultation
            consultation = db.query(Consultation).filter(
                Consultation.status == ConsultationStatus.PENDING
            ).first()

            if not consultation:
                print("❌ Error: No pending consultations found")
                print("\n💡 Upload an audio file first at http://localhost:5173")
                return False

        print(f"✅ Found consultation:")
        print(f"   ID: {consultation.id}")
        print(f"   Audio file: {consultation.audio_filename}")
        print(f"   Status: {consultation.status}")
        print(f"   Created: {consultation.created_at}")
        print()

        # Check audio file exists
        audio_path = os.path.join(settings.UPLOAD_DIR, consultation.audio_filename)

        if not os.path.exists(audio_path):
            print(f"❌ Error: Audio file not found at {audio_path}")
            return False

        file_size = os.path.getsize(audio_path) / (1024 * 1024)  # MB
        print(f"✅ Audio file exists: {file_size:.2f} MB")
        print()

        # Check Gemini API key
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key-from-ai-google-dev":
            print("❌ Error: GEMINI_API_KEY not configured in .env file")
            print("\n💡 Get your API key at https://ai.google.dev/")
            print("   Then add it to backend/.env:")
            print("   GEMINI_API_KEY=your-key-here")
            return False

        print(f"✅ Gemini API key configured (length: {len(settings.GEMINI_API_KEY)} chars)")
        print()

        # Update status to PROCESSING
        consultation.status = ConsultationStatus.PROCESSING
        db.commit()
        print("📝 Updated status to PROCESSING")
        print()

        # Initialize Gemini service
        print_section("INITIALIZING GEMINI AI SERVICE")
        service = GeminiService()
        print("✅ GeminiService initialized")
        print()

        # Process consultation
        print_section("STARTING AI PROCESSING")
        print("This may take 30-60 seconds...")
        print()

        try:
            start_time = datetime.now()

            result = await service.process_consultation_complete(audio_path)

            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()

            print("✅ Processing completed successfully!")
            print(f"   Processing time: {processing_time:.1f} seconds")
            print()

            # Update consultation record
            print_section("UPDATING DATABASE")

            consultation.transcript = result["transcript"]
            consultation.soap_note = result["soap_note"]
            consultation.status = ConsultationStatus.COMPLETED
            consultation.processing_time = processing_time
            consultation.completed_at = datetime.utcnow()

            db.commit()

            print("✅ Database updated successfully")
            print()

            # Display results
            print_section("TRANSCRIPTION PREVIEW")
            transcript_preview = result["transcript"][:500]
            print(transcript_preview)
            if len(result["transcript"]) > 500:
                print(f"\n... (truncated, full length: {len(result['transcript'])} chars)")
            print()

            print_section("SOAP NOTE PREVIEW")
            soap_preview = result["soap_note"][:500]
            print(soap_preview)
            if len(result["soap_note"]) > 500:
                print(f"\n... (truncated, full length: {len(result['soap_note'])} chars)")
            print()

            print_section("SUCCESS!")
            print("✅ Consultation processed successfully")
            print(f"✅ Consultation ID: {consultation.id}")
            print(f"✅ Status: {consultation.status}")
            print(f"✅ Processing time: {processing_time:.1f} seconds")
            print()
            print("🌐 View results in the web interface:")
            print(f"   http://localhost:5173/consultations/{consultation.id}")
            print()
            print_separator()

            return True

        except Exception as e:
            print(f"❌ Error during AI processing: {str(e)}")
            print()

            # Update status to FAILED
            consultation.status = ConsultationStatus.FAILED
            consultation.error_message = str(e)
            db.commit()

            print("📝 Updated status to FAILED")
            print()

            # Show troubleshooting tips
            print_section("TROUBLESHOOTING")
            print("Common issues:")
            print()
            print("1. Invalid API key:")
            print("   - Verify your API key at https://ai.google.dev/")
            print("   - Make sure it starts with 'AIza'")
            print("   - Check it's copied correctly to .env file")
            print()
            print("2. API quota exceeded:")
            print("   - Free tier: 15 requests/minute, 1,500/day")
            print("   - Check usage at https://aistudio.google.com/")
            print()
            print("3. Audio file issues:")
            print("   - Ensure file is valid audio format")
            print("   - Try with a shorter audio file")
            print("   - Check file isn't corrupted")
            print()
            print("4. Network issues:")
            print("   - Check internet connection")
            print("   - Try again in a few moments")
            print()
            print_separator()

            return False

    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        return False

    finally:
        db.close()


def main():
    """Main entry point"""
    # Parse consultation ID from command line
    consultation_id = None
    if len(sys.argv) > 1:
        try:
            consultation_id = int(sys.argv[1])
        except ValueError:
            print(f"❌ Error: Invalid consultation ID: {sys.argv[1]}")
            print("\nUsage: python test_process_consultation.py [consultation_id]")
            sys.exit(1)

    # Run async processing
    success = asyncio.run(process_consultation(consultation_id))

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Processing cancelled by user")
        sys.exit(1)
