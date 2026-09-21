/**
 * KPI LAB - Интерактивный калькулятор окупаемости и бюджета продвижения ПФ
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Конфигурация ниш и бенчмарков рынка (актуальные данные контекстной рекламы)
  const NICHE_DATA = {
    ecommerce: {
      name: 'Интернет-магазин / E-commerce',
      avgCpc: 140,       // Средняя цена клика в Директе (руб)
      trafficPerKw: 95,  // Средний объем визитов на 1 фразу в ТОП-3
      basePrice: 50000   // Базовая стоимость работ
    },
    services: {
      name: 'Услуги для бизнеса и населения',
      avgCpc: 280,
      trafficPerKw: 65,
      basePrice: 45000
    },
    medicine: {
      name: 'Медицина / Стоматология / Клиники',
      avgCpc: 420,
      trafficPerKw: 55,
      basePrice: 60000
    },
    realty: {
      name: 'Недвижимость / Ремонт / Строительство',
      avgCpc: 590,
      trafficPerKw: 45,
      basePrice: 70000
    },
    b2b: {
      name: 'B2B / Оборудование / Производство',
      avgCpc: 480,
      trafficPerKw: 40,
      basePrice: 65000
    }
  };

  // Элементы управления калькулятора
  const nicheSelect = document.getElementById('calc-niche');
  const kwSlider = document.getElementById('calc-kw-slider');
  const kwDisplay = document.getElementById('calc-kw-val');
  const posSelect = document.getElementById('calc-pos');

  // Элементы вывода результатов
  const resDays = document.getElementById('calc-res-days');
  const resTraffic = document.getElementById('calc-res-traffic');
  const resSavings = document.getElementById('calc-res-savings');
  const resPrice = document.getElementById('calc-res-price');
  const applyCalcBtn = document.getElementById('calc-apply-btn');

  if (!nicheSelect || !kwSlider) return;

  function formatNumber(num) {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function calculate() {
    const nicheKey = nicheSelect.value || 'ecommerce';
    const niche = NICHE_DATA[nicheKey] || NICHE_DATA.ecommerce;
    const kwCount = parseInt(kwSlider.value, 10) || 30;
    const posLevel = posSelect ? posSelect.value : 'top20';

    // Обновляем бейдж количества фраз
    if (kwDisplay) kwDisplay.textContent = `${kwCount} ключевых фраз`;

    // 1. Срок вывода в ТОП-3 (в днях)
    let daysMin = 14;
    let daysMax = 24;
    if (posLevel === 'top50') {
      daysMin = 22;
      daysMax = 35;
    } else if (posLevel === 'new') {
      daysMin = 35;
      daysMax = 50;
    }

    // 2. Прогноз прироста трафика в месяц
    const monthlyTraffic = Math.round(kwCount * niche.trafficPerKw * 1.15);

    // 3. Бюджет на ПФ в месяц
    const extraKw = Math.max(0, kwCount - 25);
    const monthlyPfBudget = niche.basePrice + (extraKw * 650);

    // 4. Экономия на контекстной рекламе (Яндекс Директ)
    const directCostEquivalent = monthlyTraffic * niche.avgCpc;
    const monthlySavings = Math.max(30000, directCostEquivalent - monthlyPfBudget);

    // Вывод в DOM
    if (resDays) resDays.textContent = `${daysMin}–${daysMax} дней`;
    if (resTraffic) resTraffic.textContent = `+${formatNumber(monthlyTraffic)} визитов/мес`;
    if (resSavings) resSavings.textContent = `от ${formatNumber(monthlySavings)} ₽/мес`;
    if (resPrice) resPrice.textContent = `от ${formatNumber(monthlyPfBudget)} ₽/мес`;

    // Сохраняем расчет для передачи в заявку
    window.lastCalcResult = {
      nicheName: niche.name,
      keywordsCount: kwCount,
      positionState: posSelect ? posSelect.options[posSelect.selectedIndex].text : 'ТОП-20',
      daysRange: `${daysMin}–${daysMax} дней`,
      forecastTraffic: `+${formatNumber(monthlyTraffic)} визитов/мес`,
      estimatedSavings: `от ${formatNumber(monthlySavings)} ₽/мес`,
      estimatedPrice: `от ${formatNumber(monthlyPfBudget)} ₽/мес`
    };
  }

  // Слушатели событий изменения
  nicheSelect.addEventListener('change', calculate);
  kwSlider.addEventListener('input', calculate);
  if (posSelect) posSelect.addEventListener('change', calculate);

  // Первоначальный расчет
  calculate();

  // Кнопка применения расчета к форме
  if (applyCalcBtn) {
    applyCalcBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const calcData = window.lastCalcResult;
      
      // Скроллим к форме или открываем модалку с предзаполненными параметрами
      const leadSection = document.getElementById('lead-section');
      if (leadSection) {
        leadSection.scrollIntoView({ behavior: 'smooth' });
      }

      // Подставляем параметры в скрытое поле или заголовок формы
      const serviceGoalInput = document.getElementById('client-goal');
      if (serviceGoalInput && calcData) {
        serviceGoalInput.value = `Расчет калькулятора: ${calcData.nicheName}, ${calcData.keywordsCount} фраз, бюджет ${calcData.estimatedPrice}`;
      }

      const formTitle = document.querySelector('.form-title');
      if (formTitle && calcData) {
        formTitle.innerHTML = `Зафиксировать расчет для ниши <span>${calcData.nicheName}</span>`;
      }
    });
  }
});
