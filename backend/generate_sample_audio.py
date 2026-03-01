#!/usr/bin/env python3
"""
Sample Audio Generator for Clinical Documentation Assistant

This script generates sample medical consultation audio files using gTTS (Google Text-to-Speech).
These audio files can be used to test the Gemini AI transcription and SOAP note generation features.

Requirements:
    pip install gTTS

Usage:
    python generate_sample_audio.py

The script will generate multiple sample audio files in the backend/sample_audio/ directory.
"""

import os
import sys
from pathlib import Path

# Check if gTTS is installed
try:
    from gtts import gTTS
except ImportError:
    print("❌ Error: gTTS package not installed")
    print("\n📦 Install with:")
    print("   pip install gTTS")
    print("\nOr with virtual environment:")
    print("   source venv/bin/activate  # macOS/Linux")
    print("   venv\\Scripts\\activate     # Windows")
    print("   pip install gTTS")
    sys.exit(1)


# Sample medical consultation dialogues
SAMPLE_DIALOGUES = {
    "general_checkup": """
Doctor: Good morning, Alex. How have you been holding up?
Patient: Hi, Doctor. I've been feeling pretty run down for the last three days.
Doctor: I'm sorry to hear that. Can you describe your symptoms for me?
Patient: I have a sore throat, runny nose, and I've been coughing quite a bit.
Doctor: Have you had any fever?
Patient: Yes, I had a low-grade fever yesterday, around 100 degrees.
Doctor: I'm going to take a quick listen to your lungs.
Patient: How do they sound?
Doctor: Your lungs sound clear. It sounds like a standard viral infection. Rest and hydration are best.
Patient: Should I take any medication?
Doctor: You can take over-the-counter pain relievers like acetaminophen or ibuprofen for the fever and throat pain. Make sure to drink plenty of fluids and get lots of rest.
Patient: How long should this last?
Doctor: Typically, viral infections like this resolve within 5 to 7 days. If your symptoms worsen or you develop difficulty breathing, please come back immediately.
Patient: Okay, thank you, Doctor.
Doctor: You're welcome. Take care and feel better soon.
""",

    "hypertension_followup": """
Doctor: Good afternoon, Mrs. Johnson. How have you been feeling since we started your blood pressure medication?
Patient: Hello, Doctor. I've been doing pretty well, actually. I think the medication is helping.
Doctor: That's great to hear. Have you been monitoring your blood pressure at home like we discussed?
Patient: Yes, I've been checking it every morning. It's been averaging around 135 over 85.
Doctor: That's much better than your initial reading of 160 over 95. Any side effects from the medication?
Patient: I did feel a little dizzy the first few days, but that seems to have gone away now.
Doctor: Good. Dizziness is common initially but usually resolves. Let me check your blood pressure today.
Patient: Sure, go ahead.
Doctor: Your reading today is 132 over 82. Excellent improvement. How's your diet been?
Patient: I've been cutting back on salt like you suggested, and I'm trying to eat more vegetables.
Doctor: That's wonderful. Keep up with the medication, continue monitoring at home, and maintain those healthy lifestyle changes. I'd like to see you again in three months.
Patient: Thank you, Doctor. I'll make an appointment on my way out.
""",

    "diabetes_management": """
Doctor: Hello, Mr. Peterson. Let's review your diabetes management today.
Patient: Hi, Doctor. I've been trying to stay on track with everything.
Doctor: I can see from your lab results that your A1C is now 7.2, down from 8.5 three months ago. That's significant progress.
Patient: Is that good?
Doctor: Yes, it's very good. It means your blood sugar control has improved substantially. How have you been managing your diet?
Patient: I've been following the meal plan the nutritionist gave me. I'm eating smaller portions and avoiding sugary drinks.
Doctor: Excellent. And your blood glucose monitoring?
Patient: I check it every morning before breakfast. It's usually between 110 and 130.
Doctor: Those are good fasting numbers. Any symptoms of low blood sugar?
Patient: No, I haven't felt shaky or dizzy.
Doctor: Good. Continue with your current medication regimen and keep up the excellent work with diet and exercise. Let's check your feet as well.
Patient: Okay.
Doctor: Your feet look healthy, good circulation. Keep monitoring them daily and let me know if you notice any cuts or sores that don't heal.
Patient: I will. Thank you, Doctor.
""",

    "respiratory_complaint": """
Doctor: Hi there, Sarah. What brings you in today?
Patient: I've been having trouble breathing, especially when I exercise or go upstairs.
Doctor: How long has this been going on?
Patient: About two weeks now. It's getting worse.
Doctor: Have you had any chest pain?
Patient: No chest pain, but I do have a tight feeling in my chest sometimes.
Doctor: Any coughing or wheezing?
Patient: Yes, I've been wheezing, especially at night. And I wake up coughing.
Doctor: Do you have a history of asthma or allergies?
Patient: I had asthma as a child, but I haven't had problems for years.
Doctor: Let me listen to your lungs. Take a deep breath in and out.
Patient: Okay.
Doctor: I can hear some wheezing in both lungs. Your oxygen saturation is 94 percent, which is slightly low. I'd like to do a peak flow test and possibly start you on an inhaler.
Patient: Do you think my asthma is coming back?
Doctor: It's possible this is an asthma exacerbation. Environmental triggers, stress, or respiratory infections can cause this. Let's get you started on a bronchodilator inhaler and a steroid inhaler to reduce inflammation.
Patient: Will this help quickly?
Doctor: The bronchodilator should help within minutes. The steroid takes a few days to work fully. If you're not improving in three days, or if you have severe difficulty breathing, go to the emergency room immediately.
Patient: I understand. Thank you.
""",

    "mental_health_screening": """
Doctor: Hello, David. I see this is your annual physical. Before we begin, I'd like to ask you a few questions about your overall well-being.
Patient: Sure, that's fine.
Doctor: How have you been feeling emotionally lately?
Patient: To be honest, I've been feeling pretty down. Work has been stressful, and I'm not sleeping well.
Doctor: I'm sorry to hear that. How long have you been feeling this way?
Patient: Maybe two or three months now.
Doctor: Are you still enjoying activities that you used to find pleasurable?
Patient: Not really. I don't feel like doing much anymore. I used to play basketball on weekends, but I haven't gone in weeks.
Doctor: Have you had any thoughts of harming yourself?
Patient: No, nothing like that. I just feel tired and unmotivated all the time.
Doctor: Thank you for being open with me. These symptoms could indicate depression. Have you experienced depression before?
Patient: My mom had depression, but I never have.
Doctor: Depression can run in families. The good news is that it's treatable. I'd like to discuss some options with you, including therapy and possibly medication.
Patient: What would you recommend?
Doctor: I think starting with a referral to a therapist would be beneficial. We can also consider an antidepressant medication if your symptoms don't improve with therapy alone. How does that sound?
Patient: I think I'd like to try therapy first.
Doctor: That's a great approach. I'll give you a referral today. Please follow up with me in four weeks so we can see how you're doing.
Patient: Thank you, Doctor.
""",
}


def create_output_directory():
    """Create the output directory for sample audio files"""
    output_dir = Path(__file__).parent / "sample_audio"
    output_dir.mkdir(exist_ok=True)
    return output_dir


def generate_audio_file(dialogue_name, text, output_dir):
    """Generate an audio file from text using gTTS"""
    try:
        print(f"🔊 Generating audio for: {dialogue_name}")

        # Create TTS object
        tts = gTTS(text=text.strip(), lang='en', slow=False)

        # Save the file
        output_path = output_dir / f"{dialogue_name}.mp3"
        tts.save(str(output_path))

        # Get file size
        file_size = output_path.stat().st_size / 1024  # KB

        print(f"   ✅ Created: {output_path.name} ({file_size:.1f} KB)")
        return True

    except Exception as e:
        print(f"   ❌ Error generating {dialogue_name}: {str(e)}")
        return False


def main():
    """Main function to generate all sample audio files"""
    print("=" * 60)
    print("SAMPLE AUDIO GENERATOR")
    print("Clinical Documentation Assistant")
    print("=" * 60)
    print()

    # Create output directory
    output_dir = create_output_directory()
    print(f"📁 Output directory: {output_dir}")
    print()

    # Generate audio files
    success_count = 0
    total_count = len(SAMPLE_DIALOGUES)

    for dialogue_name, text in SAMPLE_DIALOGUES.items():
        if generate_audio_file(dialogue_name, text, output_dir):
            success_count += 1

    print()
    print("=" * 60)
    print(f"✅ Successfully generated {success_count}/{total_count} audio files")
    print("=" * 60)
    print()

    # Show next steps
    print("📋 NEXT STEPS:")
    print()
    print("1. Start the backend server:")
    print("   cd backend")
    print("   uvicorn app.main:app --reload")
    print()
    print("2. Open the frontend:")
    print("   http://localhost:5173")
    print()
    print("3. Login or register an account")
    print()
    print("4. Upload one of the generated audio files from:")
    print(f"   {output_dir}")
    print()
    print("5. The audio files you can upload:")
    for dialogue_name in SAMPLE_DIALOGUES.keys():
        print(f"   - {dialogue_name}.mp3")
    print()
    print("6. Wait for Gemini AI to process the audio")
    print()
    print("=" * 60)
    print()

    # Optional: play first file on macOS
    if sys.platform == "darwin" and success_count > 0:
        first_file = output_dir / f"{list(SAMPLE_DIALOGUES.keys())[0]}.mp3"
        print(f"💡 TIP: To play the audio file on macOS:")
        print(f"   afplay {first_file}")
        print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Generation cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        sys.exit(1)
