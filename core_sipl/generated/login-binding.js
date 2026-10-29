(function () {
    function bind() {
        const form = document.getElementById('form_login');
        if (!form || form.dataset.siLoginBound === 'true') return;
        form.dataset.siLoginBound = 'true';
        const button = form.querySelector('button');
        if (button && !button.getAttribute('type')) button.setAttribute('type', 'button');
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (window.SI && SI.Login) SI.Login.Attempt();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();
