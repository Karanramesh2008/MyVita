import json
import os
import urllib.error
import urllib.request


def generate_health_insight(readings: list[dict]) -> str:
    """Generate a concise, non-diagnostic BP trend insight with Gemini."""
    if not readings:
        return "Add at least one blood-pressure reading to generate an AI insight."

    # Read environment variables at call time so values loaded from backend/.env
    # by main.py are available even though this module was imported earlier.
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()

    if not gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend")

    safe_readings = [
        {
            "systolic": r.get("systolic"),
            "diastolic": r.get("diastolic"),
            "pulse": r.get("pulse"),
            "timestamp": r.get("timestamp"),
        }
        for r in readings[-20:]
    ]

    prompt = f"""
You are the health-information assistant inside the MyVita application.

Analyze the patient's recorded blood-pressure readings below.

IMPORTANT SAFETY RULES:
- This is a health-information feature, not a diagnostic tool.
- Do NOT diagnose any disease or medical condition.
- Do NOT prescribe, stop, or change medication.
- Do NOT claim certainty about the patient's health.
- Do NOT claim cardiovascular improvement or deterioration.
- Do NOT describe readings as "optimal", "healthy", or "normal" unless clearly supported by the data.
- Describe only observable patterns in the recorded readings.
- A single blood-pressure reading does not establish a diagnosis.
- If readings appear concerning or persistently elevated, recommend discussing them with a healthcare professional.
- Do not use alarming language.

OUTPUT RULES:
- Do NOT greet the user.
- Do NOT say "Hello".
- Do NOT say "Here is a summary".
- Do NOT repeat the input readings.
- Do NOT output "Data Analysis".
- Do NOT output "Readings (newest entries last)".
- Start directly with "Overall trend:".
- Use plain, easy-to-understand English.
- Keep the response between 60 and 100 words.
- End with a complete sentence.

Your response MUST contain exactly these 3 sections:

Overall trend:
Describe whether the blood-pressure readings generally increase, decrease, or remain relatively stable. Use cautious wording such as "lower than earlier readings" or "higher than earlier readings".

Notable pattern:
Describe the most important observable pattern in the readings, such as changes in systolic or diastolic pressure or consistency/variation between readings.

Next step:
Give ONE safe and practical recommendation, such as continuing regular monitoring or discussing persistent or concerning trends with a healthcare professional.

Blood-pressure readings:
{json.dumps(safe_readings, separators=(',', ':'))}
"""

    url = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{gemini_model}:generateContent"
    )

    body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
          "maxOutputTokens": 500,
          "thinkingConfig": {
            "thinkingLevel": "minimal"
        }
}
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": gemini_api_key
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini API error ({exc.code}): {detail[:300]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError("Unable to reach the AI service") from exc

    candidates = result.get("candidates", [])
    if not candidates:
        raise RuntimeError("AI service returned no insight")
    parts = candidates[0].get("content", {}).get("parts", [])
    text = " ".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("AI service returned an empty insight")
    return text
