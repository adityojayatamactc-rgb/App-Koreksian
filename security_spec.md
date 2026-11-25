# Security Specification: AsesmenSMK Firestore Rules

## 1. Data Invariants
1. Every subject configuration (`/users/{userId}/subjects/{subjectId}`) and student submission (`/users/{userId}/submissions/{submissionId}`) belongs strictly to an authenticated, email-verified teacher account (`request.auth.uid == userId`).
2. `subjects` and `submissions` cannot be created unless the parent `/users/{userId}` profile document exists (Master Gate).
3. `submissions` must reference an existing `subjectId` under `/users/{userId}/subjects/{subjectId}` on creation.
4. `ownerId`, `uid`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
5. Bounded arrays: `answerKey.size() <= 45`, `essayRubrics.size() == 5`, `mcAnswers.size() <= 45`, `essayAnswers.size() <= 5`.
6. Document size guard: `fileDataUrl.size() <= 350000` so compressed preview thumbnails never approach Firestore's 1 MB document limit.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated read/write to `/users/{userId}/submissions/{submissionId}` -> `PERMISSION_DENIED`.
2. Authenticated user A reading/listing user B's `/users/{userB}/subjects` -> `PERMISSION_DENIED`.
3. Creating subject with unverified email (`email_verified: false`) -> `PERMISSION_DENIED`.
4. Shadow field injection (`isAdmin: true` or `extraField: 1`) on `TeacherProfile`, `SubjectConfig`, or `StudentSubmission` -> `PERMISSION_DENIED`.
5. Spoofed `ownerId` (`ownerId != request.auth.uid`) on create -> `PERMISSION_DENIED`.
6. Mutating immutable `ownerId` or `createdAt` during update -> `PERMISSION_DENIED`.
7. Client-forged `createdAt` / `updatedAt` timestamp not equal to `request.time` -> `PERMISSION_DENIED`.
8. Oversized document ID (`> 128` chars or invalid characters like `../`) -> `PERMISSION_DENIED`.
9. Oversized `fileDataUrl` (`> 350000` chars) or `studentName` (`> 150` chars) -> `PERMISSION_DENIED`.
10. Unbounded array (`mcAnswers.size() > 45` or `essayAnswers.size() > 5`) -> `PERMISSION_DENIED`.
11. Orphaned submission referencing a non-existent `subjectId` -> `PERMISSION_DENIED`.
12. Invalid `status` value (e.g., `status: "hacked"`) or `pgCount` not in `[40, 45]` -> `PERMISSION_DENIED`.
