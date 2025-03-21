// IndexDB 数据库管理
const dbName = 'devNavDB';
const dbVersion = 1;
let db;

// 初始化数据库
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = () => reject('数据库打开失败');
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('cards')) {
                const cardsStore = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
                cardsStore.createIndex('categories', 'categories', { unique: false, multiEntry: true });
                cardsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
                cardsStore.createIndex('title', 'title', { unique: false });

                cardsStore.transaction.oncomplete = () => {
                    const transaction = db.transaction(['cards'], 'readwrite');
                    const objectStore = transaction.objectStore('cards');

                    initialCards.forEach(card => {
                        const cardToAdd = {
                            ...card,
                            id: Date.now() + Math.random(),
                            createTime: new Date().toISOString(),
                            updateTime: new Date().toISOString()
                        };
                        objectStore.add(cardToAdd);
                    });
                };
            }
        };
    });
};

// 初始卡片数据
const initialCards = [
    {
        title: 'MDN Web Docs',
        description: 'Web 技术权威文档，包含 HTML、CSS、JavaScript 详细参考',
        icon: 'fas fa-book',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        categories: ['docs', 'frontend'],
        tags: ['文档', '前端', 'Web'],
        url: 'https://developer.mozilla.org',
        isFavorite: false,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
    },
    {
        title: 'GitHub',
        description: '全球最大的代码托管平台',
        icon: 'fab fa-github',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        categories: ['tools', 'devops'],
        tags: ['代码托管', '开源', '版本控制'],
        url: 'https://github.com',
        isFavorite: false,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
    },
    {
        title: 'Stack Overflow',
        description: '最受欢迎的程序员问答社区',
        icon: 'fab fa-stack-overflow',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        categories: ['community', 'learn'],
        tags: ['问答', '社区', '编程'],
        url: 'https://stackoverflow.com',
        isFavorite: false,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
    },
    {
        title: 'VS Code',
        description: '微软出品的强大代码编辑器',
        icon: 'fas fa-code',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        categories: ['tools', 'frontend', 'backend'],
        tags: ['编辑器', 'IDE', '开发工具'],
        url: 'https://code.visualstudio.com',
        isFavorite: false,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
    }
];

// Alpine.js 数据和方法
function mainData() {
    return {
        cards: [],
        selectedCard: null,
        currentCategory: 'all',
        searchQuery: '',
        drawerSearchQuery: '',
        showEditModal: false,
        showAddModal: false,
        showSearchModal: false,
        searchResults: [],
        drawerTab: 'favorites',

        // GitHub 配置
        githubConfig: {
            owner: localStorage.getItem('github_owner') || '',
            repo: localStorage.getItem('github_repo') || '',
            branch: localStorage.getItem('github_branch') || 'main',
            token: localStorage.getItem('github_token') || ''
        },

        toast: {
            show: false,
            message: '',
            type: 'success',
            timeout: null
        },

        confirmDialog: {
            show: false,
            title: '',
            message: '',
            confirmText: '确定',
            cancelText: '取消',
            confirmCallback: null,
            type: 'warning'
        },

        showToast(message, type = 'success', duration = 3000) {
            if (this.toast.timeout) {
                clearTimeout(this.toast.timeout);
            }
            
            this.toast.message = message;
            this.toast.type = type;
            this.toast.show = true;
            
            this.toast.timeout = setTimeout(() => {
                this.toast.show = false;
            }, duration);
        },

        closeToast() {
            this.toast.show = false;
            if (this.toast.timeout) {
                clearTimeout(this.toast.timeout);
            }
        },

        showConfirm(title, message, callback, type = 'warning', confirmText = '确定', cancelText = '取消') {
            this.confirmDialog.title = title;
            this.confirmDialog.message = message;
            this.confirmDialog.confirmCallback = callback;
            this.confirmDialog.type = type;
            this.confirmDialog.confirmText = confirmText;
            this.confirmDialog.cancelText = cancelText;
            this.confirmDialog.show = true;
        },

        confirmAction() {
            if (typeof this.confirmDialog.confirmCallback === 'function') {
                this.confirmDialog.confirmCallback();
            }
            this.confirmDialog.show = false;
        },

        cancelConfirm() {
            this.confirmDialog.show = false;
        },

        editingCard: {
            id: null,
            title: '',
            description: '',
            url: '',
            categories: [],
            icon: 'fas fa-link',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            customIcon: '',
            customIconColor: '',
            tags: ['未分类'],
            tagsInput: '未分类',
            isFavorite: false,
            createTime: null,
            updateTime: null
        },
        newCard: {
            title: '',
            description: '',
            url: '',
            categories: [],
            icon: 'fas fa-link',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            customIcon: '',
            customIconColor: '',
            tags: ['未分类'],
            tagsInput: '未分类',
            isFavorite: false
        },

        validateIcon(icon) {
            const iconRegex = /^(fa[bsrl]?)\s+(fa-[a-z0-9-]+)$/;
            return iconRegex.test(icon);
        },

        validateColor(color) {
            const colorRegex = /^text-(red|blue|green|yellow|purple|pink|indigo|gray)-(100|200|300|400|500|600|700|800|900)$/;
            return colorRegex.test(color);
        },

        openAddModal() {
            this.newCard = {
                title: '',
                description: '',
                url: '',
                categories: [],
                icon: 'fas fa-link',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                customIcon: '',
                customIconColor: '',
                tags: ['未分类'],
                tagsInput: '未分类',
                isFavorite: false
            };
            this.showAddModal = true;
        },

        async addCard() {
            try {
                if (this.newCard.customIcon && !this.validateIcon(this.newCard.customIcon)) {
                    this.showToast('图标格式不正确，请使用正确的 Font Awesome 格式，例如：fas fa-code', 'error');
                    return;
                }

                if (this.newCard.customIconColor && !this.validateColor(this.newCard.customIconColor)) {
                    this.showToast('颜色格式不正确，请使用正确的 Tailwind 颜色格式，例如：text-blue-600', 'error');
                    return;
                }

                const tags = this.newCard.tagsInput
                    ? this.newCard.tagsInput.split(',').map(tag => tag.trim()).filter(Boolean)
                    : ['未分类'];

                const finalIcon = this.newCard.customIcon || this.newCard.icon;
                const finalIconColor = this.newCard.customIconColor || this.newCard.iconColor;

                const cardToAdd = {
                    title: this.newCard.title || '',
                    description: this.newCard.description || '',
                    url: this.newCard.url || '',
                    categories: Array.isArray(this.newCard.categories) ? [...this.newCard.categories] : [],
                    icon: finalIcon,
                    iconBg: this.newCard.iconBg || 'bg-blue-100',
                    iconColor: finalIconColor,
                    tags: tags,
                    isFavorite: Boolean(this.newCard.isFavorite),
                    id: Date.now() + Math.random(),
                    createTime: new Date().toISOString(),
                    updateTime: new Date().toISOString()
                };

                const transaction = db.transaction(['cards'], 'readwrite');
                const objectStore = transaction.objectStore('cards');
                await objectStore.add(cardToAdd);

                await this.loadCards();
                this.showAddModal = false;
                this.resetNewCard();
                this.showToast('卡片添加成功', 'success');
            } catch (error) {
                this.showToast('添加卡片失败，请检查输入数据是否正确', 'error');
            }
        },

        async init() {
            try {
                await initDB();
                await this.loadCards();
            } catch (error) {
                this.showToast('初始化失败，请刷新页面重试', 'error');
            }
        },

        async loadCards() {
            try {
                const transaction = db.transaction(['cards'], 'readonly');
                const objectStore = transaction.objectStore('cards');
                const request = objectStore.getAll();

                return new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        this.cards = request.result.map(card => ({
                            ...card,
                            createTime: new Date(card.createTime),
                            updateTime: new Date(card.updateTime)
                        }));
                        resolve();
                    };
                    request.onerror = () => reject();
                });
            } catch (error) {
                this.showToast('加载卡片失败，请刷新页面重试', 'error');
            }
        },

        filteredCards() {
            if (!this.cards) return [];

            const searchLower = this.searchQuery.toLowerCase().trim();

            return this.cards.filter(card => {
                // 分类过滤
                if (this.currentCategory !== 'all' &&
                    (!card.categories || !card.categories.includes(this.currentCategory))) {
                    return false;
                }

                // 搜索过滤
                if (searchLower) {
                    return (
                        (card.title && card.title.toLowerCase().includes(searchLower)) ||
                        (card.description && card.description.toLowerCase().includes(searchLower)) ||
                        (card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
                        (card.categories && card.categories.some(cat => cat.toLowerCase().includes(searchLower)))
                    );
                }

                return true;
            }).sort((a, b) => {
                switch (this.sortBy) {
                    case 'hot':
                        return b.isFavorite - a.isFavorite ||
                            new Date(b.updateTime) - new Date(a.updateTime);
                    case 'newest':
                        return new Date(b.createTime) - new Date(a.createTime);
                    case 'alphabet':
                        return (a.title || '').localeCompare(b.title || '', 'zh-CN');
                    default:
                        return 0;
                }
            });
        },

        filteredDrawerCards() {
            if (!this.cards) return [];
            const searchLower = this.drawerSearchQuery.toLowerCase();

            return this.cards.filter(card =>
                card.isFavorite &&
                (!searchLower ||
                    card.title.toLowerCase().includes(searchLower) ||
                    card.description.toLowerCase().includes(searchLower))
            );
        },

        filteredAllCards() {
            if (!this.cards) return [];
            const searchLower = this.drawerSearchQuery.toLowerCase();

            return this.cards.filter(card =>
                !searchLower ||
                card.title.toLowerCase().includes(searchLower) ||
                card.description.toLowerCase().includes(searchLower)
            );
        },

        async toggleFavorite(card) {
            try {
                if (!card || typeof card.isFavorite !== 'boolean') {
                    console.error('卡片数据格式无效:', card);
                    return;
                }
                
                if (!db) {
                    console.error('数据库未初始化');
                    await initDB(); // 重新初始化数据库
                }
                
                if (!card || !card.id) {
                    console.error('无效的卡片数据:', card);
                    return;
                }

                // 创建一个可以被序列化的纯数据对象
                const cardData = {
                    id: card.id,
                    title: card.title || '',
                    description: card.description || '',
                    url: card.url || '',
                    categories: Array.isArray(card.categories) ? [...card.categories] : [],
                    icon: card.icon || '',
                    iconBg: card.iconBg || '',
                    iconColor: card.iconColor || '',
                    tags: Array.isArray(card.tags) ? [...card.tags] : [],
                    isFavorite: !card.isFavorite, // 切换收藏状态
                    createTime: typeof card.createTime === 'object' && card.createTime instanceof Date ? 
                        card.createTime.toISOString() : card.createTime,
                    updateTime: new Date().toISOString()
                };

                console.log('准备更新卡片:', cardData);

                const transaction = db.transaction(['cards'], 'readwrite');
                const objectStore = transaction.objectStore('cards');
                
                // 使用 Promise 包装 IndexedDB 操作
                await new Promise((resolve, reject) => {
                    const request = objectStore.put(cardData);
                    request.onsuccess = () => resolve();
                    request.onerror = (error) => {
                        console.error('更新卡片失败:', error);
                        reject(error);
                    };
                });

                // 更新内存中的数据
                const index = this.cards.findIndex(c => c.id === card.id);
                if (index !== -1) {
                    this.cards[index] = {
                        ...cardData,
                        createTime: new Date(cardData.createTime),
                        updateTime: new Date(cardData.updateTime)
                    };
                }
            } catch (error) {
                console.error('收藏状态更新失败:', error);
                this.showToast('更新收藏状态失败，请重试', 'error');
            }
        },

        async deleteCard(id) {
            this.showConfirm(
                '删除确认',
                '确定要删除这张卡片吗？此操作无法撤销。',
                async () => {
                    try {
                        const transaction = db.transaction(['cards'], 'readwrite');
                        const objectStore = transaction.objectStore('cards');
                        const request = objectStore.delete(id);

                        request.onsuccess = () => {
                            this.loadCards();
                            this.showToast('卡片已成功删除', 'success');
                        };

                        request.onerror = () => {
                            console.error('删除卡片失败');
                            this.showToast('删除卡片失败', 'error');
                        };
                    } catch (error) {
                        console.error('删除卡片失败:', error);
                        this.showToast('删除卡片失败', 'error');
                    }
                },
                'warning',
                '删除',
                '取消'
            );
        },

        editCard(card) {
            if (!card) {
                console.error('编辑的卡片数据为空');
                return;
            }

            this.editingCard = {
                id: card.id || Date.now(),
                title: card.title || '',
                description: card.description || '',
                url: card.url || '',
                categories: Array.isArray(card.categories) ? [...card.categories] : [],
                icon: card.icon || 'fas fa-link',
                iconBg: card.iconBg || 'bg-blue-100',
                iconColor: card.iconColor || 'text-blue-600',
                customIcon: card.customIcon || '',
                customIconColor: card.customIconColor || '',
                tags: Array.isArray(card.tags) ? [...card.tags] : ['未分类'],
                tagsInput: Array.isArray(card.tags) ? card.tags.join(', ') : '未分类',
                isFavorite: Boolean(card.isFavorite),
                createTime: card.createTime || new Date().toISOString(),
                updateTime: card.updateTime || new Date().toISOString()
            };

            console.log('正在编辑的卡片:', this.editingCard);
            this.showEditModal = true;
        },

        async saveCard() {
            try {
                if (!this.editingCard) {
                    console.error('没有要保存的卡片数据');
                    return;
                }

                if (this.editingCard.customIcon && !this.validateIcon(this.editingCard.customIcon)) {
                    this.showToast('图标格式不正确，请使用正确的 Font Awesome 格式，例如：fas fa-code', 'error');
                    return;
                }

                if (this.editingCard.customIconColor && !this.validateColor(this.editingCard.customIconColor)) {
                    this.showToast('颜色格式不正确，请使用正确的 Tailwind 颜色格式，例如：text-blue-600', 'error');
                    return;
                }

                const tags = this.editingCard.tagsInput
                    ? this.editingCard.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
                    : ['未分类'];

                const finalIcon = this.editingCard.customIcon || this.editingCard.icon;
                const finalIconColor = this.editingCard.customIconColor || this.editingCard.iconColor;

                const updatedCard = {
                    id: this.editingCard.id || Date.now(),
                    title: this.editingCard.title || '',
                    description: this.editingCard.description || '',
                    url: this.editingCard.url || '',
                    categories: Array.isArray(this.editingCard.categories) ? [...this.editingCard.categories] : [],
                    icon: finalIcon,
                    iconBg: this.editingCard.iconBg || 'bg-blue-100',
                    iconColor: finalIconColor,
                    tags: tags,
                    isFavorite: Boolean(this.editingCard.isFavorite),
                    createTime: this.editingCard.createTime || new Date().toISOString(),
                    updateTime: new Date().toISOString()
                };

                console.log('准备保存更新后的卡片:', updatedCard);

                const transaction = db.transaction(['cards'], 'readwrite');
                const objectStore = transaction.objectStore('cards');
                const request = objectStore.put(updatedCard);

                request.onsuccess = () => {
                    console.log('成功更新卡片');
                    this.loadCards();
                    this.editingCard = {
                        id: null,
                        title: '',
                        description: '',
                        url: '',
                        categories: [],
                        icon: 'fas fa-link',
                        iconBg: 'bg-blue-100',
                        iconColor: 'text-blue-600',
                        customIcon: '',
                        customIconColor: '',
                        tags: ['未分类'],
                        tagsInput: '未分类',
                        isFavorite: false,
                        createTime: null,
                        updateTime: null
                    };
                    this.showEditModal = false;
                    this.showToast('卡片更新成功', 'success');
                };

                request.onerror = (error) => {
                    console.error('更新卡片失败:', error);
                    this.showToast('更新卡片失败，请检查输入数据是否正确', 'error');
                };
            } catch (error) {
                console.error('保存卡片失败:', error);
                this.showToast('保存卡片失败，请检查输入数据是否正确', 'error');
            }
        },

        handleSearch(event) {
            if (event.key === 'Enter') {
                event.preventDefault();

                if (!this.searchTopQuery.trim()) return;

                this.searchResults = this.cards.filter(card => {
                    const searchLower = this.searchTopQuery.toLowerCase().trim();
                    return (card.title && card.title.toLowerCase().includes(searchLower)) ||
                        (card.description && card.description.toLowerCase().includes(searchLower)) ||
                        (card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
                        (card.categories && card.categories.some(cat => cat.toLowerCase().includes(searchLower)));
                });

                this.showSearchModal = true;
            }
        },

        exportCards() {
            try {
                const exportData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    cards: this.cards.map(card => ({
                        ...card,
                        createTime: card.createTime instanceof Date ? card.createTime.toISOString() : card.createTime,
                        updateTime: card.updateTime instanceof Date ? card.updateTime.toISOString() : card.updateTime
                    }))
                };

                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `devnav-cards-${new Date().toISOString().slice(0, 10)}.json`;

                document.body.appendChild(a);
                a.click();

                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showToast('导出成功！', 'success');
            } catch (error) {
                console.error('导出失败:', error);
                this.showToast('导出失败，请查看控制台了解详细信息', 'error');
            }
        },

        async importCards(event) {
            try {
                const file = event.target.files[0];
                if (!file) {
                    this.showToast('请选择要导入的文件', 'warning');
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const importData = JSON.parse(e.target.result);

                        if (!importData.cards || !Array.isArray(importData.cards)) {
                            throw new Error('无效的导入数据格式');
                        }

                        const transaction = db.transaction(['cards'], 'readwrite');
                        const objectStore = transaction.objectStore('cards');

                        let successCount = 0;
                        let failCount = 0;

                        for (const card of importData.cards) {
                            try {
                                const newCard = {
                                    ...card,
                                    id: Date.now() + Math.random(),
                                    createTime: new Date().toISOString(),
                                    updateTime: new Date().toISOString()
                                };

                                await new Promise((resolve, reject) => {
                                    const request = objectStore.add(newCard);
                                    request.onsuccess = () => resolve();
                                    request.onerror = () => reject();
                                });

                                successCount++;
                            } catch (error) {
                                console.error('导入单张卡片失败:', error);
                                failCount++;
                            }
                        }

                        await this.loadCards();
                        event.target.value = '';
                        this.showToast(`导入完成！成功: ${successCount} 张, 失败: ${failCount} 张`, 'info');
                    } catch (error) {
                        console.error('处理导入数据失败:', error);
                        this.showToast('导入失败，请确保文件格式正确', 'error');
                    }
                };

                reader.readAsText(file);
            } catch (error) {
                console.error('导入失败:', error);
                this.showToast('导入失败，请查看控制台了解详细信息', 'error');
            }
        },

        downloadTemplate() {
            try {
                const templateData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    cards: [
                        {
                            title: '示例卡片',
                            description: '这是一个示例卡片，用于展示卡片数据的结构',
                            icon: 'fas fa-star',
                            iconBg: 'bg-yellow-100',
                            iconColor: 'text-yellow-600',
                            categories: ['docs', 'frontend'],
                            tags: ['示例', '模板'],
                            url: 'https://example.com',
                            isFavorite: false
                        }
                    ]
                };

                const jsonStr = JSON.stringify(templateData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'devnav-template.json';

                document.body.appendChild(a);
                a.click();

                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showToast('模板下载成功！', 'success');
            } catch (error) {
                console.error('模板下载失败:', error);
                this.showToast('模板下载失败，请查看控制台了解详细信息', 'error');
            }
        },

        resetNewCard() {
            this.newCard = {
                title: '',
                description: '',
                url: '',
                categories: [],
                icon: 'fas fa-link',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                customIcon: '',
                customIconColor: '',
                tags: ['未分类'],
                tagsInput: '未分类',
                isFavorite: false
            };
        },

        async saveGithubConfig() {
            localStorage.setItem('github_owner', this.githubConfig.owner);
            localStorage.setItem('github_repo', this.githubConfig.repo);
            localStorage.setItem('github_branch', this.githubConfig.branch);
            localStorage.setItem('github_token', this.githubConfig.token);
            this.showToast('GitHub 配置已保存', 'success');
        },

        async syncWithGithub() {
            try {
                if (!this.githubConfig.owner || !this.githubConfig.repo || !this.githubConfig.token) {
                    this.showToast('请先完成 GitHub 配置', 'error');
                    return;
                }

                // 准备数据
                const cardsData = JSON.stringify(this.cards, null, 2);
                const filename = 'cards.json';
                const message = 'Update cards data';
                const url = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/${filename}`;

                // 获取现有文件（如果存在）
                let sha;
                try {
                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `token ${this.githubConfig.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        sha = data.sha;
                    }
                } catch (error) {
                    console.log('File does not exist yet');
                }

                // 上传/更新文件
                const content = btoa(unescape(encodeURIComponent(cardsData)));
                const body = {
                    message,
                    content,
                    branch: this.githubConfig.branch
                };
                if (sha) {
                    body.sha = sha;
                }

                const updateResponse = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.githubConfig.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(body)
                });

                if (updateResponse.ok) {
                    this.showToast('数据已成功同步到 GitHub', 'success');
                } else {
                    throw new Error('同步失败');
                }
            } catch (error) {
                console.error('Sync error:', error);
                this.showToast('同步失败：' + error.message, 'error');
            }
        },

        async loadFromGithub() {
            try {
                if (!this.githubConfig.owner || !this.githubConfig.repo || !this.githubConfig.token) {
                    this.showToast('请先完成 GitHub 配置', 'error');
                    return;
                }

                const url = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/cards.json`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `token ${this.githubConfig.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = decodeURIComponent(escape(atob(data.content)));
                    const cards = JSON.parse(content);

                    // 更新本地数据库
                    const db = await this.getDB();
                    const tx = db.transaction(['cards'], 'readwrite');
                    const store = tx.objectStore('cards');

                    // 清除现有数据
                    await store.clear();

                    // 添加新数据
                    for (const card of cards) {
                        await store.add(card);
                    }

                    await this.loadCards();
                    this.showToast('已从 GitHub 加载数据', 'success');
                } else {
                    throw new Error('加载失败');
                }
            } catch (error) {
                console.error('Load error:', error);
                this.showToast('从 GitHub 加载失败：' + error.message, 'error');
            }
        }
    };
}