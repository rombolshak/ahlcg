# Asking what the issue is actually for

Shared procedure. `/groom`, `/decompose`, and `/redecompose` all reference this.

Most issues in this repo are a title and an empty body — `#455 "Multiplayer"`, `#152 "Core meta-game mechanics"`. A title is a reminder of a thought, not the thought. The person who wrote it knows what they meant; the issue does not record it.

**Do not reconstruct the intent from the title.** A confident guess written into a permanent issue body is the most expensive failure this workflow can produce: everything downstream — the breakdown, the plan, the implementation, the review — treats it as the spec, and nobody rereads the one-liner to check. Explore the code first so you ask informed questions, then ask.

## When to ask

Ask if the answer would change what gets built or how it gets split.

Skip it, and say you are skipping it, when the issue already answers the question — a body that names the behaviour, the boundaries, and the reason is a body you should not re-litigate. Asking the user something their own issue already told you wastes their attention and trains them to click through.

Rules of thumb:

- Body is empty or one line → **always ask**.
- Body describes *what* but not *why* or *how far* → ask about the parts that are missing.
- Body reads like a spec already → confirm your reading in one sentence and move on.

## What to ask

Explore the code before asking, so the options are real ones rather than abstractions. Two to four questions, and make them the ones you genuinely cannot answer yourself:

- **Outcome** — what is true after this ships that is not true now? Phrase the options as observable behaviour.
- **Boundary** — where does it stop? The adjacent thing a reasonable person would assume is included is usually the thing that is not. This answer becomes *Out of scope*, which prevents more churn than any other section.
- **Depth** — the throwaway version or the real one? A hardcoded fixture, a working slice, or the complete feature are three different issues.
- **Shape**, only when the code leaves a genuine fork — two designs a reader would recognise as different, each with a real consequence.

Use `AskUserQuestion`. Concrete options beat open prompts: it is far easier to reject a wrong option than to write a spec from a blank page. Offer a recommendation first when you have one, and say why.

Ask **before** writing the body or proposing a breakdown, in one round if you can. A question that arrives after the user has read a page of proposed prose has already wasted their time.

## What to do with the answers

- Write them into the issue body, in the user's terms. That is the whole point — the answer becomes durable, and the next reader never has to ask again.
- If an answer contradicts something you found in the code, say so rather than quietly picking one. That contradiction is usually the most valuable thing to come out of the conversation.
- If the user's answer is "I don't know yet", record exactly that as an open question in the body. An acknowledged unknown is a fact worth keeping; a guess dressed as a decision is not.
