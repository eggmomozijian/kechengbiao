(() => {
  const data = window.SCHEDULE_DATA;
  if (!data || !Array.isArray(data.lessons)) {
    document.body.innerHTML = '<p style="padding:16px">课表数据加载失败</p>';
    return;
  }

  const periodMap = {
    1: '8:30-9:15',
    2: '9:20-10:05',
    3: '10:25-11:10',
    4: '11:15-12:00',
    5: '13:50-14:35',
    6: '14:40-15:25',
    7: '15:30-16:15',
    8: '16:30-17:15',
    9: '17:20-18:05',
    10: '18:30-19:15',
    11: '19:20-20:05',
    12: '20:10-20:55'
  };

  const weekdayLabel = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const palette = ['#b9cfb5', '#d9d4f3', '#f6d8e9', '#efe2cb', '#f5d5c6', '#cec2b4', '#c8d0e3', '#f0edda', '#e4def5', '#d7e4da'];
  const colorByCourse = {};
  const getColor = (name) => {
    if (!colorByCourse[name]) {
      let sum = 0;
      for (const ch of name) sum += ch.charCodeAt(0);
      colorByCourse[name] = palette[sum % palette.length];
    }
    return colorByCourse[name];
  };

  const getPeriodStartMinutes = (period) => {
    const [hour, minute] = periodMap[period].split('-')[0].split(':').map(Number);
    return hour * 60 + minute;
  };

  const getPeriodStartTime = (period) => periodMap[period].split('-')[0];
  const getPeriodEndTime = (period) => periodMap[period].split('-')[1];
  const getLessonEnd = (lesson) => getPeriodEndTime(lesson.endPeriod);
  const getLessonTimeRange = (lesson) => `${getPeriodStartTime(lesson.startPeriod)}-${getLessonEnd(lesson)}`;
  const formatDate = (date) => `${date.getMonth() + 1}月${date.getDate()}日`;
  const toDateKey = (date) => date.toISOString().slice(0, 10);

  const today = new Date();
  const todayKey = toDateKey(today);
  const nowMinutes = () => today.getHours() * 60 + today.getMinutes();
  const currentJsWeekday = ((today.getDay() + 6) % 7) + 1;
  const actualWeek =
    data.lessons.find((lesson) => lesson.date === todayKey && lesson.weekday === currentJsWeekday)?.week ||
    (data.weeks.includes(3) ? 3 : data.weeks[0]);

  const weekTabs = document.getElementById('weekTabs');
  const weekdayTabs = document.getElementById('weekdayTabs');
  const desktopBoard = document.getElementById('desktopBoard');
  const mobileDay = document.getElementById('mobileDay');
  const todayRemaining = document.getElementById('todayRemaining');
  const summaryText = document.getElementById('summaryText');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const nextLesson = document.getElementById('nextLesson');
  const todayBadge = document.getElementById('todayBadge');
  const installBtn = document.getElementById('installBtn');

  let deferredPrompt = null;
  let currentWeek = actualWeek;
  let currentWeekday = currentJsWeekday;

  const getWeekLessons = (week) =>
    data.lessons
      .filter((lesson) => lesson.week === week)
      .sort((a, b) => a.weekday - b.weekday || a.startPeriod - b.startPeriod);

  const getDayLessons = (week, weekday) =>
    getWeekLessons(week).filter((lesson) => lesson.weekday === weekday);

  const getTodayRemainingLessons = () =>
    getDayLessons(actualWeek, currentJsWeekday).filter((lesson) => getPeriodStartMinutes(lesson.startPeriod) > nowMinutes());

  const setHeaderInfo = () => {
    document.getElementById('todayText').textContent = `${formatDate(today)} 课表视图`;
  };

  const chip = (label, isActive, onClick) => {
    const btn = document.createElement('button');
    btn.className = `chip ${isActive ? 'active' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  };

  const renderWeekTabs = () => {
    weekTabs.innerHTML = '';
    data.weeks.forEach((week) => {
      weekTabs.appendChild(
        chip(`第${week}周`, week === currentWeek, () => {
          currentWeek = week;
          render();
        })
      );
    });
  };

  const renderWeekdayTabs = () => {
    weekdayTabs.innerHTML = '';
    weekdayLabel.forEach((label, index) => {
      const weekday = index + 1;
      const dayCount = getDayLessons(currentWeek, weekday).length;
      const tabLabel = dayCount ? `${label} · ${dayCount}` : label;
      weekdayTabs.appendChild(
        chip(tabLabel, weekday === currentWeekday, () => {
          currentWeekday = weekday;
          renderWeekdayTabs();
          renderMobile();
          renderHero();
        })
      );
    });
  };

  const addBaseGrid = () => {
    desktopBoard.innerHTML = '';
    const createCell = (className, col, row, html) => {
      const div = document.createElement('div');
      div.className = `cell ${className || ''}`;
      div.style.gridColumn = String(col);
      div.style.gridRow = String(row);
      div.innerHTML = html;
      desktopBoard.appendChild(div);
    };

    createCell('head', 1, 1, '节次');
    weekdayLabel.forEach((name, index) => {
      createCell('head', index + 2, 1, name);
    });

    for (let period = 1; period <= 12; period++) {
      createCell('left', 1, period + 1, `<b>${period}</b><span>${periodMap[period]}</span>`);
      for (let day = 1; day <= 7; day++) {
        createCell('', day + 1, period + 1, '');
      }
    }
  };

  const renderDesktop = () => {
    addBaseGrid();
    getWeekLessons(currentWeek).forEach((lesson) => {
      const card = document.createElement('article');
      card.className = 'lesson';
      card.style.background = `linear-gradient(180deg, ${getColor(lesson.course)}, rgba(255,255,255,0.85))`;
      card.style.gridColumn = String(lesson.weekday + 1);
      card.style.gridRow = `${lesson.startPeriod + 1} / ${lesson.endPeriod + 2}`;
      card.innerHTML = `
        <div class="name">${lesson.course}</div>
        <div class="lesson-teacher">${lesson.teacher || '教师待定'}</div>
        <div class="lesson-time">${getLessonTimeRange(lesson)}</div>
        <div class="lesson-foot">
          <div class="loc">${lesson.location || '地点待定'}</div>
        </div>
      `;
      desktopBoard.appendChild(card);
    });
  };

  const renderTodayRemaining = () => {
    const lessons = getTodayRemainingLessons();
    if (!lessons.length) {
      todayRemaining.innerHTML = `
        <div class="today-card today-card-empty">
          <div class="today-card-head">
            <div>
              <p class="today-kicker">今天还有什么课</p>
              <h3>今天剩余课程已全部结束</h3>
            </div>
            <span class="today-count">0 节</span>
          </div>
          <p class="today-note">已经上过的课不会显示在这里。</p>
        </div>
      `;
      return;
    }

    const items = lessons
      .map(
        (lesson) => `
          <article class="today-item" style="background: linear-gradient(145deg, ${getColor(lesson.course)}, #ffffff);">
            <div class="today-item-top">
              <span class="time-chip">${getLessonTimeRange(lesson)}</span>
            </div>
            <strong>${lesson.course}</strong>
            <p>${lesson.location || '地点待定'} · ${lesson.teacher || '教师待定'}</p>
          </article>
        `
      )
      .join('');

    todayRemaining.innerHTML = `
      <div class="today-card">
        <div class="today-card-head">
          <div>
            <p class="today-kicker">今天还有什么课</p>
            <h3>${weekdayLabel[currentJsWeekday - 1]} 剩余课程</h3>
          </div>
          <span class="today-count">${lessons.length} 节</span>
        </div>
        <div class="today-list">${items}</div>
      </div>
    `;
  };

  const renderMobile = () => {
    const dayLessons = getDayLessons(currentWeek, currentWeekday);
    if (!dayLessons.length) {
      mobileDay.innerHTML = `
        <div class="empty">
          <strong>${weekdayLabel[currentWeekday - 1]} 没有课程</strong>
          <p>可以切换到别的星期看看</p>
        </div>
      `;
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'day-list';
    wrap.innerHTML = `
      <div class="day-list-header">
        <h3>${weekdayLabel[currentWeekday - 1]}</h3>
        <p>第${currentWeek}周 · 共 ${dayLessons.length} 节安排</p>
      </div>
    `;

    dayLessons.forEach((lesson) => {
      const item = document.createElement('article');
      item.className = 'day-item';
      item.style.background = `linear-gradient(145deg, ${getColor(lesson.course)}, #ffffff)`;
      item.innerHTML = `
        <div class="day-item-head">
          <div class="day-item-top">
            <span class="time-chip">${getLessonTimeRange(lesson)}</span>
            <div class="title">${lesson.course}</div>
          </div>
        </div>
        <p class="meta">${lesson.location || '地点待定'} · ${lesson.teacher || '教师待定'}</p>
      `;
      wrap.appendChild(item);
    });

    mobileDay.innerHTML = '';
    mobileDay.appendChild(wrap);
  };

  const renderSummary = () => {
    const count = getWeekLessons(currentWeek).length;
    summaryText.textContent = `第${currentWeek}周 · ${count} 节课`;
  };

  const renderHero = () => {
    const remainingLessons = getTodayRemainingLessons();
    const focusLesson = remainingLessons[0] || getDayLessons(currentWeek, currentWeekday)[0];
    heroSubtitle.textContent = focusLesson
      ? `${weekdayLabel[currentWeekday - 1]} 从 ${periodMap[focusLesson.startPeriod]} 开始`
      : `${weekdayLabel[currentWeekday - 1]} 今天没有课`;
    todayBadge.textContent = currentWeek === actualWeek && currentWeekday === currentJsWeekday ? '今天' : weekdayLabel[currentWeekday - 1];
    nextLesson.textContent = remainingLessons[0]
      ? `${remainingLessons[0].course} · ${remainingLessons[0].location || '地点待定'}`
      : '今天剩余课程已结束';
  };

  const setupInstall = () => {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      installBtn.hidden = false;
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.hidden = true;
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {});
      });
    }
  };

  const render = () => {
    renderTodayRemaining();
    renderWeekTabs();
    renderWeekdayTabs();
    renderDesktop();
    renderMobile();
    renderSummary();
    renderHero();
  };

  setHeaderInfo();
  setupInstall();
  render();
  window.setInterval(() => {
    setHeaderInfo();
    renderTodayRemaining();
    renderHero();
  }, 60000);
})();
