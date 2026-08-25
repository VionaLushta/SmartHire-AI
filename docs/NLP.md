# NLP Documentation

## Purpose

The NLP layer transforms raw resume and job text into comparable representations for matching and recommendations.

## Preprocessing

The text normalization pipeline removes noise and makes content more comparable:

- Case normalization.
- Punctuation stripping.
- Whitespace cleanup.
- Token preparation.

## Vectorization

The matcher uses TF-IDF vectorization to represent text as weighted features and uses cosine similarity to compare candidate and job content.

## Skill Evaluation

Skill extraction and matching work together to detect:

- Required skills.
- Preferred skills.
- Semantically similar terms.
- Missing skills.

## Matching Output

The comparison engine returns a structured result that can include:

- Overall compatibility score.
- Matched skills.
- Missing skills.
- Experience fit.
- Education fit.

## Explainability

The recommendation engine provides human-readable summaries so recruiters can understand why a match scored the way it did.

