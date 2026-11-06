// --- 0. State Variables & Initialization ---
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
        let userPreferredName = localStorage.getItem('ai_health_preferred_name') || '';
        
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

        function getRandomWelcomePrompt() {
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
            if (show) {
                welcomeCard.classList.remove('hidden');
                bottomInputArea.style.display = 'none';
                welcomeInputWrapper.appendChild(chatInput);
                renderWelcomeCard();
                chatInput.placeholder = "Start by typing your first question...";
            } else {
                welcomeCard.classList.add('hidden');
                bottomInputArea.style.display = 'block';
                bottomInputArea.appendChild(chatInput);
                updateInputState();
            }
        }

        showWelcomeCard(true);

        // Note: Schedule is an optional context, so it doesn't block completion
        function isProfileComplete() {
            return userHeight && userAge && userWeight;
        }

        function updateInputState() {
            if (!GEMINI_API_KEY) {
                chatInput.disabled = true;
                chatInput.value = '';
                chatInput.placeholder = "Please enter Gemini API key in Settings";
            } else {
                chatInput.disabled = false;
                chatInput.placeholder = "Ask HealthCL...";
            }
        }

        function invalidateApiKey(errorMessage) {
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

        // --- Markdown & Table Parser ---
        function parseMarkdown(text) {
            if (!text) return '';
            let formattedText = convertMarkdownTables(text);
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            formattedText = formattedText.replace(/\n/g, '<br>');
            return formattedText;
        }

        function convertMarkdownTables(text) {
            if (!text.includes('|')) return text;
            const lines = text.split('\n');
            let inTable = false;
            let tableLines = [];
            let result = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const isTableLine = line.includes('|') && (line.startsWith('|') || line.endsWith('|') || line.split('|').length > 2);

                if (isTableLine) {
                    inTable = true;
                    tableLines.push(line);
                } else {
                    if (inTable) {
                        result.push(renderHtmlTableBlock(tableLines));
                        tableLines = [];
                        inTable = false;
                    }
                    result.push(line);
                }
            }
            if (inTable) result.push(renderHtmlTableBlock(tableLines));
            return result.join('\n');
        }

        function renderHtmlTableBlock(lines) {
            let headers = [];
            let rows = [];

            lines.forEach((line) => {
                if (line.replace(/[\s\-\|]/g, '') === '') return;
                const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
                if (headers.length === 0) headers = cells;
                else rows.push(cells);
            });

            if (headers.length === 0) return '';
            const tableId = 'table_' + Math.random().toString(36).substr(2, 9);

            let html = `<div class="table-block-wrapper" id="${tableId}">`;
            html += `<table class="routine-table"><thead><tr>`;
            headers.forEach(h => html += `<th>${h}</th>`);
            html += `</tr></thead><tbody>`;
            rows.forEach(r => {
                html += `<tr>`;
                r.forEach(c => html += `<td>${c}</td>`);
                html += `</tr>`;
            });
            html += `</tbody></table>`;
            html += `<button class="import-table-btn" data-action="import-table" data-table-id="${tableId}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        Import to Planner
                     </button></div>`;
            return html;
        }

        function injectContentEditable(htmlString) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            tempDiv.querySelectorAll('td').forEach(td => td.setAttribute('contenteditable', 'true'));
            return tempDiv.innerHTML;
        }

        window.importTableToPlanner = function(tableWrapperId) {
            if (!isProfileComplete()) {
                alert("Planner is currently locked! Please complete your required health profile details (Height, Age, Weight) in Settings first.");
                return;
            }

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
        }

        buttons.planner.addEventListener('click', () => switchView('planner'));
        buttons.settings.addEventListener('click', () => switchView('settings'));
        document.getElementById('go-to-settings-btn').addEventListener('click', () => switchView('settings'));

        // --- 2. Chat History Dropdown Toggle ---
        const historyToggleBtn = document.getElementById('history-toggle-btn');
        const historyList = document.getElementById('history-list');
        const dropdownArrow = document.getElementById('dropdown-arrow');

        historyToggleBtn.addEventListener('click', () => {
            historyList.classList.toggle('open');
            dropdownArrow.textContent = historyList.classList.contains('open') ? ' ' : ' ';
        });

        // --- 3. Settings Management ---
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            // API & Persona
            GEMINI_API_KEY = document.getElementById('api-key-input').value.trim();
            aiPersonality = document.getElementById('ai-personality-input').value.trim();
            
            if (GEMINI_API_KEY) localStorage.setItem('ai_health_gemini_key', GEMINI_API_KEY);
            else localStorage.removeItem('ai_health_gemini_key');
            
            localStorage.setItem('ai_health_personality', aiPersonality);

            // Profile Info
            userHeight = document.getElementById('user-height').value.trim();
            userAge = document.getElementById('user-age').value.trim();
            userWeight = document.getElementById('user-weight').value.trim();
            userConditions = document.getElementById('user-conditions').value.trim();
            userPreferredName = document.getElementById('user-preferred-name').value.trim();
            userEquipment = document.getElementById('user-equipment').value.trim();
            
            // Schedule Info
            userScheduleType = document.getElementById('user-schedule-type').value.trim();
            userScheduleStart = document.getElementById('user-schedule-start').value;
            userScheduleEnd = document.getElementById('user-schedule-end').value;
            userTimezone = document.getElementById('user-timezone').value.trim();

            localStorage.setItem('ai_health_height', userHeight);
            localStorage.setItem('ai_health_age', userAge);
            localStorage.setItem('ai_health_weight', userWeight);
            localStorage.setItem('ai_health_conditions', userConditions);
            if (userPreferredName) localStorage.setItem('ai_health_preferred_name', userPreferredName);
            else localStorage.removeItem('ai_health_preferred_name');
            if (userEquipment) localStorage.setItem('ai_health_equipment', userEquipment);
            else localStorage.removeItem('ai_health_equipment');
            
            localStorage.setItem('ai_health_schedule_type', userScheduleType);
            localStorage.setItem('ai_health_schedule_start', userScheduleStart);
            localStorage.setItem('ai_health_schedule_end', userScheduleEnd);
            localStorage.setItem('ai_health_timezone', userTimezone);

            // UI Preferences
            const newScale = document.getElementById('ui-scale-input').value;
            const newFontSize = document.getElementById('font-size-input').value;
            const newTheme = document.getElementById('ui-theme-select').value;
            
            document.documentElement.style.setProperty('--ui-scale', newScale);
            document.documentElement.style.setProperty('--base-font-size', newFontSize + 'px');
            localStorage.setItem('ai_health_ui_scale', newScale);
            localStorage.setItem('ai_health_font_size', newFontSize);

            if (newTheme === 'light') {
                document.body.classList.add('light-mode');
            } else {
                document.body.classList.remove('light-mode');
            }
            localStorage.setItem('ai_health_theme', newTheme);

            updateInputState();
            updatePlannerState();

            const notice = document.getElementById('save-notice');
            notice.style.opacity = '1';
            setTimeout(() => { notice.style.opacity = '0'; }, 3000);
        });

        // --- 4. Planner Locking & Core Features ---
        function updatePlannerState() {
            const lockedView = document.getElementById('planner-locked-view');
            const unlockedView = document.getElementById('planner-unlocked-view');
            const badge = document.getElementById('planner-profile-badge');

            if (!isProfileComplete()) {
                lockedView.style.display = 'flex';
                unlockedView.style.display = 'none';
                plannerTables = [];
                localStorage.removeItem('ai_health_planner_tables');
            } else {
                lockedView.style.display = 'none';
                unlockedView.style.display = 'flex';
                let conditionText = userConditions ? ` | Conditions: ${userConditions}` : ' | Conditions: None';
                let schedText = userScheduleType ? ` | Daily Commitment: ${userScheduleType}` : '';
                badge.textContent = `Height: ${userHeight} | Age: ${userAge} | Weight: ${userWeight}${conditionText}${schedText}`;
                renderPlannerGrid();
            }
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
            if (!GEMINI_API_KEY) {
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
                    const aiText = data.candidates[0].content.parts[0].text;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = parseMarkdown(aiText);
                    const tableElem = tempDiv.querySelector('table');

                    if (tableElem) {
                        let editableHtml = injectContentEditable(tableElem.outerHTML);
                        plannerTables.unshift({ id: 'planner_tbl_' + Date.now(), title: tableName, tableHtml: editableHtml, archived: false });
                        savePlannerTables();
                        renderPlannerGrid();
                    } else {
                        alert("AI response did not contain a valid table structure. Please try again.");
                    }
                } else if (data.error) {
                    const errLower = (data.error.message || '').toLowerCase();
                    if (data.error.code === 400 || data.error.code === 401 || data.error.code === 403 || errLower.includes('key')) invalidateApiKey(data.error.message);
                    else alert(`API Error: ${data.error.message}`);
                }
            } catch (err) {
                console.error(err);
                alert("Failed to generate plan. Please try again.");
            }
        });

        // --- 5. Chat & History State ---
        let chatSessions = JSON.parse(localStorage.getItem('ai_health_sessions')) || [];
        chatSessions = chatSessions.map(session => ({ ...session, archived: Boolean(session.archived) }));
        let currentSessionId = null;
        let currentMessages = [];

        const archivedHistoryToggleBtn = document.getElementById('archived-history-toggle-btn');
        const archivedHistoryList = document.getElementById('archived-history-list');
        const archivedHistoryArrow = document.getElementById('archived-history-arrow');

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
                } else {
                    chatSessions.unshift({ id: currentSessionId, title: title, messages: currentMessages, archived: false });
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
            archivedHistoryList.innerHTML = '';

            const activeSessions = chatSessions.filter(session => !session.archived);
            const archivedSessions = chatSessions.filter(session => session.archived);

            const createSessionItem = (session, listElement, mode) => {
                const item = document.createElement('div');
                item.classList.add('history-item');
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
                archiveItem.textContent = mode === 'archived' ? 'Restore' : 'Archive';
                archiveItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeHistoryMenus();
                    updateSessionArchiveState(session.id, mode !== 'archived');
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
                listElement.appendChild(item);
            };

            activeSessions.forEach(session => createSessionItem(session, historyList, 'active'));
            archivedSessions.forEach(session => createSessionItem(session, archivedHistoryList, 'archived'));

            if (activeSessions.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.classList.add('history-item');
                emptyState.style.opacity = '0.7';
                emptyState.style.justifyContent = 'center';
                emptyState.textContent = 'No recent chats';
                historyList.appendChild(emptyState);
            }

            if (archivedSessions.length > 0) {
                archivedHistoryToggleBtn.style.display = 'flex';
            } else {
                archivedHistoryToggleBtn.style.display = 'none';
                archivedHistoryList.classList.remove('open');
                archivedHistoryArrow.textContent = ' ';
            }

            if (archivedHistoryList.classList.contains('open') && archivedSessions.length === 0) {
                archivedHistoryList.classList.remove('open');
            }
        }

        archivedHistoryToggleBtn.addEventListener('click', () => {
            if (archivedHistoryToggleBtn.style.display === 'none') return;
            const isOpen = archivedHistoryList.classList.contains('open');
            archivedHistoryList.classList.toggle('open', !isOpen);
            archivedHistoryArrow.textContent = isOpen ? ' ' : ' ';
        });

        function loadSession(id) {
            saveCurrentSession();
            const session = chatSessions.find(s => s.id === id);
            if (session) {
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

        // --- 7. Google Gemini API Chat Execution ---
        chatInput.addEventListener('keypress', async function (e) {
            if (e.key === 'Enter' && chatInput.value.trim() !== '') {
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

                    let sysInstruction = "You are an AI designed to assist the user with their healthy lifestyle goals,INQUIRE IDEAS, you can make planners,write and read in markdown, the user dont always came for exercise routines, dont always offer the user for a planner, wait for certain keywords before making planners";
                    
                    if (aiPersonality) {
                        sysInstruction += `\nCRITICAL CONTEXT FOR AI PERSONALITY AND TONE: ${aiPersonality}`;
                    }

                    if (!isProfileComplete()) {
                        sysInstruction += "\nCRITICAL INSTRUCTION: The user's health profile (Height, Age, Weight) is currently INCOMPLETE and locked in Settings. IF THE USER ASKS YOU TO CREATE A PLANNER, SCHEDULE, WORKOUT ROUTINE, OR TABLE, YOU MUST POLITELY DECLINE AND MAKE AN EXCUSE explaining that you need them to complete their required profile details in Settings first before you can construct any planners or tables for them.";
                    } else {
                        let conditionsText = userConditions ? `, Special Conditions: ${userConditions}` : "";
                        let nameText = userPreferredName ? `, Preferred Name: ${userPreferredName}` : "";
                        let equipmentText = userEquipment ? `, Equipment / Resources: ${userEquipment}` : ", Equipment / Resources: none listed. Reassure the user that they can still follow a bodyweight-only plan and build around that.";
                        sysInstruction += `\nUser Profile Context: Height: ${userHeight}, Age: ${userAge}, Weight: ${userWeight}${conditionsText}${nameText}${equipmentText}.`;
                        if (userPreferredName) {
                            sysInstruction += `\nWhen talking to the user, address them by their preferred name: ${userPreferredName}.`;
                        }
                        
                        if (userScheduleType) {
                            let schedTxt = `\nUser Daily Commitment: ${userScheduleType}`;
                            if (userScheduleStart && userScheduleEnd) schedTxt += ` from ${userScheduleStart} to ${userScheduleEnd}`;
                            if (userTimezone) schedTxt += ` (${userTimezone})`;
                            sysInstruction += `${schedTxt}. Take this daily schedule/timezone into account when recommending workout times, routines, or meal timings.`;
                        }

                        sysInstruction += `\nAlways format schedules or routines using clean Markdown tables so the user can easily import them.`;
                    }

                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
                    
                    const response = await fetch(url, {
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
                        const aiText = data.candidates[0].content.parts[0].text;
                        appendMessage(aiText, 'ai');
                    } else if (data.error) {
                        const errLower = (data.error.message || '').toLowerCase();
                        if (data.error.code === 400 || data.error.code === 401 || data.error.code === 403 || errLower.includes('key')) invalidateApiKey(data.error.message);
                        else appendMessage(`API Error: ${data.error.message}`, "system");
                    } else {
                        appendMessage("Error: Received unexpected response from AI.", "system");
                    }
                } catch (error) {
                    removeTypingIndicator(); // Ensure indicator vanishes on fetch errors
                    console.error("Gemini API Error:", error);
                    appendMessage("Connection error. Please check your internet connection.", "system");
                }
            }
        });

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
