// ========================
// OB 评估数据自动持久化（防止 iPad 切换 App 或刷新丢失记录）
// ========================
function getOBStorageKey() {
    const title = document.title || document.querySelector('h1')?.textContent || 'EBT_Manual';
    return 'ebt_manual_state_' + title.trim();
}

function autoSaveOBState() {
    try {
        const state = { checkboxes: {}, textareas: {}, scrollTop: 0 };
        document.querySelectorAll('.ob-checkbox').forEach(cb => {
            if (cb.id && cb.checked) {
                state.checkboxes[cb.id] = true;
            }
        });
        document.querySelectorAll('textarea').forEach((ta, idx) => {
            if (ta.value) {
                const key = (ta.dataset.phase || '') + '__' + (ta.dataset.moduleName || '') + '__' + idx;
                state.textareas[key] = ta.value;
            }
        });
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            state.scrollTop = mainContent.scrollTop;
        }
        localStorage.setItem(getOBStorageKey(), JSON.stringify(state));
    } catch (e) {}
}

function restoreOBState() {
    try {
        const raw = localStorage.getItem(getOBStorageKey());
        if (!raw) return;
        const state = JSON.parse(raw);
        if (state.checkboxes) {
            document.querySelectorAll('.ob-checkbox').forEach(cb => {
                if (cb.id && state.checkboxes[cb.id]) {
                    cb.checked = true;
                }
            });
        }
        if (state.textareas) {
            document.querySelectorAll('textarea').forEach((ta, idx) => {
                const key = (ta.dataset.phase || '') + '__' + (ta.dataset.moduleName || '') + '__' + idx;
                if (state.textareas[key] !== undefined) {
                    ta.value = state.textareas[key];
                }
            });
        }
        if (state.scrollTop) {
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                setTimeout(() => { mainContent.scrollTop = state.scrollTop; }, 150);
            }
        }
    } catch (e) {}
}

function clearOBAssessment() {
    if (!confirm('确定清空当前手册中所有已勾选的赞/踩和填写的评语记录吗？')) return;
    document.querySelectorAll('.ob-checkbox').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });
    try {
        localStorage.removeItem(getOBStorageKey());
    } catch (e) {}
    alert('记录已清空！');
}

(function initOBPersistence() {
    function bindEvents() {
        restoreOBState();
        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('ob-checkbox')) {
                autoSaveOBState();
            }
        });
        document.addEventListener('input', (e) => {
            if (e.target && e.target.tagName === 'TEXTAREA') {
                autoSaveOBState();
            }
        });
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            let scrollTimer = null;
            mainContent.addEventListener('scroll', () => {
                if (scrollTimer) clearTimeout(scrollTimer);
                scrollTimer = setTimeout(autoSaveOBState, 400);
            }, { passive: true });
        }
        // 页面隐藏或切后台时立即保存一次
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                autoSaveOBState();
            }
        });
        window.addEventListener('pagehide', autoSaveOBState);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindEvents);
    } else {
        bindEvents();
    }
})();

// ========================
// OB 评估数据保存与导出功能
// ========================
function collectOBAssessment() {
    const assessments = [];
    
    // 收集所有 OB 赞/踩 评估数据，按行查找以防止ID重复带来的干扰
    document.querySelectorAll('.ob-checkbox[id$="_like"]').forEach(likeBox => {
        const obId = likeBox.dataset.obId;
        if (!obId) return;
        
        const rowDiv = likeBox.closest('div');
        if (!rowDiv) return;
        
        const dislikeBox = rowDiv.querySelector('.ob-checkbox[id$="_dislike"]');
        
        const like = likeBox.checked;
        const dislike = dislikeBox ? dislikeBox.checked : false;
        
        // 获取 OB 标签文本
        const obTag = rowDiv.querySelector('.ob-tag')?.textContent || '';
        
        if (like || dislike) {
            assessments.push({
                id: obId,
                ob_tag: obTag.trim(),
                like: like,
                dislike: dislike,
                phase: likeBox.dataset.phase || '',
                module_name: likeBox.dataset.moduleName || ''
            });
        }
    });
    
    // 收集评语（查找页面中的所有 textarea）
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea, idx) => {
        const notes = textarea.value || '';
        if (notes && textarea.placeholder.includes('评语')) {
            assessments.push({
                index: idx,
                notes: notes,
                phase: textarea.dataset.phase || '',
                module_name: textarea.dataset.moduleName || ''
            });
        }
    });
    
    return assessments;
}

function saveOBAssessment() {
    const data = collectOBAssessment();
    if (data.length === 0) {
        alert('没有可保存的评估数据');
        return;
    }
    
    const jsonData = JSON.stringify(data, null, 2);
    
    // 创建下载链接
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OB_评估数据_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('评估数据已保存！');
}

function exportOBAssessmentCSV() {
    const data = collectOBAssessment();
    if (data.length === 0) {
        alert('没有可导出的评估数据');
        return;
    }
    
    // 构建 CSV 内容，加入 BOM 使 Excel 能正确识别 UTF-8
    let csv = '\uFEFF模块名称,飞行阶段,OB标签,赞,踩,评语\n';
    data.forEach(item => {
        const moduleName = item.module_name || '';
        const phase = item.phase || '';
        const obTag = item.ob_tag || '';
        const like = item.like ? '是' : '';
        const dislike = item.dislike ? '是' : '';
        const comment = item.comment || item.notes || '';
        
        // 处理 CSV 转义
        const escapedComment = comment.replace(/"/g, '""');
        csv += `"${moduleName}","${phase}","${obTag}","${like}","${dislike}","${escapedComment}"\n`;
    });
    
    // 创建下载链接
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OB_评估数据_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('评估数据已导出为CSV！');
}

function showOBAssessmentData() {
    const data = collectOBAssessment();
    if (data.length === 0) {
        alert('没有评估数据');
        return;
    }
    
    let message = '当前评估数据:\n\n';
    data.forEach((item, idx) => {
        message += (idx + 1) + '. ';
        if (item.notes) {
            message += `[${item.phase || '未知阶段'}] ${item.module_name || '未知模块'} 评语: ${item.notes}\n`;
        } else if (item.ob_tag) {
            message += `[${item.phase || '未知阶段'}] ${item.module_name || '未知模块'} - ${item.ob_tag}: `;
            if (item.like) message += '👍 ';
            if (item.dislike) message += '👎 ';
            message += '\n';
        }
    });
    
    alert(message);
}