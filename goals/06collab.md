# Temporary Collaboration Goals

## Objective

Prepare the project for real-time multi-user editing in the current direction, after local semantics, persistence, and asset identity are stable.

## Sequence

Collaboration should not be started first. The local stack must already have:

- stable document model
- stable selection and transform semantics
- stable transaction history
- versioned persistence format

Without that, collaboration work will amplify instability.

## Required Collaboration Features

Eventually the project should support:

- remote document sync
- presence
- remote cursors
- remote selections
- conflict handling
- reconnect behavior
- offline edits
- resync after drift

## Data Requirements

Collaboration will be much easier if the local system already has:

- stable ids
- immutable updates
- transaction boundaries
- serializable operations

Those should be designed first in the local architecture.

## Transport-Agnostic Design

Do not tie the core scene model to a specific backend transport. The collaboration layer should sit around the store and transaction model, not inside renderer code.

## Presence

Presence should be transient state, not part of the persisted scene. This includes:

- pointer position
- viewport
- selected ids
- user color
- display name

## Conflict Strategy

The project will eventually need a defined merge strategy. Options include:

- operation log with rebasing
- CRDT-based document model
- server-authoritative transaction stream

Do not commit to one until local semantics are well-defined.

## Acceptance Criteria

The repository is ready for serious collaboration work when:

- local transactions are deterministic
- persistence and migrations exist
- the interaction layer does not hide state in transient UI-only mutations
- assets have stable identities
