const fs = require('fs');

const source = 'C:/Users/eggmo/Downloads/学生个人课表-列表展示导出.xls';
const raw = fs.readFileSync(source, 'utf8');

const decodeHtml = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

const trMatches = [...raw.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
if (trMatches.length < 2) {
  throw new Error('No table rows found in source file.');
}

const rows = [];
for (let i = 1; i < trMatches.length; i++) {
  const trInner = trMatches[i][1];
  const tdMatches = [...trInner.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
  const cells = tdMatches.map((m) => decodeHtml(m[1]));
  if (cells.length < 9) continue;

  const week = Number((cells[4] || '').replace(/[^\d]/g, ''));
  const weekday = Number((cells[5] || '').replace(/[^\d]/g, ''));
  const periodCode = (cells[6] || '').replace(/[^\d]/g, '');

  if (!week || !weekday || !periodCode) continue;

  const periodNums = periodCode.match(/\d{2}/g)?.map((x) => Number(x)) || [];
  if (!periodNums.length) continue;

  const classText = cells[1] || '';
  const isMyClass = classText.includes('电气工程及其自动化24(9)') || classText.includes('教学班22');

  if (!isMyClass) continue;

  rows.push({
    course: cells[0] || '',
    className: classText,
    teacher: cells[3] || '',
    week,
    weekday,
    periodCode,
    startPeriod: Math.min(...periodNums),
    endPeriod: Math.max(...periodNums),
    location: cells[7] || '地点待定',
    date: cells[8] || '',
    sectionType: cells[10] || '',
    content: cells[11] || ''
  });
}

const unique = new Map();
for (const row of rows) {
  const key = [
    row.week,
    row.weekday,
    row.periodCode,
    row.course,
    row.location,
    row.teacher,
    row.date
  ].join('|');
  unique.set(key, row);
}

const lessons = [...unique.values()].sort((a, b) => {
  if (a.week !== b.week) return a.week - b.week;
  if (a.weekday !== b.weekday) return a.weekday - b.weekday;
  if (a.startPeriod !== b.startPeriod) return a.startPeriod - b.startPeriod;
  return a.course.localeCompare(b.course, 'zh-CN');
});

const weeks = [...new Set(lessons.map((x) => x.week))].sort((a, b) => a - b);

const data = {
  generatedAt: new Date().toISOString(),
  totalLessons: lessons.length,
  weeks,
  lessons
};

fs.writeFileSync('schedule-data.json', JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync('schedule-data.js', `window.SCHEDULE_DATA = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
console.log(`Generated schedule-data.json / schedule-data.js with ${lessons.length} lessons across ${weeks.length} weeks.`);
