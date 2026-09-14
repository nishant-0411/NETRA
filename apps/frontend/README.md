criminal-network-frontend/
├── public/
│   ├── favicon.ico
│   └── icons/                 # Node category icons (person, vehicle, phone, weapon, case)
├── src/
│   ├── assets/
│   │   └── emblems/           # Police/CCTNS emblem & agency logos
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Dropdown.jsx
│   │   │   └── Modal.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx      # Top status bar, active FIR selector, officer credentials
│   │   │   ├── Sidebar.jsx     # Navigation matching the dark navy CCTNS rail
│   │   │   └── AppShell.jsx    # Shell wrapper with fluid grid
│   │   ├── dashboard/
│   │   │   ├── CaseOverviewCard.jsx # Plot, sections, date, MO
│   │   │   ├── MetricCounters.jsx   # Suspect count, seized arms, vehicles, phones
│   │   │   ├── PriorityLeads.jsx    # High-threat flags & timeline feeds
│   │   │   └── QuickLaunchGrid.jsx  # Direct action tool cards
│   │   └── graph/
│   │       ├── NetworkCanvas.jsx    # vis-network / Cytoscape graph renderer
│   │       ├── GraphToolbar.jsx     # Physics freeze, zoom-to-fit, center
│   │       ├── GraphFilters.jsx     # Toggle noise, weapons, financial transfers
│   │       ├── EntityDrawer.jsx     # Slide-out drawer with person/vehicle specs
│   │       └── NodeLegend.jsx       # Category key & edge color code
│   ├── data/
│   │   └── ground_truth.json        # Raw mock database
│   ├── hooks/
│   │   ├── useActiveCase.js         # Active case state & switching hook
│   │   └── useGraphTransformer.js   # Parses case JSON into nodes and links
│   ├── utils/
│   │   ├── colors.js                # Design tokens & entity color palettes
│   │   └── graphParser.js           # Multi-entity transformer engine
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                    # Tailwind CSS directives
├── package.json
├── tailwind.config.js
└── vite.config.js