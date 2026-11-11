/* Shared migration controls. No PHP session or CSRF token is copied between servers. */
(function () {
    'use strict';
    const storageKey = 'si.backend.origins';
    const defaults = {php: 'http://localhost:8090', sipl: 'http://localhost:8092'};
    function stored() { try { return {...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}')}; } catch (_) { return {...defaults}; } }
    function origin(value) {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter an HTTP or HTTPS address without credentials.');
        return url.origin;
    }
    function save(values) { localStorage.setItem(storageKey, JSON.stringify(values)); }
    function message(text) {
        let element = document.getElementById('si-backend-error');
        if (!element) {
            element = document.createElement('div'); element.id = 'si-backend-error'; element.setAttribute('role', 'alert');
            Object.assign(element.style, {position:'fixed',left:'16px',bottom:'56px',zIndex:'11000',maxWidth:'min(560px,calc(100vw - 32px))',padding:'14px 18px',background:'#14243a',border:'1px solid #80b3ff',borderRadius:'6px',color:'#e7eef9',font:'14px/1.5 Arial,sans-serif'});
            document.body.appendChild(element);
        }
        element.textContent = text;
    }
    window.SI = window.SI || {};
    SI.Backend = {
        origins: stored,
        switchTo: function (backend, page) {
            if (!['php','sipl'].includes(backend)) throw new Error('Unknown backend');
            let pathname = page || '/';
            if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\')) pathname = '/';
            window.location.assign(new URL(pathname, origin(stored()[backend])).href);
        }
    };
    const launcher = document.body.classList.contains('si-backend-launcher');
    if (launcher) {
        const values = stored();
        const php = document.getElementById('si-php-origin'), sipl = document.getElementById('si-sipl-origin');
        php.value = values.php; sipl.value = values.sipl;
        function settings() { const value = {php:origin(php.value),sipl:origin(sipl.value)}; save(value); return value; }
        for (const button of document.querySelectorAll('[data-open-backend]')) button.addEventListener('click', function () {
            try { settings(); SI.Backend.switchTo(button.dataset.openBackend, new URLSearchParams(location.search).get('page') || '/'); }
            catch (error) { document.getElementById('si-backend-status').textContent = error.message; }
        });
        document.getElementById('si-check-backend').addEventListener('click', async function () {
            const status = document.getElementById('si-backend-status'); status.textContent = 'Checking the SIPL runtime…';
            try {
                const response = await fetch(new URL('/__sipl/status',settings().sipl),{credentials:'omit',signal:AbortSignal.timeout(5000)});
                if (!response.ok) throw new Error('SIPL returned HTTP '+response.status);
                const data = await response.json(), missing = [];
                if (!data.capabilities.mysqlDriver) missing.push('Executable needs the MySQL connector build.');
                if (!data.capabilities.phpBcryptVerify) missing.push('PHP bcrypt verification is unavailable.');
                if (!data.databaseConfigured) missing.push('Set the SIPL MySQL configuration.');
                status.textContent = missing.length ? 'SIPL is running.\n'+missing.join('\n') : 'SIPL is running and its MySQL/authentication prerequisites are available. Continue parity testing before cutover.';
            } catch (error) { status.textContent = 'Could not check SIPL: '+error.message; }
        });
        return;
    }
    if (SI.BackendConfig && SI.BackendConfig.current === 'sipl') {
        const values = stored(); values.sipl = location.origin;
        if (SI.BackendConfig.phpOrigin) values.php = SI.BackendConfig.phpOrigin;
        save(values);
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function () {
            this.addEventListener('loadend', function () {
                if (this.status < 400) return;
                try { let data = JSON.parse(this.responseText); if (Array.isArray(data)) data=data[0]; message(data.ERROR || 'SIPL request failed: HTTP '+this.status); }
                catch (_) { message('SIPL request failed: HTTP '+this.status); }
            }, {once:true});
            return originalSend.apply(this, arguments);
        };
    }
})();
