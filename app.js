        let currentGenMode = 'text2img';
        let currentModel = 'agnes-image-2.5-flash';
        let uploadImages = []; // 支持多图
        let chatHistory = [];
        let apiKey = localStorage.getItem('agnes_api_key') || '';
        if (apiKey) document.getElementById('statusDot').classList.add('active');

        const VIDEO_ASPECT_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
        const VIDEO_DURATION_OPTIONS = [
            { seconds: '4', label: '4 秒' },
            { seconds: '5', label: '5 秒' },
            { seconds: '6', label: '6 秒' },
            { seconds: '7', label: '7 秒' },
            { seconds: '8', label: '8 秒' },
            { seconds: '9', label: '9 秒' },
            { seconds: '10', label: '10 秒' },
            { seconds: '11', label: '11 秒' },
            { seconds: '12', label: '12 秒' }
        ];

        const IMAGE_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '21:9'];
        const IMAGE_SIZE_TIERS = ['1K', '2K', '3K', '4K'];
        const DEFAULT_IMAGE_RATIO = '9:16';
        const DEFAULT_IMAGE_SIZE = '2K';

        // 官方档位输出尺寸表：只用于结果卡片展示，请求里传的是 size 档位 + ratio
        const IMAGE_OUTPUT_SIZES = {
            '1:1':  { '1K': '1024x1024', '2K': '2048x2048', '3K': '3072x3072', '4K': '4096x4096' },
            '3:4':  { '1K': '864x1152',  '2K': '1728x2304', '3K': '2592x3456', '4K': '3456x4608' },
            '4:3':  { '1K': '1152x864',  '2K': '2304x1728', '3K': '3456x2592', '4K': '4608x3456' },
            '9:16': { '1K': '736x1312',  '2K': '1472x2624', '3K': '2208x3936', '4K': '2944x5248' },
            '16:9': { '1K': '1312x736',  '2K': '2624x1472', '3K': '3936x2208', '4K': '5248x2944' },
            '2:3':  { '1K': '832x1248',  '2K': '1664x2496', '3K': '2496x3744', '4K': '3328x4992' },
            '3:2':  { '1K': '1248x832',  '2K': '2496x1664', '3K': '3744x2496', '4K': '4992x3328' },
            '21:9': { '1K': '1568x672',  '2K': '3136x1344', '3K': '4704x2016', '4K': '6272x2688' }
        };

        let selectedImageSize = DEFAULT_IMAGE_SIZE;

        // IndexedDB 封装
        const DB_NAME = 'AgnesCreativeSpace';
        const DB_VERSION = 1;
        const STORE_NAME = 'results';

        function openDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    }
                };
            });
        }

        async function getAllResults() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result.reverse());
                request.onerror = () => reject(request.error);
            });
        }

        async function saveResult(item) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.put(item);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        async function deleteResult(id) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        // 初始化时加载历史结果
        document.addEventListener('DOMContentLoaded', loadResults);
        document.addEventListener('DOMContentLoaded', togglePromptClearButton);
        document.addEventListener('DOMContentLoaded', initSurfaceEnhancements);

        function syncResultsVisibility() {
            const resultsSection = document.getElementById('resultsSection');
            const resultsGrid = document.getElementById('resultsGrid');
            const emptyState = document.getElementById('resultsEmpty');
            const isGenerateMode = document.getElementById('generateMode').style.display !== 'none';
            const hasResults = resultsGrid.children.length > 0;

            resultsSection.style.display = isGenerateMode ? 'block' : 'none';
            if (emptyState) {
                emptyState.style.display = hasResults ? 'none' : 'grid';
            }
        }

        function initRevealSections() {
            const items = document.querySelectorAll('.reveal');
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                items.forEach((item) => item.classList.add('is-visible'));
                return;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

            items.forEach((item) => {
                const rect = item.getBoundingClientRect();
                const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
                if (inView) {
                    item.classList.add('is-visible');
                    return;
                }
                observer.observe(item);
            });
        }

        function initFaq() {
            document.querySelectorAll('.faq-question').forEach((button) => {
                button.addEventListener('click', () => {
                    const item = button.closest('.faq-item');
                    const isActive = item.classList.contains('active');
                    item.classList.toggle('active', !isActive);
                    button.setAttribute('aria-expanded', String(!isActive));
                });
            });
        }

        function initSurfaceEnhancements() {
            initRevealSections();
            initFaq();
            syncResultsVisibility();
        }

        // Dropdown
        function toggleDropdown(id) {
            const dropdown = document.getElementById(id);
            const wasActive = dropdown.classList.contains('active');
            document.querySelectorAll('.param-dropdown').forEach(d => d.classList.remove('active'));
            if (!wasActive) dropdown.classList.add('active');
        }

        function togglePromptClearButton() {
            const input = document.getElementById('promptInput');
            const clearBtn = document.getElementById('promptClearBtn');
            const hasText = Boolean(input?.value?.trim());
            clearBtn?.classList.toggle('visible', hasText);
        }

        function clearPromptInput() {
            const input = document.getElementById('promptInput');
            if (!input) return;
            input.value = '';
            lastPrompt = null;
            togglePromptClearButton();
            input.focus();
        }

        function buildImageRatioMenu() {
            return IMAGE_RATIOS.map(ratio =>
                `<div class="param-option${ratio === DEFAULT_IMAGE_RATIO ? ' active' : ''}" onclick="selectRatio('${ratio}', '${ratio}')">${ratio}</div>`
            ).join('');
        }

        function buildImageSizeMenu() {
            return IMAGE_SIZE_TIERS.map(tier =>
                `<div class="param-option${tier === DEFAULT_IMAGE_SIZE ? ' active' : ''}" onclick="selectImageSize('${tier}')">${tier}</div>`
            ).join('');
        }

        function resetImageSizeMenu() {
            const sizeMenu = document.getElementById('sizeMenu');
            if (!sizeMenu) return;
            sizeMenu.innerHTML = buildImageSizeMenu();
            selectedImageSize = DEFAULT_IMAGE_SIZE;
            document.getElementById('sizeText').textContent = DEFAULT_IMAGE_SIZE;
        }

        function selectType(mode, icon, text, sourceEvent = window.event) {
            currentGenMode = mode;
            document.querySelectorAll('#typePicker .type-option').forEach((option) => option.classList.remove('active'));
            const activeOption = sourceEvent?.target?.closest?.('.type-option');
            activeOption?.classList.add('active');

            const isVideo = mode === 'text2video' || mode === 'img2video';
            const needsUpload = mode === 'img2img' || mode === 'img2video';
            const uploadArea = document.getElementById('uploadArea');

            // Show/hide upload area
            if (needsUpload) {
                uploadArea.classList.add('active');
            } else {
                uploadArea.classList.remove('active');
                uploadImages = [];
                updateUploadPreview();
            }

            // Show/hide duration & image size dropdowns
            document.getElementById('durationDropdown').style.display = isVideo ? 'block' : 'none';
            document.getElementById('sizeDropdown').style.display = isVideo ? 'none' : 'block';

            // Update model menu and display text
            const modelMenu = document.getElementById('modelMenu');
            const modelText = document.getElementById('modelText');
            if (isVideo) {
                modelMenu.innerHTML = '<div class="param-option active" onclick="selectModel(\'agnes-video-2.5-flash\', \'Video 2.5 Flash\')">Video 2.5 Flash</div>';
                modelText.textContent = 'Video 2.5 Flash';
                currentModel = 'agnes-video-2.5-flash';
            } else {
                modelMenu.innerHTML = '<div class="param-option active" onclick="selectModel(\'agnes-image-2.5-flash\', \'Image 2.5\')">Image 2.5 Flash</div>';
                modelText.textContent = 'Image 2.5';
                currentModel = 'agnes-image-2.5-flash';
            }

            // Update ratio menu and display text
            const ratioMenu = document.getElementById('ratioMenu');
            const ratioText = document.getElementById('ratioText');
            if (isVideo) {
                ratioMenu.innerHTML = VIDEO_ASPECT_RATIOS.map((ratio, i) =>
                    `<div class="param-option${i === 1 ? ' active' : ''}" onclick="selectRatio('${ratio}', '${ratio}')">${ratio}</div>`
                ).join('');
                ratioText.textContent = '16:9';
            } else {
                ratioMenu.innerHTML = buildImageRatioMenu();
                ratioText.textContent = DEFAULT_IMAGE_RATIO;
                resetImageSizeMenu();
            }

            // Update duration menu based on model type
            updateDurationMenu(currentModel);
        }

        let selectedSeconds = '5';

        function updateDurationMenu(model) {
            const durationMenu = document.getElementById('durationMenu');
            if (!durationMenu) return;

            durationMenu.innerHTML = VIDEO_DURATION_OPTIONS.map((opt, i) =>
                `<div class="param-option${i === 1 ? ' active' : ''}" onclick="selectDuration(${opt.seconds}, '${opt.label}')">${opt.label}</div>`
            ).join('');
            selectedSeconds = '5';
            document.getElementById('durationText').textContent = '5 秒';
        }

        function selectDuration(value, text, sourceEvent = window.event) {
            selectedSeconds = String(value);
            document.getElementById('durationText').textContent = text;
            document.querySelectorAll('#durationDropdown .param-option').forEach(o => o.classList.remove('active'));
            sourceEvent?.target?.classList.add('active');
            toggleDropdown('durationDropdown');
        }

        function selectModel(value, text, sourceEvent = window.event) {
            currentModel = value;
            document.getElementById('modelText').textContent = text;
            document.querySelectorAll('#modelDropdown .param-option').forEach(o => o.classList.remove('active'));
            updateDurationMenu(value);
            sourceEvent?.target?.classList.add('active');
            toggleDropdown('modelDropdown');
        }

        function selectImageSize(value, sourceEvent = window.event) {
            selectedImageSize = value;
            document.getElementById('sizeText').textContent = value;
            document.querySelectorAll('#sizeDropdown .param-option').forEach(o => o.classList.remove('active'));
            sourceEvent?.target?.classList.add('active');
            toggleDropdown('sizeDropdown');
        }

        function selectRatio(value, text, sourceEvent = window.event) {
            document.getElementById('ratioText').textContent = text;
            document.querySelectorAll('#ratioDropdown .param-option').forEach(o => o.classList.remove('active'));
            sourceEvent?.target?.classList.add('active');
            toggleDropdown('ratioDropdown');
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.param-dropdown')) {
                document.querySelectorAll('.param-dropdown').forEach(d => d.classList.remove('active'));
            }
        });

        function toast(msg, type = 'info') {
            const el = document.createElement('div');
            el.className = `toast ${type}`;
            el.textContent = msg;
            document.getElementById('toastContainer').appendChild(el);
            setTimeout(() => el.remove(), 3000);
        }

        function logImageGenerationPayload(body, mode) {
            if (mode !== 'img2img') return;

            const imageList = Array.isArray(body?.extra_body?.image) ? body.extra_body.image : [];
            console.debug('Agnes img2img payload preview:', {
                model: body.model,
                size: body.size,
                ratio: body.ratio,
                promptLength: body.prompt?.length || 0,
                extra_body: {
                    response_format: body?.extra_body?.response_format,
                    imageCount: imageList.length,
                    imageLengths: imageList.map(image => image?.length || 0)
                }
            });
        }

        // 联网搜索实现（通过服务器代理）
        async function searchBaiduViaProxy(query) {
            const response = await fetch(`${UPLOAD_SERVER}/search-baidu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await response.json();
            if (data.success && data.results) {
                return data.results;
            }
            return null;
        }

        async function searchTavilyViaProxy(query) {
            const response = await fetch(`${UPLOAD_SERVER}/search-tavily`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await response.json();
            if (data.success && data.result) {
                return data.result;
            }
            return null;
        }

        // 主搜索函数（百度优先，Tavily 备用）
        async function searchWeb(query) {
            try {
                let result = null;

                // 优先使用百度千帆
                try {
                    result = await searchBaiduViaProxy(query);
                } catch (e) {
                    console.warn('百度搜索失败:', e.message);
                }

                // 百度失败时使用 Tavily
                if (!result) {
                    try {
                        result = await searchTavilyViaProxy(query);
                    } catch (e) {
                        console.warn('Tavily 搜索失败:', e.message);
                    }
                }

                if (result) {
                    return `【搜索结果】查询: ${query}\n\n${result}\n\n【指令】请基于以上信息，整理总结并直接回答用户的问题。`;
                }

                return `【搜索结果】未找到关于"${query}"的信息。`;
            } catch (error) {
                return `【搜索错误】${error.message}`;
            }
        }

        // 加载历史结果（只在生成模式下显示）
        async function loadResults() {
            try {
                const results = await getAllResults();
                if (results.length > 0) {
                    const grid = document.getElementById('resultsGrid');
                    results.forEach(item => renderResult(item, grid, false));
                }
                syncResultsVisibility();
            } catch (e) {
                console.error('加载结果失败:', e);
            }
        }

        // 添加新结果
        async function addResult(type, url, prompt, meta = {}) {
            const item = { type, url, prompt, id: Date.now(), ...meta };
            await saveResult(item);

            const grid = document.getElementById('resultsGrid');
            renderResult(item, grid, true);
            syncResultsVisibility();
        }

        function getImageSizeText(item, media) {
            if (media?.naturalWidth && media?.naturalHeight) return `${media.naturalWidth}x${media.naturalHeight}`;
            if (item?.actualSize && /^\d+x\d+$/.test(item.actualSize)) return item.actualSize;
            if (item?.requestedSize && /^\d+x\d+$/.test(item.requestedSize)) return item.requestedSize;
            if (item?.size && /^\d+x\d+$/.test(item.size)) return item.size;
            return '';
        }

        // 渲染结果卡片
        function renderResult(item, grid, prepend) {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.dataset.id = item.id;
            card.onclick = () => openPreview(item);

            const media = document.createElement(item.type === 'video' ? 'video' : 'img');
            media.className = item.type === 'video' ? 'result-video' : 'result-media';
            media.src = item.url;
            if (item.type === 'video') media.muted = true;
            card.appendChild(media);

            const badge = document.createElement('span');
            badge.className = 'result-badge';
            badge.textContent = item.type === 'video' ? '视频' : '图片';
            card.appendChild(badge);

            if (item.type === 'image') {
                const sizeBadge = document.createElement('span');
                sizeBadge.className = 'result-size-badge';
                const initialSize = getImageSizeText(item, media);
                if (initialSize) {
                    sizeBadge.textContent = initialSize;
                    sizeBadge.classList.add('visible');
                }
                media.addEventListener('load', async () => {
                    const resolvedSize = getImageSizeText(item, media);
                    if (!resolvedSize) return;
                    sizeBadge.textContent = resolvedSize;
                    sizeBadge.classList.add('visible');
                    if (item.actualSize !== resolvedSize || item.size !== resolvedSize) {
                        item.actualSize = resolvedSize;
                        item.size = resolvedSize;
                        try {
                            await saveResult(item);
                        } catch (error) {
                            console.warn('保存图片尺寸失败:', error);
                        }
                    }
                }, { once: !item.size });
                card.appendChild(sizeBadge);
            }

            const actions = document.createElement('div');
            actions.className = 'result-actions';

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'result-action-btn result-action-download';
            downloadBtn.textContent = '下载';
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                downloadFile(item.url, item.type === 'video' ? 'video.mp4' : 'image.png');
            };
            actions.appendChild(downloadBtn);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'result-action-btn result-action-remove';
            removeBtn.textContent = '删除';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeResult(item.id);
            };
            actions.appendChild(removeBtn);
            card.appendChild(actions);

            if (prepend) {
                grid.prepend(card);
            } else {
                grid.appendChild(card);
            }
        }

        // 删除结果
        async function removeResult(id) {
            // 确保 id 是数字类型
            const numericId = parseInt(id, 10);
            await deleteResult(numericId);

            const card = document.querySelector(`.result-card[data-id="${id}"]`);
            if (card) card.remove();

            await getAllResults();
            syncResultsVisibility();
        }

        function switchTab(el) {
            document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
            el.classList.add('active');
            const mode = el.dataset.mode;
            document.getElementById('generateMode').style.display = mode === 'generate' ? 'block' : 'none';
            document.getElementById('chatMode').classList.toggle('active', mode === 'chat');
            syncResultsVisibility();
        }

        // 图片数量限制
        const MAX_IMAGES = {
            'img2img': 4,    // 图生图最多4张
            'img2video': 4   // 图生视频最多4张
        };

        function handleUpload(input) {
            const files = Array.from(input.files);
            const maxImages = MAX_IMAGES[currentGenMode] || 4;
            const remaining = maxImages - uploadImages.length;

            if (remaining <= 0) {
                toast(`最多上传 ${maxImages} 张图片`, 'error');
                input.value = '';
                return;
            }

            const filesToAdd = files.slice(0, remaining);
            if (files.length > remaining) {
                toast(`已添加 ${remaining} 张，最多 ${maxImages} 张`, 'info');
            }

            filesToAdd.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadImages.push({ file, dataUrl: e.target.result });
                    updateUploadPreview();
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        }

        function updateUploadPreview() {
            const area = document.getElementById('uploadArea');
            const placeholder = document.getElementById('uploadPlaceholder');
            const preview = document.getElementById('uploadPreview');

            if (uploadImages.length === 0) {
                placeholder.style.display = 'flex';
                preview.style.display = 'none';
                area.classList.remove('has-images');
                return;
            }

            placeholder.style.display = 'none';
            preview.style.display = 'flex';
            preview.style.flexWrap = 'wrap';
            preview.style.gap = '4px';
            area.classList.add('has-images');

            preview.replaceChildren();
            uploadImages.forEach((img, i) => {
                const item = document.createElement('div');
                item.className = 'upload-preview-item';

                const image = document.createElement('img');
                image.src = img.dataUrl;
                item.appendChild(image);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'upload-remove';
                removeBtn.textContent = '×';
                removeBtn.onclick = (event) => {
                    event.stopPropagation();
                    removeUpload(i);
                };
                item.appendChild(removeBtn);
                preview.appendChild(item);
            });

            const addBtn = document.createElement('div');
            addBtn.className = 'upload-add';
            addBtn.textContent = '+';
            addBtn.onclick = (event) => {
                event.stopPropagation();
                document.getElementById('fileInput').click();
            };
            preview.appendChild(addBtn);
        }

        function removeUpload(index) {
            uploadImages.splice(index, 1);
            updateUploadPreview();
        }

        function openModal() {
            document.getElementById('apiKeyInput').value = apiKey;
            document.getElementById('apiKeyModal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('apiKeyModal').classList.remove('active');
        }

        function saveApiKey() {
            apiKey = document.getElementById('apiKeyInput').value.trim();
            if (!apiKey) { toast('请输入 API Key', 'error'); return; }
            localStorage.setItem('agnes_api_key', apiKey);
            document.getElementById('statusDot').classList.add('active');
            closeModal();
            toast('API Key 已保存', 'success');
        }

        function openPreview(item) {
            const modal = document.getElementById('previewModal');
            const body = document.getElementById('previewBody');
            const downloadBtn = document.getElementById('previewDownload');
            const { type, url, prompt } = item;

            // Detach shared download button before rebuilding body.
            if (downloadBtn) downloadBtn.remove();

            body.replaceChildren();
            body.className = type === 'image' ? 'preview-body preview-body-image' : 'preview-body preview-body-video';

            const mediaWrap = document.createElement('div');
            mediaWrap.className = 'preview-media-wrap';

            if (type === 'image') {
                const image = document.createElement('img');
                image.src = url;
                image.alt = prompt || '生成图片预览';
                mediaWrap.appendChild(image);
            } else {
                const media = document.createElement('video');
                media.src = url;
                media.controls = true;
                media.autoplay = true;
                media.playsInline = true;
                media.preload = 'metadata';
                mediaWrap.appendChild(media);
            }

            const sideWrap = document.createElement('div');
            sideWrap.className = 'preview-side-wrap';

            const promptPanel = document.createElement('div');
            promptPanel.className = 'preview-prompt-panel';

            const promptHeader = document.createElement('div');
            promptHeader.className = 'preview-prompt-header';

            const promptTitle = document.createElement('div');
            promptTitle.className = 'preview-prompt-title';
            promptTitle.textContent = '提示词';
            promptHeader.appendChild(promptTitle);

            const headerActions = document.createElement('div');
            headerActions.className = 'preview-prompt-actions';

            // Keep the shared download button in the prompt header action group.
            if (downloadBtn) headerActions.appendChild(downloadBtn);

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'preview-prompt-copy';
            copyBtn.textContent = '复制';
            copyBtn.onclick = () => copyPreviewPrompt(prompt || '');
            headerActions.appendChild(copyBtn);

            promptHeader.appendChild(headerActions);
            promptPanel.appendChild(promptHeader);

            const promptText = document.createElement('div');
            promptText.className = 'preview-prompt-text';
            promptText.textContent = prompt || '未记录提示词';
            promptPanel.appendChild(promptText);

            sideWrap.appendChild(promptPanel);
            body.appendChild(mediaWrap);
            body.appendChild(sideWrap);

            const ext = type === 'video' || String(url).includes('.mp4') ? 'mp4' : 'png';
            if (downloadBtn) {
                downloadBtn.onclick = () => downloadFile(url, `agnes-${Date.now()}.${ext}`);
            }
            modal.classList.add('active');
            document.body.classList.add('preview-open');
        }

        async function copyPreviewPrompt(text) {
            if (!text) {
                toast('没有可复制的提示词', 'error');
                return;
            }

            try {
                await navigator.clipboard.writeText(text);
                toast('提示词已复制', 'success');
            } catch (error) {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                toast('提示词已复制', 'success');
            }
        }

        function closePreview() {
            const video = document.getElementById('previewBody').querySelector('video');
            if (video) video.pause();
            document.getElementById('previewModal').classList.remove('active');
            document.body.classList.remove('preview-open');
        }

        // 提示词优化模板
        const optimizeTemplates = {
            // 通用高质量
            general: 'high quality, detailed, professional, sharp focus, 4K resolution',
            // 人像
            portrait: 'professional portrait photography, soft natural lighting, shallow depth of field, bokeh background, 8K quality',
            // 风景
            landscape: 'breathtaking landscape, golden hour lighting, dramatic sky, ultra-wide angle, photorealistic, 8K',
            // 产品
            product: 'professional product photography, studio lighting, clean white background, high detail, commercial quality',
            // 动漫/插画
            anime: 'anime style, vibrant colors, detailed illustration, clean lines, studio ghibli style, masterpiece',
            // 电影感
            cinematic: 'cinematic shot, film grain, dramatic lighting, anamorphic lens, movie still quality, color grading',
            // 建筑
            architecture: 'modern architecture, clean lines, dramatic perspective, golden hour, professional photography',
            // 食物
            food: 'professional food photography, appetizing, studio lighting, macro detail, commercial quality'
        };

        let lastPrompt = null; // 保存优化前的提示词

        function optimizePrompt() {
            const input = document.getElementById('promptInput').value.trim();
            if (!input) { toast('请输入提示词', 'error'); return; }

            // 如果已经优化过，执行撤回
            if (lastPrompt !== null && input !== lastPrompt) {
                document.getElementById('promptInput').value = lastPrompt;
                lastPrompt = null;
                togglePromptClearButton();
                toast('已撤回优化', 'success');
                return;
            }

            // 保存原始提示词
            lastPrompt = input;

            // 分析提示词内容，选择合适的优化模板
            let optimized = input;
            const lowerInput = input.toLowerCase();

            // 检测关键词并选择优化模板
            if (lowerInput.includes('人') || lowerInput.includes('portrait') || lowerInput.includes('girl') || lowerInput.includes('boy') || lowerInput.includes('woman') || lowerInput.includes('man')) {
                optimized += ', ' + optimizeTemplates.portrait;
            } else if (lowerInput.includes('风景') || lowerInput.includes('landscape') || lowerInput.includes('mountain') || lowerInput.includes('sea') || lowerInput.includes('sky')) {
                optimized += ', ' + optimizeTemplates.landscape;
            } else if (lowerInput.includes('产品') || lowerInput.includes('product') || lowerInput.includes('商品')) {
                optimized += ', ' + optimizeTemplates.product;
            } else if (lowerInput.includes('动漫') || lowerInput.includes('anime') || lowerInput.includes('卡通') || lowerInput.includes('插画')) {
                optimized += ', ' + optimizeTemplates.anime;
            } else if (lowerInput.includes('电影') || lowerInput.includes('cinematic') || lowerInput.includes('大片')) {
                optimized += ', ' + optimizeTemplates.cinematic;
            } else if (lowerInput.includes('建筑') || lowerInput.includes('architecture') || lowerInput.includes('房子')) {
                optimized += ', ' + optimizeTemplates.architecture;
            } else if (lowerInput.includes('食物') || lowerInput.includes('food') || lowerInput.includes('美食')) {
                optimized += ', ' + optimizeTemplates.food;
            } else {
                optimized += ', ' + optimizeTemplates.general;
            }

            document.getElementById('promptInput').value = optimized;
            togglePromptClearButton();
            toast('已优化提示词，再次点击可撤回', 'success');
        }

        async function generate() {
            if (!apiKey) { openModal(); return; }
            const prompt = document.getElementById('promptInput').value.trim();
            if (!prompt) { toast('请输入提示词', 'error'); return; }
            if ((currentGenMode === 'img2img' || currentGenMode === 'img2video') && uploadImages.length === 0) {
                toast('请上传参考图片', 'error'); return;
            }

            const btn = document.getElementById('generateBtn');
            btn.disabled = true;
            showGenerationStatus('准备生成...');

            try {
                if (currentGenMode === 'text2video' || currentGenMode === 'img2video') {
                    await generateVideo(prompt);
                } else {
                    await generateImage(prompt);
                }
                hideGenerationStatus();
            } catch (e) {
                showErrorStatus(e.message || '生成失败');
                toast(e.message || '生成失败', 'error');
            } finally {
                btn.disabled = false;
            }
        }

        async function generateImage(prompt) {
            updateGenerationStatus('正在生成图片...');

            const ratio = IMAGE_OUTPUT_SIZES[document.getElementById('ratioText').textContent]
                ? document.getElementById('ratioText').textContent : DEFAULT_IMAGE_RATIO;
            const size = IMAGE_SIZE_TIERS.includes(selectedImageSize) ? selectedImageSize : DEFAULT_IMAGE_SIZE;
            let body = { model: currentModel, prompt, size, ratio };

            // 图生图支持多张参考图
            if (currentGenMode === 'img2img' && uploadImages.length > 0) {
                updateGenerationStatus('正在处理参考图片...');
                const images = [];
                for (const img of uploadImages) {
                    const dataUrl = await toBase64(img.file);
                    images.push(dataUrl);
                }
                body.extra_body = {
                    image: images,
                    response_format: 'url'
                };
            }

            logImageGenerationPayload(body, currentGenMode);

            const res = await fetch('https://apihub.agnes-ai.cn/v1/images/generations', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            if (data.data?.[0]?.url) {
                addResult('image', data.data[0].url, prompt, { requestedSize: IMAGE_OUTPUT_SIZES[ratio]?.[size] || '' });
                toast('生成成功', 'success');
            }
        }

        async function generateVideo(prompt) {
            updateGenerationStatus('正在准备视频生成...');

            const sizeText = document.getElementById('ratioText').textContent;
            let body = {
                model: currentModel,
                prompt,
                seconds: selectedSeconds,
                mode: 'text',
                size: '720P',
                aspect_ratio: sizeText || '16:9'
            };

            // 图生视频直接把参考图的 base64 编码传给视频接口，避免依赖代理服务器写盘。
            if (currentGenMode === 'img2video' && uploadImages.length > 0) {
                updateGenerationStatus('正在处理参考图片...');
                const images = [];

                for (let i = 0; i < uploadImages.length; i++) {
                    updateGenerationStatus(`正在编码参考图片 ${i + 1}/${uploadImages.length}...`);
                    const dataUrl = await toBase64(uploadImages[i].file);
                    images.push(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
                }

                body.mode = 'reference';
                body.images = images;
            }

            updateGenerationStatus('正在提交视频生成任务...');

            // 使用 AbortController 设置超时（10分钟，18秒视频需要较长生成时间）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 600000);

            const res = await fetch('https://apihub.agnes-ai.cn/v1/videos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            if (data.video_id) {
                updateGenerationStatus('视频生成中，请稍候...');
                await pollVideo(data.video_id);
            } else {
                throw new Error('未返回 video_id');
            }
        }

        async function pollVideo(videoId) {
            let attempts = 0;
            const maxAttempts = 60; // 最多轮询 5 分钟

            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 5000));
                attempts++;

                // 更新状态显示
                const elapsed = Math.floor((Date.now() - statusStartTime) / 1000);
                updateGenerationStatus(`视频生成中... 已等待 ${elapsed} 秒`);

                try {
                    const res = await fetch(`https://apihub.agnes-ai.cn/agnesapi?video_id=${videoId}&model_name=${currentModel}`, {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    const data = await res.json();

                    // 检查是否有错误
                    if (data.error) {
                        console.error('视频生成错误:', data.error);
                        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
                        throw new Error(errorMsg);
                    }

                    if (data.status === 'completed') {
                        const url = data.remixed_from_video_id || data.url;
                        if (url) {
                            addResult('video', url, document.getElementById('promptInput').value);
                            toast('视频生成成功', 'success');
                        }
                        return;
                    }

                    if (data.status === 'failed') {
                        const errorMsg = data.error || '视频生成失败';
                        throw new Error(errorMsg);
                    }
                } catch (error) {
                    console.error('轮询错误:', error);
                    if (error.message.includes('Failed to fetch')) {
                        continue;
                    }
                    throw error;
                }
            }

            throw new Error('视频生成超时，请稍后重试');
        }

        // 生成状态显示
        let statusStartTime = null;
        let statusInterval = null;

        function showGenerationStatus(message) {
            const statusEl = document.getElementById('generationStatus');
            const iconEl = document.getElementById('statusIcon');
            const textEl = document.getElementById('statusText');
            const timeEl = document.getElementById('statusTime');

            statusEl.classList.add('active');
            iconEl.textContent = '进行中';
            iconEl.classList.add('loading');
            textEl.textContent = message;
            timeEl.textContent = '0s';
            statusStartTime = Date.now();

            // 更新计时器
            if (statusInterval) clearInterval(statusInterval);
            statusInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - statusStartTime) / 1000);
                timeEl.textContent = `${elapsed}s`;
            }, 1000);
        }

        function updateGenerationStatus(message) {
            const textEl = document.getElementById('statusText');
            textEl.textContent = message;
        }

        function hideGenerationStatus() {
            const statusEl = document.getElementById('generationStatus');
            const iconEl = document.getElementById('statusIcon');
            const timeEl = document.getElementById('statusTime');

            iconEl.textContent = '完成';
            iconEl.classList.remove('loading');
            updateGenerationStatus('完成');
            timeEl.textContent = '';

            setTimeout(() => {
                statusEl.classList.remove('active');
                if (statusInterval) {
                    clearInterval(statusInterval);
                    statusInterval = null;
                }
            }, 1500);
        }

        function showErrorStatus(message) {
            const statusEl = document.getElementById('generationStatus');
            const iconEl = document.getElementById('statusIcon');
            const textEl = document.getElementById('statusText');
            const timeEl = document.getElementById('statusTime');

            statusEl.classList.add('active');
            iconEl.textContent = '失败';
            iconEl.classList.remove('loading');
            textEl.textContent = message;
            timeEl.textContent = '';
            statusEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            statusEl.style.color = 'rgba(239, 68, 68, 0.8)';
            if (statusInterval) {
                clearInterval(statusInterval);
                statusInterval = null;
            }

            setTimeout(() => {
                statusEl.classList.remove('active');
                statusEl.style.borderColor = '';
                statusEl.style.color = '';
            }, 3000);
        }

        // 文本对话模型
        let chatModel = 'agnes-2.5-flash';

        function selectChatModel(value, text, sourceEvent = window.event) {
            chatModel = value;
            document.getElementById('chatModelText').textContent = text;
            document.querySelectorAll('#chatModelMenu .param-option').forEach(o => o.classList.remove('active'));
            sourceEvent?.target?.classList.add('active');
            toggleDropdown('chatModelDropdown');
        }

        // 清空对话
        function clearChat() {
            chatHistory = [];
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.replaceChildren();
            addChatMsg('assistant', '你好，我是 Agnes AI 助手。你可以直接提问，也可以上传图片让我分析。');
            toast('对话已清空', 'success');
        }

        // 放大对话（弹窗模式）
        function expandChat() {
            const modal = document.getElementById('chatModal');
            const messages = document.getElementById('modalMessages');
            const chatMessages = document.getElementById('chatMessages');

            // 复制已渲染的安全节点到弹窗
            messages.replaceChildren(...Array.from(chatMessages.children).map(node => node.cloneNode(true)));

            modal.classList.add('active');
        }

        // 关闭弹窗
        function closeChatModal() {
            const modal = document.getElementById('chatModal');
            modal.classList.remove('active');
        }

        // 下载文件（使用服务器代理）
        async function downloadFile(url, filename) {
            try {
                toast('正在下载...', 'info');

                // 使用服务器代理下载
                const response = await fetch(`${UPLOAD_SERVER}/proxy-download`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                    toast('下载完成', 'success');
                } else {
                    throw new Error('下载失败');
                }
            } catch (e) {
                // 备用方案：打开新窗口
                window.open(url, '_blank');
            }
        }

        function toBase64(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        // 服务器地址（HTTPS + 子目录）
        const UPLOAD_SERVER = 'https://ailabing.cn/tools/agnes-creative-space';

        // Chat - 多图支持
        let chatImages = [];

        // Skill 知识库
        const skillKnowledge = `
你是 Agnes AI 的技术支持助手，专门帮助用户解决 API 配置和使用问题。你具备联网搜索能力，可以查询最新的信息。

## 可用模型
- agnes-2.5-flash: 通用对话/高并发（推荐）
- agnes-2.0-flash: 编程/Agent/推理
- agnes-image-2.5-flash: 图像生成
- agnes-video-2.5-flash: 视频快速生成（推荐）

## API 配置
- Base URL: https://apihub.agnes-ai.cn/v1
- 认证方式: Authorization: Bearer YOUR_API_KEY
- 获取 Key: https://platform.agnes-ai.com

## 常见问题
1. 401 错误: API Key 无效或过期
2. 400 错误: 参数格式错误
3. 429 错误: 请求过于频繁（RPM 限制 20）
4. 500/503 错误: 服务器繁忙，稍后重试

## 图片尺寸注意
- size 推荐用档位 "1K" / "2K" / "3K" / "4K"，配合 ratio 使用
- ratio 支持 1:1、3:4、4:3、16:9、9:16、2:3、3:2、21:9，默认 1:1
- 1920x1080、2560x1440 等精确尺寸不是原生输出尺寸，会被归一化（如 16:9 的 1K 输出为 1312x736）
- 想要 16:9 显示素材，建议 size = "2K" + ratio = "16:9"（输出 2624x1472），再在下游裁剪

## 图生图注意
- image 参数放在 extra_body.image 中
- 建议同时传 extra_body.response_format = "url"
- 格式: extra_body.image = ["data:image/png;base64,..."]，需要传完整 Data URI Base64；多图时使用数组

## 图生视频注意
- mode = "reference" 时，images 最多传 5 张
- 查询任务时必须带 model_name = "agnes-video-2.5-flash"

## 视频生成注意
- size 固定为 "720P"
- seconds 支持字符串 "4"-"12"，默认 "5"
- aspect_ratio 支持 21:9、16:9、4:3、1:1、3:4、9:16
- 必须用 video_id 查询，不要用 task_id
- 轮询间隔建议 5 秒

## 联网搜索
当你需要查询最新信息、历史沿革、新闻或验证某个说法时，优先使用 search_web 工具。
请通过 API 的 tool_calls 机制调用工具，不要把 <tool_call>、<function=...> 或思考过程直接输出给用户。
拿到搜索结果后，用简洁中文直接回答用户问题。
        `;

        // 联网搜索工具定义
        const searchTool = {
            type: "function",
            function: {
                name: "search_web",
                description: "搜索网络获取最新信息",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "搜索关键词"
                        }
                    },
                    required: ["query"]
                }
            }
        };

        function handleChatUpload(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    chatImages.push(e.target.result);
                    updateChatPreview();
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        }

        function updateChatPreview() {
            const container = document.getElementById('chatPreview');
            if (chatImages.length === 0) {
                container.replaceChildren();
                container.className = '';
                return;
            }
            container.className = 'chat-preview';
            container.replaceChildren();
            chatImages.forEach((src, i) => {
                const item = document.createElement('div');
                item.className = 'chat-preview-item';

                const image = document.createElement('img');
                image.src = src;
                item.appendChild(image);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'chat-preview-remove';
                removeBtn.textContent = '×';
                removeBtn.onclick = () => removeChatImage(i);
                item.appendChild(removeBtn);
                container.appendChild(item);
            });
        }

        function removeChatImage(index) {
            chatImages.splice(index, 1);
            updateChatPreview();
        }

        function handleChatPaste(e) {
            const items = Array.from(e.clipboardData?.items || []);
            items.forEach(item => {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        chatImages.push(ev.target.result);
                        updateChatPreview();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, (char) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[char]);
        }

        function stripThinkingContent(text) {
            let cleaned = String(text ?? '');

            // Drop paired thinking blocks first.
            cleaned = cleaned
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
                .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');

            // Some responses only include a closing think tag.
            if (/<\/think>/i.test(cleaned)) {
                cleaned = cleaned.split(/<\/think>/i).pop() || '';
            }
            if (/<\/thinking>/i.test(cleaned)) {
                cleaned = cleaned.split(/<\/thinking>/i).pop() || '';
            }

            return cleaned
                .replace(/<\/?think>/gi, '')
                .replace(/<\/?thinking>/gi, '')
                .replace(/<\/?reasoning>/gi, '')
                .trim();
        }

        function extractTextToolCalls(text) {
            const source = String(text ?? '');
            const calls = [];

            const pushCall = (query) => {
                const cleaned = String(query || '').trim();
                if (!cleaned) return;
                calls.push({
                    id: `text_call_${Date.now()}_${calls.length}`,
                    type: 'function',
                    function: {
                        name: 'search_web',
                        arguments: JSON.stringify({ query: cleaned })
                    }
                });
            };

            const xmlBlock = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
            let match;
            while ((match = xmlBlock.exec(source)) !== null) {
                const block = match[1];
                const nameMatch = block.match(/<function=([a-zA-Z0-9_]+)>/i) || block.match(/name=["']?([a-zA-Z0-9_]+)/i);
                const queryMatch = block.match(/<parameter=query>\s*([\s\S]*?)\s*<\/parameter>/i)
                    || block.match(/"query"\s*:\s*"([^"]+)"/i)
                    || block.match(/query["'\s:=]+([^\n<]+)/i);
                if ((nameMatch?.[1] || 'search_web') === 'search_web' && queryMatch?.[1]) {
                    pushCall(queryMatch[1]);
                }
            }

            if (calls.length === 0) {
                const bareFn = /<function=search_web>([\s\S]*?)(?:<\/function>|$)/gi;
                while ((match = bareFn.exec(source)) !== null) {
                    const block = match[1];
                    const queryMatch = block.match(/<parameter=query>\s*([\s\S]*?)\s*<\/parameter>/i)
                        || block.match(/query["'\s:=]+([^\n<]+)/i);
                    if (queryMatch?.[1]) pushCall(queryMatch[1]);
                }
            }

            return calls;
        }

        function sanitizeAssistantReply(text) {
            let cleaned = stripThinkingContent(text);
            cleaned = cleaned
                .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
                .replace(/<function=[^>]*>[\s\S]*?(?:<\/function>|$)/gi, '')
                .replace(/<\/?tool_call>/gi, '')
                .replace(/<\/?function[^>]*>/gi, '')
                .replace(/<\/?parameter[^>]*>/gi, '')
                .replace(/^\s*继续\s*$/gm, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            return cleaned;
        }

        function getAssistantToolCalls(message, finishReason) {
            if (Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
                return message.tool_calls;
            }
            const content = message?.content || '';
            if (finishReason === 'tool_calls' || /<tool_call>|<function=search_web>/i.test(content)) {
                return extractTextToolCalls(content);
            }
            return [];
        }

        async function requestChatCompletion(body) {
            let retries = 3;
            let data;
            while (retries > 0) {
                const res = await fetch('https://apihub.agnes-ai.cn/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                data = await res.json();

                if (data.error && data.error.message?.includes('No deployments available')) {
                    retries--;
                    if (retries > 0) {
                        addChatMsg('assistant', '模型繁忙，正在重试...');
                        await new Promise(r => setTimeout(r, 3000));
                        continue;
                    }
                }
                break;
            }
            if (data?.error) throw new Error(data.error.message || '请求失败');
            return data;
        }

        function formatReply(text) {
            return escapeHtml(sanitizeAssistantReply(text))
                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        }

        async function sendChat() {
            const input = document.getElementById('chatInput');
            const sendBtn = document.querySelector('.chat-send');
            const text = input.value.trim();
            if (!text && chatImages.length === 0) return;
            if (!apiKey) { openModal(); return; }

            const userMsg = text || `请分析这 ${chatImages.length} 张图片`;
            addChatMsg('user', userMsg, chatImages);
            input.value = '';

            const content = [];
            chatImages.forEach(img => content.push({ type: 'image_url', image_url: { url: img } }));
            if (text) content.push({ type: 'text', text: text });

            // 构建消息历史，包含 skill 知识库和当前日期时间
            const now = new Date();
            const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()]}`;
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const systemPrompt = skillKnowledge + `\n\n【当前时间信息】日期：${dateStr}，时间：${timeStr}。当用户询问日期、时间、天气、新闻、股票、历史沿革等需要外部资料的信息时，请使用 search_web 工具搜索获取最新信息，并通过 tool_calls 调用，不要把工具调用原文或思考过程直接输出给用户。`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...chatHistory,
                { role: 'user', content: content.length === 1 && content[0].type === 'text' ? text : content }
            ];

            chatHistory.push({ role: 'user', content: content.length === 1 && content[0].type === 'text' ? text : content });

            chatImages = [];
            updateChatPreview();

            // 显示思考中状态
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span> 思考中';

            try {
                const maxToolRounds = 3;
                let round = 0;
                let finalReply = '';

                while (round <= maxToolRounds) {
                    const data = await requestChatCompletion({
                        model: chatModel,
                        messages: messages,
                        tools: [searchTool],
                        tool_choice: 'auto',
                        thinking: {
                            type: 'enabled',
                            budget_tokens: 2048
                        }
                    });

                    const choice = data.choices?.[0];
                    const message = choice?.message || {};
                    const toolCalls = getAssistantToolCalls(message, choice?.finish_reason);

                    if (toolCalls.length > 0 && round < maxToolRounds) {
                        const formalToolCalls = Array.isArray(message.tool_calls) && message.tool_calls.length > 0
                            ? toolCalls
                            : null;

                        if (formalToolCalls) {
                            messages.push({
                                role: 'assistant',
                                content: sanitizeAssistantReply(message.content) || null,
                                tool_calls: formalToolCalls
                            });
                        } else {
                            // Text-emulated tool calls: feed results as plain context instead of fake tool IDs.
                            const note = sanitizeAssistantReply(message.content);
                            if (note) {
                                messages.push({ role: 'assistant', content: note });
                            }
                        }

                        const resultChunks = [];
                        for (const toolCall of toolCalls) {
                            if (toolCall?.function?.name !== 'search_web') continue;

                            let args = {};
                            try {
                                args = JSON.parse(toolCall.function.arguments || '{}');
                            } catch (error) {
                                args = { query: String(toolCall.function.arguments || '').trim() };
                            }

                            const query = String(args.query || '').trim();
                            if (!query) continue;

                            addChatMsg('assistant', `正在搜索: ${query}...`);
                            const searchResult = await searchWeb(query);

                            if (formalToolCalls) {
                                messages.push({
                                    role: 'tool',
                                    tool_call_id: toolCall.id || `tool_${Date.now()}_${round}`,
                                    content: searchResult
                                });
                            } else {
                                resultChunks.push(searchResult);
                            }
                        }

                        if (!formalToolCalls && resultChunks.length > 0) {
                            messages.push({
                                role: 'user',
                                content: resultChunks.join('\n\n') + '\n\n请基于以上搜索结果，直接用中文回答我的问题，不要输出工具调用或思考过程。'
                            });
                        }

                        round += 1;
                        continue;
                    }

                    // Never surface reasoning_content / raw tool text to the user.
                    finalReply = sanitizeAssistantReply(message.content || '');
                    if (!finalReply && message.reasoning_content) {
                        finalReply = sanitizeAssistantReply(message.reasoning_content);
                    }
                    break;
                }

                if (!finalReply) {
                    finalReply = '已完成搜索，但模型未返回可用结论。请换个问法再试。';
                }

                chatHistory.push({ role: 'assistant', content: finalReply });
                addChatMsg('assistant', finalReply);
            } catch (e) {
                addChatMsg('assistant', '错误: ' + e.message);
                toast('发送失败: ' + e.message, 'error');
            } finally {
                // 恢复按钮状态
                sendBtn.disabled = false;
                sendBtn.innerHTML = '发送';
            }
        }

        function addChatMsg(role, text, images = []) {
            const div = document.createElement('div');
            div.className = `chat-msg ${role}`;

            if (images.length > 0) {
                const imageWrap = document.createElement('div');
                imageWrap.className = 'chat-msg-images';
                images.forEach(src => {
                    const image = document.createElement('img');
                    image.className = 'chat-msg-image';
                    image.src = src;
                    imageWrap.appendChild(image);
                });
                div.appendChild(imageWrap);
            }

            const content = document.createElement('div');
            if (role === 'assistant') {
                content.innerHTML = formatReply(text);
            } else {
                content.textContent = text;
            }
            div.appendChild(content);
            document.getElementById('chatMessages').appendChild(div);
            document.getElementById('chatMessages').scrollTop = 999999;
        }
