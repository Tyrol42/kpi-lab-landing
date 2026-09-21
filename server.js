const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Хелпер форматирования даты по МСК
function formatMoscowDate() {
  const date = new Date();
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date) + ' (МСК)';
}

// Экранирование спецсимволов HTML для Telegram
function escapeHtml(text) {
  if (!text) return '—';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Формирование сообщения для Telegram
function buildTelegramMessage(leadData) {
  const { name, phone, site, serviceGoal, calculatorData, source, utm = {}, referrer, device, rawUrl } = leadData;
  const time = formatMoscowDate();

  const utmList = [];
  if (utm.utm_source) utmList.push(`• <b>utm_source:</b> ${escapeHtml(utm.utm_source)}`);
  if (utm.utm_medium) utmList.push(`• <b>utm_medium:</b> ${escapeHtml(utm.utm_medium)}`);
  if (utm.utm_campaign) utmList.push(`• <b>utm_campaign:</b> ${escapeHtml(utm.utm_campaign)}`);
  if (utm.utm_content) utmList.push(`• <b>utm_content:</b> ${escapeHtml(utm.utm_content)}`);
  if (utm.utm_term) utmList.push(`• <b>utm_term:</b> ${escapeHtml(utm.utm_term)}`);
  if (utm.yclid) utmList.push(`• <b>yclid (Директ ID):</b> ${escapeHtml(utm.yclid)}`);
  if (utm.gclid) utmList.push(`• <b>gclid (Google ID):</b> ${escapeHtml(utm.gclid)}`);

  const utmSection = utmList.length > 0 
    ? `🏷 <b>UTM-метки:</b>\n${utmList.join('\n')}` 
    : '🏷 <b>UTM-метки:</b> отсутствуют';

  let calcSection = '';
  if (calculatorData) {
    calcSection = `\n🧮 <b>Параметры из калькулятора:</b>\n` +
      `• Ниша: ${escapeHtml(calculatorData.nicheName)}\n` +
      `• Объем: ${escapeHtml(calculatorData.keywordsCount)} фраз (${escapeHtml(calculatorData.positionState)})\n` +
      `• Прогноз срока: ${escapeHtml(calculatorData.daysRange)}\n` +
      `• Прирост трафика: ${escapeHtml(calculatorData.forecastTraffic)}\n` +
      `• Экономия на Директе: ${escapeHtml(calculatorData.estimatedSavings)}\n` +
      `• Ориентир бюджета: ${escapeHtml(calculatorData.estimatedPrice)}\n`;
  }

  return `🔥 <b>НОВАЯ ЗАЯВКА С ЛЕНДИНГА KPI LAB</b>
───────────────
🎯 <b>Цель обращения:</b> <b>${escapeHtml(serviceGoal || 'Заявка на расчет и аудит')}</b>

👤 <b>Имя:</b> ${escapeHtml(name)}
📞 <b>Телефон:</b> ${escapeHtml(phone)}
🌐 <b>Сайт/Проект:</b> ${escapeHtml(site || 'не указан')}
${calcSection}
📊 <b>Источник перехода:</b>
<b>${escapeHtml(source || 'Не определен')}</b>

${utmSection}

🔗 <b>Реферер:</b> ${escapeHtml(referrer || 'Прямой заход (без реферера)')}
📱 <b>Устройство:</b> ${escapeHtml(device || 'Десктоп/Браузер')}
⏰ <b>Время заявки:</b> ${time}`;
}

// API endpoint отправки заявки
app.post('/api/lead', async (req, res) => {
  try {
    const { name, phone, site, source, utm, referrer, device, rawUrl } = req.body;

    // Базовая валидация на бэкенде
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Пожалуйста, укажите корректное имя' });
    }

    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, error: 'Пожалуйста, укажите корректный номер телефона' });
    }

    const message = buildTelegramMessage({
      name: name.trim(),
      phone: phone.trim(),
      site: (site || '').trim(),
      source: source || 'Не определен',
      utm: utm || {},
      referrer: referrer || '',
      device: device || '',
      rawUrl: rawUrl || ''
    });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const rawChatId = process.env.TELEGRAM_CHAT_ID || '';
    const chatIds = rawChatId
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    // Если токен или чат ID не указаны — запускаем безопасный mock-режим с подробным выводом в консоль
    if (!botToken || chatIds.length === 0 || botToken === 'your_bot_token_here') {
      console.log('\n================== 📥 [НОВАЯ ЗАЯВКА / MOCK-РЕЖИМ] ==================');
      console.log('Бот Telegram не настроен в .env, заявка зафиксирована на сервере:');
      console.log(message.replace(/<[^>]*>?/gm, '')); // чистим HTML теги для консоли
      console.log('===================================================================\n');

      return res.json({
        success: true,
        message: 'Заявка успешно принята! (Telegram-бот пока в демо-режиме: данные выведены в консоль сервера)',
        mock: true
      });
    }

    // Реальная отправка в Telegram через Bot API (рассылка по всем Chat ID)
    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const sendResults = await Promise.all(
      chatIds.map(async (targetChatId) => {
        try {
          const tgResponse = await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetChatId,
              text: message,
              parse_mode: 'HTML'
            })
          });
          const data = await tgResponse.json();
          return { chatId: targetChatId, ok: data.ok, description: data.description };
        } catch (err) {
          return { chatId: targetChatId, ok: false, description: err.message };
        }
      })
    );

    const failures = sendResults.filter(r => !r.ok);
    if (failures.length === sendResults.length) {
      console.error('Ошибка отправки во все Telegram чаты:', failures);
      return res.status(500).json({
        success: false,
        error: 'Не удалось доставить сообщение в Telegram',
        details: failures.map(f => `${f.chatId}: ${f.description}`).join('; ')
      });
    }

    console.log(`[OK] Заявка от ${name} (${phone}) успешно доставлена в Telegram чаты:`, sendResults.filter(r => r.ok).map(r => r.chatId).join(', '));

    return res.json({
      success: true,
      message: 'Спасибо! Ваша заявка принята. Наш эксперт свяжется с вами в течение 15 минут.'
    });
  } catch (err) {
    console.error('Внутренняя ошибка сервера:', err);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера при обработке заявки'
    });
  }
});

// Проверка работоспособности
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: formatMoscowDate(),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  });
});

// Fallback на index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер KPI LAB успешно запущен на http://localhost:${PORT}`);
  console.log(`📡 Готов к приему заявок. Проверка статуса: http://localhost:${PORT}/api/health`);
});
