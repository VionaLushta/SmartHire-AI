# AI Pipeline Documentation

## Overview

The SmartHire AI pipeline converts raw resumes into structured insights, skill extraction, similarity scoring, recommendations, and workflow-ready analytics.

## Pipeline Stages

```text
Candidate Resume
↓
Upload Validation
↓
File Extraction
↓
OCR or PDF Text Parsing
↓
Text Cleaning and NLP Preprocessing
↓
Skill Extraction
↓
Job Matching
↓
Recommendation Generation
↓
Candidate Ranking
↓
Analytics and Reporting
```

## OCR and Text Extraction

- PDF files are parsed directly when text is available.
- Image-based files can be processed through OCR backends.
- The parser normalizes extracted text before passing it to NLP helpers.

## Resume Parsing

The resume service reads approved uploads, extracts candidate data, and produces structured content for downstream matching and dashboards.

## NLP Preprocessing

The NLP matcher performs lightweight normalization:

- Lowercasing and casefolding.
- Punctuation removal.
- Whitespace normalization.
- Token preparation for TF-IDF vectorization.

## TF-IDF and Similarity

The matcher uses TF-IDF vectors and cosine similarity to compare resume text against job descriptions and skill groups.

## Skill Extraction

The skill extractor uses curated catalogs for:

- Programming languages.
- Frameworks.
- Databases.
- Cloud platforms.
- DevOps tools.
- AI and data science terms.
- Soft skills.
- Office productivity tools.

## Resume Matching

Matching combines:

- Skill overlap.
- Similarity score.
- Experience alignment.
- Certification relevance.
- Education alignment.

## Recommendation Engine

The recommendation engine generates structured guidance such as:

- Skill gaps.
- Suggested improvements.
- Similar roles.
- Career insights.

## Analytics Output

The AI analytics layer converts matching and workflow data into reporting-friendly structures for dashboards, exports, and Power BI consumption.

