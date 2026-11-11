// --- 0. State Variables & Initialization ---
        function logDiagnostic(level, event, details = {}) {
            const logMethod = console[level] || console.log;
            logMethod(`[DaManag] ${event}`, details);
        }

        function redactApiKey(message) {
            return GEMINI_API_KEY && message ? message.split(GEMINI_API_KEY).join('[redacted]') : message;
        }

        let GEMINI_API_KEY = localStorage.getItem('ai_health_gemini_key') || '';
        let aiPersonality = localStorage.getItem('ai_health_personality') || '';

        function applyScreenSizeClass() {
            const width = window.innerWidth;
            document.body.classList.remove('screen-ss', 'screen-s', 'screen-m', 'screen-l', 'screen-xl');

            if (width <= 360) {
                document.body.classList.add('screen-ss');
            } else if (width <= 640) {
                document.body.classList.add('screen-s');
            } else if (width <= 960) {
                document.body.classList.add('screen-m');
            } else if (width <= 1280) {
                document.body.classList.add('screen-l');
            } else {
                document.body.classList.add('screen-xl');
            }
        }

        applyScreenSizeClass();
        window.addEventListener('resize', applyScreenSizeClass);

        const defaultScale = getComputedStyle(document.body).getPropertyValue('--page-ui-scale').trim() || '1';
        const defaultFontSize = getComputedStyle(document.body).getPropertyValue('--page-base-font-size').trim() || '14px';

        let currentScale = localStorage.getItem('ai_health_ui_scale') || defaultScale;
        let currentFontSize = localStorage.getItem('ai_health_font_size') || defaultFontSize.replace('px', '');
        let currentTheme = localStorage.getItem('ai_health_theme') || 'dark';
        
        let userHeight = localStorage.getItem('ai_health_height') || '';
        let userAge = localStorage.getItem('ai_health_age') || '';
        let userWeight = localStorage.getItem('ai_health_weight') || '';
        let userConditions = localStorage.getItem('ai_health_conditions') || '';
        let userEquipment = localStorage.getItem('ai_health_equipment') || '';
        let userPreferredName = localStorage.getItem('ai_health_preferred_name') || localStorage.getItem('ai_health_username') || '';
        let userName = userPreferredName;
        if (userPreferredName) {
            localStorage.setItem('ai_health_preferred_name', userPreferredName);
            localStorage.setItem('ai_health_username', userPreferredName);
        } else {
            localStorage.removeItem('ai_health_preferred_name');
            localStorage.removeItem('ai_health_username');
        }
        let welcomeCardsEnabled = localStorage.getItem('ai_health_welcome_cards_enabled') !== 'false';
        
        // New Schedule State Variables
        let userScheduleType = localStorage.getItem('ai_health_schedule_type') || '';
        let userScheduleStart = localStorage.getItem('ai_health_schedule_start') || '';
        let userScheduleEnd = localStorage.getItem('ai_health_schedule_end') || '';
        let userTimezone = localStorage.getItem('ai_health_timezone') || '';

        // Planner Tables array structure: [{ id, title, tableHtml, archived }]
        let plannerTables = JSON.parse(localStorage.getItem('ai_health_planner_tables')) || [];

        // Apply visual settings on load
        document.documentElement.style.setProperty('--ui-scale', currentScale);
        document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
        
        if (currentTheme === 'light') {
            document.body.classList.add('light-mode');
        }

        // Hydrate DOM inputs
        document.getElementById('ui-scale-input').value = currentScale;
        document.getElementById('font-size-input').value = currentFontSize;
        document.getElementById('font-size-display').textContent = currentFontSize + 'px';
        document.getElementById('ui-theme-select').value = currentTheme;
        
        if (GEMINI_API_KEY) document.getElementById('api-key-input').value = GEMINI_API_KEY;
        if (aiPersonality) document.getElementById('ai-personality-input').value = aiPersonality;
        if (userHeight) document.getElementById('user-height').value = userHeight;
        if (userAge) document.getElementById('user-age').value = userAge;
        if (userWeight) document.getElementById('user-weight').value = userWeight;
        if (userConditions) document.getElementById('user-conditions').value = userConditions;
        if (userPreferredName) document.getElementById('user-preferred-name').value = userPreferredName;
        if (userEquipment) document.getElementById('user-equipment').value = userEquipment;
        document.getElementById('welcome-card-enabled').checked = welcomeCardsEnabled;
        
        // Hydrate new schedule inputs
        const scheduleTypeInput = document.getElementById('user-schedule-type');
        const scheduleContainer = document.getElementById('schedule-details-container');
        const tzInput = document.getElementById('user-timezone');

        if (userScheduleType) scheduleTypeInput.value = userScheduleType;
        if (userScheduleStart) document.getElementById('user-schedule-start').value = userScheduleStart;
        if (userScheduleEnd) document.getElementById('user-schedule-end').value = userScheduleEnd;
        
        // Auto-detect timezone if not set, otherwise load from storage
        if (userTimezone) {
            tzInput.value = userTimezone;
        } else {
            try {
                tzInput.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch(e) { /* ignore if browser doesn't support it */ }
        }

        // Toggle Schedule expansion logic
        function handleScheduleVisibility() {
            if (scheduleTypeInput.value.trim() !== '') {
                scheduleContainer.style.display = 'grid';
            } else {
                scheduleContainer.style.display = 'none';
            }
        }
        scheduleTypeInput.addEventListener('input', handleScheduleVisibility);
        handleScheduleVisibility(); // Run on init

        // Dynamic Font Size text updater
        document.getElementById('font-size-input').addEventListener('input', (e) => {
            document.getElementById('font-size-display').textContent = e.target.value + 'px';
        });

        const chatInput = document.getElementById('chat-input');
        const chatComposer = document.getElementById('chat-composer');
        const chatSendButton = document.getElementById('chat-send-btn');
        const chatDisplay = document.getElementById('chat-display');
        const welcomeCard = document.getElementById('welcome-card');
        const welcomePromptText = document.getElementById('welcome-prompt-text');
        const welcomeInputWrapper = document.getElementById('welcome-input-wrapper');
        const bottomInputArea = document.getElementById('bottom-input-area');

        const welcomePrompts = [
            "What can i assist you with?",
            "Welcome back",
            "How can i help you ?",
            
        ];
        let lastWelcomePrompt = null;

        function getLocalDateKey() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        const loginState = JSON.parse(localStorage.getItem('ai_health_daily_login')) || { date: '', count: 0 };
        const localDate = getLocalDateKey();
        const sameDayLoginCount = loginState.date === localDate ? loginState.count + 1 : 1;
        localStorage.setItem('ai_health_daily_login', JSON.stringify({ date: localDate, count: sameDayLoginCount }));

        function getRandomWelcomePrompt() {
            if (sameDayLoginCount >= 2 && Math.random() < (1 / 3)) {
                const repeatedLoginPrompts = [
                    "Glad to see you back",
                    userName ? `Welcome back, ${userName}` : "Welcome back",
                    userName ? `How shall i help, ${userName}?` : "How shall i help?"
                ];
                return repeatedLoginPrompts[Math.floor(Math.random() * repeatedLoginPrompts.length)];
            }

            const availablePrompts = welcomePrompts.filter(prompt => prompt !== lastWelcomePrompt);
            const selected = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
            lastWelcomePrompt = selected;
            return selected;
        }

        function renderWelcomeCard() {
            const prompt = getRandomWelcomePrompt();
            welcomePromptText.textContent = prompt;
        }

        function showWelcomeCard(show) {
            if (show && welcomeCardsEnabled) {
                welcomeCard.classList.remove('hidden');
                bottomInputArea.style.display = 'none';
                welcomeInputWrapper.appendChild(chatComposer);
                renderWelcomeCard();
                chatInput.placeholder = "Start by typing your first question...";
            } else {
                welcomeCard.classList.add('hidden');
                bottomInputArea.style.display = 'block';
                bottomInputArea.appendChild(chatComposer);
                updateInputState();
            }
        }

        showWelcomeCard(true);

        function updateInputState() {
            if (!GEMINI_API_KEY) {
                chatInput.disabled = true;
                chatSendButton.disabled = true;
                chatInput.value = '';
                chatInput.placeholder = "Please enter Gemini API key in Settings";
            } else {
                chatInput.disabled = false;
                chatSendButton.disabled = false;
                chatInput.placeholder = "Ask anything...";
            }
        }

        function invalidateApiKey(errorMessage) {
            logDiagnostic('error', 'Gemini API key rejected; removing saved key.', {
                message: redactApiKey(errorMessage || 'Invalid key')
            });
            GEMINI_API_KEY = '';
            localStorage.removeItem('ai_health_gemini_key');
            document.getElementById('api-key-input').value = '';
            updateInputState();
            appendMessage(`⚠️ API Key Error: ${errorMessage || "Invalid Key"}. Key removed. Please configure a valid API Key in Settings.`, "system");
        }

        // --- Typing Indicator Functions ---
        let typingIndicatorDiv = null;

        function showTypingIndicator() {
            typingIndicatorDiv = document.createElement('div');
            typingIndicatorDiv.classList.add('message', 'ai');
            typingIndicatorDiv.innerHTML = `
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            `;
            chatDisplay.appendChild(typingIndicatorDiv);
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }

        function removeTypingIndicator() {
            if (typingIndicatorDiv && typingIndicatorDiv.parentNode) {
                typingIndicatorDiv.parentNode.removeChild(typingIndicatorDiv);
                typingIndicatorDiv = null;
            }
        }

        // --- Markdown & Table Rendering ---
        const markdownRenderer = typeof window.markdownit === 'function'
            ? window.markdownit({ html: false, breaks: true, linkify: false, typographer: false })
            : null;
        let markdownTableSequence = 0;

        function parseMarkdown(text) {
            if (!text) return '';
            if (!markdownRenderer) {
                logDiagnostic('error', 'Markdown renderer is unavailable; showing escaped plain text.');
                const fallback = document.createElement('div');
                fallback.textContent = text;
                return fallback.innerHTML.replace(/\n/g, '<br>');
            }

            const rendered = document.createElement('template');
            rendered.innerHTML = markdownRenderer.render(text);
            rendered.content.querySelectorAll('table').forEach((table) => {
                const tableId = `table_${Date.now()}_${markdownTableSequence++}`;
                const wrapper = document.createElement('div');
                wrapper.className = 'table-block-wrapper';
                wrapper.id = tableId;

                table.classList.add('routine-table');
                wrapper.appendChild(table.cloneNode(true));

                const importButton = document.createElement('button');
                importButton.className = 'import-table-btn';
                importButton.dataset.action = 'import-table';
                importButton.dataset.tableId = tableId;
                importButton.textContent = 'Import to Planner';
                wrapper.appendChild(importButton);
                table.replaceWith(wrapper);
            });
            return rendered.innerHTML;
        }

        function injectContentEditable(htmlString) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            tempDiv.querySelectorAll('td').forEach(td => td.setAttribute('contenteditable', 'true'));
            return tempDiv.innerHTML;
        }

        window.importTableToPlanner = function(tableWrapperId) {
            const wrapper = document.getElementById(tableWrapperId);
            if (!wrapper) return;

            let rawTableHtml = wrapper.querySelector('table').outerHTML;
            let editableTableHtml = injectContentEditable(rawTableHtml);
            const tableName = prompt("Name your new planner table:", "Imported Schedule") || "Imported Schedule";

            plannerTables.push({
                id: 'planner_tbl_' + Date.now(),
                title: tableName,
                tableHtml: editableTableHtml,
                archived: false
            });
            savePlannerTables();
            renderPlannerGrid();
            alert(`"${tableName}" has been successfully imported to your Planner! Click on any cell in the table to edit it.`);
        };

        updateInputState();
        updatePlannerState();

        // --- 1. Dashboard & View Switching ---
        const dashboard = document.getElementById('dashboard');
        const mainWrapper = document.getElementById('main-wrapper');
        const toggleBtn = document.getElementById('toggle-btn');
        
        const views = {
            chat: document.getElementById('chat-view'),
            profile: document.getElementById('profile-view'),
            planner: document.getElementById('planner-view'),
            settings: document.getElementById('settings-view')
        };

        const buttons = {
            chat: document.getElementById('new-chat-btn'),
            planner: document.getElementById('planner-btn'),
            settings: document.getElementById('settings-btn')
        };

        toggleBtn.addEventListener('click', () => {
            dashboard.classList.toggle('open');
            mainWrapper.classList.toggle('shifted');
        });

        function switchView(viewName) {
            Object.values(views).forEach(view => view.classList.remove('active'));
            views[viewName].classList.add('active');
            if (viewName === 'planner') updatePlannerState();
            if (viewName === 'profile') updateProfileView();
            if (viewName === 'settings' && localStorage.getItem('ai_health_username_prompted') !== 'true' && !userName) {
                const enteredName = window.prompt("What username would you like to use in welcome messages? (Optional)", "");
                if (enteredName !== null) {
                    userPreferredName = enteredName.trim();
                    userName = userPreferredName;
                    document.getElementById('user-preferred-name').value = userPreferredName;
                    if (userName) {
                        localStorage.setItem('ai_health_username', userName);
                        localStorage.setItem('ai_health_preferred_name', userPreferredName);
                    } else {
                        localStorage.removeItem('ai_health_username');
                        localStorage.removeItem('ai_health_preferred_name');
                    }
                }
                localStorage.setItem('ai_health_username_prompted', 'true');
            }
        }

        buttons.planner.addEventListener('click', () => switchView('planner'));
        buttons.settings.addEventListener('click', () => {
            switchView('settings');
            document.querySelector('.personality-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        document.getElementById('go-to-settings-btn').addEventListener('click', () => switchView('settings'));
        const profileButton = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        function setProfileDropdownOpen(isOpen) {
            profileDropdown.classList.toggle('open', isOpen);
            profileButton.setAttribute('aria-expanded', String(isOpen));
            profileDropdown.setAttribute('aria-hidden', String(!isOpen));
        }

        profileButton.addEventListener('click', () => {
            setProfileDropdownOpen(!profileDropdown.classList.contains('open'));
        });
        document.getElementById('view-profile-btn').addEventListener('click', () => switchView('profile'));
        document.getElementById('profile-edit-btn').addEventListener('click', () => switchView('settings'));
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.profile-dropdown-container')) {
                setProfileDropdownOpen(false);
            }
        });

        // --- 2. Settings Management ---
        function collectSettingValues() {
            return {
                'ai_health_gemini_key': document.getElementById('api-key-input').value.trim(),
                'ai_health_personality': document.getElementById('ai-personality-input').value.trim(),
                'ai_health_height': document.getElementById('user-height').value.trim(),
                'ai_health_age': document.getElementById('user-age').value.trim(),
                'ai_health_weight': document.getElementById('user-weight').value.trim(),
                'ai_health_conditions': document.getElementById('user-conditions').value.trim(),
                'ai_health_preferred_name': document.getElementById('user-preferred-name').value.trim(),
                'ai_health_username': document.getElementById('user-preferred-name').value.trim(),
                'ai_health_equipment': document.getElementById('user-equipment').value.trim(),
                'ai_health_schedule_type': document.getElementById('user-schedule-type').value.trim(),
                'ai_health_schedule_start': document.getElementById('user-schedule-start').value,
                'ai_health_schedule_end': document.getElementById('user-schedule-end').value,
                'ai_health_timezone': document.getElementById('user-timezone').value.trim(),
                'ai_health_ui_scale': document.getElementById('ui-scale-input').value,
                'ai_health_font_size': document.getElementById('font-size-input').value,
                'ai_health_theme': document.getElementById('ui-theme-select').value,
                'ai_health_welcome_cards_enabled': String(document.getElementById('welcome-card-enabled').checked)
            };
        }

        let settingsSnapshot = collectSettingValues();
        let settingsSaveTimer = null;

        function updateProfileView() {
            const displayedPreferredName = document.getElementById('user-preferred-name').value.trim();
            const displayedHeight = document.getElementById('user-height').value.trim();
            const displayedAge = document.getElementById('user-age').value.trim();
            const displayedWeight = document.getElementById('user-weight').value.trim();
            const displayedPersonality = document.getElementById('ai-personality-input').value.trim();
            const displayName = displayedPreferredName;
            const profileStatus = document.getElementById('profile-status');
            const profileName = document.getElementById('profile-name');
            const profileAvatar = document.getElementById('profile-avatar');

            profileStatus.textContent = displayName || 'Not set';
            profileName.textContent = displayName || 'No profile set';
            profileAvatar.textContent = displayName ? displayName.charAt(0).toUpperCase() : '?';
            document.getElementById('profile-username').textContent = displayedPreferredName || 'Blank';
            document.getElementById('profile-height').textContent = displayedHeight || 'Blank';
            document.getElementById('profile-age').textContent = displayedAge || 'Blank';
            document.getElementById('profile-weight').textContent = displayedWeight || 'Blank';
            document.getElementById('profile-persona').textContent = displayedPersonality ? 'Custom' : 'Default';
        }

        function saveSettings(showNotice = true) {
            const values = collectSettingValues();
            const changedKeys = Object.keys(values).filter(key => settingsSnapshot[key] !== values[key]);

            if (changedKeys.length === 0) {
                logDiagnostic('log', 'Settings save skipped; no changes detected.');
                return false;
            }

            try {
                changedKeys.forEach(key => {
                    if (values[key]) localStorage.setItem(key, values[key]);
                    else localStorage.removeItem(key);
                });
            } catch (error) {
                logDiagnostic('error', 'Settings save failed.', { changedFields: changedKeys.length, error });
                if (showNotice) {
                    const notice = document.getElementById('save-notice');
                    notice.textContent = 'Could not save settings. See console for details.';
                    notice.style.opacity = '1';
                }
                return false;
            }

            settingsSnapshot = values;

            GEMINI_API_KEY = values.ai_health_gemini_key;
            aiPersonality = values.ai_health_personality;
            userHeight = values.ai_health_height;
            userAge = values.ai_health_age;
            userWeight = values.ai_health_weight;
            userConditions = values.ai_health_conditions;
            userPreferredName = values.ai_health_preferred_name;
            userName = values.ai_health_preferred_name;
            userEquipment = values.ai_health_equipment;
            userScheduleType = values.ai_health_schedule_type;
            userScheduleStart = values.ai_health_schedule_start;
            userScheduleEnd = values.ai_health_schedule_end;
            userTimezone = values.ai_health_timezone;
            currentScale = values.ai_health_ui_scale;
            currentFontSize = values.ai_health_font_size;
            currentTheme = values.ai_health_theme;
            welcomeCardsEnabled = values.ai_health_welcome_cards_enabled === 'true';

            document.documentElement.style.setProperty('--ui-scale', currentScale);
            document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
            document.body.classList.toggle('light-mode', currentTheme === 'light');

            updateInputState();
            updatePlannerState();
            updateProfileView();
            handleScheduleVisibility();

            if (!welcomeCardsEnabled && !welcomeCard.classList.contains('hidden')) {
                showWelcomeCard(false);
            } else if (welcomeCardsEnabled && currentMessages.length === 0 && welcomeCard.classList.contains('hidden')) {
                showWelcomeCard(true);
            }

            if (showNotice) {
                const notice = document.getElementById('save-notice');
                notice.textContent = 'Settings saved successfully!';
                notice.style.opacity = '1';
                setTimeout(() => { notice.style.opacity = '0'; }, 3000);
            }
            logDiagnostic('log', 'Settings saved.', { changedFields: changedKeys.length });
            return true;
        }

        function scheduleSettingsSave() {
            logDiagnostic('log', 'Settings change detected; save scheduled.');
            clearTimeout(settingsSaveTimer);
            settingsSaveTimer = setTimeout(() => saveSettings(true), 500);
        }

        document.getElementById('settings-view').addEventListener('input', scheduleSettingsSave);
        document.getElementById('settings-view').addEventListener('change', scheduleSettingsSave);
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            clearTimeout(settingsSaveTimer);
            saveSettings(true);
        });

        updateProfileView();

        // --- 4. Planner Locking & Core Features ---
        function updatePlannerState() {
            const lockedView = document.getElementById('planner-locked-view');
            const unlockedView = document.getElementById('planner-unlocked-view');
            const badge = document.getElementById('planner-profile-badge');

            lockedView.style.display = 'none';
            unlockedView.style.display = 'flex';
            badge.textContent = userScheduleType
                ? `Daily commitments: ${userScheduleType}${userTimezone ? ` | ${userTimezone}` : ''}`
                : 'Manage tasks, schedules, and plans';
            renderPlannerGrid();
        }

        function savePlannerTables() {
            localStorage.setItem('ai_health_planner_tables', JSON.stringify(plannerTables));
        }

        function renderPlannerGrid() {
            const activeGrid = document.getElementById('planner-grid-container');
            const archivedGrid = document.getElementById('archived-grid-container');
            const archivedSection = document.getElementById('archived-section');
            
            activeGrid.innerHTML = '';
            archivedGrid.innerHTML = '';

            let hasArchived = false;
            let hasActive = false;

            plannerTables.forEach((item, index) => {
                const card = document.createElement('div');
                card.classList.add('planner-card');
                card.setAttribute('draggable', 'true');
                card.dataset.index = index;

                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragover', handleDragOver);
                card.addEventListener('dragleave', handleDragLeave);
                card.addEventListener('drop', handleDrop);
                card.addEventListener('dragend', handleDragEnd);

                const archiveIcon = item.archived ? 
                    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>` : 
                    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
                
                card.innerHTML = `
                    <div class="planner-card-header">
                        <div class="drag-handle" title="Drag to move"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></div>
                        <input type="text" class="planner-card-title" value="${item.title}" data-action="update-table-name" data-index="${index}">
                        <div class="card-actions">
                            <button class="card-icon-btn" data-action="toggle-table-archive" data-index="${index}">${archiveIcon}</button>
                            <button class="card-icon-btn delete-btn" data-action="delete-table" data-index="${index}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="planner-table-scroll" data-action="update-table-content" data-index="${index}">${item.tableHtml}</div>
                `;

                if (item.archived) {
                    archivedGrid.appendChild(card);
                    hasArchived = true;
                } else {
                    activeGrid.appendChild(card);
                    hasActive = true;
                }
            });

            if (!hasActive) {
                activeGrid.innerHTML = `<div class="empty-planner-state">No active tables. Import tables from your AI chats or click "Generate AI Schedule Table" above!</div>`;
            }

            archivedSection.style.display = hasArchived ? 'flex' : 'none';
        }

        let draggedIndex = null;
        function handleDragStart(e) {
            draggedIndex = parseInt(this.dataset.index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedIndex);
            setTimeout(() => this.style.opacity = '0.4', 0);
        }
        function handleDragOver(e) {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over');
            return false;
        }
        function handleDragLeave(e) { this.classList.remove('drag-over'); }
        function handleDrop(e) {
            e.preventDefault(); e.stopPropagation();
            this.classList.remove('drag-over');
            const targetIndex = parseInt(this.dataset.index);
            if (draggedIndex === null || draggedIndex === targetIndex || isNaN(targetIndex)) return false;
            
            const draggedItem = plannerTables.splice(draggedIndex, 1)[0];
            plannerTables.splice(targetIndex, 0, draggedItem);
            savePlannerTables();
            renderPlannerGrid();
            return false;
        }
        function handleDragEnd(e) {
            this.style.opacity = '1';
            document.querySelectorAll('.planner-card').forEach(card => card.classList.remove('drag-over'));
            draggedIndex = null;
        }

        window.updateTableName = function(index, newTitle) {
            plannerTables[index].title = newTitle.trim() || 'Untitled Table';
            savePlannerTables();
        };
        window.updateTableContent = function(index, element) {
            plannerTables[index].tableHtml = element.innerHTML;
            savePlannerTables();
        };
        window.toggleArchiveTable = function(index) {
            plannerTables[index].archived = !plannerTables[index].archived;
            savePlannerTables();
            renderPlannerGrid();
        };
        window.deletePlannerTable = function(index) {
            if (confirm("Are you sure you want to completely delete this table?")) {
                plannerTables.splice(index, 1);
                savePlannerTables();
                renderPlannerGrid();
            }
        };

        // --- Routine Generation via Planner AI Call ---
        document.getElementById('generate-routine-btn').addEventListener('click', async () => {
            logDiagnostic('log', 'Planner generation requested.');
            if (!GEMINI_API_KEY) {
                logDiagnostic('warn', 'Planner generation stopped; API key is missing.');
                alert("Please enter a valid Gemini API key in Settings.");
                return;
            }
            const tableName = prompt("Give a title for this new AI Table:", "Weekly Fitness & Nutrition Plan") || "Weekly Fitness & Nutrition Plan";

            try {
                let promptText = `Construct a complete workout and nutrition routine schedule table based on my details:
                - Height: ${userHeight}
                - Age: ${userAge}
                - Weight: ${userWeight}`;
                if (userConditions) promptText += `\n- Special Conditions: ${userConditions}`;
                if (userPreferredName) {
                    promptText += `\n- Preferred name: ${userPreferredName}`;
                }
                if (userEquipment) {
                    promptText += `\n- Equipment / Resources: ${userEquipment}`;
                } else {
                    promptText += `\n- Equipment / Resources: none listed. Reassure the user that they can still follow a bodyweight-only plan and build the schedule around that.`;
                }
                
                if (userScheduleType) {
                    let schedTxt = `\n- Daily Commitment: ${userScheduleType}`;
                    if (userScheduleStart && userScheduleEnd) schedTxt += ` from ${userScheduleStart} to ${userScheduleEnd}`;
                    if (userTimezone) schedTxt += ` (${userTimezone})`;
                    promptText += schedTxt;
                    promptText += `\nUser wants to make a daily healthy schedule for them, but they want to chat before you do.`;
                }
                
                if (aiPersonality) promptText += `\n\nAI Persona Instructions: ${aiPersonality}`;

                promptText += `\n\nFormat your response STRICTLY as a Markdown Table with columns for Day/Time, Target/Focus, Exercises & Sets, and Nutrition Tips.`;

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: promptText }] }]
                    })
                });

                const data = await response.json();
                if (data.candidates && data.candidates.length > 0) {
                    const aiText = data.candidates[0].content?.parts?.[0]?.text;
                    if (typeof aiText !== 'string' || !aiText.trim()) {
                        logDiagnostic('warn', 'Planner AI response did not contain text.', {
                            candidateCount: data.candidates.length
                        });
                        alert("AI returned an empty plan. Please try again.");
                        return;
                    }
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = parseMarkdown(aiText);
                    const tableElem = tempDiv.querySelector('table');

                    if (tableElem) {
                        let editableHtml = injectContentEditable(tableElem.outerHTML);
                        plannerTables.unshift({ id: 'planner_tbl_' + Date.now(), title: tableName, tableHtml: editableHtml, archived: false });
                        savePlannerTables();
                        renderPlannerGrid();
                        logDiagnostic('log', 'Planner table generated successfully.');
                    } else {
                        logDiagnostic('warn', 'Planner AI response did not contain a Markdown table.', {
                            outputLength: aiText.length
                        });
                        alert("AI response did not contain a valid table structure. Please try again.");
                    }
                } else if (data.error) {
                    logDiagnostic('error', 'Planner AI request returned an API error.', {
                        code: data.error.code,
                        message: redactApiKey(data.error.message)
                    });
                    const errLower = (data.error.message || '').toLowerCase();
                    if (data.error.code === 400 || data.error.code === 401 || data.error.code === 403 || errLower.includes('key')) invalidateApiKey(data.error.message);
                    else alert(`API Error: ${data.error.message}`);
                } else {
                    logDiagnostic('warn', 'Planner AI returned an unexpected response.', {
                        hasCandidates: Array.isArray(data.candidates),
                        responseKeys: Object.keys(data)
                    });
                }
            } catch (err) {
                logDiagnostic('error', 'Planner generation failed.', { error: err });
                alert("Failed to generate plan. Please try again.");
            }
        });

        // --- 5. Chat & History State ---
        let chatSessions = JSON.parse(localStorage.getItem('ai_health_sessions')) || [];
        chatSessions = chatSessions.map((session, index) => ({
            ...session,
            archived: Boolean(session.archived),
            updatedAt: Number(session.updatedAt) || (chatSessions.length - index)
        }));
        let currentSessionId = null;
        let currentMessages = [];

        const historyList = document.getElementById('history-list');

        renderHistoryList();

        buttons.chat.addEventListener('click', () => {
            switchView('chat');
            saveCurrentSession();
            currentSessionId = 'session_' + Date.now();
            currentMessages = [];
            chatDisplay.innerHTML = '';
            showWelcomeCard(true);
        });

        function saveSessions() {
            localStorage.setItem('ai_health_sessions', JSON.stringify(chatSessions));
        }

        function saveCurrentSession() {
            if (currentMessages.length > 0 && currentSessionId) {
                const firstUserMsg = currentMessages.find(m => m.sender === 'user');
                let title = firstUserMsg ? firstUserMsg.text.trim() : "New Conversation";
                if (title.length > 30) title = title.substring(0, 27) + "...";

                const existingIndex = chatSessions.findIndex(s => s.id === currentSessionId);
                if (existingIndex >= 0) {
                    chatSessions[existingIndex].title = title;
                    chatSessions[existingIndex].messages = currentMessages;
                    chatSessions[existingIndex].updatedAt = Date.now();
                    chatSessions.unshift(chatSessions.splice(existingIndex, 1)[0]);
                } else {
                    chatSessions.unshift({ id: currentSessionId, title: title, messages: currentMessages, archived: false, updatedAt: Date.now() });
                }
                saveSessions();
                renderHistoryList();
            }
        }

        function closeHistoryMenus() {
            document.querySelectorAll('.history-menu.active').forEach(menu => menu.classList.remove('active'));
        }

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.history-actions')) {
                closeHistoryMenus();
            }
        });

        function updateSessionArchiveState(sessionId, archived) {
            const session = chatSessions.find(s => s.id === sessionId);
            if (session) {
                session.archived = archived;
                saveSessions();
                renderHistoryList();
            }
        }

        function renderHistoryList() {
            historyList.innerHTML = '';
            chatSessions.sort((a, b) => b.updatedAt - a.updatedAt);

            const createSessionItem = (session) => {
                const item = document.createElement('div');
                item.classList.add('history-item');
                if (session.archived) item.classList.add('archived');
                item.tabIndex = 0;

                const titleSpan = document.createElement('span');
                titleSpan.classList.add('history-item-title');
                titleSpan.textContent = session.title;
                titleSpan.title = session.title;

                const actions = document.createElement('div');
                actions.classList.add('history-actions');

                const menuBtn = document.createElement('button');
                menuBtn.classList.add('history-menu-btn');
                menuBtn.type = 'button';
                menuBtn.setAttribute('aria-label', `Open chat options for ${session.title}`);
                menuBtn.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';

                const menu = document.createElement('div');
                menu.classList.add('history-menu');

                const archiveItem = document.createElement('button');
                archiveItem.classList.add('history-menu-item');
                archiveItem.type = 'button';
                archiveItem.textContent = session.archived ? 'Restore' : 'Archive';
                archiveItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeHistoryMenus();
                    updateSessionArchiveState(session.id, !session.archived);
                });

                const deleteItem = document.createElement('button');
                deleteItem.classList.add('history-menu-item', 'delete');
                deleteItem.type = 'button';
                deleteItem.textContent = 'Delete';
                deleteItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeHistoryMenus();
                    promptDeleteSession(session.id);
                });

                const moreItem = document.createElement('button');
                moreItem.classList.add('history-menu-item');
                moreItem.type = 'button';
                moreItem.textContent = 'More soon';
                moreItem.disabled = true;

                menu.appendChild(archiveItem);
                menu.appendChild(deleteItem);
                menu.appendChild(moreItem);
                actions.appendChild(menuBtn);
                actions.appendChild(menu);

                item.addEventListener('click', () => {
                    closeHistoryMenus();
                    switchView('chat');
                    loadSession(session.id);
                });
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        closeHistoryMenus();
                        switchView('chat');
                        loadSession(session.id);
                    }
                });
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = menu.classList.contains('active');
                    closeHistoryMenus();
                    if (!isOpen) {
                        menu.classList.add('active');
                    }
                });

                item.appendChild(titleSpan);
                item.appendChild(actions);
                historyList.appendChild(item);
            };

            chatSessions.forEach(createSessionItem);

            if (chatSessions.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.classList.add('history-item');
                emptyState.style.opacity = '0.7';
                emptyState.style.justifyContent = 'center';
                emptyState.textContent = 'No recent chats';
                historyList.appendChild(emptyState);
            }
        }

        function loadSession(id) {
            saveCurrentSession();
            const session = chatSessions.find(s => s.id === id);
            if (session) {
                session.updatedAt = Date.now();
                chatSessions.sort((a, b) => b.updatedAt - a.updatedAt);
                saveSessions();
                renderHistoryList();
                currentSessionId = session.id;
                currentMessages = [...session.messages];
                chatDisplay.innerHTML = '';
                currentMessages.forEach(msg => {
                    const msgDiv = document.createElement('div');
                    msgDiv.classList.add('message', msg.sender);
                    msgDiv.innerHTML = msg.sender === 'ai' ? parseMarkdown(msg.text) : msg.text;
                    chatDisplay.appendChild(msgDiv);
                });
                chatDisplay.scrollTop = chatDisplay.scrollHeight;
                showWelcomeCard(currentMessages.length === 0);
            }
        }

        function appendMessage(text, sender) {
            const msgDiv = document.createElement('div');
            msgDiv.classList.add('message', sender);
            msgDiv.innerHTML = sender === 'ai' ? parseMarkdown(text) : text;
            chatDisplay.appendChild(msgDiv);
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
            currentMessages.push({ sender: sender, text: text });
            saveCurrentSession();
        }

        // --- 6. Delete Session Confirmation Logic ---
        let sessionToDelete = null;
        const deleteModal = document.getElementById('delete-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

        function promptDeleteSession(sessionId) {
            sessionToDelete = sessionId;
            deleteModal.classList.add('active');
        }
        function closeModal() {
            sessionToDelete = null;
            deleteModal.classList.remove('active');
        }

        cancelDeleteBtn.addEventListener('click', closeModal);
        confirmDeleteBtn.addEventListener('click', () => {
            if (sessionToDelete) {
                chatSessions = chatSessions.filter(s => s.id !== sessionToDelete);
                localStorage.setItem('ai_health_sessions', JSON.stringify(chatSessions));
                if (currentSessionId === sessionToDelete) {
                    currentSessionId = null;
                    currentMessages = [];
                    chatDisplay.innerHTML = '';
                }
                renderHistoryList();
            }
            closeModal();
        });

        async function fetchWithTransientRetries(url, options) {
            const maxRetries = 3;
            let lastError;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    const response = await fetch(url, options);
                    if (response.status !== 408 && response.status !== 429 && response.status < 500) {
                        return response;
                    }
                    lastError = new Error(`Temporary API response: ${response.status}`);
                } catch (error) {
                    lastError = error;
                }

                if (attempt < maxRetries) {
                    logDiagnostic('warn', 'AI request connection failed; retrying.', {
                        status: lastError.message.startsWith('Temporary API response: ')
                            ? Number(lastError.message.split(': ')[1])
                            : undefined,
                        retry: attempt + 1,
                        maxRetries,
                        error: lastError
                    });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            const retryError = new Error('The AI service did not respond after three retries.');
            retryError.name = 'TransientRequestError';
            retryError.cause = lastError;
            logDiagnostic('error', 'AI request exhausted transient retries.', {
                retries: maxRetries,
                error: lastError
            });
            throw retryError;
        }

        // --- 7. Google Gemini API Chat Execution ---
        let isSendingChatMessage = false;

        async function sendChatMessage() {
            if (isSendingChatMessage || chatInput.value.trim() === '') return;
            isSendingChatMessage = true;
            logDiagnostic('log', 'Chat send triggered.', { method: document.activeElement === chatSendButton ? 'button' : 'keyboard' });
            {
                if (!currentSessionId) currentSessionId = 'session_' + Date.now();
                if (welcomeCard && !welcomeCard.classList.contains('hidden')) {
                    showWelcomeCard(false);
                }
                const userText = chatInput.value.trim();
                chatInput.value = ''; 
                appendMessage(userText, 'user');
                    
                // Show thinking animation bubble
                showTypingIndicator();

                try {
                    const apiHistory = currentMessages
                        .filter(m => m.sender === 'user' || m.sender === 'ai')
                        .map(m => ({
                            role: m.sender === 'user' ? 'user' : 'model',
                            parts: [{ text: m.text }]
                        }));

                    let sysInstruction = "You are a helpful assistant for everyday questions, time management, organizing tasks, and healthy lifestyle topics. Do not require the user to provide profile information before helping or making a plan. Do not offer tables unless they are useful or requested. When a user asks for a table, task plan, or schedule, create it using the information available and ask only for details that are essential to that specific request. Format requested tables in clean Markdown so they can be imported into the Planner.";

                    if (aiPersonality) {
                        sysInstruction += `\nCRITICAL CONTEXT FOR AI PERSONALITY AND TONE: ${aiPersonality}`;
                    }

                    if (userPreferredName) sysInstruction += `\nAddress the user as ${userPreferredName} when natural.`;
                    const optionalProfile = [];
                    if (userHeight) optionalProfile.push(`Height: ${userHeight}`);
                    if (userAge) optionalProfile.push(`Age: ${userAge}`);
                    if (userWeight) optionalProfile.push(`Weight: ${userWeight}`);
                    if (userConditions) optionalProfile.push(`Health considerations: ${userConditions}`);
                    if (userEquipment) optionalProfile.push(`Equipment/resources: ${userEquipment}`);
                    if (optionalProfile.length) {
                        sysInstruction += `\nOptional profile context, use only when relevant: ${optionalProfile.join(', ')}.`;
                    }
                    if (userScheduleType) {
                        let scheduleContext = `\nDaily commitments: ${userScheduleType}`;
                        if (userScheduleStart && userScheduleEnd) scheduleContext += ` from ${userScheduleStart} to ${userScheduleEnd}`;
                        if (userTimezone) scheduleContext += ` (${userTimezone})`;
                        sysInstruction += `${scheduleContext}. Consider this availability when planning.`;
                    }

                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
                    
                    const response = await fetchWithTransientRetries(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: sysInstruction }] },
                            contents: apiHistory
                        })
                    });

                    const data = await response.json();
                    
                    // waits until the response is done and then the animation thing would dissapear
                    removeTypingIndicator();
                    
                    if (data.candidates && data.candidates.length > 0) {
                        const aiText = data.candidates[0].content?.parts?.[0]?.text;
                        if (typeof aiText === 'string' && aiText.trim()) {
                            appendMessage(aiText, 'ai');
                            logDiagnostic('log', 'AI response received.', { outputLength: aiText.length });
                        } else {
                            logDiagnostic('warn', 'AI response candidate did not contain text.', {
                                candidateCount: data.candidates.length
                            });
                            appendMessage("The AI returned an empty response. Please try again.", "system");
                        }
                    } else if (data.error) {
                        logDiagnostic('error', 'Chat AI request returned an API error.', {
                            code: data.error.code,
                            message: redactApiKey(data.error.message)
                        });
                        const errLower = (data.error.message || '').toLowerCase();
                        if (data.error.code === 400 || data.error.code === 401 || data.error.code === 403 || errLower.includes('key')) invalidateApiKey(data.error.message);
                        else appendMessage(`API Error: ${data.error.message}`, "system");
                    } else {
                        logDiagnostic('warn', 'Chat AI returned an unexpected response.', {
                            hasCandidates: Array.isArray(data.candidates),
                            responseKeys: Object.keys(data)
                        });
                        appendMessage("Error: Received unexpected response from AI.", "system");
                    }
                } catch (error) {
                    removeTypingIndicator(); // Ensure indicator vanishes on fetch errors
                    logDiagnostic('error', 'Chat AI request failed.', { error });
                    if (error.name === 'TransientRequestError') {
                        appendMessage("The AI service is temporarily busy and did not respond after three retries. Please try sending your message again shortly.", "system");
                    } else {
                        appendMessage("Connection error. Please check your internet connection.", "system");
                    }
                }
            }
            isSendingChatMessage = false;
        }

        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendChatMessage();
            }
        });
        chatSendButton.addEventListener('click', sendChatMessage);

        // Delegate actions created by chat and planner rendering.
        document.addEventListener('click', (event) => {
            const actionElement = event.target.closest('[data-action]');
            if (!actionElement) return;

            const index = actionElement.dataset.index;
            switch (actionElement.dataset.action) {
                case 'import-table':
                    importTableToPlanner(actionElement.dataset.tableId);
                    break;
                case 'update-table-name':
                    // The change event handles this input.
                    break;
                case 'toggle-table-archive':
                    toggleArchiveTable(Number(index));
                    break;
                case 'delete-table':
                    deletePlannerTable(Number(index));
                    break;
            }
        });

        document.addEventListener('change', (event) => {
            const actionElement = event.target.closest('[data-action="update-table-name"]');
            if (actionElement) {
                updateTableName(Number(actionElement.dataset.index), actionElement.value);
            }
        });

        document.addEventListener('input', (event) => {
            const tableElement = event.target.closest('[data-action="update-table-content"]');
            if (tableElement) {
                updateTableContent(Number(tableElement.dataset.index), tableElement);
            }
        });
