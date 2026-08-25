# OCR Documentation

## Purpose

The OCR pipeline extracts text from resumes and supporting documents that are not fully machine-readable.

## Supported Inputs

- PDF
- PNG
- JPG
- JPEG

## Processing Flow

1. Validate the upload type and file size.
2. Save the approved file into the upload directory.
3. Extract text from PDF pages or image content.
4. Normalize the result for NLP and resume parsing.

## Backends

- PDF extraction through the PDF parser.
- Image OCR through EasyOCR when available.
- pytesseract fallback for environments that rely on Tesseract.

## Validation

OCR-related uploads use shared document validation rules:

- Allowed extensions only.
- Allowed MIME types only.
- Filename sanitization.
- Maximum file size enforcement.
- File signature checks where applicable.

## Error Handling

Rejected uploads return clear validation errors without exposing internal paths or stack traces.

