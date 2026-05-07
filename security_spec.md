# Application Security Architecture: HUK.GOV Mockup

## 1. Data Invariants

1. **User Identity:** A user's profile (`/users/{userId}`) can only be created with the role `user` unless created by a `SystemOwner`. Users cannot alter their own `role` or `email` post-creation. User email must be linked directly to their Google Auth metadata.
2. **Page Content (CMS):** Only `admin`, `standard staff`, and `owner` identities can create, modify, or delete contents of `/pages/{pageId}` and `/categories`.
3. **Petition Integrity:** A `/petitions/{petitionId}` cannot be started without at least 1 initial signature count. The signature count must only ever increment by exactly `1` when a matching `/signatures/{userId}` document is created via a cross-collection atomic batch.
4. **Submissions Immunity:** `/pages/{pageId}/submissions/{subId}` documents represent incoming user form responses. Once created, they are strictly immutable. Only admins can read the list of responses.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing:** Creating a `/users/{uid}` pointing to an admin's UID.
2. **Role Escalation:** Self-updating `/users/{uid}` to add `{'role': 'owner'}`.
3. **Ghost Form Submissions:** Adding `{'status': 'approved'}` explicitly to an unowned form.
4. **Signature Manipulation:** Creating a petition with 10,000 signatures directly.
5. **Double Signing:** Incrementing `signatureCount` without a valid atomic signature record.
6. **Orphaned Writes:** Submitting signatures for petitions that don't exist.
7. **Value Poisoning (CMS):** Submitting a 50MB string as the markdown content for a page.
8. **Admin Lockdown:** Changing a Category name via an unauthenticated user session.
9. **Schema Break:** Removing required fields from `/pages/{pageId}` like `categoryId`.
10. **State Erasure:** Deleting a page's `submissions` to hide negative feedback.
11. **Spoofed Signatures:** Creating a `/signatures/{victimId}` signature as a different attacker UID.
12. **Response Spoofing:** Adding a `response` object to a petition via a non-admin account.

## 3. Test Runner
We are executing ESLint against our generated `firestore.rules` and verifying it is logically sound against the schema definition from the application code.
