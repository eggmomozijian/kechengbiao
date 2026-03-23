const fs = require('fs');

const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'schedule-data.json',
  'schedule-data.js',
  'manifest.json',
  'service-worker.js'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const data = JSON.parse(fs.readFileSync('schedule-data.json', 'utf8'));
if (!Array.isArray(data.lessons) || data.lessons.length < 50) {
  throw new Error('Lesson count is too low or missing.');
}
if (!Array.isArray(data.weeks) || data.weeks.length < 10) {
  throw new Error('Week data is incomplete.');
}

const mustHave = [
  { week: 3, weekday: 1, periodCode: '0102', course: '电机学' },
  { week: 3, weekday: 2, periodCode: '0102', course: '微机原理与单片机技术' },
  { week: 3, weekday: 5, periodCode: '0304', course: '自动控制原理' }
];
for (const item of mustHave) {
  const ok = data.lessons.some(
    (x) => x.week === item.week && x.weekday === item.weekday && x.periodCode === item.periodCode && x.course === item.course
  );
  if (!ok) throw new Error(`Missing key lesson: ${JSON.stringify(item)}`);
}

const css = fs.readFileSync('styles.css', 'utf8');
if (!css.includes('@media (max-width: 900px)')) {
  throw new Error('Missing mobile responsive media query.');
}

const html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('meta name="viewport"')) {
  throw new Error('Missing mobile viewport meta tag.');
}
if (!html.includes('rel="manifest"')) {
  throw new Error('Missing manifest link.');
}
if (!html.includes('id="todayRemaining"')) {
  throw new Error('Missing today remaining section.');
}

const appJs = fs.readFileSync('app.js', 'utf8');
if (!appJs.includes('serviceWorker.register')) {
  throw new Error('Service worker registration is missing.');
}
if (!appJs.includes('getTodayRemainingLessons')) {
  throw new Error('Missing today remaining lesson logic.');
}

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
if (manifest.display !== 'standalone') {
  throw new Error('Manifest display mode must be standalone.');
}

console.log('All acceptance checks passed.');
