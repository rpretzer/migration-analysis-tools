# Midwest Tape End-to-End Architecture Analysis

**Source:** End to End MWT Architecture Map (PDF)
**Date:** 2026-02-17
**Purpose:** Document the current-state architecture, identify opportunities for BFF pattern, microservices decomposition, and thin-client migration.

---

## 1. Current Architecture — What the Map Shows

### 1.1 Two Primary Systems

The architecture contains two distinct product systems sharing infrastructure:

**Hoopla** (top section, blue border) — The digital media streaming platform.
**eCom** (bottom section, yellow/green border) — The physical/digital commerce platform for library purchasing.

Both deploy on AWS. They share a data/analytics layer but have separate API gateways, separate compute, and separate storage.

### 1.2 Hoopla System

**Client surfaces (left edge):**
- Web (browser)
- Android app
- iOS app
- Roku
- Samsung TV
- Apple TV
- Fire TV (Amazon)
- Library partner integrations (Midwest Tape branded)

**Backend (blue AWS region):**
- CloudFront CDN (content delivery)
- API Gateway with multiple API endpoints (REST)
- Multiple API services listed behind the gateway:
  - Content APIs
  - Search APIs
  - User/Authentication
  - Playback/streaming
  - Additional service endpoints
- Digital Transformation layer (appears to be ETL/event processing)
- AWS S3 buckets (content storage, labeled "AWS Hoopla")
- Lambda functions (serverless compute)
- Amazon Cognito (authentication/identity)
- Search infrastructure (Elastic/OpenSearch)
- Event-driven architecture components (SQS/SNS visible)

**Key observation:** The Hoopla clients appear to connect to the API Gateway directly. Multiple API endpoints are listed, suggesting clients must orchestrate calls across many services. This is a **thick client pattern** — the client knows about the backend's internal service decomposition.

### 1.3 eCom System

**Client surfaces:**
- Front End eCom (web)
- CMS (content management)
- Partner integrations: OCLC, Z39.50, ILS WS (Integrated Library System Web Services)

**Backend (yellow AWS region):**
- API Gateway with extensive service list:
  - Auth, Content/Search, Pricing, Search/Order, Basket/Checkout, Subscriptions, Orders, Authentication, Customers, Returns, Content/Search, Subscriptions
- Lambda Transformation layer
- AWS eCom (S3 buckets)
- Oracle CDC (Change Data Capture) — indicates Oracle database as a source of truth for commerce data

### 1.4 Shared Data and AI/ML Layer (teal region, center-right)

- MongoDB (document store)
- Amazon SageMaker (ML model serving)
- Amazon EMR (big data processing)
- ML Models (recommendation, personalization)
- Amazon Redshift (data warehouse)
- S3 data lake buckets (multiple, feeding ML pipeline)
- OpenSearch Connector (cross-cutting search across both systems)

### 1.5 Enterprise Integration Layer (right side)

- **SAP ECC** — Enterprise resource planning for physical sales
  - CDC to ALE integration (data replication from digital to SAP)
  - Products feed
  - Digital Updates flow
- **Redis** — Caching layer (appears to serve multiple systems)
- **RDS/MySQL** — Relational database(s)
- **Braze** — Marketing automation and push notifications
- **Salesforce** — CRM
- **Tableau + ETL/BI** — Business intelligence and reporting
- **UI** — Internal admin/operations interface
- **Content delivery pipeline** — CDN and media asset distribution

### 1.6 Data Flows

Red lines appear to represent real-time data flows (APIs, streaming).
Blue lines appear to represent batch/async data flows (CDC, ETL, data sync).

Notable flows:
- Hoopla → AI/ML: Content and user behavior data feeds recommendation models
- eCom → Oracle CDC → Shared data layer: Commerce data replicated for analytics
- SAP ECC ↔ Digital systems: Bidirectional product and sales data sync
- Both systems → Redshift: Consolidated analytics warehouse
- Braze: Receives data for marketing campaigns from both systems

---

## 2. Architecture Gaps and Opportunities

### 2.1 No BFF Layer — Clients Are Too Thick

**Current state:** Both Hoopla and eCom clients hit the API Gateway directly, which exposes multiple backend service endpoints. Each client platform must:
- Know which endpoints to call for a given user flow
- Orchestrate multiple API calls (e.g., fetch content + check availability + get user preferences + get recommendations)
- Handle response transformation per platform (phone vs. tablet vs. TV vs. web)
- Implement business logic for circulation rules, hold management, availability calculation
- Manage caching strategy per platform

**Problem:** This means business logic is duplicated across 7+ client platforms. A rule change (e.g., "patrons can now borrow 15 items instead of 10") requires changes to every client. Each client has a different code quality, different release cycle, and different testing maturity. The clients are the bottleneck.

**Recommendation:** Insert a BFF (Backend-for-Frontend) layer between the clients and the API Gateway.

### 2.2 Service Boundaries Are Not Clean

The eCom API list shows overlapping service names (Auth appears twice, Content/Search appears twice, Subscriptions appears twice). This suggests the service decomposition is either incomplete, duplicated, or evolved organically rather than by design.

### 2.3 Shared Infrastructure Creates Coupling

Hoopla and eCom share the AI/ML pipeline and Redshift warehouse. While this is efficient for analytics, it means changes to Hoopla's data model can affect eCom's ML features and vice versa. The shared OpenSearch Connector is another coupling point.

### 2.4 SAP Integration Is a Constraint

SAP ECC is the system of record for physical media. The CDC/ALE integration path is inherently batch-oriented and introduces latency. Any feature that requires real-time inventory across physical and digital will be constrained by this integration.

### 2.5 Analytics Is Custom (Confirmed by User)

The Tableau + ETL/BI layer indicates custom analytics. This is a known gap — the analytics implementation needs to be inventoried once repo access is granted.

---

## 3. BFF Architecture Recommendation

### 3.1 Three BFF Layers

```
Clients                    BFF Layer                  Backend Services
                          (new)                       (existing)
┌──────────────┐
│ Android      │
│ iOS          │──────► Mobile BFF ──────────────► API Gateway ──► Services
│              │        (KMP shared)
└──────────────┘

┌──────────────┐
│ Web          │──────► Web BFF ─────────────────► API Gateway ──► Services
│ (React)      │        (Ktor/Node)
└──────────────┘

┌──────────────┐
│ Roku         │
│ Fire TV      │──────► TV/STB BFF ──────────────► API Gateway ──► Services
│ Apple TV     │        (lightweight)
│ Samsung      │
└──────────────┘
```

**Why three, not one:**
- Mobile needs offline-first data bundling, aggressive caching, delta sync
- Web needs SEO-friendly responses, server-side rendering data, faster initial load
- TV/STB needs simplified navigation data, 10-foot UI optimized responses, D-pad focus metadata

**Why not seven (one per platform):**
- Android and iOS share 90%+ of their BFF logic — this is the primary KMP target
- TV platforms share remote-navigation constraints — one BFF serves all
- Web stands alone due to SSR requirements

### 3.2 What Moves to the BFF

| Currently in Client | Moves to BFF | Rationale |
|-------------------|-------------|-----------|
| Multi-API orchestration (call content + availability + prefs + recs) | **BFF aggregates** into a single response per screen | Client makes 1 call per screen, not 4-6 |
| Circulation rules (borrow limits, hold queue position, availability math) | **BFF computes** and returns simple states (available/unavailable/hold-position-N) | Rule changes deploy to BFF, not 7 clients |
| Content formatting (title cards, detail pages, search result shaping) | **BFF shapes** per platform (image sizes, text truncation, metadata filtering) | Phone gets compact cards, TV gets large hero images |
| Search result ranking and filtering | **BFF applies** ranking and filters server-side | Consistent results across platforms |
| Recommendation blending (multiple ML models → unified feed) | **BFF blends** recommendation sources | ML model changes don't require client updates |
| Error handling and retry logic for backend calls | **BFF handles** retries, circuit breaking, fallback content | Clients see clean success/failure, no partial states |
| LaunchDarkly flag evaluation for server-side features | **BFF evaluates** flags and returns the correct response variant | Clients don't need the LaunchDarkly SDK for server-decided features |
| Response caching (Redis) | **BFF manages** cache with platform-aware TTLs | Mobile gets aggressive cache (offline), web gets short TTL (fresh) |

### 3.3 What Stays in the Client (Thin Client)

| Stays in Client | Rationale |
|----------------|-----------|
| UI rendering (Compose Multiplatform) | Platform-native rendering, can't be server-side |
| DRM playback engine (ExoPlayer, AVPlayer, platform DRM) | OS-level integration, legally required to be on-device |
| Offline storage and sync | Device storage management is inherently local |
| Push notification handling | OS-level integration |
| Biometrics / device authentication | Security requirement: on-device |
| LaunchDarkly flag evaluation for UI-only features | Client-side flags for UI experiments only |
| Accessibility engine integration (TalkBack, VoiceOver) | OS-level |
| Platform navigation (back stack, deep links) | OS-level |

### 3.4 BFF Technology Choices

| BFF | Technology | Rationale |
|-----|-----------|-----------|
| Mobile BFF | **Ktor (Kotlin)** | Shares language with KMP clients. Team already knows Kotlin. Ktor is lightweight, coroutine-native, and runs on JVM. |
| Web BFF | **Node.js or Ktor** | If React stays short-term, Node.js BFF with SSR makes sense. If migrating to Compose Web, Ktor aligns with the KMP ecosystem. |
| TV/STB BFF | **Ktor (Kotlin)** or **shared with Mobile BFF** | TV and mobile BFFs may be the same service with platform-aware response shaping. Evaluate after initial analysis. |

### 3.5 BFF Deployment

Deploy BFFs as AWS Lambda functions behind the existing API Gateway, or as ECS/Fargate containers. Lambda is simpler for the aggregation pattern (short-lived, stateless). ECS is better if BFFs need WebSocket support (e.g., real-time playback state sync).

---

## 4. Microservices Decomposition Recommendations

### 4.1 Current State Assessment

The backend appears to be a set of services behind an API Gateway, but the service boundaries are unclear from the architecture map. The eCom side lists ~12 service names with apparent duplication. The Hoopla side shows fewer named services but a more complex internal architecture (Lambda, SQS, S3, Cognito).

### 4.2 Proposed Bounded Contexts

Decompose backend services along domain boundaries. Each microservice owns its data and exposes a clean API.

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN SERVICES                             │
│                                                                 │
│  ┌──────────────┐  ┌────────────-──┐  ┌──────────────┐          │
│  │   Content    │  │  Circulation  │  │   Identity   │          │
│  │   Catalog    │  │  & Lending    │  │   & Auth     │          │
│  │              │  │               │  │              │          │
│  │ • Titles     │  │ • Borrows     │  │ • Users      │          │
│  │ • Metadata   │  │ • Holds       │  │ • Sessions   │          │
│  │ • Categories │  │ • Limits      │  │ • Library    │          │
│  │ • Assets     │  │ • Availability│  │   accounts   │          │
│  │ • Licensing  │  │ • Returns     │  │ • Cognito    │          │
│  └──────────────┘  └──────────────-┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────-┐          │
│  │   Playback   │  │   Search &   │  │  Notification │          │
│  │   & DRM      │  │   Discovery  │  │  & Marketing  │          │
│  │              │  │              │  │               │          │
│  │ • Stream URLs│  │ • Full-text  │  │ • Push (Braze)│          │
│  │ • DRM tokens │  │ • Faceted    │  │ • Email       │          │
│  │ • Progress   │  │ • Recs (ML)  │  │ • In-app      │          │
│  │ • Bookmarks  │  │ • Trending   │  │ • Campaigns   │          │
│  │ • Downloads  │  │ • OpenSearch │  │               │          │
│  └──────────────┘  └──────────────┘  └──────────────-┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────-──┐          │
│  │   Analytics  │  │   Library    │  │   Commerce    │          │
│  │   & Reporting│  │   Admin      │  │   (eCom)      │          │
│  │              │  │              │  │               │          │
│  │ • Events     │  │ • Config     │  │ • Orders      │          │
│  │ • Dashboards │  │ • Consortia  │  │ • Pricing     │          │
│  │ • Exports    │  │ • Patron mgmt│  │ • Catalog     │          │
│  │ • Redshift   │  │ • ILS sync   │  │ • SAP bridge  │          │
│  │ • Tableau    │  │ • Z39.50     │  │ • OCLC        │          │
│  └──────────────┘  └──────────────┘  └──────────────-┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Data Ownership

Each microservice owns its primary data store. Cross-service data access is via API, not shared database.

| Service | Primary Store | Rationale |
|---------|--------------|-----------|
| Content Catalog | MongoDB (existing) + S3 (assets) | Document store fits variable metadata; S3 for media assets |
| Circulation & Lending | PostgreSQL/RDS (existing) | Transactional data with strong consistency requirements |
| Identity & Auth | Cognito (existing) + RDS | Cognito for auth tokens; RDS for user profiles and library accounts |
| Playback & DRM | Redis (hot state) + S3 (manifests) | Low-latency stream URL generation; Redis for playback progress |
| Search & Discovery | OpenSearch (existing) | Already in place; add recommendation service as a sidecar |
| Notification & Marketing | Braze (existing) | Braze is the system of record for campaigns |
| Analytics & Reporting | Redshift (existing) + custom events | Redshift for warehouse; custom event pipeline needs inventory |
| Library Admin | RDS | Library config, consortia, ILS integration state |
| Commerce (eCom) | Oracle (existing via CDC) + RDS | Oracle is legacy SoR; migrate to RDS over time |

### 4.4 Inter-Service Communication

- **Synchronous** (API calls): BFF → backend services. Keep latency-sensitive paths synchronous.
- **Asynchronous** (events): Service-to-service data propagation. Use existing SQS/SNS infrastructure.
  - Content Catalog publishes `content.updated` → Search indexes; Notification sends new-content alerts
  - Circulation publishes `borrow.completed` → Analytics records; Recommendation model updates
  - Commerce publishes `order.completed` → SAP sync; Analytics records

---

## 5. Thin Client Migration Strategy

### 5.1 Current Client Responsibilities (Thick)

Based on the architecture map and the existing Android analysis (1,204 classes, 56 packages):

| Client Responsibility | Complexity | Migration Target |
|----------------------|-----------|-----------------|
| API orchestration (multiple calls per screen) | High | **BFF** — single call per screen |
| Circulation rule evaluation | Medium | **BFF** — server evaluates rules |
| Content formatting and presentation logic | Medium | **BFF** — platform-aware response shaping |
| Search and filter logic | Medium | **BFF** — server-side search |
| Recommendation blending | Medium | **BFF** — server blends ML outputs |
| Offline storage management | High | **Client** — stays, but simplified (BFF provides delta bundles) |
| DRM playback (ExoPlayer/AVPlayer) | High | **Client** — stays native |
| UI rendering | High | **Client** — stays, moves to CMP |
| Authentication flow | Medium | **Split** — Cognito token management in BFF, biometric unlock in client |
| Error handling and retry | Medium | **BFF** — client sees clean responses |
| Analytics instrumentation | Low | **Split** — server events via BFF, client events (UI interactions) stay |
| Push notification handling | Low | **Client** — stays native |
| Deep linking and navigation | Low | **Client** — stays native |

### 5.2 Migration Sequence

**Phase 0: BFF Foundation**
1. Deploy Mobile BFF (Ktor on Lambda or ECS)
2. Implement screen-level aggregation for 3 highest-traffic screens (Home, Browse, Title Detail)
3. Clients call BFF instead of multiple backend APIs for these screens
4. Measure: latency reduction, client code removed, bug rate change

**Phase 1: Business Logic Migration**
1. Move circulation rules to BFF (borrow limits, availability calculation, hold queue)
2. Move content formatting to BFF (title cards, detail pages, search results)
3. Move recommendation blending to BFF
4. Client code for these features deleted (not just bypassed)

**Phase 2: Client Thinning**
1. Remove duplicated business logic from all 7 client platforms
2. Client responsibilities reduced to: UI rendering (CMP), DRM playback (native), offline sync (simplified), platform integrations (native)
3. New features are BFF-first: business logic goes to BFF, clients receive pre-shaped data

**Phase 3: Full Thin Client**
1. Clients are pure presentation layers + platform integrations
2. All business logic lives in BFF or backend services
3. A rule change deploys to BFF once, not to 7 clients
4. Client release cycle is decoupled from business logic changes

### 5.3 Impact on KMP/CMP Migration

The BFF strategy **reduces** the scope of KMP shared code needed on the client:

| Without BFF | With BFF |
|------------|---------|
| KMP shared module contains: networking, data models, auth, caching, circulation rules, content formatting, search logic, recommendation logic | KMP shared module contains: networking (BFF client), data models (simplified — BFF shapes responses), auth (token management), offline sync |
| ~60% of client code is shared business logic | ~30% of client code is shared (mostly networking + offline) |
| CMP shared UI must handle complex state from multiple API calls | CMP shared UI receives pre-shaped data from BFF — simpler state management |

This is a **better outcome**: less shared code means less risk in the KMP migration, simpler client architecture, and faster iteration on business logic via server-side deployment.

---

## 6. Updated Classification Framework

With the BFF pattern, the CLEAN architecture classification gains a new dimension:

| Layer | Location | Technology |
|-------|----------|-----------|
| **Domain** (entities, use cases) | **BFF + Backend services** | Kotlin (Ktor), shared with KMP where needed |
| **Data** (repositories, API clients) | **BFF** (aggregation) + **Client** (BFF client, offline store) | Ktor (BFF), KMP shared (client networking) |
| **Presentation** (ViewModels, UI) | **Client only** | KMP shared ViewModels + CMP shared UI |
| **Framework** (DRM, push, biometrics) | **Client only** | Native per-platform |

The key shift: **Domain and most of Data move server-side.** The client's KMP shared module shrinks to networking, offline sync, and simplified data models. CMP handles all UI.

---

## 7. Observations Requiring Repo Access

The following cannot be fully assessed from the architecture diagram alone:

1. **API contract inventory** — What endpoints exist, their request/response shapes, which clients call which endpoints
2. **Service decomposition reality** — Whether the named services are actually separate deployments or logical groupings within a monolith
3. **Database schema** — Whether services share tables (coupling risk) or have clean data boundaries
4. **Event pipeline** — What events flow through SQS/SNS, their schemas, and which services consume them
5. **Analytics instrumentation** — Custom implementation details, event taxonomy, dashboards
6. **LaunchDarkly integration** — Flag inventory, SDK usage patterns, server-side vs client-side evaluation
7. **CI/CD pipeline** — Build, test, deploy processes for each component
8. **DRM implementation details** — License server configuration, key rotation, multi-DRM handling per platform
9. **ILS/Z39.50/OCLC integration** — Partner API contracts and data flows
10. **SAP ECC integration maturity** — CDC/ALE reliability, latency, data model mapping

---

## 8. Recommendations Summary

| Priority | Recommendation | Impact | Effort |
|----------|---------------|--------|--------|
| **P0** | Insert Mobile BFF between clients and API Gateway | Unblocks thin-client migration; reduces client complexity immediately | 4-6 weeks for MVP (3 screens) |
| **P0** | Inventory existing API contracts and service boundaries | Required before any decomposition work | 1-2 weeks (Codebase Analyst) |
| **P1** | Move circulation rules to BFF | Highest-value business logic migration; rule changes become server-side deploys | 2-3 weeks after BFF exists |
| **P1** | Define microservice bounded contexts and data ownership | Prevents further coupling; enables independent scaling | 2-3 weeks (architecture) |
| **P2** | Add Web BFF for SSR optimization | Improves web performance; prepares for Compose Web migration | 3-4 weeks |
| **P2** | Consolidate eCom service duplication | Reduces maintenance burden; clarifies service ownership | 4-6 weeks |
| **P3** | TV/STB BFF (may share Mobile BFF) | Optimizes TV experience; D-pad focus metadata | 2-3 weeks |
| **P3** | Migrate Oracle CDC to event-driven architecture | Reduces SAP integration latency; enables real-time inventory | 6-8 weeks |

---

## 9. Impact on Pipeline Strategy

The BFF layer adds new dimensions to the development pipeline:

**New agent consideration:** The Codebase Analyst must analyze not just client code but also BFF and backend service code. The current-state model expands from 3 platforms (Android/iOS/web) to 3 clients + BFF + backend services.

**Spec Compiler impact:** Specs for features must now specify where logic lives (BFF vs client). The "file-level targets" in compiled specs may include BFF files, not just client files.

**Story decomposition:** A feature story may decompose into: (1) BFF endpoint story, (2) client UI story, (3) backend service story. The pipeline must handle this dependency chain.

**Testing impact:** The Test Agent must test both BFF contract compliance (does the BFF return what the client expects?) and client rendering (does the client display what the BFF returns correctly?).

---

_Analysis (c) RSP Management Solutions LLC._
