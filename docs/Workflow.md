# Workflow

## Purpose

The workflow engine enforces human validation on generated documents. Agents produce drafts; export is blocked until approval.

## States

Defined in `WorkflowRules.workflowStates`:

`Draft` → `Pending Review` → `Needs Changes` / `Approved` / `Rejected` → `Exported` → `Archived`

## Allowed transitions

| From | To |
|------|-----|
| Draft | Pending Review, Rejected |
| Pending Review | Needs Changes, Approved, Rejected |
| Needs Changes | Draft, Pending Review |
| Approved | Exported |
| Rejected | Draft |
| Exported | Archived |
| Archived | (none) |

## Create and transition

- Creating a generated document starts a workflow instance (Draft).
- Inspect: `GET /api/conversations/:id/generated-documents/:documentId/workflow`
- Transition: `POST .../workflow/transition` (Employee+) with the target state
- Engine records history, reviewers, and notifications (`WorkflowEngine`, `NotificationService`)

## Approval and export

### Approve shortcut

`POST /api/conversations/:id/generated-documents/:documentId/approve` (Employee+)

Forces Draft → Pending Review (if needed) then → Approved, and sets `approved: true` on the document.

### Export rules

`GET /api/conversations/:id/generated-documents/:documentId/export`

Requirements:

- Document `approved === true`
- Workflow state in `{ Approved, Exported }`
- May transition to `Exported` when exporting from Approved

Formats: `pdf`, `docx`, `html` (via document exporters in `document-runtime.js`).

`ApprovalService.canExport`: Approved or Exported  
`ApprovalService.canArchive`: only from Exported

## Agent workflow codes

Agents link logical codes (not separate definition tables beyond link storage):

| Code | Typical use |
|------|-------------|
| `document-review` | Standard review before acceptance |
| `export-approval` | Extra emphasis on export gate |
| `archive-flow` | Path toward archive after export |

Configure on the agent under Administration → Agents (`workflowCodes`).

## How to create / operate a workflow (operators)

1. Start a conversation with an agent that has workflow codes linked.
2. Ask the agent to produce a document; save as a generated document (Draft).
3. Submit for review (transition to Pending Review) or use Approve.
4. Request changes (Needs Changes) or Reject as needed.
5. After Approved, export; then optionally Archive.

## Governance product rules

- No automatic publication or sending
- No automatic commercial or sensitive HR commitment
- Export only after human approval

## Related docs

- [Administration.md](./Administration.md)
- [API.md](./API.md)
- [Security.md](./Security.md)
