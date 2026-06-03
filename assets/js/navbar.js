(function () {
    // CSS 주입
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/css/navbar.css';
    document.head.appendChild(link);

    var page = window.location.pathname;
    var isTestPage = page.indexOf('opic-test') > -1;

    // 네브바 HTML 주입
    var nav = document.createElement('div');
    nav.id = 'topNav';
    nav.innerHTML =
        '<nav class="top-nav">' +
            '<div class="nav-left">' +
                '<a href="/public/index.html" class="nav-link">Home</a>' +
                '<a href="/pages/survey-clone.html" class="nav-link" id="navSurveyLink" onclick="localStorage.clear()">Survey</a>' +
            '</div>' +
            '<div class="nav-right">' +
                (isTestPage
                    ? '<button type="button" class="nav-link" id="toggleTimer">Practice</button>'
                    : '') +
                '<button type="button" class="nav-hamburger" id="navHamburger" title="메뉴">' +
                    '<span class="nav-hbr"><span></span><span></span><span></span></span>' +
                '</button>' +
            '</div>' +
        '</nav>' +
        '<div id="navDrawer" class="nav-drawer">' +
            '<div class="nav-drawer-header">MENU</div>' +
            '<nav>' +
                '<a href="/public/my-records.html" class="nav-item">내 기록</a>' +
                '<a href="/public/admin.html" class="nav-item">관리자</a>' +
            '</nav>' +
        '</div>' +
        '<div id="navOverlay" class="nav-overlay"></div>';

    // body 맨 앞에 삽입
    document.body.insertBefore(nav, document.body.firstChild);

    // 햄버거 이벤트
    document.getElementById('navHamburger').addEventListener('click', function () {
        document.getElementById('navDrawer').classList.add('open');
        document.getElementById('navOverlay').classList.add('open');
    });
    document.getElementById('navOverlay').addEventListener('click', function () {
        document.getElementById('navDrawer').classList.remove('open');
        document.getElementById('navOverlay').classList.remove('open');
    });

    // 현재 페이지 active 표시
    var links = document.querySelectorAll('#topNav .nav-link[href]');
    links.forEach(function (a) {
        if (a.href && window.location.href.indexOf(a.getAttribute('href')) > -1) {
            a.classList.add('active');
        }
    });
})();
