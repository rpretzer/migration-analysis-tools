# Skill: Gherkin Writing

## Purpose

Gherkin scenarios describe observable behavior from the user's perspective. They do not describe implementation. A scenario that passes must prove the acceptance criterion is met, not that a particular code path was executed.

This skill covers the standard patterns, anti-patterns, domain-specific examples, and feature flag testing conventions used in the Hoopla migration engagement.

---

## Core rules

**Declarative:** Describe what happens, not how the system does it.
**Specific:** Every Then clause must be mechanically verifiable. Assertions that require human interpretation are rewrites.
**One action per When:** A When clause triggers exactly one action. Compound When clauses hide which action causes which outcome.
**Stable vocabulary:** Use the same terms throughout. "Patron" and "user" refer to the same entity — pick one (use "patron" for Hoopla).

---

## Standard patterns

### Basic Given / When / Then

```gherkin
Given [a precondition that is true before the action]
When [the patron or system performs one action]
Then [an observable outcome is true]
```

Use `And` to continue the same clause without repeating the keyword.

```gherkin
Given the patron is authenticated
And the patron has 0 active borrows
When the patron taps "Borrow" on an available title
Then the borrow succeeds
And the patron's active borrow count is 1
And the title appears in the patron's "My Borrows" list
```

### Background block

Use `Background` for preconditions shared across all scenarios in a feature file.

```gherkin
Background:
  Given the patron is authenticated
  And the patron's library subscribes to the Hoopla catalog
```

### Scenario Outline with Examples

Use `Scenario Outline` when the same behavior applies across multiple input values.

```gherkin
Scenario Outline: Borrow limit enforcement by content type
  Given the patron has <active_borrows> active borrows of type <content_type>
  And the library borrow limit for <content_type> is <limit>
  When the patron attempts to borrow another <content_type> title
  Then the borrow is rejected
  And the patron sees "You have reached your borrow limit for <content_type>"

  Examples:
    | content_type | active_borrows | limit |
    | audiobook    | 10             | 10    |
    | ebook        | 5              | 5     |
    | movie        | 1              | 1     |
    | comic        | 3              | 3     |
```

---

## Anti-patterns

### Imperative steps

Wrong: describes how the system works internally.
```gherkin
When the patron clicks the button with id "borrow-btn"
And the POST request to /api/v2/borrows returns 201
Then the JSON response contains { "status": "borrowed" }
```

Correct: describes observable outcome.
```gherkin
When the patron borrows the title
Then the borrow succeeds
And the title appears in the patron's active borrows
```

### Vague assertions

Wrong: "works correctly" is not verifiable.
```gherkin
Then the player works correctly
```

Correct: specific and measurable.
```gherkin
Then playback begins within 3 seconds
And the playback position is 0:00
And the play/pause control is visible
```

### Testing implementation details

Wrong: tests the database, not the behavior.
```gherkin
Then the borrows table has 1 new row with status "active"
```

Correct: tests observable behavior.
```gherkin
Then the patron's borrow count is 1
And the title is listed in "My Borrows"
```

### Multiple actions in one When

Wrong: two actions obscure causality.
```gherkin
When the patron searches for "mystery" and taps the first result
```

Correct: separate scenarios or sequential steps.
```gherkin
When the patron searches for "mystery"
Then the search results display titles matching "mystery"

When the patron taps the first search result
Then the title detail screen is displayed
```

---

## Domain examples

### Media playback

```gherkin
Feature: Audiobook playback

Scenario: Resume playback from saved position
  Given the patron has previously listened to 45 minutes of "Example Audiobook"
  When the patron opens the title and taps Play
  Then playback begins at the 45-minute position
  And the position indicator shows 45:00

Scenario: Background playback
  Given the patron is playing an audiobook
  When the patron navigates to another app
  Then playback continues in the background
  And media controls appear in the system notification area (Android) or control center (iOS)

Scenario: Sleep timer
  Given the patron sets a sleep timer for 15 minutes
  When 15 minutes elapse
  Then playback pauses automatically
  And the patron sees a notification that the sleep timer has ended
```

### Content borrowing

```gherkin
Feature: Borrow flow

Scenario: Borrow an available title
  Given the title "Example Ebook" is available for borrowing
  And the patron has not reached their borrow limit
  When the patron borrows the title
  Then the borrow succeeds immediately
  And the patron can open and read the title
  And the title appears in "My Borrows" with a due date

Scenario: Return a borrowed title early
  Given the patron has an active borrow of "Example Ebook"
  When the patron returns the title
  Then the title is removed from "My Borrows"
  And the patron's borrow count decreases by 1
  And the returned title is no longer accessible for reading

Scenario: Hold becomes available
  Given the patron is first in the hold queue for "Popular Title"
  When a copy becomes available
  Then the patron receives a notification
  And the patron has 72 hours to claim the borrow
```

### Authentication

```gherkin
Feature: Patron authentication

Scenario: Successful login with library card
  Given the patron has a valid library card number and PIN
  When the patron enters their library card number and PIN
  Then authentication succeeds
  And the patron is taken to the home screen
  And the patron's library logo and name are displayed

Scenario: Session expiry
  Given the patron's session has expired after the inactivity timeout
  When the patron attempts to borrow a title
  Then the patron is redirected to the login screen
  And a message explains that the session expired
```

### Search

```gherkin
Feature: Search

Scenario: Typeahead suggestions
  Given the patron begins typing in the search field
  When the patron has entered 3 or more characters
  Then autocomplete suggestions appear within 300 milliseconds
  And the suggestions are relevant to the characters entered

Scenario: No results
  Given the patron searches for a term that matches no titles
  Then the empty state message is displayed
  And the patron is offered related search suggestions or browse categories
```

### Offline access

```gherkin
Feature: Offline access

Scenario: Download title for offline reading
  Given the patron has borrowed "Example Ebook" and is connected to the internet
  When the patron downloads the title for offline access
  Then the download completes
  And the title is accessible when the device has no internet connection

Scenario: Sync progress after reconnection
  Given the patron listened offline and advanced 30 minutes from their last synced position
  When the patron reconnects to the internet
  Then the new playback position is synced to the server within 60 seconds
  And the position is visible on other devices
```

---

## Accessibility testing scenarios

```gherkin
Scenario: Screen reader announces borrow button state
  Given the patron is on a title detail screen
  And the patron has VoiceOver (iOS) or TalkBack (Android) enabled
  When focus moves to the Borrow button
  Then the screen reader announces "Borrow, button" when the title is available
  And announces "Return, button" when the title is already borrowed
  And announces "Place Hold, button" when no copies are available

Scenario: Dynamic type — text does not truncate at large sizes
  Given the patron has set the system text size to the largest accessibility size
  When the patron opens the search results screen
  Then all title text is fully visible with no truncation on primary labels
  And the layout does not overflow or overlap elements

Scenario: Tap target size
  Given the patron is on any screen with interactive controls
  Then all tap targets are at least 48x48 density-independent pixels

Scenario: Focus trap in modal dialogs
  Given a confirmation dialog is open
  When the patron presses Tab
  Then focus cycles only within the dialog
  When the dialog is dismissed
  Then focus returns to the element that opened the dialog
```

---

## Feature flag testing

Every scenario where a feature flag controls behavior must test both states. Testing only the flag-on state is a Gate 4 failure.

```gherkin
Feature: New recommendation algorithm (behind feature flag)

Scenario: Recommendations with flag enabled
  Given the feature flag "new-recommendation-algorithm" is enabled
  When the patron views the home screen
  Then recommendations are generated by the new algorithm
  And the recommendation section is labeled "Recommended for You"

Scenario: Recommendations with flag disabled (fallback)
  Given the feature flag "new-recommendation-algorithm" is disabled
  When the patron views the home screen
  Then recommendations are generated by the existing algorithm
  And the behavior is identical to the pre-flag baseline
```

Use `Scenario Outline` when targeting groups matter:

```gherkin
Scenario Outline: Flag state is evaluated server-side
  Given the feature flag "new-recommendation-algorithm" is <flag_state>
  And the patron's targeting group is <group>
  When the patron's session is initialized
  Then the active algorithm is <expected_algorithm>

  Examples:
    | flag_state | group   | expected_algorithm |
    | enabled    | beta    | new                |
    | enabled    | control | existing           |
    | disabled   | any     | existing           |
```

---

## Edge case patterns

### Network failure

```gherkin
Scenario: Borrow attempt fails due to network error
  Given the device has no internet connection
  When the patron taps "Borrow"
  Then the patron sees "Unable to connect. Please check your internet connection."
  And no borrow is recorded
  And the patron can retry when connectivity is restored
```

### DRM license expiry during playback

```gherkin
Scenario: DRM license expires during active session
  Given the patron is playing a movie
  When the DRM license expires during playback
  Then playback pauses
  And the patron sees "License expired. Reconnect to continue."
  When the patron is connected and taps "Retry"
  Then the license is renewed and playback resumes from the paused position
```

### Concurrent sessions

```gherkin
Scenario: Simultaneous playback on two devices is rejected
  Given the patron is actively playing a title on Device A
  When the patron starts playing the same title on Device B
  Then playback on Device A is paused
  And Device B begins playback
  And Device A shows "Playback was paused because you started playing on another device."
```

---

## Scenario numbering convention

Number acceptance criteria as AC-1, AC-2, ... within each story. The test-spec.md must map every AC number to at least one test case. AC numbers must not be reused or reordered after a spec is compiled — they are stable identifiers for the Quality Gate.
