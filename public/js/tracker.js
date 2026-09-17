/**
 * KPI LAB - Модуль трекинга источников и UTM-меток
 * Фиксирует органику (Яндекс, Google), рекламу (Директ, yclid), реферер и сохраняет в сессии.
 */
(function(window) {
  'use strict';

  const STORAGE_KEY = 'kpi_analytics_data';

  // Извлечение параметров из URL
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    const utmKeys = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'yclid',
      'gclid',
      'fbclid',
      'vk_click_id'
    ];

    let hasUtm = false;
    utmKeys.forEach(key => {
      const val = params.get(key);
      if (val) {
        utm[key] = val;
        hasUtm = true;
      }
    });

    return { utm, hasUtm };
  }

  // Определение типа устройства
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Планшет';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'Смартфон (Мобильное)';
    }
    return 'Десктоп (ПК)';
  }

  // Определение источника перехода
  function determineSource(utm, hasUtm, referrer) {
    const lowerSource = (utm.utm_source || '').toLowerCase();
    const lowerMedium = (utm.utm_medium || '').toLowerCase();
    const isYclid = Boolean(utm.yclid);
    const isGclid = Boolean(utm.gclid);

    // 1. Проверка рекламных меток
    if (isYclid || lowerSource.includes('direct') || (lowerSource.includes('yandex') && (lowerMedium === 'cpc' || lowerMedium === 'cpm' || lowerMedium === 'ads'))) {
      return 'Яндекс Директ (Контекстная реклама)';
    }

    if (isGclid || (lowerSource.includes('google') && (lowerMedium === 'cpc' || lowerMedium === 'ads'))) {
      return 'Google Ads (Контекстная реклама)';
    }

    if (lowerSource.includes('vk') || utm.vk_click_id) {
      return 'ВКонтакте (Таргетированная реклама)';
    }

    if (lowerSource.includes('telegram') || lowerSource.includes('tg')) {
      return 'Telegram Ads / Канал';
    }

    if (hasUtm) {
      return `Размеченная ссылка (${utm.utm_source || 'UTM'}) / ${utm.utm_medium || 'реклама'}`;
    }

    // 2. Если UTM нет — проверяем реферер (document.referrer)
    if (!referrer) {
      return 'Прямой заход (Direct)';
    }

    try {
      const refUrl = new URL(referrer);
      const host = refUrl.hostname.toLowerCase();

      // Если реферер с нашего же сайта
      if (host === window.location.hostname.toLowerCase()) {
        return 'Внутренний переход (сайт)';
      }

      if (host.includes('yandex.') || host.includes('ya.ru')) {
        return 'Органический поиск Яндекса (SEO)';
      }

      if (host.includes('google.')) {
        return 'Органический поиск Google (SEO)';
      }

      if (host.includes('bing.com')) {
        return 'Органический поиск Bing';
      }

      if (host.includes('mail.ru')) {
        return 'Органический поиск Mail.ru';
      }

      if (host.includes('vk.com')) {
        return 'ВКонтакте (Органический переход)';
      }

      if (host.includes('t.me') || host.includes('telegram.org')) {
        return 'Telegram (Переход по ссылке)';
      }

      return `Переход с сайта: ${host}`;
    } catch (e) {
      return `Переход с внешнего источника (${referrer})`;
    }
  }

  // Инициализация трекинга с сохранением в SessionStorage
  function initTracker() {
    const currentReferrer = document.referrer || '';
    const { utm, hasUtm } = getUrlParams();
    const rawUrl = window.location.href;
    const device = getDeviceType();

    // Проверяем, есть ли уже сохраненные данные в сессии
    let savedData = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) savedData = JSON.parse(raw);
    } catch (e) {}

    // Если сейчас есть явные UTM в URL — отдаем приоритет новому переходу
    if (hasUtm || !savedData) {
      const source = determineSource(utm, hasUtm, currentReferrer);
      const analyticsData = {
        source,
        utm,
        hasUtm,
        referrer: currentReferrer || (savedData ? savedData.referrer : ''),
        device,
        rawUrl,
        landingTime: new Date().toISOString()
      };

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(analyticsData));
      } catch (e) {}

      return analyticsData;
    }

    return savedData;
  }

  const attributionData = initTracker();

  // Публичный интерфейс трекера
  window.KPITracker = {
    getAttribution: function() {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return attributionData;
    }
  };

  // Вывод в консоль для разработчиков и проверяющих
  console.log('%c[KPI LAB Analytics]%c Источник определен:', 'color: #005FAB; font-weight: bold;', 'color: #10b981; font-weight: bold;', attributionData.source);
  if (attributionData.hasUtm) {
    console.log('%c[KPI LAB Analytics]%c UTM-метки:', 'color: #005FAB; font-weight: bold;', 'color: #3b82f6;', attributionData.utm);
  }

})(window);
