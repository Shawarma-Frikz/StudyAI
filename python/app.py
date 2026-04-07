from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import requests
import io
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

OCR_SPACE_API_KEY = os.environ.get("OCR_SPACE_API_KEY", "K88276019588957")
OCR_SPACE_URL     = "https://api.ocr.space/parse/image"

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})


# ── Step 1: extract text only, return JSON ────────────────────────────────────
@app.route('/ocr-text', methods=['POST'])
def ocr_text_endpoint():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        img_bytes = file.read()

        response = requests.post(
            OCR_SPACE_URL,
            files={"file": (file.filename, img_bytes, file.content_type)},
            data={
                "apikey": OCR_SPACE_API_KEY,
                "language": "eng",
                "isOverlayRequired": False,
                "detectOrientation": True,
                "scale": True,
                "OCREngine": 2,
            },
            timeout=60
        )
        response.raise_for_status()
        result = response.json()

        if result.get("IsErroredOnProcessing"):
            error_msg = result.get("ErrorMessage", ["Unknown OCR error"])
            if isinstance(error_msg, list):
                error_msg = " ".join(error_msg)
            return jsonify({"error": f"OCR.space error: {error_msg}"}), 500

        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            return jsonify({"error": "No results returned from OCR.space"}), 500

        extracted_text = "\n".join(
            r.get("ParsedText", "") for r in parsed_results
        ).strip()

        if not extracted_text:
            extracted_text = "[No text detected in the image. Please ensure the image contains clear, readable handwriting.]"

        return jsonify({"text": extracted_text})

    except requests.exceptions.Timeout:
        return jsonify({"error": "OCR.space request timed out. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to reach OCR.space: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Step 2: receive confirmed text + filename, return PDF ─────────────────────
@app.route('/generate-pdf', methods=['POST'])
def generate_pdf_endpoint():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text     = data['text'].strip()
    filename = data.get('filename', 'ocr_result').strip() or 'ocr_result'
    # Sanitise: keep only safe characters
    filename = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_')).strip()
    if not filename:
        filename = 'ocr_result'
    if not filename.endswith('.pdf'):
        filename += '.pdf'

    try:
        pdf_buffer = generate_pdf(text)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def generate_pdf(text: str) -> io.BytesIO:
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title="OCR Result"
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        spaceAfter=12,
        textColor='#1a1a2e'
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=11,
        leading=18,
        spaceAfter=6,
        wordWrap='CJK'
    )

    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor='#888888',
        spaceAfter=20
    )

    story = []

    story.append(Paragraph("OCR Transcription Result", header_style))
    story.append(Paragraph("Extracted and typeset from handwritten image", label_style))
    story.append(Spacer(1, 0.3 * cm))
    paragraphs = text.split('\n')
    for para in paragraphs:
        para = para.strip()
        if para:
            para = para.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(para, body_style))
        else:
            story.append(Spacer(1, 0.2 * cm))

    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph("— Generated by StudyAI OCR", label_style))

    doc.build(story)
    buffer.seek(0)
    return buffer


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
