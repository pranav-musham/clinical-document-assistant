#!/usr/bin/env python3
"""
Gemini API Key Test Script

This script verifies that your Gemini API key is working correctly
and that you can connect to the Gemini 2.0 Flash model.

Usage:
    python test_gemini_api.py

Or with environment variable:
    export GEMINI_API_KEY="your-key-here"
    python test_gemini_api.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def print_separator(char="━", length=50):
    """Print a visual separator"""
    print(char * length)

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  {message}")

def get_api_key():
    """Get API key from environment or user input"""
    # Try to get from environment
    api_key = os.getenv("GEMINI_API_KEY")

    if api_key:
        print_success("Found GEMINI_API_KEY in environment")
        return api_key

    # Prompt user for API key
    print("\n" + "="*50)
    print("GEMINI API KEY REQUIRED")
    print("="*50)
    print("\nNo GEMINI_API_KEY found in environment.")
    print("\nOptions:")
    print("1. Enter your API key now (temporary)")
    print("2. Add it to backend/.env file (recommended)")
    print("\nGet your API key at: https://ai.google.dev/")
    print("="*50 + "\n")

    api_key = input("Enter your Gemini API key (or 'exit' to quit): ").strip()

    if api_key.lower() == 'exit':
        print("\nExiting...")
        sys.exit(0)

    if not api_key:
        print_error("No API key provided")
        sys.exit(1)

    return api_key

def test_gemini_connection(api_key):
    """Test connection to Gemini API"""
    print("\n" + "="*50)
    print("TESTING GEMINI API CONNECTION")
    print("="*50 + "\n")

    try:
        import google.generativeai as genai
        print_success("google-generativeai package imported successfully")
    except ImportError:
        print_error("google-generativeai package not installed")
        print("\n→ Install with: pip install google-generativeai")
        return False

    # Configure Gemini
    try:
        genai.configure(api_key=api_key)
        print_success("API key configured")
    except Exception as e:
        print_error(f"Failed to configure API key: {str(e)}")
        return False

    # Test model access
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        print_success("Model 'gemini-2.0-flash-exp' loaded successfully")
    except Exception as e:
        print_error(f"Failed to load model: {str(e)}")
        print("\n→ Make sure your API key has access to Gemini 2.0 Flash")
        return False

    # Test text generation
    print("\n" + "-"*50)
    print("Testing text generation...")
    print("-"*50)

    try:
        response = model.generate_content(
            "Say 'Hello! The Gemini API is working correctly.' in a friendly way."
        )

        print_success("Text generation successful")
        print("\n" + "="*50)
        print("GEMINI RESPONSE:")
        print("="*50)
        print(response.text)
        print("="*50)

    except Exception as e:
        print_error(f"Text generation failed: {str(e)}")
        return False

    # Test medical prompt (optional)
    print("\n" + "-"*50)
    print("Testing medical content generation...")
    print("-"*50)

    try:
        medical_prompt = """
        Generate a brief example of how you would transcribe a doctor-patient conversation.
        Keep it short (2-3 exchanges) and professional.
        """

        response = model.generate_content(medical_prompt)
        print_success("Medical content generation successful")
        print("\n" + "="*50)
        print("MEDICAL EXAMPLE:")
        print("="*50)
        print(response.text)
        print("="*50)

    except Exception as e:
        print_error(f"Medical content generation failed: {str(e)}")
        return False

    return True

def show_next_steps():
    """Show next steps after successful test"""
    print("\n" + "="*50)
    print("🎉 SUCCESS! YOUR GEMINI API IS WORKING!")
    print("="*50)
    print("\n📋 NEXT STEPS:\n")
    print("1. Add your API key to backend/.env file:")
    print("   GEMINI_API_KEY=your-api-key-here")
    print("\n2. Start the backend server:")
    print("   cd backend")
    print("   uvicorn app.main:app --reload")
    print("\n3. Upload an audio file to test transcription:")
    print("   - Open http://localhost:5173")
    print("   - Upload an audio file")
    print("   - Wait for AI processing")
    print("\n4. Continue development:")
    print("   - See docs/ROADMAP.md for Week 2 tasks")
    print("   - Implement background processing")
    print("   - Test with real consultations")
    print("\n" + "="*50)

def main():
    """Main function"""
    print("\n" + "="*50)
    print("GEMINI API KEY TESTER")
    print("Clinical Documentation Assistant")
    print("="*50)

    # Get API key
    api_key = get_api_key()

    # Test connection
    success = test_gemini_connection(api_key)

    if success:
        show_next_steps()
        return 0
    else:
        print("\n" + "="*50)
        print("❌ TESTING FAILED")
        print("="*50)
        print("\n📋 TROUBLESHOOTING:\n")
        print("1. Verify your API key at https://ai.google.dev/")
        print("2. Make sure you have access to Gemini 2.0 Flash")
        print("3. Check your internet connection")
        print("4. Try generating a new API key")
        print("\n💡 See backend/GEMINI_TEST.md for more help")
        print("="*50 + "\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
