# Cloud Mail

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Cloud Mail is a responsive mail service for custom domains, backed by Cloudflare Workers. Users read, search, organize, and send mail across their own and shared mailboxes.

## Operating Context

Repository evidence: Vue 3, Element Plus, Pinia, Vue Router, and a Workers API. The mail experience includes inbox, sent mail, starred messages, local drafts, conversations, attachments, and mailbox switching. Administration pages are permission controlled.

## Capabilities and Constraints

Preserve authentication, permissions, shared mailbox access levels, server queries, message threading, attachment handling, sending, and draft persistence. Do not show unsupported archive, snooze, category, or trash features as working controls. Use existing configuration for the site title and domains.

## Brand Commitments

The user explicitly requested UI and UX similar to Gmail. This session retains Cloud Mail's configurable name and branding; this is an assumption after the optional preference question went unanswered.

## Users

Inferred from existing code: people managing personal or shared mailboxes on desktop and mobile; administrators also manage users, roles, and system settings. No further audience or deployment claims are established.

## Product Principles

- Make common mail tasks easy to discover and fast to repeat.
- Preserve permissions and working mail behavior throughout the redesign.
- Keep the same familiar navigation and action vocabulary across devices.
- Make loading, failure, and empty states recoverable and clear.
