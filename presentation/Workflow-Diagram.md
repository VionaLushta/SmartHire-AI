# SmartHire AI Workflow Diagram

## End-to-End Hiring Flow

```text
Candidate
  -> Register / Login
  -> Upload Resume
  -> OCR / PDF Extraction
  -> NLP Preprocessing
  -> AI Matching
  -> Recruiter Review
  -> Recruiter Decision
  -> PDF Generation
  -> Email Notification
  -> Analytics Update
  -> Power BI Export
```

## Detailed Flow

1. Candidate creates an account and signs in.
2. Candidate uploads a resume or certificate.
3. The backend validates file type, size, and filename.
4. OCR or PDF parsing extracts text.
5. NLP normalizes the text and prepares it for scoring.
6. AI matching compares the candidate against a job profile.
7. Recruiter reviews the analysis in the protected workspace.
8. Recruiter chooses a decision.
9. The workflow service triggers PDF creation if required.
10. The email service sends the result to the candidate.
11. Analytics refresh to reflect the latest action.
12. Reporting exports remain available for Power BI dashboards.

## Integration Points

- Frontend to backend through REST APIs.
- OCR to NLP through normalized extracted text.
- NLP to recruiter review through match output.
- Recruiter review to workflow service through decision events.
- Workflow to PDF and email through document and notification services.
- Workflow to analytics and Power BI through reporting exports.

