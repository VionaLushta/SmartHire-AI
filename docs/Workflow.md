# Workflow Documentation

## End-to-End Hiring Flow

```text
Candidate
↓
Upload Resume
↓
OCR
↓
NLP
↓
AI Matching
↓
Recruiter Review
↓
Decision
↓
PDF Generation
↓
Email
↓
Analytics
↓
Power BI
```

## Step Details

### Candidate

The candidate creates an account, signs in, and submits application materials through the frontend.

### Upload Resume

The upload service validates the file before storage and ensures only approved document types are accepted.

### OCR

If the document is image-based or requires extraction, the OCR pipeline reads the content and normalizes the output.

### NLP

The NLP layer prepares text for similarity analysis and skill comparison.

### AI Matching

Resume matching compares candidate content against job requirements and produces a structured score and explanation.

### Recruiter Review

Recruiters review the application, analysis, and supporting profile information.

### Decision

The recruiter selects a decision such as accept, interview, hold, or reject.

### PDF Generation

If the workflow requires a formal document, the PDF generator creates the letter or report.

### Email

The SMTP service sends the outcome or follow-up message to the candidate.

### Analytics

Workflow outcomes are aggregated into analytics views and exports.

### Power BI

Reporting exports can be used to refresh Power BI datasets and dashboards.

## Operational Notes

- Workflow actions are audited through backend logging.
- Status changes should remain synchronized with dashboard counters and reporting exports.

