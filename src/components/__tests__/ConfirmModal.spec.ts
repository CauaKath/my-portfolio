import { describe, it, expect, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'

import ConfirmModal from '../ConfirmModal.vue'

let wrapper: VueWrapper | null = null

function mountModal(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(ConfirmModal, {
    props: { open: true, title: 'Delete tag', message: 'Are you sure?', ...props },
    slots,
  })

  return wrapper
}

// The dialog is teleported to <body>, so it is queried there, not on the wrapper.
const q = (selector: string) => document.body.querySelector<HTMLElement>(selector)

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.style.overflow = ''
  document.body.innerHTML = ''
})

describe('ConfirmModal', () => {
  it('renders nothing while closed', () => {
    mountModal({ open: false })

    expect(q('.confirm-dialog')).toBeNull()
  })

  it('renders an accessible dialog with the title and message', () => {
    mountModal()
    const dialog = q('.confirm-dialog')!

    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(q('.confirm-title')!.textContent).toBe('Delete tag')
    expect(q('.confirm-body')!.textContent).toContain('Are you sure?')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)).toBe(q('.confirm-title'))
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)).toBe(q('.confirm-body'))
  })

  it('lets the default slot replace the message', () => {
    mountModal({}, { default: 'Delete <strong>go</strong>?' })

    expect(q('.confirm-body strong')!.textContent).toBe('go')
    expect(q('.confirm-body')!.textContent).not.toContain('Are you sure?')
  })

  it('uses custom button labels', () => {
    mountModal({ confirmLabel: 'Remove', cancelLabel: 'Keep' })

    expect(q('.confirm-ok')!.textContent!.trim()).toBe('Remove')
    expect(q('.confirm-cancel')!.textContent!.trim()).toBe('Keep')
  })

  it('emits confirm when the action button is clicked, without closing itself', async () => {
    const w = mountModal()

    q('.confirm-ok')!.click()
    await w.vm.$nextTick()

    expect(w.emitted('confirm')).toHaveLength(1)
    expect(w.emitted('update:open')).toBeUndefined()
  })

  it('cancels from the Cancel button, closing and emitting cancel', async () => {
    const w = mountModal()

    q('.confirm-cancel')!.click()
    await w.vm.$nextTick()

    expect(w.emitted('cancel')).toHaveLength(1)
    expect(w.emitted('update:open')![0]).toEqual([false])
  })

  it('cancels on Escape', async () => {
    const w = mountModal()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()

    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('cancels on a click on the backdrop but not inside the dialog', async () => {
    const w = mountModal()

    q('.confirm-dialog')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await w.vm.$nextTick()
    expect(w.emitted('cancel')).toBeUndefined()

    q('.confirm-backdrop')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await w.vm.$nextTick()
    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('cannot be dismissed while busy, and disables both buttons', async () => {
    const w = mountModal({ busy: true })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    q('.confirm-backdrop')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await w.vm.$nextTick()

    expect(w.emitted('cancel')).toBeUndefined()
    expect(q('.confirm-ok')!.hasAttribute('disabled')).toBe(true)
    expect(q('.confirm-cancel')!.hasAttribute('disabled')).toBe(true)
  })

  it('shows an error without closing', () => {
    mountModal({ error: 'Could not delete' })

    expect(q('.confirm-error')!.textContent).toBe('Could not delete')
    expect(q('.confirm-error')!.getAttribute('role')).toBe('alert')
  })

  it('focuses Cancel, not the destructive action, when it opens', async () => {
    const w = mountModal()
    await w.vm.$nextTick()
    await w.vm.$nextTick()

    expect(document.activeElement).toBe(q('.confirm-cancel'))
  })

  it('locks page scroll while open and restores it on close', async () => {
    const w = mountModal({ open: false })
    expect(document.body.style.overflow).toBe('')

    await w.setProps({ open: true })
    expect(document.body.style.overflow).toBe('hidden')

    await w.setProps({ open: false })
    expect(document.body.style.overflow).toBe('')
  })

  it('wraps Tab focus inside the dialog', async () => {
    const w = mountModal()
    await w.vm.$nextTick()
    const ok = q('.confirm-ok')!
    const cancel = q('.confirm-cancel')!

    ok.focus()
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    q('.confirm-dialog')!.dispatchEvent(forward)
    expect(document.activeElement).toBe(cancel)
    expect(forward.defaultPrevented).toBe(true)

    cancel.focus()
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    q('.confirm-dialog')!.dispatchEvent(backward)
    expect(document.activeElement).toBe(ok)
  })

  it('returns focus to the element that opened it', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const w = mountModal({ open: false })
    await w.setProps({ open: true })
    await w.vm.$nextTick()
    await w.setProps({ open: false })

    expect(document.activeElement).toBe(opener)
  })
})
