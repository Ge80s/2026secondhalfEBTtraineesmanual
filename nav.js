// ========================
// 导航栏宽度拖拽调整
// ========================
(function() {
    const resizer = document.getElementById('nav-resizer');
    const sidebar = document.getElementById('nav-sidebar');
    const toggle = document.getElementById('nav-toggle');
    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', function() {
        const hidden = !sidebar.hidden;
        sidebar.hidden = hidden;
        if (resizer) resizer.hidden = hidden;
        toggle.textContent = hidden ? '📑 显示目录' : '📑 隐藏目录';
        toggle.setAttribute('aria-expanded', String(!hidden));
        document.dispatchEvent(new Event('manual-layout-change'));
    });

    if (!resizer) return;

    // 恢复上次保存的宽度
    const savedWidth = localStorage.getItem('nav-sidebar-width');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('pointerdown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        resizer.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    document.addEventListener('pointermove', function(e) {
        if (!isDragging) return;
        const delta = e.clientX - startX;
        const MIN_W = 120; // 与 CSS min-width 保持一致
        const MAX_W = 500; // 与 CSS max-width 保持一致
        const newWidth = Math.min(MAX_W, Math.max(MIN_W, startWidth + delta));
        sidebar.style.width = newWidth + 'px';
    });

    const handlePointerUp = function(e) {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (e.pointerId !== undefined) {
            try { resizer.releasePointerCapture(e.pointerId); } catch (err) {}
        }
        // 持久化保存宽度
        localStorage.setItem('nav-sidebar-width', sidebar.offsetWidth);
    };

    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
})();
function setManualFontScale(value) {
    const scale = Number(value);
    if (![1, 1.15, 1.3, 1.45].includes(scale)) return;
    document.querySelector('.content-inner').style.zoom = String(scale);
    document.dispatchEvent(new Event('manual-layout-change'));
    try {
        localStorage.setItem('ebt_manual_font_scale', String(scale));
    } catch (error) {
        // Keep the current document readable even when browser storage is unavailable.
    }
}

(function initManualFontScale() {
    const control = document.getElementById('manual-font-size');
    if (!control) return;
    let scale = '1';
    try {
        scale = localStorage.getItem('ebt_manual_font_scale') || scale;
    } catch (error) {}
    if (![1, 1.15, 1.3, 1.45].includes(Number(scale))) scale = '1';
    control.value = scale;
    setManualFontScale(scale);
})();