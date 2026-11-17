// ========================
// 动态高度计算函数
// ========================
function recalculatePhaseRowHeights(phaseRow) {
    const colLeft = phaseRow.querySelector('.col-left');
    const colRight = phaseRow.querySelector('.col-right');
    
    if (!colLeft) {
        return;
    }
    
    // 清除可能存在的内联高度和手动调整的 minHeight，以便获取真实内容高度
    phaseRow.style.removeProperty('min-height');
    colLeft.style.removeProperty('height');
    if (colRight) {
        colRight.style.removeProperty('height');
    }
    
    // 如果没有分栏，则由内容决定高度（auto），无需额外处理
    if (!colRight) {
        return;
    }
    
    // 计算内容的实际高度
    const leftHeight = colLeft.scrollHeight;
    const rightHeight = colRight.scrollHeight;
    
    // 取较短的高度作为两栏的高度（由较短的一侧决定）
    let minHeight = Math.min(leftHeight, rightHeight);
    
    // 如果有一侧为空，为了防止高度为0导致完全看不见，可以取非空侧的高度
    if (minHeight === 0) {
        minHeight = Math.max(leftHeight, rightHeight);
    }
    
    // 方案：使用 setProperty 设置 !important，绕过 CSS 规则
    colLeft.style.setProperty('height', minHeight + 'px', 'important');
    colRight.style.setProperty('height', minHeight + 'px', 'important');
}

// ========================
// 同步滚动功能
// ========================
(function() {
    document.querySelectorAll('.phase-row').forEach(phaseRow => {
        const colLeft = phaseRow.querySelector('.col-left');
        const colRight = phaseRow.querySelector('.col-right');
        
        if (!colLeft || !colRight) return;
        
        let isScrollingLeft = false;
        let isScrollingRight = false;
        
        colLeft.addEventListener('scroll', () => {
            if (isScrollingRight) return;
            isScrollingLeft = true;
            colRight.scrollTop = colLeft.scrollTop;
            isScrollingLeft = false;
        });
        
        colRight.addEventListener('scroll', () => {
            if (isScrollingLeft) return;
            isScrollingRight = true;
            colLeft.scrollTop = colRight.scrollTop;
            isScrollingRight = false;
        });
    });
})();

// ========================
// 高度拖拽调整功能（iPad 触控兼容）
// ========================
(function() {
    document.querySelectorAll('.phase-row').forEach(row => {
        const resizer = row.querySelector('.phase-row-resizer');
        if (!resizer) return;

        let startY = 0;
        let startHeight = 0;

        resizer.addEventListener('pointerdown', (e) => {
            startY = e.clientY;
            startHeight = row.offsetHeight;
            document.body.style.userSelect = 'none';
            resizer.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        resizer.addEventListener('pointermove', (e) => {
            if (!resizer.hasPointerCapture(e.pointerId)) return;
            const delta = e.clientY - startY;
            const newHeight = Math.max(100, startHeight + delta);
            row.dataset.manualHeight = 'true';
            row.style.minHeight = newHeight + 'px';
            const colLeft = row.querySelector('.col-left');
            const colRight = row.querySelector('.col-right');
            if (colLeft) colLeft.style.setProperty('height', newHeight + 'px', 'important');
            if (colRight) colRight.style.setProperty('height', newHeight + 'px', 'important');
        });

        resizer.addEventListener('pointerup', (e) => {
            if (resizer.hasPointerCapture(e.pointerId)) {
                resizer.releasePointerCapture(e.pointerId);
            }
            document.body.style.userSelect = '';
        });

        resizer.addEventListener('pointercancel', (e) => {
            try { resizer.releasePointerCapture(e.pointerId); } catch(err) {}
            document.body.style.userSelect = '';
        });
    });
})();

// ========================
// 初始化：计算所有分栏的自适应高度（读写分离，消除 Layout Thrashing）
// ========================
(function() {
    let lastWindowWidth = window.innerWidth;

    function initHeights() {
        const rows = document.querySelectorAll('.phase-row');
        if (!rows.length) return;

        // 步骤 1：集中读取 —— 此阶段绝不修改 DOM
        const measurements = Array.from(rows).map(row => {
            // 保留教员已手动拖拽调整过的行高，避免重算覆盖
            if (row.dataset.manualHeight === 'true') return null;
            const left = row.querySelector('.col-left');
            const right = row.querySelector('.col-right');
            if (!left || !right) return null;
            // 先清除内联高度，获取真实 scrollHeight
            left.style.removeProperty('height');
            right.style.removeProperty('height');
            row.style.removeProperty('min-height');
            const lH = left.scrollHeight;
            const rH = right.scrollHeight;
            let h = Math.min(lH, rH);
            if (h === 0) h = Math.max(lH, rH);
            return { row, left, right, h };
        });

        // 步骤 2：集中写入 —— 在下一帧批量应用，避免强制同步布局
        requestAnimationFrame(() => {
            measurements.forEach(item => {
                if (!item) return;
                item.left.style.setProperty('height', item.h + 'px', 'important');
                item.right.style.setProperty('height', item.h + 'px', 'important');
            });
        });
    }

    // DOMContentLoaded 时执行（+300ms 保险二次执行）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initHeights();
            setTimeout(initHeights, 300);
        });
    } else {
        initHeights();
    }

    // 图片全部加载后再算一次（图片会撑高内容）
    window.addEventListener('load', () => setTimeout(initHeights, 100));

    // 仅在窗口宽度真正变化时重新计算（忽略 iPad 切换 App、软键盘弹出或地址栏伸缩导致的高度变化）
    window.addEventListener('resize', () => {
        const curW = window.innerWidth;
        if (Math.abs(curW - lastWindowWidth) > 5) {
            lastWindowWidth = curW;
            initHeights();
        }
    });
})();