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