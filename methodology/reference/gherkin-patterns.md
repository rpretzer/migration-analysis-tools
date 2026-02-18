# Gherkin Writing Reference

**Audience:** Spec Compiler agent.
**Purpose:** Standards, patterns, and domain-specific examples for writing Gherkin acceptance criteria that are machine-consumable by the Test Agent.

---

## 1. Core principles

Gherkin scenarios describe observable behavior from the user's perspective. They do not describe implementation. A scenario that passes must prove the acceptance criterion is met, not that a particular code path was executed.

**Declarative (correct):** Describes what happens.
**Imperative (incorrect):** Describes how the system does it.

---

## 2. Standard patterns

### Given / When / Then structure

```gherkin
Given [a precondition that is true before the action]
When [the user or system performs an action]
Then [an observable outcome is true]
```

Use `And` to continue the same clause without repeating the keyword.

```gherkin
Given the patron is authenticated
And the patron has 0 active borrows
When the patron taps "Borrow" on a title that is available
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

Scenario: Borrow an available audiobook
  Given the audiobook "Example Title" is available
  When the patron taps "Borrow"
  Then the borrow succeeds
```

### Scenario Outline with Examples

Use `Scenario Outline` when the same behavior must be verified across multiple input values.

```gherkin
Scenario Outline: Borrow limit enforcement by content type
  Given the patron has <active_borrows> active borrows of type <content_type>
  And the library borrow limit for <content_type> is <limit>
  When the patron attempts to borrow another <content_type> title
  Then the borrow is rejected
  And the patron sees the message "You have reached your borrow limit for <content_type>"

  Examples:
    | content_type | active_borrows | limit |
    | audiobook    | 10             | 10    |
    | ebook        | 5              | 5     |
    | movie        | 1              | 1     |
    | comic        | 3              | 3     |
```

---

## 3. Anti-patterns

### 3.1 Imperative steps

**Avoid:** Steps that describe implementation details or UI mechanics.

```gherkin
# Wrong — imperative, describes how not what
When the patron clicks the button with id "borrow-btn"
And the POST request to /api/v2/borrows returns 201
Then the JSON response contains { "status": "borrowed" }

# Correct — declarative, describes observable outcome
When the patron borrows the title
Then the borrow succeeds
And the title appears in the patron's active borrows
```

### 3.2 Vague assertions

**Avoid:** Assertions that cannot be verified mechanically.

```gherkin
# Wrong — "works correctly" is not verifiable
Then the player works correctly

# Correct — specific and verifiable
Then playback begins within 3 seconds
And the playback position is 0:00
And the play/pause control is visible
```

### 3.3 Testing implementation details

**Avoid:** References to internal data structures, database calls, or service internals.

```gherkin
# Wrong — tests the database, not the behavior
Then the borrows table has 1 new row with status "active"

# Correct — tests observable behavior
Then the patron's borrow count is 1
And the title is listed in "My Borrows"
```

### 3.4 Multiple actions in one When

**Avoid:** Compound `When` steps that obscure which action triggers which outcome.

```gherkin
# Wrong — two actions
When the patron searches for "mystery" and taps the first result

# Correct — separate the action that matters
When the patron searches for "mystery"
Then the search results display titles matching "mystery"

When the patron taps the first search result
Then the title detail screen is displayed
```

---

## 4. Domain-specific examples

### 4.1 Media playback

```gherkin
Feature: Audiobook playback

Scenario: Resume playback from saved position
  Given the patron has previously listened to 45 minutes of "Example Audiobook"
  When the patron opens the title and taps Play
  Then playback begins at the 45-minute position
  And the position indicator shows 45:00

Scenario: Playback speed adjustment
  Given the patron is playing an audiobook at 1x speed
  When the patron changes the speed to 1.5x
  Then the audio plays at 1.5x speed
  And the speed indicator shows "1.5x"
  And the playback speed persists when the patron leaves and returns

Scenario: Chapter navigation
  Given the patron is playing an audiobook with chapters
  When the patron taps "Next Chapter"
  Then playback jumps to the start of the next chapter
  And the chapter title in the player header updates

Scenario: Sleep timer
  Given the patron sets a sleep timer for 15 minutes
  When 15 minutes elapse
  Then playback pauses automatically
  And the patron sees a notification that the sleep timer has ended

Scenario: Background playback
  Given the patron is playing an audiobook
  When the patron navigates to another app
  Then playback continues in the background
  And media controls appear in the system notification area (Android) or control center (iOS)
```

### 4.2 Content borrowing and lending

```gherkin
Feature: Borrow flow

Scenario: Borrow an available title
  Given the title "Example Ebook" is available for borrowing
  And the patron has not reached their borrow limit
  When the patron borrows the title
  Then the borrow succeeds immediately (no hold queue)
  And the patron can open and read the title
  And the title appears in "My Borrows" with a due date

Scenario: Return a borrowed title early
  Given the patron has an active borrow of "Example Ebook"
  When the patron returns the title
  Then the title is removed from "My Borrows"
  And the patron's borrow count decreases by 1
  And the returned title is no longer accessible for reading

Scenario: Borrow limit reached
  Given the patron has 10 active borrows (the library's limit)
  When the patron attempts to borrow another title
  Then the borrow is rejected
  And the patron sees "You have reached your borrow limit"
  And the patron is prompted to return an existing borrow

Scenario: Title on hold when unavailable
  Given all copies of "Popular Title" are currently borrowed by other patrons
  When the patron taps "Borrow"
  Then the patron is offered the option to place a hold
  And the hold is confirmed
  And the patron sees their position in the hold queue

Scenario: Hold becomes available
  Given the patron is first in the hold queue for "Popular Title"
  When a copy becomes available (prior borrower returns or borrow expires)
  Then the patron receives a notification
  And the patron has 72 hours to claim the borrow
  And the title appears in "My Borrows" once the patron accepts
```

### 4.3 Search and browse

```gherkin
Feature: Search

Scenario: Basic text search
  Given the patron enters "Neil Gaiman" in the search field
  When the search executes
  Then the results list displays titles authored or narrated by Neil Gaiman
  And each result shows title, author, content type, and cover art

Scenario: Filtered search by content type
  Given the patron searches for "mystery"
  When the patron filters results to show only audiobooks
  Then all displayed results are audiobooks
  And the filter state persists if the patron changes the search term

Scenario: No results
  Given the patron searches for a term that matches no titles in the catalog
  Then the empty state message is displayed
  And the patron is offered related search suggestions or browse categories

Scenario: Browse by category
  Given the patron navigates to the "Science Fiction" category
  Then the category page displays Science Fiction titles
  And the patron can sort by Newest, Popular, and Alphabetical
  And the sort order persists within the session

Scenario: Typeahead suggestions
  Given the patron begins typing in the search field
  When the patron has entered 3 or more characters
  Then autocomplete suggestions appear within 300 milliseconds
  And the suggestions are relevant to the characters entered
```

### 4.4 Authentication

```gherkin
Feature: Patron authentication

Scenario: Successful login with library card
  Given the patron has a valid library card number and PIN
  When the patron enters their library card number and PIN
  Then authentication succeeds
  And the patron is taken to the home screen
  And the patron's library logo and name are displayed

Scenario: Invalid credentials
  Given the patron enters an incorrect PIN
  When authentication is attempted
  Then the login fails
  And the patron sees "Incorrect library card number or PIN"
  And the patron remains on the login screen

Scenario: Session expiry
  Given the patron's session has expired after the inactivity timeout
  When the patron attempts to borrow a title
  Then the patron is redirected to the login screen
  And a message explains that the session expired

Scenario: Biometric authentication (where supported)
  Given the patron has previously logged in and enabled biometric login
  When the patron opens the app
  Then the biometric prompt is displayed
  When the patron authenticates with biometrics
  Then the patron is taken to the home screen without entering credentials

Scenario: Multi-library patron
  Given the patron has accounts with two different libraries
  When the patron switches the active library
  Then the patron's borrow list and catalog update to reflect the selected library
  And the library logo and name update
```

### 4.5 Offline sync

```gherkin
Feature: Offline access

Scenario: Download title for offline reading
  Given the patron has borrowed "Example Ebook" and is connected to the internet
  When the patron downloads the title for offline access
  Then the download completes
  And the title is accessible when the device has no internet connection
  And the patron can read all content without network requests

Scenario: Offline playback
  Given the patron has downloaded "Example Audiobook"
  When the patron plays the audiobook with no internet connection
  Then playback begins from the last position
  And playback progress is recorded locally

Scenario: Sync progress after reconnection
  Given the patron listened offline and advanced 30 minutes from their last synced position
  When the patron reconnects to the internet
  Then the new playback position is synced to the server within 60 seconds
  And the position is visible on other devices

Scenario: Download storage limit
  Given the patron's device has less than 100 MB of free storage
  When the patron attempts to download a title requiring more than available space
  Then the download is rejected
  And the patron sees "Not enough storage to download this title"

Scenario: Downloaded title expires (DRM expiry)
  Given the patron has a downloaded title whose borrow period has ended
  When the patron opens the title
  Then the title is no longer accessible
  And the patron sees "Your borrow period for this title has ended"
  And the expired download is removed from local storage
```

---

## 5. Accessibility testing scenarios

```gherkin
Feature: Screen reader support

Scenario: VoiceOver/TalkBack announces borrow button state
  Given the patron is on a title detail screen
  And the patron has VoiceOver (iOS) or TalkBack (Android) enabled
  When focus moves to the Borrow button
  Then the screen reader announces "Borrow, button" when the title is available
  And announces "Return, button" when the title is already borrowed
  And announces "Place Hold, button" when no copies are available

Scenario: Dynamic type — text does not truncate at large sizes
  Given the patron has set the system text size to the largest accessibility size
  When the patron opens the search results screen
  Then all title text is fully visible (no truncation with ellipsis on primary labels)
  And the layout does not overflow or overlap elements

Scenario: Color contrast — body text meets 4.5:1 ratio
  Given the patron is viewing the title detail screen
  Then the body text color against the background color has a contrast ratio of at least 4.5:1
  And the title and author text contrast ratio is at least 4.5:1

Scenario: Tap target size
  Given the patron is on any screen with interactive controls
  Then all tap targets are at least 48x48 density-independent pixels

Scenario: Keyboard navigation (web)
  Given the patron is using the web application with keyboard-only navigation
  When the patron presses Tab to navigate through the page
  Then focus moves in a logical order through interactive elements
  And the currently focused element has a visible focus indicator
  And the patron can activate any interactive element with Enter or Space

Scenario: Focus trap in modal dialogs
  Given a confirmation dialog is open (e.g., "Return this title?")
  When the patron presses Tab
  Then focus cycles only within the dialog
  And focus does not move to content behind the dialog
  When the dialog is dismissed
  Then focus returns to the element that opened the dialog
```

---

## 6. Feature flag testing

Every scenario where a feature flag controls behavior must test both states.

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

Scenario Outline: Flag state is evaluated server-side
  Given the feature flag "new-recommendation-algorithm" is <flag_state>
  And the patron's targeting group is <group>
  When the patron's session is initialized
  Then the active algorithm is <expected_algorithm>

  Examples:
    | flag_state | group     | expected_algorithm |
    | enabled    | beta      | new                |
    | enabled    | control   | existing           |
    | disabled   | any       | existing           |
```

---

## 7. Edge cases

### Network failure

```gherkin
Scenario: Borrow attempt fails due to network error
  Given the device has no internet connection
  When the patron taps "Borrow"
  Then the patron sees "Unable to connect. Please check your internet connection."
  And no borrow is recorded
  And the patron can retry when connectivity is restored

Scenario: Network drops during download
  Given the patron has started downloading a title
  When the network connection is lost mid-download
  Then the download pauses automatically
  And the patron sees "Download paused — no internet connection"
  When the connection is restored
  Then the download resumes from where it paused
```

### DRM license expiry

```gherkin
Scenario: DRM license expires during active session
  Given the patron is playing a movie
  When the DRM license expires during playback
  Then playback pauses
  And the patron sees "License expired. Reconnect to continue."
  When the patron is connected and taps "Retry"
  Then the license is renewed and playback resumes from the paused position

Scenario: Offline DRM license expiry
  Given the patron has downloaded a movie for offline viewing
  And the offline DRM license has expired
  When the patron opens the movie offline
  Then the patron sees "Connect to the internet to renew your access."
  And playback does not begin
```

### Concurrent sessions

```gherkin
Scenario: Simultaneous playback on two devices is rejected
  Given the patron is actively playing a title on Device A
  When the patron starts playing the same title on Device B
  Then playback on Device A is paused
  And Device B begins playback
  And the patron on Device A sees "Playback was paused because you started playing on another device."
```

### Patron at borrow limit

```gherkin
Scenario: At-limit patron attempts to borrow — shown return prompt
  Given the patron has reached their borrow limit for all content types
  When the patron taps "Borrow" on any available title
  Then the borrow is rejected
  And the patron sees a list of their current borrows with return buttons
  And the patron can return a title from this prompt without navigating away
```
