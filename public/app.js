  const { createApp } = Vue;
  const { createVuetify } = Vuetify;

  const vuetify = createVuetify({
    theme: {
      defaultTheme: "light",
      themes: {
        light: {
          colors: {
            primary: "#7257b3",
            secondary: "#764ba2",
          },
        },
      },
    },
  });

  function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    const app = document.getElementById("app");

    loadingScreen.classList.add("fade-out");
    app.style.opacity = "1";

    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 300);
  }

  createApp({
    components: {
      "my-input": {
        props: ["item"],
        template: `
            <div>
              <v-text-field
                v-if="item.type === 'text' || item.type === 'email' || item.type === 'tel' || item.type === 'date' || item.type === 'number'"
                v-model="item.value"
                :label="item.label"
                :type="item.type"
                :rules="item.rules"
                variant="outlined"
                density="comfortable"
                :prepend-inner-icon="getIcon(item.type)">
              </v-text-field>

              <v-select
                v-else-if="item.type === 'select'"
                v-model="item.value"
                :items="item.options"
                :label="item.label"
                :rules="item.rules"
                variant="outlined"
                density="comfortable"
                :prepend-inner-icon="getIcon('select')">
              </v-select>

            </div>
          `,
        methods: {
          getIcon(type) {
            const icons = {
              text: "mdi-account",
              email: "mdi-email",
              tel: "mdi-phone",
              date: "mdi-calendar",
              number: "mdi-numeric",
              select: "mdi-form-select",
            };
            return icons[type] || "mdi-text";
          },
        },
      },
    },

    data() {
      return {
        isMobile: window.innerWidth < 600,
        activeGroups: [],
        forceChangePasswordDialog: false,
        forcePasswordData: {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
        forcePasswordStrength: {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        },
        savingForcePassword: false,
        toggleStatusDialog: false,
        toggleStatusTarget: null,
        togglingStatus: false,
        actionConfirmDialog: false,
        actionConfirmCallback: null,
        actionConfirm: {
          title: "Confirm Action",
          subtitle: "Please review before continuing",
          message: "This action will save changes.",
          confirmText: "Confirm",
          icon: "mdi-alert-circle-outline",
          confirmIcon: "mdi-check",
          color: "linear-gradient(135deg,#7257b3 0%,#764ba2 100%)",
          buttonColor: "#7257b3",
        },
        isLoggedIn: false,
        checkingSession: true,
        usersRefreshInterval: null,
        sessionToken: null,
        enrolledViewMode: "cards",
        cardPage: 1,
        cardItemsPerPage: 12,
        // ── ENROLLED LIST FILTERS & FEATURES ──
        enrolledFilterDrawer: false,
        enrolledFilterCivilStatus: null,
        enrolledFilterAgeRange: [10, 30],
        enrolledFilterMunicipality: null,
        enrolledFilterBarangays: [],
        enrolledFilterOverdueOnly: false,
        recentlyViewedRecords: [],
        // ── RECORD MODAL EXTRAS ──
        recordLastSaved: null,
        ageFilterRegion: null,
        dashboardRegion: null,
        showPartIIEditConfirm: false,
        partIIOriginal: {},
        amvatRecords: [],
        loadingAmvatRecords: false,
        amvatRecordsPolling: null,
        amvatTblPage: 1,
        amvatTblPageSize: 10,
        amvatRecordSearch: "",
        amvatRecordRegionFilter: "All Regions",
        amvatRecordQuarterFilter: null,
        amvatRecordYearFilter: null,
        amvatAvailableQuarters: [],
        amvatCompareMode: "all",
        amvatCompareBaseQuarter: "Baseline",
        amvatCompareTargetQuarter: "Q1-Y1",
        amvatCompareBeneficiaryKey: null,
        amvatCompareExpanded: false,
        amvatComparePage: 1,
        amvatComparePageSize: 10,
        sessionFilterSession: "",
        sessionFilterAttStatus: null,
        sessionTestPolling: null,
        sessionTestTblPage: 1,
        sessionTestTblPageSize: 10,
        sessionFilterProvince: null,
        sessionFilterMunicipality: null,
        sessionFilterBarangay: null,
        syncingAttendance: false,
        syncAttendanceDialog: false,
        loginTimestamp: null,
        logoutDialog: false,
        currentUser: null,
        currentTime: Date.now(),
        authMode: "login",
        showPassword: false,
        authData: {
          email: "",
          password: "",
          name: "",
          role: "case_manager",
          region: "",
        },
        passwordStrength: {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        },
        newUserPasswordStrength: {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        },
        changePasswordStrength: {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        },
        roleOptions: [
          { title: "Administrator", value: "admin" },
          { title: "Case Manager", value: "case_manager" },
        ],
        passwordRules: [
          (v) => !!v || "Password is required",
          (v) => v.length >= 8 || "Minimum 8 characters",
          (v) => /[A-Z]/.test(v) || "Must contain uppercase",
          (v) => /[a-z]/.test(v) || "Must contain lowercase",
          (v) => /[0-9]/.test(v) || "Must contain number",
          (v) =>
            /[!@#$%^&*(),.?":{}|<>]/.test(v) ||
            "Must contain special character",
        ],
        selectedSessionView: "all",
        sessionAttendanceRegion: null,
        barangayList: [],
        selectedBarangay: "",
        barangayFilterLoading: false,
        barangayStats: null,
        sessionViewOptions: [
          { title: "All Sessions", value: "all" },
          { title: "Session 1 (M1)", value: "M1" },
          { title: "Session 2 (M2)", value: "M2" },
          { title: "Session 3 (M3)", value: "M3" },
          { title: "Session 4 (M4)", value: "M4" },
          { title: "Session 5 (M5)", value: "M5" },
          { title: "Session 6 (M6)", value: "M6" },
          { title: "Session 7 (M7)", value: "M7" },
          { title: "Session 8 (M8)", value: "M8" },
          { title: "Session 9 (M9)", value: "M9" },
          { title: "Session 10 (M10)", value: "M10" },
          { title: "Session 11 (M11)", value: "M11" },
          { title: "Session 12 (M12)", value: "M12" },
          { title: "Session 13 (M13)", value: "M13" },
          { title: "Session 14 (M14)", value: "M14" },
          { title: "Session 15 (M15)", value: "M15" },
          { title: "Session 16 (M16)", value: "M16" },
          { title: "Session 17 (M17)", value: "M17" },
          { title: "Session 18 (M18)", value: "M18" },
          { title: "Session 19 (M19)", value: "M19" },
          { title: "Session 20 (M20)", value: "M20" },
          { title: "Session 21 (M21)", value: "M21" },
          { title: "Session 22 (M22)", value: "M22" },
          { title: "Session 23 (M23)", value: "M23" },
          { title: "Session 24 (M24)", value: "M24" },
        ],
        sessionStats: null,
        drawer: true,
        currentView: "dashboard",
        lastActivityTime: Date.now(),
        sessionTimeoutInterval: null,
        sessionWarningShown: false,
        formAutoSaveKey: "amis_form_autosave",
        autoSaveInterval: null,
        menuItems: [
          { section: 'Main', roles: ['admin', 'case_manager'] },
          {
            title: 'Dashboard',
            icon: 'mdi-view-dashboard',
            view: 'dashboard',
            roles: ['admin', 'case_manager'],
          },
          {
            title: 'Beneficiaries',
            icon: 'mdi-account-group',
            roles: ['admin', 'case_manager'],
            children: [
              { title: 'Register', icon: 'mdi-account-plus-outline', view: 'register', roles: ['admin', 'case_manager'] },
              { title: 'Enrolled List', icon: 'mdi-format-list-bulleted-square', view: 'enrolled-list', roles: ['admin', 'case_manager'] },
              { title: 'Delisted', icon: 'mdi-account-remove-outline', view: 'delisted', roles: ['admin', 'case_manager'] },
            ],
          },
          {
            title: 'AMVAT',
            icon: 'mdi-clipboard-check-outline',
            roles: ['admin', 'case_manager'],
            children: [
              { title: 'Assessment Tool', icon: 'mdi-clipboard-text-outline', view: 'amvat', roles: ['admin', 'case_manager'] },
              { title: 'Assessment Records', icon: 'mdi-history', view: 'amvat-record', roles: ['admin', 'case_manager'] },
            ],
          },
          {
            title: 'Payouts',
            icon: 'mdi-currency-php',
            roles: ['admin', 'case_manager'],
            children: [
              { title: 'For Payout', icon: 'mdi-cash-check', view: 'payouts', roles: ['admin', 'case_manager'], comingSoon: true },
              { title: 'Authorized Grantees', icon: 'mdi-account-star-outline', view: 'grantees', roles: ['admin', 'case_manager'] },
              { title: 'Payout Records', icon: 'mdi-chart-line', view: 'income-records', roles: ['admin', 'case_manager'], comingSoon: true },
            ],
          },
          { section: 'Compliance Section', roles: ['admin', 'case_manager'] },
          {
            title: 'Program Sessions',
            icon: 'mdi-calendar-star',
            roles: ['admin', 'case_manager'],
            children: [
              { title: 'Pre/Post-Test', icon: 'mdi-clipboard-check-multiple-outline', view: 'session-tests', roles: ['admin', 'case_manager'] },
              { title: 'Attendance', icon: 'mdi-calendar-check-outline', view: 'sessions', roles: ['admin', 'case_manager'] },
            ],
          },
          { title: 'PT Results', icon: 'mdi-test-tube', view: 'pt-results', roles: ['admin', 'case_manager'] },
          { title: 'Education', icon: 'mdi-school-outline', view: 'education-monitoring', roles: ['admin', 'case_manager'] },
          { title: 'Healthcare', icon: 'mdi-hospital-box-outline', view: 'healthcare', roles: ['admin', 'case_manager'] },
          // { title: 'Booklet Compliance', icon: 'mdi-book-check-outline', view: 'booklet-compliance', roles: ['admin', 'case_manager'] },
          { section: 'System', roles: ['admin', 'case_manager'] },
          {
            title: 'Reports',
            icon: 'mdi-chart-box-outline',
            roles: ['admin', 'case_manager'],
            children: [
              { title: 'Analytics', icon: 'mdi-chart-areaspline', view: 'reports', roles: ['admin', 'case_manager'] },
              { title: 'Compliance Report', icon: 'mdi-file-document-check-outline', view: 'compliance-report', roles: ['admin', 'case_manager'] },
              { title: 'Export Data', icon: 'mdi-download-outline', view: 'export', roles: ['admin', 'case_manager'], comingSoon: true },
            ],
          },
          {
            title: 'User Management',
            icon: 'mdi-shield-account-outline',
            view: 'manage-users',
            roles: ['admin'],
          },
          {
            title: 'Settings',
            icon: 'mdi-cog-outline',
            view: 'settings',
            roles: ['admin', 'case_manager'],
          },
        ],
        // ── PRE/POST TEST PER SESSION ───
        sessionTestRecords: [],
        loadingSessionTests: false,
        sessionTestExpandedRow: null,
        sessionTestBulkMode: false,
        sessionTestBulkSelected: [],
        sessionTestSearch: "",
        sessionTestFilterSession: null,
        sessionTestFilterStatus: "All",
        sessionTestStatusOptions: ["All", "Complete", "Not Started"],
        sessionTestDialog: false,
        sessionTestTarget: null,
        sessionTestSession: null,
        sessionTestFilterRegion: null,
        sessionTestType: "pre",
        sessionTestScoreInput: null,
        sessionTestDateInput: "",
        sessionTestRemarksInput: "",
        savingSessionTest: false,
        bulkScoreDialog: false,
        bulkScoreSession: null,
        bulkScoreType: "pre",
        bulkScoreValue: null,
        bulkScoreDate: "",
        bulkScoreRemarks: "",
        savingBulkScore: false,
        payoutRecords: [],
        loadingPayouts: false,
        payoutSearch: "",
        payoutFilterQuarter: null,
        payoutFilterYear: null,
        payoutFilterStatus: "All",
        payoutSummary: { released: 0, pending: 0, onhold: 0 },
        payoutTableHeaders: [
          { title: "Beneficiary", key: "name" },
          { title: "ID", key: "id_number" },
          { title: "Amount", key: "amount" },
          { title: "Period", key: "period", sortable: false },
          { title: "Status", key: "status" },
          { title: "Release Date", key: "release_date" },
          { title: "Grantee", key: "grantee_name" },
          { title: "Actions", key: "actions", sortable: false },
        ],
        payoutDialog: false,
        editingPayout: null,
        payoutFormData: {
          id_number: "",
          grantee_name: "",
          amount: "",
          quarter: 1,
          year: 1,
          status: "Pending",
          release_date: "",
          notes: "",
        },
        savingPayout: false,
        granteeRecords: [],
        granteeRegionFilter: null,
        granteeRelFilter: null,
        granteeBarangayFilter: "",
        granteeViewDialog: false,
        granteeViewRecord: null,
        loadingGrantees: false,
        granteeSearch: "",
        granteePage: 1,
        granteePageSize: 15,
        granteeStatusFilter: null,
        granteeDialog: false,
        editingGrantee: null,
        granteeFormData: {
          id_number: "",
          name: "",
          grantee_name: "",
          relationship: "",
          contact: "",
          grantee_address: "",
          grantee2_name: "",
          relationship2: "",
          contact2: "",
          grantee2_address: "",
          valid_id_type: "",
          notes: "",
        },
        savingGrantee: false,
        granteeForBeneficiary: [],
        validIdOptions: [
          "Philippine Passport",
          "Driver's License",
          "SSS ID",
          "PhilHealth ID",
          "Voter's ID",
          "Postal ID",
          "Barangay ID",
          "School ID",
          "Others",
        ],
        ageStatisticsView: "today",
        ageViewOptions: [
          { title: "Current Age", value: "today" },
          { title: "Age at Registration", value: "registration" },
        ],
        dashboardStats: {
          totalEnrolled: 0,
          ageGroups: {},
          locations: {},
          genderDistribution: { Male: 0, Female: 0 },
        },
        enrolledList: [],
        enrolledListTotal: 0,
        autoRefreshInterval: null,
        cacheExpiresAt: null,
        realtimePolling: null,
        dashboardPolling: null,
        lastRecordCount: 0,
        lastDataTimestamp: null,
        pollingInterval: 30000,
        dashboardRefreshInterval: 60000,
        lastDashboardStatsLoadedAt: 0,
        loadingDashboardStats: false,
        barangayListLoaded: false,
        isPolling: false,
        enrolledSearch: "",
        loadingEnrolledList: false,
        usersList: [],
        usersSearch: "",
        loadingUsers: false,
        addUserDialog: false,
        newUserData: {
          email: "",
          password: "",
          name: "",
          role: "case_manager",
          region: "",
        },
        usersHeaders: [
          { title: "Name", key: "name" },
          { title: "Email", key: "email" },
          { title: "Role", key: "role" },
          { title: "Region", key: "region" },
          { title: "Last Login", key: "lastLogin" },
          { title: "Status", key: "status", sortable: false },
          { title: "Actions", key: "actions", sortable: false },
        ],
        passwordDialog: false,
        passwordDialogUser: null,
        passwordData: {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
        reportType: null,
        reportTypes: [
          { title: "Age Distribution", value: "age_distribution" },
          { title: "Location Summary", value: "location_summary" },
          { title: "Compliance Report", value: "compliance_report" },
          { title: "Healthcare Summary", value: "healthcare_summary" },
          { title: "Financial Overview", value: "financial_overview" },
          { title: "Children Health Report", value: "children_health" },
        ],
        reportFilters: {
          region: null,
          startDate: null,
          endDate: null,
        },
        reportData: [],
        reportHeaders: [],
        loadingReport: false,
        availableRegions: [],
        loadingRegions: false,
        activityLogs: [],
        loadingLogs: false,
        showEnrollForm: false,
        enrollTitle: "Registration Form",
        enrollSubtitle: "Complete the form below",
        loading: false,
        fromSource: false,
        searchValue: "",
        selectedName: null,
        nameOptions: [],
        searchLoading: false,
        searchTimeout: null,
        enrollForm: {
          first_name: {
            type: "text",
            label: "First Name",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          middle_name: { type: "text", label: "Middle Name", value: "" },
          last_name: {
            type: "text",
            label: "Last Name",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          date_birth: {
            type: "date",
            label: "Date of Birth",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          sex: {
            type: "select",
            label: "Sex",
            value: "",
            options: ["Male", "Female"],
            rules: [(v) => !!v || "Required"],
          },
          civil_status: {
            type: "select",
            label: "Civil Status",
            value: "",
            options: [
              "Single",
              "Married",
              "Live-in/Common-Law",
              "Divorced",
              "Separated",
              "Widowed",
            ],
            rules: [(v) => !!v || "Required"],
          },
          contact_number: {
            type: "tel",
            label: "Contact Number",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          region: {
            type: "text",
            label: "Region",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          province: {
            type: "text",
            label: "Province",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          municipality_city: {
            type: "text",
            label: "Municipality/City",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          barangay: {
            type: "text",
            label: "Barangay",
            value: "",
            rules: [(v) => !!v || "Required"],
          },
          has_child: {
            type: "select",
            label: "Has Child",
            value: "",
            options: ["Yes", "No"],
            rules: [(v) => !!v || "Required"],
          },
          children_number: {
            type: "number",
            label: "Number of Children",
            value: "",
          },
          living_partner: {
            type: "select",
            label: "Living with Partner",
            value: "",
            options: ["Yes", "No"],
            rules: [(v) => !!v || "Required"],
          },
          _alreadyEnrolled: false,
          _existingEnrollmentId: null,
        },
        civilStatusOptions: [
          "Single",
          "Married",
          "Live-in/Common-Law",
          "Divorced",
          "Separated",
          "Widowed",
        ],
        snackbar: {
          show: false,
          message: "",
          color: "success",
        },
        viewRecordDialog: false,
        selectedRecord: null,
        recordTab: "basic",
        additionalInfo: {
          education: "",
          educationLevelDetail: "",
          budgetExpenses: "",
          incomeData: [],
          vulnerabilityFactors: [],
          hasDisability: "No",
          disabilityType: "",
          disabilitySpecify: "",
          hasIllness: "No",
          illnessType: "",
          illnessSpecify: "",
          childrenData: [],
          authorizedGrantee: "",
          granteeRelationship: "",
          granteeContactNumber: "",
          granteeAddress: "",
          authorizedGrantee2: "",
          granteeRelationship2: "",
          granteeContactNumber2: "",
          granteeAddress2: "",
        },
        addIncomeDialog: false,
        newIncome: {
          personName: "",
          relationship: "",
          incomeSource: "",
          incomeSourceSpecify: "",
          incomeAmount: "",
        },
        relationshipToBeneficiaryOptions: [
          "Beneficiary",
          "Guardian",
          "Parent",
          "Sibling",
          "Grandparent",
          "Spouse/Partner",
          "Other",
        ],
        educationOptions: [
          "Without Formal Education",
          "Elementary",
          "Elementary Graduate",
          "High School",
          "High School Graduate",
          "Senior High School",
          "Senior High School Graduate",
          "Vocational Course",
          "Vocational Course Graduate",
          "College",
          "College Graduate",
          "Post College Degree",
        ],
        relationshipOptions: [
          "Parent",
          "Guardian",
          "Social Worker",
          "Sibling",
          "Spouse",
        ],
        incomeSourceOptions: [
          "Employed",
          "Seasonal Employee",
          "Self-Employed",
          "Pension",
          "Remittance",
          "Assistance from Family/Friends",
          "Government Support",
          "Others (Specify)",
        ],
        postnatalPanel: null,
        // Healthcare module
        healthcareRecords: [],
        loadingHealthcareRecords: false,
        complianceAnalytics: null,
        loadingComplianceAnalytics: false,
        complianceRegionFilter: null,
        exitRecords: [],
        loadingExitRecords: false,
        exitRegionFilter: null,
        exitSearch: "",
        exitTypeFilter: null,
        showExitDialog: false,
        savingExit: false,
        exitForm: { idNumber: "", beneficiaryName: "", exitType: null, reason: "" },
        bookletMonths: Array.from({ length: 24 }, (_, i) => ({ title: `Month ${i + 1}`, value: i + 1 })),
        educationRecords: [],
        loadingEducationRecords: false,
        educationMonth: 1,
        educationRegionFilter: null,
        educationSearch: "",
        educationStatusFilter: null,
        educationDialog: false,
        savingEducation: false,
        educationEditRecord: null,
        educationEditData: {},
        bookletComplianceRecords: [],
        loadingBookletComplianceRecords: false,
        bookletComplianceMonth: 1,
        bookletComplianceRegionFilter: null,
        bookletComplianceSearch: "",
        bookletComplianceStatusFilter: null,
        bookletComplianceDialog: false,
        savingBookletCompliance: false,
        bookletComplianceEditRecord: null,
        bookletComplianceEditData: {},
        healthcareSearch: "",
        healthcareRegionFilter: null,
        healthcareProvinceFilter: null,
        healthcareBarangayFilter: null,
        ptBarangayFilter: null,
        healthcareDialog: false,
        healthcareEditRecord: null,
        healthcareEditData: {},
        savingHealthcare: false,
        healthcarePage: 1,
        healthcarePageSize: 10,
        hcCompletionFilter: null,
        hcDialogActiveVisit: 1,
        disabilityOptions: [
          "Visual Impairment",
          "Hearing Impairment",
          "Physical Disability",
          "Intellectual Disability",
          "Learning Disability",
          "Speech Impairment",
          "Others (Specify)",
        ],
        illnessOptions: [
          "Chronic Illness",
          "Mental Health Condition",
          "Infectious Disease",
          "Respiratory Condition",
          "Cardiovascular Disease",
          "Diabetes",
          "Cancer",
          "Others (Specify)",
        ],
        ptRecords: [],
        ptTblPage: 1,
        ptTblPageSize: 10,
        ptPendingCount: 0,
        loadingPT: false,
        ptSearch: "",
        ptRegionFilter: null,
        ptProvinceFilter: null,
        ptResultFilter: null,
        ptQuarterFilter: null,
        ptBulkMode: false,
        ptBulkSelected: [],
        ptBulkYear: "",
        ptBulkQuarterNum: "",
        ptBulkQuarter: null,
        ptBulkResult: "",
        ptBulkDate: "",
        ptBulkNotes: "",
        ptBulkDialog: false,
        ptEditDialog: false,
        ptEditRecord: null,
        ptEditData: {},
        savingPT: false,
        addChildDialog: false,
        newChild: {
          name: "",
          birthdate: "",
          sex: "",
          newbornScreening: "",
          newbornScreeningNotes: "",
          eyeProphylaxis: "",
          eyeProphylaxisNotes: "",
          vitaminKSupplementation: "",
          vitaminKSupplementationNotes: "",
          bcgVaccine: "",
          bcgVaccineNotes: "",
          diphtheriaVaccine: "",
          diphtheriaVaccineNotes: "",
          oralPolioVaccine: "",
          oralPolioVaccineNotes: "",
          hepatitisB: "",
          hepatitisBNotes: "",
          growthMonitoring: "",
          growthMonitoringNotes: "",
          oralHealthServices: "",
          oralHealthServicesNotes: "",
          hasDisability: "No",
          disabilityType: "",
          disabilitySpecify: "",
          hasIllness: "No",
          illnessType: "",
          illnessSpecify: "",
        },
        savingInfo: false,
        savingAllChanges: false,
        saveConfirmDialog: false,
        loadingRecordDialog: false,
        sessionRecords: [],
        loadingSessions: false,
        sessionSearch: "",
        selectedBeneficiaries: [],
        selectedSessions: [],
        sessionSelectorOpen: false,
        bulkUpdateDialog: false,
        individualAttendanceDialog: false,
        currentIndividualRecord: null,
        sessionTableHeaders: [
          { title: "Name", key: "name", sortable: true, align: "start" },
          { title: "Address", key: "address", sortable: false, align: "start" },
          {
            title: "Progress",
            key: "progress",
            sortable: false,
            align: "center",
          },
          {
            title: "Sessions",
            key: "sessions",
            sortable: false,
            align: "center",
            width: "340px",
          },
          {
            title: "Actions",
            key: "actions",
            sortable: false,
            align: "center",
          },
        ],
        showAMVATForm: false,
        amvatPage: null,
        amvatTotalPages: 8,
        isViewOnlyMode: false,
        amvatSaving: false,
        amvatProfileLoading: false,
        amvatLoadingName: "",
        amvatSearchDebounce: null,
        amvatLoading: false,
        amvatSearchValue: "",
        amvatSearching: false,
        showAMVATResults: false,
        amvatProfileResults: [],
        amvatResults: null,
        showAMVATConfirm: false,
        // AMVAT selection
        selectedQuarter: 1,
        selectedYear: 1,
        quarterOptions: [
          { title: "Baseline", value: "baseline" },
          { title: "Q1", value: 1 },
          { title: "Q2", value: 2 },
          { title: "Q3", value: 3 },
          { title: "Q4", value: 4 },
        ],
        yearOptions: [
          { title: "Year 1", value: 1 },
          { title: "Year 2", value: 2 },
        ],
        isYearLocked: true,
        viewingExistingAMVAT: false,
        existingAMVATScores: null,
        previousQuarterScores: null,
        previousQuarterLabel: "",
        amvatFormData: {
          idNumber: "", // ADD THIS
          // Profile
          name: "",
          region: "",
          province: "",
          municipality_city: "",
          barangay: "",
          street_sitio: "",
          contact: "",
          civilStatus: "",
          hasChild: "",
          numChildren: "",
          livingWithPartner: "",
          religion: "",
          dateOfBirth: "",
          education: "",
          occupation: "",

          // Part II
          child_disability: "",
          mother_disability: "",
          living_parents: "",
          violence: "",
          age: "",
          income_source: "",
          education_skills: "",

          // Questions Q1-Q25
          q1: null,
          q2: null,
          q3: null,
          q4: null,
          q5: null,
          q6: null,
          q7: null,
          q8: null,
          q9: null,
          q10: null,
          q11: null,
          q12: null,
          q13: null,
          q14: null,
          q15: null,
          q16: null,
          q17: null,
          q18: null,
          q19: null,
          q20: null,
          q21: null,
          q22: null,
          q23: null,
          q24: null,
          q25: null,
        },
        amvatRatingOptions: [
          {
            value: 1,
            label: "Lubos na Hindi Sumasang-ayon",
            shortLabel: "Strongly Disagree",
          },
          { value: 2, label: "Hindi Sumasang-ayon", shortLabel: "Disagree " },
          { value: 3, label: "Walang Panig", shortLabel: "Neutral" },
          { value: 4, label: "Sumasang-ayon", shortLabel: "Agree" },
          {
            value: 5,
            label: "Lubos na Sumasang-ayon",
            shortLabel: "Strongly Agree",
          },
        ],
        amvatQuestions: [
          // Individual Empowerment (Child’s Rights and Laws) (Q1-Q4)
          {
            id: "q1",
            category: "Individual Empowerment (Child’s Rights and Laws)",
            text: "Q1. Kaya kong ipaliwanag ang aking mga karapatan bilang bata at adolescent mother, kabilang ang pagbabawal ng maagang pagpapakasal or child marriage/union.",
            subtitle:
              "I am able to explain my rights as a minor and adolescent mother, including the law against child marriage or union.",
          },
          {
            id: "q2",
            category: "Individual Empowerment (Child’s Rights and Laws)",
            text: "Q2. Hindi ko nakikita na ang pagrespeto sa mga karapatan ko at ng anak ko ay magbibigay ng kasiguraduhan para sa aming magandang kinabukasan.",
            subtitle:
              "I do not see that respecting my and my child's rights will lead to a secure and better future for us.",
          },
          {
            id: "q3",
            category: "Individual Empowerment (Child’s Rights and Laws)",
            text: "Q3. Alam ko kung saan makakalapit para humingi ng tulong kung malalabag ang aking karapatan o ng aking anak.",
            subtitle:
              "I know where to seek help if my or my child's rights are violated.",
          },
          {
            id: "q4",
            category: "Individual Empowerment (Child’s Rights and Laws)",
            text: "Q4. Nakikibahagi ako sa mga diskusyon at pagpupulong tungkol sa mga isyu ng mga batang ina, mula sa mga simpleng talakayan sa barangay hanggang sa pormal na forum ng lokal na pamahalaan.",
            subtitle:
              "I am involved in discussions and gatherings regarding the challenges faced by adolescent mothers, ranging from informal talks at the barangay level to formal consultations held by the local government.",
          },

          // Domain 2: ASRH Education and Family Planning (Q5-Q8)
          {
            id: "q5",
            category:
              "Domain 2: Adolescent Sexual and Reproductive Health (ASHR) Education and Family Planning",
            text: "Q5. Nakakakuha ako ng impormasyon tungkol sa kalusugan ng mga kabataan at pagpaplano ng pamilya mula sa gobyerno at iba pang ahensya.",
            subtitle:
              "I am getting information about adolescent sexual and reproductive health and/or family planning from the government and other agencies.",
          },
          {
            id: "q6",
            category:
              "Domain 2: Adolescent Sexual and Reproductive Health (ASHR) Education and Family Planning",
            text: "Q6. Madali para sa akin ang makakuha ng mga libreng serbisyo at produkto sa pagpaplano ng pamilya, tulad ng condom, pills, injectables, at counseling para sa mga adolescent mothers.",
            subtitle:
              "It is easy for me to get free family planning services and products, such as condoms, pills, injectables, and counseling for adolescent mothers.",
          },
          {
            id: "q7",
            category:
              "Domain 2: Adolescent Sexual and Reproductive Health (ASHR) Education and Family Planning",
            text: "Q7. Kasalukuyan akong gumagamit ng isa o higit pa na family planning method.",
            subtitle:
              "I am currently using at least one family planning method.",
          },
          {
            id: "q8",
            category:
              "Domain 2: Adolescent Sexual and Reproductive Health (ASHR) Education and Family Planning",
            text: "Q8. Sapat na ang isang taong pagitan mula sa panganganak upang maging handa ako para sa susunod na pagbubuntis.",
            subtitle:
              "A one-year interval after giving birth is sufficient for me to be ready for the next pregnancy.",
          },

          // Domain 3: Health (Immunization, Health Checkups, Nutrition) (Q9-Q12)
          {
            id: "q9",
            category:
              "Domain 3: Health (Immunization, Health Checkups, Nutrition)",
            text: "Q9. Kumpleto ang aking anak sa mga bakuna at check-up para sa kanyang edad ayon sa polisiya ng Department of Health (DOH). Kabilang dito ang mga sumusunod:",
            subtitle:
              "My child is complete with all the recommended vaccinations and check-ups appropriate for their age in accordance with the Department of Health (DOH) policy. These include the following:",
            bullets: [
              "BCG",
              "Hepatitis B",
              "Pentavalent Vaccine (DPT-Hep B-HB)",
              "Oral Polio Vaccine (OPV)",
              "Inactivated Polio Vaccine (IPV)",
              "Pneumococcal Conjugate Vaccine (PCV)",
              "Measles, Mumps, Rubella (MMR)",
            ],
          },
          {
            id: "q10",
            category:
              "Domain 3: Health (Immunization, Health Checkups, Nutrition)",
            text: "Q10. Madali akong nakaka-access sa libreng health check-up at iba pang health services kapag kinakailangan, para sa akin at sa aking anak.",
            subtitle:
              "I can easily access free health check-ups and other health services whenever necessary, both for myself and for my child.",
          },
          {
            id: "q11",
            category:
              "Domain 3: Health (Immunization, Health Checkups, Nutrition)",
            text: "Q11. Hindi sapat ang aking kaalaman tungkol sa nutrisyon na dapat natatanggap ng aking anak nang naaayon sa kanyang edad.",
            subtitle:
              "I lack sufficient knowledge about the appropriate nutrition for my child based on his/her age.",
          },
          {
            id: "q12",
            category:
              "Domain 3: Health (Immunization, Health Checkups, Nutrition)",
            text: "Q12. Kaya kong kilalanin ang maagang palatandaan ng problema sa kalusugan sa aking sarili o anak at humingi ng tulong medikal.",
            subtitle:
              "I am able to recognize early signs of a health problem in myself or my child and seek medical help.",
          },

          // Domain 4: Education and Livelihood (Q13-Q16)
          {
            id: "q13",
            category: "Domain 4: Education and Livelihood",
            text: "Q13. Madali kong maabot ang mga programang sumusuporta sa edukasyon at kabuhayan na bukas para sa mga adolescent mothers.",
            subtitle:
              "I can easily access the programs that support education and livelihood that are open to adolescent mothers.",
          },
          {
            id: "q14",
            category: "Domain 4: Education and Livelihood",
            text: "Q14. May sarili akong pinagkakakitaan o may matatag akong suportang pinansyal para sa pangangailangan ng aking anak.",
            subtitle:
              "I have my own source of income or I have stable financial support for the needs of my child.",
          },
          {
            id: "q15",
            category: "Domain 4: Education and Livelihood",
            text: "Q15. Kasalukuyan akong naka-enroll at nakakadalo sa aking pag-aaral nang regular.",
            subtitle:
              "I am currently enrolled and attending my classes regularly.",
          },
          {
            id: "q16",
            category: "Domain 4: Education and Livelihood",
            text: "Q16. Limitado ang aking mga kasanayan (skills) na makakatulong sa akin na makahanap ng mas magandang trabaho sa hinaharap.",
            subtitle:
              "I have limited skills that would help me find a better job in the future.",
          },

          // Domain 5: Family and Community Support (Q17-Q20)
          {
            id: "q17",
            category: "Domain 5: Family and Community Support",
            text: "Q17. Wala akong natatanggap na tulong mula sa aking pamilya sa pag-aalaga ng aking anak, tulad ng pinansyal na suporta, pagbabantay, gawaing bahay, at emosyonal na gabay.",
            subtitle:
              "I do not receive any help from my family in taking care of my child, such as financial support, childcare, household chores, or emotional guidance.",
          },
          {
            id: "q18",
            category: "Domain 5: Family and Community Support",
            text: "Q18. Sinuportahan ng ama ng aking anak ang pagpapalaki at pagtustos sa pangangailangan ng bata.",
            subtitle:
              "The father of my child supports the child-rearing and provides financial sustenance for the child.",
          },
          {
            id: "q19",
            category: "Domain 5: Family and Community Support",
            text: "Q19. Nahihiya akong humingi ng tulong o magtanong tungkol sa aking kalusugan sa mga lokal na health worker.",
            subtitle:
              "I feel embarrassed to seek help or ask questions about my health from local health workers.",
          },
          {
            id: "q20",
            category: "Domain 5: Family and Community Support",
            text: "Q20. Hindi ko nararanasan ang panghuhusga o negatibong pagtingin mula sa aking komunidad bilang isang adolescent mother.",
            subtitle:
              "I do not experience judgment or negative views from my community as an adolescent mother.",
          },

          // Domain 6: Mental Health (Q21-Q25)
          {
            id: "q21",
            category: "Domain 6: Mental Health",
            text: "Q21. Madalas kong nararamdaman ang takot o pag-aalala na baka hindi ko magampanan nang maayos ang aking tungkulin bilang ina.",
            subtitle:
              "I often feel fear or excessive worry that I might not fulfill my role as a mother properly.",
          },
          {
            id: "q22",
            category: "Domain 6: Mental Health",
            text: "Q22. Madalas kong nararamdaman na nahihiya ako o nag-iisa at walang makaintindi sa aking pinagdadaanan.",
            subtitle:
              "I often feel ashamed or alone and that no one understands what I am going through.",
          },
          {
            id: "q23",
            category: "Domain 6: Mental Health",
            text: "Q23. Mayroon akong sapat na oras para magpahinga at alagaan ang sarili ko.",
            subtitle: "I have enough time to rest and take care of myself.",
          },
          {
            id: "q24",
            category: "Domain 6: Mental Health",
            text: "Q24. May mga pagkakataon na naiisip kong sana ay naiiba ang naging takbo ng aking buhay at wala akong pag-asa sa hinaharap.",
            subtitle:
              "There are times when I think that the course of my life could have been different and I feel hopeless about the future.",
          },
          {
            id: "q25",
            category: "Domain 6: Mental Health",
            text: "Q25. Sa pangkalahatan, nararamdaman kong masaya at kalmado ako sa takbo ng buhay ko ngayon.",
            subtitle:
              "Overall, I feel happy and calm with the direction of my life now.",
          },
        ],
      };
    },

    computed: {
      paginatedPTRecords() {
        const start = (this.ptTblPage - 1) * this.ptTblPageSize;
        return this.filteredPTRecords.slice(start, start + this.ptTblPageSize);
      },

      barangayOptions() {
        const opts = [{ title: "All Barangay", value: "" }];
        this.barangayList.forEach((b) => opts.push({ title: b, value: b }));
        return opts;
      },

      filteredAgeGroups() {
        const mode = this.ageDisplayMode;
        if (!this.isAdmin && this.selectedBarangay) {
          const region = this.currentUser?.region || "";
          const byRegion =
            mode === "current"
              ? this.dashboardStats.ageGroupsByRegion?.[region]
              : this.dashboardStats.ageGroupsByRegionAtRegistration?.[region];
          return byRegion || {};
        }
        return mode === "current"
          ? this.dashboardStats.ageGroups
          : this.dashboardStats.ageGroupsAtRegistration;
      },

      dashboardRegionOptions() {
        return [
          { title: "All Regions", value: null },
          ...Object.keys(this.dashboardStats.regionTotals || {})
            .sort()
            .map((r) => ({ title: "Region " + r, value: r })),
        ];
      },

      locationCoverageRegions() {
        const order = ["NCR", "III", "VI", "X"];
        const meta = {
          NCR: {
            name: "NCR",
            place: "National Capital Region",
            bg: "#f5f3ff",
            accent: "#8b5cf6",
            accentDark: "#7c3aed",
            text: "#5b21b6",
          },
          III: {
            name: "Region III",
            place: "Bulacan",
            bg: "#f0fdf4",
            accent: "#22c55e",
            accentDark: "#16a34a",
            text: "#15803d",
          },
          VI: {
            name: "Region VI",
            place: "Iloilo",
            bg: "#eff6ff",
            accent: "#3b82f6",
            accentDark: "#2563eb",
            text: "#1d4ed8",
          },
          X: {
            name: "Region X",
            place: "Misamis Oriental",
            bg: "#fff7ed",
            accent: "#f97316",
            accentDark: "#ea580c",
            text: "#c2410c",
          },
        };

        return Object.keys(this.dashboardStats.regionTotals || {})
          .filter((region) => this.shouldShowRegion(region))
          .sort((a, b) => {
            const aIndex = order.indexOf(a);
            const bIndex = order.indexOf(b);
            if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          })
          .map((region) => ({
            code: region,
            ...(meta[region] || {
              name: "Region " + region,
              place: "Regional coverage",
              bg: "#f8fafc",
              accent: "#64748b",
              accentDark: "#475569",
              text: "#334155",
            }),
          }));
      },

      sessionAttendanceRegionOptions() {
        return [
          { title: "All Regions", value: null },
          ...Object.keys(this.dashboardStats.regionTotals || {})
            .sort()
            .map((r) => ({ title: "Region " + r, value: r })),
        ];
      },

      ageRegionOptions() {
        return [
          { title: "All Regions", value: null },
          ...Object.keys(this.dashboardStats.regionTotals || {})
            .sort()
            .map((r) => ({ title: r, value: r })),
        ];
      },

      ageDistDenominator() {
        if (!this.isAdmin && this.selectedBarangay && this.barangayStats) {
          return this.barangayStats.barangayTotal || 1;
        }
        if (this.isAdmin && this.ageFilterRegion) {
          return this.dashboardStats.regionTotals?.[this.ageFilterRegion] || 1;
        }
        return this.dashboardStats.totalEnrolled || 1;
      },

      sortedAgeGroups() {
        if (!this.isAdmin && this.selectedBarangay && this.barangayStats) {
          const source =
            this.ageStatisticsView === "today"
              ? this.barangayStats.ageGroups
              : this.barangayStats.ageGroupsAtRegistration;
          return this.sortAgeGroupObj(source || {});
        }

        let sourceData =
          this.ageStatisticsView === "today"
            ? this.dashboardStats.ageGroups
            : this.dashboardStats.ageGroupsAtRegistration;

        if (
          this.isAdmin &&
          this.ageFilterRegion &&
          this.dashboardStats.ageGroupsByRegion
        ) {
          sourceData =
            this.ageStatisticsView === "today"
              ? this.dashboardStats.ageGroupsByRegion[this.ageFilterRegion]
              : this.dashboardStats.ageGroupsByRegionAtRegistration?.[
                  this.ageFilterRegion
                ];
        }

        return this.sortAgeGroupObj(sourceData || {});
      },

      sessionAttStatusCounts() {
        const counts = { Present: 0, Absent: 0, Exempted: 0 };
        const records = this.filteredSessionRecords;
        records.forEach((r) => {
          Object.values(r.attendance).forEach((v) => {
            if (v === "Present") counts.Present++;
            else if (v === "Absent") counts.Absent++;
            else if (v === "Exempted") counts.Exempted++;
          });
        });
        return counts;
      },

      // Quarter filter options built from available quarters
      amvatQuarterFilterOptions() {
        const labelMap = {
          Baseline: "Baseline",
          "Q1-Y1": "Q1 - Year 1",
          "Q2-Y1": "Q2 - Year 1",
          "Q3-Y1": "Q3 - Year 1",
          "Q4-Y1": "Q4 - Year 1",
          "Q1-Y2": "Q1 - Year 2",
          "Q2-Y2": "Q2 - Year 2",
          "Q3-Y2": "Q3 - Year 2",
          "Q4-Y2": "Q4 - Year 2",
        };
        const all = [{ title: "All Quarters", value: null }];
        (this.amvatAvailableQuarters || []).forEach((q) => {
          all.push({ title: labelMap[q] || q, value: q });
        });
        return all;
      },

      amvatCompareQuarterOptions() {
        const options = this.amvatQuarterFilterOptions.filter(
          (item) => item.value,
        );
        const values = options.map((item) => item.value);
        [
          { title: "Baseline", value: "Baseline" },
          { title: "Q1 - Year 1", value: "Q1-Y1" },
        ].forEach((item) => {
          if (!values.includes(item.value)) options.push(item);
        });
        return options;
      },

      sessionProvinceOptions() {
        return [
          ...new Set(
            this.sessionRecords.map((r) => r.province).filter(Boolean),
          ),
        ].sort();
      },

      sessionMunicipalityOptions() {
        let records = this.sessionRecords;
        if (this.currentUser.role === "admin" && this.sessionFilterProvince) {
          records = records.filter(
            (r) => r.province === this.sessionFilterProvince,
          );
        }
        return [
          ...new Set(records.map((r) => r.municipality).filter(Boolean)),
        ].sort();
      },

      sessionBarangayOptions() {
        let records = this.sessionRecords;
        // Admin: narrow by province then municipality
        if (this.currentUser.role === "admin" && this.sessionFilterProvince) {
          records = records.filter(
            (r) => r.province === this.sessionFilterProvince,
          );
        }
        if (this.sessionFilterMunicipality) {
          records = records.filter(
            (r) => r.municipality === this.sessionFilterMunicipality,
          );
        }
        return [
          ...new Set(records.map((r) => r.barangay).filter(Boolean)),
        ].sort();
      },

      sessionTestRegionOptions() {
        const regions = [
          ...new Set(
            this.sessionTestRecords.map((r) => r.region).filter(Boolean),
          ),
        ];
        return [
          { title: "All Regions", value: null },
          ...regions.sort().map((r) => ({ title: r, value: r })),
        ];
      },

      // The label shown in "Date Assessed" column
      amvatActiveQuarterLabel() {
        if (this.amvatRecordQuarterFilter) {
          const map = {
            Baseline: "Baseline",
            "Q1-Y1": "Q1-Y1",
            "Q2-Y1": "Q2-Y1",
            "Q3-Y1": "Q3-Y1",
            "Q4-Y1": "Q4-Y1",
            "Q1-Y2": "Q1-Y2",
            "Q2-Y2": "Q2-Y2",
            "Q3-Y2": "Q3-Y2",
            "Q4-Y2": "Q4-Y2",
          };
          return (
            map[this.amvatRecordQuarterFilter] || this.amvatRecordQuarterFilter
          );
        }
        // Most recent available
        const order = [
          "Q4-Y2",
          "Q3-Y2",
          "Q2-Y2",
          "Q1-Y2",
          "Q4-Y1",
          "Q3-Y1",
          "Q2-Y1",
          "Q1-Y1",
          "Baseline",
        ];
        return (
          order.find((k) => (this.amvatAvailableQuarters || []).includes(k)) ||
          "—"
        );
      },

      // Full filtered + searched list
      filteredAmvatTableRecords() {
        let list = this.amvatRecords || [];

        // Region filter (admin only)
        if (
          this.isAdmin &&
          this.amvatRecordRegionFilter &&
          this.amvatRecordRegionFilter !== "All Regions"
        ) {
          list = list.filter(
            (r) =>
              (r.region || "").toUpperCase() ===
              this.amvatRecordRegionFilter.toUpperCase(),
          );
        }

        // Year filter
        if (this.amvatRecordYearFilter) {
          const y = this.amvatRecordYearFilter;
          list = list.filter((r) => {
            const keys = Object.keys(r.scores || {});
            if (y === 1)
              return keys.some((k) => k === "Baseline" || k.endsWith("-Y1"));
            if (y === 2) return keys.some((k) => k.endsWith("-Y2"));
            return true;
          });
        }

        // Quarter filter — only show records that have a score for that quarter
        if (this.amvatRecordQuarterFilter) {
          list = list.filter(
            (r) =>
              r.scores && r.scores[this.amvatRecordQuarterFilter] !== undefined,
          );
        }

        // Search
        if (
          this.amvatRecordSearch &&
          this.amvatRecordSearch.trim().length > 0
        ) {
          const q = this.amvatRecordSearch.toLowerCase().trim();
          list = list.filter(
            (r) =>
              (r.name || "").toLowerCase().includes(q) ||
              (r.idNumber || "").toLowerCase().includes(q) ||
              (r.region || "").toLowerCase().includes(q),
          );
        }

        return list;
      },

      amvatCompareBeneficiaryOptions() {
        return this.filteredAmvatTableRecords
          .map((record) => ({
            title: `${record.name || "Unnamed"}${record.idNumber ? " - " + record.idNumber : ""}`,
            value: this.amvatRecordKey(record),
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
      },

      exitBeneficiaryOptions() {
        return (this.enrolledList || [])
          .map((record) => ({
            title: `${record.full_name || "Unnamed"}${record.id_number ? " - " + record.id_number : ""}`,
            value: record.id_number,
            name: record.full_name,
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
      },

      filteredExitRecords() {
        let list = this.exitRecords || [];
        if (this.exitTypeFilter) {
          list = list.filter((r) => r.exitType === this.exitTypeFilter);
        }
        if (this.exitSearch && this.exitSearch.trim().length > 0) {
          const q = this.exitSearch.toLowerCase().trim();
          list = list.filter(
            (r) =>
              (r.name || "").toLowerCase().includes(q) ||
              (r.idNumber || "").toLowerCase().includes(q),
          );
        }
        return list;
      },

      filteredEducationRecords() {
        let list = this.educationRecords || [];
        if (this.educationStatusFilter) {
          list = list.filter((r) => r.status === this.educationStatusFilter);
        }
        if (this.educationSearch && this.educationSearch.trim().length > 0) {
          const q = this.educationSearch.toLowerCase().trim();
          list = list.filter(
            (r) =>
              (r.name || "").toLowerCase().includes(q) ||
              (r.idNumber || "").toLowerCase().includes(q) ||
              (r.barangay || "").toLowerCase().includes(q),
          );
        }
        return list;
      },

      educationStatusCounts() {
        const counts = { Compliant: 0, Partial: 0, "Non-Compliant": 0, "Not Yet Tracked": 0 };
        (this.educationRecords || []).forEach((r) => {
          counts[r.status] = (counts[r.status] || 0) + 1;
        });
        return counts;
      },

      filteredBookletComplianceRecords() {
        let list = this.bookletComplianceRecords || [];
        if (this.bookletComplianceStatusFilter) {
          list = list.filter((r) => this.getBookletComplianceStatus(r) === this.bookletComplianceStatusFilter);
        }
        if (this.bookletComplianceSearch && this.bookletComplianceSearch.trim().length > 0) {
          const q = this.bookletComplianceSearch.toLowerCase().trim();
          list = list.filter(
            (r) =>
              (r.name || "").toLowerCase().includes(q) ||
              (r.idNumber || "").toLowerCase().includes(q) ||
              (r.barangay || "").toLowerCase().includes(q),
          );
        }
        return list;
      },

      bookletComplianceCounts() {
        const counts = { Complete: 0, Incomplete: 0, "Not Yet Tracked": 0 };
        (this.bookletComplianceRecords || []).forEach((r) => {
          const status = this.getBookletComplianceStatus(r);
          counts[status] = (counts[status] || 0) + 1;
        });
        return counts;
      },


      amvatComparisonSourceRecords() {
        if (this.amvatCompareMode !== "selected") {
          return this.filteredAmvatTableRecords;
        }
        if (!this.amvatCompareBeneficiaryKey) return [];
        return this.filteredAmvatTableRecords.filter(
          (record) =>
            this.amvatRecordKey(record) === this.amvatCompareBeneficiaryKey,
        );
      },

      amvatComparisonRows() {
        const base = this.amvatCompareBaseQuarter;
        const target = this.amvatCompareTargetQuarter;
        if (!base || !target || base === target) return [];

        return this.amvatComparisonSourceRecords
          .map((record) => {
            const baseScore = this.getAmvatQuarterScore(record, base);
            const targetScore = this.getAmvatQuarterScore(record, target);
            if (baseScore === null || targetScore === null) return null;

            return {
              key: this.amvatRecordKey(record),
              name: record.name || "-",
              idNumber: record.idNumber || "",
              address: [record.barangay, record.province].filter(Boolean).join(", "),
              baseScore,
              targetScore,
              delta: targetScore - baseScore,
              baseDomain: record.domainScores?.[base] || null,
              targetDomain: record.domainScores?.[target] || null,
            };
          })
          .filter(Boolean)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      },

      amvatComparisonSummary() {
        const rows = this.amvatComparisonRows;
        const avg = (field) =>
          rows.length
            ? rows.reduce((sum, row) => sum + row[field], 0) / rows.length
            : 0;
        const improved = rows.filter((row) => row.delta > 0).length;
        const declined = rows.filter((row) => row.delta < 0).length;
        const unchanged = rows.filter((row) => row.delta === 0).length;
        const baseAvg = avg("baseScore");
        const targetAvg = avg("targetScore");

        return {
          count: rows.length,
          baseAvg,
          targetAvg,
          deltaAvg: targetAvg - baseAvg,
          improved,
          declined,
          unchanged,
        };
      },

      // Paginated slice — mirrors paginatedAmvatTableRecords below
      paginatedAmvatComparisonRows() {
        const start = (this.amvatComparePage - 1) * this.amvatComparePageSize;
        return this.amvatComparisonRows.slice(
          start,
          start + this.amvatComparePageSize,
        );
      },

      amvatComparisonDomains() {
        const domains = [
          { key: "empowerment", label: "Empowerment", color: "#7c3aed" },
          { key: "pregnancy", label: "ASRH", color: "#db2777" },
          { key: "health", label: "Health", color: "#0891b2" },
          { key: "education", label: "Education", color: "#059669" },
          { key: "support", label: "Support", color: "#d97706" },
          { key: "mentalhealth", label: "Mental Health", color: "#e11d48" },
        ];
        const rows = this.amvatComparisonRows;

        return domains.map((domain) => {
          const baseVals = [];
          const targetVals = [];
          rows.forEach((row) => {
            const baseVal = row.baseDomain?.[domain.key];
            const targetVal = row.targetDomain?.[domain.key];
            if (
              baseVal !== null &&
              baseVal !== undefined &&
              targetVal !== null &&
              targetVal !== undefined &&
              !isNaN(baseVal) &&
              !isNaN(targetVal)
            ) {
              baseVals.push(Number(baseVal));
              targetVals.push(Number(targetVal));
            }
          });
          const baseAvg = baseVals.length
            ? baseVals.reduce((sum, val) => sum + val, 0) / baseVals.length
            : 0;
          const targetAvg = targetVals.length
            ? targetVals.reduce((sum, val) => sum + val, 0) / targetVals.length
            : 0;
          return {
            ...domain,
            baseAvg,
            targetAvg,
            delta: targetAvg - baseAvg,
          };
        });
      },

      // Paginated slice
      paginatedAmvatTableRecords() {
        const start = (this.amvatTblPage - 1) * this.amvatTblPageSize;
        return this.filteredAmvatTableRecords.slice(
          start,
          start + this.amvatTblPageSize,
        );
      },

      // Domain averages for the pills row
      amvatDomainAverages() {
        const domains = [
          {
            key: "empowerment",
            label: "Empowerment",
            max: 16,
            color: "#7c3aed",
          },
          { key: "pregnancy", label: "ASRH", max: 16, color: "#db2777" },
          { key: "health", label: "Health", max: 16, color: "#0891b2" },
          { key: "education", label: "Education", max: 16, color: "#059669" },
          { key: "support", label: "Support", max: 16, color: "#d97706" },
          {
            key: "mentalhealth",
            label: "Mental Health",
            max: 20,
            color: "#e11d48",
          },
        ];
        const list = this.filteredAmvatTableRecords;

        return domains.map((d) => {
          const vals = [];

          list.forEach((r) => {
            const allDomainScores = r.domainScores || {};

            if (this.amvatRecordQuarterFilter && !this.amvatRecordSearch) {
              const ds = allDomainScores[this.amvatRecordQuarterFilter];
              if (
                ds &&
                ds[d.key] !== null &&
                ds[d.key] !== undefined &&
                !isNaN(ds[d.key])
              ) {
                vals.push(ds[d.key]);
              }
            } else {
              Object.values(allDomainScores).forEach((ds) => {
                if (
                  ds &&
                  ds[d.key] !== null &&
                  ds[d.key] !== undefined &&
                  !isNaN(ds[d.key])
                ) {
                  vals.push(ds[d.key]);
                }
              });
            }
          });

          const avg = vals.length
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : 0;
          return { ...d, avg };
        });
      },

      cardPageCount() {
        return Math.ceil(
          this.filteredEnrolledList.length / this.cardItemsPerPage,
        );
      },

      cardPageStart() {
        return (this.cardPage - 1) * this.cardItemsPerPage;
      },

      cardPageEnd() {
        return Math.min(
          this.cardPageStart + this.cardItemsPerPage,
          this.filteredEnrolledList.length,
        );
      },

      paginatedCardItems() {
        return this.filteredEnrolledList.slice(
          this.cardPageStart,
          this.cardPageEnd,
        );
      },

      enrolledHeaders() {
        const baseHeaders = [
          { title: "ID Number", key: "id_number" },
          { title: "Full Name", key: "full_name" },
          { title: "Date of Birth", key: "date_birth" },
          { title: "Age", key: "age", align: "left" },
          { title: "Civil Status", key: "civil_status" },
        ];

        // Only show Municipality for admin users
        if (this.currentUser && this.currentUser.role === "admin") {
          baseHeaders.push({ title: "Municipality", key: "municipality_city" });
        }

        baseHeaders.push(
          { title: "Date Registered", key: "date_registered" },
          { title: "Actions", key: "actions", sortable: false },
        );

        return baseHeaders;
      },

      snackbarIcon() {
        const icons = {
          success: "mdi-check-circle",
          error: "mdi-alert-circle",
          warning: "mdi-alert",
          info: "mdi-information",
        };
        return icons[this.snackbar.color] || "mdi-information";
      },

      filteredEnrolledList() {
        let list = this.enrolledList;

        // Text search
        if (this.enrolledSearch) {
          const search = this.enrolledSearch.toLowerCase();
          list = list.filter((r) =>
            Object.values(r).some((v) => String(v).toLowerCase().includes(search))
          );
        }

        // Civil status filter
        if (this.enrolledFilterCivilStatus) {
          list = list.filter((r) => r.civil_status === this.enrolledFilterCivilStatus);
        }

        // Age range filter
        if (this.enrolledFilterAgeRange && (this.enrolledFilterAgeRange[0] > 10 || this.enrolledFilterAgeRange[1] < 30)) {
          list = list.filter((r) => {
            const age = parseInt(r.age);
            return !isNaN(age) && age >= this.enrolledFilterAgeRange[0] && age <= this.enrolledFilterAgeRange[1];
          });
        }

        // Municipality filter (admin only)
        if (this.enrolledFilterMunicipality) {
          list = list.filter((r) => r.municipality_city === this.enrolledFilterMunicipality);
        }

        // Barangay multi-select filter (case manager only)
        if (this.enrolledFilterBarangays && this.enrolledFilterBarangays.length > 0) {
          list = list.filter((r) => this.enrolledFilterBarangays.includes(r.barangay));
        }

        return list;
      },

      enrolledFilterAgeMin() {
        return this.enrolledFilterAgeRange ? this.enrolledFilterAgeRange[0] : 10;
      },

      enrolledFilterAgeMax() {
        return this.enrolledFilterAgeRange ? this.enrolledFilterAgeRange[1] : 30;
      },

      activeFilterCount() {
        let count = 0;
        if (this.enrolledFilterCivilStatus) count++;
        if (this.enrolledFilterMunicipality) count++;
        if (this.enrolledFilterBarangays && this.enrolledFilterBarangays.length > 0) count++;
        if (this.enrolledFilterOverdueOnly) count++;
        if (this.enrolledFilterAgeRange && (this.enrolledFilterAgeRange[0] > 10 || this.enrolledFilterAgeRange[1] < 30)) count++;
        return count;
      },

      availableMunicipalities() {
        const set = new Set();
        this.enrolledList.forEach((r) => {
          if (r.municipality_city && r.municipality_city.trim()) {
            set.add(r.municipality_city.trim());
          }
        });
        return Array.from(set).sort();
      },

      availableBarangays() {
        const set = new Set();
        this.enrolledList.forEach((r) => {
          if (r.barangay && r.barangay.trim()) {
            set.add(r.barangay.trim());
          }
        });
        return Array.from(set).sort();
      },

      hasHealthcareData() {
        return !!(
          this.healthcareData &&
          (this.healthcareData.visit1Date || this.healthcareData.visit2Date ||
           this.healthcareData.q1Result || this.healthcareData.q2Result)
        );
      },

      hasAdditionalData() {
        return !!(
          this.additionalInfo &&
          (this.additionalInfo.education || this.additionalInfo.budgetExpenses ||
           (this.additionalInfo.incomeData && this.additionalInfo.incomeData.length > 0))
        );
      },

      lastSavedLabel() {
        if (!this.recordLastSaved) return 'not yet saved';
        const diff = Date.now() - this.recordLastSaved;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
        return new Date(this.recordLastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      },

      isAdmin() {
        return this.currentUser && this.currentUser.role === "admin";
      },

      dashboardSessionCompletion() {
        if (
          !this.dashboardStats ||
          !this.dashboardStats.totalEnrolled ||
          this.dashboardStats.totalEnrolled === 0
        ) {
          return 0;
        }
        // This will be calculated from backend data
        return this.dashboardStats.sessionCompletion || 0;
      },

      filteredSessionRecords() {
        let records = this.sessionRecords || [];

        // Text search
        if (this.sessionSearch && this.sessionSearch.trim()) {
          const search = this.sessionSearch.toLowerCase();
          records = records.filter(
            (r) =>
              r.name.toLowerCase().includes(search) ||
              (r.barangay || "").toLowerCase().includes(search) ||
              (r.province || "").toLowerCase().includes(search),
          );
        }

        // ADMIN: filter by province
        if (this.isAdmin && this.sessionFilterProvince) {
          records = records.filter(
            (r) => r.province === this.sessionFilterProvince,
          );
        }

        // BOTH: filter by barangay
        if (this.sessionFilterBarangay) {
          records = records.filter(
            (r) => r.barangay === this.sessionFilterBarangay,
          );
        }

        // Session filter — both roles
        if (this.sessionFilterSession) {
          records = records.filter(
            (r) =>
              r.attendance[this.sessionFilterSession] !== null &&
              r.attendance[this.sessionFilterSession] !== undefined &&
              r.attendance[this.sessionFilterSession] !== "",
          );
        }

        // Status filter — both roles
        if (this.sessionFilterAttStatus) {
          if (this.sessionFilterSession) {
            records = records.filter(
              (r) =>
                r.attendance[this.sessionFilterSession] ===
                this.sessionFilterAttStatus,
            );
          } else {
            records = records.filter((r) =>
              Object.values(r.attendance).some(
                (v) => v === this.sessionFilterAttStatus,
              ),
            );
          }
        }

        return records;
      },

      getCurrentViewTitle() {
        // Check regular items
        let view = this.menuItems.find(
          (item) => item.view === this.currentView,
        );

        // Check children if not found
        if (!view) {
          for (const item of this.menuItems) {
            if (item.children) {
              const child = item.children.find(
                (c) => c.view === this.currentView,
              );
              if (child) {
                return `${item.title} - ${child.title}`;
              }
            }
          }
        }

        return view ? view.title : "AMIS";
      },

      filteredMenuItems() {
        if (!this.currentUser) return [];
        return this.menuItems.filter((item) =>
          item.roles.includes(this.currentUser.role),
        );
      },

      filteredUsersList() {
        if (!this.usersSearch) return this.usersList;

        const search = this.usersSearch.toLowerCase();
        return this.usersList.filter((item) => {
          return Object.values(item).some((val) =>
            String(val).toLowerCase().includes(search),
          );
        });
      },

      // NEW: Real-time status
      isRealtimeActive() {
        return (
          this.isPolling &&
          (this.currentView === "dashboard" ||
            this.currentView === "enrolled-list" ||
            this.currentView === "sessions")
        );
      },

      filteredGranteeRecords() {
        let records = this.granteeRecords;

        // Admin: region filter
        if (this.isAdmin && this.granteeRegionFilter) {
          const targetRegion = this.normalizeRegionCode(this.granteeRegionFilter);
          records = records.filter(r =>
            this.getGranteeRecordRegion(r) === targetRegion
          );
        }

        // Case manager: barangay filter
        if (!this.isAdmin && this.granteeBarangayFilter) {
          records = records.filter(r =>
            (r.barangay || "").toLowerCase().includes(this.granteeBarangayFilter.toLowerCase())
          );
        }

        // Relationship filter
        if (this.granteeRelFilter) {
          records = records.filter(r =>
            [r.relationship, r.relationship2, r.grantee2_relationship].some(
              rel => (rel || "") === this.granteeRelFilter,
            )
          );
        }

        // Status filter (assigned / unassigned)
        if (this.granteeStatusFilter === 'assigned') {
          records = records.filter(r => !!r.grantee_name);
        } else if (this.granteeStatusFilter === 'unassigned') {
          records = records.filter(r => !r.grantee_name);
        }

        // Text search
        if (this.granteeSearch) {
          const search = this.granteeSearch.toLowerCase();
          records = records.filter(r =>
            String(r.name || "").toLowerCase().includes(search) ||
            String(r.grantee_name || "").toLowerCase().includes(search) ||
            String(r.grantee2_name || "").toLowerCase().includes(search) ||
            String(r.id_number || "").toLowerCase().includes(search) ||
            String(r.municipality || "").toLowerCase().includes(search) ||
            String(r.barangay || "").toLowerCase().includes(search)
          );
        }

        return records;
      },

      paginatedGranteeRecords() {
        const start = (this.granteePage - 1) * this.granteePageSize;
        return this.filteredGranteeRecords.slice(start, start + this.granteePageSize);
      },

      granteePageCount() {
        return Math.max(1, Math.ceil(this.filteredGranteeRecords.length / this.granteePageSize));
      },

      granteeRegionOptions() {
        return [
          { title: "All Regions", value: null },
          ...Object.keys(this.dashboardStats.regionTotals || {})
            .sort()
            .map(r => ({ title: "Region " + r, value: r }))
        ];
      },

      granteesWithoutGrantee() {
        return (this.granteeRecords || []).filter((record) => !record.grantee_name).length;
      },

      filteredPTRecords() {
        let records = this.ptRecords;

        // Admin: filter by province
        if (this.isAdmin && this.ptProvinceFilter) {
          records = records.filter(r =>
            (r.province || "").toUpperCase() === this.ptProvinceFilter.toUpperCase()
          );
        }

        // Regional user: filter by barangay
        if (!this.isAdmin && this.ptBarangayFilter) {
          records = records.filter(r =>
            (r.barangay || "").toLowerCase().includes(this.ptBarangayFilter.toLowerCase())
          );
        }

        if (this.ptResultFilter) {
          const q = this.ptResultFilter;
          records = records.filter(r =>
            ["q1y1","q2y1","q3y1","q4y1","q1y2","q2y2","q3y2","q4y2"]
              .some(k => r[k + "_result"] === q)
          );
        }

        if (this.ptSearch) {
          const s = this.ptSearch.toLowerCase();
          records = records.filter(r =>
            String(r.name).toLowerCase().includes(s) ||
            String(r.id_number).toLowerCase().includes(s)
          );
        }

        return records;
      },

      filteredHealthcareRecords() {
        let records = this.healthcareRecords || [];
        if (this.healthcareSearch) {
          const s = this.healthcareSearch.toLowerCase();
          records = records.filter(r =>
            (r.name || "").toLowerCase().includes(s) ||
            (r.id_number || "").toLowerCase().includes(s)
          );
        }
        // Admin: filter by province
        if (this.isAdmin && this.healthcareProvinceFilter) {
          records = records.filter(r =>
            (r.province || "").toUpperCase() === this.healthcareProvinceFilter.toUpperCase()
          );
        }
        // Regional user: filter by barangay
        if (!this.isAdmin && this.healthcareBarangayFilter) {
          records = records.filter(r =>
            (r.barangay || "").toLowerCase().includes(this.healthcareBarangayFilter.toLowerCase())
          );
        }
        if (this.hcCompletionFilter) {
          records = records.filter(r => {
            const c = this.getHealthcareCompletion(r);
            if (this.hcCompletionFilter === 'complete') return c === 4;
            if (this.hcCompletionFilter === 'partial') return c > 0 && c < 4;
            if (this.hcCompletionFilter === 'none') return c === 0;
            return true;
          });
        }
        return records;
      },

      hcCompleteCount() {
        return (this.healthcareRecords || []).filter(r => this.getHealthcareCompletion(r) === 4).length;
      },

      hcPartialCount() {
        return (this.healthcareRecords || []).filter(r => { const c = this.getHealthcareCompletion(r); return c > 0 && c < 4; }).length;
      },

      hcNoneCount() {
        return (this.healthcareRecords || []).filter(r => this.getHealthcareCompletion(r) === 0).length;
      },

      hcRegionOptions() {
        const regions = [...new Set((this.healthcareRecords || []).map(r => r.region).filter(Boolean))].sort();
        return [{ title: 'All Regions', value: null }, ...regions.map(r => ({ title: r, value: r }))];
      },

      hcProvinceOptions() {
        const provinces = [...new Set((this.healthcareRecords || []).map(r => r.province).filter(Boolean))].sort();
        return [{ title: 'All Provinces', value: null }, ...provinces.map(p => ({ title: p, value: p }))];
      },

      hcBarangayOptions() {
        const barangays = [...new Set((this.healthcareRecords || []).map(r => r.barangay).filter(Boolean))].sort();
        return [{ title: 'All Barangays', value: null }, ...barangays.map(b => ({ title: b, value: b }))];
      },

      ptBarangayOptions() {
        const barangays = [...new Set((this.ptRecords || []).map(r => r.barangay).filter(Boolean))].sort();
        return [{ title: 'All Barangays', value: null }, ...barangays.map(b => ({ title: b, value: b }))];
      },

      ptProvinceOptions() {
        const provinces = [...new Set((this.ptRecords || []).map(r => r.province).filter(Boolean))].sort();
        return [{ title: 'All Provinces', value: null }, ...provinces.map(p => ({ title: p, value: p }))];
      },

      paginatedHealthcareRecords() {
        const start = (this.healthcarePage - 1) * this.healthcarePageSize;
        return this.filteredHealthcareRecords.slice(start, start + this.healthcarePageSize);
      },

      healthcarePageCount() {
        return Math.ceil(this.filteredHealthcareRecords.length / this.healthcarePageSize);
      },

      ptQuarters() {
        return [
          { key: "q1y1", label: "Q1 · Y1" },
          { key: "q2y1", label: "Q2 · Y1" },
          { key: "q3y1", label: "Q3 · Y1" },
          { key: "q4y1", label: "Q4 · Y1" },
          { key: "q1y2", label: "Q1 · Y2" },
          { key: "q2y2", label: "Q2 · Y2" },
          { key: "q3y2", label: "Q3 · Y2" },
          { key: "q4y2", label: "Q4 · Y2" },
        ];
      },

      ptCompletionCount() {
        return this.ptRecords.filter(r =>
          this.ptQuarters.every(q => r[q.key + "_result"])
        ).length;
      },

      ptPositiveCount() {
        return this.ptRecords.filter(r =>
          this.ptQuarters.some(q => r[q.key + "_result"] === "positive")
        ).length;
      },

      filteredSessionTestRecords() {
        let records = this.sessionTestRecords || [];

        if (this.isAdmin && this.sessionTestFilterRegion) {
          records = records.filter(
            (r) =>
              (r.region || "").toUpperCase() ===
              this.sessionTestFilterRegion.toUpperCase(),
          );
        }

        if (this.sessionTestSearch && this.sessionTestSearch.trim()) {
          const q = this.sessionTestSearch.toLowerCase();
          records = records.filter(
            (r) =>
              r.full_name.toLowerCase().includes(q) ||
              r.id_number.toLowerCase().includes(q),
          );
        }

        if (this.sessionTestFilterSession) {
          const m = `M${this.sessionTestFilterSession}`;
          const status = this.sessionTestFilterStatus || "All";
          records = records.filter((r) => {
            const s = r.sessions[m];
            const hasPre = s.pre_score !== null && s.pre_score !== "";
            const hasPost = s.post_score !== null && s.post_score !== "";
            if (status === "Complete") return hasPre && hasPost;
            if (status === "Missing Pre") return !hasPre && hasPost;
            if (status === "Missing Post") return hasPre && !hasPost;
            if (status === "Not Started") return !hasPre && !hasPost;
            return true;
          });
        } else if (
          this.sessionTestFilterStatus &&
          this.sessionTestFilterStatus !== "All"
        ) {
          records = records.filter((r) => {
            for (let m = 1; m <= 24; m++) {
              const s = r.sessions[`M${m}`];
              const hasPre = s.pre_score !== null && s.pre_score !== "";
              const hasPost = s.post_score !== null && s.post_score !== "";
              if (
                this.sessionTestFilterStatus === "Complete" &&
                hasPre &&
                hasPost
              )
                return true;
              if (
                this.sessionTestFilterStatus === "Missing Pre" &&
                !hasPre &&
                hasPost
              )
                return true;
              if (
                this.sessionTestFilterStatus === "Missing Post" &&
                hasPre &&
                !hasPost
              )
                return true;
              if (
                this.sessionTestFilterStatus === "Not Started" &&
                !hasPre &&
                !hasPost
              )
                return true;
            }
            return false;
          });
        }

        return records;
      },

      paginatedSessionTestRecords() {
        const start =
          (this.sessionTestTblPage - 1) * this.sessionTestTblPageSize;
        return this.filteredSessionTestRecords.slice(
          start,
          start + this.sessionTestTblPageSize,
        );
      },

      sessionTestOverallStats() {
        const records = this.sessionTestRecords || [];
        let withAny = 0;
        const allDiffs = [];

        records.forEach((item) => {
          let hasScore = false;
          for (let m = 1; m <= 24; m++) {
            const s = item.sessions[`M${m}`];
            const hasPre = s.pre_score !== null && s.pre_score !== "";
            const hasPost = s.post_score !== null && s.post_score !== "";
            if (hasPre || hasPost) hasScore = true;
            if (hasPre && hasPost) {
              allDiffs.push(parseFloat(s.post_score) - parseFloat(s.pre_score));
            }
          }
          if (hasScore) withAny++;
        });

        const avgImprovement =
          allDiffs.length > 0
            ? (allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length).toFixed(2)
            : null;

        return { withAny, avgImprovement };
      },

      filteredPayoutRecords() {
        let records = this.payoutRecords;
        if (this.payoutSearch) {
          const search = this.payoutSearch.toLowerCase();
          records = records.filter(
            (r) =>
              String(r.name).toLowerCase().includes(search) ||
              String(r.id_number).toLowerCase().includes(search),
          );
        }
        if (this.payoutFilterQuarter)
          records = records.filter(
            (r) => r.quarter === this.payoutFilterQuarter,
          );
        if (this.payoutFilterYear)
          records = records.filter((r) => r.year === this.payoutFilterYear);
        if (this.payoutFilterStatus && this.payoutFilterStatus !== "All") {
          records = records.filter((r) => r.status === this.payoutFilterStatus);
        }
        return records;
      },
    },

    watch: {
      ptSearch() { this.ptTblPage = 1; },
      ptResultFilter() { this.ptTblPage = 1; },
      ptRegionFilter() { this.ptTblPage = 1; },
      ptProvinceFilter() { this.ptTblPage = 1; },

      sessionAttendanceRegion(val) {
        this.ageFilterRegion = val;
      },

      healthcareSearch() { 
        this.healthcarePage = 1;
      },
      
      healthcareRegionFilter() {
        this.healthcarePage = 1;
      },
      healthcareProvinceFilter() {
        this.healthcarePage = 1;
      },
      educationMonth() {
        if (this.currentView === "education-monitoring") this.loadEducationMonitoringRecords();
      },
      educationRegionFilter() {
        if (this.currentView === "education-monitoring") this.loadEducationMonitoringRecords();
      },
      bookletComplianceMonth() {
        if (this.currentView === "booklet-compliance") this.loadBookletComplianceRecords();
      },
      bookletComplianceRegionFilter() {
        if (this.currentView === "booklet-compliance") this.loadBookletComplianceRecords();
      },
      granteeSearch() { this.granteePage = 1; },
      granteeRegionFilter() { this.granteePage = 1; },
      granteeRelFilter() { this.granteePage = 1; },
      granteeBarangayFilter() { this.granteePage = 1; },
      granteeStatusFilter() { this.granteePage = 1; },

      selectedBarangay(val) {
        this.loadBarangayStats(val);
      },

      activeGroups(newVal) {
        if (newVal.length > 1) {
          this.activeGroups = [newVal[newVal.length - 1]];
        }
      },

      sessionFilterProvince(val) {
        this.sessionFilterBarangay = null;
      },

      sessionFilterMunicipality(val) {
        this.sessionFilterBarangay = "";
      },

      enrolledSearch() {
        this.cardPage = 1;
      },

      cardItemsPerPage() {
        this.cardPage = 1;
      },

      enrolledFilterCivilStatus() { this.cardPage = 1; },
      enrolledFilterAgeRange() { this.cardPage = 1; },
      enrolledFilterMunicipality() { this.cardPage = 1; },
      enrolledFilterBarangays() { this.cardPage = 1; },
      enrolledFilterOverdueOnly() { this.cardPage = 1; },

      amvatRecordSearch() {
        this.amvatTblPage = 1;
        this.amvatComparePage = 1;
        this.ensureAmvatCompareBeneficiary();
      },
      amvatRecordQuarterFilter() {
        this.amvatTblPage = 1;
        this.amvatComparePage = 1;
        this.ensureAmvatCompareBeneficiary();
      },
      amvatRecordYearFilter() {
        this.amvatTblPage = 1;
        this.amvatComparePage = 1;
        this.ensureAmvatCompareBeneficiary();
      },
      amvatRecordRegionFilter() {
        this.amvatTblPage = 1;
        this.amvatComparePage = 1;
        this.ensureAmvatCompareBeneficiary();
      },
      amvatCompareMode() {
        this.amvatComparePage = 1;
        this.ensureAmvatCompareBeneficiary();
      },
      complianceRegionFilter() {
        if (this.currentView === "compliance-report") this.loadComplianceAnalytics();
      },
      exitRegionFilter() {
        if (this.currentView === "delisted") this.loadExitRecords();
      },
      amvatCompareBeneficiaryKey() {
        this.amvatComparePage = 1;
      },
      amvatCompareBaseQuarter() {
        this.amvatComparePage = 1;
        this.ensureDifferentAmvatCompareQuarters("base");
      },
      amvatCompareTargetQuarter() {
        this.amvatComparePage = 1;
        this.ensureDifferentAmvatCompareQuarters("target");
      },

      sessionTestSearch() {
        this.sessionTestTblPage = 1;
        this.sessionTestExpandedRow = null;
      },
      sessionTestFilterSession() {
        this.sessionTestTblPage = 1;
        this.sessionTestExpandedRow = null;
      },
      sessionTestFilterStatus() {
        this.sessionTestTblPage = 1;
        this.sessionTestExpandedRow = null;
      },
      sessionTestFilterRegion() {
        this.sessionTestTblPage = 1;
        this.sessionTestExpandedRow = null;
      },

      currentView(newView, oldView) {
        // Close drawer on mobile when switching views
        if (this.isMobile) {
          this.drawer = false;
        }

        this.stopAllPolling();

        if (newView === "dashboard") {
          this.loadDashboardStats(true);
          this.startDashboardPolling();
        } else if (newView === "amvat") {
          if (
            this.amvatPage === null ||
            this.amvatPage === undefined ||
            this.amvatPage === 10
          ) {
            this.showAMVATForm = true;
            this.amvatPage = 0;
            this.amvatResults = null;
            this.viewingExistingAMVAT = false;
            this.existingAMVATScores = null;
            this.isViewOnlyMode = false;
          }
        } else if (newView === "amvat-record") {
          this.loadAMVATRecords();
          this.startAmvatRecordsPolling();
        } else if (newView === "register") {
          this.showEnrollForm = false;
          this.resetEnrollForm();
        } else if (newView === "enrolled-list") {
          this.loadEnrolledList(false);
          this.startEnrolledListPolling();
        } else if (newView === "sessions") {
          this.loadAllSessionAttendance();
          this.selectedBeneficiaries = [];
          this.selectedSessions = [];
          this.startSessionsPolling();
        } else if (newView === "session-tests") {
          if (this.sessionTestRecords.length === 0) {
            this.loadSessionTestRecords();
          }
          this.startSessionTestPolling();
        } else if (newView === "payouts") {
          // For Payout is intentionally parked behind the development card.
          // Do not load Sheets-backed payout/enrolled data for this view yet.
        } else if (newView === "grantees") {
          this.loadGranteeRecords();
          if (this.enrolledList.length === 0) this.loadEnrolledList(false);
        } else if (newView === "pt-results") {
          this.loadPTResults();
          this.loadEnrolledList(false);
        } else if (newView === "education-monitoring") {
          this.loadEducationMonitoringRecords();
        } else if (newView === 'healthcare') {
          this.loadHealthcareRecords();
        } else if (newView === "booklet-compliance") {
          this.loadBookletComplianceRecords();
        } else if (newView === "income-records") {
          this.loadPayoutRecords();
        } else if (newView === "reports") {
          this.reportData = [];
          this.reportType = null;
        } else if (newView === "compliance-report") {
          this.loadComplianceAnalytics();
        } else if (newView === "delisted") {
          this.loadExitRecords();
          if (this.enrolledList.length === 0) this.loadEnrolledList(false);
        } else if (newView === "manage-users") {
          this.loadUsersList();
          this.startUsersAutoRefresh();
        }
      },
    },

    mounted() {
      const startTime = Date.now();
      const minDisplayTime = 1000; // 2 seconds

      // Fallback timeout
      setTimeout(() => {
        if (this.checkingSession) {
          hideLoadingScreen();
          this.checkingSession = false;
        }
      }, 10000);

      // Override the hideLoadingScreen to respect minimum time
      const originalHide = window.hideLoadingScreen;
      window.hideLoadingScreen = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDisplayTime - elapsed);

        console.log(
          `Loading displayed for ${elapsed}ms, waiting ${remaining}ms more`,
        );

        setTimeout(() => {
          originalHide();
        }, remaining);
      };

      // Check for active session (will call hideLoadingScreen when done)
      this.checkForActiveSession();
      setTimeout(() => this.loadRegionsList(), 2000);
      setTimeout(() => this.startFormAutoSave(), 1000);
      this.restoreFormDraft();

      window.addEventListener("resize", () => {
        this.isMobile = window.innerWidth < 600;
        if (this.isMobile) {
          this.drawer = false;
        }
      });

      ["mousedown", "keydown", "scroll", "touchstart"].forEach((event) => {
        document.addEventListener(
          event,
          () => {
            this.lastActivityTime = Date.now();
          },
          true,
        );
      });
      this.startSessionTimeoutWatcher();
    },

    beforeUnmount() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
      }

      this.stopAllPolling();
      if (this.sessionTimeoutInterval)
        clearInterval(this.sessionTimeoutInterval);

      if (this.usersRefreshInterval) {
        clearInterval(this.usersRefreshInterval);
      }

      if (this.sessionTestPolling) clearInterval(this.sessionTestPolling);
    },

    methods: {
      requestActionConfirm(options, callback) {
        this.actionConfirm = {
          title: options.title || "Confirm Action",
          subtitle: options.subtitle || "Please review before continuing",
          message: options.message || "This action will save changes.",
          confirmText: options.confirmText || "Confirm",
          icon: options.icon || "mdi-alert-circle-outline",
          confirmIcon: options.confirmIcon || "mdi-check",
          color:
            options.color ||
            "linear-gradient(135deg,#7257b3 0%,#764ba2 100%)",
          buttonColor: options.buttonColor || "#7257b3",
        };
        this.actionConfirmCallback = callback;
        this.$nextTick(() => {
          this.actionConfirmDialog = true;
        });
      },

      cancelActionConfirm() {
        this.actionConfirmDialog = false;
        this.actionConfirmCallback = null;
      },

      runActionConfirm() {
        const callback = this.actionConfirmCallback;
        this.actionConfirmDialog = false;
        this.actionConfirmCallback = null;
        if (typeof callback === "function") {
          callback();
        }
      },

      confirmWriteAction(options, callback) {
        this.requestActionConfirm(
          {
            subtitle: "This change may affect saved records",
            confirmText: "Yes, Continue",
            icon: "mdi-content-save-alert-outline",
            confirmIcon: "mdi-check",
            ...options,
          },
          callback,
        );
      },

      // Form Auto-Save Methods
      startFormAutoSave() {
        this.autoSaveInterval = setInterval(() => {
          if (this.showEnrollForm && !this.loading && !this.fromSource) {
            this.saveFormDraft();
          }
        }, 10000);
      },

      loadPTResults() {
        if (this.loadingPT) return;
        this.loadingPT = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.ptRecords = result.records;
              this.ptPendingCount = result.pendingCount || 0;
            } else {
              this.showSnackbar(result.message, "error");
            }
            this.loadingPT = false;
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error loading PT results: " + error, "error");
            this.loadingPT = false;
          })
          .getPTResults(this.getSessionData());
      },

      openPTEditDialog(record) {
        this.ptEditRecord = record;
        this.ptEditData = { ...record };
        // Ensure all quarter keys exist even if empty
        this.ptQuarters.forEach(q => {
          if (!this.ptEditData[q.key + '_result']) this.ptEditData[q.key + '_result'] = '';
          if (!this.ptEditData[q.key + '_date'])   this.ptEditData[q.key + '_date']   = '';
          if (!this.ptEditData[q.key + '_notes'])  this.ptEditData[q.key + '_notes']  = '';
        });
        this.ptEditDialog = true;
      },

      savePTEdit(confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save PT Results?",
              message: "This will update the pregnancy test result record.",
            },
            () => this.savePTEdit(true),
          );
          return;
        }
        this.savingPT = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingPT = false;
            if (result.success) {
              this.showSnackbar("PT result saved.", "success");
              this.ptEditDialog = false;
              this.loadPTResults();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.savingPT = false;
            this.showSnackbar("Error: " + error, "error");
          })
          .savePTResult(this.ptEditData, this.getSessionData());
      },

      savePTBulk(confirmed = false) {
        // Validate
        if (!this.ptBulkYear || !this.ptBulkQuarterNum || !this.ptBulkResult) {
          this.showSnackbar("Select a year, quarter, and result first.", "error");
          return;
        }
        if (this.ptBulkSelected.length === 0) {
          this.showSnackbar("Select at least one beneficiary.", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Apply PT Result to Selected Records?",
              message: `This will update ${this.ptBulkSelected.length} selected beneficiary record(s).`,
            },
            () => this.savePTBulk(true),
          );
          return;
        }

        this.savingPT = true;

        // Build the sheet key the same way as before e.g. "q1y1", "q4y2"
        const key = `q${this.ptBulkQuarterNum}y${this.ptBulkYear}`;

        const records = this.ptBulkSelected.map(id => {
          const existing = this.ptRecords.find(r => r.id_number === id) || {};
          return {
            ...existing,
            id_number: id,
            [key + "_result"]: this.ptBulkResult,
            [key + "_date"]: this.ptBulkDate,
            [key + "_notes"]: this.ptBulkNotes,
          };
        });

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingPT = false;
            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.ptBulkDialog = false;
              this.ptBulkSelected = [];
              this.ptBulkMode = false;
              // Reset dropdowns
              this.ptBulkYear = "";
              this.ptBulkQuarterNum = "";
              this.ptBulkResult = "";
              this.loadPTResults();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.savingPT = false;
            this.showSnackbar("Error: " + error, "error");
          })
          .savePTResultBulk({ records }, this.getSessionData());
      },

      getPTResultColor(result) {
        if (result === "positive") return "#ef4444";
        if (result === "negative") return "#22c55e";
        return "#e2e8f0";
      },

      getPTResultIcon(result) {
        if (result === "positive") return "mdi-plus-circle";
        if (result === "negative") return "mdi-minus-circle";
        return "mdi-circle-outline";
      },

      getPTProgress(record) {
        return this.ptQuarters.filter(q => record[q.key + "_result"]).length;
      },

      getSessionStats() {
        if (!this.dashboardStats.sessionStats) return null;
        const key =
          this.selectedSessionView === "all" ? "all" : this.selectedSessionView;

        if (!this.isAdmin && this.selectedBarangay && this.barangayStats) {
          return this.barangayStats.sessionStats?.[key] || null;
        }
        if (this.isAdmin && this.sessionAttendanceRegion) {
          const regionStats =
            this.dashboardStats.sessionStatsByRegion?.[
              this.sessionAttendanceRegion
            ];
          return regionStats ? regionStats[key] || null : null;
        }
        return this.dashboardStats.sessionStats[key] || null;
      },

      sortAgeGroupObj(sourceData) {
        const ages = {};
        Object.keys(sourceData).forEach((key) => {
          const value = sourceData[key];
          if (key.includes("-") || !value || value === 0) return;
          const age = parseInt(key);
          if (!isNaN(age)) ages[age] = value;
        });
        const sorted = {};
        Object.keys(ages)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach((age) => {
            sorted[age] = ages[age];
          });
        return sorted;
      },

      getAllSessionsTotals() {
        // Case manager with barangay selected
        if (!this.isAdmin && this.selectedBarangay && this.barangayStats) {
          const stats = this.barangayStats.sessionStats;
          if (!stats) return null;
          let present = 0,
            absent = 0,
            exempted = 0,
            totalMarked = 0;
          for (let m = 1; m <= 24; m++) {
            const s = stats[`M${m}`];
            if (s && s.totalMarked > 0) {
              present += s.present || 0;
              absent += s.absent || 0;
              exempted += s.exempted || 0;
              totalMarked += s.totalMarked || 0;
            }
          }
          if (totalMarked === 0) return null;
          return {
            present,
            absent,
            exempted,
            totalMarked,
            attendancePercentage: parseFloat(
              ((present / totalMarked) * 100).toFixed(1),
            ),
          };
        }
        // Admin with region selected
        if (this.isAdmin && this.sessionAttendanceRegion) {
          const regionStats =
            this.dashboardStats.sessionStatsByRegion?.[
              this.sessionAttendanceRegion
            ];
          if (!regionStats) return null;
          let present = 0,
            absent = 0,
            exempted = 0,
            totalMarked = 0;
          for (let m = 1; m <= 24; m++) {
            const s = regionStats[`M${m}`];
            if (s && s.totalMarked > 0) {
              present += s.present || 0;
              absent += s.absent || 0;
              exempted += s.exempted || 0;
              totalMarked += s.totalMarked || 0;
            }
          }
          if (totalMarked === 0) return null;
          return {
            present,
            absent,
            exempted,
            totalMarked,
            attendancePercentage: parseFloat(
              ((present / totalMarked) * 100).toFixed(1),
            ),
          };
        }
        // Default: all sessions
        const stats = this.dashboardStats.sessionStats;
        if (!stats) return null;
        let present = 0,
          absent = 0,
          exempted = 0,
          totalMarked = 0;
        for (let m = 1; m <= 24; m++) {
          const s = stats[`M${m}`];
          if (s && s.totalMarked > 0) {
            present += s.present || 0;
            absent += s.absent || 0;
            exempted += s.exempted || 0;
            totalMarked += s.totalMarked || 0;
          }
        }
        if (totalMarked === 0) return null;
        return {
          present,
          absent,
          exempted,
          totalMarked,
          attendancePercentage: parseFloat(
            ((present / totalMarked) * 100).toFixed(1),
          ),
        };
      },

      getAllSessionsCount() {
        if (!this.isAdmin && this.selectedBarangay && this.barangayStats) {
          const stats = this.barangayStats.sessionStats;
          if (!stats) return 0;
          let count = 0;
          for (let m = 1; m <= 24; m++) {
            if (stats[`M${m}`]?.totalMarked > 0) count++;
          }
          return count;
        }
        if (this.isAdmin && this.sessionAttendanceRegion) {
          const regionStats =
            this.dashboardStats.sessionStatsByRegion?.[
              this.sessionAttendanceRegion
            ];
          if (!regionStats) return 0;
          let count = 0;
          for (let m = 1; m <= 24; m++) {
            if (regionStats[`M${m}`]?.totalMarked > 0) count++;
          }
          return count;
        }
        const stats = this.dashboardStats.sessionStats;
        if (!stats) return 0;
        let count = 0;
        for (let m = 1; m <= 24; m++) {
          if (stats[`M${m}`]?.totalMarked > 0) count++;
        }
        return count;
      },

      getAllSessionsAttendancePercentage() {
        const t = this.getAllSessionsTotals();
        if (!t || t.totalMarked === 0) return 0;
        if (t.attendancePercentage !== undefined) return t.attendancePercentage;
        return parseFloat(((t.present / t.totalMarked) * 100).toFixed(1));
      },

      loadBarangayList() {
        if (this.isAdmin || this.barangayListLoaded) return;
        google.script.run
          .withSuccessHandler((result) => {
            const parsed = JSON.parse(result);
            if (parsed.success) {
              this.barangayList = parsed.barangays;
              this.barangayListLoaded = true;
            }
          })
          .withFailureHandler((error) => {
            console.error("getBarangayList failed:", error);
          })
          .getBarangayList(this.getSessionData());
      },

      async preloadAllBarangayStats() {
        if (this.isAdmin || !this.barangayList.length) return;

        const BATCH_SIZE = 5;
        const DELAY_MS = 400;
        const barangays = [...this.barangayList];

        for (let i = 0; i < barangays.length; i += BATCH_SIZE) {
          const batch = barangays.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map((barangay) => {
              return new Promise((resolve) => {
                google.script.run
                  .withSuccessHandler((response) => {
                    try {
                      const result = JSON.parse(response);
                      if (result.success) {
                        this.allBarangayStats = {
                          ...this.allBarangayStats,
                          [barangay]: result,
                        };
                      }
                    } catch (e) {}
                    resolve();
                  })
                  .withFailureHandler(() => resolve())
                  .getDashboardStatsByBarangay(barangay, this.getSessionData());
              });
            }),
          );

          if (i + BATCH_SIZE < barangays.length) {
            await new Promise((r) => setTimeout(r, DELAY_MS));
          }
        }
      },

      loadBarangayStats(barangay) {
        if (!barangay) {
          this.barangayStats = null;
          return;
        }
        if (this.allBarangayStats[barangay]) {
          this.barangayStats = { ...this.allBarangayStats[barangay] };
          return;
        }
        // Fallback: fetch if not yet cached
        this.barangayFilterLoading = true;
        google.script.run
          .withSuccessHandler((response) => {
            this.barangayFilterLoading = false;
            try {
              const result = JSON.parse(response);
              if (result.success) {
                this.allBarangayStats = {
                  ...this.allBarangayStats,
                  [barangay]: result,
                };
                this.barangayStats = result;
              } else {
                this.showSnackbar("Failed: " + result.message, "error");
                this.barangayStats = null;
              }
            } catch (e) {
              this.barangayFilterLoading = false;
              this.barangayStats = null;
            }
          })
          .withFailureHandler((err) => {
            this.barangayFilterLoading = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .getDashboardStatsByBarangay(barangay, this.getSessionData());
      },

      checkForcePasswordStrength() {
        this.forcePasswordStrength = this.calculatePasswordStrength(
          this.forcePasswordData.newPassword,
        );
      },

      openToggleStatus(user) {
        if (user.email === this.currentUser.email) return;
        this.toggleStatusTarget = { ...user };
        this.toggleStatusDialog = true;
      },

      confirmToggleStatus() {
        const newStatus =
          this.toggleStatusTarget.status === "active"
            ? "deactivated"
            : "active";
        this.togglingStatus = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.togglingStatus = false;
            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.toggleStatusDialog = false;
              this.loadUsersList();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.togglingStatus = false;
          })
          .toggleUserStatus({
            email: this.toggleStatusTarget.email,
            status: newStatus,
          });
      },

      saveForcePassword(confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Set New Password?",
              message: "This will save your new account password.",
            },
            () => this.saveForcePassword(true),
          );
          return;
        }
        this.savingForcePassword = true;
        google.script.run
          .withSuccessHandler((result) => {
            this.savingForcePassword = false;
            const res =
              typeof result === "string" ? JSON.parse(result) : result;
            if (res.success) {
              this.forceChangePasswordDialog = false;
              this.forcePasswordData = {
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              };
              this.showSnackbar(
                "Password updated successfully! Welcome, " +
                  this.currentUser.name,
                "success",
              );
            } else {
              this.showSnackbar(
                res.message || "Failed to update password",
                "error",
              );
            }
          })
          .withFailureHandler((err) => {
            this.savingForcePassword = false;
            this.showSnackbar("Error: " + err.message, "error");
          })
          .updatePassword(
            this.currentUser.email,
            this.forcePasswordData.newPassword,
            this.forcePasswordData.currentPassword,
            this.getSessionData(),
          );
      },

      syncAttendanceFromTests() {
        this.syncAttendanceDialog = true;
      },

      startSessionTestPolling() {
        if (this.sessionTestPolling) clearInterval(this.sessionTestPolling);
        this.sessionTestPolling = setInterval(() => {
          if (
            this.currentView === "session-tests" &&
            !this.loadingSessionTests &&
            !this.sessionTestDialog &&
            !this.bulkScoreDialog &&
            !document.hidden
          ) {
            this.checkForSessionTestChanges();
          }
        }, 120000);
      },

      checkForSessionTestChanges() {
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success && result.recordCount !== this.lastRecordCount) {
              this.lastRecordCount = result.recordCount;
              this.loadSessionTestRecords();
              this.showRealtimeIndicator("Test scores updated", "success");
            }
          })
          .withFailureHandler((err) => {
            console.error("Session test change check failed:", err);
          })
          .getDataChangeTimestamp(this.getSessionData());
      },

      confirmSyncAttendance() {
        this.syncingAttendance = true;
        google.script.run
          .withSuccessHandler((result) => {
            this.syncingAttendance = false;
            this.syncAttendanceDialog = false;
            const res =
              typeof result === "string" ? JSON.parse(result) : result;
            this.showSnackbar(
              res.message || "Sync complete",
              res.success ? "success" : "error",
            );
            if (res.success && this.currentView === "sessions") {
              this.loadAllSessionAttendance();
            }
          })
          .withFailureHandler((err) => {
            this.syncingAttendance = false;
            this.syncAttendanceDialog = false;
            this.showSnackbar("Sync failed: " + err.message, "error");
          })
          .syncAttendanceFromTestScores(this.getSessionData());
      },

      // ── AMVAT RECORDS TABLE HELPERS ─────
      startAmvatRecordsPolling() {
        if (this.amvatRecordsPolling) clearInterval(this.amvatRecordsPolling);
        this.isPolling = true;
        this.amvatRecordsPolling = setInterval(() => {
          if (
            this.currentView === "amvat-record" &&
            !this.loadingAmvatRecords &&
            !document.hidden
          ) {
            this.loadAMVATRecords();
          }
        }, 300000);
      },

      getSessionDotColor(session) {
        const hasPre = session.pre_score !== null && session.pre_score !== "";
        const hasPost =
          session.post_score !== null && session.post_score !== "";
        if (hasPre && hasPost) return "#dcfce7";
        if (hasPre || hasPost) return "#fef9c3";
        return "#ede9fe";
      },

      getSessionDotBorder(session) {
        const hasPre = session.pre_score !== null && session.pre_score !== "";
        const hasPost =
          session.post_score !== null && session.post_score !== "";
        if (hasPre && hasPost) return "#16a34a";
        if (hasPre || hasPost) return "#ca8a04";
        return "#a78bfa";
      },

      getSessionTileBorder(session) {
        const hasPre = session.pre_score !== null && session.pre_score !== "";
        const hasPost =
          session.post_score !== null && session.post_score !== "";
        if (hasPre && hasPost) return "#86efac";
        if (hasPre || hasPost) return "#fde047";
        return "#e9d5ff";
      },

      getAvgImprovement(item) {
        const diffs = [];
        for (let m = 1; m <= 24; m++) {
          const s = item.sessions[`M${m}`];
          const hasPre = s.pre_score !== null && s.pre_score !== "";
          const hasPost = s.post_score !== null && s.post_score !== "";
          if (hasPre && hasPost) {
            diffs.push(parseFloat(s.post_score) - parseFloat(s.pre_score));
          }
        }
        if (!diffs.length) return null;
        return diffs.reduce((a, b) => a + b, 0) / diffs.length;
      },

      getScoreHexColor(score) {
        if (score === null || score === "") return "#9e9e9e";
        if (score >= 4) return "#059669";
        if (score >= 3) return "#d97706";
        return "#dc2626";
      },

      toggleSessionTestRow(idNumber) {
        this.sessionTestExpandedRow =
          this.sessionTestExpandedRow === idNumber ? null : idNumber;
      },

      toggleBulkMode() {
        this.sessionTestBulkMode = !this.sessionTestBulkMode;
        this.sessionTestExpandedRow = null;
        if (!this.sessionTestBulkMode) {
          this.sessionTestBulkSelected = [];
        }
      },

      toggleBulkSelectItem(idNumber) {
        const idx = this.sessionTestBulkSelected.indexOf(idNumber);
        if (idx === -1) this.sessionTestBulkSelected.push(idNumber);
        else this.sessionTestBulkSelected.splice(idx, 1);
      },

      toggleSelectAllSessionTest(val) {
        if (val) {
          this.sessionTestBulkSelected = this.filteredSessionTestRecords.map(
            (r) => r.id_number,
          );
        } else {
          this.sessionTestBulkSelected = [];
        }
      },

      getSessionTestCompletionPct(item) {
        return Math.round((item.completedSessions / 24) * 100);
      },

      saveBulkScores(confirmed = false) {
        if (this.bulkScoreValue === null || !this.bulkScoreSession) {
          this.showSnackbar("Please select a session and score", "warning");
          return;
        }
        if (this.sessionTestBulkSelected.length === 0) {
          this.showSnackbar("No beneficiaries selected", "warning");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Batch Scores?",
              message: `This will save ${this.bulkScoreType.toUpperCase()} scores for ${this.sessionTestBulkSelected.length} selected beneficiary record(s).`,
            },
            () => this.saveBulkScores(true),
          );
          return;
        }

        this.savingBulkScore = true;

        const payload = {
          idNumbers: this.sessionTestBulkSelected,
          session: this.bulkScoreSession,
          type: this.bulkScoreType,
          score: this.bulkScoreValue,
          date: this.bulkScoreDate,
          remarks: this.bulkScoreRemarks,
        };

        google.script.run
          .withSuccessHandler((result) => {
            this.savingBulkScore = false;
            try {
              const res =
                typeof result === "string" ? JSON.parse(result) : result;
              if (res.success) {
                // Optimistic local update
                const sessionKey = `M${payload.session}`;
                const prefix = payload.type;
                this.sessionTestBulkSelected.forEach((idNumber) => {
                  const rec = this.sessionTestRecords.find(
                    (r) => r.id_number === idNumber,
                  );
                  if (rec && rec.sessions && rec.sessions[sessionKey]) {
                    rec.sessions[sessionKey][`${prefix}_score`] = payload.score;
                    rec.sessions[sessionKey][`${prefix}_date`] = payload.date;
                    rec.sessions[sessionKey][`${prefix}_remarks`] =
                      payload.remarks;
                    // Recalculate completedSessions
                    let done = 0;
                    for (let m = 1; m <= 24; m++) {
                      const s = rec.sessions[`M${m}`];
                      if (
                        s &&
                        s.pre_score !== null &&
                        s.pre_score !== "" &&
                        s.post_score !== null &&
                        s.post_score !== ""
                      ) {
                        done++;
                      }
                    }
                    rec.completedSessions = done;
                  }
                });

                this.showSnackbar(
                  res.message || `Saved ${payload.idNumbers.length} records!`,
                  "success",
                );
                this.bulkScoreDialog = false;
                this.sessionTestBulkMode = false;
                this.sessionTestBulkSelected = [];
              } else {
                this.showSnackbar(res.message || "Bulk save failed", "error");
              }
            } catch (e) {
              this.showSnackbar("Error processing response", "error");
            }
          })
          .withFailureHandler((err) => {
            this.savingBulkScore = false;
            this.showSnackbar("Bulk save error: " + err.message, "error");
          })
          .saveBulkSessionTestScores(payload, this.getSessionData());
      },

      openBulkScoreDialog() {
        this.bulkScoreSession = null;
        this.bulkScoreType = "pre";
        this.bulkScoreValue = null;
        this.bulkScoreDate = "";
        this.bulkScoreRemarks = "";
        this.bulkScoreDialog = true;
      },

      saveSessionTestScore(confirmed = false) {
        if (
          this.sessionTestScoreInput === null ||
          this.sessionTestScoreInput === ""
        ) {
          this.showSnackbar("Please select a score (0-5)", "warning");
          return;
        }
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Session Test Score?",
              message: "This will update the selected pre/post test score.",
            },
            () => this.saveSessionTestScore(true),
          );
          return;
        }
        this.savingSessionTest = true;
        const payload = {
          id_number: this.sessionTestTarget.id_number,
          session: this.sessionTestSession,
          type: this.sessionTestType,
          score: this.sessionTestScoreInput,
          date: this.sessionTestDateInput,
          remarks: this.sessionTestRemarksInput,
        };
        const clientData = this.getSessionData();
        google.script.run
          .withSuccessHandler((result) => {
            this.savingSessionTest = false;
            try {
              const res =
                typeof result === "string" ? JSON.parse(result) : result;
              if (res.success) {
                this.showSnackbar(res.message || "Score saved!", "success");
                this.sessionTestDialog = false;
                // Update local record immediately (no full reload needed)
                const rec = this.sessionTestRecords.find(
                  (r) => r.id_number === payload.id_number,
                );
                if (rec) {
                  const s = rec.sessions[`M${payload.session}`];
                  if (payload.type === "pre") {
                    s.pre_score = payload.score;
                    s.pre_date = payload.date;
                    s.pre_remarks = payload.remarks;
                  } else {
                    s.post_score = payload.score;
                    s.post_date = payload.date;
                    s.post_remarks = payload.remarks;
                  }
                  // Update completedSessions count
                  let count = 0;
                  for (let m = 1; m <= 24; m++) {
                    const ms = rec.sessions[`M${m}`];
                    if (
                      ms.pre_score !== null &&
                      ms.pre_score !== "" &&
                      ms.post_score !== null &&
                      ms.post_score !== ""
                    )
                      count++;
                  }
                  rec.completedSessions = count;
                }
              } else {
                this.showSnackbar(res.message || "Failed to save", "error");
              }
            } catch (e) {
              this.showSnackbar("Error saving score", "error");
            }
          })
          .withFailureHandler((err) => {
            this.savingSessionTest = false;
            this.showSnackbar("Save failed: " + err.message, "error");
          })
          .saveSessionTestScore(payload, clientData);
      },

      openSessionTestDialog(item, sessionNum, type) {
        this.sessionTestTarget = item;
        this.sessionTestSession = sessionNum;
        this.sessionTestType = type;
        const existing = item.sessions[`M${sessionNum}`];
        if (type === "pre") {
          this.sessionTestScoreInput =
            existing.pre_score !== null && existing.pre_score !== ""
              ? existing.pre_score
              : null;
          this.sessionTestDateInput = existing.pre_date || "";
          this.sessionTestRemarksInput = existing.pre_remarks || "";
        } else {
          this.sessionTestScoreInput =
            existing.post_score !== null && existing.post_score !== ""
              ? existing.post_score
              : null;
          this.sessionTestDateInput = existing.post_date || "";
          this.sessionTestRemarksInput = existing.post_remarks || "";
        }
        this.sessionTestDialog = true;
      },

      getClientData() {
        try {
          const stored = localStorage.getItem("amis_session");
          if (!stored) return null;
          return JSON.parse(stored);
        } catch (e) {
          return null;
        }
      },

      loadSessionTestRecords() {
        this.loadingSessionTests = true;
        const clientData = {
          sessionToken: this.sessionToken,
          user: this.currentUser,
          loginTimestamp: this.loginTimestamp,
        };
        google.script.run
          .withSuccessHandler((result) => {
            this.loadingSessionTests = false;
            try {
              const res =
                typeof result === "string" ? JSON.parse(result) : result;
              if (res.success) {
                this.sessionTestRecords = res.records || [];
              } else {
                this.showSnackbar(res.message || "Failed to load", "error");
              }
            } catch (e) {
              this.showSnackbar("Error loading records", "error");
            }
          })
          .withFailureHandler((err) => {
            this.loadingSessionTests = false;
            this.showSnackbar("Error: " + err.message, "error");
          })
          .getSessionTestRecords(clientData);
      },

      stopAmvatRecordsPolling() {
        if (this.amvatRecordsPolling) {
          clearInterval(this.amvatRecordsPolling);
          this.amvatRecordsPolling = null;
        }
      },

      loadAMVATRecords() {
        this.loadingAmvatRecords = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingAmvatRecords = false;
            if (result.success) {
              this.amvatRecords = result.records;
              this.amvatAvailableQuarters = result.availableQuarters || [];
              this.ensureAmvatCompareBeneficiary();
            } else {
              this.showSnackbar(
                result.message || "Failed to load AMVAT records",
                "error",
              );
            }
          })
          .withFailureHandler((error) => {
            if (this.currentView !== "amvat-record") return;
            this.loadingAmvatRecords = false;
            this.showSnackbar("Error: " + error, "error");
          })
          .getAllAMVATRecords(this.getSessionData());
      },

      amvatRecordKey(record) {
        return record?.idNumber || record?.name || "";
      },

      getAmvatQuarterScore(record, quarter) {
        const value = record?.scores?.[quarter];
        if (value === null || value === undefined || value === "") return null;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      },

      amvatCompareQuarterLabel(quarter) {
        const option = this.amvatCompareQuarterOptions.find(
          (item) => item.value === quarter,
        );
        return option?.title || quarter || "-";
      },

      formatAmvatScore(value) {
        if (value === null || value === undefined || isNaN(value)) return "-";
        return Number(value).toFixed(1).replace(/\.0$/, "");
      },

      formatAmvatDelta(value) {
        if (value === null || value === undefined || isNaN(value)) return "-";
        const rounded = Number(value).toFixed(1).replace(/\.0$/, "");
        return value > 0 ? `+${rounded}` : rounded;
      },

      amvatDeltaColor(value) {
        if (value > 0) return "#059669";
        if (value < 0) return "#dc2626";
        return "#64748b";
      },

      ensureAmvatCompareBeneficiary() {
        if (this.amvatCompareMode !== "selected") return;
        const options = this.amvatCompareBeneficiaryOptions || [];
        if (
          !this.amvatCompareBeneficiaryKey ||
          !options.some((item) => item.value === this.amvatCompareBeneficiaryKey)
        ) {
          this.amvatCompareBeneficiaryKey = options[0]?.value || null;
        }
      },

      ensureDifferentAmvatCompareQuarters(changedSide) {
        if (
          !this.amvatCompareBaseQuarter ||
          !this.amvatCompareTargetQuarter ||
          this.amvatCompareBaseQuarter !== this.amvatCompareTargetQuarter
        ) {
          return;
        }

        const options = this.amvatCompareQuarterOptions
          .map((item) => item.value)
          .filter(Boolean);
        const replacement =
          options.find((q) => q !== this.amvatCompareBaseQuarter) || null;

        if (changedSide === "base") {
          this.amvatCompareTargetQuarter = replacement;
        } else {
          this.amvatCompareBaseQuarter = replacement;
        }
      },

      getAmvatScoreSeries(record) {
        const order = [
          "Baseline",
          "Q1-Y1",
          "Q2-Y1",
          "Q3-Y1",
          "Q4-Y1",
          "Q1-Y2",
          "Q2-Y2",
          "Q3-Y2",
          "Q4-Y2",
        ];
        return order
          .filter((k) => record.scores && record.scores[k] !== undefined)
          .map((k) => record.scores[k]);
      },

      getAmvatScoreClass(score) {
        if (score === undefined || score === null) return "empty";
        if (score >= 68) return "high";
        if (score >= 34) return "mod";
        return "low";
      },

      amvatActiveDomain(record) {
        const order = [
          "Q4-Y2",
          "Q3-Y2",
          "Q2-Y2",
          "Q1-Y2",
          "Q4-Y1",
          "Q3-Y1",
          "Q2-Y1",
          "Q1-Y1",
          "Baseline",
        ];
        if (this.amvatRecordQuarterFilter) {
          return record.domainScores?.[this.amvatRecordQuarterFilter] ?? null;
        }
        for (const key of order) {
          if (record.domainScores?.[key]) return record.domainScores[key];
        }
        return null;
      },

      getAmvatScoreHex(score) {
        if (score === undefined || score === null) return "#94a3b8";
        if (score >= 68) return "#059669";
        if (score >= 34) return "#d97706";
        return "#dc2626";
      },

      getAmvatBarColor(score) {
        if (score >= 68) return "#059669";
        if (score >= 34) return "#f59e0b";
        return "#ef4444";
      },

      getAmvatScoreLabel(score) {
        if (score === undefined || score === null) return "—";
        if (score >= 68) return "High Capacity";
        if (score >= 34) return "Moderate";
        return "Low Capacity";
      },

      labelFromKey(key) {
        const map = {
          baseline: "Baseline",
          q1_y1: "Q1-Y1",
          q2_y1: "Q2-Y1",
          q3_y1: "Q3-Y1",
          q4_y1: "Q4-Y1",
          q1_y2: "Q1-Y2",
          q2_y2: "Q2-Y2",
          q3_y2: "Q3-Y2",
          q4_y2: "Q4-Y2",
        };
        return map[key] || key;
      },

      getDomainTiles(domainScores) {
        if (!domainScores) return [];
        return [
          {
            key: "empowerment",
            label: "Empowerment",
            score: domainScores.empowerment || 0,
            max: 16,
            color: "#7c3aed",
          },
          {
            key: "pregnancy",
            label: "ASRH/Pregnancy",
            score: domainScores.pregnancy || 0,
            max: 16,
            color: "#db2777",
          },
          {
            key: "health",
            label: "Health",
            score: domainScores.health || 0,
            max: 16,
            color: "#0891b2",
          },
          {
            key: "education",
            label: "Education",
            score: domainScores.education || 0,
            max: 16,
            color: "#059669",
          },
          {
            key: "support",
            label: "Support",
            score: domainScores.support || 0,
            max: 16,
            color: "#d97706",
          },
          {
            key: "mentalhealth",
            label: "Mental Health",
            score: domainScores.mentalhealth || 0,
            max: 20,
            color: "#e11d48",
          },
        ].filter((d) => d.score !== undefined);
      },

      getDomainLevel(score, max) {
        const pct = score / max;
        if (pct >= 0.75) return "High";
        if (pct >= 0.5) return "Moderate";
        return "Low";
      },

      getAMVATDomainIcon() {
        const icons = {
          3: "mdi-shield-account",
          4: "mdi-baby-carriage",
          5: "mdi-heart-pulse",
          6: "mdi-school",
          7: "mdi-account-group",
          8: "mdi-brain",
        };
        return icons[this.amvatPage] || "mdi-help-circle";
      },

      amvatNamePart(fullName, part) {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
          return part === "first" ? parts[0] : "";
        }
        if (parts.length === 2) {
          if (part === "first") return parts[0];
          if (part === "last") return parts[1];
          return "";
        }
        if (part === "first") return parts[0];
        if (part === "last") return parts[parts.length - 1];
        if (part === "middle") return parts.slice(1, -1).join(" ");
        return "";
      },

      amvatActiveScore(record) {
        const order = [
          "Q4-Y2",
          "Q3-Y2",
          "Q2-Y2",
          "Q1-Y2",
          "Q4-Y1",
          "Q3-Y1",
          "Q2-Y1",
          "Q1-Y1",
          "Baseline",
        ];
        if (this.amvatRecordQuarterFilter) {
          return record.scores?.[this.amvatRecordQuarterFilter] ?? null;
        }
        for (const key of order) {
          if (record.scores?.[key] !== undefined) return record.scores[key];
        }
        return null;
      },

      amvatDomainColor(score, max) {
        if (score === null || score === undefined) return "#94a3b8";
        const pct = score / max;
        if (pct >= 0.75) return "#059669";
        if (pct >= 0.5) return "#d97706";
        return "#dc2626";
      },

      amvatScoreColor(score) {
        if (score === null || score === undefined) return "#94a3b8";
        if (score >= 68) return "#059669";
        if (score >= 34) return "#d97706";
        return "#dc2626";
      },

      amvatRowStatusLabel(record) {
        const score = this.amvatActiveScore(record);
        if (score === null || score === undefined) return "No Data";
        if (score >= 68) return "High Capacity";
        if (score >= 34) return "Moderate";
        return "Low Capacity";
      },

      amvatRowStatusCls(record) {
        const score = this.amvatActiveScore(record);
        if (score === null || score === undefined) return "amvat-chip--grey";
        if (score >= 68) return "amvat-chip--green";
        if (score >= 34) return "amvat-chip--amber";
        return "amvat-chip--red";
      },

      amvatRowStatusIcon(record) {
        const score = this.amvatActiveScore(record);
        if (score === null || score === undefined)
          return "mdi-help-circle-outline";
        if (score >= 68) return "mdi-check-circle";
        if (score >= 34) return "mdi-alert-circle";
        return "mdi-alert-octagon";
      },

      getAMVATQuestionNumber(questionId) {
        return parseInt(questionId.substring(1));
      },

      getCurrentPageCount() {
        if (this.enrolledViewMode === "cards") {
          // For card view - return actual paginated items
          return this.paginatedCardItems ? this.paginatedCardItems.length : 0;
        } else {
          // For table view - return items per page or remaining items
          const itemsPerPage = this.isMobile ? 5 : 10;
          const total = this.filteredEnrolledList.length;
          return Math.min(itemsPerPage, total);
        }
      },

      getInitials(fullName) {
        if (!fullName) return "?";
        const names = fullName.trim().split(" ");
        if (names.length === 1) return names[0].charAt(0).toUpperCase();
        return (
          names[0].charAt(0) + names[names.length - 1].charAt(0)
        ).toUpperCase();
      },

      formatDate(dateString) {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        const options = { year: "numeric", month: "short", day: "numeric" };
        return date.toLocaleDateString("en-US", options);
      },

      getCivilStatusColor(status) {
        const colors = {
          Single: "blue-lighten-4",
          Married: "pink-lighten-4",
          "Live-in/Common-Law": "purple-lighten-4",
          Divorced: "orange-lighten-4",
          Separated: "red-lighten-4",
          Widowed: "grey-lighten-2",
        };
        return colors[status] || "grey-lighten-3";
      },

      getVulnerabilityColor(interpretation) {
        if (interpretation === "Low Vulnerability") return "success";
        if (interpretation === "Moderate Vulnerability") return "warning";
        if (interpretation === "High Vulnerability") return "orange";
        if (interpretation === "Very High Vulnerability") return "error";
        return "grey";
      },

      saveFormDraft() {
        const formData = {};
        let hasData = false;

        Object.keys(this.enrollForm).forEach((key) => {
          if (!key.startsWith("_") && key !== "signature") {
            const value = this.enrollForm[key].value;
            formData[key] = value;
            if (value !== "" && value !== null && value !== undefined) {
              hasData = true;
            }
          }
        });

        // Only save if form has actual data
        if (hasData) {
          try {
            localStorage.setItem(
              this.formAutoSaveKey,
              JSON.stringify({
                data: formData,
                timestamp: Date.now(),
                fromSource: this.fromSource,
                alreadyEnrolled: this.enrollForm._alreadyEnrolled,
                existingEnrollmentId: this.enrollForm._existingEnrollmentId,
              }),
            );
          } catch (e) {
            console.error("Failed to save form draft:", e);
          }
        }
      },

      restoreFormDraft() {
        try {
          const saved = localStorage.getItem(this.formAutoSaveKey);
          if (saved) {
            const {
              data,
              timestamp,
              fromSource,
              alreadyEnrolled,
              existingEnrollmentId,
            } = JSON.parse(saved);

            // Only restore if less than 2 hours old
            if (Date.now() - timestamp < 7200000) {
              if (
                confirm("Found unsaved form data. Do you want to restore it?")
              ) {
                Object.keys(data).forEach((key) => {
                  if (this.enrollForm[key]) {
                    this.enrollForm[key].value = data[key];
                  }
                });

                this.showEnrollForm = true;
                this.fromSource = fromSource || false;
                this.enrollForm._alreadyEnrolled = alreadyEnrolled || false;
                this.enrollForm._existingEnrollmentId =
                  existingEnrollmentId || null;

                if (this.enrollForm._alreadyEnrolled) {
                  this.enrollTitle = "Update Existing Enrollment";
                  this.enrollSubtitle = `Continue editing record: ${existingEnrollmentId}`;
                } else if (this.fromSource) {
                  this.enrollTitle = "Complete Registration";
                  this.enrollSubtitle = "Continue where you left off";
                } else {
                  this.enrollTitle = "Registration Form";
                  this.enrollSubtitle = "Continue filling the form";
                }

                this.showSnackbar("Form data restored successfully", "info");
                return;
              }
            }
            // Clear old draft
            localStorage.removeItem(this.formAutoSaveKey);
          }
        } catch (error) {
          console.error("Error restoring form:", error);
          localStorage.removeItem(this.formAutoSaveKey);
        }
      },

      clearFormDraft() {
        try {
          localStorage.removeItem(this.formAutoSaveKey);
        } catch (e) {
          console.error("Failed to clear form draft:", e);
        }
      },

      // Password Strength Methods
      calculatePasswordStrength(password) {
        let strength = 0;
        let checks = {
          length: password.length >= 8,
          uppercase: /[A-Z]/.test(password),
          lowercase: /[a-z]/.test(password),
          number: /[0-9]/.test(password),
          special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };

        Object.values(checks).forEach((check) => {
          if (check) strength += 20;
        });

        let result = {
          percentage: strength,
          text: "Weak",
          color: "#f44336",
        };

        if (strength >= 100) {
          result.text = "Strong";
          result.color = "#4caf50";
        } else if (strength >= 80) {
          result.text = "Good";
          result.color = "#8bc34a";
        } else if (strength >= 60) {
          result.text = "Fair";
          result.color = "#ffc107";
        } else if (strength >= 40) {
          result.text = "Weak";
          result.color = "#ff9800";
        }

        return result;
      },

      // amvat methods
      searchAMVATProfiles() {
        if (!this.amvatSearchValue || this.amvatSearchValue.length < 2) {
          this.showSnackbar("Please enter at least 2 characters", "warning");
          return;
        }

        // Check if quarter and year are selected
        if (!this.selectedQuarter || !this.selectedYear) {
          this.showSnackbar("Please select Quarter and Year first", "warning");
          return;
        }

        this.amvatSearching = true;
        this.showAMVATResults = false;

        google.script.run
          .withSuccessHandler((response) => {
            this.amvatSearching = false;

            try {
              const result = JSON.parse(response);
              let quarterLabel;
              if (this.selectedQuarter === "baseline") {
                quarterLabel = "Baseline";
              } else if (
                this.selectedQuarter === 1 &&
                this.selectedYear === 1
              ) {
                quarterLabel = "Baseline";
              } else if (
                this.selectedQuarter === 2 &&
                this.selectedYear === 1
              ) {
                quarterLabel = "Q1 - Y1";
              } else {
                quarterLabel = `Q${this.selectedQuarter - 1} - Y${this.selectedYear}`;
              }

              if (result.success) {
                this.amvatProfileResults = result.results;
                this.showAMVATResults = true;

                if (result.results.length === 0) {
                  this.showSnackbar(
                    `No profiles found from ${quarterLabel}`,
                    "info",
                  );
                } else {
                  this.showSnackbar(
                    `Found ${result.results.length} profile(s) from ${quarterLabel} AMVAT`,
                    "success",
                  );
                }
              } else {
                this.showSnackbar(result.message || "Search failed", "error");
              }
            } catch (e) {
              console.error("Parse error:", e);
              this.showSnackbar("Error processing search results", "error");
            }
          })
          .withFailureHandler((error) => {
            this.amvatSearching = false;
            console.error("Search error:", error);
            this.showSnackbar("Search failed: " + error, "error");
          })
          .searchAMVATProfiles(
            this.amvatSearchValue,
            this.selectedQuarter,
            this.selectedYear,
            this.getSessionData(),
            this.currentUser.role,
            this.currentUser.region || "",
          );
      },

      onAMVATSearchInput() {
        // Clear previous debounce
        if (this.amvatSearchDebounce) clearTimeout(this.amvatSearchDebounce);

        const val = this.amvatSearchValue;

        // Reset results if cleared
        if (!val || val.length < 2) {
          this.showAMVATResults = false;
          this.amvatProfileResults = [];
          return;
        }

        // Debounce 500ms then search
        this.amvatSearchDebounce = setTimeout(() => {
          this.searchAMVATProfiles();
        }, 500);
      },

      clearAMVATSearch() {
        this.amvatSearchValue = "";
        this.showAMVATResults = false;
        this.amvatProfileResults = [];
        if (this.amvatSearchDebounce) clearTimeout(this.amvatSearchDebounce);
      },

      resetAMVATForm() {
        this.amvatFormData = {
          idNumber: "",
          name: "",
          region: "",
          province: "",
          municipality_city: "",
          barangay: "",
          street_sitio: "",
          contact: "",
          civilStatus: "",
          hasChild: "",
          numChildren: "",
          livingWithPartner: "",
          religion: "",
          dateOfBirth: "",
          education: "",
          occupation: "",
          child_disability: "",
          mother_disability: "",
          living_parents: "",
          violence: "",
          age: "",
          income_source: "",
          education_skills: "",
          q1: null,
          q2: null,
          q3: null,
          q4: null,
          q5: null,
          q6: null,
          q7: null,
          q8: null,
          q9: null,
          q10: null,
          q11: null,
          q12: null,
          q13: null,
          q14: null,
          q15: null,
          q16: null,
          q17: null,
          q18: null,
          q19: null,
          q20: null,
          q21: null,
          q22: null,
          q23: null,
          q24: null,
          q25: null,
        };
        this.amvatPage = 0;
        this.amvatResults = null;
        this.viewingExistingAMVAT = false;
        this.existingAMVATScores = null;
        this.isViewOnlyMode = false;
        this.previousQuarterScores = null;
        this.previousQuarterLabel = "";
      },

      backToAMVATSearch() {
        if (
          confirm(
            "Are you sure you want to go back? Your progress will be lost.",
          )
        ) {
          this.amvatPage = 1;
          this.resetAMVATForm();
        }
      },

      nextAMVATPage() {
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (this.amvatPage < 9) {
          this.amvatPage++;
        }
      },

      prevAMVATPage() {
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (this.amvatPage > 0) {
          this.amvatPage--;
        }
      },

      updateAMVATProgress() {
        if (this.amvatPage < 2) return 0;
        return ((this.amvatPage - 1) / this.amvatTotalPages) * 100;
      },

      getAMVATPageQuestions() {
        const questionsPerPage = {
          3: [0, 1, 2, 3], // Q1-Q5 (Domain 1: Empowerment)
          4: [4, 5, 6, 7], // Q6-Q9 (Domain 2: Pregnancy)
          5: [8, 9, 10, 11], // Q10-Q13 (Domain 3: Health)
          6: [12, 13, 14, 15], // Q14-Q17 (Domain 4: Education)
          7: [16, 17, 18, 19], // Q18-Q21 (Domain 5: Support)
          8: [20, 21, 22, 23, 24], // Q22-Q25 (Domain 6: Mental Health)
        };

        const indices = questionsPerPage[this.amvatPage] || [];
        return indices.map((i) => this.amvatQuestions[i]);
      },

      submitOrConfirmPartII() {
        const fields = [
          "child_disability",
          "mother_disability",
          "living_parents",
          "violence",
          "age",
          "income_source",
          "education_skills",
        ];
        const hasChanges = fields.some(
          (f) =>
            this.partIIOriginal[f] !== undefined &&
            this.partIIOriginal[f] !== this.amvatFormData[f],
        );
        if (hasChanges) {
          this.showPartIIEditConfirm = true;
        } else {
          this.submitAMVATAssessment();
        }
      },

      cancelPartIIChanges() {
        const fields = [
          "child_disability",
          "mother_disability",
          "living_parents",
          "violence",
          "age",
          "income_source",
          "education_skills",
        ];
        fields.forEach((f) => {
          if (this.partIIOriginal[f] !== undefined)
            this.amvatFormData[f] = this.partIIOriginal[f];
        });
        this.showPartIIEditConfirm = false;
        this.showSnackbar("Changes reverted to original values", "info");
      },
      confirmPartIIAndSubmit() {
        this.showPartIIEditConfirm = false;
        this.submitAMVATAssessment();
      },

      submitAMVATAssessment() {
        // Validate all questions
        for (let i = 1; i <= 25; i++) {
          if (this.amvatFormData[`q${i}`] === null) {
            this.showSnackbar(`Please answer question ${i}`, "error");
            return;
          }
        }

        // Validate Part II
        const requiredFields = [
          "child_disability",
          "mother_disability",
          "living_parents",
          "violence",
          "age",
          "income_source",
          "education_skills",
        ];
        for (const field of requiredFields) {
          if (!this.amvatFormData[field]) {
            this.showSnackbar("Please complete all Part II questions", "error");
            return;
          }
        }

        // ✅ Show confirmation dialog instead of submitting directly
        this.showAMVATConfirm = true;
      },

      confirmAndSubmitAMVAT() {
        this.showAMVATConfirm = false;
        this.amvatLoading = true;
        this.amvatSaving = true;
        const scores = this.calculateAMVATScores();

        const submissionData = {
          profile: {
            idNumber: this.amvatFormData.idNumber,
            name: this.amvatFormData.name,
            region: this.amvatFormData.region,
            province: this.amvatFormData.province,
            municipality_city: this.amvatFormData.municipality_city,
            barangay: this.amvatFormData.barangay,
            street_sitio: this.amvatFormData.street_sitio,
            contact: this.amvatFormData.contact,
            civilStatus: this.amvatFormData.civilStatus,
            hasChild: this.amvatFormData.hasChild,
            numChildren: this.amvatFormData.numChildren,
            livingWithPartner: this.amvatFormData.livingWithPartner,
            religion: this.amvatFormData.religion,
            dateOfBirth: this.amvatFormData.dateOfBirth,
            education: this.amvatFormData.education,
            occupation: this.amvatFormData.occupation,
            child_disability: this.amvatFormData.child_disability,
            mother_disability: this.amvatFormData.mother_disability,
            living_parents: this.amvatFormData.living_parents,
            violence: this.amvatFormData.violence,
            age: this.amvatFormData.age,
            income_source: this.amvatFormData.income_source,
            education_skills: this.amvatFormData.education_skills,
          },
          responses: {},
          scores: scores,
        };

        for (let i = 1; i <= 25; i++) {
          submissionData.responses[`q${i}`] = this.amvatFormData[`q${i}`];
        }

        google.script.run
          .withSuccessHandler((result) => {
            this.amvatLoading = false;
            this.amvatSaving = false;
            let response;
            try {
              response = typeof result === "string" ? JSON.parse(result) : result;
            } catch (error) {
              this.showSnackbar("Submission failed: invalid backend response", "error");
              return;
            }

            if (response.success) {
              this.amvatResults = scores;
              this.amvatPage = 10;
              this.showSnackbar(
                "Assessment for Q" +
                  this.selectedQuarter +
                  "-Y" +
                  this.selectedYear +
                  " submitted!",
                "success",
              );
            } else {
              this.showSnackbar(
                response.error || response.message || "Submission failed",
                "error",
              );
            }
          })
          .withFailureHandler((error) => {
            this.amvatLoading = false;
            this.amvatSaving = false;
            this.showSnackbar("Error: " + error, "error");
          })
          .submitAMVATToQuarter(
            submissionData,
            this.selectedQuarter,
            this.selectedYear,
          );
      },

      // Regular: 1→0, 2→1, 3→2, 4→3, 5→4
      convertToRawScore(displayValue) {
        const map = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
        return map[displayValue] ?? 0;
      },

      // Reverse-coded: 1→4, 2→3, 3→2, 4→1, 5→0
      reverseCode(displayValue) {
        const map = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 };
        return map[displayValue] ?? 0;
      },

      // Reverse-coded question IDs
      isReverseCoded(qId) {
        // Q2, Q8, Q11, Q16, Q17, Q19, Q21, Q22, Q24
        return [2, 8, 11, 16, 17, 19, 21, 22, 24].includes(qId);
      },

      getSingleScore(qNum) {
        const val = this.amvatFormData[`q${qNum}`];
        if (val === null || val === undefined) return 0;
        return this.isReverseCoded(qNum)
          ? this.reverseCode(val)
          : this.convertToRawScore(val);
      },

      // ── DOMAIN SCORES ─────

      // Domain 1 - Individual Empowerment: Q1, Q2(R), Q3, Q4
      // Max = 4+4+4+4 = 16
      calcEmpowerment() {
        return (
          this.getSingleScore(1) +
          this.getSingleScore(2) + // reversed
          this.getSingleScore(3) +
          this.getSingleScore(4)
        );
      },

      // Domain 2 - ASRH / Family Planning: Q5, Q6, Q7, Q8(R)
      // Max = 4+4+4+4 = 16
      calcPregnancy() {
        return (
          this.getSingleScore(5) +
          this.getSingleScore(6) +
          this.getSingleScore(7) +
          this.getSingleScore(8)
        ); // reversed
      },

      // Domain 3 - Health: Q9, Q10, Q11(R), Q12
      // Max = 4+4+4+4 = 16
      calcHealth() {
        return (
          this.getSingleScore(9) +
          this.getSingleScore(10) +
          this.getSingleScore(11) + // reversed
          this.getSingleScore(12)
        );
      },

      // Domain 4 - Education & Livelihood: Q13, Q14, Q15, Q16(R)
      // Max = 4+4+4+4 = 16
      calcEducation() {
        return (
          this.getSingleScore(13) +
          this.getSingleScore(14) +
          this.getSingleScore(15) +
          this.getSingleScore(16)
        ); // reversed
      },

      // Domain 5 - Family & Community Support: Q17(R), Q18, Q19(R), Q20
      // Max = 4+4+4+4 = 16
      calcSupport() {
        return (
          this.getSingleScore(17) + // reversed
          this.getSingleScore(18) +
          this.getSingleScore(19) + // reversed
          this.getSingleScore(20)
        );
      },

      // Domain 6 - Mental Health: Q21(R), Q22(R), Q23, Q24(R), Q25
      // Max = 4+4+4+4+4 = 20
      calcMentalHealth() {
        return (
          this.getSingleScore(21) + // reversed
          this.getSingleScore(22) + // reversed
          this.getSingleScore(23) +
          this.getSingleScore(24) + // reversed
          this.getSingleScore(25)
        );
      },

      // ── PART II DEDUCTIONS ───────────────────────────────────────────

      getParentsDeduction() {
        const val = this.amvatFormData.living_parents;
        if (val === "Both parents are deceased") return -6;
        if (val === "Solo parent or living with guardian only") return -4;
        if (val === "Both parents alive but not living with them") return -2;
        return 0;
      },

      getAgeDeduction() {
        const val = this.amvatFormData.age;
        if (val === "9-12 yrs old") return -5;
        if (val === "13-14 yrs old") return -3.75;
        if (val === "15-17 yrs old") return -2.5;
        if (val === "18-19 yrs old") return -1.25;
        return 0;
      },

      // ── INTERPRETATIONS ──────────────────────────────────────────────

      getDomainInterpretation(score, domain) {
        // Domains 1-5
        const interpretations = {
          empowerment: {
            low: "Limitado ang kaalaman, posibleng vulnerable sa abuse o exploitation.",
            moderate: "May kaalaman ngunit kailangan pa ng pagpapalakas.",
            high: "Malinaw na nauunawaan at naipapakita ang empowerment at karapatan.",
          },
          pregnancy: {
            low: "Kinakailangan ng masinsinang counseling at guidance.",
            moderate: "May kaalaman ngunit kailangan pa ng dagdag na suporta.",
            high: "Malinaw ang kaalaman at kakayahan sa pag-iwas sa panibagong pagbubuntis.",
          },
          health: {
            low: "Mataas ang panganib sa kalusugan, kailangan ng close monitoring.",
            moderate: "May potensyal ngunit kailangan pang palakasin.",
            high: "Aktibo at mahusay sa paggamit ng health services at gawi para sa kalusugan.",
          },
          education: {
            low: "Posibleng walang malinaw na plano, nangangailangan ng mentoring.",
            moderate: "Nangangailangan ng guidance at access sa opportunities.",
            high: "May malinaw na plano at motibasyon para sa edukasyon at kabuhayan.",
          },
          support: {
            low: "Kulang ang suporta, maaaring makaranas ng isolation.",
            moderate: "May suporta ngunit hindi laging sapat.",
            high: "Malakas ang suporta mula sa pamilya at komunidad.",
          },
        };

        // Thresholds for 4-question domains: low ≤8, moderate 9-12, high ≥13
        const level = score <= 8 ? "low" : score <= 12 ? "moderate" : "high";
        return interpretations[domain]?.[level] ?? "";
      },

      getMentalHealthInterpretation(score) {
        // 5-question domain, max 20: low ≤10, moderate 11-15, high ≥16
        if (score <= 10)
          return "Mababa ang kakayahan sa pag-regulate ng emosyon, mababa ang self-esteem, o kulang ang coping skills.";
        if (score <= 15)
          return "Katamtaman ang emotional stability, may pangangailangan pa ng psychosocial support.";
        return "Maayos ang pag-iisip, matatag sa emosyon, at may positibong pananaw sa sarili at sa hinaharap.";
      },

      getOverallInterpretation(score) {
        // Total Part I max = 84; Part II max deduction = -40
        if (score >= 68) return "High - Strong overall capacity and support";
        if (score >= 34)
          return "Moderate - Moderate capacity, some areas still need strengthening";
        return "Low - Low overall capacity, high need for intensive intervention";
      },

      getInterpretationLevel(score, type) {
        if (type === "mental") {
          if (score <= 10) return "Low";
          if (score <= 15) return "Moderate";
          return "High";
        }
        // 4-question domain
        if (score <= 8) return "Low";
        if (score <= 12) return "Moderate";
        return "High";
      },

      formatDeductionLabel(key) {
        const labels = {
          childDisability: "Child Disability",
          motherDisability: "Mother Disability",
          livingParents: "Living Parents",
          violence: "Abuse / Violence",
          age: "Age at 1st Birth",
          incomeSource: "No Income",
          educationSkills: "Incomplete Edu.",
        };
        return labels[key] || key;
      },

      // ── MAIN CALCULATE FUNCTION ──────────────────────────────────────

      calculateAMVATScores() {
        const empScore = this.calcEmpowerment();
        const pregScore = this.calcPregnancy();
        const healthScore = this.calcHealth();
        const eduScore = this.calcEducation();
        const supScore = this.calcSupport();
        const mhScore = this.calcMentalHealth();

        const subtotal =
          empScore + pregScore + healthScore + eduScore + supScore + mhScore;

        // Part II deductions (all negative values)
        const deductions = {
          childDisability:
            this.amvatFormData.child_disability === "Oo" ? -8 : 0,
          motherDisability:
            this.amvatFormData.mother_disability === "Oo" ? -7 : 0,
          livingParents: this.getParentsDeduction(),
          violence: this.amvatFormData.violence === "Oo" ? -9 : 0,
          age: this.getAgeDeduction(),
          incomeSource: this.amvatFormData.income_source === "Hindi" ? -3 : 0,
          educationSkills:
            this.amvatFormData.education_skills === "Hindi" ? -2 : 0,
        };

        const totalDeduction = Object.values(deductions).reduce(
          (a, b) => a + b,
          0,
        );
        const finalScore = subtotal + totalDeduction; // deductions are already negative

        return {
          empowerment: {
            score: empScore,
            interpretation: this.getDomainInterpretation(
              empScore,
              "empowerment",
            ),
          },
          pregnancy: {
            score: pregScore,
            interpretation: this.getDomainInterpretation(
              pregScore,
              "pregnancy",
            ),
          },
          health: {
            score: healthScore,
            interpretation: this.getDomainInterpretation(healthScore, "health"),
          },
          education: {
            score: eduScore,
            interpretation: this.getDomainInterpretation(eduScore, "education"),
          },
          support: {
            score: supScore,
            interpretation: this.getDomainInterpretation(supScore, "support"),
          },
          mentalhealth: {
            score: mhScore,
            interpretationmental: this.getMentalHealthInterpretation(mhScore),
          },
          subtotal,
          deductions,
          totalDeduction,
          total: {
            score: finalScore,
            interpretation: this.getOverallInterpretation(finalScore),
          },
        };
      },

      submitAnotherAMVAT() {
        this.resetAMVATForm();
        this.showAMVATForm = true;
        this.amvatPage = 0;
      },

      countAnsweredQuestions() {
        let count = 0;
        for (let i = 1; i <= 25; i++) {
          if (
            this.amvatFormData[`q${i}`] !== null &&
            this.amvatFormData[`q${i}`] !== undefined
          )
            count++;
        }
        return count;
      },

      getInterprBadgeStyle(interpretation) {
        const styles = {
          "High - Strong overall capacity and support":
            "background: rgba(5,150,105,0.25); border-color: rgba(5,150,105,0.4);",
          "Moderate - Moderate capacity, some areas still need strengthening":
            "background: rgba(217,119,6,0.25); border-color: rgba(217,119,6,0.4);",
          "Low - Low overall capacity, high need for intensive intervention":
            "background: rgba(220,38,38,0.25); border-color: rgba(220,38,38,0.4);",
        };
        return styles[interpretation] || "background: rgba(255,255,255,0.15);";
      },

      getInterprIcon(interpretation) {
        if (interpretation?.startsWith("High")) return "mdi-check-circle";
        if (interpretation?.startsWith("Moderate")) return "mdi-alert-circle";
        return "mdi-alert-octagon";
      },

      getInterprIconColor(interpretation) {
        if (interpretation?.startsWith("High")) return "#6ee7b7";
        if (interpretation?.startsWith("Moderate")) return "#fcd34d";
        return "#fca5a5";
      },

      startAMVAT() {
        this.currentView = "amvat";
        this.showAMVATForm = true;
        this.amvatPage = 0;
      },

      selectAMVATProfile(person) {
        const idNumber = person.fullName;

        // Show fullscreen overlay immediately
        this.amvatProfileLoading = true;
        this.amvatLoadingName = person.fullName;

        // Populate form data
        this.amvatFormData.idNumber = idNumber;
        this.amvatFormData.name = person.fullName;
        this.amvatFormData.region = person.region;
        this.amvatFormData.province = person.province;
        this.amvatFormData.municipality_city = person.municipality;
        this.amvatFormData.barangay = person.barangay;
        this.amvatFormData.street_sitio = person.street;
        this.amvatFormData.contact = person.contact;
        this.amvatFormData.civilStatus = person.civilStatus;
        this.amvatFormData.hasChild = person.hasChild;
        this.amvatFormData.numChildren = person.numChildren;
        this.amvatFormData.livingWithPartner = person.withPartner;
        this.amvatFormData.religion = person.religion;
        this.amvatFormData.dateOfBirth = person.birthDate
          ? person.birthDate.substring(0, 10)
          : "";
        this.amvatFormData.education = person.education;
        this.amvatFormData.occupation = person.occupation;

        // Clear search UI
        this.showAMVATResults = false;
        this.amvatSearchValue = "";
        this.amvatProfileResults = [];

        // Load existing data (overlay stays on until this resolves)
        this.loadExistingAMVATData(idNumber);
      },

      // Load existing AMVAT data for selected quarter/year
      loadExistingAMVATData(idNumber) {
        google.script.run
          .withSuccessHandler((response) => {
            this.amvatLoading = false;
            this.amvatProfileLoading = false;

            try {
              const result = JSON.parse(response);

              if (result.success && result.exists) {
                this.viewingExistingAMVAT = true;
                this.existingAMVATScores = result.data.scores;

                Object.assign(this.amvatFormData, result.data.profile);
                this.amvatFormData.idNumber = idNumber;

                if (result.data.partII) {
                  Object.assign(this.amvatFormData, result.data.partII);
                  // Snapshot for change detection
                  this.partIIOriginal = {
                    child_disability: this.amvatFormData.child_disability,
                    mother_disability: this.amvatFormData.mother_disability,
                    living_parents: this.amvatFormData.living_parents,
                    violence: this.amvatFormData.violence,
                    age: this.amvatFormData.age,
                    income_source: this.amvatFormData.income_source,
                    education_skills: this.amvatFormData.education_skills,
                  };
                }

                // BASELINE or Q1-Y1 = read-only, jump straight to results page
                if (result.isViewOnly) {
                  this.isViewOnlyMode = true;
                  this.amvatResults = result.data.scores;
                  this.showAMVATForm = true;
                  this.amvatPage = 10;
                  this.showSnackbar(
                    "Viewing Baseline results (Read-Only).",
                    "info",
                  );
                } else {
                  this.isViewOnlyMode = false;
                  this.showAMVATForm = true;
                  this.amvatPage = 2;
                  this.showSnackbar(
                    "Previous scores loaded. You can now submit for Q" +
                      this.selectedQuarter +
                      "-Y" +
                      this.selectedYear +
                      ".",
                    "info",
                  );
                  if (result.previousScores) {
                    this.previousQuarterScores = result.previousScores;
                    this.previousQuarterLabel = result.previousLabel;
                  } else {
                    this.previousQuarterScores = null;
                    this.previousQuarterLabel = "";
                  }
                }
              } else {
                // No existing data found
                this.viewingExistingAMVAT = false;
                this.existingAMVATScores = null;
                this.amvatFormData.idNumber = idNumber;
                this.showAMVATForm = true;
                this.amvatPage = 2;
                if (result.previousScores) {
                  this.previousQuarterScores = result.previousScores;
                  this.previousQuarterLabel = result.previousLabel;
                } else {
                  this.previousQuarterScores = null;
                  this.previousQuarterLabel = "";
                }

                // Baseline with no data = still view only
                this.isViewOnlyMode = this.selectedQuarter === "baseline";

                if (this.selectedQuarter === "baseline") {
                  this.showSnackbar(
                    "No baseline data found for this beneficiary.",
                    "warning",
                  );
                } else {
                  this.showSnackbar(
                    "Starting new assessment for Q" +
                      this.selectedQuarter +
                      "-Y" +
                      this.selectedYear,
                    "success",
                  );
                }
              }
            } catch (e) {
              console.error("Parse error:", e);
              this.showSnackbar("Error loading AMVAT data", "error");
              this.amvatPage = 1;
            }
          })
          .withFailureHandler((error) => {
            this.amvatLoading = false;
            this.amvatProfileLoading = false;
            console.error("Load Error:", error);
            this.showSnackbar("Failed to load AMVAT data: " + error, "error");
            this.amvatPage = 1;
          })
          .getExistingAMVAT(
            idNumber,
            this.selectedQuarter,
            this.selectedYear,
            this.getSessionData(),
          );
      },

      getPreviousQuarterLabel(quarter, year) {
        // Returns { quarter, year } of the previous assessment period
        if (quarter === "baseline") return null; // baseline has no previous
        if (quarter === 1 && year === 1)
          return { quarter: "baseline", year: 1 };
        if (quarter === 1 && year > 1) return { quarter: 4, year: year - 1 };
        return { quarter: quarter - 1, year: year };
      },

      // Update profile only for Q1-Y1
      updateQ1Y1Profile(confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Update AMVAT Profile?",
              message: "This will update the beneficiary profile details for the baseline assessment.",
            },
            () => this.updateQ1Y1Profile(true),
          );
          return;
        }
        this.amvatLoading = true;

        const profileData = {
          name: this.amvatFormData.name,
          region: this.amvatFormData.region,
          province: this.amvatFormData.province,
          municipality_city: this.amvatFormData.municipality_city,
          barangay: this.amvatFormData.barangay,
          street_sitio: this.amvatFormData.street_sitio,
          contact: this.amvatFormData.contact,
          civilStatus: this.amvatFormData.civilStatus,
          hasChild: this.amvatFormData.hasChild,
          numChildren: this.amvatFormData.numChildren,
          livingWithPartner: this.amvatFormData.livingWithPartner,
          religion: this.amvatFormData.religion,
          dateOfBirth: this.amvatFormData.dateOfBirth,
          education: this.amvatFormData.education,
          occupation: this.amvatFormData.occupation,
        };

        google.script.run
          .withSuccessHandler((response) => {
            this.amvatLoading = false;
            const result = JSON.parse(response);

            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.showAMVATForm = false;
              this.resetAMVATForm();
            } else {
              this.showSnackbar(result.error || "Update failed", "error");
            }
          })
          .withFailureHandler((error) => {
            this.amvatLoading = false;
            this.showSnackbar("Error: " + error, "error");
          })
          .updateAMVATProfile(
            this.amvatFormData.idNumber,
            profileData,
            this.getSessionData(),
          );
      },
      /// end amvat methods

      checkPasswordStrength() {
        this.passwordStrength = this.calculatePasswordStrength(
          this.authData.password,
        );
      },

      checkNewUserPasswordStrength() {
        this.newUserPasswordStrength = this.calculatePasswordStrength(
          this.newUserData.password,
        );
      },

      checkChangePasswordStrength() {
        this.changePasswordStrength = this.calculatePasswordStrength(
          this.passwordData.newPassword,
        );
      },

      // Session Management
      checkForActiveSession() {
        this.checkingSession = true;

        let storedSession = localStorage.getItem("amis_session");
        const isLocalDevHost =
          location.hostname === "127.0.0.1" || location.hostname === "localhost";

        if (!storedSession && isLocalDevHost) {
          const localSession = {
            sessionToken: "local-dev-session_" + Date.now(),
            user: {
              email: "admin@amis.local",
              name: "System Administrator",
              role: "admin",
              region: "ALL Region",
              province: "",
              status: "active",
            },
            loginTimestamp: Date.now(),
          };
          storedSession = JSON.stringify(localSession);
          localStorage.setItem("amis_session", storedSession);
        }

        // Silent return if no session exists
        if (!storedSession) {
          this.isLoggedIn = false;
          this.checkingSession = false;
          hideLoadingScreen();
          return;
        }

        let sessionData;
        try {
          sessionData = JSON.parse(storedSession);
        } catch (e) {
          // Silent cleanup on parse error
          console.log("Cleared invalid session data");
          localStorage.removeItem("amis_session");
          this.isLoggedIn = false;
          this.checkingSession = false;
          hideLoadingScreen();
          return;
        }

        // Validate session data structure
        if (
          !sessionData ||
          !sessionData.sessionToken ||
          !sessionData.user ||
          !sessionData.loginTimestamp
        ) {
          console.log("Incomplete session data detected - cleaning up");
          localStorage.removeItem("amis_session");
          this.isLoggedIn = false;
          this.checkingSession = false;
          hideLoadingScreen();
          return;
        }

        // Add timeout to force hide loading screen after 10 seconds
        const timeoutId = setTimeout(() => {
          console.warn("Session check timed out");
          if (this.checkingSession) {
            this.isLoggedIn = false;
            this.checkingSession = false;
            hideLoadingScreen();
          }
        }, 10000);

        google.script.run
          .withSuccessHandler((response) => {
            clearTimeout(timeoutId);

            try {
              const result = JSON.parse(response);

              if (result.success) {
                this.isLoggedIn = true;
                this.currentUser = result.user;
                this.sessionToken = result.sessionToken;
                this.loginTimestamp = sessionData.loginTimestamp;
                this.loadDashboardStats(true);
              } else {
                this.isLoggedIn = false;
                this.sessionToken = null;
                this.loginTimestamp = null;
                this.currentUser = null;
                localStorage.removeItem("amis_session");
              }
            } catch (e) {
              this.isLoggedIn = false;
              localStorage.removeItem("amis_session");
            }

            this.checkingSession = false;
            hideLoadingScreen();
          })
          .withFailureHandler((error) => {
            clearTimeout(timeoutId);
            if (!this.isLoggedIn) {
              this.isLoggedIn = false;
              this.sessionToken = null;
              this.loginTimestamp = null;
              localStorage.removeItem("amis_session");
            }
            this.checkingSession = false;
            hideLoadingScreen();
          })
          .checkSession(sessionData);
      },

      toggleAuthMode() {
        this.authMode = this.authMode === "login" ? "signup" : "login";
        this.authData = {
          email: "",
          password: "",
          name: "",
          role: "case_manager",
          region: "",
        };
        this.passwordStrength = {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        };
        this.showPassword = false;
        if (this.$refs.authForm) {
          this.$refs.authForm.resetValidation();
        }
      },

      handleAuth() {
        if (!this.$refs.authForm.validate()) {
          return;
        }

        this.loading = true;
        const method = this.authMode === "login" ? "login" : "signup";

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loading = false;

            if (result.success) {
              this.currentUser = result.user;
              this.sessionToken = result.sessionToken;
              this.loginTimestamp = result.loginTimestamp;
              this.isLoggedIn = true;

              if (result.user.mustChangePassword) {
                this.forceChangePasswordDialog = true;
              }

              const sessionData = {
                sessionToken: result.sessionToken,
                user: result.user,
                loginTimestamp: result.loginTimestamp,
              };
              localStorage.setItem("amis_session", JSON.stringify(sessionData));

              if (!result.user.mustChangePassword) {
                this.showSnackbar(result.message, "success");
              }

              this.loadDashboardStats(true);
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loading = false;
          })
          [method](this.authData);
      },

      getSessionAttendancePercentage() {
        if (!this.dashboardStats.sessionStats) return 0;
        const stats = this.getSessionStats();
        if (!stats || stats.totalMarked === 0) return 0;
        return parseFloat(
          ((stats.present / stats.totalMarked) * 100).toFixed(1),
        );
      },

      getSessionPresentCount() {
        const stats = this.getSessionStats();
        return stats ? stats.present : 0;
      },

      getSessionPresentPercentage() {
        const stats = this.getSessionStats();
        if (!stats || stats.totalMarked === 0) return 0;
        const pct = (stats.present / stats.totalMarked) * 100;
        if (pct > 99 && pct < 100) return parseFloat(pct.toFixed(1));
        return Math.round(pct);
      },

      getSessionAbsentCount() {
        const stats = this.getSessionStats();
        return stats ? stats.absent : 0;
      },

      getSessionAbsentPercentage() {
        const stats = this.getSessionStats();
        if (!stats || stats.totalMarked === 0) return 0;
        return Math.round((stats.absent / stats.totalMarked) * 100);
      },

      getSessionExemptedCount() {
        const stats = this.getSessionStats();
        return stats ? stats.exempted : 0;
      },

      getSessionExemptedPercentage() {
        const stats = this.getSessionStats();
        if (!stats || stats.totalMarked === 0) return 0;
        return Math.round((stats.exempted / stats.totalMarked) * 100);
      },

      getRegionTarget(region) {
        const regionTargets = {
          III: 135,
          VI: 71,
          X: 278,
        };
        return regionTargets[region] || 0;
      },

      getYoungestAge() {
        const groups = this.sortedAgeGroups;
        const ages = Object.keys(groups).map(Number);
        return ages.length > 0 ? Math.min(...ages) : "N/A";
      },

      getEldestAge() {
        const groups = this.sortedAgeGroups;
        const ages = Object.keys(groups).map(Number);
        return ages.length > 0 ? Math.max(...ages) : "N/A";
      },

      getAverageAge() {
        const groups = this.sortedAgeGroups;
        const ages = Object.keys(groups).map(Number);
        if (ages.length === 0) return "N/A";

        let totalAge = 0;
        let totalCount = 0;

        ages.forEach((age) => {
          totalAge += age * groups[age];
          totalCount += groups[age];
        });

        return totalCount > 0 ? Math.round(totalAge / totalCount) : "N/A";
      },

      // ── ENROLLED LIST FEATURE METHODS ──

      resetEnrolledFilters() {
        this.enrolledFilterCivilStatus = null;
        this.enrolledFilterAgeRange = [10, 30];
        this.enrolledFilterMunicipality = null;
        this.enrolledFilterBarangays = [];
        this.enrolledFilterOverdueOnly = false;
        this.enrolledSearch = "";
      },

      hasUnsavedTab(tab) {
        // Placeholder — can be wired to a dirty-tracking object later
        return false;
      },

      showChangeHistory() {
        this.showSnackbar("Change history coming soon", "info");
      },

      getRegionTotal(region) {
        if (!this.dashboardStats.regionTotals) {
          return 0;
        }
        return this.dashboardStats.regionTotals[region] || 0;
      },

      logout() {
        // Show confirmation dialog instead of logging out immediately
        this.logoutDialog = true;
      },

      confirmLogout() {
        // Close dialog first
        this.logoutDialog = false;

        // Then execute logout
        this.stopAllPolling();
        this.stopUsersAutoRefresh();

        // Get session data before clearing
        const sessionData = this.getSessionData();

        // Clear local state immediately
        this.isLoggedIn = false;
        this.currentUser = null;
        this.sessionToken = null;
        this.loginTimestamp = null;
        localStorage.removeItem("amis_session");
        this.currentView = "dashboard";

        // Reset auth form
        this.authData = {
          email: "",
          password: "",
          name: "",
          role: "case_manager",
          region: "",
        };
        this.authMode = "login";
        this.passwordStrength = {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        };
        this.showPassword = false;
        this.loading = false;

        // Validate form on next tick
        this.$nextTick(() => {
          if (this.$refs.authForm) {
            this.$refs.authForm.resetValidation();
          }
        });

        // Show success message
        this.showSnackbar("Logged out successfully", "info");

        // Call server logout (non-blocking)
        if (sessionData && sessionData.sessionToken) {
          google.script.run
            .withSuccessHandler((response) => {
              console.log("Server logout completed");
            })
            .withFailureHandler((error) => {
              console.log("Server logout failed (ignored):", error);
            })
            .logoutSession(sessionData);
        }
      },

      // Dashboard & Data Loading
      loadDashboardStats(forceRefresh = false) {
        const now = Date.now();
        if (this.loadingDashboardStats) return;
        if (
          !forceRefresh &&
          this.lastDashboardStatsLoadedAt &&
          now - this.lastDashboardStatsLoadedAt < this.dashboardRefreshInterval
        ) {
          return;
        }

        this.loadingDashboardStats = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.dashboardStats = result.stats;
              this.lastDashboardStatsLoadedAt = Date.now();
              this.loadBarangayList();
            } else {
              this.showSnackbar(result.message, "error");
            }
            this.loadingDashboardStats = false;
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error loading stats: " + error, "error");
            this.loadingDashboardStats = false;
          })
          .getDashboardStats(this.getSessionData());
      },

      shouldShowRegion(region) {
        // Admin sees all regions
        if (!this.currentUser) return false;

        if (this.currentUser.role === "admin") {
          return true;
        }

        // Case managers only see their assigned region
        return this.currentUser.region === region;
      },

      getRegionPercentage(region) {
        // Define target goals for each region
        const regionTargets = {
          III: 135, // Bulacan target
          VI: 71, // Iloilo target
          X: 278, // Misamis Oriental target
        };

        const target = regionTargets[region] || this.getRegionTotal(region);
        if (!target) return 0;

        const regionTotal = this.getRegionTotal(region);
        const percentage = (regionTotal / target) * 100;

        return Math.floor(Math.min(percentage, 100));
      },

      getDisplayTotal() {
        if (!this.currentUser) return 0;
        if (!this.isAdmin && this.selectedBarangay && this.barangayStats) {
          return this.barangayStats.barangayTotal || 0;
        }
        if (this.currentUser.role === "admin") {
          return this.dashboardStats.totalEnrolled || 0;
        }
        return this.getRegionTotal(this.currentUser.region);
      },

      loadEnrolledList(forceRefresh = false) {
        // Only prevent duplicate concurrent requests
        if (this.loadingEnrolledList) return;

        this.loadingEnrolledList = true;

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);

            if (result.success) {
              this.enrolledList = result.data.map((record) => {
                let age = "";
                if (record.date_birth) {
                  const dob = new Date(record.date_birth);
                  const today = new Date();
                  let calculatedAge = today.getFullYear() - dob.getFullYear();
                  const monthDiff = today.getMonth() - dob.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    calculatedAge--;
                  }
                  age = calculatedAge >= 0 ? calculatedAge : "";
                }
                return {
                  ...record,
                  full_name: `${record.first_name || ""} ${record.middle_name || ""} ${record.last_name || ""}`
                    .trim().replace(/\s+/g, " "),
                  age: age,
                };
              });

              this.enrolledListTotal = result.total || result.data.length;
              this._enrolledLoadedAt = Date.now();

              if (forceRefresh) {
                this.showSnackbar(`Loaded ${this.enrolledListTotal} records`, "success");
              }
            } else {
              this.showSnackbar(result.message, "error");
            }
            this.loadingEnrolledList = false;
          })
          .withFailureHandler((error) => {
            console.error("Failed to load enrolled list:", error);
            this.showSnackbar("Error loading list: " + error, "error");
            this.loadingEnrolledList = false;
          })
          .getEnrolledListCached(
            1,
            100000,
            forceRefresh,
            "",
            this.getSessionData(),
          );
      },

      viewEnrolledRecord(item) {
        this.loadingRecordDialog = true;
        this.viewRecordDialog = true;
        this.selectedRecord = null;
        this.recordLastSaved = null;

        // Track recently viewed (keep max 5, no duplicates)
        const existing = this.recentlyViewedRecords.findIndex(
          (r) => r.id_number === item.id_number
        );
        if (existing !== -1) this.recentlyViewedRecords.splice(existing, 1);
        this.recentlyViewedRecords.unshift(item);
        if (this.recentlyViewedRecords.length > 5) {
          this.recentlyViewedRecords = this.recentlyViewedRecords.slice(0, 5);
        }

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingRecordDialog = false;

            if (result.success && result.enrolledRecord) {
              this.selectedRecord = result.enrolledRecord;

              if (result.additionalInfo) {
                this.additionalInfo = result.additionalInfo;
              } else {
                this.resetAdditionalInfo();
              }

              this.recordTab = "basic";
              this.loadingRecordDialog = false;
            } else {
              this.loadingRecordDialog = false;
              this.viewRecordDialog = false;
              this.showSnackbar(
                result.message || "Failed to load record",
                "error",
              );
            }
          })
          .withFailureHandler((error) => {
            this.loadingEnrolledList = false;
            this.loadingRecordDialog = false;
            this.viewRecordDialog = false;
            this.showSnackbar("Error loading record: " + error, "error");
          })
          .getEnrolledRecordWithInfo(item.id_number, this.getSessionData());
      },

      // User Management
      loadUsersList() {
        this.loadingUsers = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.usersList = result.users;
            } else {
              this.showSnackbar(result.message, "error");
            }
            this.loadingUsers = false;
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error loading users: " + error, "error");
            this.loadingUsers = false;
          })
          .getAllUsers(this.getSessionData());
      },

      openAddUserDialog() {
        this.addUserDialog = true;
        this.newUserData = {
          email: "",
          password: "",
          name: "",
          role: "case_manager",
          region: "",
        };
        this.newUserPasswordStrength = {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        };
      },

      addNewUser(confirmed = false) {
        if (
          !this.newUserData.email ||
          !this.newUserData.password ||
          !this.newUserData.name ||
          !this.newUserData.role
        ) {
          this.showSnackbar("All fields are required", "error");
          return;
        }

        if (
          this.newUserData.role === "case_manager" &&
          !this.newUserData.region
        ) {
          this.showSnackbar("Region is required for Case Managers", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Create User Account?",
              message: `This will create a new ${this.newUserData.role} account for ${this.newUserData.email}.`,
            },
            () => this.addNewUser(true),
          );
          return;
        }

        this.loading = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loading = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.addUserDialog = false;
              this.loadUsersList();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loading = false;
          })
          .signup(this.newUserData, this.getSessionData());
      },

      confirmDeleteUser(user, confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Delete User Account?",
              message: `This will permanently delete the account for ${user.name}.`,
              buttonColor: "error",
              confirmIcon: "mdi-delete",
              confirmText: "Yes, Delete",
            },
            () => this.confirmDeleteUser(user, true),
          );
          return;
        }

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.loadUsersList();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
          })
          .deleteUser(user.email, this.getSessionData());
      },

      openPasswordDialog(user) {
        this.passwordDialogUser = user;
        this.passwordData = {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        };
        this.changePasswordStrength = {
          percentage: 0,
          text: "Weak",
          color: "#f44336",
        };
        this.passwordDialog = true;
      },

      changePassword(confirmed = false) {
        if (
          !this.passwordData.newPassword ||
          !this.passwordData.confirmPassword
        ) {
          this.showSnackbar("Please fill all fields", "error");
          return;
        }

        if (
          this.passwordData.newPassword !== this.passwordData.confirmPassword
        ) {
          this.showSnackbar("Passwords do not match", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Update User Password?",
              message: `This will change the password for ${this.passwordDialogUser?.email || "the selected user"}.`,
            },
            () => this.changePassword(true),
          );
          return;
        }

        this.loading = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loading = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.passwordDialog = false;
              this.passwordDialogUser = null;
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loading = false;
          })
          .updatePassword(
            this.passwordDialogUser.email,
            this.passwordData.newPassword,
            this.passwordData.currentPassword,
            this.getSessionData(),
          );
      },

      // Reports
      generateReport() {
        if (!this.reportType) {
          this.showSnackbar("Please select a report type", "error");
          return;
        }

        this.loadingReport = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingReport = false;

            if (result.success) {
              this.reportData = result.reportData;
              this.setupReportHeaders(this.reportType);
              this.showSnackbar("Report generated successfully", "success");
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loadingReport = false;
          })
          .generateReport(
            this.reportType,
            JSON.stringify(this.reportFilters),
            this.getSessionData(),
          );
      },

      setupReportHeaders(reportType) {
        switch (reportType) {
          case "age_distribution":
            this.reportHeaders = [
              { title: "Age Group", key: "ageGroup" },
              { title: "Count", key: "count" },
              { title: "Percentage", key: "percentage" },
            ];
            break;
          case "location_summary":
            this.reportHeaders = [
              { title: "Location", key: "location" },
              { title: "Count", key: "count" },
              { title: "Percentage", key: "percentage" },
            ];
            break;
          case "monthly_enrollment":
            this.reportHeaders = [
              { title: "Period", key: "period" },
              { title: "Count", key: "count" },
            ];
            break;
          case "gender_distribution":
            this.reportHeaders = [
              { title: "Gender", key: "gender" },
              { title: "Count", key: "count" },
              { title: "Percentage", key: "percentage" },
            ];
            break;
        }
      },

      exportReport() {
        if (this.reportData.length === 0) {
          this.showSnackbar("No data to export", "warning");
          return;
        }

        const headers = this.reportHeaders.map((h) => h.title).join(",");
        const rows = this.reportData
          .map((row) => this.reportHeaders.map((h) => row[h.key]).join(","))
          .join("\n");

        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${this.reportType}_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showSnackbar("Report exported successfully", "success");
      },

      loadRegionsList() {
        this.loadingRegions = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.availableRegions = result.regions;
            }
            this.loadingRegions = false;
          })
          .withFailureHandler((error) => {
            console.error("Error loading regions:", error);
            this.loadingRegions = false;
          })
          .getRegionsList();
      },

      loadActivityLogs() {
        this.loadingLogs = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.activityLogs = result.logs;
              this.showSnackbar("Activity logs loaded", "success");
            } else {
              this.showSnackbar(result.message, "error");
            }
            this.loadingLogs = false;
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error loading logs: " + error, "error");
            this.loadingLogs = false;
          })
          .getActivityLogs(50, this.getSessionData());
      },

      getLogColor(action) {
        const colors = {
          USER_LOGIN: "success",
          USER_LOGOUT: "info",
          USER_CREATED: "primary",
          USER_DELETED: "error",
          PASSWORD_CHANGED: "warning",
          RECORD_CREATED: "success",
          RECORD_UPDATED: "warning",
          LOGIN_FAILED: "error",
          ACCOUNT_LOCKED: "error",
          UNAUTHORIZED_ACCESS: "error",
          REPORT_GENERATED: "info",
          DATA_EXPORTED: "info",
        };
        return colors[action] || "default";
      },

      // UPDATED: Refresh with force reload
      refreshCurrentView() {
        if (this.currentView === "dashboard") {
          this.loadDashboardStats(true);
        } else if (this.currentView === "amvat-record") {
          this.loadEnrolledList(true);
        } else if (this.currentView === "enrolled-list") {
          this.loadEnrolledList(true);
        } else if (this.currentView === "manage-users") {
          this.loadUsersList();
        }
        this.showSnackbar("Data refreshed", "info");
      },

      // Registration Form Methods
      backToSearch(skipConfirmation = false) {
        if (skipConfirmation) {
          this.showEnrollForm = false;
          this.resetEnrollForm();
          return;
        }

        const hasUnsavedData = Object.keys(this.enrollForm).some((key) => {
          return (
            !key.startsWith("_") &&
            key !== "signature" &&
            this.enrollForm[key].value !== ""
          );
        });

        if (hasUnsavedData) {
          if (
            !confirm(
              "You have unsaved changes. Are you sure you want to go back? Your data will be auto-saved.",
            )
          ) {
            return;
          }
        }

        this.showEnrollForm = false;
        this.resetEnrollForm();
      },

      onSearchInput(value) {
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }

        if (!value || value.length < 2) {
          this.nameOptions = [];
          return;
        }

        this.searchLoading = true;
        this.searchTimeout = setTimeout(() => {
          google.script.run
            .withSuccessHandler((response) => {
              const result = JSON.parse(response);
              if (result.success) {
                this.nameOptions = result.names;
              } else {
                this.nameOptions = [];
                // Show message if access denied
                if (
                  result.message &&
                  result.message !== "Search query too short"
                ) {
                  this.showSnackbar(result.message, "warning");
                }
              }
              this.searchLoading = false;
            })
            .withFailureHandler((error) => {
              this.showSnackbar("Search error: " + error, "error");
              this.searchLoading = false;
              this.nameOptions = [];
            })
            .searchNames(value, this.getSessionData());
        }, 300);
      },

      loadSelectedRecord() {
        if (!this.selectedName) {
          this.showSnackbar("Please select a name", "error");
          return;
        }

        this.loading = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.populateEnrollForm(result.data);
              this.showEnrollForm = true;

              if (result.data.alreadyEnrolled) {
                this.showSnackbar(
                  `Already enrolled! ID: ${result.data.existingEnrollmentId}. You can update the record.`,
                  "warning",
                );
              } else {
                this.showSnackbar("Record loaded from database", "success");
              }
            } else {
              this.showSnackbar(result.message, "warning");
            }
            this.loading = false;
            this.selectedName = null;
            this.searchValue = "";
            this.nameOptions = [];
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loading = false;
          })
          .searchRecordByName(this.selectedName, this.getSessionData());
      },

      populateEnrollForm(data) {
        // Normalize any date strings from the Sheets API to YYYY-MM-DD so
        // HTML <input type="date"> can display them.  The API returns dates as
        // locale-formatted strings (e.g. "2/12/2009") which browsers reject.
        const toIsoDate = (raw) => {
          if (!raw) return raw;
          // Already YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
          const d = new Date(raw);
          if (isNaN(d.getTime())) return raw;
          const yr = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, "0");
          const dy = String(d.getDate()).padStart(2, "0");
          return `${yr}-${mo}-${dy}`;
        };

        Object.keys(this.enrollForm).forEach((key) => {
          if (key.startsWith("_")) return;
          if (
            data[key] !== undefined &&
            data[key] !== null &&
            data[key] !== ""
          ) {
            if (this.enrollForm[key].type === "date") {
              this.enrollForm[key].value = toIsoDate(data[key]);
            } else {
              this.enrollForm[key].value = data[key];
            }
          }
        });

        this.enrollForm._alreadyEnrolled = data.alreadyEnrolled || false;
        this.enrollForm._existingEnrollmentId =
          data.existingEnrollmentId || null;

        this.fromSource = true;

        if (data.alreadyEnrolled) {
          this.enrollTitle = "Update Existing Enrollment";
          this.enrollSubtitle =
            `Updating record for: ${data.first_name} ${data.middle_name || ""} ${data.last_name}`
              .trim()
              .replace(/\s+/g, " ");
        } else {
          this.enrollTitle = "Complete Registration";
          this.enrollSubtitle =
            `Data loaded: ${data.first_name} ${data.middle_name || ""} ${data.last_name}`
              .trim()
              .replace(/\s+/g, " ");
        }
      },

      resetEnrollForm() {
        if (this.$refs.enrollForm) {
          this.$refs.enrollForm.resetValidation();
        }

        Object.keys(this.enrollForm).forEach((key) => {
          if (key.startsWith("_")) {
            this.enrollForm[key] = key === "_alreadyEnrolled" ? false : null;
          } else {
            this.enrollForm[key].value = "";
          }
        });

        this.fromSource = false;
        this.enrollTitle = "Registration Form";
        this.enrollSubtitle = "Complete the form below";
        this.searchValue = "";
        this.selectedName = null;
        this.nameOptions = [];

        this.$nextTick(() => {
          if (this.$refs.enrollForm) {
            this.$refs.enrollForm.resetValidation();
          }
        });
      },

      submit(confirmed = false) {
        if (!this.$refs.enrollForm.validate()) {
          this.showSnackbar("Please fill out all required fields", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: this.enrollForm._alreadyEnrolled
                ? "Update Enrollment Record?"
                : "Submit New Enrollment?",
              message: this.enrollForm._alreadyEnrolled
                ? "This will update the existing enrolled beneficiary record."
                : "This will save a new enrolled beneficiary record.",
            },
            () => this.submit(true),
          );
          return;
        }

        this.loading = true;
        const formData = {};

        Object.keys(this.enrollForm).forEach((key) => {
          if (key.startsWith("_")) return;
          formData[key] = this.enrollForm[key].value;
        });

        if (this.enrollForm._alreadyEnrolled) {
          formData.alreadyEnrolled = true;
          formData.existingEnrollmentId = this.enrollForm._existingEnrollmentId;
        }

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loading = false;
            this.showSnackbar(
              result.message,
              result.success ? "success" : "error",
            );

            if (result.success) {
              this.clearFormDraft();
              this.resetEnrollForm();
              this.loadDashboardStats(true);
              this.loadEnrolledList(true);

              setTimeout(() => {
                this.showEnrollForm = false;
              }, 1500);
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loading = false;
          })
          .submit(formData, false, this.getSessionData());
      },

      // Add these methods to your Vue app methods section
      getUserLockoutCountdown(user) {
        if (!user.lockoutUntil) return "";

        const lockoutTime = new Date(user.lockoutUntil);
        const remainingMs = lockoutTime - this.currentTime;

        if (remainingMs <= 0) return "Unlocking...";

        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);

        if (minutes > 0) {
          return `Unlocks in ${minutes}m ${seconds}s`;
        }
        return `Unlocks in ${seconds}s`;
      },

      unlockUserAccount(user, confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Unlock User Account?",
              message: `This will unlock the account for ${user.name}.`,
            },
            () => this.unlockUserAccount(user, true),
          );
          return;
        }

        this.loading = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loading = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.loadUsersList();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loading = false;
          })
          .unlockAccount(user.email, this.getSessionData());
      },

      // Add auto-refresh timer for locked accounts
      startUsersAutoRefresh() {
        let lastReloadTime = 0;

        this.usersRefreshInterval = setInterval(() => {
          if (this.currentView === "manage-users") {
            this.currentTime = Date.now();

            // Check if any locked accounts just expired
            const hasExpiredLocks = this.usersList.some((user) => {
              if (user.lockoutUntil) {
                const lockoutTime = new Date(user.lockoutUntil);
                const now = new Date(this.currentTime);
                return lockoutTime <= now && now - lockoutTime < 2000;
              }
              return false;
            });

            // Only reload once per expiration (prevent loop)
            const timeSinceLastReload = this.currentTime - lastReloadTime;
            if (hasExpiredLocks && timeSinceLastReload > 5000) {
              console.log("Lock expired - auto-unlocking accounts");
              lastReloadTime = this.currentTime;

              // Call backend to unlock expired accounts
              google.script.run
                .withSuccessHandler((response) => {
                  const result = JSON.parse(response);
                  if (result.success) {
                    console.log(
                      `Auto-unlocked ${result.unlockedCount} account(s)`,
                    );
                    this.loadUsersList(); // Reload to show updated status
                  }
                })
                .withFailureHandler((error) => {
                  console.error("Auto-unlock failed:", error);
                  this.loadUsersList(); // Still reload to update UI
                })
                .autoUnlockExpiredAccounts();
            }

            this.$nextTick(() => {
              this.$forceUpdate();
            });
          }
        }, 1000);
      },

      stopUsersAutoRefresh() {
        if (this.usersRefreshInterval) {
          clearInterval(this.usersRefreshInterval);
          this.usersRefreshInterval = null;
        }
      },

      // Additional Info Methods
      loadAdditionalInfo(idNumber) {
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              if (result.additionalInfo) {
                this.additionalInfo = result.additionalInfo;
              } else {
                this.resetAdditionalInfo();
              }
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error loading info: " + error, "error");
          })
          .getEnrolledRecordWithInfo(idNumber, this.getSessionData());
      },

      resetAdditionalInfo() {
        this.additionalInfo = {
          education: "",
          educationLevelDetail: "",
          budgetExpenses: "",
          incomeData: [],
          vulnerabilityFactors: [],
          hasDisability: "No",
          disabilityType: "",
          disabilitySpecify: "",
          hasIllness: "No",
          illnessType: "",
          illnessSpecify: "",
          childrenData: [],
          authorizedGrantee: "",
          granteeRelationship: "",
          granteeContactNumber: "",
          granteeAddress: "",
          authorizedGrantee2: "",
          granteeRelationship2: "",
          granteeContactNumber2: "",
          granteeAddress2: "",
        };
      },

      openAddChildDialog() {
        this.newChild = {
          name: "",
          birthdate: "",
          sex: "",
          newbornScreening: "",
          eyeProphylaxis: "",
          vitaminKSupplementation: "",
          bcgVaccine: "",
          hepatitisB: "",
          hasDisability: "No",
          disabilityType: "",
          disabilitySpecify: "",
          hasIllness: "No",
          illnessType: "",
          illnessSpecify: "",
        };
        this.addChildDialog = true;
      },

      addChildToList() {
        if (!this.$refs.childForm.validate()) {
          this.showSnackbar("Please fill all required fields", "error");
          return;
        }

        this.additionalInfo.childrenData.push({ ...this.newChild });
        this.addChildDialog = false;
        this.showSnackbar("Child added to list", "success");
      },

      removeChild(index) {
        this.confirmWriteAction(
          {
            title: "Remove Child From List?",
            message: "This removes the child from the current beneficiary details before saving.",
            buttonColor: "error",
            confirmIcon: "mdi-delete",
          },
          () => {
            this.additionalInfo.childrenData.splice(index, 1);
            this.showSnackbar("Child removed", "info");
          },
        );
      },

      saveSessionAttendance(confirmed = false) {
        if (!this.selectedRecord) {
          this.showSnackbar("No record selected", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Session Attendance?",
              message: "This will update session attendance for the selected beneficiary.",
            },
            () => this.saveSessionAttendance(true),
          );
          return;
        }

        this.savingInfo = true;

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingInfo = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
              // Update compliance status
              if (result.complianceStatus) {
                this.complianceStatus = result.complianceStatus;
              }
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.savingInfo = false;
          })
          .saveSessionAttendance(
            this.selectedRecord.id_number,
            this.sessionAttendance,
            this.sessionRemarks,
            this.getSessionData(),
          );
      },

      saveAdditionalInfo(confirmed = false) {
        if (!this.selectedRecord) {
          this.showSnackbar("No record selected", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Additional Information?",
              message: "This will update the beneficiary's additional information.",
            },
            () => this.saveAdditionalInfo(true),
          );
          return;
        }

        this.savingInfo = true;

        const data = {
          idNumber: this.selectedRecord.id_number,
          ...this.additionalInfo,
        };

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingInfo = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.viewRecordDialog = false;
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.savingInfo = false;
          })
          .saveEnrolledInfo(data, this.getSessionData());
      },

      saveGranteeInfo(confirmed = false) {
        if (!this.selectedRecord) {
          this.showSnackbar("No record selected", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Grantee Information?",
              message: "This will update the beneficiary's authorized grantee details.",
            },
            () => this.saveGranteeInfo(true),
          );
          return;
        }

        this.savingInfo = true;

        const data = {
          idNumber: this.selectedRecord.id_number,
          authorizedGrantee: this.additionalInfo.authorizedGrantee,
          granteeRelationship: this.additionalInfo.granteeRelationship,
          granteeContactNumber: this.additionalInfo.granteeContactNumber,
          granteeAddress: this.additionalInfo.granteeAddress,
          authorizedGrantee2: this.additionalInfo.authorizedGrantee2,
          granteeRelationship2: this.additionalInfo.granteeRelationship2,
          granteeContactNumber2: this.additionalInfo.granteeContactNumber2,
          granteeAddress2: this.additionalInfo.granteeAddress2,
        };

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingInfo = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.savingInfo = false;
          })
          .saveEnrolledInfo(data, this.getSessionData());
      },

      openAddIncomeDialog() {
        this.newIncome = {
          personName: "",
          relationship: "",
          incomeSource: "",
          incomeSourceSpecify: "",
          incomeAmount: "",
        };
        this.addIncomeDialog = true;
      },

      addIncomeToList() {
        if (!this.$refs.incomeForm.validate()) {
          this.showSnackbar("Please fill all required fields", "error");
          return;
        }

        this.additionalInfo.incomeData.push({ ...this.newIncome });
        this.addIncomeDialog = false;
        this.showSnackbar("Income source added", "success");
      },

      removeIncome(index) {
        this.confirmWriteAction(
          {
            title: "Remove Income Source?",
            message: "This removes the income source from the current beneficiary details before saving.",
            buttonColor: "error",
            confirmIcon: "mdi-delete",
          },
          () => {
            this.additionalInfo.incomeData.splice(index, 1);
            this.showSnackbar("Income source removed", "info");
          },
        );
      },

      calculateCombinedIncome() {
        if (
          !this.additionalInfo.incomeData ||
          this.additionalInfo.incomeData.length === 0
        ) {
          return 0;
        }
        return this.additionalInfo.incomeData.reduce((total, income) => {
          return total + (parseFloat(income.incomeAmount) || 0);
        }, 0);
      },

      formatNumber(num) {
        return parseFloat(num || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      },

      // This is called by the Save button — just opens confirmation
      saveAllChanges() {
        if (!this.selectedRecord) {
          this.showSnackbar("No record selected", "error");
          return;
        }
        this.saveConfirmDialog = true;
      },

      // This is called when user confirms — does the actual saving
      confirmSaveAllChanges() {
        this.saveConfirmDialog = false;
        this.savingInfo = true;
        this.savingAllChanges = true;

        const allData = {
          basicData: {
            id_number: this.selectedRecord.id_number,
            first_name: this.selectedRecord.first_name,
            middle_name: this.selectedRecord.middle_name,
            last_name: this.selectedRecord.last_name,
            date_birth: this.selectedRecord.date_birth,
            civil_status: this.selectedRecord.civil_status,
            contact_number: this.selectedRecord.contact_number,
            region: this.selectedRecord.region,
            province: this.selectedRecord.province,
            municipality_city: this.selectedRecord.municipality_city,
            barangay: this.selectedRecord.barangay,
            has_child: this.selectedRecord.has_child,
            children_number: this.selectedRecord.children_number,
            living_partner: this.selectedRecord.living_partner,
          },
          additionalData: {
            idNumber: this.selectedRecord.id_number,
            ...this.additionalInfo,
          },
        };

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingInfo = false;
            this.savingAllChanges = false;

            if (result.success) {
              this.showSnackbar("All changes saved successfully!", "success");
              this.recordLastSaved = Date.now();
              this.loadEnrolledList(true);
              this.viewRecordDialog = false;
            } else {
              this.showSnackbar("Failed to save: " + result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.savingInfo = false;
            this.savingAllChanges = false;
            this.showSnackbar("Error saving changes: " + error, "error");
          })
          .saveAllEnrolledData(allData, this.getSessionData());
      },

      saveBasicInfo(confirmed = false) {
        if (!this.selectedRecord) {
          this.showSnackbar("No record selected", "error");
          return;
        }
        if (confirmed !== true) {
          this.confirmWriteAction(
            { title: "Save Basic Information?", subtitle: "This will update the beneficiary's personal and contact details." },
            () => this.saveBasicInfo(true),
          );
          return;
        }

        this.savingInfo = true;

        const updateData = {
          id_number: this.selectedRecord.id_number,
          first_name: this.selectedRecord.first_name,
          middle_name: this.selectedRecord.middle_name,
          last_name: this.selectedRecord.last_name,
          date_birth: this.selectedRecord.date_birth,
          civil_status: this.selectedRecord.civil_status,
          contact_number: this.selectedRecord.contact_number,
          region: this.selectedRecord.region,
          province: this.selectedRecord.province,
          municipality_city: this.selectedRecord.municipality_city,
          barangay: this.selectedRecord.barangay,
          has_child: this.selectedRecord.has_child,
          children_number: this.selectedRecord.children_number,
          living_partner: this.selectedRecord.living_partner,
        };

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingInfo = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.loadEnrolledList(true); // Refresh the list
              this.viewRecordDialog = false; // CLOSE THE MODAL
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.savingInfo = false;
          })
          .updateBasicInfo(updateData, this.getSessionData());
      },

      showSnackbar(message, color = "success") {
        this.snackbar.message = message;
        this.snackbar.color = color;
        this.snackbar.show = true;
      },

      getCompleteAddress(record) {
        if (!record) return "";

        const parts = [
          record.barangay,
          record.municipality_city,
          record.province,
          record.region,
        ].filter((part) => part && part !== "" && part !== "undefined");

        return parts.join(", ") || "Address not available";
      },

      // NEW METHODS START HERE
      startDashboardPolling() {
        if (this.dashboardPolling) {
          clearInterval(this.dashboardPolling);
        }

        this.isPolling = true;

        this.dashboardPolling = setInterval(() => {
          if (
            this.currentView === "dashboard" &&
            !this.loading &&
            !document.hidden
          ) {
            this.loadDashboardStats();
          }
        }, this.pollingInterval);
      },

      startEnrolledListPolling() {
        if (this.realtimePolling) clearInterval(this.realtimePolling);
        this.isPolling = true;
        this.realtimePolling = setInterval(() => {
          if (
            this.currentView === "enrolled-list" &&
            !this.loadingEnrolledList &&
            !this.viewRecordDialog &&
            !this.addChildDialog &&
            !this.addIncomeDialog &&
            !document.hidden
          ) {
            this.checkForDataChanges();
          }
        }, this.pollingInterval);
      },

      startSessionsPolling() {
        if (this.realtimePolling) clearInterval(this.realtimePolling);
        this.isPolling = true;
        this.realtimePolling = setInterval(() => {
          if (
            this.currentView === "sessions" &&
            !this.loadingSessions &&
            !this.individualAttendanceDialog &&
            !this.bulkUpdateDialog &&
            !document.hidden
          ) {
            this.checkForSessionChanges();
          }
        }, this.pollingInterval);
      },

      checkForSessionChanges() {
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);

            if (result.success && result.recordCount !== this.lastRecordCount) {
              this.lastRecordCount = result.recordCount;
              this.loadAllSessionAttendance();
              this.showRealtimeIndicator("Sessions updated", "success");
            }
          })
          .withFailureHandler((error) => {
            console.error("Session change check failed:", error);
          })
          .getDataChangeTimestamp(this.getSessionData());
      },

      stopAllPolling() {
        if (this.realtimePolling) {
          clearInterval(this.realtimePolling);
          this.realtimePolling = null;
        }
        if (this.dashboardPolling) {
          clearInterval(this.dashboardPolling);
          this.dashboardPolling = null;
        }
        if (this.sessionTestPolling) {
          clearInterval(this.sessionTestPolling);
          this.sessionTestPolling = null;
        }
        this.isPolling = false;
        this.stopAmvatRecordsPolling();
      },

      startSessionTimeoutWatcher() {
        const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        const WARNING_MS = 25 * 60 * 1000; // warn at 25 minutes

        this.sessionTimeoutInterval = setInterval(() => {
          if (!this.isLoggedIn) return;

          const idle = Date.now() - this.lastActivityTime;

          if (idle >= TIMEOUT_MS) {
            clearInterval(this.sessionTimeoutInterval);
            this.sessionWarningShown = false;
            this.showSnackbar(
              "Session expired due to inactivity. Please log in again.",
              "error",
            );
            setTimeout(() => this.confirmLogout(), 1500);
          } else if (idle >= WARNING_MS && !this.sessionWarningShown) {
            this.sessionWarningShown = true;
            this.showSnackbar(
              "You will be logged out in 5 minutes due to inactivity.",
              "warning",
            );
          } else if (idle < WARNING_MS) {
            this.sessionWarningShown = false;
          }
        }, 30000); // check every 30 seconds
      },

      checkForDataChanges() {
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);

            if (result.success && result.recordCount !== this.lastRecordCount) {
              if (this.lastRecordCount > 0) {
                this.loadEnrolledList(true);
                this.showRealtimeIndicator("New data available", "success");
              }
              this.lastRecordCount = result.recordCount;
              this.showRealtimeIndicator("New data available", "success");
            }
          })
          .withFailureHandler((error) => {
            console.error("Change check failed:", error);
          })
          .getDataChangeTimestamp(this.getSessionData());
      },

      showRealtimeIndicator(message, color = "success") {
        this.showSnackbar(message, color);
      },

      getSessionData() {
        return {
          sessionToken: this.sessionToken,
          user: this.currentUser,
          loginTimestamp: this.loginTimestamp,
        };
      },

      // Session Management Methods
      loadAllSessionAttendance() {
        this.loadingSessions = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.sessionRecords = result.records;
              this.showSnackbar(
                `Loaded ${result.records.length} records`,
                "success",
              );
            } else {
              this.showSnackbar(result.message, "error");
            }
            this.loadingSessions = false;
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error loading sessions: " + error, "error");
            this.loadingSessions;
            this.loadingSessions = false;
          })
          .getAllSessionAttendance(this.getSessionData());
      },

      getProgressColor(percentage) {
        if (percentage >= 80) return "success";
        if (percentage >= 50) return "warning";
        return "error";
      },

      getAverageCompletion() {
        if (this.sessionRecords.length === 0) return 0;
        const total = this.sessionRecords.reduce(
          (sum, record) => sum + record.percentage,
          0,
        );
        return Math.round(total / this.sessionRecords.length);
      },

      toggleAllSessions() {
        if (this.selectedSessions.length === 24) {
          this.selectedSessions = [];
        } else {
          this.selectedSessions = Array.from({ length: 24 }, (_, i) => i + 1);
        }
      },

      toggleSession(s) {
        const idx = this.selectedSessions.indexOf(s);
        if (idx > -1) this.selectedSessions.splice(idx, 1);
        else this.selectedSessions.push(s);
      },

      openBulkUpdateDialog() {
        if (this.selectedBeneficiaries.length === 0) {
          this.showSnackbar(
            "Please select at least one beneficiary",
            "warning",
          );
          return;
        }
        if (this.selectedSessions.length === 0) {
          this.showSnackbar("Please select at least one session", "warning");
          return;
        }
        this.bulkUpdateDialog = true;
      },

      getRecordName(id) {
        const record = this.sessionRecords.find((r) => r.id === id);
        return record ? record.name : id;
      },

      executeBulkUpdate(confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Mark Selected Sessions Present?",
              message: `This will update ${this.selectedBeneficiaries.length} beneficiary record(s) across ${this.selectedSessions.length} selected session(s).`,
            },
            () => this.executeBulkUpdate(true),
          );
          return;
        }
        this.loading = true;

        const updates = this.selectedBeneficiaries.map((id) => {
          const record = this.sessionRecords.find((r) => r.id === id);

          // ONLY include the selected sessions as Present
          const updatedAttendance = {};

          this.selectedSessions.forEach((session) => {
            updatedAttendance[`M${session}`] = "Present";
          });

          return {
            idNumber: id,
            attendance: updatedAttendance, // Only the selected sessions
          };
        });

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loading = false;

            if (result.success) {
              if (result.delistedCount > 0) {
                this.showSnackbar(`${result.message}`, "warning");
              } else {
                this.showSnackbar(result.message, "success");
              }
              this.bulkUpdateDialog = false;
              this.selectedBeneficiaries = [];
              this.selectedSessions = [];
              this.loadAllSessionAttendance();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loading = false;
          })
          .bulkUpdateSessions(updates, this.getSessionData());
      },

      viewIndividualAttendance(record) {
        this.currentIndividualRecord = JSON.parse(JSON.stringify(record));
        // Ensure remarks exist
        if (!this.currentIndividualRecord.remarks) {
          this.currentIndividualRecord.remarks = {};
          for (let i = 1; i <= 24; i++) {
            this.currentIndividualRecord.remarks[`M${i}`] = "";
          }
        }
        // No need for reasonValid object anymore
        this.individualAttendanceDialog = true;
      },

      toggleIndividualSession(sessionNumber) {
        const key = `M${sessionNumber}`;
        const currentStatus = this.currentIndividualRecord.attendance[key];

        // Cycle: null -> Present -> Absent -> Exempted -> null
        if (
          currentStatus === null ||
          currentStatus === "" ||
          currentStatus === undefined
        ) {
          this.currentIndividualRecord.attendance[key] = "Present";
        } else if (currentStatus === "Present") {
          this.currentIndividualRecord.attendance[key] = "Absent";
        } else if (currentStatus === "Absent") {
          this.currentIndividualRecord.attendance[key] = "Exempted";
        } else if (currentStatus === "Exempted") {
          this.currentIndividualRecord.attendance[key] = null;
        }
      },

      getIndividualAttendanceCount() {
        if (!this.currentIndividualRecord) return 0;
        let count = 0;
        for (let i = 1; i <= 24; i++) {
          if (this.currentIndividualRecord.attendance[`M${i}`] === "Present") {
            count++;
          }
        }
        return count;
      },

      clearAllIndividualSessions() {
        this.confirmWriteAction(
          {
            title: "Clear Session Attendance?",
            message: "This will mark all 24 sessions as absent for this beneficiary.",
            buttonColor: "warning",
          },
          () => {
            for (let i = 1; i <= 24; i++) {
              this.currentIndividualRecord.attendance[`M${i}`] = "Absent";
            }
            this.showSnackbar("All sessions cleared", "info");
          },
        );
      },

      markAllIndividualPresent() {
        this.confirmWriteAction(
          {
            title: "Mark All Sessions Present?",
            message: "This will mark all 24 sessions as present for this beneficiary.",
          },
          () => {
            for (let i = 1; i <= 24; i++) {
              this.currentIndividualRecord.attendance[`M${i}`] = "Present";
            }
            this.showSnackbar("All sessions marked present", "success");
          },
        );
      },

      saveIndividualAttendance(confirmed = false) {
        if (!this.currentIndividualRecord) {
          this.showSnackbar("No record selected", "error");
          return;
        }

        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Attendance Changes?",
              message: "This will update the selected beneficiary's session attendance.",
            },
            () => this.saveIndividualAttendance(true),
          );
          return;
        }

        this.savingInfo = true;

        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingInfo = false;

            if (result.success) {
              this.showSnackbar(result.message, "success");
              // Update compliance status in the list
              if (result.complianceStatus) {
                const record = this.sessionRecords.find(
                  (r) => r.id === this.currentIndividualRecord.id,
                );
                if (record) {
                  record.complianceStatus = result.complianceStatus;
                }
              }
              this.individualAttendanceDialog = false;
              this.loadAllSessionAttendance();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.savingInfo = false;
          })
          .saveSessionAttendance(
            this.currentIndividualRecord.id,
            this.currentIndividualRecord.attendance,
            this.currentIndividualRecord.remarks,
            this.getSessionData(),
          );
      },

      getSessionColor(status) {
        if (status === "Present") return "success";
        if (status === "Absent") return "error";
        if (status === "Exempted") return "info";
        return "grey-lighten-3";
      },

      getSessionIcon(status) {
        if (status === "Present") return "mdi-emoticon-happy";
        if (status === "Absent") return "mdi-emoticon-sad";
        if (status === "Exempted") return "mdi-shield-check";
        return "mdi-help-circle-outline";
      },

      getSessionIconColor(status) {
        if (status === "Present") return "white";
        if (status === "Absent") return "white";
        if (status === "Exempted") return "white";
        return "grey";
      },

      getSessionTextColor(status) {
        if (
          status === "Present" ||
          status === "Absent" ||
          status === "Exempted"
        )
          return "white";
        return "grey";
      },

      getSessionLabel(status) {
        if (status === "Present") return "Present";
        if (status === "Absent") return "Absent";
        if (status === "Exempted") return "Exempted";
        return "Not Tracked";
      },

      getChipColor(status) {
        if (status === "Present") return "success";
        if (status === "Absent") return "error";
        if (status === "Exempted") return "info";
        return "grey-lighten-2";
      },

      getComplianceColor(status) {
        if (!status) return "grey-lighten-2";
        if (status.includes("Compliant") && !status.includes("Non"))
          return "success";
        if (status.includes("First Non-Compliant")) return "warning";
        if (status.includes("Second Non-Compliant")) return "orange";
        if (status.includes("Third Non-Compliant")) return "deep-orange";
        if (status.includes("Fourth Non-Compliant")) return "error";
        if (status.includes("DELISTED")) return "error";
        return "grey-lighten-2";
      },

      getComplianceIcon(status) {
        if (!status) return "mdi-help-circle-outline";
        if (status.includes("Compliant") && !status.includes("Non"))
          return "mdi-check-circle";
        if (status.includes("First Non-Compliant"))
          return "mdi-alert-circle-outline";
        if (status.includes("Second Non-Compliant")) return "mdi-alert";
        if (status.includes("Third Non-Compliant")) return "mdi-alert-octagon";
        if (status.includes("Fourth Non-Compliant")) return "mdi-close-octagon";
        if (status.includes("DELISTED")) return "mdi-account-remove";
        return "mdi-help-circle-outline";
      },

      getSessionScoreColor(pre, post) {
        if (pre === null || pre === "" || post === null || post === "")
          return "#9e9e9e";
        const diff = parseFloat(post) - parseFloat(pre);
        if (diff > 0) return "#2e7d32"; // green - improved
        if (diff < 0) return "#c62828"; // red   - declined
        return "#f57c00"; // orange - no change
      },

      getSessionScoreIcon(pre, post) {
        if (pre === null || pre === "" || post === null || post === "")
          return "mdi-minus";
        const diff = parseFloat(post) - parseFloat(pre);
        if (diff > 0) return "mdi-trending-up";
        if (diff < 0) return "mdi-trending-down";
        return "mdi-trending-neutral";
      },

      getScoreBadgeColor(score) {
        if (score === null || score === "") return "grey";
        const s = parseFloat(score);
        if (s >= 4) return "success";
        if (s >= 3) return "warning";
        return "error";
      },

      getScoreLabel(score) {
        if (score === null || score === "") return "—";
        const s = parseFloat(score);
        if (s === 5) return "Excellent";
        if (s === 4) return "Good";
        if (s === 3) return "Average";
        if (s >= 2) return "Below Avg";
        return "Poor";
      },

      loadHealthcareRecords() {
        this.loadingHealthcareRecords = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingHealthcareRecords = false;
            if (result.success) {
              this.healthcareRecords = result.records || [];
            } else {
              this.showSnackbar("Error loading healthcare records", "error");
            }
          })
          .withFailureHandler((err) => {
            this.loadingHealthcareRecords = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .getHealthcareRecords(this.getSessionData());
      },

      loadComplianceAnalytics() {
        this.loadingComplianceAnalytics = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingComplianceAnalytics = false;
            if (result.success) {
              this.complianceAnalytics = result;
            } else {
              this.showSnackbar(result.message || "Error loading compliance analytics", "error");
            }
          })
          .withFailureHandler((err) => {
            this.loadingComplianceAnalytics = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .getComplianceAnalytics(this.complianceRegionFilter, this.getSessionData());
      },

      complianceStatusPercent(count) {
        const total = this.complianceAnalytics?.sessions?.total || 0;
        if (!total) return 0;
        return Math.round((count / total) * 100);
      },

      healthcarePercent(count) {
        const total = this.complianceAnalytics?.healthcare?.total || 0;
        if (!total) return 0;
        return Math.round((count / total) * 100);
      },

      loadExitRecords() {
        this.loadingExitRecords = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingExitRecords = false;
            if (result.success) {
              this.exitRecords = result.records || [];
            } else {
              this.showSnackbar(result.message || "Error loading exit records", "error");
            }
          })
          .withFailureHandler((err) => {
            this.loadingExitRecords = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .getExitRecords(this.exitRegionFilter, this.getSessionData());
      },

      loadEducationMonitoringRecords() {
        this.loadingEducationRecords = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingEducationRecords = false;
            if (result.success) {
              this.educationRecords = result.records || [];
            } else {
              this.showSnackbar(result.message || "Error loading education monitoring", "error");
            }
          })
          .withFailureHandler((err) => {
            this.loadingEducationRecords = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .getEducationMonitoringRecords(this.educationMonth, this.educationRegionFilter, this.getSessionData());
      },

      openEducationDialog(record) {
        this.educationEditRecord = record;
        this.educationEditData = {
          ...record,
          month: this.educationMonth,
          schoolName: record.schoolName || "",
          educationType: record.educationType || "",
          daysAttended: record.daysAttended || "",
          teacherSignatureDate: record.teacherSignatureDate || "",
          returnCommitment: !!record.returnCommitment,
          caseWorkerConfirmed: !!record.caseWorkerConfirmed,
          status: record.status || "Not Yet Tracked",
          notes: record.notes || "",
        };
        this.educationDialog = true;
      },

      saveEducationMonitoringRecord(confirmed = false) {
        if (!this.educationEditData.idNumber) return;
        if (confirmed !== true) {
          this.requestActionConfirm(
            {
              title: "Save Education Monitoring?",
              subtitle: "Monthly booklet compliance",
              message: "This will update the beneficiary's education attendance monitoring record for the selected month.",
              confirmText: "Save Education",
              confirmIcon: "mdi-content-save",
            },
            () => this.saveEducationMonitoringRecord(true),
          );
          return;
        }
        this.savingEducation = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingEducation = false;
            if (result.success) {
              this.showSnackbar(result.message || "Education monitoring saved.", "success");
              this.educationDialog = false;
              this.loadEducationMonitoringRecords();
              this.loadComplianceAnalytics();
            } else {
              this.showSnackbar(result.message || "Failed to save education monitoring.", "error");
            }
          })
          .withFailureHandler((err) => {
            this.savingEducation = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .saveEducationMonitoringRecord(this.educationEditData, this.getSessionData());
      },

      loadBookletComplianceRecords() {
        this.loadingBookletComplianceRecords = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.loadingBookletComplianceRecords = false;
            if (result.success) {
              this.bookletComplianceRecords = result.records || [];
            } else {
              this.showSnackbar(result.message || "Error loading booklet compliance", "error");
            }
          })
          .withFailureHandler((err) => {
            this.loadingBookletComplianceRecords = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .getBookletComplianceRecords(this.bookletComplianceMonth, this.bookletComplianceRegionFilter, this.getSessionData());
      },

      openBookletComplianceDialog(record) {
        this.bookletComplianceEditRecord = record;
        this.bookletComplianceEditData = {
          ...record,
          month: this.bookletComplianceMonth,
          hats: !!record.hats,
          medicalCertificate: !!record.medicalCertificate,
          pregnancyTest: !!record.pregnancyTest,
          certificateEnrollment: !!record.certificateEnrollment,
          bookletSignedByAdvisor: !!record.bookletSignedByAdvisor,
          certificateAttendance: !!record.certificateAttendance,
          beneficiarySignature: !!record.beneficiarySignature,
          socialWorkerSignature: !!record.socialWorkerSignature,
          verificationStatus: record.verificationStatus || "Not Yet Tracked",
          observations: record.observations || "",
        };
        this.bookletComplianceDialog = true;
      },

      getBookletComplianceStatus(record) {
        const required = [
          "hats",
          "medicalCertificate",
          "pregnancyTest",
          "certificateEnrollment",
          "bookletSignedByAdvisor",
          "certificateAttendance",
          "beneficiarySignature",
          "socialWorkerSignature",
        ];
        const marked = required.filter((key) => !!record[key]).length;
        if (marked === required.length) return "Complete";
        if (marked > 0 || record.verificationStatus !== "Not Yet Tracked") return "Incomplete";
        return "Not Yet Tracked";
      },

      getBookletComplianceProgress(record) {
        const required = [
          "hats",
          "medicalCertificate",
          "pregnancyTest",
          "certificateEnrollment",
          "bookletSignedByAdvisor",
          "certificateAttendance",
          "beneficiarySignature",
          "socialWorkerSignature",
        ];
        return required.filter((key) => !!record[key]).length;
      },

      saveBookletComplianceRecord(confirmed = false) {
        if (!this.bookletComplianceEditData.idNumber) return;
        if (confirmed !== true) {
          this.requestActionConfirm(
            {
              title: "Save Booklet Compliance?",
              subtitle: "Monthly document verification",
              message: "This will update the beneficiary's monthly booklet checklist and compliance verification record.",
              confirmText: "Save Compliance",
              confirmIcon: "mdi-content-save",
            },
            () => this.saveBookletComplianceRecord(true),
          );
          return;
        }
        this.savingBookletCompliance = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingBookletCompliance = false;
            if (result.success) {
              this.showSnackbar(result.message || "Booklet compliance saved.", "success");
              this.bookletComplianceDialog = false;
              this.loadBookletComplianceRecords();
              this.loadComplianceAnalytics();
            } else {
              this.showSnackbar(result.message || "Failed to save booklet compliance.", "error");
            }
          })
          .withFailureHandler((err) => {
            this.savingBookletCompliance = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .saveBookletComplianceRecord(this.bookletComplianceEditData, this.getSessionData());
      },


      openExitDialog(beneficiary) {
        this.exitForm = {
          idNumber: beneficiary ? beneficiary.id_number : "",
          beneficiaryName: beneficiary ? beneficiary.full_name : "",
          exitType: null,
          reason: "",
        };
        this.showExitDialog = true;
      },

      onExitBeneficiarySelected(idNumber) {
        const match = this.exitBeneficiaryOptions.find((o) => o.value === idNumber);
        this.exitForm.beneficiaryName = match ? match.name : "";
      },

      submitBeneficiaryExit(confirmed = false) {
        if (!this.exitForm.idNumber || !this.exitForm.exitType) {
          this.showSnackbar("Beneficiary and exit type are required.", "error");
          return;
        }

        if (confirmed !== true) {
          const name = this.exitForm.beneficiaryName || "this beneficiary";
          const severityColor =
            this.exitForm.exitType === "Graduation"
              ? { color: "linear-gradient(135deg,#16a34a 0%,#15803d 100%)", buttonColor: "#16a34a" }
              : this.exitForm.exitType === "Voluntary Exit"
              ? { color: "linear-gradient(135deg,#d97706 0%,#b45309 100%)", buttonColor: "#d97706" }
              : { color: "linear-gradient(135deg,#dc2626 0%,#991b1b 100%)", buttonColor: "#dc2626" };
          this.confirmWriteAction(
            {
              title: `Confirm ${this.exitForm.exitType}?`,
              subtitle: `This will mark ${name} as "${this.exitForm.exitType}" and remove them from the active program roster. This action affects grant eligibility going forward.`,
              icon: "mdi-account-remove-outline",
              confirmText: `Yes, Record ${this.exitForm.exitType}`,
              ...severityColor,
            },
            () => this.submitBeneficiaryExit(true),
          );
          return;
        }

        this.savingExit = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingExit = false;
            if (result.success) {
              this.showSnackbar(result.message, "success");
              this.showExitDialog = false;
              this.loadExitRecords();
            } else {
              this.showSnackbar(result.message, "error");
            }
          })
          .withFailureHandler((err) => {
            this.savingExit = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .recordBeneficiaryExit(this.exitForm, this.getSessionData());
      },

      openHealthcareDialog(record) {
        this.healthcareEditRecord = record;
        this.hcDialogActiveVisit = 1;
        this.healthcareEditData = {
          visit1_nanay_attended: record.visit1_nanay_attended || false,
          visit1_nanay_date: record.visit1_nanay_date || record.visit1_date || "",
          visit1_nanay_practitioner: record.visit1_nanay_practitioner || record.visit1_practitioner || "",
          visit1_anak_attended: record.visit1_anak_attended || false,
          visit1_anak_date: record.visit1_anak_date || record.visit1_date || "",
          visit1_anak_practitioner: record.visit1_anak_practitioner || record.visit1_practitioner || "",
          visit2_nanay_attended: record.visit2_nanay_attended || false,
          visit2_nanay_date: record.visit2_nanay_date || record.visit2_date || "",
          visit2_nanay_practitioner: record.visit2_nanay_practitioner || record.visit2_practitioner || "",
          visit2_anak_attended: record.visit2_anak_attended || false,
          visit2_anak_date: record.visit2_anak_date || record.visit2_date || "",
          visit2_anak_practitioner: record.visit2_anak_practitioner || record.visit2_practitioner || "",
          visit3_nanay_attended: record.visit3_nanay_attended || false,
          visit3_nanay_date: record.visit3_nanay_date || record.visit3_date || "",
          visit3_nanay_practitioner: record.visit3_nanay_practitioner || record.visit3_practitioner || "",
          visit3_anak_attended: record.visit3_anak_attended || false,
          visit3_anak_date: record.visit3_anak_date || record.visit3_date || "",
          visit3_anak_practitioner: record.visit3_anak_practitioner || record.visit3_practitioner || "",
          visit4_nanay_attended: record.visit4_nanay_attended || false,
          visit4_nanay_date: record.visit4_nanay_date || record.visit4_date || "",
          visit4_nanay_practitioner: record.visit4_nanay_practitioner || record.visit4_practitioner || "",
          visit4_anak_attended: record.visit4_anak_attended || false,
          visit4_anak_date: record.visit4_anak_date || record.visit4_date || "",
          visit4_anak_practitioner: record.visit4_anak_practitioner || record.visit4_practitioner || "",
        };
        this.healthcareDialog = true;
      },

      saveHealthcareRecord(confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Healthcare Record?",
              message: "This will update the beneficiary healthcare monitoring record.",
            },
            () => this.saveHealthcareRecord(true),
          );
          return;
        }
        this.savingHealthcare = true;
        const payload = {
          id_number: this.healthcareEditRecord.id_number,
          ...this.healthcareEditData,
        };
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingHealthcare = false;
            if (result.success) {
              this.showSnackbar("Healthcare record saved!", "success");
              this.healthcareDialog = false;
              this.loadHealthcareRecords();
            } else {
              this.showSnackbar(result.message || "Error saving", "error");
            }
          })
          .withFailureHandler((err) => {
            this.savingHealthcare = false;
            this.showSnackbar("Error: " + err, "error");
          })
          .saveHealthcareRecord(payload, this.getSessionData());
      },

      getHealthcareCompletion(r) {
        let count = 0;
        for (let v = 1; v <= 4; v++) {
          if (r['visit'+v+'_nanay_attended'] || r['visit'+v+'_anak_attended']) count++;
        }
        return count;
      },

      // PAYOUTS
      loadPayoutRecords() {
        this.loadingPayouts = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.payoutRecords = result.records;
            } else {
              this.showSnackbar(
                result.message || "Failed to load payouts",
                "error",
              );
            }
            this.loadingPayouts = false;
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loadingPayouts = false;
          })
          .getPayoutRecords(this.getSessionData());
      },

      openPayoutDialog(item) {
        if (item) {
          this.editingPayout = item;
          this.payoutFormData = { ...item };
        } else {
          this.editingPayout = null;
          this.payoutFormData = {
            id_number: "",
            grantee_name: "",
            amount: "",
            quarter: 1,
            year: 1,
            status: "Pending",
            release_date: "",
            notes: "",
          };
        }
        this.payoutDialog = true;
      },

      onPayoutBeneficiarySelect(idNumber) {
        const record = this.enrolledList.find((r) => r.id_number === idNumber);
        if (record) {
          this.payoutFormData.name = record.full_name;
        }
        this.payoutFormData.grantee_name = "";
      },

      savePayout(confirmed = false) {
        if (!this.$refs.payoutForm.validate()) {
          this.showSnackbar("Please fill all required fields", "error");
          return;
        }
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: this.editingPayout ? "Update Payout?" : "Save Payout?",
              message: this.editingPayout
                ? "This will update the selected payout record."
                : "This will create a new payout record.",
            },
            () => this.savePayout(true),
          );
          return;
        }
        this.savingPayout = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingPayout = false;
            if (result.success) {
              this.showSnackbar(result.message || "Payout saved!", "success");
              this.payoutDialog = false;
              this.loadPayoutRecords();
            } else {
              this.showSnackbar(
                result.message || "Failed to save payout",
                "error",
              );
            }
          })
          .withFailureHandler((error) => {
            this.savingPayout = false;
            this.showSnackbar("Error: " + error, "error");
          })
          .savePayout(
            {
              ...this.payoutFormData,
              payout_id: this.editingPayout?.payout_id || null,
            },
            this.getSessionData(),
          );
      },

      markPayoutReleased(item, confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Mark Payout Released?",
              message: `This will mark the payout for ${item.name} as Released.`,
            },
            () => this.markPayoutReleased(item, true),
          );
          return;
        }
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.showSnackbar("Payout marked as Released", "success");
              this.loadPayoutRecords();
            } else {
              this.showSnackbar(result.message || "Failed to update", "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
          })
          .savePayout(
            {
              ...item,
              status: "Released",
              release_date: new Date().toISOString().split("T")[0],
            },
            this.getSessionData(),
          );
      },

      getPayoutStatusColor(status) {
        return (
          {
            Released: "success",
            Pending: "warning",
            Unclaimed: "error",
            "On-Hold": "grey",
          }[status] || "grey-lighten-2"
        );
      },

      getPayoutStatusIcon(status) {
        return (
          {
            Released: "mdi-check-circle",
            Pending: "mdi-clock-outline",
            Unclaimed: "mdi-alert-circle",
            "On-Hold": "mdi-pause-circle",
          }[status] || "mdi-circle-outline"
        );
      },

      // GRANTEES
      normalizeRegionCode(value) {
        return String(value || "")
          .replace(/^region\s+/i, "")
          .trim()
          .toUpperCase();
      },

      getGranteeRecordRegion(record) {
        const directRegion = record?.region || record?.region_code || record?.regionCode;
        if (directRegion) return this.normalizeRegionCode(directRegion);

        const beneficiary = (this.enrolledList || []).find(
          (item) =>
            String(item.id_number || item.idNumber || "") ===
            String(record?.id_number || ""),
        );

        return this.normalizeRegionCode(
          beneficiary?.region || beneficiary?.region_code || beneficiary?.regionCode,
        );
      },

      firstValue(...values) {
        const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
        return found === undefined ? "" : found;
      },

      normalizeGranteeRecord(record) {
        const normalized = { ...(record || {}) };

        normalized.id_number = this.firstValue(
          normalized.id_number,
          normalized.idNumber,
          normalized["ID Number"],
        );
        normalized.name = this.firstValue(
          normalized.name,
          normalized.beneficiary_name,
          normalized.beneficiaryName,
          normalized["Beneficiary Full Name"],
        );
        normalized.grantee_name = this.firstValue(
          normalized.grantee_name,
          normalized.authorizedGrantee,
          normalized.first_authorized_grantee,
          normalized["First Authorized Grantee"],
        );
        normalized.relationship = this.firstValue(
          normalized.relationship,
          normalized.granteeRelationship,
          normalized.first_authorized_grantee_relationship,
          normalized["First Authorized Grantee Relationship"],
        );
        normalized.contact = this.firstValue(
          normalized.contact,
          normalized.granteeContactNumber,
          normalized.first_authorized_grantee_contact_number,
          normalized["First Authorized Grantee Contact Number"],
        );
        normalized.grantee_address = this.firstValue(
          normalized.grantee_address,
          normalized.granteeAddress,
          normalized.first_authorized_grantee_address,
          normalized["First Authorized Grantee Address"],
        );
        normalized.grantee2_name = this.firstValue(
          normalized.grantee2_name,
          normalized.authorizedGrantee2,
          normalized.second_authorized_grantee,
          normalized["Second Authorized Grantee"],
        );
        normalized.relationship2 = this.firstValue(
          normalized.relationship2,
          normalized.grantee2_relationship,
          normalized.granteeRelationship2,
          normalized.second_authorized_grantee_relationship,
          normalized["Second Authorized Grantee Relationship"],
        );
        normalized.contact2 = this.firstValue(
          normalized.contact2,
          normalized.grantee2_contact,
          normalized.granteeContactNumber2,
          normalized.second_authorized_grantee_contact_number,
          normalized["Second Authorized Grantee Contact Number"],
        );
        normalized.grantee2_address = this.firstValue(
          normalized.grantee2_address,
          normalized.granteeAddress2,
          normalized.second_authorized_grantee_address,
          normalized["Second Authorized Grantee Address"],
        );
        normalized.timestamp = this.firstValue(
          normalized.timestamp,
          normalized.lastUpdated,
          normalized.last_updated,
          normalized.updatedAt,
          normalized["Last Updated"],
        );
        normalized.updated_by = this.firstValue(
          normalized.updated_by,
          normalized.updatedBy,
          normalized["Updated By"],
        );

        return normalized;
      },

      loadGranteeRecords() {
        this.loadingGrantees = true;
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.granteeRecords = (result.records || []).map((record) =>
                this.normalizeGranteeRecord(record),
              );
            } else {
              this.showSnackbar(
                result.message || "Failed to load grantees",
                "error",
              );
            }
            this.loadingGrantees = false;
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
            this.loadingGrantees = false;
          })
          .getGranteeRecords(this.getSessionData());
      },

      openGranteeDialog(item) {
        if (!item) return; // No adding from this module
        this.granteeViewDialog = false;
        this.granteeViewRecord = null;
        this.editingGrantee = item;
        this.granteeFormData = {
          id_number: item.id_number,
          name: item.name || "",
          grantee_name: item.grantee_name || "",
          relationship: item.relationship || "",
          contact: item.contact || "",
          grantee_address: item.grantee_address || "",
          grantee2_name: item.grantee2_name || "",
          relationship2: item.relationship2 || item.grantee2_relationship || "",
          contact2: item.contact2 || item.grantee2_contact || "",
          grantee2_address: item.grantee2_address || "",
          slot: item.slot || "Primary",
        };
        this.granteeDialog = true;
      },

      openGranteeViewDialog(item) {
        this.granteeDialog = false;
        this.editingGrantee = null;
        this.granteeViewRecord = item;
        this.granteeViewDialog = true;
      },

      saveGrantee(confirmed = false) {
        if (!this.granteeFormData.grantee_name || !this.granteeFormData.relationship) {
          this.showSnackbar("Please complete the primary grantee name and relationship.", "error");
          return;
        }
        if (this.granteeFormData.grantee2_name && !this.granteeFormData.relationship2) {
          this.showSnackbar("Please select the secondary grantee relationship.", "error");
          return;
        }
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Save Grantee Changes?",
              message: "This will update the authorized grantee details.",
            },
            () => this.saveGrantee(true),
          );
          return;
        }
        this.savingGrantee = true;
        const payload = {
          idNumber: this.granteeFormData.id_number,
          authorizedGrantee: this.granteeFormData.grantee_name,
          granteeRelationship: this.granteeFormData.relationship,
          granteeContactNumber: this.granteeFormData.contact,
          granteeAddress: this.granteeFormData.grantee_address,
          authorizedGrantee2: this.granteeFormData.grantee2_name,
          granteeRelationship2: this.granteeFormData.relationship2,
          granteeContactNumber2: this.granteeFormData.contact2,
          granteeAddress2: this.granteeFormData.grantee2_address,
        };
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            this.savingGrantee = false;
            if (result.success) {
              this.showSnackbar(result.message || "Grantee saved!", "success");
              this.granteeDialog = false;
              this.loadGranteeRecords();
            } else {
              this.showSnackbar(
                result.message || "Failed to save grantee",
                "error",
              );
            }
          })
          .withFailureHandler((error) => {
            this.savingGrantee = false;
            this.showSnackbar("Error: " + error, "error");
          })
          .saveEnrolledInfo(payload, this.getSessionData());
      },

      deleteGrantee(item, confirmed = false) {
        if (confirmed !== true) {
          this.confirmWriteAction(
            {
              title: "Remove Grantee?",
              message: `This will remove ${item.grantee_name} from ${item.name}'s grantee record.`,
              buttonColor: "error",
              confirmIcon: "mdi-delete",
              confirmText: "Yes, Remove",
            },
            () => this.deleteGrantee(item, true),
          );
          return;
        }
        google.script.run
          .withSuccessHandler((response) => {
            const result = JSON.parse(response);
            if (result.success) {
              this.showSnackbar("Grantee removed", "success");
              this.loadGranteeRecords();
            } else {
              this.showSnackbar(result.message || "Failed to delete", "error");
            }
          })
          .withFailureHandler((error) => {
            this.showSnackbar("Error: " + error, "error");
          })
          .deleteGrantee(
            item.id_number,
            item.grantee_name,
            this.getSessionData(),
          );
      },
    },
  })
    .use(vuetify)
    .mount("#app");
