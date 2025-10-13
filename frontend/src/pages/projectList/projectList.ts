async function openNewProjectModal(): Promise<void> {
    const modalRoot = document.getElementById('modal-root')
    if (!modalRoot) return

    if (modalRoot.dataset.open === '1') return
    modalRoot.dataset.open = '1'

    try {
        const res = await fetch('/src/modals/projectList/newProject.html')
        if (!res.ok) throw new Error('Failed to load modal')
        const html = await res.text()

        const overlay = document.createElement('div')
        overlay.className = 'modal-overlay'
        const card = document.createElement('div')
        card.className = 'modal-card'
        card.innerHTML = html

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal()
        })

        // 閉じるボタンを押したらモーダルを閉じる
        const closeButtons = card.querySelectorAll('button')
        closeButtons.forEach(btn => {
            if (btn.textContent && btn.textContent.trim().includes('閉じる')) {
                btn.addEventListener('click', () => closeModal())
            }
        })

        function closeModal() {
            if (overlay.parentElement) overlay.parentElement.removeChild(overlay)
            if (modalRoot) delete modalRoot.dataset.open
        }

        overlay.appendChild(card)
        modalRoot.appendChild(overlay)
    } catch (e) {
        console.error(e)
        alert('モーダルの読み込みに失敗しました')
        delete modalRoot.dataset.open
    }
}

export function initProjectList(): void {
    const btn = document.getElementById('open-new-project')
    if (btn) btn.addEventListener('click', openNewProjectModal)
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProjectList)
} else {
    initProjectList()
}
