import { util } from '../../common/util.js';
import { lang } from '../../common/language.js';
import { storage } from '../../common/storage.js';
import { bs } from '../../libs/bootstrap.js';

export const rsvp = (() => {

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let information = null;

    /**
     * @type {string}
     */
    let APPS_SCRIPT_URL = '';

    /**
     * @type {string}
     */
    let RECAPTCHA_SITE_KEY = '';

    /**
     * @param {string} type
     * @param {string} msg
     * @returns {string}
     */
    const alertMarkup = (type, msg) => {
        return `<div class="alert alert-${util.escapeHtml(type)} alert-dismissible fade show rounded-4 mb-0 mt-2" role="alert">${msg}<button type="button" class="btn-close rounded-4 p-3" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const send = async (button) => {
        const name = document.getElementById('form-name');
        const presence = document.getElementById('form-presence');
        const guestCount = document.getElementById('form-guest-count');
        const invitationType = document.getElementById('form-invitation-type');
        const email = document.getElementById('form-email');
        const address = document.getElementById('form-address');
        const isAttending = presence && presence.value === '1';
        const message = isAttending ? document.getElementById('form-message') : document.getElementById('form-message-decline');
        const honeypot = document.getElementById('form-website');
        const alertWrapper = document.getElementById('rsvp-alert');

        // Check if already submitted on this device
        if (information.get('submitted')) {
            const updateMsg = 'You have already submitted your RSVP. Would you like to update your response?\n\n您已經回覆過了，確定要更新您的回覆嗎？';
            if (!window.confirm(updateMsg)) {
                return;
            }
        }

        // Honeypot check — bots fill hidden fields
        if (honeypot && honeypot.value.length > 0) {
            alertWrapper.innerHTML = alertMarkup('success', lang
                .on('zh-tw', '<strong>謝謝！</strong> 已收到您的回覆。')
                .on('en', '<strong>Thank you!</strong> Your RSVP has been received.')
                .get());
            return;
        }

        if (!name.value || name.value.trim().length === 0) {
            alertWrapper.innerHTML = alertMarkup('warning', 'Please enter your name.<br><span style="font-size: 0.85rem; letter-spacing: 0.1rem;">請填寫姓名</span>');
            return;
        }

        if (presence && presence.value === '0') {
            alertWrapper.innerHTML = alertMarkup('warning', 'Please select your attendance status.<br><span style="font-size: 0.85rem; letter-spacing: 0.1rem;">請選擇是否出席</span>');
            return;
        }

        // Check invitation preference if attending
        if (isAttending && invitationType && (!invitationType.value || invitationType.value === '')) {
            alertWrapper.innerHTML = alertMarkup('warning', 'Please select your invitation preference.<br><span style="font-size: 0.85rem; letter-spacing: 0.1rem;">請選擇喜帖寄送方式</span>');
            return;
        }

        // Check address if paper invitation requested
        if (isAttending && invitationType) {
            const v = invitationType.value;
            if (v === 'yes-paper' && address && !address.value.trim()) {
                alertWrapper.innerHTML = alertMarkup('warning', 'Please enter your mailing address.<br><span style="font-size: 0.85rem; letter-spacing: 0.1rem;">請填寫收件地址</span>');
                return;
            }
        }

        // Disable form
        const btn = util.disableButton(button, 'Sending... 送出中...', true);
        [name, presence, guestCount, invitationType, email, address, message].forEach((el) => {
            if (el) el.disabled = true;
        });

        try {
            // Get reCAPTCHA token if available
            let recaptchaToken = '';
            if (RECAPTCHA_SITE_KEY && window.grecaptcha) {
                recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'rsvp' });
            }

            const body = new URLSearchParams({
                name: name.value.trim(),
                attendance: presence ? (presence.value === '1' ? 'yes' : 'no') : 'yes',
                guest_count: guestCount ? guestCount.value : '1',
                invitation_type: invitationType ? invitationType.value : '',
                email: email ? email.value.trim() : '',
                address: address ? address.value.trim() : '',
                message: message ? message.value.trim() : '',
                recaptcha_token: recaptchaToken,
            });

            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });

            const result = await response.json();

            if (result.result === 'error') {
                alertWrapper.innerHTML = alertMarkup('danger', `<strong>${lang.on('zh-tw', '抱歉！').on('en', 'Sorry!').get()}</strong> ${util.escapeHtml(result.message)}`);
            } else {
                alertWrapper.innerHTML = '';
                information.set('name', name.value.trim());
                information.set('presence', presence ? presence.value === '1' : true);
                information.set('submitted', true);

                // Toggle modal content based on attendance
                const isAttending = presence && presence.value === '1';
                document.getElementById('modal-attending').classList.toggle('d-none', !isAttending);
                document.getElementById('modal-declined').classList.toggle('d-none', isAttending);

                bs.modal('rsvp-success-modal').show();
            }
        } catch {
            alertWrapper.innerHTML = alertMarkup('danger', lang
                .on('zh-tw', '<strong>抱歉！</strong> 提交時發生錯誤，請稍後再試。')
                .on('en', '<strong>Sorry!</strong> Something went wrong. Please try again later.')
                .get());
        }

        // Re-enable form
        btn.restore();
        [name, presence, guestCount, invitationType, email, address, message].forEach((el) => {
            if (el) el.disabled = false;
        });
    };

    /**
     * @returns {void}
     */
    const init = () => {
        information = storage('information');
        APPS_SCRIPT_URL = document.body.getAttribute('data-rsvp-url') || '';
        RECAPTCHA_SITE_KEY = document.body.getAttribute('data-recaptcha-key') || '';
    };

    return {
        init,
        send,
    };
})();
