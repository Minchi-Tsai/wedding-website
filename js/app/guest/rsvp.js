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
        const email = document.getElementById('form-email');
        const presence = document.getElementById('form-presence');
        const guestCount = document.getElementById('form-guest-count');
        const message = document.getElementById('form-message');
        const honeypot = document.getElementById('form-website');
        const alertWrapper = document.getElementById('rsvp-alert');

        // Honeypot check — bots fill hidden fields
        if (honeypot && honeypot.value.length > 0) {
            alertWrapper.innerHTML = alertMarkup('success', lang
                .on('zh-tw', '<strong>謝謝！</strong> 已收到您的回覆。')
                .on('en', '<strong>Thank you!</strong> Your RSVP has been received.')
                .get());
            return;
        }

        if (!name.value || name.value.trim().length === 0) {
            util.notify(lang.on('zh-tw', '請填寫姓名。').on('en', 'Please enter your name.').get()).warning();
            return;
        }

        if (presence && presence.value === '0') {
            util.notify(lang.on('zh-tw', '請選擇出席狀態。').on('en', 'Please select your attendance status.').get()).warning();
            return;
        }

        // Disable form
        const btn = util.disableButton(button);
        [name, email, presence, guestCount, message].forEach((el) => {
            if (el) el.disabled = true;
        });

        alertWrapper.innerHTML = alertMarkup('info', lang
            .on('zh-tw', '<i class="fa-solid fa-spinner fa-spin me-2"></i><strong>請稍候！</strong> 正在送出您的回覆...')
            .on('en', '<i class="fa-solid fa-spinner fa-spin me-2"></i><strong>Just a moment!</strong> Sending your RSVP...')
            .get());

        try {
            // Get reCAPTCHA token if available
            let recaptchaToken = '';
            if (RECAPTCHA_SITE_KEY && window.grecaptcha) {
                recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'rsvp' });
            }

            const body = new URLSearchParams({
                name: name.value.trim(),
                email: email ? email.value.trim() : '',
                attendance: presence ? (presence.value === '1' ? 'yes' : 'no') : 'yes',
                guest_count: guestCount ? guestCount.value : '1',
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

                // Show thank you modal with calendar links
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
        [name, email, presence, guestCount, message].forEach((el) => {
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
