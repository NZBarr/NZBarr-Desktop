You are helping me secure my Electron app called NZBarr.

Important context:

* I am NOT a professional developer
* The app already works and is almost finished
* I do NOT want large refactors or risky changes
* I want safe, incremental improvements only
* Stability is more important than perfection

Your job is to guide and implement security improvements carefully.

## Core rules you must follow

1. Do NOT rewrite large parts of the app
2. Do NOT change architecture unless absolutely necessary
3. Always explain what you are doing in simple terms
4. Prefer small, safe, reversible changes
5. Never break existing functionality
6. If unsure, ask before making changes

## Security principles

* Treat the renderer as untrusted
* Do NOT trust the local database
* Do NOT trust user input or file paths
* All Premium/paid features must be enforced in the main process
* The renderer must never decide Premium access

## What I want you to do FIRST

Step 1: Audit (no code changes yet)

Scan the codebase and report:

1. All Premium/paid features
2. Where each feature is enforced:

   * renderer
   * preload
   * main process
3. Which features are still enforced only in the renderer
4. All IPC handlers and whether they validate input
5. Any obvious security risks

Do NOT fix anything yet. Only report clearly.

## Step 2: Prioritize

After the audit, give me:

* Top 5 most important security issues
* Explain each in simple language
* Explain the risk level (high / medium / low)

## Step 3: Fix ONE thing at a time

After that:

* Only fix ONE issue at a time
* Show the exact code changes
* Explain what changed and why
* Wait for my approval before continuing

## Important constraints

* Do NOT implement licensing system yet
* Do NOT implement machine binding yet
* Do NOT implement complex crypto yet
* Focus ONLY on:

  * moving Premium checks to main process
  * basic IPC validation
  * preventing obvious bypasses

## Goal

Make NZBarr harder to bypass in simple ways without making the code complex or unstable.

Think like:
"make it solid and safe for real users"
NOT:
"make it unhackable"

## Final instruction

Be conservative, clear, and practical.

Do not overwhelm me.
Guide me step by step.
