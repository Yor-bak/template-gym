# Graph Report - C:/J2EC-GYM  (2026-07-15)

## Corpus Check
- 246 files · ~121,363 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1121 nodes · 2404 edges · 107 communities (70 shown, 37 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.72)
- Token cost: 71,219 input · 0 output

## Community Hubs (Navigation)
- Web Root Layout & Misc Pages
- Web App Dependencies
- Trainer Client & Profile Screens
- API Core Models & Auth Guards
- Inventory & Members Pages
- Activation & Auth Login Flow
- Expo App Config
- Customer Support, Login & Sidebar
- API Test Fixtures & Factories
- Project Docs & Design Rationale
- Membership Status & Avatar UI
- Web TypeScript Config
- Supabase Legacy Schema
- Client Home & Settings Screens
- Access Log Seed Data
- Mobile Mock DB & Auth Context
- Inventory Cart & Checkout UI
- API Error Handling
- Access History & Payments Pages
- Mobile App Dependencies
- Web Mock Seed State
- API Authorization Service
- Sale Modal & Mobile Invoice
- Income Page & Cart Components
- Mobile Auth Screens
- API Password Hashing & Users
- Mobile TypeScript Config
- Member Profile & Staff Page
- Members List & Payment Modal
- Mobile Route Layouts
- Dashboard Alerts & Activity Feed
- API Membership Plans Module
- Reports Page & Status Badge
- Web Store Type Definitions
- API Gyms Module
- Member & Membership Types
- Peak Hours Report
- API Members Router
- Mobile Native Dependencies
- Mobile Reset-Project Script
- Web Inventory & Scan Types
- Monorepo Root Config
- API Users Model & Repository
- Mobile Animated Splash Icon
- API Members Service
- Trainer Clients Screen
- Web Staff API Route
- Infra Generate-Secrets Script
- Web Payments Data & Type
- Web Agent Instructions Docs
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 85
- Community 86
- Community 87
- Community 88
- Community 90
- Community 104

## God Nodes (most connected - your core abstractions)
1. `useStore()` - 47 edges
2. `useAuth()` - 40 edges
3. `formatCurrency()` - 31 edges
4. `formatDate()` - 24 edges
5. `useCamera()` - 23 edges
6. `useAuth()` - 21 edges
7. `useScanner()` - 21 edges
8. `AppShell()` - 20 edges
9. `cn()` - 19 edges
10. `User` - 18 edges

## Surprising Connections (you probably didn't know these)
- `make_member()` --calls--> `generate_activation_code()`  [INFERRED]
  apps/api/tests/conftest.py → apps/api/app/modules/members/models.py
- `Replaces 7-container Supabase self-hosted stack with 2 containers` --conceptually_related_to--> `supabase/schema.sql (legacy backend)`  [INFERRED]
  infra/docker-compose.yml → README.md
- `supabase/schema.sql (legacy backend)` --conceptually_related_to--> `apps/api FastAPI backend`  [INFERRED]
  README.md → apps/api/README.md
- `Disconnected dashboard/app from Supabase, back to local mock mode` --rationale_for--> `Mock mode (no real backend)`  [INFERRED]
  cambios-cesar/README.md → README.md
- `Mock mode (no real backend)` --conceptually_related_to--> `apps/api FastAPI backend`  [INFERRED]
  README.md → apps/api/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **First platform_admin bootstrap flow** — apps_api_readme_seed_first_admin, infra_readme_seed_first_admin, apps_api_readme_authz_service [INFERRED 0.85]
- **Migration from self-hosted Supabase to FastAPI backend** — readme_supabase_schema, cambios_cesar_readme_supabase_disconnect, apps_api_readme_fastapi_backend, infra_docker_compose_supabase_replacement [INFERRED 0.85]
- **Self-hosted API stack on Raspberry Pi (db + api containers)** — infra_readme_docker_stack, infra_docker_compose_db_service, infra_docker_compose_api_service [EXTRACTED 1.00]

## Communities (107 total, 37 thin omitted)

### Community 0 - "Web Root Layout & Misc Pages"
Cohesion: 0.05
Nodes (66): AccessMonitorPage(), archivo, barlowCondensed, metadata, plexMono, SettingsPage(), SettingsTab, tabs (+58 more)

### Community 1 - "Web App Dependencies"
Cohesion: 0.04
Nodes (46): dependencies, clsx, date-fns, lucide-react, next, react, react-dom, @supabase/supabase-js (+38 more)

### Community 2 - "Trainer Client & Profile Screens"
Cohesion: 0.10
Nodes (31): ClientRoutineEditorScreen(), EditableExercise, EMPTY_EXERCISE, styles, ProfileScreen(), ROLE_LABEL, styles, styles (+23 more)

### Community 3 - "API Core Models & Auth Guards"
Cohesion: 0.09
Nodes (35): require_role(), Base, PK uuid generada en Python (no depende de pgcrypto/gen_random_uuid en la DB)., TimestampMixin, _utcnow(), UUIDPkMixin, Gym, create() (+27 more)

### Community 4 - "Inventory & Members Pages"
Cohesion: 0.10
Nodes (29): AREA_TABS, emptyForm(), FormState, fromItem(), InventoryPage(), isEquipment(), s(), STATUS_OPTIONS (+21 more)

### Community 5 - "Activation & Auth Login Flow"
Cohesion: 0.08
Nodes (23): ActivateAccountResponse, do_run_migrations(), run_migrations_online(), login(), AsyncSession, LoginRequest, BaseModel, TokenResponse (+15 more)

### Community 6 - "Expo App Config"
Cohesion: 0.06
Nodes (34): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+26 more)

### Community 7 - "Customer Support, Login & Sidebar"
Cohesion: 0.10
Nodes (24): CustomerSupportPage(), DEMO_ROLE_LABELS, LoginPage(), navItems, roleLabels, ACCOUNT_TYPE_LABELS, CustomerSupportSection(), CustomerSupportSectionProps (+16 more)

### Community 8 - "API Test Fixtures & Factories"
Cohesion: 0.17
Nodes (30): client(), db_session(), factories(), make_gym(), make_member(), make_user(), AsyncClient, AsyncSession (+22 more)

### Community 9 - "Project Docs & Design Rationale"
Cohesion: 0.09
Nodes (33): Alembic migrations, app/auth (AuthzService, require_role, get_current_user), apps/api FastAPI backend, app/modules/ domain module structure, Tests run against real Postgres (not SQLite), scripts.seed_first_admin (local bootstrap), uv (Python dependency/dev tool), Expo v57 breaking-changes notice (+25 more)

### Community 10 - "Membership Status & Avatar UI"
Cohesion: 0.11
Nodes (18): FALLBACK_META, MembershipStatusBadge(), META, EXPLANATIONS, colors, getColor(), MemberAvatar(), MemberAvatarProps (+10 more)

### Community 11 - "Web TypeScript Config"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 12 - "Supabase Legacy Schema"
Cohesion: 0.18
Nodes (26): on_auth_user_created, on_payment_confirmed, public.access_logs, public.client_access_codes, public.gyms, public.handle_new_user(), public.inventory_items, public.lookup_activation_code() (+18 more)

### Community 13 - "Client Home & Settings Screens"
Cohesion: 0.14
Nodes (18): ACCESS_ALLOWED_STATUSES, ClientHomeScreen(), STATUS_LABEL, styles, ClientSettingsScreen(), STATUS_LABEL, styles, ClientRoutineScreen() (+10 more)

### Community 14 - "Access Log Seed Data"
Cohesion: 0.11
Nodes (17): MembershipStatusPopupProps, accessLogs, activeMembers, buildAccessLogs(), seededRandom(), WEEKDAY_PATTERN, WEEKEND_PATTERN, gyms (+9 more)

### Community 15 - "Mobile Mock DB & Auth Context"
Cohesion: 0.10
Nodes (23): AuthContextValue, accessCodes, Credential, credentials, gym, members, profiles, routineExercises (+15 more)

### Community 16 - "Inventory Cart & Checkout UI"
Cohesion: 0.16
Nodes (15): InventoryCartItemProps, ProductScanResult(), ProductScanResultProps, CheckoutModalProps, SaleTicketProps, InventoryCartContext, InventoryCartContextValue, CartFeedback (+7 more)

### Community 17 - "API Error Handling"
Cohesion: 0.16
Nodes (13): app_error_handler(), AppError, ConflictError, NotFoundError, register_exception_handlers(), UnauthorizedError, activate_account(), lookup_activation_code() (+5 more)

### Community 18 - "Access History & Payments Pages"
Cohesion: 0.15
Nodes (15): AccessHistoryPage(), Period, toISODate(), ORIGIN_LABELS, ORIGIN_STYLES, STATUS_LABELS, Tab, toISODate() (+7 more)

### Community 19 - "Mobile App Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, @expo/ngrok, @types/react, typescript, @types/react, typescript, main, name (+10 more)

### Community 20 - "Web Mock Seed State"
Cohesion: 0.19
Nodes (18): buildSeedState(), clearDemoState(), loadDemoState(), saveDemoState(), DbAccessLog, DbGym, DbInventoryItem, DbMembershipPlan (+10 more)

### Community 21 - "API Authorization Service"
Cohesion: 0.18
Nodes (11): Any, AuthzService, get_authz(), get_current_user(), AsyncSession, Member, UUID, Equivalente Python de my_role()/my_gym_id()/... de las RLS de Postgres.     Un (+3 more)

### Community 22 - "Sale Modal & Mobile Invoice"
Cohesion: 0.18
Nodes (15): InventorySaleModal(), InventorySaleModalProps, MobileInvoice, readAll(), sendInvoiceToMobile(), useMobileInvoices(), BASE_LABELS, DEFAULT_CONFIG (+7 more)

### Community 23 - "Income Page & Cart Components"
Cohesion: 0.27
Nodes (12): IncomePage(), InventoryCartItem(), InventoryCartPanel(), InventoryScanResult(), Props, CheckoutModal(), SaleTicket(), useInventoryCart() (+4 more)

### Community 24 - "Mobile Auth Screens"
Cohesion: 0.19
Nodes (11): LoginScreen(), styles, ActivateAccountScreen(), styles, queryClient, RootNavigator(), AuthContext, AuthProvider() (+3 more)

### Community 25 - "API Password Hashing & Users"
Cohesion: 0.16
Nodes (11): hash_password(), create_user(), get_me(), AsyncSession, BaseModel, UserCreate, UserRead, create_staff_user() (+3 more)

### Community 26 - "Mobile TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, paths, strict, extends, include, **/*.ts, **/*.tsx, @/* (+6 more)

### Community 27 - "Member Profile & Staff Page"
Cohesion: 0.21
Nodes (13): MemberProfilePage(), CreatableRole, emptyStaff(), pickForRole(), roleBadgeClass, roleLabels, StaffFormData, StaffPage() (+5 more)

### Community 28 - "Members List & Payment Modal"
Cohesion: 0.26
Nodes (12): MembersContent(), calcExpiration(), MemberForm(), MemberOptionalSelector(), MemberOptionalSelectorProps, calcNewExpiration(), PaymentModal(), useStore() (+4 more)

### Community 29 - "Mobile Route Layouts"
Cohesion: 0.15
Nodes (7): ClientLayout(), iconFor(), IoniconName, styles, Props, Spacing, expo-router

### Community 30 - "Dashboard Alerts & Activity Feed"
Cohesion: 0.20
Nodes (11): DashboardPage(), ActionableAlert(), ActionableAlertProps, AlertPriority, META, BusinessActivityEvent, BusinessActivityFeed(), BusinessActivityType (+3 more)

### Community 31 - "API Membership Plans Module"
Cohesion: 0.22
Nodes (10): create_membership_plan(), list_membership_plans(), AsyncSession, MembershipPlanCreate, MembershipPlanRead, BaseModel, create_plan(), AsyncSession (+2 more)

### Community 32 - "Reports Page & Status Badge"
Cohesion: 0.22
Nodes (9): Tab, ReportsPage(), BadgeVariant, labels, StatusBadge(), styles, daysUntil(), downloadCsv() (+1 more)

### Community 33 - "Web Store Type Definitions"
Cohesion: 0.23
Nodes (9): DemoState, AppStore, Currency, Gym, Routine, RoutineExercise, Staff, Trainer (+1 more)

### Community 34 - "API Gyms Module"
Cohesion: 0.23
Nodes (9): create_gym(), list_gyms(), AsyncSession, GymCreate, GymRead, BaseModel, create_gym(), AsyncSession (+1 more)

### Community 35 - "Member & Membership Types"
Cohesion: 0.20
Nodes (8): MemberFormProps, PaymentModalProps, memberships, DbMember, Member, MobileAppStatus, DurationUnit, Membership

### Community 36 - "Peak Hours Report"
Cohesion: 0.27
Nodes (10): ACCESS_TYPE_OPTIONS, Cell, formatHourLabel(), HOURS, PeakHoursReport(), PeriodKey, PERIODS, SUCCESS_RESULTS (+2 more)

### Community 37 - "API Members Router"
Cohesion: 0.36
Nodes (8): create_member(), get_member(), list_members(), AsyncSession, UUID, MemberCreate, MemberRead, BaseModel

### Community 38 - "Mobile Native Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, expo, react-native, react-native-gesture-handler, react-native-screens, expo, react-native, react-native-gesture-handler (+1 more)

### Community 39 - "Mobile Reset-Project Script"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 40 - "Web Inventory & Scan Types"
Cohesion: 0.43
Nodes (3): inventory, InventoryItem, ScanSource

### Community 41 - "Monorepo Root Config"
Cohesion: 0.25
Nodes (7): name, private, scripts, mobile, web, workspaces, apps/*

### Community 42 - "API Users Model & Repository"
Cohesion: 0.52
Nodes (6): User, create(), get_by_email(), get_by_id(), AsyncSession, UUID

### Community 43 - "Mobile Animated Splash Icon"
Cohesion: 0.38
Nodes (6): AnimatedIcon(), AnimatedSplashOverlay(), glowKeyframe, keyframe, logoKeyframe, styles

### Community 45 - "API Members Service"
Cohesion: 0.60
Nodes (5): create_member(), list_for_gym(), AsyncSession, Member, UUID

### Community 46 - "Trainer Clients Screen"
Cohesion: 0.40
Nodes (4): styles, TrainerClientsScreen(), useMyClients(), Member

### Community 47 - "Web Staff API Route"
Cohesion: 0.60
Nodes (3): CREATABLE_ROLES, generateTempPassword(), POST()

### Community 48 - "Infra Generate-Secrets Script"
Cohesion: 0.40
Nodes (4): crypto, fs, path, values

### Community 49 - "Web Payments Data & Type"
Cohesion: 0.50
Nodes (3): payments, DbPayment, Payment

### Community 51 - "Web Agent Instructions Docs"
Cohesion: 0.67
Nodes (3): Next.js breaking-changes notice (apps/web AGENTS.md), Next.js breaking-changes notice (apps/web CLAUDE.md, nextjs-agent-rules block), Dashboard Web (GYM)

## Knowledge Gaps
- **302 isolated node(s):** `gym-api`, `name`, `slug`, `version`, `orientation` (+297 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `API Users Model & Repository` to `API Core Models & Auth Guards`, `API Members Router`, `API Test Fixtures & Factories`, `API Error Handling`, `API Authorization Service`, `API Password Hashing & Users`, `API Membership Plans Module`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `make_user()` connect `API Test Fixtures & Factories` to `API Password Hashing & Users`, `API Users Model & Repository`, `API Core Models & Auth Guards`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Mobile Native Dependencies` to `Mobile App Dependencies`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 81`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `gym-api`, `name`, `slug` to the rest of the system?**
  _302 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web Root Layout & Misc Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05056179775280899 - nodes in this community are weakly interconnected._
- **Should `Web App Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Trainer Client & Profile Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._