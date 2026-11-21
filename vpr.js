export const vprSubjects = Object.fromEntries(Array.from({length: 11}, (_, i) => [
  'vpr-' + (i+1), {name: 'ВПР', theme: 'Вариант ' + (i+1), tasks: []}
]));

async function readVariants(filename) {
  const response = await fetch(new URL(filename, import.meta.url));
  if (!response.ok) throw new Error('Не удалось загрузить варианты ВПР.');
  return response.json();
}

let loading;
export function loadVpr() {
  if (!loading) loading = populateVariants().catch(error => {
    loading = undefined;
    throw error;
  });
  return loading;
}

function inputHint(key, variant, number) {
  if (number === 7 && variant === '5') return 'Какую категорию покупали чаще всего?';
  if (number === 7 && variant === '6') return 'Какую категорию покупали реже всего?';
  if (key.parts) return 'Введи ответы по порядку через точку с запятой.';
  if (!key.manual) return '';
  if (variant === '11' && number === 5) return 'Введи расстояние и координаты точек для достроения графика.';
  if (number === 12 || (variant === '11' && number === 4)) return 'Укажи, где на прямой находится каждая точка.';
  if (number === 15) return 'Запиши точки графика по порядку.';
  return '';
}

async function populateVariants() {
  const [pages, keys] = await Promise.all([
    readVariants('vpr-pages.json'), readVariants('vpr-keys.json')
  ]);
  for (const [route, subject] of Object.entries(vprSubjects)) {
    const variant = route.slice(4);
    subject.tasks = pages[variant].map(page => {
      const key = keys[variant][page.number - 1];
      if (!key) throw new Error('Отсутствует ключ ВПР ' + variant + '/' + page.number);
      return {...page, id: 'w'+variant+'_'+page.number, key,
        prompt: inputHint(key, variant, page.number)};
    });
  }
}
