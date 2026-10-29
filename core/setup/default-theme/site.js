(function () {
    function init() {
        var path = window.location.pathname.replace(/\/+$/, '') || '/';
        var home = path === '/' || /\/index\.php$/i.test(path) || document.body.hasAttribute('data-si-preview');
        document.body.classList.add(home ? 'si-home' : 'si-subpage');
        var sidebar = document.getElementById('si_default_sidebar');
        var menu = document.getElementById('si_menu_toggle');
        var scrim = document.getElementById('si_sidebar_scrim');
        var account = document.getElementById('si_account_toggle');
        var search = document.getElementById('si_page_search');
        var status = document.getElementById('si_search_status');
        var groups = Array.from(sidebar.querySelectorAll('details'));
        var links = Array.from(sidebar.querySelectorAll('#si_page_nav a'));

        function closeMenu(restoreFocus) {
            document.body.classList.remove('si-menu-open');
            menu.setAttribute('aria-expanded', 'false');
            scrim.hidden = true;
            if (restoreFocus) menu.focus();
        }
        menu.addEventListener('click', function () {
            var open = document.body.classList.toggle('si-menu-open');
            menu.setAttribute('aria-expanded', String(open));
            scrim.hidden = !open;
            if (open) search.focus();
        });
        scrim.addEventListener('click', function () { closeMenu(true); });
        links.forEach(function (link) {
            link.addEventListener('click', function () {
                closeMenu(false);
                links.forEach(function (item) { item.removeAttribute('aria-current'); });
                link.setAttribute('aria-current', 'location');
                var target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.setAttribute('tabindex', '-1');
                    target.focus({preventScroll: true});
                }
            });
        });
        document.getElementById('si_expand_nav').addEventListener('click', function () {
            groups.forEach(function (group) { group.open = true; });
        });
        document.getElementById('si_collapse_nav').addEventListener('click', function () {
            groups.forEach(function (group) { group.open = false; });
        });
        var expandedBeforeSearch;
        search.addEventListener('input', function () {
            var query = search.value.trim().toLowerCase();
            if (query && !expandedBeforeSearch) expandedBeforeSearch = groups.map(function (group) { return group.open; });
            var matches = 0;
            links.forEach(function (link) {
                var section = document.querySelector(link.getAttribute('href'));
                var text = link.textContent + ' ' + (section ? section.textContent : '');
                var match = !query || text.toLowerCase().includes(query);
                link.parentElement.hidden = !match;
                if (match) matches++;
            });
            groups.forEach(function (group, index) {
                group.hidden = !Array.from(group.querySelectorAll('li')).some(function (item) { return !item.hidden; });
                if (query && !group.hidden) group.open = true;
                else if (!query && expandedBeforeSearch) group.open = expandedBeforeSearch[index];
            });
            if (!query) expandedBeforeSearch = null;
            status.textContent = query ? (matches ? matches + ' matching section' + (matches === 1 ? '' : 's') + '.' : 'No matching sections. Try “blocks” or “publish”.') : 'Pages, tools, and a place to start.';
        });
        if (!document.getElementById('si_block_Login')) {
            account.hidden = true;
        } else {
            var name = window.SI && SI.User && SI.User.Name;
            if (name && name !== 'guest') account.textContent = 'Account';
            account.addEventListener('click', function () {
                var open = document.body.classList.toggle('si-account-open');
                account.setAttribute('aria-expanded', String(open));
                if (open) {
                    var field = document.querySelector('#si_block_Login input[type="email"]');
                    if (field && field.offsetParent !== null) field.focus();
                }
            });
        }
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                if (document.body.classList.contains('si-menu-open')) closeMenu(true);
                if (document.body.classList.contains('si-account-open')) {
                    document.body.classList.remove('si-account-open');
                    account.setAttribute('aria-expanded', 'false');
                    account.focus();
                }
            }
            if (home && event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input, textarea, select, [contenteditable]')) {
                event.preventDefault();
                if (window.matchMedia('(max-width: 760px)').matches && !document.body.classList.contains('si-menu-open')) menu.click();
                search.focus();
            }
        });
        if (home && 'IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                var visible = entries.filter(function (entry) { return entry.isIntersecting; });
                if (!visible.length || search.value.trim()) return;
                var active = visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; })[0].target.id;
                links.forEach(function (link) {
                    if (link.hash === '#' + active) link.setAttribute('aria-current', 'location');
                    else link.removeAttribute('aria-current');
                });
            }, {rootMargin: '-100px 0px -60% 0px', threshold: 0});
            document.querySelectorAll('#si_default_main > section[id]').forEach(function (section) { observer.observe(section); });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
    else init();
})();
