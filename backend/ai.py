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
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

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

    prompt = f"""You are MyVita's health-information assistant. Analyze the following blood-pressure readings.
Give a short, calm, easy-to-understand trend summary for the patient.
Include: overall trend, notable pattern, and one sensible next step.
Do not diagnose disease, prescribe medication, or imply certainty. Do not invent missing data.
If a reading appears severely high, advise the user to seek prompt professional medical assessment,
but do not label a diagnosis. Mention that a single reading does not establish a diagnosis.
Keep the response under 120 words and use plain language.

Readings (newest entries are last):
{json.dumps(safe_readings, separators=(',', ':'))}
"""

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{gemini_model}:generateContent?key={gemini_api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 180},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=25) as response:
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
