# PolicyPulse

> **Know what changed. Know if it affects you. Know what to do next.**

PolicyPulse is a legal and policy change intelligence platform that detects meaningful changes between versions of official documents, determines which people or businesses may be affected, and turns those changes into simple, actionable alerts.

Instead of asking users to search through hundreds of laws and regulations, PolicyPulse brings relevant changes directly to them through **Web, SMS, and USSD**.

---

## The Problem

Laws, regulations, policies, and guidelines can change without the people affected by those changes realizing it.

The information may be publicly available, but there is a difference between:

> **"The document exists."**

and:

> **"I understand what changed, whether it affects me, and what I should do."**

A business owner should not have to read two 50-page policy documents line by line just to discover that one reporting requirement has changed.

PolicyPulse addresses this gap by turning complex policy changes into understandable, relevant information.

---

## The Solution

PolicyPulse follows a simple pipeline:

```text
Official Policy Documents
          ↓
    Document Parsing
          ↓
    Change Detection
          ↓
    Clause Extraction
          ↓
  Impact Classification
          ↓
   User Profile Matching
          ↓
 Plain-Language Explanation
          ↓
    Personalized Alert
          ↓
       Web / SMS / USSD
```

The goal is not simply to summarize documents.

The key question is:

> **"Who does this change matter to?"**

**Try it out here:** https://q11aj7j30cs0-d.space-z.ai

---

## Example

Imagine a new version of a business regulation is published.

A traditional system might tell a user:

> "Business Regulation Version 2.0 has been published."

PolicyPulse instead identifies the meaningful change and provides:

### What changed?

A new reporting requirement has been introduced.

### Who may be affected?

* Restaurants
* Hospitality businesses
* Employers

### Does it affect you?

> You may be affected because your profile indicates that you operate a restaurant in the hospitality sector.

### What should you do?

> Review the applicable reporting requirements before the effective date.

### Source

> Business Reporting Regulation — Section 4, Page 12

This transforms a document into an actionable alert.

---

# Core Features

## 1. Policy Comparison

Administrators can provide two versions of an official document:

* Previous version
* New version

PolicyPulse analyzes both versions and identifies meaningful differences.

---

## 2. Change Detection

The system identifies changes such as:

* New requirements
* Removed requirements
* Modified obligations
* Changed deadlines
* Changed thresholds
* Documentation changes
* Administrative changes

Not every textual difference is treated as equally important.

---

## 3. Impact Classification

Each meaningful change is classified according to its potential impact.

Example:

```text
🔴 HIGH IMPACT
New reporting requirement

🟡 MEDIUM IMPACT
Documentation requirement changed

🟢 LOW IMPACT
Administrative wording updated
```

The system also identifies potentially affected categories such as:

* SMEs
* Employers
* Restaurants
* NGOs
* Employees
* Professionals
* Specific industries

---

## 4. Personalized Alerts

Users create a simple profile describing what matters to them.

For example:

```text
Role:
Business Owner

Business:
Restaurant

Sector:
Hospitality

Location:
Kampala, Uganda
```

PolicyPulse uses this information to determine which detected changes may be relevant.

Users do not subscribe to every law.

They subscribe to:

> **Things that matter to them.**

---

## 5. Plain-Language Explanations

Policy documents can be difficult to understand.

PolicyPulse converts detected changes into a structured explanation:

```text
WHAT CHANGED?

WHO MAY BE AFFECTED?

WHAT SHOULD THEY DO?

WHEN?

SOURCE
```

The goal is clarity, not unnecessary legal or technical language.

---

## 6. Source Traceability

Every policy insight should be traceable to its source.

Where available, PolicyPulse provides:

* Official document
* Document version
* Section
* Page
* Relevant clause

Users can verify the information against the original source.

---

## 7. Web Alerts

Users can access relevant policy changes through their PolicyPulse dashboard.

The dashboard focuses on:

> **What changed that matters to me?**

rather than overwhelming users with an entire legal database.

---

## 8. SMS Alerts

Important alerts can be delivered directly to a user's phone.

Example:

```text
POLICYPULSE

New reporting requirements may affect
your restaurant.

Review what changed:
[link]

Verify against the official source.
```

---

## 9. USSD Access

PolicyPulse is designed to support users who may have limited or inconsistent internet access.

A simple USSD experience can provide options such as:

```text
POLICYPULSE

1. My Alerts
2. Latest Updates
3. What Changed?
4. Help
```

---

# Why AI?

The difficult part of the problem is not simply generating a summary.

Comparing two long documents manually can require significant time and attention.

PolicyPulse uses AI to assist with:

* Document understanding
* Semantic comparison
* Clause extraction
* Change classification
* Impact classification
* User-profile matching
* Plain-language explanations

The most important intelligence layer is:

> **Change → Impact → Relevance**

PolicyPulse should not make unrestricted legal judgments.

Instead, it uses structured categories, source references, and user-profile information to produce explainable informational summaries.

---

# System Architecture

```text
                    ┌─────────────────────┐
                    │      Next.js        │
                    │    Web Frontend     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Node.js API      │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │   Users &   │  │  Document   │  │ Notification│
       │   Profiles  │  │   Engine    │  │   Service   │
       └─────────────┘  └──────┬──────┘  └──────┬──────┘
                               │                │
                               ▼                ├── SMS
                       ┌───────────────┐        ├── USSD
                       │ AI Intelligence│        └── Web
                       └───────┬───────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
          Change Detection             Impact Engine
                 │                           │
                 └─────────────┬─────────────┘
                               │
                               ▼
                       Personalized Alert
```

---

# Technology Stack

The initial implementation is designed around a modern JavaScript/TypeScript stack.

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* TypeScript
* REST API

### Database

* PostgreSQL

### AI / Document Processing

* PDF/document extraction
* Text chunking
* Embeddings
* Semantic similarity
* LLM structured extraction

### Communication

* Africa's Talking
* SMS
* USSD

### Development

* Git
* GitHub
* Docker
* Automated testing
* CI/CD

The exact providers and infrastructure can evolve without changing the core product architecture.

---

# MVP

The first version intentionally focuses on one core workflow.

## Admin

1. Upload old policy document
2. Upload new policy document
3. Compare documents
4. Detect meaningful changes
5. Review detected changes
6. Review affected categories
7. Review generated explanation
8. Approve an alert
9. Send the alert via SMS

## User

1. Create an account
2. Provide basic profile information
3. Select relevant categories
4. Receive relevant policy alerts
5. Open an alert
6. Read what changed
7. See why it may affect them
8. See what they may need to do
9. View the official source

---

# Example Detection Output

A detected change can be represented as structured data:

```json
{
  "change": "New reporting requirement",
  "severity": "high",
  "affectedGroups": [
    "SMEs",
    "employers",
    "hospitality businesses"
  ],
  "actionRequired": true,
  "deadline": "2026-12-31",
  "source": {
    "document": "Business Reporting Regulation",
    "section": "Section 4",
    "page": 12
  }
}
```

The exact schema may evolve as the system develops.

---

# Product Principles

PolicyPulse is built around several principles.

### 1. Relevance over volume

Users should see information that matters to them.

### 2. Traceability over black-box answers

Important insights should be connected to their source.

### 3. Explanation over jargon

Users should understand the change without needing to be lawyers.

### 4. Actionability over information overload

The system should help users understand what they may need to consider doing.

### 5. Verification over blind trust

Users should always be able to verify important information against the official source.

---

# Safety & Legal Disclaimer

PolicyPulse is **not a lawyer, law firm, or legal-advice service**.

AI-generated outputs are informational summaries intended to help users identify and understand potential policy changes.

Every important insight should encourage users to verify the relevant information against the official source.

The system must not present an AI-generated interpretation as definitive legal advice.

---

# Data Sources

For development and demonstration, PolicyPulse can use a small curated collection of publicly accessible official documents.

Potential sources include:

* Uganda Legal Information Institute (ULII)
* Uganda Law Reform Commission (ULRC)
* Parliament of Uganda
* Relevant government ministries and agencies
* Other official policy and regulatory publications

The system should prioritize authoritative sources.

---

# Security Considerations

Because PolicyPulse may process documents and user information, the application should implement:

* Secure authentication
* Password hashing
* Role-based authorization
* Input validation
* File-type validation
* File-size limits
* Secure document storage
* API authentication
* Rate limiting
* Protection against unauthorized document access
* Audit logging for administrative actions
* Secrets stored in environment variables
* No sensitive information committed to source control

---

# Testing

Every major feature should have automated tests.

Testing should cover:

### Unit Tests

* Change classification
* Impact classification
* User-profile matching
* Validation
* Utility functions

### Integration Tests

* Document processing workflow
* Alert creation
* User matching
* Notification workflow

### API Tests

* Authentication
* Authorization
* Policy comparison
* Alert retrieval
* Alert approval
* Notification sending

### Frontend Tests

* Forms
* Alert rendering
* Filtering
* Loading states
* Error states
* User interactions

---

# Development Philosophy

PolicyPulse should be developed incrementally.

The system should not attempt to build every possible feature at once.

The development priority is:

```text
Document Upload
      ↓
Document Comparison
      ↓
Change Detection
      ↓
Impact Classification
      ↓
Alert Generation
      ↓
User Relevance
      ↓
Web Delivery
      ↓
SMS
      ↓
USSD
```

Each feature should be implemented, tested, and verified before moving to the next major feature.

---

# Future Possibilities

The initial product is intentionally focused.

Potential future capabilities include:

* Automated monitoring of official sources
* Continuous policy monitoring
* Sector-specific compliance monitoring
* Organization dashboards
* Compliance calendars
* Regulatory deadline tracking
* More advanced policy relationship mapping
* Multi-country support
* Additional communication channels
* Historical policy-change analysis
* Organization-wide regulatory alerts

These are future directions, not requirements for the initial MVP.

---

# Project Vision

PolicyPulse is built around a simple idea:

> **People shouldn't have to become legal researchers just to know when a policy change affects them.**

The long-term vision is to create an intelligence layer between constantly changing official information and the people who need to act on it.

```text
POLICY
   ↓
CHANGE
   ↓
IMPACT
   ↓
RELEVANCE
   ↓
ACTION
   ↓
PEOPLE
```

## PolicyPulse

**Know what changed.
Know if it affects you.
Know what to do next.**
